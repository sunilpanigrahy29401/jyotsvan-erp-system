// Inbound lead capture. The route authenticates the call; this module normalises provider payloads and creates leads through the
// same pipeline as manual entry (duplicate detection, scoring, auto-assignment, SLA) so all channels behave identically.
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';
import { CrmLeads } from './crm-leads.ts';
import { CrmError, normEmail, normPhone, systemUserId } from './crm-core.ts';
import { ensureCrmDefaults } from './crm-defaults.ts';

export interface InboundLead {
  external_id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  requirement?: string;
  estimated_value?: number;
  campaign_name?: string;
  consent_marketing?: boolean;
}

const s = (v: unknown) => (v === undefined || v === null ? undefined : String(v).trim() || undefined);

/** Meta Lead Ads "field_data": [{name, values:[...]}] and Google Ads "user_column_data": [{column_id, string_value}]. */
function fromFieldList(list: any[], keyOf: (x: any) => string, valOf: (x: any) => unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const x of Array.isArray(list) ? list : []) {
    const v = s(valOf(x));
    if (v) out[keyOf(x).toLowerCase()] = v;
  }
  return out;
}

export function normalizePayload(source: string, p: Record<string, any>): InboundLead {
  p = p || {};
  if (source === 'indiamart') {
    // IndiaMART CRM push / Lead Manager API field names.
    return {
      external_id: s(p.QUERY_ID ?? p.UNIQUE_QUERY_ID),
      name: s(p.SENDER_NAME), email: s(p.SENDER_EMAIL), phone: s(p.SENDER_MOBILE ?? p.SENDER_MOBILE_ALT),
      company_name: s(p.SENDER_COMPANY), city: s(p.SENDER_CITY), state: s(p.SENDER_STATE),
      requirement: [s(p.QUERY_PRODUCT_NAME), s(p.QUERY_MESSAGE)].filter(Boolean).join(' — ') || undefined,
    };
  }
  if (source === 'meta_ads') {
    const f = fromFieldList(p.field_data, (x) => x.name, (x) => (Array.isArray(x.values) ? x.values[0] : x.values));
    const g = (...k: string[]) => k.map((x) => f[x] ?? s(p[x])).find(Boolean);
    return {
      external_id: s(p.leadgen_id ?? p.id), name: g('full_name', 'name'), first_name: g('first_name'), last_name: g('last_name'),
      email: g('email'), phone: g('phone_number', 'phone'), company_name: g('company_name', 'company'), city: g('city'), state: g('state'),
      requirement: g('message', 'requirement'), campaign_name: s(p.campaign_name ?? p.ad_name),
    };
  }
  if (source === 'google_ads') {
    const f = fromFieldList(p.user_column_data, (x) => x.column_id ?? x.column_name, (x) => x.string_value);
    const g = (...k: string[]) => k.map((x) => f[x] ?? s(p[x])).find(Boolean);
    return {
      external_id: s(p.lead_id), name: g('full_name'), first_name: g('first_name'), last_name: g('last_name'), email: g('email'),
      phone: g('phone_number', 'phone'), company_name: g('company_name'), city: g('city'), state: g('region', 'state'),
      requirement: g('message'), campaign_name: s(p.campaign_id ? `Google campaign ${p.campaign_id}` : undefined),
    };
  }
  // Generic web form / custom sources.
  return {
    external_id: s(p.external_id ?? p.id), name: s(p.name), first_name: s(p.first_name), last_name: s(p.last_name), company_name: s(p.company_name ?? p.company),
    email: s(p.email), phone: s(p.phone ?? p.mobile ?? p.contact_number), city: s(p.city), state: s(p.state),
    requirement: s(p.requirement ?? p.message), estimated_value: p.estimated_value !== undefined ? Number(p.estimated_value) : undefined, campaign_name: s(p.campaign_name),
    consent_marketing: p.consent === true || p.consent_marketing === true || p.consent === 'true',
  };
}

async function log(orgId: string, source: string, payload: unknown, status: string, leadId: string | null, error: string | null, ip: string) {
  await pool.query(
    `INSERT INTO crm_webhook_logs (id, organization_id, source, payload, status, created_lead_id, error_details, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [newId('wh'), orgId, source.slice(0, 64), JSON.stringify(payload ?? {}).slice(0, 20000), status, leadId, error, ip.slice(0, 64)]);
}

export async function ingestLead(orgId: string, source: string, rawPayload: Record<string, any>, ip: string) {
  await ensureCrmDefaults(orgId);
  const src = (await pool.query(`SELECT id, is_active FROM crm_lead_sources WHERE organization_id = $1 AND (code = $2 OR channel_type = $2) ORDER BY (code = $2) DESC LIMIT 1`, [orgId, source])).rows[0];
  if (src && !src.is_active) { await log(orgId, source, rawPayload, 'rejected', null, 'Source is inactive', ip); throw new CrmError('This lead source is disabled.', 403, 'SOURCE_DISABLED'); }
  const cfg = (await pool.query(`SELECT status FROM crm_integration_configs WHERE organization_id = $1 AND provider = $2`, [orgId, source])).rows[0];
  if (cfg?.status === 'disabled') { await log(orgId, source, rawPayload, 'rejected', null, 'Integration disabled', ip); throw new CrmError('This integration is disabled.', 403, 'INTEGRATION_DISABLED'); }

  const lead = normalizePayload(source, rawPayload);
  try {
    if (!normPhone(lead.phone) && !normEmail(lead.email)) throw new CrmError('The lead needs a valid phone number or e-mail address.', 400, 'CONTACT_REQUIRED');

    // Providers retry: the same external id must never create a second lead.
    if (lead.external_id) {
      const seen = (await pool.query(
        `SELECT id, lead_number FROM crm_leads WHERE organization_id = $1 AND source_id IS NOT DISTINCT FROM $2 AND custom_fields->>'external_id' = $3 LIMIT 1`, [orgId, src?.id ?? null, lead.external_id])).rows[0];
      if (seen) { await log(orgId, source, rawPayload, 'ignored_duplicate', seen.id, 'Repeated delivery', ip); return { success: true, duplicate: true, lead_id: seen.id, lead_number: seen.lead_number, message: 'Already received.' }; }
    }

    const first = lead.first_name || (lead.name ? lead.name.split(/\s+/)[0] : undefined) || lead.company_name || 'Prospect';
    const last = lead.last_name ?? (lead.name ? lead.name.split(/\s+/).slice(1).join(' ') : '');
    const actor = { id: 'system', email: 'system@jyotsvan' };
    let created;
    try {
      // 'system' is not a users row; created_by_user_id has an FK, so the lead is created with a NULL author via the actor id below.
      created = await CrmLeads.create(orgId, {
        first_name: first, last_name: last, company_name: lead.company_name, email: lead.email, phone: lead.phone ?? '', city: lead.city, state: lead.state,
        expected_requirement: lead.requirement, estimated_deal_value: lead.estimated_value, source_id: src?.id, campaign_name: lead.campaign_name,
        custom_fields: lead.external_id ? { external_id: lead.external_id } : {},
      }, actor as any);
    } catch (e: any) {
      if (e instanceof CrmError && e.code === 'DUPLICATE') {
        const m = (e.extra as any)?.matches?.[0];
        if (m?.entity === 'lead') {
          // Repeat enquiry from a known lead: record it on the lead instead of dropping it silently.
          const author = await systemUserId(pool, orgId);
          if (author) {
            await pool.query(
              `INSERT INTO crm_activities (id, organization_id, activity_type, subject, description, lead_id, logged_by_user_id, priority) VALUES ($1,$2,'note',$3,$4,$5,$6,'normal')`,
              [newId('act'), orgId, `Repeat enquiry via ${source}`, (lead.requirement || 'No message').slice(0, 1000), m.id, author]).catch(() => undefined);
          }
          await pool.query(`UPDATE crm_leads SET last_activity_date = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, m.id]);
        }
        await log(orgId, source, rawPayload, 'ignored_duplicate', m?.entity === 'lead' ? m.id : null, e.message, ip);
        return { success: true, duplicate: true, lead_id: m?.entity === 'lead' ? m.id : undefined, lead_number: m?.number, message: 'Matched an existing record; no new lead created.' };
      }
      throw e;
    }
    if (lead.consent_marketing) {
      await pool.query(
        `INSERT INTO crm_consents (id, organization_id, subject_type, subject_id, channel, purpose, status, source, evidence, ip_address)
         SELECT 'cns-' || gen_random_uuid(), $1::text, 'lead', $2::text, ch, 'marketing', 'granted', $3::text, 'Consent ticked on the submitted form', $4::text FROM unnest(ARRAY['email','sms','whatsapp']) ch`,
        [orgId, created.id, source, ip.slice(0, 64)]);
    }
    await log(orgId, source, rawPayload, 'processed', created.id, null, ip);
    await pool.query(`UPDATE crm_integration_configs SET total_records_ingested = total_records_ingested + 1, last_successful_sync = NOW(), last_attempted_sync = NOW() WHERE organization_id = $1 AND provider = $2`, [orgId, source]);
    return { success: true, duplicate: false, lead_id: created.id, lead_number: created.lead_number, message: 'Lead captured.' };
  } catch (e: any) {
    if (!(e instanceof CrmError && e.code === 'DUPLICATE')) {
      await log(orgId, source, rawPayload, 'failed', null, e?.message || 'error', ip).catch(() => undefined);
      await pool.query(`UPDATE crm_integration_configs SET failed_records_count = failed_records_count + 1, last_attempted_sync = NOW(), error_message = $3 WHERE organization_id = $1 AND provider = $2`, [orgId, source, String(e?.message || '').slice(0, 500)]).catch(() => undefined);
    }
    throw e;
  }
}
