// Quotation builder: line items from the product master (price + GST default from products), server-side totals, lifecycle.
import { pool } from './db.ts';
import { newId } from './core/tokens.ts';
import { CrmError, nextNumber, oneOf, pickFields, tx, type Actor } from './crm-core.ts';

const r2 = (n: number) => Math.round(n * 100) / 100;

interface ItemIn { product_id?: string; sku?: string; description?: string; quantity?: number; unit_price?: number; discount_pct?: number; tax_pct?: number }

async function priceItems(c: Pick<import('pg').PoolClient, 'query'>, orgId: string, items: ItemIn[]) {
  if (!Array.isArray(items) || !items.length) throw new CrmError('A quotation needs at least one line item.', 400, 'ITEMS_REQUIRED');
  if (items.length > 200) throw new CrmError('At most 200 line items.', 400, 'TOO_MANY');
  const out: any[] = [];
  let subtotal = 0, discount = 0, tax = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i] || {};
    let description = String(it.description || '').trim();
    let unit = it.unit_price, taxPct = it.tax_pct, sku = it.sku ?? null;
    if (it.product_id) {
      const p = (await c.query(`SELECT id, sku, name, selling_price, tax_rate FROM products WHERE id = $1 AND organization_id = $2`, [it.product_id, orgId])).rows[0];
      if (!p) throw new CrmError(`Line ${i + 1}: product ${it.product_id} does not exist.`, 400, 'INVALID_PRODUCT');
      description = description || p.name;
      sku = sku ?? p.sku;
      if (unit === undefined || unit === null) unit = Number(p.selling_price);
      if (taxPct === undefined || taxPct === null) taxPct = Number(p.tax_rate ?? 0);
    }
    const qty = Number(it.quantity), price = Number(unit), disc = Number(it.discount_pct ?? 0), tp = Number(taxPct ?? 0);
    if (!description) throw new CrmError(`Line ${i + 1}: description is required.`, 400, 'INVALID_ITEM');
    if (!(qty > 0)) throw new CrmError(`Line ${i + 1}: quantity must be greater than 0.`, 400, 'INVALID_ITEM');
    if (!Number.isFinite(price) || price < 0) throw new CrmError(`Line ${i + 1}: unit price must be 0 or more.`, 400, 'INVALID_ITEM');
    if (!(disc >= 0 && disc <= 100)) throw new CrmError(`Line ${i + 1}: discount must be between 0 and 100.`, 400, 'INVALID_ITEM');
    if (!(tp >= 0 && tp <= 100)) throw new CrmError(`Line ${i + 1}: tax must be between 0 and 100.`, 400, 'INVALID_ITEM');
    const gross = qty * price, d = gross * disc / 100, net = gross - d, t = net * tp / 100;
    subtotal += gross; discount += d; tax += t;
    out.push({ position: i + 1, product_id: it.product_id ?? null, sku, description: description.slice(0, 500), quantity: qty, unit_price: price, discount_pct: disc, tax_pct: tp, line_total: r2(net + t) });
  }
  return { items: out, subtotal: r2(subtotal), discount_total: r2(discount), tax_total: r2(tax), grand_total: r2(subtotal - discount + tax) };
}

export class CrmQuotes {
  static async list(orgId: string, f: Record<string, any>, page: { limit: number; offset: number }) {
    const params: any[] = [orgId];
    let where = 'q.organization_id = $1 AND q.archived_at IS NULL';
    for (const k of ['status', 'account_id', 'deal_id']) if (f[k]) { params.push(f[k]); where += ` AND q.${k} = $${params.length}`; }
    const total = Number((await pool.query(`SELECT COUNT(*)::int n FROM crm_quotes q WHERE ${where}`, params)).rows[0].n);
    params.push(page.limit, page.offset);
    const rows = (await pool.query(
      `SELECT q.*, a.name AS account_name FROM crm_quotes q LEFT JOIN crm_accounts a ON a.id = q.account_id WHERE ${where} ORDER BY q.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
    return { rows, total };
  }

  static async get(orgId: string, id: string) {
    const q = (await pool.query(`SELECT q.*, a.name AS account_name, a.gstin AS account_gstin FROM crm_quotes q LEFT JOIN crm_accounts a ON a.id = q.account_id WHERE q.organization_id = $1 AND q.id = $2`, [orgId, id])).rows[0];
    if (!q) throw new CrmError('Quotation not found.', 404, 'NOT_FOUND');
    const items = (await pool.query(`SELECT * FROM crm_quote_items WHERE quote_id = $1 ORDER BY position`, [id])).rows;
    return { ...q, items };
  }

  private static async refs(c: Pick<import('pg').PoolClient, 'query'>, orgId: string, d: Record<string, any>) {
    if (d.account_id && !(await c.query(`SELECT 1 FROM crm_accounts WHERE id = $1 AND organization_id = $2`, [d.account_id, orgId])).rows.length) throw new CrmError('Account does not exist.', 400, 'INVALID_ACCOUNT');
    if (d.contact_id && !(await c.query(`SELECT 1 FROM crm_contacts WHERE id = $1 AND organization_id = $2`, [d.contact_id, orgId])).rows.length) throw new CrmError('Contact does not exist.', 400, 'INVALID_CONTACT');
    if (d.deal_id && !(await c.query(`SELECT 1 FROM crm_deals WHERE id = $1 AND organization_id = $2`, [d.deal_id, orgId])).rows.length) throw new CrmError('Deal does not exist.', 400, 'INVALID_DEAL');
  }

  static async create(orgId: string, body: Record<string, any>, actor: Actor) {
    const d = pickFields(body, ['title', 'account_id', 'contact_id', 'deal_id', 'valid_until', 'terms', 'notes']);
    if (!d.title) throw new CrmError('Title is required.', 400, 'TITLE_REQUIRED');
    if (!d.account_id && !d.deal_id) throw new CrmError('A quotation needs an account or a deal.', 400, 'TARGET_REQUIRED');
    if (d.valid_until && Number.isNaN(Date.parse(d.valid_until))) throw new CrmError('valid_until is not a valid date.', 400, 'INVALID_DATE');
    return tx(async (c) => {
      if (!d.account_id && d.deal_id) d.account_id = (await c.query(`SELECT account_id FROM crm_deals WHERE id = $1 AND organization_id = $2`, [d.deal_id, orgId])).rows[0]?.account_id;
      await CrmQuotes.refs(c, orgId, d);
      const priced = await priceItems(c, orgId, body.items);
      const no = await nextNumber(c, orgId, 'quote', 'QT');
      const id = newId('qt');
      await c.query(
        `INSERT INTO crm_quotes (id, organization_id, quote_number, title, account_id, contact_id, deal_id, valid_until, subtotal, discount_total, tax_total, grand_total, terms, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [id, orgId, no, d.title, d.account_id ?? null, d.contact_id ?? null, d.deal_id ?? null, d.valid_until ?? new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10), priced.subtotal,
          priced.discount_total, priced.tax_total, priced.grand_total, d.terms ?? null, d.notes ?? null, actor.id]);
      for (const it of priced.items) {
        await c.query(`INSERT INTO crm_quote_items (id, quote_id, position, product_id, sku, description, quantity, unit_price, discount_pct, tax_pct, line_total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [newId('qti'), id, it.position, it.product_id, it.sku, it.description, it.quantity, it.unit_price, it.discount_pct, it.tax_pct, it.line_total]);
      }
      return CrmQuotes.getWith(c, orgId, id);
    });
  }

  private static async getWith(c: Pick<import('pg').PoolClient, 'query'>, orgId: string, id: string) {
    const q = (await c.query(`SELECT * FROM crm_quotes WHERE organization_id = $1 AND id = $2`, [orgId, id])).rows[0];
    const items = (await c.query(`SELECT * FROM crm_quote_items WHERE quote_id = $1 ORDER BY position`, [id])).rows;
    return { ...q, items };
  }

  /** Only drafts can be edited; a sent quotation is a commitment, so change it by cloning (new version). */
  static async update(orgId: string, id: string, body: Record<string, any>) {
    const d = pickFields(body, ['title', 'contact_id', 'valid_until', 'terms', 'notes']);
    if ('title' in d && !d.title) throw new CrmError('Title is required.', 400, 'TITLE_REQUIRED');
    return tx(async (c) => {
      const q = (await c.query(`SELECT * FROM crm_quotes WHERE organization_id = $1 AND id = $2 AND archived_at IS NULL FOR UPDATE`, [orgId, id])).rows[0];
      if (!q) throw new CrmError('Quotation not found.', 404, 'NOT_FOUND');
      if (q.status !== 'draft') throw new CrmError('Only draft quotations can be edited. Clone it to revise.', 409, 'NOT_DRAFT');
      await CrmQuotes.refs(c, orgId, d);
      const cols: Record<string, any> = { ...d };
      if (body.items !== undefined) {
        const priced = await priceItems(c, orgId, body.items);
        await c.query(`DELETE FROM crm_quote_items WHERE quote_id = $1`, [id]);
        for (const it of priced.items) {
          await c.query(`INSERT INTO crm_quote_items (id, quote_id, position, product_id, sku, description, quantity, unit_price, discount_pct, tax_pct, line_total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [newId('qti'), id, it.position, it.product_id, it.sku, it.description, it.quantity, it.unit_price, it.discount_pct, it.tax_pct, it.line_total]);
        }
        Object.assign(cols, { subtotal: priced.subtotal, discount_total: priced.discount_total, tax_total: priced.tax_total, grand_total: priced.grand_total });
      }
      const keys = Object.keys(cols);
      if (keys.length) await c.query(`UPDATE crm_quotes SET ${keys.map((k, i) => `${k} = $${i + 3}`).join(', ')}, updated_at = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, id, ...keys.map((k) => cols[k])]);
      return CrmQuotes.getWith(c, orgId, id);
    });
  }

  static async transition(orgId: string, id: string, to: 'sent' | 'accepted' | 'rejected', note?: string) {
    oneOf(to, ['sent', 'accepted', 'rejected'], 'status');
    const allowed: Record<string, string[]> = { sent: ['draft'], accepted: ['sent'], rejected: ['sent'] };
    if (to === 'rejected' && !String(note || '').trim()) throw new CrmError('A reason is required when a quotation is rejected.', 400, 'REASON_REQUIRED');
    return tx(async (c) => {
      const q = (await c.query(`SELECT * FROM crm_quotes WHERE organization_id = $1 AND id = $2 AND archived_at IS NULL FOR UPDATE`, [orgId, id])).rows[0];
      if (!q) throw new CrmError('Quotation not found.', 404, 'NOT_FOUND');
      if (!allowed[to].includes(q.status)) throw new CrmError(`A ${q.status} quotation cannot become ${to}.`, 409, 'INVALID_STATE');
      if (to === 'sent' && q.valid_until && new Date(q.valid_until) < new Date(new Date().toISOString().slice(0, 10))) throw new CrmError('The validity date has passed. Extend it first.', 409, 'EXPIRED');
      if (to === 'accepted' && q.valid_until && new Date(q.valid_until) < new Date(new Date().toISOString().slice(0, 10))) throw new CrmError('This quotation has expired.', 409, 'EXPIRED');
      await c.query(`UPDATE crm_quotes SET status = $3, sent_at = CASE WHEN $5 THEN NOW() ELSE sent_at END, decided_at = CASE WHEN $5 THEN decided_at ELSE NOW() END,
                     decision_note = COALESCE($4, decision_note), updated_at = NOW() WHERE organization_id = $1 AND id = $2`, [orgId, id, to, note?.trim() || null, to === 'sent']);
      if (to === 'accepted' && q.deal_id) {
        await c.query(`UPDATE crm_deals SET deal_value = $3, updated_at = NOW() WHERE organization_id = $1 AND id = $2 AND status = 'open'`, [orgId, q.deal_id, q.grand_total]);
      }
      return CrmQuotes.getWith(c, orgId, id);
    });
  }

  static async clone(orgId: string, id: string, actor: Actor) {
    const src = await CrmQuotes.get(orgId, id);
    return CrmQuotes.create(orgId, {
      title: src.title, account_id: src.account_id, contact_id: src.contact_id, deal_id: src.deal_id, terms: src.terms, notes: src.notes,
      items: src.items.map((i: any) => ({ product_id: i.product_id, sku: i.sku, description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), discount_pct: Number(i.discount_pct), tax_pct: Number(i.tax_pct) })),
    }, actor);
  }

  static async archive(orgId: string, id: string) {
    const r = await pool.query(`UPDATE crm_quotes SET archived_at = NOW() WHERE organization_id = $1 AND id = $2 AND archived_at IS NULL AND status IN ('draft','rejected','expired') RETURNING id`, [orgId, id]);
    if (!r.rows.length) throw new CrmError('Only draft, rejected or expired quotations can be deleted.', 409, 'INVALID_STATE');
    return { id };
  }

  /** Marks sent quotations past their validity date as expired. Safe to call repeatedly. */
  static async expireStale(orgId: string) {
    const r = await pool.query(`UPDATE crm_quotes SET status = 'expired', updated_at = NOW() WHERE organization_id = $1 AND status = 'sent' AND valid_until < CURRENT_DATE RETURNING id`, [orgId]);
    return { expired: r.rows.length };
  }
}
