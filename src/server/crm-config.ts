// CRM configuration: lead sources, tags, scoring rules, assignment rules, SLA policies, custom fields, automation rules, integrations.
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';
import { AUTOMATION_ACTIONS, AUTOMATION_EVENTS, validateRule } from './crm-automation.ts';
import { CrmError, SCORING_FIELDS, SCORING_OPERATORS, buildSet, oneOf, pickFields, tx } from './crm-core.ts';

const SOURCE_CHANNELS = ['webform', 'indiamart', 'meta_ads', 'google_ads', 'referral', 'direct', 'field_event', 'shopify', 'whatsapp', 'csv_import', 'other'];
const SLUG = /^[a-z][a-z0-9_]{1,47}$/;

async function update(table: string, orgId: string, id: string, cols: Record<string, any>, label: string) {
  if (!Object.keys(cols).length) throw new CrmError('Nothing to update.', 400, 'EMPTY');
  const set = buildSet(cols);
  const r = await pool.query(`UPDATE ${table} SET ${set.sql} WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2} RETURNING *`, [...set.values, orgId, id]);
  if (!r.rows.length) throw new CrmError(`${label} not found.`, 404, 'NOT_FOUND');
  return r.rows[0];
}
async function remove(table: string, orgId: string, id: string, label: string) {
  const r = await pool.query(`DELETE FROM ${table} WHERE organization_id = $1 AND id = $2 RETURNING id`, [orgId, id]);
  if (!r.rows.length) throw new CrmError(`${label} not found.`, 404, 'NOT_FOUND');
  return { id };
}

export class CrmConfig {
  // ---- lead sources ------------------------------------------------------------------------------------------------
  static sources = {
    list: async (orgId: string) => (await pool.query(
      `SELECT s.*, (SELECT COUNT(*)::int FROM crm_leads l WHERE l.source_id = s.id) AS lead_count FROM crm_lead_sources s WHERE s.organization_id = $1 ORDER BY s.name`, [orgId])).rows,
    create: async (orgId: string, b: Record<string, any>) => {
      const d = pickFields(b, ['name', 'code', 'channel_type']);
      if (!d.name) throw new CrmError('Name is required.', 400, 'NAME_REQUIRED');
      oneOf(d.channel_type ?? 'other', SOURCE_CHANNELS, 'channel_type');
      const code = String(d.code || d.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
      return (await pool.query(`INSERT INTO crm_lead_sources (id, organization_id, name, code, channel_type) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [newId('src'), orgId, d.name, code, d.channel_type ?? 'other'])).rows[0];
    },
    update: async (orgId: string, id: string, b: Record<string, any>) => {
      const d = pickFields(b, ['name', 'channel_type']);
      oneOf(d.channel_type, SOURCE_CHANNELS, 'channel_type');
      if ('name' in d && !d.name) throw new CrmError('Name is required.', 400, 'NAME_REQUIRED');
      if (b.is_active !== undefined) (d as any).is_active = Boolean(b.is_active);
      return update('crm_lead_sources', orgId, id, d, 'Lead source');
    },
    remove: async (orgId: string, id: string) => {
      const n = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_leads WHERE organization_id = $1 AND source_id = $2`, [orgId, id])).rows[0].n);
      if (n) throw new CrmError(`${n} lead(s) use this source. Deactivate it instead.`, 409, 'IN_USE');
      return remove('crm_lead_sources', orgId, id, 'Lead source');
    },
  };

  // ---- tags -----------------------------------------------------------------------------------------------------------
  static tags = {
    list: async (orgId: string) => (await pool.query(
      `SELECT t.*, (SELECT COUNT(*)::int FROM crm_leads l WHERE l.organization_id = t.organization_id AND l.tags @> to_jsonb(t.name)) AS lead_count FROM crm_lead_tags t WHERE t.organization_id = $1 ORDER BY t.name`, [orgId])).rows,
    create: async (orgId: string, b: Record<string, any>) => {
      const d = pickFields(b, ['name', 'color']);
      if (!d.name) throw new CrmError('Name is required.', 400, 'NAME_REQUIRED');
      if (d.color && !/^#[0-9a-fA-F]{6}$/.test(d.color)) throw new CrmError('Color must be a hex value like #3b82f6.', 400, 'INVALID_COLOR');
      return (await pool.query(`INSERT INTO crm_lead_tags (id, organization_id, name, color) VALUES ($1,$2,$3,$4) RETURNING *`, [newId('tag'), orgId, d.name, d.color ?? '#3b82f6'])).rows[0];
    },
    remove: async (orgId: string, id: string) => {
      const t = (await pool.query(`SELECT name FROM crm_lead_tags WHERE organization_id = $1 AND id = $2`, [orgId, id])).rows[0];
      if (!t) throw new CrmError('Tag not found.', 404, 'NOT_FOUND');
      await pool.query(`UPDATE crm_leads SET tags = COALESCE((SELECT jsonb_agg(x) FROM jsonb_array_elements(tags) x WHERE x <> to_jsonb($2::text)), '[]'::jsonb) WHERE organization_id = $1 AND tags @> to_jsonb($2::text)`, [orgId, t.name]);
      return remove('crm_lead_tags', orgId, id, 'Tag');
    },
  };

  // ---- scoring rules -----------------------------------------------------------------------------------------------------
  static scoring = {
    meta: () => ({ fields: SCORING_FIELDS, operators: SCORING_OPERATORS }),
    list: async (orgId: string) => (await pool.query(`SELECT * FROM crm_scoring_rules WHERE organization_id = $1 ORDER BY sort_order, created_at`, [orgId])).rows,
    validate: (d: Record<string, any>, creating: boolean) => {
      if (creating && (!d.name || !d.field || !d.operator || d.points === undefined)) throw new CrmError('name, field, operator and points are required.', 400, 'FIELDS_REQUIRED');
      oneOf(d.field, SCORING_FIELDS, 'field');
      oneOf(d.operator, SCORING_OPERATORS, 'operator');
      if (d.points !== undefined && (!Number.isInteger(Number(d.points)) || Math.abs(Number(d.points)) > 100)) throw new CrmError('points must be an integer between -100 and 100.', 400, 'INVALID_POINTS');
      if (['eq', 'ne', 'gte', 'lte', 'contains'].includes(d.operator) && (d.value === undefined || d.value === null)) throw new CrmError('This operator needs a value.', 400, 'VALUE_REQUIRED');
      if (['gte', 'lte'].includes(d.operator) && !Number.isFinite(Number(d.value))) throw new CrmError('gte/lte need a numeric value.', 400, 'INVALID_VALUE');
    },
    create: async (orgId: string, b: Record<string, any>) => {
      const d = pickFields(b, ['name', 'field', 'operator', 'value', 'points', 'sort_order']);
      CrmConfig.scoring.validate(d, true);
      return (await pool.query(
        `INSERT INTO crm_scoring_rules (id, organization_id, name, field, operator, value, points, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [newId('scr'), orgId, d.name, d.field, d.operator, d.value ?? null, Number(d.points), Number(d.sort_order ?? 0)])).rows[0];
    },
    update: async (orgId: string, id: string, b: Record<string, any>) => {
      const d = pickFields(b, ['name', 'field', 'operator', 'value', 'points', 'sort_order']);
      CrmConfig.scoring.validate(d, false);
      if (b.is_active !== undefined) (d as any).is_active = Boolean(b.is_active);
      return update('crm_scoring_rules', orgId, id, { ...d, updated_at: new Date() }, 'Scoring rule');
    },
    remove: (orgId: string, id: string) => remove('crm_scoring_rules', orgId, id, 'Scoring rule'),
    /** Re-scores every open lead with the current rules (explicit action: scores otherwise only change when a lead changes). */
    rescoreAll: async (orgId: string) => {
      const { scoreLead } = await import('./crm-core.ts');
      const leads = (await pool.query(`SELECT * FROM crm_leads WHERE organization_id = $1 AND archived_at IS NULL AND is_converted = FALSE LIMIT 5000`, [orgId])).rows;
      let changed = 0;
      for (const l of leads) {
        const s = await scoreLead(pool, orgId, l);
        if (s !== Number(l.lead_score)) { await pool.query(`UPDATE crm_leads SET lead_score = $3, updated_at = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, l.id, s]); changed++; }
      }
      return { examined: leads.length, changed };
    },
  };

  // ---- assignment rules ----------------------------------------------------------------------------------------------------
  static assignment = {
    list: async (orgId: string) => (await pool.query(`SELECT * FROM crm_assignment_rules WHERE organization_id = $1 ORDER BY priority, created_at`, [orgId])).rows,
    clean: async (orgId: string, b: Record<string, any>, creating: boolean) => {
      const d = pickFields(b, ['name', 'strategy', 'priority']);
      if (creating && (!d.name || !d.strategy)) throw new CrmError('name and strategy are required.', 400, 'FIELDS_REQUIRED');
      oneOf(d.strategy, ['round_robin', 'load_based', 'fixed'], 'strategy');
      if (d.priority !== undefined && !Number.isInteger(Number(d.priority))) throw new CrmError('priority must be an integer.', 400, 'INVALID_NUMBER');
      const out: Record<string, any> = { ...d };
      if (b.conditions !== undefined) {
        if (typeof b.conditions !== 'object' || Array.isArray(b.conditions) || b.conditions === null) throw new CrmError('conditions must be an object.', 400, 'INVALID_CONDITIONS');
        const allowed = ['source_id', 'territory', 'state', 'city', 'relationship_type', 'priority'];
        for (const k of Object.keys(b.conditions)) if (!allowed.includes(k)) throw new CrmError(`Unsupported condition "${k}". Use: ${allowed.join(', ')}.`, 400, 'INVALID_CONDITIONS');
        out.conditions = JSON.stringify(b.conditions);
      }
      if (b.employee_ids !== undefined) {
        const ids = b.employee_ids;
        if (!Array.isArray(ids) || !ids.length || ids.some((x: any) => typeof x !== 'string')) throw new CrmError('employee_ids must be a non-empty list of employee ids.', 400, 'INVALID_EMPLOYEES');
        const found = (await pool.query(`SELECT id FROM employees WHERE organization_id = $1 AND id = ANY($2::text[])`, [orgId, ids])).rows.length;
        if (found !== new Set(ids).size) throw new CrmError('One or more employees do not exist in this organization.', 400, 'INVALID_EMPLOYEES');
        out.employee_ids = JSON.stringify([...new Set(ids)]);
      } else if (creating) throw new CrmError('employee_ids is required.', 400, 'INVALID_EMPLOYEES');
      if (b.is_active !== undefined) out.is_active = Boolean(b.is_active);
      return out;
    },
    create: async (orgId: string, b: Record<string, any>) => {
      const d = await CrmConfig.assignment.clean(orgId, b, true);
      return (await pool.query(
        `INSERT INTO crm_assignment_rules (id, organization_id, name, strategy, priority, conditions, employee_ids, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [newId('asr'), orgId, d.name, d.strategy, Number(d.priority ?? 100), d.conditions ?? '{}', d.employee_ids, d.is_active ?? true])).rows[0];
    },
    update: async (orgId: string, id: string, b: Record<string, any>) => update('crm_assignment_rules', orgId, id, { ...(await CrmConfig.assignment.clean(orgId, b, false)), updated_at: new Date() }, 'Assignment rule'),
    remove: (orgId: string, id: string) => remove('crm_assignment_rules', orgId, id, 'Assignment rule'),
  };

  // ---- SLA policies --------------------------------------------------------------------------------------------------------
  static sla = {
    list: async (orgId: string) => ({
      lead: (await pool.query(`SELECT * FROM crm_sla_policies WHERE organization_id = $1 ORDER BY first_response_minutes`, [orgId])).rows,
      ticket: (await pool.query(`SELECT * FROM crm_ticket_sla_policies WHERE organization_id = $1 ORDER BY first_response_minutes`, [orgId])).rows,
    }),
    upsertLead: async (orgId: string, priority: string, b: Record<string, any>) => {
      oneOf(priority, ['low', 'medium', 'high', 'urgent'], 'priority');
      const m = Number(b.first_response_minutes);
      if (!Number.isInteger(m) || m <= 0) throw new CrmError('first_response_minutes must be a positive integer.', 400, 'INVALID_NUMBER');
      return (await pool.query(
        `INSERT INTO crm_sla_policies (id, organization_id, priority, first_response_minutes, is_active) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (organization_id, priority) DO UPDATE SET first_response_minutes = EXCLUDED.first_response_minutes, is_active = EXCLUDED.is_active RETURNING *`,
        [newId('sla'), orgId, priority, m, b.is_active ?? true])).rows[0];
    },
    upsertTicket: async (orgId: string, priority: string, b: Record<string, any>) => {
      oneOf(priority, ['low', 'medium', 'high', 'urgent'], 'priority');
      const fr = Number(b.first_response_minutes), rs = Number(b.resolution_minutes);
      if (![fr, rs].every((n) => Number.isInteger(n) && n > 0)) throw new CrmError('first_response_minutes and resolution_minutes must be positive integers.', 400, 'INVALID_NUMBER');
      if (rs < fr) throw new CrmError('Resolution time cannot be shorter than first-response time.', 400, 'INVALID_SLA');
      return (await pool.query(
        `INSERT INTO crm_ticket_sla_policies (id, organization_id, priority, first_response_minutes, resolution_minutes) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (organization_id, priority) DO UPDATE SET first_response_minutes = EXCLUDED.first_response_minutes, resolution_minutes = EXCLUDED.resolution_minutes RETURNING *`,
        [newId('tsla'), orgId, priority, fr, rs])).rows[0];
    },
  };

  // ---- custom fields -------------------------------------------------------------------------------------------------------
  static customFields = {
    list: async (orgId: string, entity?: string) => (await pool.query(
      `SELECT * FROM crm_custom_field_defs WHERE organization_id = $1 ${entity ? 'AND entity = $2' : ''} ORDER BY entity, sort_order, label`, entity ? [orgId, entity] : [orgId])).rows,
    clean: (b: Record<string, any>, creating: boolean) => {
      const d = pickFields(b, ['entity', 'field_key', 'label', 'field_type', 'sort_order']);
      if (creating && (!d.entity || !d.field_key || !d.label)) throw new CrmError('entity, field_key and label are required.', 400, 'FIELDS_REQUIRED');
      oneOf(d.entity, ['lead', 'contact', 'account', 'deal'], 'entity');
      oneOf(d.field_type, ['text', 'number', 'date', 'select', 'boolean'], 'field_type');
      if (d.field_key && !SLUG.test(d.field_key)) throw new CrmError('field_key must be lower-case letters, digits and underscores, starting with a letter.', 400, 'INVALID_KEY');
      const out: Record<string, any> = { ...d };
      if (b.options !== undefined) {
        if (!Array.isArray(b.options) || b.options.some((o: any) => typeof o !== 'string')) throw new CrmError('options must be a list of strings.', 400, 'INVALID_OPTIONS');
        out.options = JSON.stringify(b.options);
      }
      if ((out.field_type === 'select') && creating && !(b.options?.length)) throw new CrmError('A select field needs options.', 400, 'INVALID_OPTIONS');
      if (b.is_required !== undefined) out.is_required = Boolean(b.is_required);
      if (b.is_active !== undefined) out.is_active = Boolean(b.is_active);
      return out;
    },
    create: async (orgId: string, b: Record<string, any>) => {
      const d = CrmConfig.customFields.clean(b, true);
      return (await pool.query(
        `INSERT INTO crm_custom_field_defs (id, organization_id, entity, field_key, label, field_type, options, is_required, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [newId('cfd'), orgId, d.entity, d.field_key, d.label, d.field_type ?? 'text', d.options ?? '[]', d.is_required ?? false, Number(d.sort_order ?? 0)])).rows[0];
    },
    update: async (orgId: string, id: string, b: Record<string, any>) => {
      const d = CrmConfig.customFields.clean(b, false);
      delete d.entity; delete d.field_key; // identity of the field never changes (existing values are stored under the key)
      return update('crm_custom_field_defs', orgId, id, d, 'Custom field');
    },
    remove: (orgId: string, id: string) => remove('crm_custom_field_defs', orgId, id, 'Custom field'),
    /** Validates (and normalises) a custom_fields object against the tenant's active definitions. */
    validate: async (orgId: string, entity: 'lead' | 'contact' | 'account' | 'deal', values: unknown, requireAll: boolean): Promise<Record<string, any> | undefined> => {
      const defs = (await pool.query(`SELECT * FROM crm_custom_field_defs WHERE organization_id = $1 AND entity = $2 AND is_active = TRUE`, [orgId, entity])).rows;
      if (values === undefined && !(requireAll && defs.some((d: any) => d.is_required))) return undefined;
      if (values !== undefined && (typeof values !== 'object' || values === null || Array.isArray(values))) throw new CrmError('custom_fields must be an object.', 400, 'INVALID_CUSTOM_FIELDS');
      const v = { ...((values as Record<string, any>) || {}) };
      const out: Record<string, any> = {};
      for (const d of defs) {
        const raw = v[d.field_key];
        const empty = raw === undefined || raw === null || raw === '';
        if (empty) { if (d.is_required && requireAll) throw new CrmError(`${d.label} is required.`, 400, 'CUSTOM_FIELD_REQUIRED'); continue; }
        if (d.field_type === 'number' && !Number.isFinite(Number(raw))) throw new CrmError(`${d.label} must be a number.`, 400, 'INVALID_CUSTOM_FIELD');
        if (d.field_type === 'date' && Number.isNaN(Date.parse(String(raw)))) throw new CrmError(`${d.label} must be a date.`, 400, 'INVALID_CUSTOM_FIELD');
        if (d.field_type === 'boolean' && typeof raw !== 'boolean') throw new CrmError(`${d.label} must be true or false.`, 400, 'INVALID_CUSTOM_FIELD');
        if (d.field_type === 'select' && !(d.options as string[]).includes(String(raw))) throw new CrmError(`${d.label} must be one of: ${(d.options as string[]).join(', ')}.`, 400, 'INVALID_CUSTOM_FIELD');
        out[d.field_key] = d.field_type === 'number' ? Number(raw) : raw;
      }
      for (const k of Object.keys(v)) if (!defs.some((d: any) => d.field_key === k)) throw new CrmError(`Unknown custom field "${k}".`, 400, 'UNKNOWN_CUSTOM_FIELD');
      return out;
    },
  };

  // ---- automation rules -------------------------------------------------------------------------------------------------------
  static automation = {
    meta: () => ({ events: AUTOMATION_EVENTS, actions: AUTOMATION_ACTIONS }),
    list: async (orgId: string) => (await pool.query(`SELECT * FROM crm_automation_rules WHERE organization_id = $1 ORDER BY created_at`, [orgId])).rows,
    logs: async (orgId: string, ruleId?: string) => (await pool.query(
      `SELECT * FROM crm_automation_logs WHERE organization_id = $1 ${ruleId ? 'AND rule_id = $2' : ''} ORDER BY executed_at DESC LIMIT 200`, ruleId ? [orgId, ruleId] : [orgId])).rows,
    create: async (orgId: string, b: Record<string, any>) => {
      const d = pickFields(b, ['name', 'description', 'trigger_event', 'action_type']);
      if (!d.name) throw new CrmError('Name is required.', 400, 'NAME_REQUIRED');
      validateRule({ ...d, conditions: b.conditions, action_params: b.action_params });
      return (await pool.query(
        `INSERT INTO crm_automation_rules (id, organization_id, name, description, trigger_event, conditions, action_type, action_params, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [newId('aut'), orgId, d.name, d.description ?? null, d.trigger_event, JSON.stringify(b.conditions ?? {}), d.action_type, JSON.stringify(b.action_params ?? {}), b.is_active ?? true])).rows[0];
    },
    update: async (orgId: string, id: string, b: Record<string, any>) => {
      const cur = (await pool.query(`SELECT * FROM crm_automation_rules WHERE organization_id = $1 AND id = $2`, [orgId, id])).rows[0];
      if (!cur) throw new CrmError('Automation rule not found.', 404, 'NOT_FOUND');
      const d = pickFields(b, ['name', 'description', 'trigger_event', 'action_type']);
      const next = { trigger_event: d.trigger_event ?? cur.trigger_event, action_type: d.action_type ?? cur.action_type, conditions: b.conditions ?? cur.conditions, action_params: b.action_params ?? cur.action_params };
      validateRule(next);
      const cols: Record<string, any> = { ...d };
      if (b.conditions !== undefined) cols.conditions = JSON.stringify(b.conditions);
      if (b.action_params !== undefined) cols.action_params = JSON.stringify(b.action_params);
      if (b.is_active !== undefined) cols.is_active = Boolean(b.is_active);
      if ('name' in cols && !cols.name) throw new CrmError('Name is required.', 400, 'NAME_REQUIRED');
      return update('crm_automation_rules', orgId, id, { ...cols, updated_at: new Date() }, 'Automation rule');
    },
    remove: (orgId: string, id: string) => tx(async (c) => {
      await c.query(`DELETE FROM crm_automation_logs WHERE organization_id = $1 AND rule_id = $2`, [orgId, id]);
      const r = await c.query(`DELETE FROM crm_automation_rules WHERE organization_id = $1 AND id = $2 RETURNING id`, [orgId, id]);
      if (!r.rows.length) throw new CrmError('Automation rule not found.', 404, 'NOT_FOUND');
      return { id };
    }),
  };

  // ---- integrations (honest status) --------------------------------------------------------------------------------------------
  static integrations = {
    list: async (orgId: string) => {
      const keyConfigured = (process.env.CRM_INGEST_KEY || '').length >= 16;
      const rows = (await pool.query(`SELECT * FROM crm_integration_configs WHERE organization_id = $1 ORDER BY provider`, [orgId])).rows;
      return rows.map((r: any) => {
        const inbound = ['webform', 'indiamart', 'meta_ads', 'google_ads'].includes(r.provider);
        let status = r.status;
        let note: string | null = null;
        if (status !== 'disabled') {
          if (inbound) {
            status = !keyConfigured ? 'awaiting_credentials' : r.total_records_ingested > 0 ? 'connected' : 'configuration_required';
            note = !keyConfigured
              ? 'Set CRM_INGEST_KEY on the server, then point the provider at POST /api/crm/webhooks/inbound?source=' + r.provider
              : r.total_records_ingested > 0 ? null : 'Endpoint is live; no lead has arrived from this source yet.';
          } else {
            status = 'not_connected';
            note = r.provider === 'whatsapp' ? 'Needs a WhatsApp Cloud API / BSP account (not yet connected).'
              : r.provider === 'chatwoot' ? 'Needs a Chatwoot deployment (not yet connected).' : 'Use the Shopify integration module to connect the store.';
          }
        }
        return { ...r, status, note, endpoint: inbound ? `/api/crm/webhooks/inbound?source=${r.provider}` : null };
      });
    },
    setEnabled: async (orgId: string, provider: string, enabled: boolean) => {
      const r = await pool.query(
        `UPDATE crm_integration_configs SET status = $3 WHERE organization_id = $1 AND provider = $2 RETURNING *`, [orgId, provider, enabled ? 'awaiting_credentials' : 'disabled']);
      if (!r.rows.length) throw new CrmError('Integration not found.', 404, 'NOT_FOUND');
      return r.rows[0];
    },
    webhookLogs: async (orgId: string) => (await pool.query(`SELECT id, source, status, created_lead_id, error_details, ip_address, created_at FROM crm_webhook_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 100`, [orgId])).rows,
  };
}
