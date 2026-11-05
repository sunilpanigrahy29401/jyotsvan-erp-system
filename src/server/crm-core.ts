// CRM core helpers shared by the lead/contact/account/deal services: numbering, normalisation, duplicate detection,
// rules-based scoring, auto-assignment and SLA. Every function takes the transaction client so callers stay atomic.
import type { PoolClient } from 'pg';
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';

type Q = Pick<PoolClient, 'query'>;
export type Actor = { id: string; email: string; name?: string };

export class CrmError extends Error {
  constructor(message: string, public status = 400, public code = 'BAD_REQUEST', public extra?: Record<string, unknown>) {
    super(message);
  }
}

/** Runs fn inside one transaction on a dedicated connection (tenant context is preserved by the pool). */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
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

/** Activities require a real user as author. For system-created work, attribute it to the tenant's oldest user (the account owner). */
export async function systemUserId(db: Pick<PoolClient, 'query'>, orgId: string): Promise<string | null> {
  const r = await db.query(`SELECT id FROM users WHERE organization_id = $1 ORDER BY is_super_admin DESC, created_at ASC LIMIT 1`, [orgId]);
  return r.rows[0]?.id ?? null;
}

/** Trims strings; blank becomes null; undefined stays undefined (= "not provided"). */
export function clean(v: unknown): any {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return v;
}

/** Copies only whitelisted keys that are present in the body, cleaned. */
export function pickFields(body: Record<string, any>, keys: readonly string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(body || {}, k)) out[k] = clean(body[k]);
  return out;
}

export function oneOf(value: any, allowed: readonly string[], field: string) {
  if (value !== undefined && value !== null && !allowed.includes(value)) {
    throw new CrmError(`${field} must be one of: ${allowed.join(', ')}.`, 400, 'INVALID_' + field.toUpperCase());
  }
}

export function nonNegative(value: any, field: string) {
  if (value !== undefined && value !== null && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
    throw new CrmError(`${field} must be a non-negative number.`, 400, 'INVALID_NUMBER');
  }
}

export function pageOf(q: Record<string, any>, max = 200) {
  const page = Math.max(1, parseInt(String(q.page ?? '1'), 10) || 1);
  const limit = Math.min(max, Math.max(1, parseInt(String(q.limit ?? '50'), 10) || 50));
  return { page, limit, offset: (page - 1) * limit };
}

/** Builds "col = $n" SET fragments from an object (column names come from code, never from the request). */
export function buildSet(cols: Record<string, any>, startAt = 1): { sql: string; values: any[] } {
  const keys = Object.keys(cols);
  return { sql: keys.map((k, i) => `${k} = $${startAt + i}`).join(', '), values: keys.map((k) => cols[k]) };
}

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
type Counter = 'lead' | 'account' | 'deal' | 'quote' | 'ticket' | 'handoff';
/** Table/column holding each kind of number, so the counter can be caught up with records created before it existed. */
const NUMBER_SOURCE: Record<Counter, [string, string]> = {
  lead: ['crm_leads', 'lead_number'], account: ['crm_accounts', 'account_number'], deal: ['crm_deals', 'deal_number'],
  quote: ['crm_quotes', 'quote_number'], ticket: ['crm_tickets', 'ticket_number'], handoff: ['crm_deal_handoffs', 'handoff_number'],
};
const caughtUp = new Set<string>();

export async function nextNumber(db: Q, orgId: string, name: Counter, prefix: string): Promise<string> {
  // The first time a tenant/kind is used in this process, lift the counter to the highest number already stored, so numbers
  // issued by older code (or imported data) are never handed out again. After that a plain atomic increment is enough.
  const key = `${orgId}:${name}`;
  if (!caughtUp.has(key)) {
    const [table, col] = NUMBER_SOURCE[name];
    const max = await db.query(
      `SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(${col}, '^.*-', ''), '')::BIGINT), 0)::text AS m FROM ${table} WHERE organization_id = $1 AND ${col} ~ '-[0-9]+$'`,
      [orgId]
    );
    await db.query(
      `INSERT INTO crm_counters (organization_id, name, value) VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, name) DO UPDATE SET value = GREATEST(crm_counters.value, EXCLUDED.value)`,
      [orgId, name, max.rows[0].m]
    );
    caughtUp.add(key);
  }
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

// ---------------------------------------------------------------------------------------------------------------------
// CSV import helpers
// ---------------------------------------------------------------------------------------------------------------------
/** RFC 4180 parser (quotes, escaped quotes, CRLF, embedded newlines). Returns rows of cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const LEAD_HEADER_ALIASES: Record<string, string> = {
  name: 'display_name', full_name: 'display_name', contact_name: 'display_name', first_name: 'first_name', firstname: 'first_name', last_name: 'last_name', lastname: 'last_name',
  mobile: 'phone', phone: 'phone', phone_number: 'phone', contact_number: 'phone', whatsapp: 'phone', email: 'email', email_id: 'email', company: 'company_name', company_name: 'company_name',
  organisation: 'company_name', organization: 'company_name', designation: 'designation', city: 'city', state: 'state', pincode: 'pincode', pin: 'pincode', address: 'address',
  requirement: 'expected_requirement', message: 'expected_requirement', enquiry: 'expected_requirement', value: 'estimated_deal_value', deal_value: 'estimated_deal_value',
  estimated_value: 'estimated_deal_value', quantity: 'estimated_quantity', source: 'source_name', priority: 'priority', territory: 'territory', website: 'website', gstin: 'gstin',
};

/** Turns CSV text into lead-shaped rows using forgiving header names. Unknown columns are reported, not silently dropped. */
export function csvToLeadRows(text: string): { rows: Record<string, any>[]; unknown_columns: string[] } {
  const grid = parseCsv(text);
  if (grid.length < 2) throw new CrmError('The CSV needs a header row and at least one data row.', 400, 'EMPTY');
  const headers = grid[0].map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  const map = headers.map((h) => LEAD_HEADER_ALIASES[h]);
  const unknown = grid[0].filter((_h, i) => !map[i]).map((h) => h.trim()).filter(Boolean);
  const rows = grid.slice(1).map((cells) => {
    const o: Record<string, any> = {};
    cells.forEach((v, i) => { if (map[i] && v.trim() !== '') o[map[i]] = v.trim(); });
    return o;
  });
  return { rows, unknown_columns: unknown };
}
