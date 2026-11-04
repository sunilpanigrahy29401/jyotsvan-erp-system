import { Router, Request, Response } from 'express';
import { pool } from './db.ts';

export const supplierRouter = Router();

// Mask sensitive bank account numbers
function maskBankAccount(acc: string | null | undefined): string {
  if (!acc) return '—';
  const clean = String(acc).trim();
  if (clean.length <= 4) return '•••• ' + clean;
  return '•••• •••• •••• ' + clean.slice(-4);
}

// Helper to record audit logs
async function recordAudit(
  organizationId: string,
  actorId: string | null,
  actorEmail: string,
  action: string,
  targetResource: string,
  targetId: string,
  details: any
) {
  try {
    const auditId = 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    await pool.query(
      `INSERT INTO audit_logs (id, organization_id, actor_id, actor_email, action, target_resource, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [auditId, organizationId, actorId, actorEmail || 'system@jyotsvan.enterprise', action, targetResource, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    console.warn('[Audit Log Error]', err);
  }
}

// ============================================================================
// 1. SUPPLIER MASTER CRUD & LISTING
// ============================================================================

// GET /api/suppliers - List suppliers with filters, pagination, and counts
supplierRouter.get('/suppliers', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const queryText = (req.query.query as string)?.trim() || '';
  const supplierType = (req.query.supplierType as string) || '';
  const status = (req.query.status as string) || '';
  const ratingStatus = (req.query.ratingStatus as string) || '';
  const city = (req.query.city as string) || '';
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 25));
  const offset = (page - 1) * pageSize;

  const showSensitive = req.query.showSensitive === 'true';

  try {
    const conditions: string[] = ['s.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (queryText) {
      conditions.push(`(
        s.supplier_code ILIKE $${idx} OR
        s.supplier_name ILIKE $${idx} OR
        s.legal_name ILIKE $${idx} OR
        s.primary_email ILIKE $${idx} OR
        s.primary_phone ILIKE $${idx} OR
        s.tax_id ILIKE $${idx} OR
        EXISTS (
          SELECT 1 FROM supplier_contacts sc 
          WHERE sc.supplier_id = s.id AND sc.name ILIKE $${idx}
        )
      )`);
      values.push(`%${queryText}%`);
      idx++;
    }

    if (supplierType && supplierType !== 'all') {
      conditions.push(`s.supplier_type = $${idx}`);
      values.push(supplierType);
      idx++;
    }

    if (status && status !== 'all') {
      conditions.push(`s.status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (ratingStatus && ratingStatus !== 'all') {
      conditions.push(`s.rating_status = $${idx}`);
      values.push(ratingStatus);
      idx++;
    }

    if (city && city !== 'all') {
      conditions.push(`s.city ILIKE $${idx}`);
      values.push(`%${city}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    // Total count
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as total FROM suppliers s WHERE ${whereClause}`,
      values
    );
    const total = countRes.rows[0]?.total || 0;

    // Fetch records with SKU count and primary contact name
    const querySql = `
      SELECT 
        s.id, s.organization_id, s.supplier_code, s.supplier_name, s.legal_name, s.display_name,
        s.supplier_type, s.status, s.registration_number, s.tax_id, s.pan_number, s.tax_registration_status,
        s.website, s.industry, s.primary_email, s.primary_phone, s.alternate_phone,
        s.address_line_1, s.city, s.state, s.postal_code, s.country,
        s.payment_terms, s.default_currency, s.credit_limit, s.lead_time_days, s.minimum_order_value,
        s.rating_status, s.rating_notes,
        s.bank_name, s.bank_account_holder, s.bank_account_number, s.bank_ifsc, s.bank_branch,
        s.created_at, s.updated_at,
        COUNT(DISTINCT ss.id)::int as sku_count,
        COUNT(DISTINCT sc.id)::int as contact_count,
        (
          SELECT sc2.name FROM supplier_contacts sc2 
          WHERE sc2.supplier_id = s.id 
          ORDER BY sc2.is_primary DESC, sc2.created_at ASC 
          LIMIT 1
        ) as primary_contact_name,
        (
          SELECT sc2.email FROM supplier_contacts sc2 
          WHERE sc2.supplier_id = s.id 
          ORDER BY sc2.is_primary DESC, sc2.created_at ASC 
          LIMIT 1
        ) as primary_contact_email,
        (
          SELECT sc2.phone FROM supplier_contacts sc2 
          WHERE sc2.supplier_id = s.id 
          ORDER BY sc2.is_primary DESC, sc2.created_at ASC 
          LIMIT 1
        ) as primary_contact_phone
      FROM suppliers s
      LEFT JOIN supplier_skus ss ON ss.supplier_id = s.id AND ss.status != 'archived'
      LEFT JOIN supplier_contacts sc ON sc.supplier_id = s.id AND sc.status != 'archived'
      WHERE ${whereClause}
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    values.push(pageSize, offset);
    const dataRes = await pool.query(querySql, values);

    // Apply sensitive data masking if not explicitly authorized
    const rows = dataRes.rows.map(row => ({
      ...row,
      bank_account_number: showSensitive ? row.bank_account_number : maskBankAccount(row.bank_account_number),
      credit_limit: Number(row.credit_limit) || 0,
      minimum_order_value: Number(row.minimum_order_value) || 0,
      lead_time_days: parseInt(row.lead_time_days, 10) || 0
    }));

    res.json({
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list suppliers' });
  }
});

// GET /api/suppliers/export - Stream/Return CSV Export
supplierRouter.get('/suppliers/export', async (req: Request, res: Response) => {
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  try {
    const result = await pool.query(`
      SELECT 
        s.supplier_code, s.supplier_name, s.legal_name, s.supplier_type, s.status,
        s.tax_id, s.pan_number, s.primary_email, s.primary_phone,
        s.city, s.state, s.country, s.payment_terms, s.default_currency,
        s.credit_limit, s.lead_time_days, s.minimum_order_value, s.rating_status,
        COUNT(DISTINCT ss.id)::int as active_skus_count
      FROM suppliers s
      LEFT JOIN supplier_skus ss ON ss.supplier_id = s.id AND ss.status = 'active'
      WHERE s.organization_id = $1 AND s.status != 'archived'
      GROUP BY s.id
      ORDER BY s.supplier_code ASC
    `, [orgId]);

    res.json({ data: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to export suppliers' });
  }
});

// GET /api/suppliers/:id - Deep details with contacts, addresses, SKUs, pricing & documents
supplierRouter.get('/suppliers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const showSensitive = req.query.showSensitive === 'true';

  try {
    const supRes = await pool.query(
      `SELECT * FROM suppliers WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );

    if (supRes.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const supplier = supRes.rows[0];

    // Fetch related entities in parallel
    const [contactsRes, addressesRes, skusRes, pricingRes, docsRes, auditRes] = await Promise.all([
      pool.query(`SELECT * FROM supplier_contacts WHERE supplier_id = $1 ORDER BY is_primary DESC, name ASC`, [id]),
      pool.query(`SELECT * FROM supplier_addresses WHERE supplier_id = $1 ORDER BY is_primary DESC, address_type ASC`, [id]),
      pool.query(`
        SELECT 
          ss.*,
          s.sku, s.variant_name, s.barcode, s.pack_size, s.pack_unit, s.cost_price as standard_cost_price,
          p.id as parent_product_id, p.name as product_name, p.product_code, p.brand, p.product_type
        FROM supplier_skus ss
        JOIN skus s ON ss.sku_id = s.id
        JOIN products p ON s.product_id = p.id
        WHERE ss.supplier_id = $1 AND ss.status != 'archived'
        ORDER BY ss.preferred_supplier DESC, s.sku ASC
      `, [id]),
      pool.query(`
        SELECT 
          sp.*,
          s.sku, s.variant_name, p.name as product_name
        FROM supplier_prices sp
        JOIN skus s ON sp.sku_id = s.id
        JOIN products p ON s.product_id = p.id
        WHERE sp.supplier_id = $1
        ORDER BY sp.effective_from DESC, sp.created_at DESC
      `, [id]),
      pool.query(`SELECT * FROM supplier_documents WHERE supplier_id = $1 AND status != 'archived' ORDER BY created_at DESC`, [id]),
      pool.query(`
        SELECT id, actor_email, action, target_resource, details, created_at
        FROM audit_logs
        WHERE organization_id = $1 AND (target_id = $2 OR details->>'supplier_id' = $2)
        ORDER BY created_at DESC
        LIMIT 20
      `, [orgId, id])
    ]);

    const formattedSupplier = {
      ...supplier,
      credit_limit: Number(supplier.credit_limit) || 0,
      minimum_order_value: Number(supplier.minimum_order_value) || 0,
      lead_time_days: parseInt(supplier.lead_time_days, 10) || 0,
      raw_bank_account_number: supplier.bank_account_number,
      bank_account_number: showSensitive ? supplier.bank_account_number : maskBankAccount(supplier.bank_account_number),
      contacts: contactsRes.rows,
      addresses: addressesRes.rows,
      skus: skusRes.rows.map(s => ({
        ...s,
        minimum_order_quantity: Number(s.minimum_order_quantity) || 1,
        lead_time_days: s.lead_time_days !== null ? parseInt(s.lead_time_days, 10) : supplier.lead_time_days
      })),
      pricing: pricingRes.rows.map(p => ({
        ...p,
        price: Number(p.price) || 0,
        minimum_order_quantity: Number(p.minimum_order_quantity) || 1
      })),
      documents: docsRes.rows,
      recent_activity: auditRes.rows
    };

    res.json({ supplier: formattedSupplier });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch supplier details' });
  }
});

// POST /api/suppliers - Create new supplier
supplierRouter.post('/suppliers', async (req: Request, res: Response) => {
  const {
    organization_id, supplier_code, supplier_name, legal_name, display_name,
    supplier_type, status, registration_number, tax_id, pan_number, tax_registration_status,
    website, industry, notes, primary_email, primary_phone, alternate_phone,
    address_line_1, address_line_2, city, state, postal_code, country,
    payment_terms, default_currency, credit_limit, lead_time_days, minimum_order_value,
    rating_status, rating_notes, bank_name, bank_account_holder, bank_account_number, bank_ifsc, bank_branch
  } = req.body;

  const orgId = organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  if (!supplier_name || !supplier_name.trim()) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }

  // Generate or sanitize code
  let finalCode = supplier_code?.trim().toUpperCase();
  if (!finalCode) {
    const seq = await pool.query('SELECT count(*)::int as count FROM suppliers WHERE organization_id = $1', [orgId]);
    finalCode = `SUP-${String((seq.rows[0]?.count || 0) + 1).padStart(3, '0')}`;
  }

  // Check code uniqueness
  const existing = await pool.query(
    'SELECT id FROM suppliers WHERE organization_id = $1 AND UPPER(supplier_code) = $2',
    [orgId, finalCode]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: `Supplier code "${finalCode}" already exists in organization` });
  }

  const supplierId = 'sup-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

  try {
    await pool.query(`
      INSERT INTO suppliers (
        id, organization_id, supplier_code, supplier_name, legal_name, display_name,
        supplier_type, status, registration_number, tax_id, pan_number, tax_registration_status,
        website, industry, notes, primary_email, primary_phone, alternate_phone,
        address_line_1, address_line_2, city, state, postal_code, country,
        payment_terms, default_currency, credit_limit, lead_time_days, minimum_order_value,
        rating_status, rating_notes, bank_name, bank_account_holder, bank_account_number, bank_ifsc, bank_branch,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29,
        $30, $31, $32, $33, $34, $35, $36,
        NOW(), NOW()
      )
    `, [
      supplierId, orgId, finalCode, supplier_name.trim(), legal_name?.trim() || supplier_name.trim(), display_name?.trim() || null,
      supplier_type || 'raw_material', status || 'active', registration_number?.trim() || null, tax_id?.trim() || null, pan_number?.trim() || null, tax_registration_status || 'registered',
      website?.trim() || null, industry?.trim() || null, notes?.trim() || null, primary_email?.trim() || null, primary_phone?.trim() || null, alternate_phone?.trim() || null,
      address_line_1?.trim() || null, address_line_2?.trim() || null, city?.trim() || null, state?.trim() || null, postal_code?.trim() || null, country?.trim() || 'India',
      payment_terms || 'net_30', default_currency || 'INR', parseFloat(credit_limit) || 0, parseInt(lead_time_days, 10) || 14, parseFloat(minimum_order_value) || 0,
      rating_status || 'standard', rating_notes?.trim() || null, bank_name?.trim() || null, bank_account_holder?.trim() || null, bank_account_number?.trim() || null, bank_ifsc?.trim() || null, bank_branch?.trim() || null
    ]);

    await recordAudit(orgId, actorId, actorEmail, 'supplier.created', 'suppliers', supplierId, {
      supplier_code: finalCode,
      supplier_name,
      supplier_type,
      status: status || 'active'
    });

    res.status(201).json({
      message: 'Supplier registered successfully',
      supplier_id: supplierId,
      supplier_code: finalCode
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to register supplier' });
  }
});

// PUT /api/suppliers/:id - Update supplier details
supplierRouter.put('/suppliers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = req.body.organization_id || 'org-jyotsvan-corp';
  const actorId = req.body.actor_id || null;
  const actorEmail = req.body.actor_email || 'admin@jyotsvan.enterprise';

  const {
    supplier_code, supplier_name, legal_name, display_name,
    supplier_type, status, registration_number, tax_id, pan_number, tax_registration_status,
    website, industry, notes, primary_email, primary_phone, alternate_phone,
    address_line_1, address_line_2, city, state, postal_code, country,
    payment_terms, default_currency, credit_limit, lead_time_days, minimum_order_value,
    rating_status, rating_notes, bank_name, bank_account_holder, bank_account_number, bank_ifsc, bank_branch
  } = req.body;

  if (!supplier_name || !supplier_name.trim()) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }

  try {
    // Check if supplier exists
    const existing = await pool.query('SELECT * FROM suppliers WHERE id = $1 AND organization_id = $2', [id, orgId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Check code collision if modified
    if (supplier_code && supplier_code.trim().toUpperCase() !== existing.rows[0].supplier_code) {
      const collision = await pool.query(
        'SELECT id FROM suppliers WHERE organization_id = $1 AND UPPER(supplier_code) = $2 AND id != $3',
        [orgId, supplier_code.trim().toUpperCase(), id]
      );
      if (collision.rows.length > 0) {
        return res.status(409).json({ error: `Supplier code "${supplier_code}" is already in use by another vendor` });
      }
    }

    await pool.query(`
      UPDATE suppliers SET
        supplier_code = COALESCE($1, supplier_code),
        supplier_name = $2,
        legal_name = $3,
        display_name = $4,
        supplier_type = $5,
        status = $6,
        registration_number = $7,
        tax_id = $8,
        pan_number = $9,
        tax_registration_status = $10,
        website = $11,
        industry = $12,
        notes = $13,
        primary_email = $14,
        primary_phone = $15,
        alternate_phone = $16,
        address_line_1 = $17,
        address_line_2 = $18,
        city = $19,
        state = $20,
        postal_code = $21,
        country = $22,
        payment_terms = $23,
        default_currency = $24,
        credit_limit = $25,
        lead_time_days = $26,
        minimum_order_value = $27,
        rating_status = $28,
        rating_notes = $29,
        bank_name = $30,
        bank_account_holder = $31,
        bank_account_number = $32,
        bank_ifsc = $33,
        bank_branch = $34,
        updated_at = NOW()
      WHERE id = $35 AND organization_id = $36
    `, [
      supplier_code ? supplier_code.trim().toUpperCase() : null,
      supplier_name.trim(),
      legal_name?.trim() || supplier_name.trim(),
      display_name?.trim() || null,
      supplier_type || 'raw_material',
      status || 'active',
      registration_number?.trim() || null,
      tax_id?.trim() || null,
      pan_number?.trim() || null,
      tax_registration_status || 'registered',
      website?.trim() || null,
      industry?.trim() || null,
      notes?.trim() || null,
      primary_email?.trim() || null,
      primary_phone?.trim() || null,
      alternate_phone?.trim() || null,
      address_line_1?.trim() || null,
      address_line_2?.trim() || null,
      city?.trim() || null,
      state?.trim() || null,
      postal_code?.trim() || null,
      country?.trim() || 'India',
      payment_terms || 'net_30',
      default_currency || 'INR',
      parseFloat(credit_limit) || 0,
      parseInt(lead_time_days, 10) || 14,
      parseFloat(minimum_order_value) || 0,
      rating_status || 'standard',
      rating_notes?.trim() || null,
      bank_name?.trim() || null,
      bank_account_holder?.trim() || null,
      bank_account_number?.trim() || null,
      bank_ifsc?.trim() || null,
      bank_branch?.trim() || null,
      id,
      orgId
    ]);

    await recordAudit(orgId, actorId, actorEmail, 'supplier.updated', 'suppliers', id, {
      supplier_name,
      supplier_code: supplier_code || existing.rows[0].supplier_code,
      status
    });

    res.json({ message: 'Supplier profile updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update supplier profile' });
  }
});

// PATCH /api/suppliers/:id/status - Status change (activate, deactivate, block, archive)
supplierRouter.patch('/suppliers/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reason, organization_id, actor_id, actor_email } = req.body;
  const orgId = organization_id || 'org-jyotsvan-corp';

  if (!status || !['draft', 'active', 'inactive', 'blocked', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required (draft, active, inactive, blocked, archived)' });
  }

  try {
    const prev = await pool.query('SELECT status, supplier_name FROM suppliers WHERE id = $1 AND organization_id = $2', [id, orgId]);
    if (prev.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    await pool.query(
      `UPDATE suppliers SET status = $1, notes = CASE WHEN $2::text IS NOT NULL THEN COALESCE(notes || E'\n' || $2::text, $2::text) ELSE notes END, updated_at = NOW() WHERE id = $3 AND organization_id = $4`,
      [status, reason ? `[Status -> ${status}] ${reason}` : null, id, orgId]
    );

    await recordAudit(orgId, actor_id || null, actor_email || 'admin@jyotsvan.enterprise', 'supplier.status_changed', 'suppliers', id, {
      previous_status: prev.rows[0].status,
      new_status: status,
      reason
    });

    res.json({ message: `Supplier status changed to "${status}" successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update supplier status' });
  }
});

// DELETE /api/suppliers/:id - Safe archive or removal
supplierRouter.delete('/suppliers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const actorId = (req.query.actorId as string) || null;
  const actorEmail = (req.query.actorEmail as string) || 'admin@jyotsvan.enterprise';

  try {
    const existing = await pool.query('SELECT * FROM suppliers WHERE id = $1 AND organization_id = $2', [id, orgId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Check if supplier has SKUs or prices linked
    const skuCount = await pool.query('SELECT count(*)::int as count FROM supplier_skus WHERE supplier_id = $1', [id]);
    if (skuCount.rows[0]?.count > 0) {
      // Soft-archive to preserve procurement history
      await pool.query('UPDATE suppliers SET status = \'archived\', updated_at = NOW() WHERE id = $1', [id]);
      await recordAudit(orgId, actorId, actorEmail, 'supplier.archived', 'suppliers', id, {
        reason: 'Archived due to existing mapped SKUs/historical records'
      });
      return res.json({ message: 'Supplier archived to preserve historical SKU and price records' });
    }

    // Otherwise clean cascade delete
    await pool.query('DELETE FROM suppliers WHERE id = $1 AND organization_id = $2', [id, orgId]);
    await recordAudit(orgId, actorId, actorEmail, 'supplier.deleted', 'suppliers', id, {
      supplier_name: existing.rows[0].supplier_name,
      supplier_code: existing.rows[0].supplier_code
    });

    res.json({ message: 'Supplier removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete supplier' });
  }
});

// ============================================================================
// 2. SUPPLIER CONTACTS
// ============================================================================

// GET /api/suppliers/:id/contacts
supplierRouter.get('/suppliers/:id/contacts', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM supplier_contacts WHERE supplier_id = $1 ORDER BY is_primary DESC, name ASC`,
      [id]
    );
    res.json({ contacts: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch contacts' });
  }
});

// POST /api/suppliers/:id/contacts
supplierRouter.post('/suppliers/:id/contacts', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, designation, department, email, phone, alternate_phone, is_primary, status, notes, organization_id, actor_id, actor_email } = req.body;
  const orgId = organization_id || 'org-jyotsvan-corp';

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Contact name is required' });
  }

  const contactId = 'cnt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

  try {
    if (is_primary) {
      await pool.query('UPDATE supplier_contacts SET is_primary = FALSE WHERE supplier_id = $1', [id]);
    }

    await pool.query(`
      INSERT INTO supplier_contacts (
        id, organization_id, supplier_id, name, designation, department,
        email, phone, alternate_phone, is_primary, status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    `, [
      contactId, orgId, id, name.trim(), designation?.trim() || null, department?.trim() || null,
      email?.trim() || null, phone?.trim() || null, alternate_phone?.trim() || null, Boolean(is_primary), status || 'active', notes?.trim() || null
    ]);

    await recordAudit(orgId, actor_id || null, actor_email || 'admin@jyotsvan.enterprise', 'supplier_contact.created', 'supplier_contacts', contactId, {
      supplier_id: id,
      name,
      designation,
      is_primary
    });

    res.status(201).json({ message: 'Contact added successfully', contact_id: contactId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add contact' });
  }
});

// PUT /api/suppliers/:id/contacts/:contactId
supplierRouter.put('/suppliers/:id/contacts/:contactId', async (req: Request, res: Response) => {
  const { id, contactId } = req.params;
  const { name, designation, department, email, phone, alternate_phone, is_primary, status, notes, organization_id, actor_id, actor_email } = req.body;
  const orgId = organization_id || 'org-jyotsvan-corp';

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Contact name is required' });
  }

  try {
    if (is_primary) {
      await pool.query('UPDATE supplier_contacts SET is_primary = FALSE WHERE supplier_id = $1 AND id != $2', [id, contactId]);
    }

    await pool.query(`
      UPDATE supplier_contacts SET
        name = $1,
        designation = $2,
        department = $3,
        email = $4,
        phone = $5,
        alternate_phone = $6,
        is_primary = $7,
        status = $8,
        notes = $9,
        updated_at = NOW()
      WHERE id = $10 AND supplier_id = $11
    `, [
      name.trim(), designation?.trim() || null, department?.trim() || null,
      email?.trim() || null, phone?.trim() || null, alternate_phone?.trim() || null,
      Boolean(is_primary), status || 'active', notes?.trim() || null, contactId, id
    ]);

    await recordAudit(orgId, actor_id || null, actor_email || 'admin@jyotsvan.enterprise', 'supplier_contact.updated', 'supplier_contacts', contactId, {
      supplier_id: id,
      name,
      is_primary
    });

    res.json({ message: 'Contact updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update contact' });
  }
});

// DELETE /api/suppliers/:id/contacts/:contactId
supplierRouter.delete('/suppliers/:id/contacts/:contactId', async (req: Request, res: Response) => {
  const { id, contactId } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';

  try {
    await pool.query('DELETE FROM supplier_contacts WHERE id = $1 AND supplier_id = $2', [contactId, id]);
    res.json({ message: 'Contact removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete contact' });
  }
});

// ============================================================================
// 3. SUPPLIER ADDRESSES
// ============================================================================

// GET /api/suppliers/:id/addresses
supplierRouter.get('/api/suppliers/:id/addresses', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM supplier_addresses WHERE supplier_id = $1 ORDER BY is_primary DESC, address_type ASC`,
      [id]
    );
    res.json({ addresses: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch addresses' });
  }
});

// POST /api/suppliers/:id/addresses
supplierRouter.post('/suppliers/:id/addresses', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { address_type, address_line_1, address_line_2, city, state, postal_code, country, is_primary, status, organization_id } = req.body;
  const orgId = organization_id || 'org-jyotsvan-corp';

  if (!address_line_1 || !city || !state || !postal_code) {
    return res.status(400).json({ error: 'Address line 1, city, state, and postal code are required' });
  }

  const addressId = 'addr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

  try {
    if (is_primary) {
      await pool.query('UPDATE supplier_addresses SET is_primary = FALSE WHERE supplier_id = $1', [id]);
    }

    await pool.query(`
      INSERT INTO supplier_addresses (
        id, organization_id, supplier_id, address_type, address_line_1, address_line_2,
        city, state, postal_code, country, is_primary, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    `, [
      addressId, orgId, id, address_type || 'registered', address_line_1.trim(), address_line_2?.trim() || null,
      city.trim(), state.trim(), postal_code.trim(), country?.trim() || 'India', Boolean(is_primary), status || 'active'
    ]);

    res.status(201).json({ message: 'Address added successfully', address_id: addressId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add address' });
  }
});

// DELETE /api/suppliers/:id/addresses/:addressId
supplierRouter.delete('/suppliers/:id/addresses/:addressId', async (req: Request, res: Response) => {
  const { id, addressId } = req.params;
  try {
    await pool.query('DELETE FROM supplier_addresses WHERE id = $1 AND supplier_id = $2', [addressId, id]);
    res.json({ message: 'Address removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete address' });
  }
});

// ============================================================================
// 4. SUPPLIER SKUS (CANONICAL JYOTSVAN SKU LINKAGE)
// ============================================================================

// GET /api/suppliers/:id/skus
supplierRouter.get('/suppliers/:id/skus', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        ss.*,
        s.sku, s.variant_name, s.barcode, s.pack_size, s.pack_unit, s.cost_price as standard_cost_price,
        p.id as parent_product_id, p.name as product_name, p.product_code, p.brand, p.product_type
      FROM supplier_skus ss
      JOIN skus s ON ss.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      WHERE ss.supplier_id = $1 AND ss.status != 'archived'
      ORDER BY ss.preferred_supplier DESC, s.sku ASC
    `, [id]);

    res.json({ skus: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch supplier SKUs' });
  }
});

// POST /api/suppliers/:id/skus - Associate canonical Jyotsvan SKU
supplierRouter.post('/suppliers/:id/skus', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    sku_id, supplier_product_code, supplier_product_name, supplier_description,
    lead_time_days, minimum_order_quantity, preferred_supplier, status, notes,
    initial_price, price_unit, currency, effective_from, organization_id, actor_id, actor_email
  } = req.body;

  const orgId = organization_id || 'org-jyotsvan-corp';

  if (!sku_id) {
    return res.status(400).json({ error: 'Canonical SKU selection is required' });
  }

  try {
    // 1. Verify canonical SKU exists
    const skuCheck = await pool.query('SELECT product_id, sku, variant_name FROM skus WHERE id = $1 AND organization_id = $2', [sku_id, orgId]);
    if (skuCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Selected canonical SKU does not exist in product master' });
    }

    const productId = skuCheck.rows[0].product_id;

    // 2. Check for duplicate mapping
    const existing = await pool.query(
      'SELECT id FROM supplier_skus WHERE organization_id = $1 AND supplier_id = $2 AND sku_id = $3',
      [orgId, id, sku_id]
    );

    const supSkuId = existing.rows.length > 0
      ? existing.rows[0].id
      : 'sup-sku-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const moqVal = Math.max(0, parseFloat(minimum_order_quantity) || 1);
    const ltDays = lead_time_days !== undefined && lead_time_days !== null ? parseInt(lead_time_days, 10) : null;

    if (preferred_supplier) {
      // Unset preferred on other suppliers for this SKU if strict rule applies
      await pool.query(
        'UPDATE supplier_skus SET preferred_supplier = FALSE WHERE organization_id = $1 AND sku_id = $2',
        [orgId, sku_id]
      );
    }

    await pool.query(`
      INSERT INTO supplier_skus (
        id, organization_id, supplier_id, product_id, sku_id, supplier_product_code,
        supplier_product_name, supplier_description, lead_time_days, minimum_order_quantity,
        preferred_supplier, status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      ON CONFLICT (organization_id, supplier_id, sku_id) DO UPDATE SET
        supplier_product_code = EXCLUDED.supplier_product_code,
        supplier_product_name = EXCLUDED.supplier_product_name,
        supplier_description = EXCLUDED.supplier_description,
        lead_time_days = EXCLUDED.lead_time_days,
        minimum_order_quantity = EXCLUDED.minimum_order_quantity,
        preferred_supplier = EXCLUDED.preferred_supplier,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        updated_at = NOW();
    `, [
      supSkuId, orgId, id, productId, sku_id,
      supplier_product_code?.trim() || null, supplier_product_name?.trim() || null, supplier_description?.trim() || null,
      ltDays, moqVal, Boolean(preferred_supplier), status || 'active', notes?.trim() || null
    ]);

    // Optional: If initial price is provided, add price entry
    if (initial_price !== undefined && initial_price !== null && Number(initial_price) >= 0) {
      const priceId = 'prc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      await pool.query(`
        INSERT INTO supplier_prices (
          id, organization_id, supplier_id, sku_id, supplier_sku_id, price,
          currency, minimum_order_quantity, price_unit, effective_from, status, notes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, CURRENT_DATE), 'active', 'Initial contract price', NOW(), NOW())
      `, [
        priceId, orgId, id, sku_id, supSkuId, parseFloat(initial_price),
        currency || 'INR', moqVal, price_unit || 'unit', effective_from || null
      ]);
    }

    await recordAudit(orgId, actor_id || null, actor_email || 'admin@jyotsvan.enterprise', 'supplier_sku.linked', 'supplier_skus', supSkuId, {
      supplier_id: id,
      sku_id,
      supplier_product_code,
      preferred_supplier
    });

    res.status(201).json({ message: 'Canonical SKU mapped to supplier successfully', supplier_sku_id: supSkuId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to map SKU to supplier' });
  }
});

// PUT /api/suppliers/:id/skus/:supplierSkuId
supplierRouter.put('/suppliers/:id/skus/:supplierSkuId', async (req: Request, res: Response) => {
  const { id, supplierSkuId } = req.params;
  const {
    supplier_product_code, supplier_product_name, supplier_description,
    lead_time_days, minimum_order_quantity, preferred_supplier, status, notes,
    organization_id, actor_id, actor_email
  } = req.body;

  const orgId = organization_id || 'org-jyotsvan-corp';

  try {
    const existing = await pool.query('SELECT sku_id FROM supplier_skus WHERE id = $1 AND supplier_id = $2', [supplierSkuId, id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier SKU mapping not found' });
    }

    const skuId = existing.rows[0].sku_id;

    if (preferred_supplier) {
      await pool.query(
        'UPDATE supplier_skus SET preferred_supplier = FALSE WHERE organization_id = $1 AND sku_id = $2 AND id != $3',
        [orgId, skuId, supplierSkuId]
      );
    }

    await pool.query(`
      UPDATE supplier_skus SET
        supplier_product_code = $1,
        supplier_product_name = $2,
        supplier_description = $3,
        lead_time_days = $4,
        minimum_order_quantity = $5,
        preferred_supplier = $6,
        status = $7,
        notes = $8,
        updated_at = NOW()
      WHERE id = $9 AND supplier_id = $10
    `, [
      supplier_product_code?.trim() || null,
      supplier_product_name?.trim() || null,
      supplier_description?.trim() || null,
      lead_time_days !== undefined && lead_time_days !== null ? parseInt(lead_time_days, 10) : null,
      Math.max(0, parseFloat(minimum_order_quantity) || 1),
      Boolean(preferred_supplier),
      status || 'active',
      notes?.trim() || null,
      supplierSkuId,
      id
    ]);

    await recordAudit(orgId, actor_id || null, actor_email || 'admin@jyotsvan.enterprise', 'supplier_sku.updated', 'supplier_skus', supplierSkuId, {
      supplier_id: id,
      supplier_product_code,
      preferred_supplier
    });

    res.json({ message: 'Supplier SKU mapping updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update supplier SKU' });
  }
});

// DELETE /api/suppliers/:id/skus/:supplierSkuId
supplierRouter.delete('/suppliers/:id/skus/:supplierSkuId', async (req: Request, res: Response) => {
  const { id, supplierSkuId } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const actorId = (req.query.actorId as string) || null;
  const actorEmail = (req.query.actorEmail as string) || 'admin@jyotsvan.enterprise';

  try {
    await pool.query('DELETE FROM supplier_skus WHERE id = $1 AND supplier_id = $2', [supplierSkuId, id]);
    await recordAudit(orgId, actorId, actorEmail, 'supplier_sku.unlinked', 'supplier_skus', supplierSkuId, {
      supplier_id: id
    });
    res.json({ message: 'SKU unlinked from supplier successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete supplier SKU' });
  }
});

// ============================================================================
// 5. SUPPLIER PRICING
// ============================================================================

// GET /api/suppliers/:id/pricing
supplierRouter.get('/suppliers/:id/pricing', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        sp.*,
        s.sku, s.variant_name, p.name as product_name, ss.supplier_product_code
      FROM supplier_prices sp
      JOIN skus s ON sp.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN supplier_skus ss ON sp.supplier_sku_id = ss.id
      WHERE sp.supplier_id = $1
      ORDER BY sp.effective_from DESC, sp.created_at DESC
    `, [id]);

    res.json({ pricing: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch pricing' });
  }
});

// POST /api/suppliers/:id/pricing
supplierRouter.post('/suppliers/:id/pricing', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    sku_id, price, currency, minimum_order_quantity, price_unit,
    effective_from, effective_to, status, notes, organization_id, actor_id, actor_email
  } = req.body;

  const orgId = organization_id || 'org-jyotsvan-corp';

  if (!sku_id) {
    return res.status(400).json({ error: 'SKU selection is required' });
  }
  if (price === undefined || price === null || parseFloat(price) < 0) {
    return res.status(400).json({ error: 'Valid non-negative price is required' });
  }

  // Validate dates
  if (effective_to && effective_from && new Date(effective_to) < new Date(effective_from)) {
    return res.status(400).json({ error: 'Effective end date cannot precede effective start date' });
  }

  try {
    // Find supplier_sku_id
    const supSkuRes = await pool.query('SELECT id FROM supplier_skus WHERE supplier_id = $1 AND sku_id = $2', [id, sku_id]);
    const supplierSkuId = supSkuRes.rows[0]?.id || null;

    const priceId = 'prc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const moqVal = Math.max(0, parseFloat(minimum_order_quantity) || 1);

    // If adding a new active price with no end date, mark previous un-bounded active prices as expired yesterday
    if (status === 'active' && !effective_to) {
      await pool.query(`
        UPDATE supplier_prices 
        SET status = 'expired', effective_to = CURRENT_DATE - INTERVAL '1 day'
        WHERE supplier_id = $1 AND sku_id = $2 AND status = 'active' AND effective_to IS NULL
      `, [id, sku_id]);
    }

    await pool.query(`
      INSERT INTO supplier_prices (
        id, organization_id, supplier_id, sku_id, supplier_sku_id, price,
        currency, minimum_order_quantity, price_unit, effective_from, effective_to,
        status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, CURRENT_DATE), $11, $12, $13, NOW(), NOW())
    `, [
      priceId, orgId, id, sku_id, supplierSkuId, parseFloat(price),
      currency || 'INR', moqVal, price_unit || 'unit', effective_from || null, effective_to || null,
      status || 'active', notes?.trim() || null
    ]);

    await recordAudit(orgId, actor_id || null, actor_email || 'admin@jyotsvan.enterprise', 'supplier_pricing.created', 'supplier_prices', priceId, {
      supplier_id: id,
      sku_id,
      price: parseFloat(price),
      currency: currency || 'INR',
      effective_from
    });

    res.status(201).json({ message: 'Supplier price quote added successfully', price_id: priceId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add supplier price' });
  }
});

// DELETE /api/suppliers/:id/pricing/:priceId
supplierRouter.delete('/suppliers/:id/pricing/:priceId', async (req: Request, res: Response) => {
  const { id, priceId } = req.params;
  try {
    await pool.query('DELETE FROM supplier_prices WHERE id = $1 AND supplier_id = $2', [priceId, id]);
    res.json({ message: 'Pricing record removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete price' });
  }
});

// ============================================================================
// 6. SUPPLIER DOCUMENTS
// ============================================================================

// GET /api/suppliers/:id/documents
supplierRouter.get('/suppliers/:id/documents', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM supplier_documents WHERE supplier_id = $1 AND status != 'archived' ORDER BY created_at DESC`,
      [id]
    );
    res.json({ documents: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch documents' });
  }
});

// POST /api/suppliers/:id/documents
supplierRouter.post('/suppliers/:id/documents', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, document_type, file_name, file_size, mime_type, storage_path, public_url, valid_until, organization_id, actor_id, actor_email } = req.body;
  const orgId = organization_id || 'org-jyotsvan-corp';

  if (!title || !document_type || !file_name) {
    return res.status(400).json({ error: 'Document title, type, and file name are required' });
  }

  const docId = 'sup-doc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
  const stPath = storage_path || `suppliers/${id}/${file_name}`;
  const pubUrl = public_url || `https://docs.jyotsvan.enterprise/storage/suppliers/${id}/${file_name}`;

  try {
    await pool.query(`
      INSERT INTO supplier_documents (
        id, organization_id, supplier_id, title, document_type, file_name,
        file_size, mime_type, storage_path, public_url, valid_until, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW(), NOW())
    `, [
      docId, orgId, id, title.trim(), document_type, file_name,
      file_size ? parseInt(file_size, 10) : null, mime_type || 'application/pdf',
      stPath, pubUrl, valid_until || null
    ]);

    await recordAudit(orgId, actor_id || null, actor_email || 'admin@jyotsvan.enterprise', 'supplier_document.uploaded', 'supplier_documents', docId, {
      supplier_id: id,
      title,
      document_type,
      file_name
    });

    res.status(201).json({ message: 'Document attached successfully', document_id: docId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to attach document' });
  }
});

// DELETE /api/suppliers/:id/documents/:docId
supplierRouter.delete('/suppliers/:id/documents/:docId', async (req: Request, res: Response) => {
  const { id, docId } = req.params;
  try {
    await pool.query('DELETE FROM supplier_documents WHERE id = $1 AND supplier_id = $2', [docId, id]);
    res.json({ message: 'Document removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete document' });
  }
});

// ============================================================================
// 7. SUPPLIER PERFORMANCE FOUNDATION
// ============================================================================

// GET /api/suppliers/:id/performance
supplierRouter.get('/suppliers/:id/performance', async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.organizationId as string) || 'org-jyotsvan-corp';

  try {
    const supRes = await pool.query('SELECT supplier_name, rating_status, rating_notes, lead_time_days FROM suppliers WHERE id = $1 AND organization_id = $2', [id, orgId]);
    if (supRes.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const supplier = supRes.rows[0];

    // Clean foundational structure for future Procurement consumption
    res.json({
      supplier_id: id,
      supplier_name: supplier.supplier_name,
      rating_status: supplier.rating_status,
      rating_notes: supplier.rating_notes,
      expected_lead_time_days: supplier.lead_time_days,
      metrics: {
        total_purchase_orders: 0,
        total_spend_amount: 0,
        on_time_delivery_rate: null,
        quality_rejection_rate: null,
        average_fulfillment_days: null,
        compliance_score: 100,
        has_transaction_history: false,
        message: 'No historical procurement data available. Purchase orders and GRN metrics will calculate automatically once Phase 8/9 transactions begin.'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch performance summary' });
  }
});
