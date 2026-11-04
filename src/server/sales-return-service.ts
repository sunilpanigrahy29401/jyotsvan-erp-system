// src/server/sales-return-service.ts
// Enterprise Sales Return (RMA), Restocking & Quarantine Engine (Phase 18)

import { pool } from './db.ts';
import { InventoryService } from './inventory-service.ts';
import type { SalesReturn, SalesReturnItem, ReturnReason, ReturnCondition, ReturnStatus } from '../types/sales-orders.ts';

// Helper to record enterprise audit logs
async function recordAudit(
  orgId: string,
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
      [auditId, orgId, actorId, actorEmail, action, targetResource, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    console.warn('[Audit Log Error]', err);
  }
}

export class SalesReturnService {
  /**
   * 1. Create a Sales Return (RMA) Request
   */
  public static async createReturn(params: {
    organizationId: string;
    salesOrderId: string;
    reason: ReturnReason;
    condition: ReturnCondition;
    qcRequired?: boolean;
    notes?: string;
    items: {
      sales_order_item_id?: string;
      sku_id: string;
      batch_id?: string;
      returned_quantity: number;
      unit_price: number;
      disposition?: 'restock_available' | 'quarantine' | 'scrap' | 'return_to_vendor';
      notes?: string;
    }[];
    actorId?: string | null;
    actorEmail: string;
  }): Promise<SalesReturn> {
    const { organizationId, salesOrderId, reason, condition, qcRequired = false, notes, items, actorId = null, actorEmail } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Fetch Order
      const orderRes = await client.query(
        `SELECT * FROM sales_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [salesOrderId, organizationId]
      );
      if (orderRes.rows.length === 0) throw new Error('Sales Order not found.');
      const order = orderRes.rows[0];

      // Generate Return Number
      const year = new Date().getFullYear();
      const countRes = await client.query(
        `SELECT COUNT(*) FROM sales_returns WHERE organization_id = $1`,
        [organizationId]
      );
      const retSeq = parseInt(countRes.rows[0]?.count || '0', 10) + 1;
      const returnNumber = `RET-${year}-${String(retSeq).padStart(5, '0')}`;

      const returnId = 'ret-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

      let subtotal = 0;
      let taxTotal = 0;

      // Calculate totals
      for (const it of items) {
        const lineTotal = it.returned_quantity * it.unit_price;
        const lineTax = lineTotal * 0.18; // Standard 18% GST estimate snapshot
        subtotal += lineTotal;
        taxTotal += lineTax;
      }
      const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;

      // Insert Return Header
      const retIns = await client.query(
        `INSERT INTO sales_returns (
           id, organization_id, return_number, sales_order_id, customer_type,
           distributor_id, retailer_id, warehouse_id, return_date, reason, condition,
           qc_required, status, subtotal, tax_total, grand_total, notes,
           created_by, created_by_email, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, 'submitted', $12, $13, $14, $15, $16, $17, NOW(), NOW())
         RETURNING *`,
        [
          returnId,
          organizationId,
          returnNumber,
          salesOrderId,
          order.customer_type,
          order.distributor_id || null,
          order.retailer_id || null,
          order.warehouse_id,
          reason,
          condition,
          qcRequired,
          subtotal,
          taxTotal,
          grandTotal,
          notes || null,
          actorId,
          actorEmail,
        ]
      );

      // Insert Return Items
      for (const it of items) {
        let batchNum: string | null = null;
        if (it.batch_id) {
          const bRes = await client.query('SELECT batch_number FROM batches WHERE id = $1', [it.batch_id]);
          if (bRes.rows.length > 0) batchNum = bRes.rows[0].batch_number;
        }

        const lineTotal = it.returned_quantity * it.unit_price;
        const lineTax = lineTotal * 0.18;
        const netTotal = lineTotal + lineTax;

        const retItemId = 'retit-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        await client.query(
          `INSERT INTO sales_return_items (
             id, organization_id, sales_return_id, sales_order_item_id,
             sku_id, batch_id, batch_number, returned_quantity,
             unit_price, tax_amount, total_amount, disposition, notes, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
          [
            retItemId,
            organizationId,
            returnId,
            it.sales_order_item_id || null,
            it.sku_id,
            it.batch_id || null,
            batchNum,
            it.returned_quantity,
            it.unit_price,
            lineTax,
            netTotal,
            it.disposition || (qcRequired ? 'quarantine' : 'restock_available'),
            it.notes || null,
          ]
        );
      }

      await recordAudit(
        organizationId,
        actorId,
        actorEmail,
        'sales_returns.create',
        'sales_returns',
        returnId,
        {
          return_number: returnNumber,
          sales_order_number: order.order_number,
          grand_total: grandTotal,
          items_count: items.length,
        }
      );

      await client.query('COMMIT;');

      const fullReturn = await this.getReturnById(returnId, organizationId);
      return fullReturn!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 2. Approve Sales Return
   */
  public static async approveReturn(
    returnId: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<SalesReturn> {
    const res = await pool.query(
      `UPDATE sales_returns 
       SET status = 'approved', approved_by = $1, approved_by_email = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND organization_id = $4 AND status = 'submitted'
       RETURNING *`,
      [actorId, actorEmail, returnId, orgId]
    );
    if (res.rows.length === 0) {
      throw new Error('Return not found or already approved/processed.');
    }
    await recordAudit(orgId, actorId, actorEmail, 'sales_returns.approve', 'sales_returns', returnId, {
      return_number: res.rows[0].return_number,
    });
    return (await this.getReturnById(returnId, orgId))!;
  }

  /**
   * 3. Receive Return Goods (Inwards stock to Available or Quarantine based on QC / Condition)
   */
  public static async receiveReturn(params: {
    returnId: string;
    organizationId: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<SalesReturn> {
    const { returnId, organizationId, actorId = null, actorEmail } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const retRes = await client.query(
        `SELECT * FROM sales_returns WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [returnId, organizationId]
      );
      if (retRes.rows.length === 0) throw new Error('Return not found.');
      const returnDoc = retRes.rows[0];

      if (['received', 'completed', 'cancelled'].includes(returnDoc.status)) {
        throw new Error(`Cannot receive return with status "${returnDoc.status}".`);
      }

      // Fetch items
      const itemsRes = await client.query(
        `SELECT * FROM sales_return_items WHERE sales_return_id = $1 AND organization_id = $2`,
        [returnId, organizationId]
      );

      for (const it of itemsRes.rows) {
        const qty = parseFloat(it.returned_quantity) || 0;
        if (qty <= 0) continue;

        const isQuarantine = returnDoc.qc_required || it.disposition === 'quarantine';
        const stockType = isQuarantine ? 'quarantine' : 'available';

        // Mutate stock through canonical InventoryService
        const adj = await InventoryService.adjustStock({
          organizationId,
          skuId: it.sku_id,
          warehouseId: returnDoc.warehouse_id,
          batchId: it.batch_id || null,
          stockType: stockType,
          direction: 'increase',
          quantity: qty,
          reason: `Sales Return Received: ${returnDoc.return_number}`,
          actorId,
          actorEmail,
        });

        // Update sales_order_items returned_quantity
        if (it.sales_order_item_id) {
          await client.query(
            `UPDATE sales_order_items 
             SET returned_quantity = returned_quantity + $1, updated_at = NOW() 
             WHERE id = $2`,
            [qty, it.sales_order_item_id]
          );
        }

        // Store movement ID
        await client.query(
          `UPDATE sales_return_items SET movement_id = $1 WHERE id = $2`,
          [adj.movement.id, it.id]
        );
      }

      const finalStatus: ReturnStatus = returnDoc.qc_required ? 'quarantined' : 'completed';

      await client.query(
        `UPDATE sales_returns 
         SET status = $1, received_by = $2, received_by_email = $3, received_at = NOW(), updated_at = NOW()
         WHERE id = $4`,
        [finalStatus, actorId, actorEmail, returnId]
      );

      await recordAudit(
        organizationId,
        actorId,
        actorEmail,
        'sales_returns.receive',
        'sales_returns',
        returnId,
        {
          return_number: returnDoc.return_number,
          status: finalStatus,
        }
      );

      await client.query('COMMIT;');

      return (await this.getReturnById(returnId, organizationId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 4. Fetch Single Return with items
   */
  public static async getReturnById(returnId: string, orgId: string): Promise<SalesReturn | null> {
    const res = await pool.query(
      `SELECT 
         r.*,
         so.order_number,
         w.name as warehouse_name,
         COALESCE(d.legal_name, d.display_name, ret.store_name, 'Direct Customer') as customer_name
       FROM sales_returns r
       JOIN sales_orders so ON r.sales_order_id = so.id
       JOIN warehouses w ON r.warehouse_id = w.id
       LEFT JOIN distributors d ON r.distributor_id = d.id
       LEFT JOIN retailers ret ON r.retailer_id = ret.id
       WHERE r.id = $1 AND r.organization_id = $2`,
      [returnId, orgId]
    );
    if (res.rows.length === 0) return null;

    const itemsRes = await pool.query(
      `SELECT 
         ri.*,
         s.sku as sku_code,
         p.name as product_name
       FROM sales_return_items ri
       JOIN skus s ON ri.sku_id = s.id
       JOIN products p ON s.product_id = p.id
       WHERE ri.sales_return_id = $1 AND ri.organization_id = $2
       ORDER BY ri.created_at ASC`,
      [returnId, orgId]
    );

    const ret = res.rows[0];
    ret.items = itemsRes.rows;
    return ret;
  }

  /**
   * 5. List Returns with pagination and filters
   */
  public static async listReturns(
    orgId: string,
    filters: {
      search?: string;
      status?: string;
      reason?: string;
      salesOrderId?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: SalesReturn[]; total: number }> {
    const conditions: string[] = ['r.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.search) {
      conditions.push(`(r.return_number ILIKE $${idx} OR so.order_number ILIKE $${idx})`);
      values.push(`%${filters.search}%`);
      idx++;
    }
    if (filters.status && filters.status !== 'all') {
      conditions.push(`r.status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters.reason && filters.reason !== 'all') {
      conditions.push(`r.reason = $${idx++}`);
      values.push(filters.reason);
    }
    if (filters.salesOrderId) {
      conditions.push(`r.sales_order_id = $${idx++}`);
      values.push(filters.salesOrderId);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM sales_returns r JOIN sales_orders so ON r.sales_order_id = so.id WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataRes = await pool.query(
      `SELECT 
         r.*,
         so.order_number,
         w.name as warehouse_name,
         COALESCE(d.legal_name, d.display_name, ret.store_name, 'Direct Customer') as customer_name,
         (SELECT COUNT(*) FROM sales_return_items ri WHERE ri.sales_return_id = r.id) as items_count,
         (SELECT COALESCE(SUM(ri.returned_quantity), 0) FROM sales_return_items ri WHERE ri.sales_return_id = r.id) as total_returned_units
       FROM sales_returns r
       JOIN sales_orders so ON r.sales_order_id = so.id
       JOIN warehouses w ON r.warehouse_id = w.id
       LEFT JOIN distributors d ON r.distributor_id = d.id
       LEFT JOIN retailers ret ON r.retailer_id = ret.id
       WHERE ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      values
    );

    return { data: dataRes.rows, total };
  }
}
