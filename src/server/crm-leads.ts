// Lead lifecycle: create / update / archive / merge / bulk / import / export / auto-assign / SLA.
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';
import {
  findDuplicates, markFirstResponse, nextNumber, normEmail, normPhone, pickOwner, scoreLead, slaDueAt, validEmail,
  type DuplicateMatch,
} from './crm-core.ts';

export class CrmError extends Error {
  constructor(message: string, public status = 400, public code = 'BAD_REQUEST', public extra?: Record<string, unknown>) {
    super(message);
  }
}

type Actor = { id: string; email: string };

export const LEAD_STATUSES = ['new', 'assigned', 'contacted', 'attempted', 'qualified', 'nurturing', 'unqualified', 'converted', 'lost', 'archived'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const TEXT_COLS = [
  'first_name', 'last_name', 'display_name', 'company_name', 'designation', 'email', 'phone', 'alternate_phone', 'website', 'address',
  'city', 'state', 'country', 'pincode', 'relationship_type', 'industry', 'business_category', 'expected_requirement',
  'purchase_timeline', 'budget_range', 'current_supplier', 'business_size', 'source_id', 'campaign_id', 'campaign_name',
  'assigned_employee_id', 'assigned_team', 'territory', 'priority', 'qualification_notes', 'disqualification_reason',
  'next_follow_up_date',
] as const;
const NUM_COLS = ['estimated_quantity', 'estimated_deal_value', 'lead_score'] as const;
const JSON_COLS = ['product_interest', 'tags', 'custom_fields'] as const;
/** Columns declared NOT NULL: a null/blank value means "leave unchanged", never "clear". */
const NOT_NULL = new Set(['first_name', 'last_name', 'display_name', 'phone', 'relationship_type', 'priority', 'purchase_timeline', 'business_size', 'lead_score']);
/** Fields whose change should re-run scoring. */
const SCORE_INPUTS = new Set(['estimated_deal_value', 'estimated_quantity', 'purchase_timeline', 'email', 'phone', 'company_name', 'designation', 'state', 'city', 'source_id', 'relationship_type', 'business_size', 'industry', 'budget_range', 'priority', 'territory', 'website']);

function clean(v: unknown): unknown {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return v === undefined ? undefined : v;
}

async function tx<T>(fn: (c: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

function dupError(matches: DuplicateMatch[]): CrmError {
  const first = matches[0];
  return new CrmError(
    `Possible duplicate: ${first.entity} "${first.label}"${first.number ? ` (${first.number})` : ''} matches on ${first.matched_on.join(' and ')}.`,
    409, 'DUPLICATE', { matches }
  );
}

async function assertRefs(c: import('pg').PoolClient, orgId: string, d: Record<string, any>) {
  if (d.assigned_employee_id) {
    const r = await c.query(`SELECT 1 FROM employees WHERE id = $1 AND organization_id = $2`, [d.assigned_employee_id, orgId]);
    if (!r.rows.length) throw new CrmError('Assigned employee does not exist in this organization.', 400, 'INVALID_EMPLOYEE');
  }
  if (d.source_id) {
    const r = await c.query(`SELECT 1 FROM crm_lead_sources WHERE id = $1 AND organization_id = $2`, [d.source_id, orgId]);
    if (!r.rows.length) throw new CrmError('Lead source does not exist in this organization.', 400, 'INVALID_SOURCE');
  }
}

function validateCommon(d: Record<string, any>) {
  if (d.email && !validEmail(d.email)) throw new CrmError('Email address is not valid.', 400, 'INVALID_EMAIL');
  if (d.priority && !PRIORITIES.includes(d.priority)) throw new CrmError(`Priority must be one of: ${PRIORITIES.join(', ')}.`, 400, 'INVALID_PRIORITY');
  if (d.status && !(LEAD_STATUSES as readonly string[]).includes(d.status)) throw new CrmError(`Status must be one of: ${LEAD_STATUSES.join(', ')}.`, 400, 'INVALID_STATUS');
  for (const k of ['estimated_deal_value', 'estimated_quantity']) {
    if (d[k] !== undefined && d[k] !== null && (!Number.isFinite(Number(d[k])) || Number(d[k]) < 0)) throw new CrmError(`${k} must be a non-negative number.`, 400, 'INVALID_NUMBER');
  }
  if (d.lead_score !== undefined && d.lead_score !== null && (!Number.isInteger(Number(d.lead_score)) || Number(d.lead_score) < 0 || Number(d.lead_score) > 100)) {
    throw new CrmError('lead_score must be an integer between 0 and 100.', 400, 'INVALID_SCORE');
  }
}

export class CrmLeads {
  // ---------------------------------------------------------------------------------------------------------------
  static async create(orgId: string, raw: Record<string, any>, actor: Actor, opts: { client?: import('pg').PoolClient; allowDuplicate?: boolean; skipAutoAssign?: boolean; importBatchId?: string } = {}) {
    const d: Record<string, any> = {};
    for (const k of [...TEXT_COLS, ...NUM_COLS, ...JSON_COLS, 'status'] as const) if (raw[k] !== undefined) d[k] = clean(raw[k]);
    const phone = normPhone(d.phone);
    const email = normEmail(d.email);
    if (!phone && !email) throw new CrmError('A valid phone number or email address is required.', 400, 'CONTACT_REQUIRED');
    validateCommon(d);

    const run = async (c: import('pg').PoolClient) => {
      await assertRefs(c, orgId, d);
      if (!opts.allowDuplicate && !raw.allow_duplicate) {
        const dups = await findDuplicates(c, orgId, { phone: d.phone, email: d.email });
        if (dups.length) throw dupError(dups);
      }
      const leadNumber = await nextNumber(c, orgId, 'lead', 'LEAD');
      const id = newId('lead');
      const first = d.first_name || (d.display_name ? String(d.display_name).split(' ')[0] : null) || d.company_name || 'Prospect';
      const last = d.last_name || (d.display_name ? String(d.display_name).split(' ').slice(1).join(' ') : '') || '';
      const display = d.display_name || `${first} ${last}`.trim();
      const priority = d.priority || 'medium';

      let ownerId: string | null = d.assigned_employee_id || null;
      if (!ownerId && !opts.skipAutoAssign) {
        const pick = await pickOwner(c, orgId, { ...d, source_id: d.source_id });
        ownerId = pick?.employeeId || null;
      }
      const score = d.lead_score ?? (await scoreLead(c, orgId, { ...d, phone: d.phone }));
      const due = await slaDueAt(c, orgId, priority);
      const status = d.status || (ownerId ? 'assigned' : 'new');

      const r = await c.query(
        `INSERT INTO crm_leads (
           id, organization_id, lead_number, first_name, last_name, display_name, company_name, designation, email, phone, alternate_phone,
           website, address, city, state, country, pincode, relationship_type, industry, business_category, expected_requirement,
           estimated_quantity, estimated_deal_value, product_interest, purchase_timeline, budget_range, current_supplier, business_size,
           source_id, campaign_id, campaign_name, assigned_employee_id, assigned_team, territory, lead_score, priority, status,
           qualification_notes, next_follow_up_date, tags, custom_fields, created_by_user_id,
           phone_norm, email_norm, assigned_at, sla_due_at, created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,
           $35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46, NOW(), NOW()
         ) RETURNING *`,
        [
          id, orgId, leadNumber, first, last, display, d.company_name ?? null, d.designation ?? null, d.email ?? null, d.phone ?? '', d.alternate_phone ?? null,
          d.website ?? null, d.address ?? null, d.city ?? null, d.state ?? null, d.country ?? 'India', d.pincode ?? null,
          d.relationship_type ?? 'b2b_client', d.industry ?? null, d.business_category ?? null, d.expected_requirement ?? null,
          d.estimated_quantity ?? null, d.estimated_deal_value ?? 0, JSON.stringify(d.product_interest ?? []), d.purchase_timeline ?? '30_days',
          d.budget_range ?? null, d.current_supplier ?? null, d.business_size ?? 'medium', d.source_id ?? null, d.campaign_id ?? null,
          d.campaign_name ?? null, ownerId, d.assigned_team ?? null, d.territory ?? null, score, priority, status,
          d.qualification_notes ?? null, d.next_follow_up_date ?? null, JSON.stringify(d.tags ?? []), JSON.stringify(d.custom_fields ?? {}), actor.id,
          phone, email, ownerId ? new Date() : null, due,
        ]
      );
      await c.query(
        `INSERT INTO crm_lead_status_history (id, lead_id, previous_status, new_status, reason, changed_by_user_id) VALUES ($1,$2,NULL,$3,$4,$5)`,
        [newId('lsh'), id, status, ownerId && !d.assigned_employee_id ? 'Created and auto-assigned' : 'Lead created', actor.id]
      );
      if (opts.importBatchId) await c.query(`UPDATE crm_leads SET import_batch_id = $1 WHERE id = $2`, [opts.importBatchId, id]);
      return r.rows[0];
    };
    return opts.client ? run(opts.client) : tx(run);
  }

  // ---------------------------------------------------------------------------------------------------------------
  static async update(orgId: string, leadId: string, raw: Record<string, any>, actor: Actor) {
    const d: Record<string, any> = {};
    for (const k of [...TEXT_COLS, ...NUM_COLS, ...JSON_COLS, 'status'] as const) if (Object.prototype.hasOwnProperty.call(raw, k)) d[k] = clean(raw[k]);
    validateCommon(d);

    return tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_leads WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, leadId])).rows[0];
      if (!cur) throw new CrmError('Lead not found.', 404, 'NOT_FOUND');
      if (cur.is_converted && d.status && d.status !== 'converted') throw new CrmError('A converted lead cannot change status.', 409, 'LEAD_CONVERTED');
      if (d.status === 'converted' && !cur.is_converted) throw new CrmError('Use the convert action to convert a lead.', 400, 'USE_CONVERT');
      if (d.status === 'lost' && !d.disqualification_reason && !cur.disqualification_reason) throw new CrmError('A reason is required when marking a lead as lost.', 400, 'REASON_REQUIRED');
      await assertRefs(c, orgId, d);

      const sets: string[] = [];
      const vals: any[] = [];
      const put = (col: string, v: any) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };

      for (const k of TEXT_COLS) {
        if (!(k in d)) continue;
        if (d[k] === null && NOT_NULL.has(k)) continue;
        put(k, d[k]);
      }
      for (const k of NUM_COLS) if (k in d && d[k] !== null) put(k, Number(d[k]));
      if (d.status) put('status', d.status);
      for (const k of JSON_COLS) if (k in d && d[k] !== null) put(k, JSON.stringify(d[k]));

      const nextPhone = 'phone' in d ? d.phone : cur.phone;
      const nextEmail = 'email' in d ? d.email : cur.email;
      if (!normPhone(nextPhone) && !normEmail(nextEmail)) throw new CrmError('A lead needs a phone number or an email address.', 400, 'CONTACT_REQUIRED');
      if ('phone' in d || 'email' in d) {
        const dups = (await findDuplicates(c, orgId, { phone: nextPhone, email: nextEmail, excludeLeadId: leadId }));
        if (dups.length && !raw.allow_duplicate) throw dupError(dups);
        put('phone_norm', normPhone(nextPhone));
        put('email_norm', normEmail(nextEmail));
      }
      if ('first_name' in d || 'last_name' in d) {
        if (!('display_name' in d)) put('display_name', `${d.first_name ?? cur.first_name} ${d.last_name ?? cur.last_name}`.trim());
      }
      if (d.assigned_employee_id && d.assigned_employee_id !== cur.assigned_employee_id) {
        put('assigned_at', new Date());
        if (!('status' in d) && cur.status === 'new') d.status = 'assigned';
      }
      if ('priority' in d && d.priority && d.priority !== cur.priority && !cur.first_response_at) {
        put('sla_due_at', await slaDueAt(c, orgId, d.priority, new Date(cur.created_at)));
      }
      if (!('lead_score' in d) && Object.keys(d).some((k) => SCORE_INPUTS.has(k))) {
        put('lead_score', await scoreLead(c, orgId, { ...cur, ...d }));
      }

      if (sets.length === 0) return cur;
      sets.push('updated_at = NOW()');
      vals.push(orgId, leadId);
      const upd = await c.query(`UPDATE crm_leads SET ${sets.join(', ')} WHERE organization_id = $${vals.length - 1} AND id = $${vals.length} RETURNING *`, vals);

      if (d.status && d.status !== cur.status) {
        await c.query(
          `INSERT INTO crm_lead_status_history (id, lead_id, previous_status, new_status, reason, changed_by_user_id) VALUES ($1,$2,$3,$4,$5,$6)`,
          [newId('lsh'), leadId, cur.status, d.status, d.disqualification_reason || raw.reason || 'Status update', actor.id]
        );
        if (cur.status === 'new' || cur.status === 'assigned') await markFirstResponse(c, orgId, leadId);
      }
      return upd.rows[0];
    });
  }

  // ---------------------------------------------------------------------------------------------------------------
  /** Soft delete. Converted leads are kept (they are the audit trail of how an account was won). */
  static async archive(orgId: string, leadId: string, actor: Actor, reason?: string) {
    return tx(async (c) => {
      const cur = (await c.query(`SELECT status, is_converted FROM crm_leads WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, leadId])).rows[0];
      if (!cur) throw new CrmError('Lead not found.', 404, 'NOT_FOUND');
      if (cur.is_converted) throw new CrmError('A converted lead cannot be archived.', 409, 'LEAD_CONVERTED');
      const r = await c.query(
        `UPDATE crm_leads SET status = 'archived', archived_at = NOW(), archived_by = $3, updated_at = NOW() WHERE organization_id = $1 AND id = $2 RETURNING *`,
        [orgId, leadId, actor.id]
      );
      await c.query(`INSERT INTO crm_lead_status_history (id, lead_id, previous_status, new_status, reason, changed_by_user_id) VALUES ($1,$2,$3,'archived',$4,$5)`,
        [newId('lsh'), leadId, cur.status, reason || 'Archived', actor.id]);
      return r.rows[0];
    });
  }

  static async restore(orgId: string, leadId: string, actor: Actor) {
    return tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_leads WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, leadId])).rows[0];
      if (!cur) throw new CrmError('Lead not found.', 404, 'NOT_FOUND');
      if (cur.merged_into_id) throw new CrmError('A merged lead cannot be restored; it was merged into another lead.', 409, 'LEAD_MERGED');
      if (cur.status !== 'archived') throw new CrmError('Lead is not archived.', 409, 'NOT_ARCHIVED');
      const dups = await findDuplicates(c, orgId, { phone: cur.phone, email: cur.email, excludeLeadId: leadId });
      if (dups.length) throw dupError(dups);
      const status = cur.assigned_employee_id ? 'assigned' : 'new';
      const r = await c.query(`UPDATE crm_leads SET status = $3, archived_at = NULL, archived_by = NULL, updated_at = NOW() WHERE organization_id = $1 AND id = $2 RETURNING *`, [orgId, leadId, status]);
      await c.query(`INSERT INTO crm_lead_status_history (id, lead_id, previous_status, new_status, reason, changed_by_user_id) VALUES ($1,$2,'archived',$3,'Restored',$4)`, [newId('lsh'), leadId, status, actor.id]);
      return r.rows[0];
    });
  }

  /** Permanent removal: only archived, unconverted leads. Dependent history/activities are removed by FK cascade or detached. */
  static async purge(orgId: string, leadId: string) {
    return tx(async (c) => {
      const cur = (await c.query(`SELECT status, is_converted FROM crm_leads WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, leadId])).rows[0];
      if (!cur) throw new CrmError('Lead not found.', 404, 'NOT_FOUND');
      if (cur.is_converted) throw new CrmError('A converted lead cannot be deleted.', 409, 'LEAD_CONVERTED');
      if (cur.status !== 'archived') throw new CrmError('Archive the lead first; only archived leads can be permanently deleted.', 409, 'NOT_ARCHIVED');
      await c.query(`DELETE FROM crm_leads WHERE organization_id = $1 AND id = $2`, [orgId, leadId]);
      return { id: leadId };
    });
  }

  // ---------------------------------------------------------------------------------------------------------------
  static async duplicatesOf(orgId: string, leadId: string) {
    const lead = (await pool.query(`SELECT phone, email FROM crm_leads WHERE organization_id = $1 AND id = $2`, [orgId, leadId])).rows[0];
    if (!lead) throw new CrmError('Lead not found.', 404, 'NOT_FOUND');
    return findDuplicates(pool, orgId, { phone: lead.phone, email: lead.email, excludeLeadId: leadId });
  }

  /** Groups of open leads that share a phone or e-mail (for the "find duplicates" screen). */
  static async duplicateGroups(orgId: string) {
    const r = await pool.query(
      `WITH k AS (
         SELECT id, lead_number, display_name, company_name, phone, email, status, created_at,
                COALESCE(phone_norm, 'e:' || email_norm) AS grp
           FROM crm_leads WHERE organization_id = $1 AND archived_at IS NULL AND merged_into_id IS NULL AND is_converted = FALSE
              AND COALESCE(phone_norm, email_norm) IS NOT NULL)
       SELECT grp, JSON_AGG(JSON_BUILD_OBJECT('id', id, 'lead_number', lead_number, 'display_name', display_name, 'company_name', company_name,
              'phone', phone, 'email', email, 'status', status, 'created_at', created_at) ORDER BY created_at) AS leads
         FROM k GROUP BY grp HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC LIMIT 100`,
      [orgId]
    );
    return r.rows.map((x: any) => ({ key: x.grp, leads: x.leads }));
  }

  /** Merge duplicates into a survivor: history/activities/notes/deals move over, blanks on the survivor are filled. */
  static async merge(orgId: string, survivorId: string, mergedIds: string[], actor: Actor) {
    const ids = [...new Set(mergedIds)].filter((x) => x !== survivorId);
    if (!ids.length) throw new CrmError('Choose at least one other lead to merge.', 400, 'NOTHING_TO_MERGE');
    if (ids.length > 20) throw new CrmError('Merge at most 20 leads at once.', 400, 'TOO_MANY');
    return tx(async (c) => {
      const all = (await c.query(`SELECT * FROM crm_leads WHERE organization_id = $1 AND id = ANY($2::text[]) FOR UPDATE`, [orgId, [survivorId, ...ids]])).rows;
      const survivor = all.find((l: any) => l.id === survivorId);
      if (!survivor) throw new CrmError('Surviving lead not found.', 404, 'NOT_FOUND');
      if (all.length !== ids.length + 1) throw new CrmError('One or more leads to merge were not found.', 404, 'NOT_FOUND');
      if (survivor.is_converted || survivor.archived_at) throw new CrmError('The surviving lead must be an open lead.', 409, 'INVALID_SURVIVOR');
      const FILL = ['company_name', 'designation', 'email', 'alternate_phone', 'website', 'address', 'city', 'state', 'pincode', 'industry', 'business_category',
        'expected_requirement', 'current_supplier', 'budget_range', 'source_id', 'assigned_employee_id', 'territory', 'next_follow_up_date'];
      const patch: Record<string, any> = {};
      let tags = new Set<string>(survivor.tags || []);
      let best = Number(survivor.lead_score);
      let value = Number(survivor.estimated_deal_value || 0);
      for (const l of all) {
        if (l.id === survivorId) continue;
        if (l.is_converted) throw new CrmError(`Lead ${l.lead_number} is already converted and cannot be merged.`, 409, 'LEAD_CONVERTED');
        for (const f of FILL) if ((survivor[f] === null || survivor[f] === '') && l[f] && !patch[f]) patch[f] = l[f];
        (l.tags || []).forEach((t: string) => tags.add(t));
        best = Math.max(best, Number(l.lead_score));
        value = Math.max(value, Number(l.estimated_deal_value || 0));
        await c.query(`INSERT INTO crm_merge_log (id, organization_id, entity, survivor_id, merged_id, snapshot, merged_by) VALUES ($1,$2,'lead',$3,$4,$5,$6)`,
          [newId('mrg'), orgId, survivorId, l.id, JSON.stringify(l), actor.id]);
      }
      const cols = Object.keys(patch);
      const setSql = [...cols.map((k, i) => `${k} = $${i + 3}`), `tags = $${cols.length + 3}`, `lead_score = $${cols.length + 4}`, `estimated_deal_value = $${cols.length + 5}`, 'updated_at = NOW()'];
      await c.query(`UPDATE crm_leads SET ${setSql.join(', ')} WHERE organization_id = $1 AND id = $2`,
        [orgId, survivorId, ...cols.map((k) => patch[k]), JSON.stringify([...tags]), best, value]);
      for (const table of ['crm_activities', 'crm_notes']) {
        await c.query(`UPDATE ${table} SET lead_id = $3 WHERE organization_id = $1 AND lead_id = ANY($2::text[])`, [orgId, ids, survivorId]);
      }
      await c.query(`UPDATE crm_deals SET lead_id = $3 WHERE organization_id = $1 AND lead_id = ANY($2::text[])`, [orgId, ids, survivorId]);
      await c.query(`UPDATE crm_lead_status_history SET lead_id = $2 WHERE lead_id = ANY($1::text[])`, [ids, survivorId]);
      await c.query(`UPDATE crm_leads SET status = 'archived', archived_at = NOW(), archived_by = $3, merged_into_id = $4, updated_at = NOW() WHERE organization_id = $1 AND id = ANY($2::text[])`,
        [orgId, ids, actor.id, survivorId]);
      await c.query(`INSERT INTO crm_lead_status_history (id, lead_id, previous_status, new_status, reason, changed_by_user_id) VALUES ($1,$2,$3,$3,$4,$5)`,
        [newId('lsh'), survivorId, survivor.status, `Merged ${ids.length} duplicate lead(s)`, actor.id]);
      return (await c.query(`SELECT * FROM crm_leads WHERE id = $1`, [survivorId])).rows[0];
    });
  }

  // ---------------------------------------------------------------------------------------------------------------
  static async bulk(orgId: string, action: string, ids: string[], params: Record<string, any>, actor: Actor) {
    if (!Array.isArray(ids) || ids.length === 0) throw new CrmError('Select at least one lead.', 400, 'NO_SELECTION');
    if (ids.length > 500) throw new CrmError('At most 500 leads per bulk action.', 400, 'TOO_MANY');
    const result = { done: 0, skipped: [] as Array<{ id: string; reason: string }> };
    for (const id of ids) {
      try {
        if (action === 'assign') await CrmLeads.update(orgId, id, { assigned_employee_id: params.employee_id, assigned_team: params.team }, actor);
        else if (action === 'status') await CrmLeads.update(orgId, id, { status: params.status, disqualification_reason: params.reason }, actor);
        else if (action === 'archive') await CrmLeads.archive(orgId, id, actor, params.reason);
        else throw new CrmError('Unknown bulk action.', 400, 'BAD_ACTION');
        result.done++;
      } catch (e: any) {
        if (e instanceof CrmError && e.code === 'BAD_ACTION') throw e;
        result.skipped.push({ id, reason: e.message });
      }
    }
    return result;
  }

  /** Runs the assignment rules for every open, unassigned lead (oldest first). */
  static async autoAssign(orgId: string, actor: Actor) {
    const open = (await pool.query(
      `SELECT id FROM crm_leads WHERE organization_id = $1 AND assigned_employee_id IS NULL AND archived_at IS NULL AND is_converted = FALSE
          AND status NOT IN ('lost','unqualified','archived') ORDER BY created_at ASC LIMIT 500`, [orgId])).rows;
    let assigned = 0;
    for (const { id } of open) {
      await tx(async (c) => {
        const lead = (await c.query(`SELECT * FROM crm_leads WHERE id = $1 AND assigned_employee_id IS NULL FOR UPDATE`, [id])).rows[0];
        if (!lead) return;
        const pick = await pickOwner(c, orgId, lead);
        if (!pick) return;
        const status = lead.status === 'new' ? 'assigned' : lead.status;
        await c.query(`UPDATE crm_leads SET assigned_employee_id = $2, assigned_at = NOW(), status = $3, updated_at = NOW() WHERE id = $1`, [id, pick.employeeId, status]);
        if (status !== lead.status) {
          await c.query(`INSERT INTO crm_lead_status_history (id, lead_id, previous_status, new_status, reason, changed_by_user_id) VALUES ($1,$2,$3,$4,'Auto-assigned',$5)`, [newId('lsh'), id, lead.status, status, actor.id]);
        }
        assigned++;
      });
    }
    return { examined: open.length, assigned };
  }

  /** Leads whose first-response SLA has lapsed; stamps sla_breached_at the first time they are seen. */
  static async slaBreaches(orgId: string) {
    await pool.query(
      `UPDATE crm_leads SET sla_breached_at = NOW() WHERE organization_id = $1 AND first_response_at IS NULL AND sla_due_at < NOW() AND sla_breached_at IS NULL AND archived_at IS NULL`,
      [orgId]
    );
    const r = await pool.query(
      `SELECT l.id, l.lead_number, l.display_name, l.priority, l.status, l.sla_due_at, l.assigned_employee_id, e.display_name AS assigned_employee_name,
              EXTRACT(EPOCH FROM (NOW() - l.sla_due_at)) / 60 AS minutes_overdue
         FROM crm_leads l LEFT JOIN employees e ON e.id = l.assigned_employee_id
        WHERE l.organization_id = $1 AND l.first_response_at IS NULL AND l.sla_due_at < NOW() AND l.archived_at IS NULL AND l.is_converted = FALSE
        ORDER BY l.sla_due_at ASC LIMIT 200`, [orgId]);
    return r.rows;
  }

  // ---------------------------------------------------------------------------------------------------------------
  static async import(orgId: string, rows: Array<Record<string, any>>, opts: { mode: 'skip' | 'update'; filename?: string; source_id?: string }, actor: Actor) {
    if (!Array.isArray(rows) || rows.length === 0) throw new CrmError('The file has no rows.', 400, 'EMPTY');
    if (rows.length > 5000) throw new CrmError('Import at most 5,000 rows at a time.', 400, 'TOO_MANY');
    const batchId = newId('imp');
    const out = { batch_id: batchId, total: rows.length, created: 0, updated: 0, duplicates: 0, failed: 0, errors: [] as Array<{ row: number; error: string }> };
    const pending: Array<[string, Record<string, any>, number]> = [];
    for (let i = 0; i < rows.length; i++) {
      const row: Record<string, any> = { ...rows[i], source_id: rows[i].source_id || opts.source_id };
      try {
        await tx(async (c) => {
          const dups = await findDuplicates(c, orgId, { phone: row.phone, email: row.email });
          const leadDup = dups.find((m) => m.entity === 'lead');
          if (dups.length && !(opts.mode === 'update' && leadDup && dups.length === 1)) {
            out.duplicates++;
            out.errors.push({ row: i + 2, error: `Duplicate of ${dups[0].entity} ${dups[0].number || dups[0].label}` });
            return;
          }
          if (leadDup && opts.mode === 'update') {
            const { status: _s, assigned_employee_id: _a, ...rest } = row;
            pending.push([leadDup.id, rest, i + 2]);
            return;
          }
          await CrmLeads.create(orgId, row, actor, { client: c, allowDuplicate: true, importBatchId: batchId });
          out.created++;
        });
      } catch (e: any) {
        out.failed++;
        out.errors.push({ row: i + 2, error: e.message });
      }
    }
    for (const [id, rest, rowNo] of pending) {
      try { await CrmLeads.update(orgId, id, { ...rest, allow_duplicate: true }, actor); out.updated++; }
      catch (e: any) { out.failed++; out.errors.push({ row: rowNo, error: e.message }); }
    }
    out.errors = out.errors.slice(0, 200);
    await pool.query(
      `INSERT INTO crm_import_batches (id, organization_id, entity, filename, mode, total_rows, created_rows, updated_rows, duplicate_rows, failed_rows, errors, created_by)
       VALUES ($1,$2,'lead',$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [batchId, orgId, opts.filename || null, opts.mode, out.total, out.created, out.updated, out.duplicates, out.failed, JSON.stringify(out.errors), actor.id]
    );
    return out;
  }

  static async exportCsv(orgId: string, f: { status?: string; source_id?: string; assigned_employee_id?: string } = {}): Promise<string> {
    const params: any[] = [orgId];
    let where = `l.organization_id = $1 AND l.archived_at IS NULL`;
    if (f.status) { params.push(f.status); where += ` AND l.status = $${params.length}`; }
    if (f.source_id) { params.push(f.source_id); where += ` AND l.source_id = $${params.length}`; }
    if (f.assigned_employee_id) { params.push(f.assigned_employee_id); where += ` AND l.assigned_employee_id = $${params.length}`; }
    const r = await pool.query(
      `SELECT l.lead_number, l.display_name, l.company_name, l.phone, l.email, l.city, l.state, l.status, l.priority, l.lead_score, l.estimated_deal_value,
              s.name AS source, e.display_name AS owner, l.created_at
         FROM crm_leads l LEFT JOIN crm_lead_sources s ON s.id = l.source_id LEFT JOIN employees e ON e.id = l.assigned_employee_id
        WHERE ${where} ORDER BY l.created_at DESC LIMIT 20000`, params);
    const cols = ['lead_number', 'display_name', 'company_name', 'phone', 'email', 'city', 'state', 'status', 'priority', 'lead_score', 'estimated_deal_value', 'source', 'owner', 'created_at'];
    // CSV-injection guard: cells starting with = + - @ are prefixed so spreadsheets do not run them as formulas.
    const cell = (v: unknown) => {
      let s = v instanceof Date ? v.toISOString() : v === null || v === undefined ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [cols.join(','), ...r.rows.map((row: any) => cols.map((c) => cell(row[c])).join(','))].join('\r\n');
  }
}
