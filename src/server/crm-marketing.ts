// Marketing: DPDP consent ledger + suppression list, signed unsubscribe links, templates, audiences, campaigns and drip sequences.
// No e-mail/SMS/WhatsApp delivery provider is connected yet: launching a campaign resolves and QUEUES eligible recipients (with consent and
// suppression applied) and never reports anything as sent. Sequences fall back to creating a task for the lead owner.
import crypto from 'crypto';
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';
import { CrmError, systemUserId, buildSet, normEmail, normPhone, oneOf, pickFields, tx, type Actor } from './crm-core.ts';

export const CHANNELS = ['email', 'sms', 'whatsapp', 'call'] as const;
const MESSAGE_CHANNELS = ['email', 'sms', 'whatsapp'];
const PLACEHOLDERS = ['first_name', 'last_name', 'display_name', 'company_name', 'city', 'state'];

const secret = () => process.env.ENCRYPTION_SECRET || process.env.SESSION_SECRET || '';

// ---- unsubscribe tokens ----------------------------------------------------------------------------------------------
export function makeUnsubscribeToken(orgId: string, channel: string, address: string, ttlDays = 365): string {
  const payload = Buffer.from(JSON.stringify({ o: orgId, c: channel, a: address, e: Date.now() + ttlDays * 86_400_000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
export function readUnsubscribeToken(token: string): { orgId: string; channel: string; address: string } {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig || !secret()) throw new CrmError('This unsubscribe link is not valid.', 400, 'INVALID_TOKEN');
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new CrmError('This unsubscribe link is not valid.', 400, 'INVALID_TOKEN');
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!p.o || !p.c || !p.a || p.e < Date.now()) throw new Error('expired');
    return { orgId: p.o, channel: p.c, address: p.a };
  } catch {
    throw new CrmError('This unsubscribe link is not valid or has expired.', 400, 'INVALID_TOKEN');
  }
}

const addrOf = (channel: string, row: { email?: string | null; phone?: string | null }) =>
  channel === 'email' ? normEmail(row.email) : normPhone(row.phone);

export class CrmMarketing {
  // ---- consent ----------------------------------------------------------------------------------------------------------
  static async recordConsent(orgId: string, b: Record<string, any>, actor: Actor | null, ip?: string) {
    oneOf(b.subject_type, ['lead', 'contact'], 'subject_type');
    oneOf(b.channel, CHANNELS, 'channel');
    oneOf(b.status, ['granted', 'withdrawn'], 'status');
    const purpose = b.purpose || 'marketing';
    oneOf(purpose, ['marketing', 'transactional'], 'purpose');
    if (!b.subject_type || !b.subject_id || !b.channel || !b.status) throw new CrmError('subject_type, subject_id, channel and status are required.', 400, 'FIELDS_REQUIRED');
    return tx(async (c) => {
      const table = b.subject_type === 'lead' ? 'crm_leads' : 'crm_contacts';
      const subj = (await c.query(`SELECT email, phone FROM ${table} WHERE organization_id = $1 AND id = $2`, [orgId, b.subject_id])).rows[0];
      if (!subj) throw new CrmError(`${b.subject_type} not found.`, 404, 'NOT_FOUND');
      const row = (await c.query(
        `INSERT INTO crm_consents (id, organization_id, subject_type, subject_id, channel, purpose, status, source, evidence, ip_address, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [newId('cns'), orgId, b.subject_type, b.subject_id, b.channel, purpose, b.status, String(b.source || 'staff').slice(0, 48), b.evidence ? String(b.evidence).slice(0, 1000) : null, ip?.slice(0, 64) ?? null, actor?.id ?? null])).rows[0];
      const addr = addrOf(b.channel, subj);
      if (addr && b.channel !== 'call' && purpose === 'marketing') {
        if (b.status === 'withdrawn') {
          await c.query(`INSERT INTO crm_suppressions (id, organization_id, channel, address_norm, reason) VALUES ($1,$2,$3,$4,'unsubscribed') ON CONFLICT (organization_id, channel, address_norm) DO NOTHING`, [newId('sup'), orgId, b.channel, addr]);
        } else {
          await c.query(`DELETE FROM crm_suppressions WHERE organization_id = $1 AND channel = $2 AND address_norm = $3 AND reason IN ('unsubscribed','manual')`, [orgId, b.channel, addr]);
        }
      }
      return row;
    });
  }

  static async consentState(orgId: string, subjectType: string, subjectId: string) {
    oneOf(subjectType, ['lead', 'contact'], 'subject_type');
    const current = (await pool.query(
      `SELECT DISTINCT ON (channel, purpose) channel, purpose, status, source, created_at FROM crm_consents WHERE organization_id = $1 AND subject_type = $2 AND subject_id = $3 ORDER BY channel, purpose, created_at DESC`, [orgId, subjectType, subjectId])).rows;
    const history = (await pool.query(`SELECT * FROM crm_consents WHERE organization_id = $1 AND subject_type = $2 AND subject_id = $3 ORDER BY created_at DESC LIMIT 100`, [orgId, subjectType, subjectId])).rows;
    return { current, history };
  }

  /** Public, token-authenticated: withdraws consent for an address and suppresses it. */
  static async unsubscribe(token: string, ip?: string) {
    const { orgId, channel, address } = readUnsubscribeToken(token);
    await pool.query(`INSERT INTO crm_suppressions (id, organization_id, channel, address_norm, reason) VALUES ($1,$2,$3,$4,'unsubscribed') ON CONFLICT (organization_id, channel, address_norm) DO NOTHING`, [newId('sup'), orgId, channel, address]);
    const col = channel === 'email' ? 'email_norm' : 'phone_norm';
    for (const [type, table] of [['lead', 'crm_leads'], ['contact', 'crm_contacts']] as const) {
      await pool.query(
        `INSERT INTO crm_consents (id, organization_id, subject_type, subject_id, channel, purpose, status, source, ip_address)
         SELECT 'cns-' || gen_random_uuid(), $1::text, $2::text, id, $3::text, 'marketing', 'withdrawn', 'unsubscribe_link', $5::text FROM ${table} WHERE organization_id = $1 AND ${col} = $4::text`,
        [orgId, type, channel, address, ip?.slice(0, 64) ?? null]);
    }
    return { unsubscribed: true, channel };
  }

  static async listSuppressions(orgId: string, channel?: string) {
    return (await pool.query(`SELECT * FROM crm_suppressions WHERE organization_id = $1 ${channel ? 'AND channel = $2' : ''} ORDER BY created_at DESC LIMIT 500`, channel ? [orgId, channel] : [orgId])).rows;
  }
  static async addSuppression(orgId: string, b: Record<string, any>) {
    oneOf(b.channel, MESSAGE_CHANNELS, 'channel');
    const addr = b.channel === 'email' ? normEmail(b.address) : normPhone(b.address);
    if (!b.channel || !addr) throw new CrmError('A channel and a valid address are required.', 400, 'FIELDS_REQUIRED');
    oneOf(b.reason ?? 'manual', ['unsubscribed', 'bounced', 'complaint', 'manual'], 'reason');
    return (await pool.query(`INSERT INTO crm_suppressions (id, organization_id, channel, address_norm, reason) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (organization_id, channel, address_norm) DO UPDATE SET reason = EXCLUDED.reason RETURNING *`, [newId('sup'), orgId, b.channel, addr, b.reason ?? 'manual'])).rows[0];
  }
  static async removeSuppression(orgId: string, id: string) {
    const r = await pool.query(`DELETE FROM crm_suppressions WHERE organization_id = $1 AND id = $2 AND reason IN ('unsubscribed','manual') RETURNING id`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Suppression not found, or it was caused by a bounce/complaint and cannot be removed manually.', 404, 'NOT_FOUND');
    return { id };
  }

  // ---- templates ----------------------------------------------------------------------------------------------------------
  static meta() { return { placeholders: PLACEHOLDERS, channels: MESSAGE_CHANNELS }; }

  private static checkTemplate(d: Record<string, any>) {
    const used = [...String(d.body || '').matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]);
    const unknown = used.filter((u) => !PLACEHOLDERS.includes(u));
    if (unknown.length) throw new CrmError(`Unknown placeholder(s): ${[...new Set(unknown)].join(', ')}. Allowed: ${PLACEHOLDERS.join(', ')}.`, 400, 'INVALID_PLACEHOLDER');
    if (d.channel === 'email' && 'subject' in d && !d.subject) throw new CrmError('E-mail templates need a subject.', 400, 'SUBJECT_REQUIRED');
    if (d.channel === 'sms' && String(d.body).length > 1000) throw new CrmError('SMS body is too long (max 1000 characters).', 400, 'BODY_TOO_LONG');
  }
  static async listTemplates(orgId: string, channel?: string) {
    return (await pool.query(`SELECT * FROM crm_message_templates WHERE organization_id = $1 ${channel ? 'AND channel = $2' : ''} ORDER BY updated_at DESC`, channel ? [orgId, channel] : [orgId])).rows;
  }
  static async createTemplate(orgId: string, b: Record<string, any>, actor: Actor) {
    const d = pickFields(b, ['name', 'channel', 'subject', 'body', 'provider_template']);
    if (!d.name || !d.channel || !d.body) throw new CrmError('name, channel and body are required.', 400, 'FIELDS_REQUIRED');
    oneOf(d.channel, MESSAGE_CHANNELS, 'channel');
    if (d.channel === 'email' && !d.subject) throw new CrmError('E-mail templates need a subject.', 400, 'SUBJECT_REQUIRED');
    CrmMarketing.checkTemplate(d);
    return (await pool.query(`INSERT INTO crm_message_templates (id, organization_id, name, channel, subject, body, provider_template, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [newId('tpl'), orgId, d.name, d.channel, d.subject ?? null, d.body, d.provider_template ?? null, actor.id])).rows[0];
  }
  static async updateTemplate(orgId: string, id: string, b: Record<string, any>) {
    const cur = (await pool.query(`SELECT * FROM crm_message_templates WHERE organization_id = $1 AND id = $2`, [orgId, id])).rows[0];
    if (!cur) throw new CrmError('Template not found.', 404, 'NOT_FOUND');
    const d = pickFields(b, ['name', 'subject', 'body', 'provider_template']);
    for (const k of ['name', 'body']) if (k in d && !d[k]) throw new CrmError(`${k} is required.`, 400, 'FIELDS_REQUIRED');
    CrmMarketing.checkTemplate({ ...cur, ...d });
    const cols: Record<string, any> = { ...d };
    if (b.is_active !== undefined) cols.is_active = Boolean(b.is_active);
    if (!Object.keys(cols).length) return cur;
    const set = buildSet(cols);
    return (await pool.query(`UPDATE crm_message_templates SET ${set.sql}, updated_at = NOW() WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2} RETURNING *`, [...set.values, orgId, id])).rows[0];
  }
  static async deleteTemplate(orgId: string, id: string) {
    const used = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_campaigns WHERE organization_id = $1 AND template_id = $2`, [orgId, id])).rows[0].n)
      + Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_sequences WHERE organization_id = $1 AND steps @> jsonb_build_array(jsonb_build_object('template_id', $2::text))`, [orgId, id])).rows[0].n);
    if (used) throw new CrmError('This template is used by a campaign or sequence. Deactivate it instead.', 409, 'IN_USE');
    const r = await pool.query(`DELETE FROM crm_message_templates WHERE organization_id = $1 AND id = $2 RETURNING id`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Template not found.', 404, 'NOT_FOUND');
    return { id };
  }
  static render(body: string, vars: Record<string, any>) {
    return String(body).replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_m, k) => (vars[k] ?? '').toString());
  }
  static async preview(orgId: string, templateId: string, entity: 'lead' | 'contact', entityId: string) {
    const t = (await pool.query(`SELECT * FROM crm_message_templates WHERE organization_id = $1 AND id = $2`, [orgId, templateId])).rows[0];
    if (!t) throw new CrmError('Template not found.', 404, 'NOT_FOUND');
    const table = entity === 'lead' ? 'crm_leads' : 'crm_contacts';
    const row = (await pool.query(`SELECT * FROM ${table} WHERE organization_id = $1 AND id = $2`, [orgId, entityId])).rows[0];
    if (!row) throw new CrmError(`${entity} not found.`, 404, 'NOT_FOUND');
    return { subject: t.subject ? CrmMarketing.render(t.subject, row) : null, body: CrmMarketing.render(t.body, row) };
  }

  // ---- audiences -----------------------------------------------------------------------------------------------------------
  private static filterSql(entity: string, f: Record<string, any>, params: any[]) {
    let w = '';
    const add = (sql: string, v: any) => { params.push(v); w += ` AND ${sql.replace('?', `$${params.length}`)}`; };
    if (entity === 'lead') {
      w += ` AND archived_at IS NULL AND is_converted = FALSE AND status NOT IN ('lost','unqualified','archived')`;
      if (f.status) add('status = ?', f.status);
      if (f.source_id) add('source_id = ?', f.source_id);
      if (f.state) add('LOWER(state) = LOWER(?)', f.state);
      if (f.city) add('LOWER(city) = LOWER(?)', f.city);
      if (f.tag) add('tags @> to_jsonb(?::text)', String(f.tag));
      if (f.relationship_type) add('relationship_type = ?', f.relationship_type);
      if (f.min_score) add('lead_score >= ?', Number(f.min_score));
    } else {
      w += ' AND archived_at IS NULL AND status = \'active\'';
      if (f.account_id) add('account_id = ?', f.account_id);
      if (f.role) add('role = ?', f.role);
    }
    return w;
  }
  static async listAudiences(orgId: string) { return (await pool.query(`SELECT * FROM crm_audiences WHERE organization_id = $1 ORDER BY name`, [orgId])).rows; }
  static async createAudience(orgId: string, b: Record<string, any>, actor: Actor) {
    const d = pickFields(b, ['name', 'description', 'entity']);
    if (!d.name) throw new CrmError('Name is required.', 400, 'NAME_REQUIRED');
    oneOf(d.entity ?? 'lead', ['lead', 'contact'], 'entity');
    if (b.filters && (typeof b.filters !== 'object' || Array.isArray(b.filters))) throw new CrmError('filters must be an object.', 400, 'INVALID_FILTERS');
    return (await pool.query(`INSERT INTO crm_audiences (id, organization_id, name, description, entity, filters, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [newId('aud'), orgId, d.name, d.description ?? null, d.entity ?? 'lead', JSON.stringify(b.filters ?? {}), actor.id])).rows[0];
  }
  static async updateAudience(orgId: string, id: string, b: Record<string, any>) {
    const d = pickFields(b, ['name', 'description']);
    if ('name' in d && !d.name) throw new CrmError('Name is required.', 400, 'NAME_REQUIRED');
    const cols: Record<string, any> = { ...d };
    if (b.filters !== undefined) cols.filters = JSON.stringify(b.filters ?? {});
    if (!Object.keys(cols).length) throw new CrmError('Nothing to update.', 400, 'EMPTY');
    const set = buildSet(cols);
    const r = await pool.query(`UPDATE crm_audiences SET ${set.sql}, updated_at = NOW() WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2} RETURNING *`, [...set.values, orgId, id]);
    if (!r.rows.length) throw new CrmError('Audience not found.', 404, 'NOT_FOUND');
    return r.rows[0];
  }
  static async deleteAudience(orgId: string, id: string) {
    const n = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_campaigns WHERE organization_id = $1 AND audience_id = $2`, [orgId, id])).rows[0].n);
    if (n) throw new CrmError(`${n} campaign(s) use this audience.`, 409, 'IN_USE');
    const r = await pool.query(`DELETE FROM crm_audiences WHERE organization_id = $1 AND id = $2 RETURNING id`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Audience not found.', 404, 'NOT_FOUND');
    return { id };
  }

  /** Resolves who would receive a message on a channel and why others are excluded. */
  static async resolveAudience(orgId: string, audienceId: string, channel: string) {
    oneOf(channel, MESSAGE_CHANNELS, 'channel');
    const a = (await pool.query(`SELECT * FROM crm_audiences WHERE organization_id = $1 AND id = $2`, [orgId, audienceId])).rows[0];
    if (!a) throw new CrmError('Audience not found.', 404, 'NOT_FOUND');
    const params: any[] = [orgId];
    const table = a.entity === 'lead' ? 'crm_leads' : 'crm_contacts';
    const rows = (await pool.query(`SELECT * FROM ${table} WHERE organization_id = $1${CrmMarketing.filterSql(a.entity, a.filters || {}, params)} LIMIT 20000`, params)).rows;
    const sup = new Set((await pool.query(`SELECT address_norm FROM crm_suppressions WHERE organization_id = $1 AND channel = $2`, [orgId, channel])).rows.map((r: any) => r.address_norm));
    const consent = new Map<string, string>(
      (await pool.query(
        `SELECT DISTINCT ON (subject_id) subject_id, status FROM crm_consents WHERE organization_id = $1 AND subject_type = $2 AND channel = $3 AND purpose = 'marketing' ORDER BY subject_id, created_at DESC`,
        [orgId, a.entity, channel])).rows.map((r: any) => [r.subject_id, r.status]));
    const out = { entity: a.entity, total: rows.length, eligible: [] as any[], skipped: { no_address: 0, suppressed: 0, no_consent: 0 } };
    for (const r of rows) {
      const addr = addrOf(channel, r);
      if (!addr) { out.skipped.no_address++; continue; }
      if (sup.has(addr)) { out.skipped.suppressed++; continue; }
      if (consent.get(r.id) !== 'granted') { out.skipped.no_consent++; continue; }
      out.eligible.push({ id: r.id, address: addr, row: r });
    }
    return out;
  }

  static async audiencePreview(orgId: string, audienceId: string, channel: string) {
    const r = await CrmMarketing.resolveAudience(orgId, audienceId, channel);
    return { entity: r.entity, total: r.total, eligible: r.eligible.length, skipped: r.skipped, sample: r.eligible.slice(0, 10).map((e) => ({ id: e.id, name: e.row.display_name, address: e.address })) };
  }

  // ---- campaigns ----------------------------------------------------------------------------------------------------------------
  static async listCampaigns(orgId: string) {
    return (await pool.query(
      `SELECT c.*, t.name AS template_name, a.name AS audience_name FROM crm_campaigns c LEFT JOIN crm_message_templates t ON t.id = c.template_id LEFT JOIN crm_audiences a ON a.id = c.audience_id
        WHERE c.organization_id = $1 ORDER BY c.created_at DESC LIMIT 200`, [orgId])).rows;
  }
  static async getCampaign(orgId: string, id: string) {
    const c = (await pool.query(`SELECT * FROM crm_campaigns WHERE organization_id = $1 AND id = $2`, [orgId, id])).rows[0];
    if (!c) throw new CrmError('Campaign not found.', 404, 'NOT_FOUND');
    const counts = (await pool.query(`SELECT status, COUNT(*)::int n FROM crm_campaign_recipients WHERE campaign_id = $1 GROUP BY status`, [id])).rows;
    return { ...c, recipient_counts: Object.fromEntries(counts.map((r: any) => [r.status, r.n])) };
  }
  static async createCampaign(orgId: string, b: Record<string, any>, actor: Actor) {
    const d = pickFields(b, ['name', 'channel', 'template_id', 'audience_id', 'scheduled_at']);
    if (!d.name || !d.channel || !d.template_id || !d.audience_id) throw new CrmError('name, channel, template_id and audience_id are required.', 400, 'FIELDS_REQUIRED');
    oneOf(d.channel, MESSAGE_CHANNELS, 'channel');
    const t = (await pool.query(`SELECT channel, is_active FROM crm_message_templates WHERE organization_id = $1 AND id = $2`, [orgId, d.template_id])).rows[0];
    if (!t) throw new CrmError('Template not found.', 400, 'INVALID_TEMPLATE');
    if (t.channel !== d.channel) throw new CrmError(`The template is a ${t.channel} template; the campaign channel is ${d.channel}.`, 400, 'CHANNEL_MISMATCH');
    if (!t.is_active) throw new CrmError('The template is inactive.', 400, 'INVALID_TEMPLATE');
    if (!(await pool.query(`SELECT 1 FROM crm_audiences WHERE organization_id = $1 AND id = $2`, [orgId, d.audience_id])).rows.length) throw new CrmError('Audience not found.', 400, 'INVALID_AUDIENCE');
    if (d.scheduled_at && Number.isNaN(Date.parse(d.scheduled_at))) throw new CrmError('scheduled_at is not a valid date/time.', 400, 'INVALID_DATE');
    return (await pool.query(`INSERT INTO crm_campaigns (id, organization_id, name, channel, template_id, audience_id, scheduled_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [newId('cmp'), orgId, d.name, d.channel, d.template_id, d.audience_id, d.scheduled_at ?? null, actor.id])).rows[0];
  }
  static async cancelCampaign(orgId: string, id: string) {
    const r = await pool.query(`UPDATE crm_campaigns SET status = 'cancelled', updated_at = NOW() WHERE organization_id = $1 AND id = $2 AND status IN ('draft','queued') RETURNING *`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Only draft or queued campaigns can be cancelled.', 409, 'INVALID_STATE');
    await pool.query(`UPDATE crm_campaign_recipients SET status = 'cancelled' WHERE campaign_id = $1 AND status = 'queued'`, [id]);
    return r.rows[0];
  }
  static async deleteCampaign(orgId: string, id: string) {
    const r = await pool.query(`DELETE FROM crm_campaigns WHERE organization_id = $1 AND id = $2 AND status IN ('draft','cancelled') RETURNING id`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Only draft or cancelled campaigns can be deleted.', 409, 'INVALID_STATE');
    return { id };
  }

  /** Freezes the recipient list (consent + suppression applied) and queues it. Nothing is sent: no delivery provider is connected. */
  static async launchCampaign(orgId: string, id: string) {
    const camp = (await pool.query(`SELECT * FROM crm_campaigns WHERE organization_id = $1 AND id = $2`, [orgId, id])).rows[0];
    if (!camp) throw new CrmError('Campaign not found.', 404, 'NOT_FOUND');
    if (camp.status !== 'draft') throw new CrmError(`A ${camp.status} campaign cannot be launched.`, 409, 'INVALID_STATE');
    const res = await CrmMarketing.resolveAudience(orgId, camp.audience_id, camp.channel);
    if (!res.eligible.length) throw new CrmError('No eligible recipients: everyone is missing an address, unsubscribed, or has not given consent.', 409, 'NO_RECIPIENTS', { skipped: res.skipped });
    return tx(async (c) => {
      const lock = (await c.query(`UPDATE crm_campaigns SET status = 'queued', launched_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'draft' RETURNING *`, [id])).rows[0];
      if (!lock) throw new CrmError('Campaign was already launched.', 409, 'INVALID_STATE');
      for (const e of res.eligible) {
        await c.query(`INSERT INTO crm_campaign_recipients (id, organization_id, campaign_id, entity_type, entity_id, address, status) VALUES ($1,$2,$3,$4,$5,$6,'queued') ON CONFLICT DO NOTHING`, [newId('rcp'), orgId, id, res.entity, e.id, e.address]);
      }
      const stats = { audience_size: res.total, queued: res.eligible.length, skipped: res.skipped, delivery_provider: null, note: 'Recipients are queued. No delivery provider is connected, so nothing has been sent.' };
      const done = (await c.query(`UPDATE crm_campaigns SET stats = $2 WHERE id = $1 RETURNING *`, [id, JSON.stringify(stats)])).rows[0];
      return done;
    });
  }

  static async exportRecipients(orgId: string, id: string): Promise<string> {
    const camp = (await pool.query(`SELECT c.*, t.subject, t.body FROM crm_campaigns c JOIN crm_message_templates t ON t.id = c.template_id WHERE c.organization_id = $1 AND c.id = $2`, [orgId, id])).rows[0];
    if (!camp) throw new CrmError('Campaign not found.', 404, 'NOT_FOUND');
    const rows = (await pool.query(`SELECT r.entity_type, r.entity_id, r.address, r.status FROM crm_campaign_recipients r WHERE r.campaign_id = $1 AND r.status = 'queued' ORDER BY r.address`, [id])).rows;
    const cell = (v: unknown) => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const out = ['entity_type,entity_id,address,unsubscribe_token'];
    for (const r of rows) out.push([r.entity_type, r.entity_id, r.address, makeUnsubscribeToken(orgId, camp.channel, r.address)].map(cell).join(','));
    return out.join('\r\n');
  }

  // ---- sequences --------------------------------------------------------------------------------------------------------------------
  static async listSequences(orgId: string) {
    return (await pool.query(
      `SELECT s.*, (SELECT COUNT(*)::int FROM crm_sequence_enrollments e WHERE e.sequence_id = s.id AND e.status = 'active') AS active_enrollments FROM crm_sequences s WHERE s.organization_id = $1 ORDER BY s.name`, [orgId])).rows;
  }
  private static async validSteps(orgId: string, channel: string, steps: any) {
    if (!Array.isArray(steps) || !steps.length || steps.length > 20) throw new CrmError('A sequence needs 1–20 steps.', 400, 'INVALID_STEPS');
    for (const [i, s] of steps.entries()) {
      if (!Number.isFinite(Number(s?.delay_hours)) || Number(s.delay_hours) < 0) throw new CrmError(`Step ${i + 1}: delay_hours must be 0 or more.`, 400, 'INVALID_STEPS');
      const t = (await pool.query(`SELECT channel FROM crm_message_templates WHERE organization_id = $1 AND id = $2`, [orgId, s?.template_id])).rows[0];
      if (!t) throw new CrmError(`Step ${i + 1}: template not found.`, 400, 'INVALID_STEPS');
      if (t.channel !== channel) throw new CrmError(`Step ${i + 1}: template channel (${t.channel}) does not match the sequence channel (${channel}).`, 400, 'CHANNEL_MISMATCH');
    }
    return steps.map((s: any) => ({ delay_hours: Number(s.delay_hours), template_id: String(s.template_id) }));
  }
  static async createSequence(orgId: string, b: Record<string, any>, actor: Actor) {
    const d = pickFields(b, ['name', 'channel']);
    if (!d.name || !d.channel) throw new CrmError('name and channel are required.', 400, 'FIELDS_REQUIRED');
    oneOf(d.channel, MESSAGE_CHANNELS, 'channel');
    const steps = await CrmMarketing.validSteps(orgId, d.channel, b.steps);
    return (await pool.query(`INSERT INTO crm_sequences (id, organization_id, name, channel, steps, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [newId('seq'), orgId, d.name, d.channel, JSON.stringify(steps), actor.id])).rows[0];
  }
  static async updateSequence(orgId: string, id: string, b: Record<string, any>) {
    const cur = (await pool.query(`SELECT * FROM crm_sequences WHERE organization_id = $1 AND id = $2`, [orgId, id])).rows[0];
    if (!cur) throw new CrmError('Sequence not found.', 404, 'NOT_FOUND');
    const cols: Record<string, any> = {};
    if (b.name !== undefined) { if (!String(b.name).trim()) throw new CrmError('Name is required.', 400, 'NAME_REQUIRED'); cols.name = String(b.name).trim(); }
    if (b.is_active !== undefined) cols.is_active = Boolean(b.is_active);
    if (b.steps !== undefined) cols.steps = JSON.stringify(await CrmMarketing.validSteps(orgId, cur.channel, b.steps));
    if (!Object.keys(cols).length) return cur;
    const set = buildSet(cols);
    return (await pool.query(`UPDATE crm_sequences SET ${set.sql} WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2} RETURNING *`, [...set.values, orgId, id])).rows[0];
  }
  static async deleteSequence(orgId: string, id: string) {
    const r = await pool.query(`DELETE FROM crm_sequences WHERE organization_id = $1 AND id = $2 RETURNING id`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Sequence not found.', 404, 'NOT_FOUND');
    return { id };
  }
  static async enroll(orgId: string, sequenceId: string, entityType: string, entityId: string) {
    oneOf(entityType, ['lead', 'contact'], 'entity_type');
    const seq = (await pool.query(`SELECT * FROM crm_sequences WHERE organization_id = $1 AND id = $2 AND is_active = TRUE`, [orgId, sequenceId])).rows[0];
    if (!seq) throw new CrmError('Active sequence not found.', 404, 'NOT_FOUND');
    const table = entityType === 'lead' ? 'crm_leads' : 'crm_contacts';
    if (!(await pool.query(`SELECT 1 FROM ${table} WHERE organization_id = $1 AND id = $2`, [orgId, entityId])).rows.length) throw new CrmError(`${entityType} not found.`, 404, 'NOT_FOUND');
    const r = await pool.query(
      `INSERT INTO crm_sequence_enrollments (id, organization_id, sequence_id, entity_type, entity_id, next_run_at) VALUES ($1,$2,$3,$4,$5, NOW() + ($6 || ' hours')::interval)
       ON CONFLICT (sequence_id, entity_type, entity_id) DO NOTHING RETURNING *`, [newId('enr'), orgId, sequenceId, entityType, entityId, String(seq.steps[0]?.delay_hours ?? 0)]);
    if (!r.rows.length) throw new CrmError('Already enrolled in this sequence.', 409, 'ALREADY_ENROLLED');
    return r.rows[0];
  }
  static async stopEnrollment(orgId: string, id: string) {
    const r = await pool.query(`UPDATE crm_sequence_enrollments SET status = 'stopped', next_run_at = NULL WHERE organization_id = $1 AND id = $2 AND status = 'active' RETURNING *`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Active enrollment not found.', 404, 'NOT_FOUND');
    return r.rows[0];
  }
  static async listEnrollments(orgId: string, sequenceId: string) {
    return (await pool.query(`SELECT * FROM crm_sequence_enrollments WHERE organization_id = $1 AND sequence_id = $2 ORDER BY created_at DESC LIMIT 500`, [orgId, sequenceId])).rows;
  }

  /** Executes due steps. Without a delivery provider each step becomes a task for the owner; consent/suppression are checked first. */
  static async runDueSequences(orgId: string) {
    const out = { processed: 0, tasks_created: 0, stopped_no_consent: 0, completed: 0 };
    const due = (await pool.query(
      `SELECT e.*, s.steps, s.channel, s.name AS seq_name FROM crm_sequence_enrollments e JOIN crm_sequences s ON s.id = e.sequence_id
        WHERE e.organization_id = $1 AND e.status = 'active' AND s.is_active = TRUE AND e.next_run_at <= NOW() ORDER BY e.next_run_at LIMIT 200`, [orgId])).rows;
    for (const e of due) {
      await tx(async (c) => {
        const cur = (await c.query(`SELECT * FROM crm_sequence_enrollments WHERE id = $1 AND status = 'active' AND next_run_at <= NOW() FOR UPDATE SKIP LOCKED`, [e.id])).rows[0];
        if (!cur) return;
        out.processed++;
        const table = e.entity_type === 'lead' ? 'crm_leads' : 'crm_contacts';
        const ent = (await c.query(`SELECT * FROM ${table} WHERE organization_id = $1 AND id = $2`, [orgId, e.entity_id])).rows[0];
        const addr = ent ? addrOf(e.channel, ent) : null;
        const suppressed = addr ? (await c.query(`SELECT 1 FROM crm_suppressions WHERE organization_id = $1 AND channel = $2 AND address_norm = $3`, [orgId, e.channel, addr])).rows.length > 0 : true;
        const granted = ent ? (await c.query(`SELECT status FROM crm_consents WHERE organization_id = $1 AND subject_type = $2 AND subject_id = $3 AND channel = $4 AND purpose = 'marketing' ORDER BY created_at DESC LIMIT 1`, [orgId, e.entity_type, e.entity_id, e.channel])).rows[0]?.status === 'granted' : false;
        if (!ent || (e.entity_type === 'lead' && (ent.is_converted || ent.archived_at)) || !addr || suppressed || !granted) {
          await c.query(`UPDATE crm_sequence_enrollments SET status = 'stopped', next_run_at = NULL, last_detail = $2 WHERE id = $1`, [e.id, !ent || ent.archived_at || ent.is_converted ? 'Record no longer eligible' : 'Stopped: no marketing consent, no address, or unsubscribed']);
          out.stopped_no_consent++;
          return;
        }
        const author = await systemUserId(c, orgId);
        if (!author) throw new Error('No user available to attribute the task to.');
        const step = e.steps[e.current_step];
        const tpl = step ? (await c.query(`SELECT name FROM crm_message_templates WHERE id = $1`, [step.template_id])).rows[0] : null;
        await c.query(
          `INSERT INTO crm_activities (id, organization_id, activity_type, subject, description, due_date, priority, lead_id, contact_id, assigned_employee_id, logged_by_user_id)
           VALUES ($1,$2,$3,$4,$5,NOW(),'normal',$6,$7,$8,$9)`,
          [newId('act'), orgId, e.channel === 'call' ? 'call' : e.channel, `Sequence "${e.seq_name}" step ${e.current_step + 1}: send "${tpl?.name ?? 'template'}"`, 'No delivery provider is connected; send this message manually.',
            e.entity_type === 'lead' ? e.entity_id : null, e.entity_type === 'contact' ? e.entity_id : null, ent.assigned_employee_id ?? null, author]);
        out.tasks_created++;
        const next = e.current_step + 1;
        if (next >= e.steps.length) {
          await c.query(`UPDATE crm_sequence_enrollments SET status = 'completed', current_step = $2, next_run_at = NULL, last_detail = 'Completed' WHERE id = $1`, [e.id, next]);
          out.completed++;
        } else {
          await c.query(`UPDATE crm_sequence_enrollments SET current_step = $2, next_run_at = NOW() + ($3 || ' hours')::interval, last_detail = 'Task created for owner' WHERE id = $1`, [e.id, next, String(e.steps[next].delay_hours)]);
        }
      }).catch((err) => console.error('[CRM] sequence step failed', e.id, err?.message));
    }
    return out;
  }
}
