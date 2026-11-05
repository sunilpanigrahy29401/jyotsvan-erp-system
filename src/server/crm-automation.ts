// Workflow automation ("if X then Y"). Events are fired by the CRM services after their transaction commits; a failing
// rule is logged and never breaks the business operation. Actions are a closed set (no arbitrary code or URLs).
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';
import { CrmError, systemUserId } from './crm-core.ts';

export const AUTOMATION_EVENTS = ['lead.created', 'lead.status_changed', 'deal.created', 'deal.stage_changed', 'deal.won', 'deal.lost', 'ticket.created', 'ticket.escalated'] as const;
export const AUTOMATION_ACTIONS = ['create_task', 'set_priority', 'add_tag', 'assign_owner', 'enroll_sequence'] as const;

const ENTITY_OF_EVENT: Record<string, 'lead' | 'deal' | 'ticket'> = {
  'lead.created': 'lead', 'lead.status_changed': 'lead', 'deal.created': 'deal', 'deal.stage_changed': 'deal', 'deal.won': 'deal',
  'deal.lost': 'deal', 'ticket.created': 'ticket', 'ticket.escalated': 'ticket',
};

export function validateRule(r: { trigger_event?: string; action_type?: string; action_params?: any; conditions?: any }) {
  if (!r.trigger_event || !(AUTOMATION_EVENTS as readonly string[]).includes(r.trigger_event)) {
    throw new CrmError(`trigger_event must be one of: ${AUTOMATION_EVENTS.join(', ')}.`, 400, 'INVALID_EVENT');
  }
  if (!r.action_type || !(AUTOMATION_ACTIONS as readonly string[]).includes(r.action_type)) {
    throw new CrmError(`action_type must be one of: ${AUTOMATION_ACTIONS.join(', ')}.`, 400, 'INVALID_ACTION');
  }
  const p = r.action_params || {};
  const entity = ENTITY_OF_EVENT[r.trigger_event];
  if (r.action_type === 'create_task' && !String(p.subject || '').trim()) throw new CrmError('create_task needs action_params.subject.', 400, 'INVALID_PARAMS');
  if (r.action_type === 'set_priority' && !['low', 'medium', 'high', 'urgent'].includes(p.priority)) throw new CrmError('set_priority needs action_params.priority (low|medium|high|urgent).', 400, 'INVALID_PARAMS');
  if (r.action_type === 'add_tag' && (!String(p.tag || '').trim() || entity !== 'lead')) throw new CrmError('add_tag needs action_params.tag and a lead event.', 400, 'INVALID_PARAMS');
  if (r.action_type === 'assign_owner' && !p.employee_id) throw new CrmError('assign_owner needs action_params.employee_id.', 400, 'INVALID_PARAMS');
  if (r.action_type === 'enroll_sequence' && (!p.sequence_id || entity === 'deal')) throw new CrmError('enroll_sequence needs action_params.sequence_id and a lead or ticket event.', 400, 'INVALID_PARAMS');
  if (r.conditions && (typeof r.conditions !== 'object' || Array.isArray(r.conditions))) throw new CrmError('conditions must be an object of field: value.', 400, 'INVALID_CONDITIONS');
}

function matches(conditions: Record<string, any> | null, entity: Record<string, any>): boolean {
  return Object.entries(conditions || {}).every(([k, v]) => {
    if (v === '' || v === null || v === undefined) return true;
    const actual = String(entity[k] ?? '').toLowerCase();
    return Array.isArray(v) ? v.map((x) => String(x).toLowerCase()).includes(actual) : actual === String(v).toLowerCase();
  });
}

async function run(orgId: string, action: string, p: Record<string, any>, kind: 'lead' | 'deal' | 'ticket', entity: Record<string, any>, actorId: string) {
  switch (action) {
    case 'create_task': {
      const owner = p.assign_to === 'owner' || !p.assign_to
        ? entity.assigned_employee_id || entity.owner_employee_id || null
        : p.assign_to;
      const hours = Number.isFinite(Number(p.due_in_hours)) ? Number(p.due_in_hours) : 24;
      const author = actorId === 'system' ? await systemUserId(pool, orgId) : actorId;
      if (!author) throw new Error('No user available to attribute the task to.');
      await pool.query(
        `INSERT INTO crm_activities (id, organization_id, activity_type, subject, description, due_date, priority, lead_id, deal_id, ticket_id, account_id, assigned_employee_id, logged_by_user_id)
         VALUES ($1,$2,$3,$4,$5, NOW() + ($6 || ' hours')::interval, $7,$8,$9,$10,$11,$12,$13)`,
        [newId('act'), orgId, p.activity_type || 'task', String(p.subject).slice(0, 255), p.description || 'Created by an automation rule.', String(hours),
          p.priority || 'normal', kind === 'lead' ? entity.id : null, kind === 'deal' ? entity.id : null, kind === 'ticket' ? entity.id : null,
          entity.account_id || null, owner, author]
      );
      return `Task created: ${p.subject}`;
    }
    case 'set_priority': {
      if (kind === 'deal') throw new Error('Deals have no priority.');
      await pool.query(`UPDATE ${kind === 'lead' ? 'crm_leads' : 'crm_tickets'} SET priority = $3, updated_at = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, entity.id, p.priority]);
      return `Priority set to ${p.priority}`;
    }
    case 'add_tag': {
      await pool.query(
        `UPDATE crm_leads SET tags = CASE WHEN tags @> to_jsonb($3::text) THEN tags ELSE tags || to_jsonb($3::text) END, updated_at = NOW() WHERE organization_id = $1 AND id = $2`,
        [orgId, entity.id, String(p.tag).trim()]
      );
      return `Tag added: ${p.tag}`;
    }
    case 'assign_owner': {
      const emp = await pool.query(`SELECT 1 FROM employees WHERE id = $1 AND organization_id = $2`, [p.employee_id, orgId]);
      if (!emp.rows.length) throw new Error('Employee not found.');
      const table = kind === 'lead' ? 'crm_leads' : kind === 'deal' ? 'crm_deals' : 'crm_tickets';
      const col = kind === 'lead' ? 'assigned_employee_id' : kind === 'deal' ? 'owner_employee_id' : 'assigned_employee_id';
      await pool.query(`UPDATE ${table} SET ${col} = $3, updated_at = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, entity.id, p.employee_id]);
      return 'Owner assigned';
    }
    case 'enroll_sequence': {
      const seq = await pool.query(`SELECT steps FROM crm_sequences WHERE organization_id = $1 AND id = $2 AND is_active = TRUE`, [orgId, p.sequence_id]);
      if (!seq.rows.length) throw new Error('Sequence not found or inactive.');
      const first = Number(seq.rows[0].steps?.[0]?.delay_hours ?? 0);
      await pool.query(
        `INSERT INTO crm_sequence_enrollments (id, organization_id, sequence_id, entity_type, entity_id, next_run_at)
         VALUES ($1,$2,$3,$4,$5, NOW() + ($6 || ' hours')::interval) ON CONFLICT (sequence_id, entity_type, entity_id) DO NOTHING`,
        [newId('enr'), orgId, p.sequence_id, kind === 'ticket' ? 'contact' : kind, kind === 'ticket' ? entity.contact_id : entity.id, String(first)]
      );
      return 'Enrolled in sequence';
    }
  }
  throw new Error(`Unknown action ${action}`);
}

/** Fire-and-forget safe: resolves after rules ran, never rejects. */
export async function fireEvent(orgId: string, event: string, entity: Record<string, any>, actorId = 'system'): Promise<void> {
  try {
    const kind = ENTITY_OF_EVENT[event];
    if (!kind || !entity?.id) return;
    const rules = await pool.query(`SELECT * FROM crm_automation_rules WHERE organization_id = $1 AND trigger_event = $2 AND is_active = TRUE ORDER BY created_at`, [orgId, event]);
    for (const rule of rules.rows) {
      if (!matches(rule.conditions, entity)) continue;
      let status = 'success';
      let detail = '';
      let error: string | null = null;
      try {
        detail = await run(orgId, rule.action_type, rule.action_params || {}, kind, entity, actorId);
      } catch (e: any) {
        status = 'failed';
        error = e?.message || String(e);
      }
      await pool.query(
        `INSERT INTO crm_automation_logs (id, rule_id, organization_id, trigger_event, target_entity_type, target_entity_id, status, execution_details, error_message)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [newId('alog'), rule.id, orgId, event, kind, entity.id, status, JSON.stringify({ result: detail }), error]
      );
      await pool.query(`UPDATE crm_automation_rules SET execution_count = execution_count + 1, last_executed_at = NOW() WHERE id = $1`, [rule.id]);
    }
  } catch (e: any) {
    console.error('[CRM automation] failed for', event, e?.message || e);
  }
}
