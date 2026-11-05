// Helpdesk: tickets with SLA timers, escalation, CSAT, comments; plus the knowledge base.
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';
import { fireEvent } from './crm-automation.ts';
import { CrmError, buildSet, nextNumber, oneOf, pickFields, tx, validEmail, type Actor } from './crm-core.ts';

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;
const CHANNELS = ['manual', 'email', 'phone', 'whatsapp', 'web', 'marketplace'];
const COLS = ['subject', 'description', 'category_id', 'priority', 'channel', 'account_id', 'contact_id', 'order_ref', 'assigned_employee_id'] as const;
const NEXT_PRIORITY: Record<string, string> = { low: 'medium', medium: 'high', high: 'urgent', urgent: 'urgent' };
const MAX_ESCALATION = 3;

async function slaFor(c: Pick<import('pg').PoolClient, 'query'>, orgId: string, priority: string, from: Date) {
  const p = (await c.query(`SELECT first_response_minutes, resolution_minutes FROM crm_ticket_sla_policies WHERE organization_id = $1 AND priority = $2`, [orgId, priority])).rows[0];
  if (!p) return { fr: null, res: null };
  return { fr: new Date(from.getTime() + p.first_response_minutes * 60_000), res: new Date(from.getTime() + p.resolution_minutes * 60_000) };
}

async function refs(c: Pick<import('pg').PoolClient, 'query'>, orgId: string, d: Record<string, any>) {
  const map: Array<[string, string]> = [['category_id', 'crm_ticket_categories'], ['account_id', 'crm_accounts'], ['contact_id', 'crm_contacts'], ['assigned_employee_id', 'employees']];
  for (const [k, t] of map) if (d[k] && !(await c.query(`SELECT 1 FROM ${t} WHERE id = $1 AND organization_id = $2`, [d[k], orgId])).rows.length) throw new CrmError(`${k} does not exist in this organization.`, 400, 'INVALID_' + k.toUpperCase());
}

const lastSweep = new Map<string, number>();

export class CrmSupport {
  static async list(orgId: string, f: Record<string, any>, page: { limit: number; offset: number }) {
    await CrmSupport.sweepThrottled(orgId);
    const params: any[] = [orgId];
    let where = 't.organization_id = $1';
    for (const k of ['status', 'priority', 'category_id', 'account_id', 'assigned_employee_id', 'channel']) if (f[k]) { params.push(f[k]); where += ` AND t.${k} = $${params.length}`; }
    if (f.breached === 'true') where += ' AND t.sla_breached_at IS NOT NULL';
    if (f.search) { params.push(`%${String(f.search).toLowerCase()}%`); where += ` AND (LOWER(t.subject) LIKE $${params.length} OR LOWER(t.ticket_number) LIKE $${params.length} OR LOWER(COALESCE(t.order_ref,'')) LIKE $${params.length})`; }
    const total = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_tickets t WHERE ${where}`, params)).rows[0].n);
    params.push(page.limit, page.offset);
    const rows = (await pool.query(
      `SELECT t.*, c.name AS category_name, a.name AS account_name, e.display_name AS assigned_employee_name,
              (t.status IN ('open','pending') AND t.resolution_due_at < NOW()) AS overdue
         FROM crm_tickets t LEFT JOIN crm_ticket_categories c ON c.id = t.category_id LEFT JOIN crm_accounts a ON a.id = t.account_id LEFT JOIN employees e ON e.id = t.assigned_employee_id
        WHERE ${where} ORDER BY (t.status IN ('resolved','closed')), CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
    return { rows, total };
  }

  static async get(orgId: string, id: string, includeInternal = true) {
    const t = (await pool.query(
      `SELECT t.*, c.name AS category_name, a.name AS account_name, ct.display_name AS contact_name, e.display_name AS assigned_employee_name
         FROM crm_tickets t LEFT JOIN crm_ticket_categories c ON c.id = t.category_id LEFT JOIN crm_accounts a ON a.id = t.account_id
         LEFT JOIN crm_contacts ct ON ct.id = t.contact_id LEFT JOIN employees e ON e.id = t.assigned_employee_id WHERE t.organization_id = $1 AND t.id = $2`, [orgId, id])).rows[0];
    if (!t) throw new CrmError('Ticket not found.', 404, 'NOT_FOUND');
    const comments = (await pool.query(`SELECT * FROM crm_ticket_comments WHERE ticket_id = $1 ${includeInternal ? '' : 'AND is_internal = FALSE'} ORDER BY created_at`, [id])).rows;
    return { ...t, comments };
  }

  static async create(orgId: string, body: Record<string, any>, actor: Actor) {
    const d = pickFields(body, COLS);
    if (!d.subject) throw new CrmError('Subject is required.', 400, 'SUBJECT_REQUIRED');
    oneOf(d.priority, TICKET_PRIORITIES, 'priority');
    oneOf(d.channel, CHANNELS, 'channel');
    const ticket = await tx(async (c) => {
      await refs(c, orgId, d);
      let priority = d.priority;
      let owner = d.assigned_employee_id ?? null;
      if (d.category_id) {
        const cat = (await c.query(`SELECT default_priority, default_owner_id FROM crm_ticket_categories WHERE id = $1`, [d.category_id])).rows[0];
        priority = priority ?? cat?.default_priority;
        owner = owner ?? cat?.default_owner_id ?? null;
      }
      priority = priority ?? 'medium';
      const now = new Date();
      const sla = await slaFor(c, orgId, priority, now);
      const no = await nextNumber(c, orgId, 'ticket', 'TKT');
      return (await c.query(
        `INSERT INTO crm_tickets (id, organization_id, ticket_number, subject, description, category_id, priority, channel, account_id, contact_id, order_ref, assigned_employee_id,
                                  first_response_due_at, resolution_due_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [newId('tkt'), orgId, no, d.subject, d.description ?? null, d.category_id ?? null, priority, d.channel ?? 'manual', d.account_id ?? null, d.contact_id ?? null, d.order_ref ?? null,
          owner, sla.fr, sla.res, actor.id])).rows[0];
    });
    void fireEvent(orgId, 'ticket.created', ticket, actor.id);
    return ticket;
  }

  static async update(orgId: string, id: string, body: Record<string, any>) {
    const d = pickFields(body, COLS);
    oneOf(d.priority, TICKET_PRIORITIES, 'priority');
    oneOf(d.channel, CHANNELS, 'channel');
    for (const k of ['subject', 'priority', 'channel']) if (k in d && d[k] === null) delete d[k];
    return tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_tickets WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, id])).rows[0];
      if (!cur) throw new CrmError('Ticket not found.', 404, 'NOT_FOUND');
      if (cur.status === 'closed') throw new CrmError('A closed ticket cannot be edited. Re-open it first.', 409, 'TICKET_CLOSED');
      await refs(c, orgId, d);
      const cols: Record<string, any> = { ...d };
      if (d.priority && d.priority !== cur.priority) {
        const sla = await slaFor(c, orgId, d.priority, new Date(cur.created_at));
        if (!cur.first_response_at) cols.first_response_due_at = sla.fr;
        cols.resolution_due_at = sla.res;
      }
      if (!Object.keys(cols).length) return cur;
      const set = buildSet(cols);
      return (await c.query(`UPDATE crm_tickets SET ${set.sql}, updated_at = NOW() WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2} RETURNING *`, [...set.values, orgId, id])).rows[0];
    });
  }

  static async setStatus(orgId: string, id: string, status: string, actor: Actor, note?: string) {
    oneOf(status, TICKET_STATUSES, 'status');
    if (!status) throw new CrmError('status is required.', 400, 'STATUS_REQUIRED');
    return tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_tickets WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, id])).rows[0];
      if (!cur) throw new CrmError('Ticket not found.', 404, 'NOT_FOUND');
      if (cur.status === status) return cur;
      if (status === 'closed' && cur.status !== 'resolved') throw new CrmError('Resolve the ticket before closing it.', 409, 'INVALID_STATE');
      if (status === 'resolved' && !String(note || '').trim() && !(await c.query(`SELECT 1 FROM crm_ticket_comments WHERE ticket_id = $1 AND is_internal = FALSE`, [id])).rows.length) {
        throw new CrmError('Add a resolution note before resolving the ticket.', 400, 'RESOLUTION_REQUIRED');
      }
      const reopening = ['resolved', 'closed'].includes(cur.status) && ['open', 'pending'].includes(status);
      const r = (await c.query(
        `UPDATE crm_tickets SET status = $3,
                resolved_at = CASE WHEN $5 THEN NOW() WHEN $4 THEN NULL ELSE resolved_at END,
                closed_at = CASE WHEN $6 THEN NOW() WHEN $4 THEN NULL ELSE closed_at END,
                sla_breached_at = CASE WHEN ($5 OR $6) AND resolution_due_at < NOW() THEN COALESCE(sla_breached_at, NOW()) ELSE sla_breached_at END,
                updated_at = NOW() WHERE organization_id = $1 AND id = $2 RETURNING *`, [orgId, id, status, reopening, status === 'resolved', status === 'closed'])).rows[0];
      if (note?.trim()) await c.query(`INSERT INTO crm_ticket_comments (id, organization_id, ticket_id, body, is_internal, author_id, author_name) VALUES ($1,$2,$3,$4,FALSE,$5,$6)`, [newId('tcm'), orgId, id, note.trim(), actor.id, actor.name || actor.email]);
      return r;
    });
  }

  static async addComment(orgId: string, id: string, body: Record<string, any>, actor: Actor) {
    const text = String(body.body || '').trim();
    if (!text) throw new CrmError('Comment text is required.', 400, 'BODY_REQUIRED');
    const internal = Boolean(body.is_internal);
    return tx(async (c) => {
      const t = (await c.query(`SELECT * FROM crm_tickets WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, id])).rows[0];
      if (!t) throw new CrmError('Ticket not found.', 404, 'NOT_FOUND');
      if (t.status === 'closed') throw new CrmError('A closed ticket cannot be commented on.', 409, 'TICKET_CLOSED');
      const cm = (await c.query(`INSERT INTO crm_ticket_comments (id, organization_id, ticket_id, body, is_internal, author_id, author_name) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [newId('tcm'), orgId, id, text, internal, actor.id, actor.name || actor.email])).rows[0];
      if (!internal && !t.first_response_at) {
        await c.query(`UPDATE crm_tickets SET first_response_at = NOW(), sla_breached_at = CASE WHEN first_response_due_at < NOW() THEN COALESCE(sla_breached_at, NOW()) ELSE sla_breached_at END, updated_at = NOW() WHERE id = $1`, [id]);
      }
      return cm;
    });
  }

  static async rate(orgId: string, id: string, score: number, comment?: string) {
    if (!Number.isInteger(score) || score < 1 || score > 5) throw new CrmError('score must be an integer from 1 to 5.', 400, 'INVALID_SCORE');
    const r = await pool.query(
      `UPDATE crm_tickets SET csat_score = $3, csat_comment = $4, csat_at = NOW(), updated_at = NOW()
        WHERE organization_id = $1 AND id = $2 AND status IN ('resolved','closed') AND csat_score IS NULL RETURNING *`, [orgId, id, score, comment?.trim() || null]);
    if (!r.rows.length) {
      const t = (await pool.query(`SELECT status, csat_score FROM crm_tickets WHERE organization_id = $1 AND id = $2`, [orgId, id])).rows[0];
      if (!t) throw new CrmError('Ticket not found.', 404, 'NOT_FOUND');
      throw new CrmError(t.csat_score ? 'This ticket has already been rated.' : 'Only resolved or closed tickets can be rated.', 409, 'INVALID_STATE');
    }
    return r.rows[0];
  }

  /** Marks SLA breaches and escalates overdue tickets one level (raising priority). Idempotent per level. */
  static async sweep(orgId: string) {
    const out = { first_response_breached: 0, escalated: 0 };
    out.first_response_breached = (await pool.query(
      `UPDATE crm_tickets SET sla_breached_at = NOW() WHERE organization_id = $1 AND status IN ('open','pending') AND first_response_at IS NULL AND first_response_due_at < NOW() AND sla_breached_at IS NULL RETURNING id`, [orgId])).rows.length;
    const due = (await pool.query(
      `SELECT * FROM crm_tickets WHERE organization_id = $1 AND status IN ('open','pending') AND resolution_due_at IS NOT NULL AND escalation_level < $2
          AND resolution_due_at + (escalation_level * INTERVAL '4 hours') < NOW() LIMIT 200`, [orgId, MAX_ESCALATION])).rows;
    for (const t of due) {
      const priority = NEXT_PRIORITY[t.priority] || t.priority;
      const upd = (await pool.query(
        `UPDATE crm_tickets SET escalation_level = escalation_level + 1, escalated_at = NOW(), priority = $3, sla_breached_at = COALESCE(sla_breached_at, NOW()), updated_at = NOW()
          WHERE id = $1 AND escalation_level = $2 RETURNING *`, [t.id, t.escalation_level, priority])).rows[0];
      if (!upd) continue; // another worker escalated it first
      await pool.query(`INSERT INTO crm_ticket_comments (id, organization_id, ticket_id, body, is_internal, author_name) VALUES ($1,$2,$3,$4,TRUE,'System')`,
        [newId('tcm'), orgId, t.id, `Escalated to level ${upd.escalation_level}: resolution time exceeded (priority ${t.priority} → ${priority}).`]);
      out.escalated++;
      void fireEvent(orgId, 'ticket.escalated', upd, 'system');
    }
    return out;
  }

  private static async sweepThrottled(orgId: string) {
    const now = Date.now();
    if (now - (lastSweep.get(orgId) || 0) < 60_000) return;
    lastSweep.set(orgId, now);
    await CrmSupport.sweep(orgId).catch((e) => console.error('[CRM] ticket sweep failed', e?.message));
  }

  static async stats(orgId: string) {
    await CrmSupport.sweepThrottled(orgId);
    const r = (await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'open')::int AS open, COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
              COUNT(*) FILTER (WHERE status IN ('resolved','closed'))::int AS resolved,
              COUNT(*) FILTER (WHERE status IN ('open','pending') AND resolution_due_at < NOW())::int AS overdue,
              COUNT(*) FILTER (WHERE sla_breached_at IS NOT NULL)::int AS sla_breached,
              COUNT(*) FILTER (WHERE escalation_level > 0 AND status IN ('open','pending'))::int AS escalated_open,
              ROUND(AVG(csat_score)::numeric, 2) AS avg_csat, COUNT(csat_score)::int AS csat_responses,
              ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL)::numeric, 1) AS avg_resolution_hours
         FROM crm_tickets WHERE organization_id = $1`, [orgId])).rows[0];
    const resolvedTotal = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_tickets WHERE organization_id = $1 AND resolved_at IS NOT NULL`, [orgId])).rows[0].n);
    const withinSla = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_tickets WHERE organization_id = $1 AND resolved_at IS NOT NULL AND resolved_at <= resolution_due_at`, [orgId])).rows[0].n);
    const byCategory = (await pool.query(`SELECT COALESCE(c.name,'Uncategorised') AS category, COUNT(*)::int AS count FROM crm_tickets t LEFT JOIN crm_ticket_categories c ON c.id = t.category_id WHERE t.organization_id = $1 GROUP BY 1 ORDER BY 2 DESC`, [orgId])).rows;
    return { ...r, avg_csat: r.avg_csat === null ? null : Number(r.avg_csat), avg_resolution_hours: r.avg_resolution_hours === null ? null : Number(r.avg_resolution_hours), sla_compliance_percent: resolvedTotal ? Math.round((withinSla / resolvedTotal) * 1000) / 10 : null, by_category: byCategory };
  }

  // ---- categories ---------------------------------------------------------------------------------------------------
  static async categories(orgId: string) { return (await pool.query(`SELECT * FROM crm_ticket_categories WHERE organization_id = $1 ORDER BY name`, [orgId])).rows; }
  static async createCategory(orgId: string, body: Record<string, any>) {
    const d = pickFields(body, ['name', 'default_priority', 'default_owner_id']);
    if (!d.name) throw new CrmError('Name is required.', 400, 'NAME_REQUIRED');
    oneOf(d.default_priority, TICKET_PRIORITIES, 'default_priority');
    await refs(pool, orgId, { assigned_employee_id: d.default_owner_id });
    return (await pool.query(`INSERT INTO crm_ticket_categories (id, organization_id, name, default_priority, default_owner_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [newId('tcat'), orgId, d.name, d.default_priority ?? 'medium', d.default_owner_id ?? null])).rows[0];
  }
  static async deleteCategory(orgId: string, id: string) {
    const n = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_tickets WHERE organization_id = $1 AND category_id = $2`, [orgId, id])).rows[0].n);
    if (n) throw new CrmError(`${n} ticket(s) use this category.`, 409, 'IN_USE');
    const r = await pool.query(`DELETE FROM crm_ticket_categories WHERE organization_id = $1 AND id = $2 RETURNING id`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Category not found.', 404, 'NOT_FOUND');
    return { id };
  }

  // ---- knowledge base -------------------------------------------------------------------------------------------------
  static async kbList(orgId: string, f: Record<string, any>) {
    const params: any[] = [orgId];
    let where = 'organization_id = $1';
    if (f.status) { params.push(f.status); where += ` AND status = $${params.length}`; }
    if (f.category) { params.push(f.category); where += ` AND category = $${params.length}`; }
    if (f.search) { params.push(`%${String(f.search).toLowerCase()}%`); where += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(body) LIKE $${params.length})`; }
    return (await pool.query(`SELECT id, title, slug, category, status, tags, views, helpful_yes, helpful_no, updated_at, LEFT(body, 200) AS excerpt FROM crm_kb_articles WHERE ${where} ORDER BY updated_at DESC LIMIT 200`, params)).rows;
  }
  static async kbGet(orgId: string, id: string, countView: boolean) {
    const r = (await pool.query(`SELECT * FROM crm_kb_articles WHERE organization_id = $1 AND (id = $2 OR slug = $2)`, [orgId, id])).rows[0];
    if (!r) throw new CrmError('Article not found.', 404, 'NOT_FOUND');
    if (countView && r.status === 'published') await pool.query(`UPDATE crm_kb_articles SET views = views + 1 WHERE id = $1`, [r.id]);
    return r;
  }
  private static slug(t: string) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'article'; }
  static async kbCreate(orgId: string, body: Record<string, any>, actor: Actor) {
    const d = pickFields(body, ['title', 'category', 'body', 'status']);
    if (!d.title || !d.body) throw new CrmError('Title and body are required.', 400, 'FIELDS_REQUIRED');
    oneOf(d.status, ['draft', 'published'], 'status');
    const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    let slug = CrmSupport.slug(d.title);
    if ((await pool.query(`SELECT 1 FROM crm_kb_articles WHERE organization_id = $1 AND slug = $2`, [orgId, slug])).rows.length) slug += '-' + Date.now().toString(36);
    return (await pool.query(`INSERT INTO crm_kb_articles (id, organization_id, title, slug, category, body, status, tags, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [newId('kb'), orgId, d.title, slug, d.category ?? null, d.body, d.status ?? 'draft', JSON.stringify(tags), actor.id])).rows[0];
  }
  static async kbUpdate(orgId: string, id: string, body: Record<string, any>) {
    const d = pickFields(body, ['title', 'category', 'body', 'status']);
    oneOf(d.status, ['draft', 'published'], 'status');
    for (const k of ['title', 'body']) if (k in d && !d[k]) throw new CrmError(`${k} is required.`, 400, 'FIELDS_REQUIRED');
    const cols: Record<string, any> = { ...d };
    if (body.tags !== undefined) cols.tags = JSON.stringify(Array.isArray(body.tags) ? body.tags.map(String) : []);
    if (!Object.keys(cols).length) throw new CrmError('Nothing to update.', 400, 'EMPTY');
    const set = buildSet(cols);
    const r = await pool.query(`UPDATE crm_kb_articles SET ${set.sql}, updated_at = NOW() WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2} RETURNING *`, [...set.values, orgId, id]);
    if (!r.rows.length) throw new CrmError('Article not found.', 404, 'NOT_FOUND');
    return r.rows[0];
  }
  static async kbDelete(orgId: string, id: string) {
    const r = await pool.query(`DELETE FROM crm_kb_articles WHERE organization_id = $1 AND id = $2 RETURNING id`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Article not found.', 404, 'NOT_FOUND');
    return { id };
  }
  static async kbFeedback(orgId: string, id: string, helpful: boolean) {
    const r = await pool.query(`UPDATE crm_kb_articles SET ${helpful ? 'helpful_yes = helpful_yes + 1' : 'helpful_no = helpful_no + 1'} WHERE organization_id = $1 AND id = $2 AND status = 'published' RETURNING id, helpful_yes, helpful_no`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Published article not found.', 404, 'NOT_FOUND');
    return r.rows[0];
  }
}

export { validEmail };
