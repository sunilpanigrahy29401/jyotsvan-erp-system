import { pool } from './db.ts';
import type { RetailerStockItem, RetailerReceivingRecord } from '../types/retailers.ts';

export class RetailerInventoryService {
  /**
   * List channel inventory items with SKU, batch, shelf-life, and source distributor details
   */
  public async listStockItems(
    orgId: string,
    filters: {
      retailer_id?: string;
      sku_id?: string;
      distributor_id?: string;
      search?: string;
      near_expiry?: boolean;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: RetailerStockItem[]; total: number }> {
    const conditions: string[] = ['rs.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.retailer_id && filters.retailer_id !== 'all') {
      conditions.push(`rs.retailer_id = $${idx++}`);
      values.push(filters.retailer_id);
    }

    if (filters.sku_id && filters.sku_id !== 'all') {
      conditions.push(`rs.sku_id = $${idx++}`);
      values.push(filters.sku_id);
    }

    if (filters.distributor_id && filters.distributor_id !== 'all') {
      conditions.push(`rs.source_distributor_id = $${idx++}`);
      values.push(filters.distributor_id);
    }

    if (filters.search) {
      conditions.push(
        `(s.sku_code ILIKE $${idx} OR s.name ILIKE $${idx} OR rs.batch_number ILIKE $${idx} OR r.display_name ILIKE $${idx} OR r.retailer_code ILIKE $${idx})`
      );
      values.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.near_expiry) {
      conditions.push(`b.expiry_date IS NOT NULL AND b.expiry_date <= NOW() + INTERVAL '60 days'`);
    }

    const whereClause = conditions.join(' AND ');

    const countSql = `
      SELECT COUNT(*)
      FROM retailer_stock rs
      JOIN retailers r ON r.id = rs.retailer_id
      JOIN skus s ON s.id = rs.sku_id
      LEFT JOIN batches b ON b.id = rs.batch_id
      WHERE ${whereClause}
    `;

    const countRes = await pool.query(countSql, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        rs.*,
        r.display_name as retailer_name,
        r.retailer_code as retailer_code,
        s.sku_code,
        s.name as sku_name,
        (SELECT cat.name FROM products pr JOIN categories cat ON cat.id = pr.category_id WHERE pr.id = s.product_id) AS category,
        b.manufacturing_date AS manufacture_date,
        b.expiry_date,
        ROUND(EXTRACT(EPOCH FROM (b.expiry_date - NOW())) / 86400) as shelf_life_days_remaining,
        u.name as unit_name,
        d.display_name as source_distributor_name,
        d.distributor_code as source_distributor_code,
        c.name as source_cf_name
      FROM retailer_stock rs
      JOIN retailers r ON r.id = rs.retailer_id
      JOIN skus s ON s.id = rs.sku_id
      LEFT JOIN batches b ON b.id = rs.batch_id
      LEFT JOIN units u ON u.id = rs.unit_id
      LEFT JOIN distributors d ON d.id = rs.source_distributor_id
      LEFT JOIN cfs c ON c.id = rs.source_cf_id
      WHERE ${whereClause}
      ORDER BY rs.updated_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const dataRes = await pool.query(dataSql, [...values, limit, offset]);

    const data: RetailerStockItem[] = dataRes.rows.map((row) => {
      const remainingDays = row.shelf_life_days_remaining !== null ? parseInt(row.shelf_life_days_remaining, 10) : undefined;
      let expiryRisk: 'normal' | 'near_expiry' | 'expired' = 'normal';
      if (remainingDays !== undefined) {
        if (remainingDays <= 0) expiryRisk = 'expired';
        else if (remainingDays <= 60) expiryRisk = 'near_expiry';
      }

      const qOnHand = parseFloat(row.quantity_on_hand || '0');
      const uCost = parseFloat(row.unit_cost || '0');

      return {
        ...row,
        quantity_on_hand: qOnHand,
        quantity_available: parseFloat(row.quantity_available || '0'),
        quantity_reserved: parseFloat(row.quantity_reserved || '0'),
        quantity_damaged: parseFloat(row.quantity_damaged || '0'),
        quantity_quarantine: parseFloat(row.quantity_quarantine || '0'),
        unit_cost: uCost,
        total_valuation: qOnHand * uCost,
        shelf_life_days_remaining: remainingDays,
        expiry_risk_status: expiryRisk,
      };
    });

    return { data, total };
  }

  /**
   * List Receiving Records (downstream receiving log)
   */
  public async listReceivingRecords(
    orgId: string,
    filters: {
      retailer_id?: string;
      distributor_id?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: RetailerReceivingRecord[]; total: number }> {
    const conditions: string[] = ['rr.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.retailer_id && filters.retailer_id !== 'all') {
      conditions.push(`rr.retailer_id = $${idx++}`);
      values.push(filters.retailer_id);
    }

    if (filters.distributor_id && filters.distributor_id !== 'all') {
      conditions.push(`rr.distributor_id = $${idx++}`);
      values.push(filters.distributor_id);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM retailer_receiving_records rr WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        rr.*,
        r.display_name as retailer_name,
        d.display_name as distributor_name,
        s.sku_code,
        s.name as sku_name
      FROM retailer_receiving_records rr
      JOIN retailers r ON r.id = rr.retailer_id
      JOIN distributors d ON d.id = rr.distributor_id
      JOIN skus s ON s.id = rr.sku_id
      WHERE ${whereClause}
      ORDER BY rr.receiving_date DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const res = await pool.query(dataSql, [...values, limit, offset]);

    const data: RetailerReceivingRecord[] = res.rows.map((row) => ({
      ...row,
      dispatched_quantity: parseFloat(row.dispatched_quantity || '0'),
      received_quantity: parseFloat(row.received_quantity || '0'),
      shortage_quantity: parseFloat(row.shortage_quantity || '0'),
      damaged_quantity: parseFloat(row.damaged_quantity || '0'),
      rejected_quantity: parseFloat(row.rejected_quantity || '0'),
      unit_cost: parseFloat(row.unit_cost || '0'),
    }));

    return { data, total };
  }

  /**
   * Record downstream stock receiving from distributor with automated retailer stock update
   */
  public async logReceivingRecord(
    orgId: string,
    data: {
      retailer_id: string;
      distributor_id: string;
      distributor_dispatch_reference?: string;
      transfer_id?: string;
      sku_id: string;
      batch_id?: string;
      batch_number?: string;
      dispatched_quantity: number;
      received_quantity: number;
      damaged_quantity?: number;
      rejected_quantity?: number;
      unit_cost?: number;
      notes?: string;
    }
  ): Promise<RetailerReceivingRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const shortage = Math.max(0, data.dispatched_quantity - data.received_quantity);
      const damaged = data.damaged_quantity || 0;
      const rejected = data.rejected_quantity || 0;
      const acceptedUsable = Math.max(0, data.received_quantity - damaged - rejected);

      const id = `recv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const batchNum = data.batch_number || 'BAT-CHANNEL-01';

      const insertSql = `
        INSERT INTO retailer_receiving_records (
          id, organization_id, retailer_id, distributor_id, distributor_dispatch_reference,
          transfer_id, sku_id, batch_id, batch_number, dispatched_quantity,
          received_quantity, shortage_quantity, damaged_quantity, rejected_quantity,
          unit_cost, receiving_date, notes
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, NOW(), $16
        ) RETURNING *
      `;

      const values = [
        id,
        orgId,
        data.retailer_id,
        data.distributor_id,
        data.distributor_dispatch_reference || null,
        data.transfer_id || null,
        data.sku_id,
        data.batch_id || null,
        batchNum,
        data.dispatched_quantity,
        data.received_quantity,
        shortage,
        damaged,
        rejected,
        data.unit_cost || 0,
        data.notes || null,
      ];

      const res = await client.query(insertSql, values);
      const record = res.rows[0];

      // Update or insert into retailer_stock
      const stockId = `stk-${data.retailer_id}-${data.sku_id}-${Date.now().toString(36)}`;
      await client.query(
        `INSERT INTO retailer_stock (
          id, organization_id, retailer_id, sku_id, batch_id, batch_number,
          quantity_on_hand, quantity_available, quantity_damaged, unit_cost,
          source_distributor_id, last_inward_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, NOW(), NOW()
        ) ON CONFLICT (retailer_id, sku_id, batch_number) DO UPDATE SET
          quantity_on_hand = retailer_stock.quantity_on_hand + EXCLUDED.quantity_on_hand,
          quantity_available = retailer_stock.quantity_available + EXCLUDED.quantity_available,
          quantity_damaged = retailer_stock.quantity_damaged + EXCLUDED.quantity_damaged,
          unit_cost = EXCLUDED.unit_cost,
          source_distributor_id = EXCLUDED.source_distributor_id,
          last_inward_at = NOW(),
          updated_at = NOW()`,
        [
          stockId,
          orgId,
          data.retailer_id,
          data.sku_id,
          data.batch_id || null,
          batchNum,
          acceptedUsable,
          acceptedUsable,
          damaged,
          data.unit_cost || 0,
          data.distributor_id,
        ]
      );

      await client.query('COMMIT;');
      return {
        ...record,
        dispatched_quantity: parseFloat(record.dispatched_quantity || '0'),
        received_quantity: parseFloat(record.received_quantity || '0'),
        shortage_quantity: parseFloat(record.shortage_quantity || '0'),
        damaged_quantity: parseFloat(record.damaged_quantity || '0'),
        rejected_quantity: parseFloat(record.rejected_quantity || '0'),
        unit_cost: parseFloat(record.unit_cost || '0'),
      };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }
}
