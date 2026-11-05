import { pool } from './db.ts';
import type { DistributorStockItem } from '../types/distributors.ts';

export class DistributorInventoryService {
  /**
   * Get distributor stock items with SKU, batch, and warehouse joins
   */
  public async getStockItems(
    orgId: string,
    filters: {
      distributor_id?: string;
      sku_id?: string;
      cf_id?: string;
      search?: string;
      near_expiry?: boolean;
      days_threshold?: number;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: DistributorStockItem[]; total: number }> {
    const conditions: string[] = ['ds.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.distributor_id) {
      conditions.push(`ds.distributor_id = $${idx++}`);
      values.push(filters.distributor_id);
    }

    if (filters.sku_id) {
      conditions.push(`ds.sku_id = $${idx++}`);
      values.push(filters.sku_id);
    }

    if (filters.cf_id) {
      conditions.push(`ds.source_cf_id = $${idx++}`);
      values.push(filters.cf_id);
    }

    if (filters.search) {
      conditions.push(
        `(s.sku_code ILIKE $${idx} OR s.name ILIKE $${idx} OR d.display_name ILIKE $${idx} OR ds.batch_number ILIKE $${idx})`
      );
      values.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.near_expiry) {
      const days = filters.days_threshold || 90;
      conditions.push(`b.expiry_date IS NOT NULL AND b.expiry_date <= NOW() + INTERVAL '${days} days'`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `
      SELECT COUNT(*)
      FROM distributor_stock ds
      JOIN distributors d ON d.id = ds.distributor_id
      JOIN skus s ON s.id = ds.sku_id
      LEFT JOIN batches b ON b.id = ds.batch_id
      WHERE ${whereClause}
    `,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        ds.*,
        d.distributor_code,
        d.display_name as distributor_name,
        s.sku_code,
        s.name as sku_name,
        (SELECT cat.name FROM products pr JOIN categories cat ON cat.id = pr.category_id WHERE pr.id = s.product_id) AS category,
        u.short_code as unit_short_code,
        b.expiry_date,
        CASE 
          WHEN b.expiry_date IS NOT NULL THEN GREATEST(0, EXTRACT(DAY FROM (b.expiry_date - NOW()))::integer)
          ELSE NULL
        END as shelf_life_days_remaining,
        c.display_name as source_cf_name
      FROM distributor_stock ds
      JOIN distributors d ON d.id = ds.distributor_id
      JOIN skus s ON s.id = ds.sku_id
      LEFT JOIN units u ON u.id = ds.unit_id
      LEFT JOIN batches b ON b.id = ds.batch_id
      LEFT JOIN cfs c ON c.id = ds.source_cf_id
      WHERE ${whereClause}
      ORDER BY ds.quantity_on_hand DESC, ds.updated_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    values.push(limit, offset);
    const res = await pool.query(dataSql, values);

    const data: DistributorStockItem[] = res.rows.map(row => {
      const onHand = Number(row.quantity_on_hand || 0);
      const cost = Number(row.unit_cost || 0);
      return {
        id: row.id,
        organization_id: row.organization_id,
        distributor_id: row.distributor_id,
        distributor_name: row.distributor_name,
        distributor_code: row.distributor_code,
        sku_id: row.sku_id,
        sku_code: row.sku_code,
        sku_name: row.sku_name,
        category: row.category,
        batch_id: row.batch_id,
        batch_number: row.batch_number,
        expiry_date: row.expiry_date,
        shelf_life_days_remaining: row.shelf_life_days_remaining !== null ? Number(row.shelf_life_days_remaining) : null,
        quantity_on_hand: onHand,
        quantity_available: Number(row.quantity_available || 0),
        quantity_reserved: Number(row.quantity_reserved || 0),
        quantity_damaged: Number(row.quantity_damaged || 0),
        quantity_quarantine: Number(row.quantity_quarantine || 0),
        unit_id: row.unit_id,
        unit_short_code: row.unit_short_code,
        unit_cost: cost,
        estimated_valuation: onHand * cost,
        source_cf_id: row.source_cf_id,
        source_cf_name: row.source_cf_name,
        last_inward_at: row.last_inward_at,
        last_outward_at: row.last_outward_at,
        updated_at: row.updated_at,
      };
    });

    return { data, total };
  }
}
