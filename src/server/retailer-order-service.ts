import { pool } from './db.ts';
import type {
  RetailerOrderRequest,
  RetailerOrderStatus,
  RetailerReturn,
  RetailerReturnStatus,
  RetailerReturnReason,
} from '../types/retailers.ts';

export class RetailerOrderService {
  /**
   * List Retailer Order Requests with filtering
   */
  public async listOrderRequests(
    orgId: string,
    filters: {
      retailer_id?: string;
      distributor_id?: string;
      status?: RetailerOrderStatus | string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: RetailerOrderRequest[]; total: number }> {
    const conditions: string[] = ['ro.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.retailer_id && filters.retailer_id !== 'all') {
      conditions.push(`ro.retailer_id = $${idx++}`);
      values.push(filters.retailer_id);
    }

    if (filters.distributor_id && filters.distributor_id !== 'all') {
      conditions.push(`ro.distributor_id = $${idx++}`);
      values.push(filters.distributor_id);
    }

    if (filters.status && filters.status !== 'all') {
      conditions.push(`ro.status = $${idx++}`);
      values.push(filters.status);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM retailer_order_requests ro WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        ro.*,
        r.display_name as retailer_name,
        r.retailer_code as retailer_code,
        d.display_name as distributor_name,
        d.distributor_code as distributor_code
      FROM retailer_order_requests ro
      JOIN retailers r ON r.id = ro.retailer_id
      JOIN distributors d ON d.id = ro.distributor_id
      WHERE ${whereClause}
      ORDER BY ro.requested_date DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const res = await pool.query(dataSql, [...values, limit, offset]);

    const data: RetailerOrderRequest[] = res.rows.map((r) => ({
      ...r,
      total_items_count: parseInt(r.total_items_count || '0', 10),
      total_quantity: parseFloat(r.total_quantity || '0'),
      total_estimated_amount: parseFloat(r.total_estimated_amount || '0'),
    }));

    return { data, total };
  }

  /**
   * Get single Order Request with items
   */
  public async getOrderRequestById(orgId: string, id: string): Promise<RetailerOrderRequest | null> {
    const orderSql = `
      SELECT 
        ro.*,
        r.display_name as retailer_name,
        r.retailer_code as retailer_code,
        d.display_name as distributor_name,
        d.distributor_code as distributor_code
      FROM retailer_order_requests ro
      JOIN retailers r ON r.id = ro.retailer_id
      JOIN distributors d ON d.id = ro.distributor_id
      WHERE ro.organization_id = $1 AND ro.id = $2
    `;

    const res = await pool.query(orderSql, [orgId, id]);
    if (res.rows.length === 0) return null;

    const order = res.rows[0];

    const itemsSql = `
      SELECT 
        roi.*,
        s.sku_code,
        s.name as sku_name
      FROM retailer_order_request_items roi
      JOIN skus s ON s.id = roi.sku_id
      WHERE roi.order_id = $1
    `;
    const itemsRes = await pool.query(itemsSql, [id]);

    return {
      ...order,
      total_items_count: parseInt(order.total_items_count || '0', 10),
      total_quantity: parseFloat(order.total_quantity || '0'),
      total_estimated_amount: parseFloat(order.total_estimated_amount || '0'),
      items: itemsRes.rows.map((i) => ({
        ...i,
        requested_quantity: parseFloat(i.requested_quantity || '0'),
        approved_quantity: parseFloat(i.approved_quantity || '0'),
        unit_cost: parseFloat(i.unit_cost || '0'),
        total_price: parseFloat(i.total_price || '0'),
      })),
    };
  }

  /**
   * Create new Order Request
   */
  public async createOrderRequest(
    orgId: string,
    data: {
      retailer_id: string;
      distributor_id: string;
      requested_delivery_date?: string;
      notes?: string;
      status?: 'draft' | 'submitted';
      items: Array<{
        sku_id: string;
        requested_quantity: number;
        unit_cost?: number;
        uom?: string;
        notes?: string;
      }>;
    },
    actor: { id: string; email: string }
  ): Promise<RetailerOrderRequest> {
    if (!data.items || data.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const orderCountRes = await client.query(
        'SELECT COUNT(*) FROM retailer_order_requests WHERE organization_id = $1',
        [orgId]
      );
      const seq = parseInt(orderCountRes.rows[0]?.count || '0', 10) + 1;
      const orderNumber = `ROR-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
      const orderId = `ror-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      let totalQty = 0;
      let totalAmount = 0;

      for (const it of data.items) {
        totalQty += it.requested_quantity;
        totalAmount += it.requested_quantity * (it.unit_cost || 0);
      }

      const insertOrderSql = `
        INSERT INTO retailer_order_requests (
          id, organization_id, order_number, retailer_id, distributor_id,
          status, requested_date, requested_delivery_date, total_items_count,
          total_quantity, total_estimated_amount, currency, notes, created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, NOW(), $7, $8,
          $9, $10, 'INR', $11, $12
        ) RETURNING *
      `;

      await client.query(insertOrderSql, [
        orderId,
        orgId,
        orderNumber,
        data.retailer_id,
        data.distributor_id,
        data.status || 'submitted',
        data.requested_delivery_date || null,
        data.items.length,
        totalQty,
        totalAmount,
        data.notes || null,
        actor.id,
      ]);

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const itemId = `roit-${orderId}-${i + 1}`;
        const itemTotal = item.requested_quantity * (item.unit_cost || 0);

        await client.query(
          `INSERT INTO retailer_order_request_items (
            id, order_id, sku_id, requested_quantity, approved_quantity, uom, unit_cost, total_price, notes
          ) VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8)`,
          [
            itemId,
            orderId,
            item.sku_id,
            item.requested_quantity,
            item.uom || 'PCS',
            item.unit_cost || 0,
            itemTotal,
            item.notes || null,
          ]
        );
      }

      await client.query('COMMIT;');
      return (await this.getOrderRequestById(orgId, orderId)) as RetailerOrderRequest;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Approve Order Request
   */
  public async approveOrderRequest(
    orgId: string,
    id: string,
    actor: { id: string; email: string },
    notes?: string
  ): Promise<RetailerOrderRequest> {
    const order = await this.getOrderRequestById(orgId, id);
    if (!order) throw new Error('Order request not found');

    if (order.status !== 'submitted' && order.status !== 'draft') {
      throw new Error(`Cannot approve order with status '${order.status}'`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      await client.query(
        `UPDATE retailer_order_requests SET
          status = 'approved',
          approved_by = $1,
          approved_at = NOW(),
          notes = COALESCE($2, notes),
          updated_at = NOW()
        WHERE organization_id = $3 AND id = $4`,
        [actor.id, notes ? `${order.notes || ''}\n[Approved]: ${notes}` : null, orgId, id]
      );

      // Auto-set approved quantity on items if zero
      await client.query(
        `UPDATE retailer_order_request_items SET
          approved_quantity = requested_quantity
        WHERE order_id = $1 AND (approved_quantity IS NULL OR approved_quantity = 0)`,
        [id]
      );

      await client.query('COMMIT;');
      return (await this.getOrderRequestById(orgId, id)) as RetailerOrderRequest;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Reject Order Request
   */
  public async rejectOrderRequest(
    orgId: string,
    id: string,
    actor: { id: string; email: string },
    reason: string
  ): Promise<RetailerOrderRequest> {
    const order = await this.getOrderRequestById(orgId, id);
    if (!order) throw new Error('Order request not found');

    await pool.query(
      `UPDATE retailer_order_requests SET
        status = 'rejected',
        notes = $1,
        updated_at = NOW()
      WHERE organization_id = $2 AND id = $3`,
      [`${order.notes || ''}\n[Rejected]: ${reason}`, orgId, id]
    );

    return (await this.getOrderRequestById(orgId, id)) as RetailerOrderRequest;
  }

  /**
   * Cancel Order Request
   */
  public async cancelOrderRequest(
    orgId: string,
    id: string,
    actor: { id: string; email: string },
    reason?: string
  ): Promise<RetailerOrderRequest> {
    const order = await this.getOrderRequestById(orgId, id);
    if (!order) throw new Error('Order request not found');

    await pool.query(
      `UPDATE retailer_order_requests SET
        status = 'cancelled',
        notes = $1,
        updated_at = NOW()
      WHERE organization_id = $2 AND id = $3`,
      [`${order.notes || ''}\n[Cancelled]: ${reason || 'Cancelled by user'}`, orgId, id]
    );

    return (await this.getOrderRequestById(orgId, id)) as RetailerOrderRequest;
  }

  // ==========================================
  // Retailer Returns
  // ==========================================

  public async listReturns(
    orgId: string,
    filters: {
      retailer_id?: string;
      distributor_id?: string;
      status?: RetailerReturnStatus | string;
      reason?: RetailerReturnReason | string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: RetailerReturn[]; total: number }> {
    const conditions: string[] = ['ret.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.retailer_id && filters.retailer_id !== 'all') {
      conditions.push(`ret.retailer_id = $${idx++}`);
      values.push(filters.retailer_id);
    }

    if (filters.distributor_id && filters.distributor_id !== 'all') {
      conditions.push(`ret.distributor_id = $${idx++}`);
      values.push(filters.distributor_id);
    }

    if (filters.status && filters.status !== 'all') {
      conditions.push(`ret.status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.reason && filters.reason !== 'all') {
      conditions.push(`ret.reason = $${idx++}`);
      values.push(filters.reason);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM retailer_returns ret WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        ret.*,
        r.display_name as retailer_name,
        d.display_name as distributor_name,
        s.sku_code,
        s.name as sku_name
      FROM retailer_returns ret
      JOIN retailers r ON r.id = ret.retailer_id
      JOIN distributors d ON d.id = ret.distributor_id
      JOIN skus s ON s.id = ret.sku_id
      WHERE ${whereClause}
      ORDER BY ret.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const res = await pool.query(dataSql, [...values, limit, offset]);

    const data: RetailerReturn[] = res.rows.map((row) => ({
      ...row,
      quantity: parseFloat(row.quantity || '0'),
    }));

    return { data, total };
  }

  public async createReturn(
    orgId: string,
    data: {
      retailer_id: string;
      distributor_id: string;
      sku_id: string;
      batch_id?: string;
      batch_number?: string;
      quantity: number;
      reason: RetailerReturnReason;
      reference?: string;
      notes?: string;
    },
    actor: { id: string; email: string }
  ): Promise<RetailerReturn> {
    const returnCountRes = await pool.query(
      'SELECT COUNT(*) FROM retailer_returns WHERE organization_id = $1',
      [orgId]
    );
    const seq = parseInt(returnCountRes.rows[0]?.count || '0', 10) + 1;
    const returnNumber = `RRT-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
    const id = `rrt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const res = await pool.query(
      `INSERT INTO retailer_returns (
        id, organization_id, return_number, retailer_id, distributor_id,
        sku_id, batch_id, batch_number, quantity, reason, status, reference, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'requested', $11, $12, $13)
      RETURNING *`,
      [
        id,
        orgId,
        returnNumber,
        data.retailer_id,
        data.distributor_id,
        data.sku_id,
        data.batch_id || null,
        data.batch_number || null,
        data.quantity,
        data.reason || 'damaged',
        data.reference || null,
        data.notes || null,
        actor.id,
      ]
    );

    const r = res.rows[0];
    return {
      ...r,
      quantity: parseFloat(r.quantity || '0'),
    };
  }

  public async approveReturn(
    orgId: string,
    id: string,
    actor: { id: string; email: string },
    notes?: string
  ): Promise<RetailerReturn> {
    const res = await pool.query(
      `UPDATE retailer_returns SET
        status = 'approved',
        notes = COALESCE($1, notes),
        updated_at = NOW()
       WHERE organization_id = $2 AND id = $3
       RETURNING *`,
      [notes ? `[Approved by ${actor.email}]: ${notes}` : null, orgId, id]
    );
    if (res.rows.length === 0) throw new Error('Return record not found');
    const r = res.rows[0];
    return {
      ...r,
      quantity: parseFloat(r.quantity || '0'),
    };
  }
}
