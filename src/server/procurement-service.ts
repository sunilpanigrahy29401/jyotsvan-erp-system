import { PoolClient } from 'pg';
import { pool } from './db.ts';
import {
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  ProcurementDocument,
  ProcurementSummary,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
  PurchaseOrderStatus,
  GoodsReceiptStatus,
} from '../types/procurement.ts';

// Helper to record audit logs
async function recordAudit(
  client: PoolClient | null,
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
    const db = client || pool;
    await db.query(
      `INSERT INTO audit_logs (id, organization_id, actor_id, actor_email, action, target_resource, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [auditId, organizationId, actorId, actorEmail || 'system@jyotsvan.enterprise', action, targetResource, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    console.warn('[Audit Log Error]', err);
  }
}

export class ProcurementService {
  // ==========================================
  // 1. PURCHASE REQUESTS
  // ==========================================

  /**
   * List Purchase Requests with multi-facet filters
   */
  static async getPurchaseRequests(params: {
    orgId: string;
    search?: string;
    status?: string;
    priority?: string;
    departmentId?: string;
    requestedBy?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ requests: PurchaseRequest[]; total: number; page: number; limit: number }> {
    const { orgId, search, status, priority, departmentId, requestedBy, fromDate, toDate, page = 1, limit = 50 } = params;

    let query = `
      SELECT 
        pr.id, pr.organization_id, pr.request_number, pr.requested_by, pr.requested_by_email,
        pr.department_id, pr.required_by_date, pr.priority, pr.purpose, pr.status,
        pr.total_estimated_amount::float as total_estimated_amount,
        pr.approved_by, pr.approved_by_email, pr.approved_at,
        pr.rejection_reason, pr.rejected_at, pr.notes, pr.created_at, pr.updated_at,
        d.name as department_name,
        COUNT(DISTINCT pri.id)::int as items_count,
        COUNT(DISTINCT po.id)::int as linked_pos_count
      FROM purchase_requests pr
      LEFT JOIN departments d ON pr.department_id = d.id
      LEFT JOIN purchase_request_items pri ON pr.id = pri.purchase_request_id
      LEFT JOIN purchase_orders po ON pr.id = po.purchase_request_id
      WHERE pr.organization_id = $1
    `;

    const values: any[] = [orgId];
    let idx = 2;

    if (status && status !== 'all') {
      query += ` AND pr.status = $${idx}`;
      values.push(status);
      idx++;
    }

    if (priority && priority !== 'all') {
      query += ` AND pr.priority = $${idx}`;
      values.push(priority);
      idx++;
    }

    if (departmentId) {
      query += ` AND pr.department_id = $${idx}`;
      values.push(departmentId);
      idx++;
    }

    if (requestedBy) {
      query += ` AND (pr.requested_by = $${idx} OR pr.requested_by_email ILIKE $${idx})`;
      values.push(requestedBy);
      idx++;
    }

    if (fromDate) {
      query += ` AND pr.created_at >= $${idx}`;
      values.push(fromDate);
      idx++;
    }

    if (toDate) {
      query += ` AND pr.created_at <= $${idx}`;
      values.push(toDate);
      idx++;
    }

    if (search && search.trim()) {
      query += ` AND (
        pr.request_number ILIKE $${idx} OR
        pr.purpose ILIKE $${idx} OR
        pr.requested_by_email ILIKE $${idx} OR
        d.name ILIKE $${idx}
      )`;
      values.push(`%${search.trim()}%`);
      idx++;
    }

    query += ` GROUP BY pr.id, d.name ORDER BY pr.created_at DESC`;

    // Count
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM (${query}) as cnt_tbl`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10) || 0;

    // Pagination
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, (page - 1) * limit);

    const dataRes = await pool.query(query, values);
    return {
      requests: dataRes.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * Get single Purchase Request with items & joined SKU metadata
   */
  static async getPurchaseRequestById(id: string, orgId: string): Promise<PurchaseRequest | null> {
    const prRes = await pool.query(
      `SELECT 
        pr.id, pr.organization_id, pr.request_number, pr.requested_by, pr.requested_by_email,
        pr.department_id, pr.required_by_date, pr.priority, pr.purpose, pr.status,
        pr.total_estimated_amount::float as total_estimated_amount,
        pr.approved_by, pr.approved_by_email, pr.approved_at,
        pr.rejection_reason, pr.rejected_at, pr.notes, pr.created_at, pr.updated_at,
        d.name as department_name
       FROM purchase_requests pr
       LEFT JOIN departments d ON pr.department_id = d.id
       WHERE pr.id = $1 AND pr.organization_id = $2`,
      [id, orgId]
    );

    if (prRes.rows.length === 0) return null;
    const pr = prRes.rows[0];

    const itemsRes = await pool.query(
      `SELECT 
        pri.id, pri.purchase_request_id, pri.sku_id,
        pri.quantity::float as quantity,
        pri.unit_id,
        pri.required_by_date,
        pri.estimated_unit_cost::float as estimated_unit_cost,
        pri.estimated_line_total::float as estimated_line_total,
        pri.converted_quantity::float as converted_quantity,
        pri.notes, pri.created_at, pri.updated_at,
        s.sku as sku_code, s.variant_name, s.barcode,
        p.name as product_name, p.code as product_code,
        u.name as unit_name, u.short_code as unit_short_code
       FROM purchase_request_items pri
       JOIN skus s ON pri.sku_id = s.id
       JOIN products p ON s.product_id = p.id
       LEFT JOIN units u ON pri.unit_id = u.id
       WHERE pri.purchase_request_id = $1
       ORDER BY pri.created_at ASC`,
      [id]
    );

    pr.items = itemsRes.rows;
    return pr;
  }

  /**
   * Create Purchase Request
   */
  static async createPurchaseRequest(input: {
    orgId: string;
    departmentId?: string | null;
    requiredByDate: string;
    priority?: PurchaseRequestPriority;
    purpose?: string;
    notes?: string;
    items: Array<{
      skuId: string;
      quantity: number;
      unitId?: string | null;
      requiredByDate?: string | null;
      estimatedUnitCost?: number;
      notes?: string;
    }>;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<PurchaseRequest> {
    const { orgId, departmentId = null, requiredByDate, priority = 'normal', purpose, notes, items, actorId = null, actorEmail } = input;

    if (!items || items.length === 0) {
      throw new Error('At least one item line is required for a purchase request.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Validate all SKUs belong to the organization
      for (const item of items) {
        if (item.quantity <= 0) {
          throw new Error('Item quantity must be strictly greater than 0.');
        }
        const skuCheck = await client.query(
          `SELECT id, unit_id, cost_price FROM skus WHERE id = $1 AND organization_id = $2`,
          [item.skuId, orgId]
        );
        if (skuCheck.rows.length === 0) {
          throw new Error(`SKU with ID "${item.skuId}" does not belong to organization.`);
        }
        if (!item.unitId && skuCheck.rows[0].unit_id) {
          item.unitId = skuCheck.rows[0].unit_id;
        }
        if (item.estimatedUnitCost === undefined && skuCheck.rows[0].cost_price) {
          item.estimatedUnitCost = parseFloat(skuCheck.rows[0].cost_price) || 0;
        }
      }

      // 2. Generate unique sequential Request Number: PR-YYYY-XXXX
      const year = new Date().getFullYear();
      const countRes = await client.query(
        `SELECT COUNT(*) as count FROM purchase_requests WHERE organization_id = $1 AND request_number LIKE $2`,
        [orgId, `PR-${year}-%`]
      );
      const seq = parseInt(countRes.rows[0].count, 10) + 1;
      const requestNumber = `PR-${year}-${seq.toString().padStart(4, '0')}`;
      const prId = 'pr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

      // Calculate total estimated amount
      let totalEst = 0;
      items.forEach((item) => {
        const lineTotal = (item.quantity || 0) * (item.estimatedUnitCost || 0);
        totalEst += lineTotal;
      });

      // Insert Request Header
      await client.query(
        `INSERT INTO purchase_requests (
          id, organization_id, request_number, requested_by, requested_by_email,
          department_id, required_by_date, priority, purpose, status,
          total_estimated_amount, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, $11, NOW(), NOW())`,
        [
          prId,
          orgId,
          requestNumber,
          actorId,
          actorEmail,
          departmentId || null,
          requiredByDate,
          priority,
          purpose || null,
          totalEst,
          notes || null,
        ]
      );

      // Insert Items
      for (const item of items) {
        const itemId = 'pri-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
        const lineTotal = (item.quantity || 0) * (item.estimatedUnitCost || 0);
        await client.query(
          `INSERT INTO purchase_request_items (
            id, purchase_request_id, sku_id, quantity, unit_id,
            required_by_date, estimated_unit_cost, estimated_line_total, converted_quantity, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, NOW(), NOW())`,
          [
            itemId,
            prId,
            item.skuId,
            item.quantity,
            item.unitId || null,
            item.requiredByDate || requiredByDate,
            item.estimatedUnitCost || 0,
            lineTotal,
            item.notes || null,
          ]
        );
      }

      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_request.create', 'purchase_requests', prId, {
        request_number: requestNumber,
        items_count: items.length,
        total_estimated_amount: totalEst,
      });

      await client.query('COMMIT;');

      const created = await this.getPurchaseRequestById(prId, orgId);
      return created!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Submit Purchase Request for Review/Approval
   */
  static async submitPurchaseRequest(id: string, orgId: string, actorId: string | null, actorEmail: string): Promise<PurchaseRequest> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(
        `SELECT * FROM purchase_requests WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [id, orgId]
      );
      if (check.rows.length === 0) throw new Error('Purchase Request not found.');
      const pr = check.rows[0];

      if (pr.status !== 'draft' && pr.status !== 'rejected') {
        throw new Error(`Cannot submit Purchase Request in "${pr.status}" status. Only draft or returned requests can be submitted.`);
      }

      await client.query(
        `UPDATE purchase_requests 
         SET status = 'submitted', updated_at = NOW() 
         WHERE id = $1`,
        [id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_request.submit', 'purchase_requests', id, {
        request_number: pr.request_number,
        previous_status: pr.status,
      });

      await client.query('COMMIT;');
      return (await this.getPurchaseRequestById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Approve Purchase Request
   */
  static async approvePurchaseRequest(
    id: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string,
    notes?: string
  ): Promise<PurchaseRequest> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(
        `SELECT * FROM purchase_requests WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [id, orgId]
      );
      if (check.rows.length === 0) throw new Error('Purchase Request not found.');
      const pr = check.rows[0];

      if (pr.status !== 'submitted' && pr.status !== 'under_review') {
        throw new Error(`Cannot approve Purchase Request in "${pr.status}" status.`);
      }

      await client.query(
        `UPDATE purchase_requests 
         SET status = 'approved',
             approved_by = $1,
             approved_by_email = $2,
             approved_at = NOW(),
             notes = COALESCE($3, notes),
             updated_at = NOW()
         WHERE id = $4`,
        [actorId, actorEmail, notes || null, id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_request.approve', 'purchase_requests', id, {
        request_number: pr.request_number,
        approved_by: actorEmail,
      });

      await client.query('COMMIT;');
      return (await this.getPurchaseRequestById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Reject Purchase Request
   */
  static async rejectPurchaseRequest(
    id: string,
    orgId: string,
    rejectionReason: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<PurchaseRequest> {
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new Error('A valid rejection reason is strictly required.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(
        `SELECT * FROM purchase_requests WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [id, orgId]
      );
      if (check.rows.length === 0) throw new Error('Purchase Request not found.');
      const pr = check.rows[0];

      if (pr.status !== 'submitted' && pr.status !== 'under_review') {
        throw new Error(`Cannot reject Purchase Request in "${pr.status}" status.`);
      }

      await client.query(
        `UPDATE purchase_requests 
         SET status = 'rejected',
             rejection_reason = $1,
             rejected_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [rejectionReason.trim(), id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_request.reject', 'purchase_requests', id, {
        request_number: pr.request_number,
        reason: rejectionReason,
      });

      await client.query('COMMIT;');
      return (await this.getPurchaseRequestById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel Purchase Request
   */
  static async cancelPurchaseRequest(
    id: string,
    orgId: string,
    reason: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<PurchaseRequest> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(
        `SELECT * FROM purchase_requests WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [id, orgId]
      );
      if (check.rows.length === 0) throw new Error('Purchase Request not found.');
      const pr = check.rows[0];

      if (pr.status === 'converted_to_po' || pr.status === 'completed') {
        throw new Error(`Cannot cancel Purchase Request already converted to Purchase Orders.`);
      }

      await client.query(
        `UPDATE purchase_requests 
         SET status = 'cancelled',
             notes = CONCAT(COALESCE(notes, ''), ' [Cancelled: ', $1::text, ']'),
             updated_at = NOW()
         WHERE id = $2`,
        [reason || 'User cancelled', id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_request.cancel', 'purchase_requests', id, {
        request_number: pr.request_number,
        reason,
      });

      await client.query('COMMIT;');
      return (await this.getPurchaseRequestById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 2. PURCHASE ORDERS
  // ==========================================

  /**
   * List Purchase Orders with multi-facet filters
   */
  static async getPurchaseOrders(params: {
    orgId: string;
    search?: string;
    status?: string;
    supplierId?: string;
    warehouseId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: PurchaseOrder[]; total: number; page: number; limit: number }> {
    const { orgId, search, status, supplierId, warehouseId, fromDate, toDate, page = 1, limit = 50 } = params;

    let query = `
      SELECT 
        po.id, po.organization_id, po.po_number, po.supplier_id, po.purchase_request_id,
        po.order_date, po.expected_delivery_date, po.currency, po.payment_terms,
        po.shipping_address, po.warehouse_id, po.status,
        po.subtotal::float as subtotal,
        po.tax_amount::float as tax_amount,
        po.discount_amount::float as discount_amount,
        po.shipping_amount::float as shipping_amount,
        po.total_amount::float as total_amount,
        po.notes, po.terms_and_conditions, po.revision_number,
        po.created_by, po.created_by_email, po.approved_by, po.approved_by_email, po.approved_at,
        po.sent_at, po.acknowledged_at, po.closed_at, po.cancelled_at, po.cancellation_reason,
        po.created_at, po.updated_at,
        s.supplier_name as supplier_name, s.supplier_code, s.primary_email as supplier_email, s.primary_phone as supplier_phone,
        w.name as warehouse_name, w.code as warehouse_code,
        pr.request_number as purchase_request_number,
        COUNT(DISTINCT poi.id)::int as items_count,
        COALESCE(SUM(poi.quantity), 0)::float as total_ordered_qty,
        COALESCE(SUM(poi.received_quantity), 0)::float as total_received_qty
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      JOIN warehouses w ON po.warehouse_id = w.id
      LEFT JOIN purchase_requests pr ON po.purchase_request_id = pr.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      WHERE po.organization_id = $1
    `;

    const values: any[] = [orgId];
    let idx = 2;

    if (status && status !== 'all') {
      query += ` AND po.status = $${idx}`;
      values.push(status);
      idx++;
    }

    if (supplierId) {
      query += ` AND po.supplier_id = $${idx}`;
      values.push(supplierId);
      idx++;
    }

    if (warehouseId) {
      query += ` AND po.warehouse_id = $${idx}`;
      values.push(warehouseId);
      idx++;
    }

    if (fromDate) {
      query += ` AND po.order_date >= $${idx}`;
      values.push(fromDate);
      idx++;
    }

    if (toDate) {
      query += ` AND po.order_date <= $${idx}`;
      values.push(toDate);
      idx++;
    }

    if (search && search.trim()) {
      query += ` AND (
        po.po_number ILIKE $${idx} OR
        s.supplier_name ILIKE $${idx} OR
        s.supplier_code ILIKE $${idx} OR
        w.name ILIKE $${idx}
      )`;
      values.push(`%${search.trim()}%`);
      idx++;
    }

    query += ` GROUP BY po.id, s.supplier_name, s.supplier_code, s.primary_email, s.primary_phone, w.name, w.code, pr.request_number ORDER BY po.created_at DESC`;

    // Count total rows
    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) as count_tbl`, values);
    const total = parseInt(countRes.rows[0].count, 10) || 0;

    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, (page - 1) * limit);

    const dataRes = await pool.query(query, values);
    return {
      orders: dataRes.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * Get single Purchase Order with items, snapshot prices & linked GRNs
   */
  static async getPurchaseOrderById(id: string, orgId: string): Promise<PurchaseOrder | null> {
    const poRes = await pool.query(
      `SELECT 
        po.id, po.organization_id, po.po_number, po.supplier_id, po.purchase_request_id,
        po.order_date, po.expected_delivery_date, po.currency, po.payment_terms,
        po.shipping_address, po.warehouse_id, po.status,
        po.subtotal::float as subtotal,
        po.tax_amount::float as tax_amount,
        po.discount_amount::float as discount_amount,
        po.shipping_amount::float as shipping_amount,
        po.total_amount::float as total_amount,
        po.notes, po.terms_and_conditions, po.revision_number,
        po.created_by, po.created_by_email, po.approved_by, po.approved_by_email, po.approved_at,
        po.sent_at, po.acknowledged_at, po.closed_at, po.cancelled_at, po.cancellation_reason,
        po.created_at, po.updated_at,
        s.supplier_name as supplier_name, s.supplier_code, s.primary_email as supplier_email, s.primary_phone as supplier_phone,
        w.name as warehouse_name, w.code as warehouse_code,
        pr.request_number as purchase_request_number
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       JOIN warehouses w ON po.warehouse_id = w.id
       LEFT JOIN purchase_requests pr ON po.purchase_request_id = pr.id
       WHERE po.id = $1 AND po.organization_id = $2`,
      [id, orgId]
    );

    if (poRes.rows.length === 0) return null;
    const po = poRes.rows[0];

    const itemsRes = await pool.query(
      `SELECT 
        poi.id, poi.purchase_order_id, poi.sku_id, poi.supplier_sku_id, poi.description,
        poi.quantity::float as quantity,
        poi.unit_id,
        poi.unit_price::float as unit_price,
        poi.discount_percent::float as discount_percent,
        poi.discount_amount::float as discount_amount,
        poi.tax_rate::float as tax_rate,
        poi.tax_amount::float as tax_amount,
        poi.line_total::float as line_total,
        poi.expected_delivery_date,
        poi.received_quantity::float as received_quantity,
        poi.cancelled_quantity::float as cancelled_quantity,
        poi.notes, poi.created_at, poi.updated_at,
        s.sku as sku_code, s.variant_name, s.barcode,
        p.name as product_name, p.code as product_code,
        u.name as unit_name, u.short_code as unit_short_code,
        ss.supplier_product_code
       FROM purchase_order_items poi
       JOIN skus s ON poi.sku_id = s.id
       JOIN products p ON s.product_id = p.id
       LEFT JOIN units u ON poi.unit_id = u.id
       LEFT JOIN supplier_skus ss ON poi.supplier_sku_id = ss.id
       WHERE poi.purchase_order_id = $1
       ORDER BY poi.created_at ASC`,
      [id]
    );

    po.items = itemsRes.rows;
    return po;
  }

  /**
   * Create Purchase Order with Price Snapshot & Partial PR conversion
   */
  static async createPurchaseOrder(input: {
    orgId: string;
    supplierId: string;
    purchaseRequestId?: string | null;
    orderDate?: string;
    expectedDeliveryDate: string;
    currency?: string;
    paymentTerms?: string;
    shippingAddress?: string;
    warehouseId: string;
    shippingAmount?: number;
    notes?: string;
    termsAndConditions?: string;
    items: Array<{
      skuId: string;
      supplierSkuId?: string | null;
      description?: string;
      quantity: number;
      unitId?: string | null;
      unitPrice: number; // Agreed commercial price snapshot
      discountPercent?: number;
      taxRate?: number;
      expectedDeliveryDate?: string | null;
      notes?: string;
    }>;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<PurchaseOrder> {
    const {
      orgId,
      supplierId,
      purchaseRequestId = null,
      orderDate,
      expectedDeliveryDate,
      currency = 'INR',
      paymentTerms = 'net_30',
      shippingAddress,
      warehouseId,
      shippingAmount = 0,
      notes,
      termsAndConditions,
      items,
      actorId = null,
      actorEmail,
    } = input;

    if (!items || items.length === 0) {
      throw new Error('At least one line item is required to create a purchase order.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Verify supplier belongs to organization
      const supCheck = await client.query(`SELECT id, supplier_name as name FROM suppliers WHERE id = $1 AND organization_id = $2`, [supplierId, orgId]);
      if (supCheck.rows.length === 0) {
        throw new Error('Supplier not found or does not belong to organization.');
      }

      // 2. Verify warehouse belongs to organization
      const whCheck = await client.query(`SELECT id, name, address FROM warehouses WHERE id = $1 AND organization_id = $2`, [warehouseId, orgId]);
      if (whCheck.rows.length === 0) {
        throw new Error('Warehouse not found or does not belong to organization.');
      }

      // 3. Generate sequential PO number: PO-YYYY-XXXXXX
      const year = new Date().getFullYear();
      const countRes = await client.query(
        `SELECT COUNT(*) as count FROM purchase_orders WHERE organization_id = $1 AND po_number LIKE $2`,
        [orgId, `PO-${year}-%`]
      );
      const seq = parseInt(countRes.rows[0].count, 10) + 1;
      const poNumber = `PO-${year}-${seq.toString().padStart(6, '0')}`;
      const poId = 'po-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

      // 4. Calculate line amounts with precise decimal math
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      const processedItems: any[] = [];
      for (const item of items) {
        if (item.quantity <= 0) {
          throw new Error('PO item quantity must be strictly greater than 0.');
        }
        if (item.unitPrice < 0) {
          throw new Error('PO unit price cannot be negative.');
        }

        // Validate SKU
        const skuInfo = await client.query(
          `SELECT s.id, s.sku, s.unit_id, p.name as product_name, p.tax_rate FROM skus s JOIN products p ON s.product_id = p.id WHERE s.id = $1 AND s.organization_id = $2`,
          [item.skuId, orgId]
        );
        if (skuInfo.rows.length === 0) {
          throw new Error(`SKU "${item.skuId}" does not belong to organization.`);
        }
        const sku = skuInfo.rows[0];

        const rawPrice = item.unitPrice;
        const qty = item.quantity;
        const lineBase = qty * rawPrice;
        const discPct = item.discountPercent || 0;
        const discAmt = Math.round((lineBase * (discPct / 100)) * 100) / 100;
        const taxableAmt = lineBase - discAmt;
        const taxRate = item.taxRate !== undefined ? item.taxRate : (parseFloat(sku.tax_rate) || 18);
        const taxAmt = Math.round((taxableAmt * (taxRate / 100)) * 100) / 100;
        const lineTotal = taxableAmt + taxAmt;

        subtotal += lineBase;
        totalDiscount += discAmt;
        totalTax += taxAmt;

        processedItems.push({
          id: 'poi-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
          skuId: item.skuId,
          supplierSkuId: item.supplierSkuId || null,
          description: item.description || `${sku.product_name} (${sku.sku})`,
          quantity: qty,
          unitId: item.unitId || sku.unit_id || null,
          unitPrice: rawPrice,
          discountPercent: discPct,
          discountAmount: discAmt,
          taxRate,
          taxAmount: taxAmt,
          lineTotal,
          expectedDeliveryDate: item.expectedDeliveryDate || expectedDeliveryDate,
          notes: item.notes || null,
        });
      }

      const netSubtotal = subtotal - totalDiscount;
      const totalAmount = netSubtotal + totalTax + (shippingAmount || 0);

      // Insert Purchase Order Header
      await client.query(
        `INSERT INTO purchase_orders (
          id, organization_id, po_number, supplier_id, purchase_request_id,
          order_date, expected_delivery_date, currency, payment_terms, shipping_address,
          warehouse_id, status, subtotal, tax_amount, discount_amount, shipping_amount, total_amount,
          notes, terms_and_conditions, revision_number, created_by, created_by_email, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          COALESCE($6, NOW()), $7, $8, $9, $10,
          $11, 'draft', $12, $13, $14, $15, $16,
          $17, $18, 1, $19, $20, NOW(), NOW()
        )`,
        [
          poId,
          orgId,
          poNumber,
          supplierId,
          purchaseRequestId || null,
          orderDate || null,
          expectedDeliveryDate,
          currency,
          paymentTerms,
          shippingAddress || whCheck.rows[0].address || 'Central Delivery Bay',
          warehouseId,
          netSubtotal,
          totalTax,
          totalDiscount,
          shippingAmount || 0,
          totalAmount,
          notes || null,
          termsAndConditions || 'Standard Jyotsvan Procurement terms apply.',
          actorId,
          actorEmail,
        ]
      );

      // Insert Items
      for (const pi of processedItems) {
        await client.query(
          `INSERT INTO purchase_order_items (
            id, purchase_order_id, sku_id, supplier_sku_id, description,
            quantity, unit_id, unit_price, discount_percent, discount_amount,
            tax_rate, tax_amount, line_total, expected_delivery_date,
            received_quantity, cancelled_quantity, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, 0, $15, NOW(), NOW())`,
          [
            pi.id,
            poId,
            pi.skuId,
            pi.supplierSkuId,
            pi.description,
            pi.quantity,
            pi.unitId,
            pi.unitPrice,
            pi.discountPercent,
            pi.discountAmount,
            pi.taxRate,
            pi.taxAmount,
            pi.lineTotal,
            pi.expectedDeliveryDate,
            pi.notes,
          ]
        );
      }

      // 5. If created from a Purchase Request, update converted quantities on PR items & update PR status
      if (purchaseRequestId) {
        const prItems = await client.query(
          `SELECT id, sku_id, quantity, converted_quantity FROM purchase_request_items WHERE purchase_request_id = $1 FOR UPDATE`,
          [purchaseRequestId]
        );

        let allFullyConverted = true;
        for (const pri of prItems.rows) {
          const matchingPoItem = processedItems.find((p) => p.skuId === pri.sku_id);
          const addedQty = matchingPoItem ? matchingPoItem.quantity : 0;
          const newConverted = parseFloat(pri.converted_quantity) + addedQty;
          const totalQty = parseFloat(pri.quantity);

          if (matchingPoItem) {
            await client.query(
              `UPDATE purchase_request_items SET converted_quantity = $1, updated_at = NOW() WHERE id = $2`,
              [newConverted, pri.id]
            );
          }

          if (newConverted < totalQty) {
            allFullyConverted = false;
          }
        }

        const newPrStatus = allFullyConverted ? 'converted_to_po' : 'partially_converted';
        await client.query(
          `UPDATE purchase_requests SET status = $1, updated_at = NOW() WHERE id = $2`,
          [newPrStatus, purchaseRequestId]
        );
      }

      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_order.create', 'purchase_orders', poId, {
        po_number: poNumber,
        supplier_id: supplierId,
        warehouse_id: warehouseId,
        total_amount: totalAmount,
        items_count: processedItems.length,
      });

      await client.query('COMMIT;');

      const createdPo = await this.getPurchaseOrderById(poId, orgId);
      return createdPo!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Submit Purchase Order for approval
   */
  static async submitPurchaseOrderForApproval(id: string, orgId: string, actorId: string | null, actorEmail: string): Promise<PurchaseOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(`SELECT * FROM purchase_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`, [id, orgId]);
      if (check.rows.length === 0) throw new Error('Purchase Order not found.');
      const po = check.rows[0];

      if (po.status !== 'draft') {
        throw new Error(`Cannot submit PO in "${po.status}" status.`);
      }

      await client.query(`UPDATE purchase_orders SET status = 'pending_approval', updated_at = NOW() WHERE id = $1`, [id]);
      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_order.submit_approval', 'purchase_orders', id, { po_number: po.po_number });

      await client.query('COMMIT;');
      return (await this.getPurchaseOrderById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Approve Purchase Order
   */
  static async approvePurchaseOrder(id: string, orgId: string, actorId: string | null, actorEmail: string): Promise<PurchaseOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(`SELECT * FROM purchase_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`, [id, orgId]);
      if (check.rows.length === 0) throw new Error('Purchase Order not found.');
      const po = check.rows[0];

      if (po.status !== 'draft' && po.status !== 'pending_approval') {
        throw new Error(`Cannot approve PO in "${po.status}" status.`);
      }

      await client.query(
        `UPDATE purchase_orders 
         SET status = 'approved',
             approved_by = $1,
             approved_by_email = $2,
             approved_at = NOW(),
             updated_at = NOW() 
         WHERE id = $3`,
        [actorId, actorEmail, id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_order.approve', 'purchase_orders', id, {
        po_number: po.po_number,
        approved_by: actorEmail,
      });

      await client.query('COMMIT;');
      return (await this.getPurchaseOrderById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Dispatch / Send Purchase Order to Vendor
   */
  static async sendPurchaseOrder(id: string, orgId: string, actorId: string | null, actorEmail: string): Promise<PurchaseOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(`SELECT * FROM purchase_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`, [id, orgId]);
      if (check.rows.length === 0) throw new Error('Purchase Order not found.');
      const po = check.rows[0];

      if (po.status !== 'approved') {
        throw new Error(`Only approved Purchase Orders can be sent to suppliers. Current status is "${po.status}".`);
      }

      await client.query(
        `UPDATE purchase_orders 
         SET status = 'sent',
             sent_at = NOW(),
             updated_at = NOW() 
         WHERE id = $1`,
        [id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_order.send', 'purchase_orders', id, { po_number: po.po_number });
      await client.query('COMMIT;');
      return (await this.getPurchaseOrderById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Acknowledge Purchase Order by Supplier
   */
  static async acknowledgePurchaseOrder(id: string, orgId: string, actorId: string | null, actorEmail: string): Promise<PurchaseOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(`SELECT * FROM purchase_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`, [id, orgId]);
      if (check.rows.length === 0) throw new Error('Purchase Order not found.');
      const po = check.rows[0];

      if (po.status !== 'sent') {
        throw new Error(`Cannot acknowledge PO with status "${po.status}".`);
      }

      await client.query(
        `UPDATE purchase_orders 
         SET status = 'acknowledged',
             acknowledged_at = NOW(),
             updated_at = NOW() 
         WHERE id = $1`,
        [id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_order.acknowledge', 'purchase_orders', id, { po_number: po.po_number });
      await client.query('COMMIT;');
      return (await this.getPurchaseOrderById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel Purchase Order
   */
  static async cancelPurchaseOrder(
    id: string,
    orgId: string,
    reason: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<PurchaseOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(`SELECT * FROM purchase_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`, [id, orgId]);
      if (check.rows.length === 0) throw new Error('Purchase Order not found.');
      const po = check.rows[0];

      if (po.status === 'fully_received' || po.status === 'closed') {
        throw new Error(`Cannot cancel Purchase Order with status "${po.status}".`);
      }

      // Check if any goods were received
      const recCheck = await client.query(
        `SELECT SUM(received_quantity) as total_rec FROM purchase_order_items WHERE purchase_order_id = $1`,
        [id]
      );
      const totalRec = parseFloat(recCheck.rows[0]?.total_rec || '0');
      if (totalRec > 0) {
        throw new Error(`Cannot cancel Purchase Order with active received goods (${totalRec} units received). Close remaining items instead.`);
      }

      await client.query(
        `UPDATE purchase_orders 
         SET status = 'cancelled',
             cancelled_at = NOW(),
             cancellation_reason = $1,
             updated_at = NOW() 
         WHERE id = $2`,
        [reason || 'Cancelled by user', id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_order.cancel', 'purchase_orders', id, {
        po_number: po.po_number,
        reason,
      });

      await client.query('COMMIT;');
      return (await this.getPurchaseOrderById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Formally Close Purchase Order
   */
  static async closePurchaseOrder(
    id: string,
    orgId: string,
    reason: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<PurchaseOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const check = await client.query(`SELECT * FROM purchase_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`, [id, orgId]);
      if (check.rows.length === 0) throw new Error('Purchase Order not found.');
      const po = check.rows[0];

      await client.query(
        `UPDATE purchase_orders 
         SET status = 'closed',
             closed_at = NOW(),
             notes = CONCAT(COALESCE(notes, ''), ' [Closed: ', $1::text, ']'),
             updated_at = NOW() 
         WHERE id = $2`,
        [reason || 'Completed', id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'purchase_order.close', 'purchase_orders', id, {
        po_number: po.po_number,
        reason,
      });

      await client.query('COMMIT;');
      return (await this.getPurchaseOrderById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 3. GOODS RECEIPT NOTES (GRN) & INVENTORY HANDOFF
  // ==========================================

  /**
   * List Goods Receipts with multi-facet filters
   */
  static async getGoodsReceipts(params: {
    orgId: string;
    search?: string;
    status?: string;
    qcStatus?: string;
    supplierId?: string;
    warehouseId?: string;
    purchaseOrderId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ receipts: GoodsReceipt[]; total: number; page: number; limit: number }> {
    const { orgId, search, status, qcStatus, supplierId, warehouseId, purchaseOrderId, page = 1, limit = 50 } = params;

    let query = `
      SELECT 
        grn.id, grn.organization_id, grn.grn_number, grn.purchase_order_id, grn.supplier_id,
        grn.warehouse_id, grn.receiving_location_id, grn.received_date, grn.received_by, grn.received_by_email,
        grn.status, grn.supplier_reference, grn.delivery_challan_number, grn.vehicle_number,
        grn.driver_name, grn.driver_phone, grn.qc_status, grn.inventory_posted, grn.inventory_posted_at,
        grn.notes, grn.created_at, grn.updated_at,
        po.po_number as purchase_order_number,
        s.supplier_name as supplier_name, s.supplier_code,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as receiving_location_name, loc.code as receiving_location_code,
        COUNT(DISTINCT grni.id)::int as items_count,
        COALESCE(SUM(grni.received_quantity), 0)::float as total_received_qty
      FROM goods_receipts grn
      JOIN purchase_orders po ON grn.purchase_order_id = po.id
      JOIN suppliers s ON grn.supplier_id = s.id
      JOIN warehouses w ON grn.warehouse_id = w.id
      LEFT JOIN warehouse_locations loc ON grn.receiving_location_id = loc.id
      LEFT JOIN goods_receipt_items grni ON grn.id = grni.grn_id
      WHERE grn.organization_id = $1
    `;

    const values: any[] = [orgId];
    let idx = 2;

    if (status && status !== 'all') {
      query += ` AND grn.status = $${idx}`;
      values.push(status);
      idx++;
    }

    if (qcStatus && qcStatus !== 'all') {
      query += ` AND grn.qc_status = $${idx}`;
      values.push(qcStatus);
      idx++;
    }

    if (supplierId) {
      query += ` AND grn.supplier_id = $${idx}`;
      values.push(supplierId);
      idx++;
    }

    if (warehouseId) {
      query += ` AND grn.warehouse_id = $${idx}`;
      values.push(warehouseId);
      idx++;
    }

    if (purchaseOrderId) {
      query += ` AND grn.purchase_order_id = $${idx}`;
      values.push(purchaseOrderId);
      idx++;
    }

    if (search && search.trim()) {
      query += ` AND (
        grn.grn_number ILIKE $${idx} OR
        po.po_number ILIKE $${idx} OR
        s.supplier_name ILIKE $${idx} OR
        grn.supplier_reference ILIKE $${idx} OR
        grn.delivery_challan_number ILIKE $${idx}
      )`;
      values.push(`%${search.trim()}%`);
      idx++;
    }

    query += ` GROUP BY grn.id, po.po_number, s.supplier_name, s.supplier_code, w.name, w.code, loc.name, loc.code ORDER BY grn.created_at DESC`;

    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) as count_tbl`, values);
    const total = parseInt(countRes.rows[0].count, 10) || 0;

    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, (page - 1) * limit);

    const dataRes = await pool.query(query, values);
    return {
      receipts: dataRes.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * Get single Goods Receipt with items & joined SKU details
   */
  static async getGoodsReceiptById(id: string, orgId: string): Promise<GoodsReceipt | null> {
    const grnRes = await pool.query(
      `SELECT 
        grn.id, grn.organization_id, grn.grn_number, grn.purchase_order_id, grn.supplier_id,
        grn.warehouse_id, grn.receiving_location_id, grn.received_date, grn.received_by, grn.received_by_email,
        grn.status, grn.supplier_reference, grn.delivery_challan_number, grn.vehicle_number,
        grn.driver_name, grn.driver_phone, grn.qc_status, grn.inventory_posted, grn.inventory_posted_at,
        grn.notes, grn.created_at, grn.updated_at,
        po.po_number as purchase_order_number,
        s.supplier_name as supplier_name, s.supplier_code,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as receiving_location_name, loc.code as receiving_location_code
       FROM goods_receipts grn
       JOIN purchase_orders po ON grn.purchase_order_id = po.id
       JOIN suppliers s ON grn.supplier_id = s.id
       JOIN warehouses w ON grn.warehouse_id = w.id
       LEFT JOIN warehouse_locations loc ON grn.receiving_location_id = loc.id
       WHERE grn.id = $1 AND grn.organization_id = $2`,
      [id, orgId]
    );

    if (grnRes.rows.length === 0) return null;
    const grn = grnRes.rows[0];

    const itemsRes = await pool.query(
      `SELECT 
        grni.id, grni.grn_id, grni.purchase_order_item_id, grni.sku_id,
        grni.ordered_quantity::float as ordered_quantity,
        grni.received_quantity::float as received_quantity,
        grni.accepted_quantity::float as accepted_quantity,
        grni.rejected_quantity::float as rejected_quantity,
        grni.quarantine_quantity::float as quarantine_quantity,
        grni.unit_id, grni.batch_number, grni.manufacturing_date, grni.expiry_date,
        grni.requires_qc, grni.qc_status, grni.notes, grni.created_at,
        s.sku as sku_code, s.variant_name,
        p.name as product_name,
        u.name as unit_name, u.short_code as unit_short_code
       FROM goods_receipt_items grni
       JOIN skus s ON grni.sku_id = s.id
       JOIN products p ON s.product_id = p.id
       LEFT JOIN units u ON grni.unit_id = u.id
       WHERE grni.grn_id = $1
       ORDER BY grni.created_at ASC`,
      [id]
    );

    grn.items = itemsRes.rows;
    return grn;
  }

  /**
   * Create & Post Goods Receipt Note (GRN)
   *
   * ATOMIC TRANSACTION SAFETY & CONCURRENCY CONTROL:
   * 1. Acquires row lock (FOR UPDATE) on purchase_order and purchase_order_items.
   * 2. Checks remaining receivable quantity per item: (quantity - received_quantity - cancelled_quantity).
   * 3. Prevents over-receiving (strictly rejects if received_quantity > remaining).
   * 4. Updates PO item received_quantity and determines overall PO status (partially_received vs fully_received).
   * 5. Performs idempotent Inventory Engine posting with reference_type = 'goods_receipt' and reference_id = GRN number.
   * 6. If item requires QC, posts to quarantine stock pool; otherwise posts to available stock pool.
   * 7. Creates immutable inventory_movements records.
   * 8. Records comprehensive audit log.
   */
  static async createGoodsReceipt(input: {
    orgId: string;
    purchaseOrderId: string;
    warehouseId?: string;
    receivingLocationId?: string | null;
    receivedDate?: string;
    supplierReference?: string;
    deliveryChallanNumber?: string;
    vehicleNumber?: string;
    driverName?: string;
    driverPhone?: string;
    notes?: string;
    items: Array<{
      purchaseOrderItemId: string;
      skuId: string;
      receivedQuantity: number;
      unitId?: string | null;
      batchNumber?: string | null;
      manufacturingDate?: string | null;
      expiryDate?: string | null;
      requiresQc?: boolean;
      notes?: string;
    }>;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<GoodsReceipt> {
    const {
      orgId,
      purchaseOrderId,
      warehouseId,
      receivingLocationId = null,
      receivedDate,
      supplierReference,
      deliveryChallanNumber,
      vehicleNumber,
      driverName,
      driverPhone,
      notes,
      items,
      actorId = null,
      actorEmail,
    } = input;

    if (!items || items.length === 0) {
      throw new Error('At least one item must be received in a Goods Receipt.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Lock Purchase Order for Update to prevent concurrent race conditions
      const poLock = await client.query(
        `SELECT * FROM purchase_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [purchaseOrderId, orgId]
      );
      if (poLock.rows.length === 0) {
        throw new Error('Purchase Order not found or does not belong to organization.');
      }
      const po = poLock.rows[0];

      if (['draft', 'pending_approval', 'rejected', 'cancelled', 'closed'].includes(po.status)) {
        throw new Error(`Cannot receive goods against Purchase Order in "${po.status}" status.`);
      }

      const effectiveWarehouseId = warehouseId || po.warehouse_id;

      // 2. Lock and Validate PO Items
      const poiLocks = await client.query(
        `SELECT id, sku_id, quantity, received_quantity, cancelled_quantity, unit_id 
         FROM purchase_order_items 
         WHERE purchase_order_id = $1 
         FOR UPDATE`,
        [purchaseOrderId]
      );
      const poiMap = new Map<string, any>();
      poiLocks.rows.forEach((row) => poiMap.set(row.id, row));

      for (const item of items) {
        if (item.receivedQuantity <= 0) {
          throw new Error('Received quantity must be strictly greater than 0.');
        }
        const poi = poiMap.get(item.purchaseOrderItemId);
        if (!poi) {
          throw new Error(`PO Line Item "${item.purchaseOrderItemId}" does not exist in Purchase Order.`);
        }
        if (poi.sku_id !== item.skuId) {
          throw new Error(`SKU mismatch on PO Line Item "${item.purchaseOrderItemId}".`);
        }

        const ordered = parseFloat(poi.quantity);
        const alreadyReceived = parseFloat(poi.received_quantity);
        const cancelled = parseFloat(poi.cancelled_quantity);
        const remaining = Math.max(0, ordered - alreadyReceived - cancelled);

        // Strict Over-Receiving Guard
        if (item.receivedQuantity > remaining + 0.0001) {
          throw new Error(
            `Over-receiving is strictly prohibited. For item SKU ID "${item.skuId}", ordered: ${ordered}, already received: ${alreadyReceived}, remaining: ${remaining}, attempted receipt: ${item.receivedQuantity}.`
          );
        }
      }

      // 3. Generate Sequential GRN Number: GRN-YYYY-XXXXXX
      const year = new Date().getFullYear();
      const countRes = await client.query(
        `SELECT COUNT(*) as count FROM goods_receipts WHERE organization_id = $1 AND grn_number LIKE $2`,
        [orgId, `GRN-${year}-%`]
      );
      const seq = parseInt(countRes.rows[0].count, 10) + 1;
      const grnNumber = `GRN-${year}-${seq.toString().padStart(6, '0')}`;
      const grnId = 'grn-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

      let hasQcItems = false;

      // 4. Insert Goods Receipt Header
      await client.query(
        `INSERT INTO goods_receipts (
          id, organization_id, grn_number, purchase_order_id, supplier_id,
          warehouse_id, receiving_location_id, received_date, received_by, received_by_email,
          status, supplier_reference, delivery_challan_number, vehicle_number,
          driver_name, driver_phone, qc_status, inventory_posted, inventory_posted_at, notes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, COALESCE($8, NOW()), $9, $10,
          'received', $11, $12, $13,
          $14, $15, 'not_required', FALSE, NULL, $16, NOW(), NOW()
        )`,
        [
          grnId,
          orgId,
          grnNumber,
          purchaseOrderId,
          po.supplier_id,
          effectiveWarehouseId,
          receivingLocationId || null,
          receivedDate || null,
          actorId,
          actorEmail,
          supplierReference || null,
          deliveryChallanNumber || null,
          vehicleNumber || null,
          driverName || null,
          driverPhone || null,
          notes || null,
        ]
      );

      // 5. Insert GRN Items & Update PO item received quantities
      for (const item of items) {
        const grniId = 'grni-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
        const poi = poiMap.get(item.purchaseOrderItemId);
        const orderedQty = parseFloat(poi.quantity);
        const reqQc = item.requiresQc ?? false;
        if (reqQc) hasQcItems = true;

        const acceptedQty = reqQc ? 0 : item.receivedQuantity;
        const quarantineQty = reqQc ? item.receivedQuantity : 0;
        const qcStatus = reqQc ? 'pending' : 'passed';

        await client.query(
          `INSERT INTO goods_receipt_items (
            id, grn_id, purchase_order_item_id, sku_id, ordered_quantity,
            received_quantity, accepted_quantity, rejected_quantity, quarantine_quantity,
            unit_id, batch_number, manufacturing_date, expiry_date, requires_qc, qc_status, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
          [
            grniId,
            grnId,
            item.purchaseOrderItemId,
            item.skuId,
            orderedQty,
            item.receivedQuantity,
            acceptedQty,
            quarantineQty,
            item.unitId || poi.unit_id || null,
            item.batchNumber || null,
            item.manufacturingDate || null,
            item.expiryDate || null,
            reqQc,
            qcStatus,
            item.notes || null,
          ]
        );

        // Update PO item received quantity
        const newPoItemRec = parseFloat(poi.received_quantity) + item.receivedQuantity;
        await client.query(
          `UPDATE purchase_order_items 
           SET received_quantity = $1, updated_at = NOW() 
           WHERE id = $2`,
          [newPoItemRec, item.purchaseOrderItemId]
        );
        poi.received_quantity = newPoItemRec; // update local map
      }

      // 6. Check if all PO items are fully received or partially received
      let allFullyReceived = true;
      for (const [, poi] of poiMap) {
        const ordered = parseFloat(poi.quantity);
        const rec = parseFloat(poi.received_quantity);
        const canc = parseFloat(poi.cancelled_quantity);
        if (rec + canc < ordered) {
          allFullyReceived = false;
          break;
        }
      }

      const updatedPoStatus = allFullyReceived ? 'fully_received' : 'partially_received';
      await client.query(
        `UPDATE purchase_orders 
         SET status = $1, updated_at = NOW() 
         WHERE id = $2`,
        [updatedPoStatus, purchaseOrderId]
      );

      // 7. Inventory Handoff: Post received stock directly into Inventory Engine (row-locked balances + movement records)
      for (const item of items) {
        const reqQc = item.requiresQc ?? false;
        const stockType = reqQc ? 'quarantine' : 'available';

        // Select or create balance row for update
        const balSelect = await client.query(
          `SELECT * FROM inventory_balances 
           WHERE organization_id = $1 
             AND warehouse_id = $2 
             AND ((location_id IS NULL AND $3::varchar IS NULL) OR location_id = $3)
             AND sku_id = $4 
             AND batch_id IS NULL
           FOR UPDATE`,
          [orgId, effectiveWarehouseId, receivingLocationId || null, item.skuId]
        );

        let balanceId: string;
        let prevAvail = 0;
        let prevRes = 0;
        let prevDam = 0;
        let prevQuar = 0;

        if (balSelect.rows.length > 0) {
          const b = balSelect.rows[0];
          balanceId = b.id;
          prevAvail = parseFloat(b.available_quantity) || 0;
          prevRes = parseFloat(b.reserved_quantity) || 0;
          prevDam = parseFloat(b.damaged_quantity) || 0;
          prevQuar = parseFloat(b.quarantine_quantity) || 0;
        } else {
          balanceId = 'bal-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
          await client.query(
            `INSERT INTO inventory_balances (
              id, organization_id, warehouse_id, location_id, sku_id, batch_id,
              available_quantity, reserved_quantity, damaged_quantity, quarantine_quantity, total_quantity,
              unit_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, NULL, 0, 0, 0, 0, 0, $6, NOW(), NOW())
            ON CONFLICT (organization_id, warehouse_id, COALESCE(location_id, 'NO_LOC'), sku_id, COALESCE(batch_id, 'NO_BATCH'))
            DO UPDATE SET updated_at = NOW()`,
            [balanceId, orgId, effectiveWarehouseId, receivingLocationId || null, item.skuId, item.unitId || null]
          );

          const locked = await client.query(`SELECT * FROM inventory_balances WHERE id = $1 FOR UPDATE`, [balanceId]);
          if (locked.rows.length > 0) {
            prevAvail = parseFloat(locked.rows[0].available_quantity) || 0;
            prevRes = parseFloat(locked.rows[0].reserved_quantity) || 0;
            prevDam = parseFloat(locked.rows[0].damaged_quantity) || 0;
            prevQuar = parseFloat(locked.rows[0].quarantine_quantity) || 0;
          }
        }

        const newAvail = stockType === 'available' ? prevAvail + item.receivedQuantity : prevAvail;
        const newQuar = stockType === 'quarantine' ? prevQuar + item.receivedQuantity : prevQuar;
        const newTotal = newAvail + prevRes + prevDam + newQuar;

        await client.query(
          `UPDATE inventory_balances 
           SET available_quantity = $1,
               quarantine_quantity = $2,
               total_quantity = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [newAvail, newQuar, newTotal, balanceId]
        );

        // Immutable stock movement ledger entry
        const movId = 'mov-grn-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
        const idempotencyKey = `grn-${grnId}-${item.skuId}`;

        await client.query(
          `INSERT INTO inventory_movements (
            id, organization_id, sku_id, warehouse_id, location_id,
            movement_type, stock_type, quantity, unit_id,
            reference_type, reference_id, before_quantity, after_quantity,
            performed_by, performed_by_email, reason, notes, idempotency_key, created_at
          ) VALUES ($1, $2, $3, $4, $5, 'purchase_receipt', $6, $7, $8, 'goods_receipt', $9, $10, $11, $12, $13, $14, $15, $16, NOW())`,
          [
            movId,
            orgId,
            item.skuId,
            effectiveWarehouseId,
            receivingLocationId || null,
            stockType,
            item.receivedQuantity,
            item.unitId || null,
            grnNumber,
            stockType === 'available' ? prevAvail : prevQuar,
            stockType === 'available' ? newAvail : newQuar,
            actorId,
            actorEmail,
            `Goods Receipt Inward (${grnNumber}) from PO ${po.po_number}`,
            item.notes || null,
            idempotencyKey,
          ]
        );
      }

      // 8. Update GRN status to posted
      const finalQcStatus = hasQcItems ? 'pending_qc' : 'not_required';
      const finalGrnStatus = hasQcItems ? 'pending_qc' : 'completed';

      await client.query(
        `UPDATE goods_receipts 
         SET status = $1,
             qc_status = $2,
             inventory_posted = TRUE,
             inventory_posted_at = NOW(),
             updated_at = NOW() 
         WHERE id = $3`,
        [finalGrnStatus, finalQcStatus, grnId]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'goods_receipt.create_and_post', 'goods_receipts', grnId, {
        grn_number: grnNumber,
        purchase_order_id: purchaseOrderId,
        po_number: po.po_number,
        warehouse_id: effectiveWarehouseId,
        items_count: items.length,
        has_qc: hasQcItems,
      });

      await client.query('COMMIT;');

      const createdGrn = await this.getGoodsReceiptById(grnId, orgId);
      return createdGrn!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 4. SUMMARY & OPERATIONAL REPORTS
  // ==========================================

  /**
   * Procurement Dashboard KPI Aggregates
   */
  static async getProcurementSummary(orgId: string): Promise<ProcurementSummary> {
    const prRes = await pool.query(
      `SELECT 
        COUNT(*)::int as total_pr,
        COUNT(CASE WHEN status IN ('submitted', 'under_review') THEN 1 END)::int as pending_pr
       FROM purchase_requests 
       WHERE organization_id = $1`,
      [orgId]
    );

    const poRes = await pool.query(
      `SELECT 
        COUNT(*)::int as total_po,
        COUNT(CASE WHEN status IN ('approved', 'sent', 'acknowledged') THEN 1 END)::int as open_po,
        COUNT(CASE WHEN status IN ('sent', 'acknowledged') THEN 1 END)::int as awaiting_receipt,
        COUNT(CASE WHEN status = 'partially_received' THEN 1 END)::int as partially_received_po,
        COUNT(CASE WHEN status IN ('fully_received', 'closed') THEN 1 END)::int as completed_po,
        COALESCE(SUM(total_amount), 0)::float as total_val
       FROM purchase_orders 
       WHERE organization_id = $1`,
      [orgId]
    );

    const grnRes = await pool.query(
      `SELECT 
        COUNT(*)::int as total_grn,
        COUNT(CASE WHEN qc_status = 'pending_qc' OR status = 'pending_qc' THEN 1 END)::int as pending_qc
       FROM goods_receipts 
       WHERE organization_id = $1`,
      [orgId]
    );

    const prData = prRes.rows[0] || {};
    const poData = poRes.rows[0] || {};
    const grnData = grnRes.rows[0] || {};

    return {
      total_purchase_requests: prData.total_pr || 0,
      pending_requests_approval: prData.pending_pr || 0,
      open_purchase_orders: poData.open_po || 0,
      orders_awaiting_receipt: poData.awaiting_receipt || 0,
      partially_received_orders: poData.partially_received_po || 0,
      completed_orders: poData.completed_po || 0,
      total_procurement_value: poData.total_val || 0,
      total_grns_created: grnData.total_grn || 0,
      pending_qc_grns: grnData.pending_qc || 0,
    };
  }

  /**
   * Operational Purchase Order Report
   */
  static async getPurchaseOrderReport(orgId: string): Promise<any[]> {
    const res = await pool.query(
      `SELECT 
        po.id, po.po_number, po.order_date, po.expected_delivery_date, po.status,
        po.total_amount::float as total_amount,
        s.name as supplier_name, s.supplier_code,
        w.name as warehouse_name,
        COALESCE(SUM(poi.quantity), 0)::float as ordered_quantity,
        COALESCE(SUM(poi.received_quantity), 0)::float as received_quantity,
        COALESCE(SUM(poi.quantity - poi.received_quantity - poi.cancelled_quantity), 0)::float as remaining_quantity
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       JOIN warehouses w ON po.warehouse_id = w.id
       LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
       WHERE po.organization_id = $1
       GROUP BY po.id, s.supplier_name, s.supplier_code, w.name
       ORDER BY po.order_date DESC`,
      [orgId]
    );
    return res.rows;
  }

  /**
   * Supplier Procurement Summary
   */
  static async getSupplierProcurementSummary(orgId: string): Promise<any[]> {
    const res = await pool.query(
      `SELECT 
        s.id as supplier_id, s.name as supplier_name, s.supplier_code, s.rating_status,
        COUNT(DISTINCT po.id)::int as purchase_orders_count,
        COALESCE(SUM(po.total_amount), 0)::float as total_spend,
        COUNT(DISTINCT poi.sku_id)::int as skus_procured_count
       FROM suppliers s
       LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status NOT IN ('cancelled', 'rejected')
       LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
       WHERE s.organization_id = $1
       GROUP BY s.id, s.supplier_name, s.supplier_code, s.rating_status
       ORDER BY total_spend DESC`,
      [orgId]
    );
    return res.rows;
  }

  /**
   * Inward Receiving Report
   */
  static async getReceivingReport(orgId: string): Promise<any[]> {
    const res = await pool.query(
      `SELECT 
        grn.id, grn.grn_number, grn.received_date, grn.status, grn.qc_status,
        po.po_number,
        s.supplier_name as supplier_name,
        w.name as warehouse_name,
        COUNT(grni.id)::int as items_count,
        COALESCE(SUM(grni.received_quantity), 0)::float as total_received_quantity
       FROM goods_receipts grn
       JOIN purchase_orders po ON grn.purchase_order_id = po.id
       JOIN suppliers s ON grn.supplier_id = s.id
       JOIN warehouses w ON grn.warehouse_id = w.id
       LEFT JOIN goods_receipt_items grni ON grn.id = grni.grn_id
       WHERE grn.organization_id = $1
       GROUP BY grn.id, po.po_number, s.supplier_name, w.name
       ORDER BY grn.received_date DESC`,
      [orgId]
    );
    return res.rows;
  }
}
