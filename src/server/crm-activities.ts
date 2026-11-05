// Activities (tasks, calls, meetings, e-mails, WhatsApp/SMS logs, visits), notes, reminders and an .ics calendar export.
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';
import { CrmError, buildSet, markFirstResponse, oneOf, pickFields, tx, type Actor } from './crm-core.ts';

export const ACTIVITY_TYPES = ['task', 'call', 'meeting', 'email', 'whatsapp', 'sms', 'follow_up', 'visit', 'demo', 'note'] as const;
/** Outbound touches that count as the first response to a lead. */
const TOUCH_TYPES = new Set(['call', 'meeting', 'email', 'whatsapp', 'sms', 'visit', 'demo']);
const COLS = ['activity_type', 'subject', 'description', 'due_date', 'priority', 'lead_id', 'account_id', 'contact_id', 'deal_id', 'ticket_id', 'assigned_employee_id',
  'direction', 'duration_minutes', 'location', 'reminder_at', 'outcome', 'outcome_notes'] as const;

async function checkRefs(c: Pick<import('pg').PoolClient, 'query'>, orgId: string, d: Record<string, any>) {
  const map: Array<[string, string, string]> = [
    ['lead_id', 'crm_leads', 'Lead'], ['account_id', 'crm_accounts', 'Account'], ['contact_id', 'crm_contacts', 'Contact'],
    ['deal_id', 'crm_deals', 'Deal'], ['ticket_id', 'crm_tickets', 'Ticket'], ['assigned_employee_id', 'employees', 'Employee'],
  ];
  for (const [k, table, label] of map) {
    if (!d[k]) continue;
    const r = await c.query(`SELECT 1 FROM ${table} WHERE id = $1 AND organization_id = $2`, [d[k], orgId]);
    if (!r.rows.length) throw new CrmError(`${label} does not exist in this organization.`, 400, 'INVALID_' + k.toUpperCase());
  }
}

function validate(d: Record<string, any>, creating: boolean) {
  if (creating && !d.subject) throw new CrmError('Subject is required.', 400, 'SUBJECT_REQUIRED');
  oneOf(d.activity_type, ACTIVITY_TYPES, 'activity_type');
  oneOf(d.priority, ['low', 'normal', 'high', 'urgent'], 'priority');
  oneOf(d.direction, ['inbound', 'outbound'], 'direction');
  for (const k of ['due_date', 'reminder_at']) if (d[k] && Number.isNaN(Date.parse(d[k]))) throw new CrmError(`${k} is not a valid date/time.`, 400, 'INVALID_DATE');
  if (d.duration_minutes !== undefined && d.duration_minutes !== null && (!Number.isInteger(Number(d.duration_minutes)) || Number(d.duration_minutes) < 0)) throw new CrmError('duration_minutes must be a non-negative integer.', 400, 'INVALID_NUMBER');
}

export class CrmActivities {
  static async list(orgId: string, f: Record<string, any>, page: { limit: number; offset: number }) {
    const params: any[] = [orgId];
    let where = 'a.organization_id = $1';
    for (const k of ['lead_id', 'account_id', 'deal_id', 'contact_id', 'ticket_id', 'assigned_employee_id', 'activity_type']) if (f[k]) { params.push(f[k]); where += ` AND a.${k} = $${params.length}`; }
    if (f.is_completed !== undefined && f.is_completed !== '') { params.push(String(f.is_completed) === 'true'); where += ` AND a.is_completed = $${params.length}`; }
    if (f.overdue === 'true') where += ' AND a.is_completed = FALSE AND a.due_date < NOW()';
    if (f.due_from) { params.push(f.due_from); where += ` AND a.due_date >= $${params.length}`; }
    if (f.due_to) { params.push(f.due_to); where += ` AND a.due_date <= $${params.length}`; }
    const total = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_activities a WHERE ${where}`, params)).rows[0].n);
    params.push(page.limit, page.offset);
    const rows = (await pool.query(
      `SELECT a.*, e.display_name AS assigned_employee_name, l.display_name AS lead_name, ac.name AS account_name
         FROM crm_activities a LEFT JOIN employees e ON e.id = a.assigned_employee_id LEFT JOIN crm_leads l ON l.id = a.lead_id LEFT JOIN crm_accounts ac ON ac.id = a.account_id
        WHERE ${where} ORDER BY a.is_completed ASC, a.due_date ASC NULLS LAST, a.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
    return { rows, total };
  }

  static async get(orgId: string, id: string) {
    const r = (await pool.query(`SELECT * FROM crm_activities WHERE organization_id = $1 AND id = $2`, [orgId, id])).rows[0];
    if (!r) throw new CrmError('Activity not found.', 404, 'NOT_FOUND');
    return r;
  }

  static async create(orgId: string, body: Record<string, any>, actor: Actor) {
    const d = pickFields(body, COLS);
    validate(d, true);
    return tx(async (c) => {
      await checkRefs(c, orgId, d);
      const type = d.activity_type ?? 'task';
      const completed = Boolean(body.is_completed);
      const r = (await c.query(
        `INSERT INTO crm_activities (id, organization_id, activity_type, subject, description, due_date, completed_at, is_completed, priority, lead_id, account_id, contact_id, deal_id, ticket_id,
                                     assigned_employee_id, logged_by_user_id, direction, duration_minutes, location, reminder_at, outcome, outcome_notes)
         VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $7 THEN NOW() END, $7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
        [newId('act'), orgId, type, d.subject, d.description ?? null, d.due_date ?? null, completed, d.priority ?? 'normal', d.lead_id ?? null, d.account_id ?? null, d.contact_id ?? null,
          d.deal_id ?? null, d.ticket_id ?? null, d.assigned_employee_id ?? null, actor.id, d.direction ?? null, d.duration_minutes ?? null, d.location ?? null, d.reminder_at ?? null,
          d.outcome ?? null, d.outcome_notes ?? null])).rows[0];
      if (d.lead_id) {
        await c.query(`UPDATE crm_leads SET last_activity_date = NOW(), updated_at = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, d.lead_id]);
        if (TOUCH_TYPES.has(type) && (completed || d.direction === 'outbound')) await markFirstResponse(c, orgId, d.lead_id);
      }
      if (d.ticket_id && TOUCH_TYPES.has(type) && (completed || d.direction === 'outbound')) {
        await c.query(`UPDATE crm_tickets SET first_response_at = COALESCE(first_response_at, NOW()), updated_at = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, d.ticket_id]);
      }
      return r;
    });
  }

  static async update(orgId: string, id: string, body: Record<string, any>) {
    const d = pickFields(body, COLS);
    validate(d, false);
    for (const k of ['subject', 'activity_type', 'priority']) if (k in d && d[k] === null) delete d[k];
    return tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_activities WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, id])).rows[0];
      if (!cur) throw new CrmError('Activity not found.', 404, 'NOT_FOUND');
      await checkRefs(c, orgId, d);
      if ('reminder_at' in d || 'due_date' in d) (d as any).reminder_sent_at = null;
      if (!Object.keys(d).length) return cur;
      const set = buildSet(d);
      return (await c.query(`UPDATE crm_activities SET ${set.sql}, updated_at = NOW() WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2} RETURNING *`, [...set.values, orgId, id])).rows[0];
    });
  }

  /** Completes an activity; optionally schedules the next follow-up (also moves the lead's next_follow_up_date). */
  static async complete(orgId: string, id: string, body: Record<string, any>, actor: Actor) {
    oneOf(body.outcome, ['positive', 'neutral', 'negative', 'no_answer', 'rescheduled'], 'outcome');
    return tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_activities WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, id])).rows[0];
      if (!cur) throw new CrmError('Activity not found.', 404, 'NOT_FOUND');
      if (cur.is_completed) throw new CrmError('This activity is already completed.', 409, 'ALREADY_COMPLETED');
      const done = (await c.query(
        `UPDATE crm_activities SET is_completed = TRUE, completed_at = NOW(), outcome = COALESCE($3, outcome, 'positive'), outcome_notes = COALESCE($4, outcome_notes), updated_at = NOW()
          WHERE organization_id = $1 AND id = $2 RETURNING *`, [orgId, id, body.outcome ?? null, body.outcome_notes ?? null])).rows[0];
      if (cur.lead_id && TOUCH_TYPES.has(cur.activity_type)) await markFirstResponse(c, orgId, cur.lead_id);
      if (cur.lead_id) await c.query(`UPDATE crm_leads SET last_activity_date = NOW(), updated_at = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, cur.lead_id]);
      let next = null;
      if (body.next_follow_up_at) {
        if (Number.isNaN(Date.parse(body.next_follow_up_at))) throw new CrmError('next_follow_up_at is not a valid date/time.', 400, 'INVALID_DATE');
        next = (await c.query(
          `INSERT INTO crm_activities (id, organization_id, activity_type, subject, description, due_date, priority, lead_id, account_id, contact_id, deal_id, ticket_id, assigned_employee_id, logged_by_user_id)
           VALUES ($1,$2,'follow_up',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
          [newId('act'), orgId, String(body.next_follow_up_subject || `Follow up: ${cur.subject}`).slice(0, 255), `Follow-up after "${cur.subject}"`, body.next_follow_up_at, cur.priority,
            cur.lead_id, cur.account_id, cur.contact_id, cur.deal_id, cur.ticket_id, cur.assigned_employee_id, actor.id])).rows[0];
        if (cur.lead_id) await c.query(`UPDATE crm_leads SET next_follow_up_date = $3 WHERE organization_id = $1 AND id = $2`, [orgId, cur.lead_id, body.next_follow_up_at]);
      }
      return { activity: done, next_follow_up: next };
    });
  }

  static async reopen(orgId: string, id: string) {
    const r = await pool.query(`UPDATE crm_activities SET is_completed = FALSE, completed_at = NULL, updated_at = NOW() WHERE organization_id = $1 AND id = $2 AND is_completed = TRUE RETURNING *`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Completed activity not found.', 404, 'NOT_FOUND');
    return r.rows[0];
  }

  static async remove(orgId: string, id: string) {
    const r = await pool.query(`DELETE FROM crm_activities WHERE organization_id = $1 AND id = $2 RETURNING id`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Activity not found.', 404, 'NOT_FOUND');
    return { id };
  }

  /** Open activities that are overdue or have a reminder due, for the "my day" panel. */
  static async reminders(orgId: string, employeeId?: string) {
    const params: any[] = [orgId];
    let own = '';
    if (employeeId) { params.push(employeeId); own = ' AND a.assigned_employee_id = $2'; }
    const rows = (await pool.query(
      `SELECT a.*, l.display_name AS lead_name, ac.name AS account_name,
              (a.due_date < NOW()) AS overdue
         FROM crm_activities a LEFT JOIN crm_leads l ON l.id = a.lead_id LEFT JOIN crm_accounts ac ON ac.id = a.account_id
        WHERE a.organization_id = $1 AND a.is_completed = FALSE${own}
          AND (a.due_date < NOW() + INTERVAL '24 hours' OR (a.reminder_at IS NOT NULL AND a.reminder_at <= NOW() AND a.reminder_sent_at IS NULL))
        ORDER BY a.due_date ASC NULLS LAST LIMIT 100`, params)).rows;
    return { overdue: rows.filter((r: any) => r.overdue), upcoming: rows.filter((r: any) => !r.overdue), total: rows.length };
  }

  static async ackReminders(orgId: string, ids: string[]) {
    if (!Array.isArray(ids) || !ids.length) throw new CrmError('ids is required.', 400, 'NO_SELECTION');
    const r = await pool.query(`UPDATE crm_activities SET reminder_sent_at = NOW() WHERE organization_id = $1 AND id = ANY($2::text[]) RETURNING id`, [orgId, ids]);
    return { acknowledged: r.rows.length };
  }

  /** RFC 5545 calendar of open, dated activities. Importable into Google Calendar / Outlook (subscription OAuth is a later step). */
  static async icsFeed(orgId: string, employeeId?: string): Promise<string> {
    const params: any[] = [orgId];
    let own = '';
    if (employeeId) { params.push(employeeId); own = ' AND assigned_employee_id = $2'; }
    const rows = (await pool.query(`SELECT * FROM crm_activities WHERE organization_id = $1 AND is_completed = FALSE AND due_date IS NOT NULL${own} ORDER BY due_date LIMIT 1000`, params)).rows;
    const esc = (s: string) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jyotsvan//CRM//EN', 'CALSCALE:GREGORIAN'];
    for (const a of rows) {
      const start = new Date(a.due_date);
      const end = new Date(start.getTime() + (Number(a.duration_minutes) || 30) * 60_000);
      lines.push('BEGIN:VEVENT', `UID:${a.id}@jyotsvan`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
        `SUMMARY:${esc(`[${a.activity_type}] ${a.subject}`)}`, `DESCRIPTION:${esc(a.description || '')}`, ...(a.location ? [`LOCATION:${esc(a.location)}`] : []), 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  // ---- notes ---------------------------------------------------------------------------------------------------------
  static async listNotes(orgId: string, f: Record<string, any>) {
    const params: any[] = [orgId];
    let where = 'organization_id = $1';
    let any = false;
    for (const k of ['lead_id', 'account_id', 'deal_id', 'contact_id', 'ticket_id']) if (f[k]) { params.push(f[k]); where += ` AND ${k} = $${params.length}`; any = true; }
    if (!any) throw new CrmError('Filter notes by lead_id, account_id, deal_id, contact_id or ticket_id.', 400, 'FILTER_REQUIRED');
    return (await pool.query(`SELECT * FROM crm_notes WHERE ${where} ORDER BY is_pinned DESC, created_at DESC LIMIT 200`, params)).rows;
  }

  static async createNote(orgId: string, body: Record<string, any>, actor: Actor) {
    const d = pickFields(body, ['title', 'content', 'lead_id', 'account_id', 'deal_id', 'contact_id', 'ticket_id']);
    if (!d.content) throw new CrmError('Note content is required.', 400, 'CONTENT_REQUIRED');
    if (!d.lead_id && !d.account_id && !d.deal_id && !d.contact_id && !d.ticket_id) throw new CrmError('A note must be attached to a lead, account, deal, contact or ticket.', 400, 'TARGET_REQUIRED');
    await checkRefs(pool, orgId, d);
    const r = await pool.query(
      `INSERT INTO crm_notes (id, organization_id, lead_id, account_id, deal_id, contact_id, ticket_id, title, content, created_by_user_id, created_by_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [newId('note'), orgId, d.lead_id ?? null, d.account_id ?? null, d.deal_id ?? null, d.contact_id ?? null, d.ticket_id ?? null, d.title ?? null, d.content, actor.id, actor.name || actor.email]);
    return r.rows[0];
  }

  static async updateNote(orgId: string, id: string, body: Record<string, any>) {
    const d = pickFields(body, ['title', 'content']);
    if ('content' in d && !d.content) throw new CrmError('Note content is required.', 400, 'CONTENT_REQUIRED');
    const cols: Record<string, any> = { ...d };
    if (body.is_pinned !== undefined) cols.is_pinned = Boolean(body.is_pinned);
    if (!Object.keys(cols).length) throw new CrmError('Nothing to update.', 400, 'EMPTY');
    const set = buildSet(cols);
    const r = await pool.query(`UPDATE crm_notes SET ${set.sql}, updated_at = NOW() WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2} RETURNING *`, [...set.values, orgId, id]);
    if (!r.rows.length) throw new CrmError('Note not found.', 404, 'NOT_FOUND');
    return r.rows[0];
  }

  static async deleteNote(orgId: string, id: string) {
    const r = await pool.query(`DELETE FROM crm_notes WHERE organization_id = $1 AND id = $2 RETURNING id`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Note not found.', 404, 'NOT_FOUND');
    return { id };
  }

  /** Unified timeline for a lead/account/deal: activities + notes + status/stage history, newest first. */
  static async timeline(orgId: string, kind: 'lead' | 'account' | 'deal', id: string) {
    const col = `${kind}_id`;
    const [acts, notes] = await Promise.all([
      pool.query(`SELECT 'activity' AS kind, id, activity_type AS sub_type, subject AS title, description AS body, COALESCE(completed_at, due_date, created_at) AS at, is_completed, outcome FROM crm_activities WHERE organization_id = $1 AND ${col} = $2`, [orgId, id]),
      pool.query(`SELECT 'note' AS kind, id, NULL AS sub_type, COALESCE(title, 'Note') AS title, content AS body, created_at AS at, NULL::boolean AS is_completed, NULL AS outcome FROM crm_notes WHERE organization_id = $1 AND ${col} = $2`, [orgId, id]),
    ]);
    let hist: any[] = [];
    if (kind === 'lead') hist = (await pool.query(`SELECT 'status' AS kind, id, NULL AS sub_type, ('Status: ' || COALESCE(previous_status,'—') || ' → ' || new_status) AS title, reason AS body, created_at AS at, NULL::boolean AS is_completed, NULL AS outcome FROM crm_lead_status_history WHERE lead_id = $1`, [id])).rows;
    if (kind === 'deal') hist = (await pool.query(`SELECT 'stage' AS kind, h.id, NULL AS sub_type, ('Stage: ' || COALESCE(ps.name,'—') || ' → ' || ns.name) AS title, h.notes AS body, h.created_at AS at, NULL::boolean AS is_completed, NULL AS outcome FROM crm_deal_stage_history h LEFT JOIN crm_pipeline_stages ps ON ps.id = h.previous_stage_id JOIN crm_pipeline_stages ns ON ns.id = h.new_stage_id WHERE h.deal_id = $1`, [id])).rows;
    return [...acts.rows, ...notes.rows, ...hist].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 300);
  }
}
