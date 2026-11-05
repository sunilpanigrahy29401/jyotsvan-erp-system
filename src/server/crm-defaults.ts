// Per-tenant CRM configuration defaults (not demo data): lead sources, a starter pipeline, SLA policies, ticket
// categories and the integration catalogue. Idempotent; created lazily the first time a tenant uses CRM.
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';

const done = new Set<string>();

const SOURCES: Array<[string, string, string]> = [
  ['Website Form', 'webform', 'webform'], ['IndiaMART', 'indiamart', 'indiamart'], ['Meta Lead Ads', 'meta_ads', 'meta_ads'],
  ['Google Ads', 'google_ads', 'google_ads'], ['Referral', 'referral', 'referral'], ['Direct / Walk-in', 'direct', 'direct'],
  ['Field / Event', 'field_event', 'field_event'], ['Shopify', 'shopify', 'shopify'], ['WhatsApp', 'whatsapp', 'whatsapp'],
  ['CSV Import', 'csv_import', 'csv_import'],
];

const STAGES: Array<[string, string, number, boolean, boolean, string]> = [
  ['New Opportunity', 'new', 10, false, false, '#64748b'], ['Qualified', 'qualified', 25, false, false, '#3b82f6'],
  ['Proposal Sent', 'proposal', 50, false, false, '#8b5cf6'], ['Negotiation', 'negotiation', 75, false, false, '#f59e0b'],
  ['Closed Won', 'won', 100, true, false, '#10b981'], ['Closed Lost', 'lost', 0, false, true, '#ef4444'],
];

const LEAD_SLA: Array<[string, number]> = [['urgent', 15], ['high', 60], ['medium', 240], ['low', 1440]];
const TICKET_SLA: Array<[string, number, number]> = [['urgent', 30, 480], ['high', 120, 1440], ['medium', 480, 4320], ['low', 1440, 10080]];
const TICKET_CATEGORIES = ['Order / Delivery', 'Product Quality', 'Payment / Invoice', 'Return / Refund', 'Scheme / Claim', 'General Enquiry'];
const INTEGRATIONS: Array<[string, string]> = [
  ['webform', 'Website Lead Forms'], ['indiamart', 'IndiaMART'], ['meta_ads', 'Meta Lead Ads'], ['google_ads', 'Google Ads Leads'],
  ['whatsapp', 'WhatsApp Business'], ['chatwoot', 'Chatwoot Inbox'], ['shopify', 'Shopify Customers'],
];

export async function ensureCrmDefaults(orgId: string): Promise<void> {
  if (done.has(orgId)) return;
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    for (const [name, code, type] of SOURCES) {
      await c.query(
        `INSERT INTO crm_lead_sources (id, organization_id, name, code, channel_type) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (organization_id, code) DO NOTHING`,
        [newId('src'), orgId, name, code, type]
      );
    }
    const hasPipeline = await c.query(`SELECT 1 FROM crm_pipelines WHERE organization_id = $1 LIMIT 1`, [orgId]);
    if (!hasPipeline.rows.length) {
      const pid = newId('pipe');
      await c.query(`INSERT INTO crm_pipelines (id, organization_id, name, code, is_default) VALUES ($1,$2,'Sales Pipeline','sales',TRUE) ON CONFLICT (organization_id, code) DO NOTHING`, [pid, orgId]);
      const real = (await c.query(`SELECT id FROM crm_pipelines WHERE organization_id = $1 AND code = 'sales'`, [orgId])).rows[0].id;
      let order = 1;
      for (const [name, code, prob, won, lost, color] of STAGES) {
        await c.query(
          `INSERT INTO crm_pipeline_stages (id, pipeline_id, name, code, display_order, default_probability, is_won_stage, is_lost_stage, color)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (pipeline_id, code) DO NOTHING`,
          [newId('stg'), real, name, code, order++, prob, won, lost, color]
        );
      }
    }
    for (const [priority, minutes] of LEAD_SLA) {
      await c.query(`INSERT INTO crm_sla_policies (id, organization_id, priority, first_response_minutes) VALUES ($1,$2,$3,$4) ON CONFLICT (organization_id, priority) DO NOTHING`, [newId('sla'), orgId, priority, minutes]);
    }
    for (const [priority, fr, res] of TICKET_SLA) {
      await c.query(`INSERT INTO crm_ticket_sla_policies (id, organization_id, priority, first_response_minutes, resolution_minutes) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (organization_id, priority) DO NOTHING`, [newId('tsla'), orgId, priority, fr, res]);
    }
    for (const name of TICKET_CATEGORIES) {
      await c.query(`INSERT INTO crm_ticket_categories (id, organization_id, name) VALUES ($1,$2,$3) ON CONFLICT (organization_id, name) DO NOTHING`, [newId('tcat'), orgId, name]);
    }
    for (const [provider, name] of INTEGRATIONS) {
      // Status is honest: nothing is "connected" until a real credential/endpoint is configured.
      await c.query(
        `INSERT INTO crm_integration_configs (id, organization_id, provider, provider_name, status) VALUES ($1,$2,$3,$4,'awaiting_credentials') ON CONFLICT (organization_id, provider) DO NOTHING`,
        [newId('int'), orgId, provider, name]
      );
    }
    await c.query('COMMIT');
    done.add(orgId);
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}
