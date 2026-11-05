// Accounts, contacts, partner onboarding (KYC documents), visit logs and the Customer 360 view.
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';
import {
  CrmError, buildSet, nonNegative, oneOf, pickFields, tx, findDuplicates, nextNumber, normEmail, normPhone, validEmail, type Actor,
} from './crm-core.ts';

const RELATIONSHIPS = ['b2b_client', 'distributor', 'dealer', 'retailer', 'franchise', 'cf_partner', 'institutional', 'd2c', 'supplier', 'strategic_partner'];
const TIERS = ['tier_1', 'tier_2', 'tier_3'];
const ACCOUNT_STATUS = ['active', 'inactive', 'prospect', 'on_hold', 'blacklisted'];
const ACCOUNT_COLS = ['name', 'legal_name', 'relationship_type', 'industry', 'tier', 'website', 'email', 'phone', 'address', 'city', 'state', 'pincode', 'gstin', 'pan',
  'credit_limit', 'annual_revenue', 'assigned_employee_id', 'territory', 'status'] as const;
const CONTACT_COLS = ['account_id', 'first_name', 'last_name', 'designation', 'department', 'role', 'email', 'phone', 'alternate_phone', 'is_primary', 'notes', 'status'] as const;
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const DOC_TYPES = ['gst', 'pan', 'drug_licence', 'fssai', 'shop_act', 'cheque', 'agreement', 'photo', 'other'];

function validateAccount(d: Record<string, any>, creating: boolean) {
  if (creating && !d.name) throw new CrmError('Account name is required.', 400, 'NAME_REQUIRED');
  oneOf(d.relationship_type, RELATIONSHIPS, 'relationship_type');
  oneOf(d.tier, TIERS, 'tier');
  oneOf(d.status, ACCOUNT_STATUS, 'status');
  nonNegative(d.credit_limit, 'credit_limit');
  nonNegative(d.annual_revenue, 'annual_revenue');
  if (d.email && !validEmail(d.email)) throw new CrmError('Email address is not valid.', 400, 'INVALID_EMAIL');
  if (d.gstin) {
    d.gstin = String(d.gstin).toUpperCase();
    if (!GSTIN.test(d.gstin)) throw new CrmError('GSTIN is not in a valid format (15 characters).', 400, 'INVALID_GSTIN');
  }
  if (d.pan) {
    d.pan = String(d.pan).toUpperCase();
    if (!PAN.test(d.pan)) throw new CrmError('PAN is not in a valid format (e.g. ABCDE1234F).', 400, 'INVALID_PAN');
  }
}

async function employeeExists(c: Pick<import('pg').PoolClient, 'query'>, orgId: string, id?: string | null) {
  if (!id) return;
  const r = await c.query(`SELECT 1 FROM employees WHERE id = $1 AND organization_id = $2`, [id, orgId]);
  if (!r.rows.length) throw new CrmError('Assigned employee does not exist in this organization.', 400, 'INVALID_EMPLOYEE');
}

export class CrmAccounts {
  // ---- accounts ------------------------------------------------------------------------------------------------
  static async list(orgId: string, f: Record<string, any>, page: { limit: number; offset: number }) {
    const params: any[] = [orgId];
    let where = 'a.organization_id = $1';
    if (f.archived === 'only') where += ' AND a.archived_at IS NOT NULL'; else if (f.archived !== 'include') where += ' AND a.archived_at IS NULL';
    for (const k of ['relationship_type', 'tier', 'status', 'kyc_status', 'onboarding_status', 'assigned_employee_id', 'state']) {
      if (f[k]) { params.push(f[k]); where += ` AND a.${k} = $${params.length}`; }
    }
    if (f.search) {
      params.push(`%${String(f.search).toLowerCase()}%`);
      where += ` AND (LOWER(a.name) LIKE $${params.length} OR LOWER(a.account_number) LIKE $${params.length} OR LOWER(COALESCE(a.email,'')) LIKE $${params.length}
                  OR LOWER(COALESCE(a.gstin,'')) LIKE $${params.length} OR COALESCE(a.phone,'') LIKE $${params.length})`;
    }
    const total = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_accounts a WHERE ${where}`, params)).rows[0].n);
    params.push(page.limit, page.offset);
    const rows = (await pool.query(
      `SELECT a.*, e.display_name AS assigned_employee_name,
              (SELECT COUNT(*)::int FROM crm_contacts c WHERE c.account_id = a.id AND c.archived_at IS NULL) AS contact_count,
              (SELECT COUNT(*)::int FROM crm_deals d WHERE d.account_id = a.id AND d.status = 'open' AND d.archived_at IS NULL) AS open_deals
         FROM crm_accounts a LEFT JOIN employees e ON e.id = a.assigned_employee_id
        WHERE ${where} ORDER BY a.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
    return { rows, total };
  }

  static async get(orgId: string, id: string) {
    const a = (await pool.query(
      `SELECT a.*, e.display_name AS assigned_employee_name FROM crm_accounts a LEFT JOIN employees e ON e.id = a.assigned_employee_id WHERE a.organization_id = $1 AND a.id = $2`, [orgId, id])).rows[0];
    if (!a) throw new CrmError('Account not found.', 404, 'NOT_FOUND');
    return a;
  }

  static async create(orgId: string, body: Record<string, any>, actor: Actor) {
    const d = pickFields(body, ACCOUNT_COLS);
    validateAccount(d, true);
    return tx(async (c) => {
      await employeeExists(c, orgId, d.assigned_employee_id);
      if (!body.allow_duplicate) {
        const dup = (await findDuplicates(c, orgId, { phone: d.phone, email: d.email, gstin: d.gstin })).find((m) => m.entity === 'account');
        if (dup) throw new CrmError(`Account "${dup.label}" (${dup.number}) already matches on ${dup.matched_on.join(' and ')}.`, 409, 'DUPLICATE', { matches: [dup] });
      }
      const no = await nextNumber(c, orgId, 'account', 'ACC');
      const r = await c.query(
        `INSERT INTO crm_accounts (id, organization_id, account_number, name, legal_name, relationship_type, industry, tier, website, email, phone, address, city, state, pincode,
                                   gstin, pan, credit_limit, annual_revenue, assigned_employee_id, territory, status, created_by_user_id, custom_fields)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING *`,
        [newId('acc'), orgId, no, d.name, d.legal_name ?? d.name, d.relationship_type ?? 'b2b_client', d.industry ?? null, d.tier ?? 'tier_2', d.website ?? null, d.email ?? null,
          d.phone ?? null, d.address ?? null, d.city ?? null, d.state ?? null, d.pincode ?? null, d.gstin ?? null, d.pan ?? null, d.credit_limit ?? 0, d.annual_revenue ?? null,
          d.assigned_employee_id ?? null, d.territory ?? null, d.status ?? 'active', actor.id, JSON.stringify(body.custom_fields ?? {})]);
      return r.rows[0];
    });
  }

  static async update(orgId: string, id: string, body: Record<string, any>) {
    const d = pickFields(body, ACCOUNT_COLS);
    validateAccount(d, false);
    for (const k of ['name', 'relationship_type', 'tier', 'status']) if (k in d && d[k] === null) delete d[k]; // NOT NULL columns
    if (body.custom_fields !== undefined) d.custom_fields = JSON.stringify(body.custom_fields ?? {});
    if (!Object.keys(d).length) return CrmAccounts.get(orgId, id);
    return tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_accounts WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, id])).rows[0];
      if (!cur) throw new CrmError('Account not found.', 404, 'NOT_FOUND');
      await employeeExists(c, orgId, d.assigned_employee_id);
      if (('gstin' in d || 'phone' in d || 'email' in d) && !body.allow_duplicate) {
        const dup = (await findDuplicates(c, orgId, { phone: 'phone' in d ? d.phone : null, email: 'email' in d ? d.email : null, gstin: 'gstin' in d ? d.gstin : null }))
          .find((m) => m.entity === 'account' && m.id !== id);
        if (dup) throw new CrmError(`Account "${dup.label}" (${dup.number}) already matches on ${dup.matched_on.join(' and ')}.`, 409, 'DUPLICATE', { matches: [dup] });
      }
      const set = buildSet(d);
      const r = await c.query(`UPDATE crm_accounts SET ${set.sql}, updated_at = NOW() WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2} RETURNING *`, [...set.values, orgId, id]);
      return r.rows[0];
    });
  }

  /** Soft delete. Blocked while open deals exist so pipeline value never points at a hidden account. */
  static async archive(orgId: string, id: string) {
    return tx(async (c) => {
      const a = (await c.query(`SELECT 1 FROM crm_accounts WHERE organization_id = $1 AND id = $2 FOR UPDATE`, [orgId, id])).rows[0];
      if (!a) throw new CrmError('Account not found.', 404, 'NOT_FOUND');
      const open = Number((await c.query(`SELECT COUNT(*)::int n FROM crm_deals WHERE organization_id = $1 AND account_id = $2 AND status = 'open' AND archived_at IS NULL`, [orgId, id])).rows[0].n);
      if (open) throw new CrmError(`This account has ${open} open deal(s). Close or archive them first.`, 409, 'HAS_OPEN_DEALS');
      await c.query(`UPDATE crm_contacts SET archived_at = NOW(), updated_at = NOW() WHERE organization_id = $1 AND account_id = $2 AND archived_at IS NULL`, [orgId, id]);
      return (await c.query(`UPDATE crm_accounts SET archived_at = NOW(), status = 'inactive', updated_at = NOW() WHERE organization_id = $1 AND id = $2 RETURNING *`, [orgId, id])).rows[0];
    });
  }

  static async restore(orgId: string, id: string) {
    const r = await pool.query(`UPDATE crm_accounts SET archived_at = NULL, status = 'active', updated_at = NOW() WHERE organization_id = $1 AND id = $2 AND archived_at IS NOT NULL RETURNING *`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Archived account not found.', 404, 'NOT_FOUND');
    return r.rows[0];
  }

  // ---- contacts ------------------------------------------------------------------------------------------------
  static async listContacts(orgId: string, f: Record<string, any>, page: { limit: number; offset: number }) {
    const params: any[] = [orgId];
    let where = 'c.organization_id = $1 AND c.archived_at IS NULL';
    if (f.account_id) { params.push(f.account_id); where += ` AND c.account_id = $${params.length}`; }
    if (f.search) {
      params.push(`%${String(f.search).toLowerCase()}%`);
      where += ` AND (LOWER(c.display_name) LIKE $${params.length} OR LOWER(COALESCE(c.email,'')) LIKE $${params.length} OR c.phone LIKE $${params.length})`;
    }
    const total = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_contacts c WHERE ${where}`, params)).rows[0].n);
    params.push(page.limit, page.offset);
    const rows = (await pool.query(
      `SELECT c.*, a.name AS account_name FROM crm_contacts c LEFT JOIN crm_accounts a ON a.id = c.account_id
        WHERE ${where} ORDER BY c.is_primary DESC, c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
    return { rows, total };
  }

  private static async contactChecks(c: Pick<import('pg').PoolClient, 'query'>, orgId: string, d: Record<string, any>) {
    if (d.email && !validEmail(d.email)) throw new CrmError('Email address is not valid.', 400, 'INVALID_EMAIL');
    if (d.account_id) {
      const r = await c.query(`SELECT 1 FROM crm_accounts WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL`, [d.account_id, orgId]);
      if (!r.rows.length) throw new CrmError('Account does not exist in this organization.', 400, 'INVALID_ACCOUNT');
    }
  }

  static async createContact(orgId: string, body: Record<string, any>) {
    const d = pickFields(body, CONTACT_COLS);
    if (!d.first_name) throw new CrmError('First name is required.', 400, 'NAME_REQUIRED');
    if (!normPhone(d.phone)) throw new CrmError('A valid phone number is required.', 400, 'PHONE_REQUIRED');
    return tx(async (c) => {
      await CrmAccounts.contactChecks(c, orgId, d);
      if (!body.allow_duplicate) {
        const dup = (await findDuplicates(c, orgId, { phone: d.phone, email: d.email })).find((m) => m.entity === 'contact');
        if (dup) throw new CrmError(`Contact "${dup.label}" already exists with the same ${dup.matched_on.join(' / ')}.`, 409, 'DUPLICATE', { matches: [dup] });
      }
      const last = d.last_name ?? '';
      const makePrimary = d.account_id && (d.is_primary || !(await c.query(`SELECT 1 FROM crm_contacts WHERE account_id = $1 AND archived_at IS NULL`, [d.account_id])).rows.length);
      if (makePrimary) await c.query(`UPDATE crm_contacts SET is_primary = FALSE WHERE account_id = $1`, [d.account_id]);
      const r = await c.query(
        `INSERT INTO crm_contacts (id, organization_id, account_id, first_name, last_name, display_name, designation, department, role, email, phone, alternate_phone, is_primary, notes, status, phone_norm, email_norm, custom_fields)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [newId('con'), orgId, d.account_id ?? null, d.first_name, last, `${d.first_name} ${last}`.trim(), d.designation ?? null, d.department ?? null, d.role ?? 'general', d.email ?? null,
          d.phone, d.alternate_phone ?? null, Boolean(makePrimary), d.notes ?? null, d.status ?? 'active', normPhone(d.phone), normEmail(d.email), JSON.stringify(body.custom_fields ?? {})]);
      return r.rows[0];
    });
  }

  static async updateContact(orgId: string, id: string, body: Record<string, any>) {
    const d = pickFields(body, CONTACT_COLS);
    for (const k of ['first_name', 'last_name', 'phone', 'role', 'status']) if (k in d && d[k] === null) delete d[k];
    return tx(async (c) => {
      const cur = (await c.query(`SELECT * FROM crm_contacts WHERE organization_id = $1 AND id = $2 AND archived_at IS NULL FOR UPDATE`, [orgId, id])).rows[0];
      if (!cur) throw new CrmError('Contact not found.', 404, 'NOT_FOUND');
      await CrmAccounts.contactChecks(c, orgId, d);
      const next = { ...cur, ...d };
      if ('phone' in d && !normPhone(d.phone)) throw new CrmError('A valid phone number is required.', 400, 'PHONE_REQUIRED');
      if (('phone' in d || 'email' in d) && !body.allow_duplicate) {
        const dup = (await findDuplicates(c, orgId, { phone: next.phone, email: next.email })).find((m) => m.entity === 'contact' && m.id !== id);
        if (dup) throw new CrmError(`Contact "${dup.label}" already exists with the same ${dup.matched_on.join(' / ')}.`, 409, 'DUPLICATE', { matches: [dup] });
      }
      const cols: Record<string, any> = { ...d };
      if ('first_name' in d || 'last_name' in d) cols.display_name = `${next.first_name} ${next.last_name ?? ''}`.trim();
      if ('phone' in d) cols.phone_norm = normPhone(d.phone);
      if ('email' in d) cols.email_norm = normEmail(d.email);
      if (d.is_primary && next.account_id) await c.query(`UPDATE crm_contacts SET is_primary = FALSE WHERE account_id = $1 AND id <> $2`, [next.account_id, id]);
      if (body.custom_fields !== undefined) cols.custom_fields = JSON.stringify(body.custom_fields ?? {});
      if (!Object.keys(cols).length) return cur;
      const set = buildSet(cols);
      return (await c.query(`UPDATE crm_contacts SET ${set.sql}, updated_at = NOW() WHERE organization_id = $${set.values.length + 1} AND id = $${set.values.length + 2} RETURNING *`, [...set.values, orgId, id])).rows[0];
    });
  }

  static async archiveContact(orgId: string, id: string) {
    const r = await pool.query(`UPDATE crm_contacts SET archived_at = NOW(), is_primary = FALSE, updated_at = NOW() WHERE organization_id = $1 AND id = $2 AND archived_at IS NULL RETURNING *`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Contact not found.', 404, 'NOT_FOUND');
    return r.rows[0];
  }

  // ---- onboarding / KYC ------------------------------------------------------------------------------------------
  static async listDocuments(orgId: string, accountId: string) {
    await CrmAccounts.get(orgId, accountId);
    return (await pool.query(`SELECT * FROM crm_account_documents WHERE organization_id = $1 AND account_id = $2 ORDER BY created_at DESC`, [orgId, accountId])).rows;
  }

  static async addDocument(orgId: string, accountId: string, body: Record<string, any>, actor: Actor) {
    await CrmAccounts.get(orgId, accountId);
    const d = pickFields(body, ['doc_type', 'doc_number', 'file_name', 'file_url', 'expires_on']);
    oneOf(d.doc_type, DOC_TYPES, 'doc_type');
    if (!d.doc_type) throw new CrmError('doc_type is required.', 400, 'INVALID_DOC_TYPE');
    if (d.file_url && !/^(https?:\/\/|\/)/i.test(d.file_url)) throw new CrmError('file_url must be an http(s) or site-relative URL.', 400, 'INVALID_URL');
    const r = await pool.query(
      `INSERT INTO crm_account_documents (id, organization_id, account_id, doc_type, doc_number, file_name, file_url, expires_on, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [newId('doc'), orgId, accountId, d.doc_type, d.doc_number ?? null, d.file_name ?? null, d.file_url ?? null, d.expires_on ?? null, actor.id]);
    await pool.query(`UPDATE crm_accounts SET onboarding_status = CASE WHEN onboarding_status = 'not_started' THEN 'in_progress' ELSE onboarding_status END,
                      kyc_status = CASE WHEN kyc_status IN ('pending','rejected') THEN 'submitted' ELSE kyc_status END, updated_at = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, accountId]);
    return r.rows[0];
  }

  static async reviewDocument(orgId: string, docId: string, body: Record<string, any>, actor: Actor) {
    oneOf(body.status, ['verified', 'rejected'], 'status');
    if (!body.status) throw new CrmError('status (verified|rejected) is required.', 400, 'INVALID_STATUS');
    if (body.status === 'rejected' && !String(body.review_notes || '').trim()) throw new CrmError('A reason is required to reject a document.', 400, 'REASON_REQUIRED');
    const r = await pool.query(
      `UPDATE crm_account_documents SET status = $3, review_notes = $4, reviewed_by = $5, reviewed_at = NOW() WHERE organization_id = $1 AND id = $2 RETURNING *`,
      [orgId, docId, body.status, body.review_notes ?? null, actor.id]);
    if (!r.rows.length) throw new CrmError('Document not found.', 404, 'NOT_FOUND');
    return r.rows[0];
  }

  /** KYC is verified only when GST + PAN documents are verified; onboarding completes with it. */
  static async verifyKyc(orgId: string, accountId: string, actor: Actor) {
    const acc = await CrmAccounts.get(orgId, accountId);
    const verified = (await pool.query(`SELECT DISTINCT doc_type FROM crm_account_documents WHERE organization_id = $1 AND account_id = $2 AND status = 'verified'`, [orgId, accountId])).rows.map((r: any) => r.doc_type);
    const missing = ['gst', 'pan'].filter((t) => !verified.includes(t));
    if (missing.length) throw new CrmError(`Verify these documents first: ${missing.join(', ').toUpperCase()}.`, 409, 'KYC_INCOMPLETE', { missing });
    if (!acc.gstin || !acc.pan) throw new CrmError('Record the account GSTIN and PAN before completing KYC.', 409, 'KYC_INCOMPLETE');
    return (await pool.query(
      `UPDATE crm_accounts SET kyc_status = 'verified', kyc_verified_at = NOW(), kyc_verified_by = $3, onboarding_status = 'completed', updated_at = NOW() WHERE organization_id = $1 AND id = $2 RETURNING *`,
      [orgId, accountId, actor.id])).rows[0];
  }

  // ---- visit logs ---------------------------------------------------------------------------------------------------
  static async listVisits(orgId: string, f: Record<string, any>, page: { limit: number; offset: number }) {
    const params: any[] = [orgId];
    let where = 'v.organization_id = $1';
    for (const k of ['account_id', 'employee_id']) if (f[k]) { params.push(f[k]); where += ` AND v.${k} = $${params.length}`; }
    const total = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_visits v WHERE ${where}`, params)).rows[0].n);
    params.push(page.limit, page.offset);
    const rows = (await pool.query(
      `SELECT v.*, a.name AS account_name, e.display_name AS employee_name FROM crm_visits v LEFT JOIN crm_accounts a ON a.id = v.account_id LEFT JOIN employees e ON e.id = v.employee_id
        WHERE ${where} ORDER BY COALESCE(v.check_in_at, v.planned_for, v.created_at) DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
    return { rows, total };
  }

  private static coords(lat: any, lng: any) {
    if (lat === undefined && lng === undefined) return [null, null];
    const la = Number(lat), lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) throw new CrmError('Latitude/longitude are not valid.', 400, 'INVALID_COORDINATES');
    return [la, lo];
  }

  static async createVisit(orgId: string, body: Record<string, any>, actor: Actor) {
    const d = pickFields(body, ['account_id', 'lead_id', 'contact_id', 'employee_id', 'visit_type', 'planned_for', 'summary', 'outcome', 'next_action', 'next_visit_date', 'photo_url']);
    oneOf(d.visit_type, ['sales', 'onboarding', 'collection', 'service', 'other'], 'visit_type');
    if (!d.account_id && !d.lead_id) throw new CrmError('A visit needs an account or a lead.', 400, 'TARGET_REQUIRED');
    if (d.account_id) await CrmAccounts.get(orgId, d.account_id);
    await employeeExists(pool, orgId, d.employee_id);
    const r = await pool.query(
      `INSERT INTO crm_visits (id, organization_id, account_id, lead_id, contact_id, employee_id, visit_type, planned_for, summary, outcome, next_action, next_visit_date, photo_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [newId('vis'), orgId, d.account_id ?? null, d.lead_id ?? null, d.contact_id ?? null, d.employee_id ?? null, d.visit_type ?? 'sales', d.planned_for ?? null, d.summary ?? null,
        d.outcome ?? null, d.next_action ?? null, d.next_visit_date ?? null, d.photo_url ?? null, actor.id]);
    return r.rows[0];
  }

  static async checkIn(orgId: string, id: string, body: Record<string, any>) {
    const [lat, lng] = CrmAccounts.coords(body.lat, body.lng);
    const r = await pool.query(
      `UPDATE crm_visits SET check_in_at = NOW(), check_in_lat = $3, check_in_lng = $4, photo_url = COALESCE($5, photo_url)
        WHERE organization_id = $1 AND id = $2 AND check_in_at IS NULL RETURNING *`, [orgId, id, lat, lng, body.photo_url ?? null]);
    if (!r.rows.length) throw new CrmError('Visit not found or already checked in.', 409, 'INVALID_STATE');
    return r.rows[0];
  }

  static async checkOut(orgId: string, id: string, body: Record<string, any>) {
    const [lat, lng] = CrmAccounts.coords(body.lat, body.lng);
    const r = await pool.query(
      `UPDATE crm_visits SET check_out_at = NOW(), check_out_lat = $3, check_out_lng = $4, summary = COALESCE($5, summary), outcome = COALESCE($6, outcome),
              next_action = COALESCE($7, next_action), next_visit_date = COALESCE($8, next_visit_date)
        WHERE organization_id = $1 AND id = $2 AND check_in_at IS NOT NULL AND check_out_at IS NULL RETURNING *`,
      [orgId, id, lat, lng, body.summary ?? null, body.outcome ?? null, body.next_action ?? null, body.next_visit_date ?? null]);
    if (!r.rows.length) throw new CrmError('Visit not found, not checked in, or already checked out.', 409, 'INVALID_STATE');
    return r.rows[0];
  }

  // ---- Customer 360 ------------------------------------------------------------------------------------------------
  /** One call that gathers everything about an account. Sections whose source module has no data return empty, not errors. */
  static async customer360(orgId: string, accountId: string) {
    const account = await CrmAccounts.get(orgId, accountId);
    const q = async (sql: string, params: any[]) => (await pool.query(sql, params)).rows;
    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => { try { return await fn(); } catch { return fallback; } };
    const [contacts, deals, quotes, activities, notes, tickets, documents, visits, links, consent] = await Promise.all([
      q(`SELECT * FROM crm_contacts WHERE organization_id = $1 AND account_id = $2 AND archived_at IS NULL ORDER BY is_primary DESC, created_at`, [orgId, accountId]),
      q(`SELECT d.*, s.name AS stage_name FROM crm_deals d JOIN crm_pipeline_stages s ON s.id = d.stage_id WHERE d.organization_id = $1 AND d.account_id = $2 AND d.archived_at IS NULL ORDER BY d.created_at DESC LIMIT 50`, [orgId, accountId]),
      q(`SELECT id, quote_number, title, status, grand_total, valid_until, created_at FROM crm_quotes WHERE organization_id = $1 AND account_id = $2 AND archived_at IS NULL ORDER BY created_at DESC LIMIT 50`, [orgId, accountId]),
      q(`SELECT * FROM crm_activities WHERE organization_id = $1 AND account_id = $2 ORDER BY COALESCE(completed_at, due_date, created_at) DESC LIMIT 50`, [orgId, accountId]),
      q(`SELECT * FROM crm_notes WHERE organization_id = $1 AND account_id = $2 ORDER BY is_pinned DESC, created_at DESC LIMIT 50`, [orgId, accountId]),
      q(`SELECT id, ticket_number, subject, status, priority, created_at, csat_score FROM crm_tickets WHERE organization_id = $1 AND account_id = $2 ORDER BY created_at DESC LIMIT 50`, [orgId, accountId]),
      q(`SELECT * FROM crm_account_documents WHERE organization_id = $1 AND account_id = $2 ORDER BY created_at DESC`, [orgId, accountId]),
      q(`SELECT * FROM crm_visits WHERE organization_id = $1 AND account_id = $2 ORDER BY COALESCE(check_in_at, created_at) DESC LIMIT 20`, [orgId, accountId]),
      q(`SELECT * FROM crm_account_links WHERE organization_id = $1 AND account_id = $2`, [orgId, accountId]),
      q(`SELECT DISTINCT ON (c.subject_id, k.channel, k.purpose) c.display_name, k.channel, k.purpose, k.status, k.created_at
           FROM crm_contacts c JOIN crm_consents k ON k.organization_id = c.organization_id AND k.subject_type = 'contact' AND k.subject_id = c.id
          WHERE c.organization_id = $1 AND c.account_id = $2 ORDER BY c.subject_id NULLS LAST, k.channel, k.purpose, k.created_at DESC`, [orgId, accountId]).catch(() => []),
    ]);

    // Orders / invoices / payments / rewards come from linked operational records, when the account is linked to one.
    const retailerIds = links.filter((l: any) => l.entity_type === 'retailer').map((l: any) => l.entity_id);
    const distributorIds = links.filter((l: any) => l.entity_type === 'distributor').map((l: any) => l.entity_id);
    const customerIds = links.filter((l: any) => l.entity_type === 'customer').map((l: any) => l.entity_id);
    const orders = await safe(async () => (links.length === 0 ? [] : (await pool.query(
      `SELECT id, order_number, status, grand_total, order_date, created_at FROM sales_orders
        WHERE organization_id = $1 AND (retailer_id = ANY($2::text[]) OR distributor_id = ANY($3::text[]) OR customer_reference = ANY($4::text[])) ORDER BY created_at DESC LIMIT 20`,
      [orgId, retailerIds, distributorIds, customerIds])).rows), [] as any[]);
    const invoices = await safe(async () => (customerIds.length + retailerIds.length + distributorIds.length === 0 ? [] : (await pool.query(
      `SELECT id, invoice_number, status, grand_total, amount_paid, amount_outstanding, due_date, created_at FROM invoices
        WHERE organization_id = $1 AND customer_id = ANY($2::text[]) ORDER BY created_at DESC LIMIT 20`, [orgId, [...customerIds, ...retailerIds, ...distributorIds]])).rows), [] as any[]);

    const openDeals = deals.filter((d: any) => d.status === 'open');
    const wonDeals = deals.filter((d: any) => d.status === 'won');
    return {
      account, contacts, deals, quotes, activities, notes, tickets, documents, visits, linked_records: links, consent, orders, invoices,
      summary: {
        open_deal_value: openDeals.reduce((s: number, d: any) => s + Number(d.deal_value), 0),
        won_deal_value: wonDeals.reduce((s: number, d: any) => s + Number(d.deal_value), 0),
        open_tickets: tickets.filter((t: any) => ['open', 'pending'].includes(t.status)).length,
        last_activity_at: activities[0]?.completed_at || activities[0]?.created_at || null,
        orders_available: links.length > 0,
      },
    };
  }
}
