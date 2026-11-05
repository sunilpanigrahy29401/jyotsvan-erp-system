// CRM core helpers shared by the lead/contact/account/deal services: numbering, normalisation, duplicate detection,
// rules-based scoring, auto-assignment and SLA. Every function takes the transaction client so callers stay atomic.
import type { PoolClient } from 'pg';
import { newId } from './core/tokens.ts';

type Q = Pick<PoolClient, 'query'>;

// ---------------------------------------------------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------------------------------------------------
/** Indian-aware: keeps the last 10 digits so "+91 98765-43210", "098765 43210" and "9876543210" compare equal. */
export function normPhone(p?: string | null): string | null {
  if (!p) return null;
  const digits = String(p).replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

export function normEmail(e?: string | null): string | null {
  if (!e) return null;
  const v = String(e).trim().toLowerCase();
  return v || null;
}

export function validEmail(e?: string | null): boolean {
  return !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
}

// ---------------------------------------------------------------------------------------------------------------------
// Numbering (atomic; never reuses a number even after deletes)
// ---------------------------------------------------------------------------------------------------------------------
export async function nextNumber(db: Q, orgId: string, name: 'lead' | 'account' | 'deal', prefix: string): Promise<string> {
  const r = await db.query(
    `INSERT INTO crm_counters (organization_id, name, value) VALUES ($1, $2, 1)
     ON CONFLICT (organization_id, name) DO UPDATE SET value = crm_counters.value + 1
     RETURNING value`,
    [orgId, name]
  );
  return `${prefix}-${new Date().getFullYear()}-${String(r.rows[0].value).padStart(4, '0')}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Duplicate detection (leads, contacts, accounts)
// ---------------------------------------------------------------------------------------------------------------------
export interface DuplicateMatch {
  entity: 'lead' | 'contact' | 'account';
  id: string;
  label: string;
  number?: string | null;
  matched_on: Array<'phone' | 'email' | 'gstin'>;
}

export async function findDuplicates(
  db: Q,
  orgId: string,
  probe: { phone?: string | null; email?: string | null; gstin?: string | null; excludeLeadId?: string }
): Promise<DuplicateMatch[]> {
  const phone = normPhone(probe.phone);
  const email = normEmail(probe.email);
  const gstin = probe.gstin ? String(probe.gstin).trim().toUpperCase() : null;
  const found = new Map<string, DuplicateMatch>();
  const add = (entity: DuplicateMatch['entity'], row: any, on: 'phone' | 'email' | 'gstin') => {
    const key = `${entity}:${row.id}`;
    const m = found.get(key) || { entity, id: row.id, label: row.label, number: row.number, matched_on: [] };
    if (!m.matched_on.includes(on)) m.matched_on.push(on);
    found.set(key, m);
  };

  if (phone || email) {
    const leads = await db.query(
      `SELECT id, display_name AS label, lead_number AS number, phone_norm = $2 AS by_phone, email_norm = $3 AS by_email
         FROM crm_leads
        WHERE organization_id = $1 AND archived_at IS NULL AND merged_into_id IS NULL AND is_converted = FALSE
          AND ($4::text IS NULL OR id <> $4) AND (phone_norm = $2 OR email_norm = $3)
        LIMIT 20`,
      [orgId, phone, email, probe.excludeLeadId || null]
    );
    for (const r of leads.rows) {
      if (r.by_phone) add('lead', r, 'phone');
      if (r.by_email) add('lead', r, 'email');
    }
    const contacts = await db.query(
      `SELECT id, display_name AS label, NULL AS number, phone_norm = $2 AS by_phone, email_norm = $3 AS by_email
         FROM crm_contacts WHERE organization_id = $1 AND archived_at IS NULL AND (phone_norm = $2 OR email_norm = $3) LIMIT 20`,
      [orgId, phone, email]
    );
    for (const r of contacts.rows) {
      if (r.by_phone) add('contact', r, 'phone');
      if (r.by_email) add('contact', r, 'email');
    }
  }
  if (gstin || phone || email) {
    const accounts = await db.query(
      `SELECT id, name AS label, account_number AS number,
              UPPER(gstin) = $2 AS by_gstin,
              RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g'), 10) = $3 AS by_phone,
              LOWER(TRIM(COALESCE(email, ''))) = $4 AS by_email
         FROM crm_accounts
        WHERE organization_id = $1 AND archived_at IS NULL
          AND (($2::text IS NOT NULL AND UPPER(gstin) = $2)
            OR ($3::text IS NOT NULL AND RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g'), 10) = $3)
            OR ($4::text IS NOT NULL AND LOWER(TRIM(COALESCE(email, ''))) = $4))
        LIMIT 20`,
      [orgId, gstin, phone, email]
    );
    for (const r of accounts.rows) {
      if (r.by_gstin) add('account', r, 'gstin');
      if (r.by_phone) add('account', r, 'phone');
      if (r.by_email) add('account', r, 'email');
    }
  }
  return [...found.values()];
}

// ---------------------------------------------------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------------------------------------------------
export interface ScoringRule { field: string; operator: string; value: string | null; points: number }
const SCORABLE_FIELDS = new Set([
  'estimated_deal_value', 'estimated_quantity', 'purchase_timeline', 'email', 'phone', 'company_name', 'designation', 'state', 'city',
  'source_id', 'relationship_type', 'business_size', 'industry', 'budget_range', 'priority', 'territory', 'website',
]);
export const SCORING_FIELDS = [...SCORABLE_FIELDS];
export const SCORING_OPERATORS = ['eq', 'ne', 'gte', 'lte', 'contains', 'present', 'absent'];

export function ruleMatches(rule: ScoringRule, lead: Record<string, any>): boolean {
  const raw = lead[rule.field];
  const has = raw !== null && raw !== undefined && String(raw).trim() !== '';
  switch (rule.operator) {
    case 'present': return has;
    case 'absent': return !has;
    case 'eq': return has && String(raw).toLowerCase() === String(rule.value ?? '').toLowerCase();
    case 'ne': return !has || String(raw).toLowerCase() !== String(rule.value ?? '').toLowerCase();
    case 'contains': return has && String(raw).toLowerCase().includes(String(rule.value ?? '').toLowerCase());
    case 'gte': return has && Number(raw) >= Number(rule.value);
    case 'lte': return has && Number(raw) <= Number(rule.value);
    default: return false;
  }
}

/** Built-in formula used when the tenant has not configured any scoring rules (keeps the earlier behaviour). */
export function defaultScore(lead: Record<string, any>): number {
  let s = 40;
  if (lead.estimated_deal_value && Number(lead.estimated_deal_value) >= 1_000_000) s += 25;
  if (lead.purchase_timeline === 'immediate' || lead.purchase_timeline === '30_days') s += 20;
  if (lead.email) s += 10;
  if (lead.company_name) s += 10;
  return Math.max(0, Math.min(100, s));
}

export async function scoreLead(db: Q, orgId: string, lead: Record<string, any>): Promise<number> {
  const rules = await db.query(
    `SELECT field, operator, value, points FROM crm_scoring_rules WHERE organization_id = $1 AND is_active = TRUE ORDER BY sort_order, created_at`,
    [orgId]
  );
  if (rules.rows.length === 0) return defaultScore(lead);
  let s = 30;
  for (const r of rules.rows as ScoringRule[]) if (ruleMatches(r, lead)) s += Number(r.points);
  return Math.max(0, Math.min(100, s));
}

// ---------------------------------------------------------------------------------------------------------------------
// Auto-assignment
// ---------------------------------------------------------------------------------------------------------------------
const OPEN_LEAD = `status NOT IN ('converted','lost','disqualified','archived','merged') AND archived_at IS NULL AND is_converted = FALSE`;

export async function pickOwner(db: Q, orgId: string, lead: Record<string, any>): Promise<{ employeeId: string; ruleId: string } | null> {
  const rules = await db.query(
    `SELECT * FROM crm_assignment_rules WHERE organization_id = $1 AND is_active = TRUE ORDER BY priority ASC, created_at ASC FOR UPDATE`,
    [orgId]
  );
  for (const rule of rules.rows) {
    const cond: Record<string, string> = rule.conditions || {};
    const ok = Object.entries(cond).every(([k, v]) => !v || String(lead[k] ?? '').toLowerCase() === String(v).toLowerCase());
    if (!ok) continue;
    const ids: string[] = Array.isArray(rule.employee_ids) ? rule.employee_ids : [];
    if (ids.length === 0) continue;
    const active = await db.query(
      `SELECT id FROM employees WHERE organization_id = $1 AND id = ANY($2::text[]) AND status = 'active'`,
      [orgId, ids]
    );
    const pool = ids.filter((id) => active.rows.some((r: any) => r.id === id)); // keeps the configured order
    if (pool.length === 0) continue;

    if (rule.strategy === 'fixed') return { employeeId: pool[0], ruleId: rule.id };
    if (rule.strategy === 'load_based') {
      const load = await db.query(
        `SELECT assigned_employee_id AS id, COUNT(*)::int AS n FROM crm_leads
          WHERE organization_id = $1 AND assigned_employee_id = ANY($2::text[]) AND ${OPEN_LEAD} GROUP BY assigned_employee_id`,
        [orgId, pool]
      );
      const counts = new Map<string, number>(load.rows.map((r: any) => [r.id, r.n]));
      const best = [...pool].sort((a, b) => (counts.get(a) || 0) - (counts.get(b) || 0))[0];
      return { employeeId: best, ruleId: rule.id };
    }
    // round_robin
    const idx = Number(rule.rr_cursor) % pool.length;
    await db.query(`UPDATE crm_assignment_rules SET rr_cursor = $1, updated_at = NOW() WHERE id = $2`, [(idx + 1) % 1_000_000, rule.id]);
    return { employeeId: pool[idx], ruleId: rule.id };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// SLA
// ---------------------------------------------------------------------------------------------------------------------
export async function slaDueAt(db: Q, orgId: string, priority: string, from = new Date()): Promise<Date | null> {
  const r = await db.query(
    `SELECT first_response_minutes FROM crm_sla_policies WHERE organization_id = $1 AND priority = $2 AND is_active = TRUE`,
    [orgId, priority]
  );
  if (r.rows.length === 0) return null;
  return new Date(from.getTime() + Number(r.rows[0].first_response_minutes) * 60_000);
}

/** Stamps first_response_at on the first outbound touch (activity logged, status moved past 'new'). */
export async function markFirstResponse(db: Q, orgId: string, leadId: string): Promise<void> {
  await db.query(
    `UPDATE crm_leads SET first_response_at = NOW(),
            sla_breached_at = CASE WHEN sla_due_at IS NOT NULL AND NOW() > sla_due_at THEN COALESCE(sla_breached_at, NOW()) ELSE sla_breached_at END
      WHERE organization_id = $1 AND id = $2 AND first_response_at IS NULL`,
    [orgId, leadId]
  );
}

export const idFor = (prefix: string) => newId(prefix);
