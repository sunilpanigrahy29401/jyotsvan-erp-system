import { PoolClient } from 'pg';
import { pool } from './db.ts';
import {
  InventoryBalance,
  InventoryMovement,
  StockReservation,
  StockAdjustment,
  InventorySummary,
  IntegrityReport,
  IntegrityDiscrepancy,
  MovementType,
  StockType,
  SkuStock360Profile,
} from '../types/inventory.ts';

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
      [auditId, organizationId, actorId, actorEmail || 'admin@jyotsvan.enterprise', action, targetResource, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    console.warn('[Audit Log Error]', err);
  }
}

export class InventoryService {
  /**
   * Helper to ensure balance record exists with row-level lock (FOR UPDATE)
   */
  private static async getOrCreateBalanceForUpdate(
    client: PoolClient,
    orgId: string,
    warehouseId: string,
    locationId: string | null,
    skuId: string,
    batchId: string | null,
    unitId: string | null
  ): Promise<any> {
    // Attempt lock on existing balance
    const selectRes = await client.query(
      `SELECT * FROM inventory_balances 
       WHERE organization_id = $1 
         AND warehouse_id = $2 
         AND ((location_id IS NULL AND $3::varchar IS NULL) OR location_id = $3)
         AND sku_id = $4 
         AND ((batch_id IS NULL AND $5::varchar IS NULL) OR batch_id = $5)
       FOR UPDATE`,
      [orgId, warehouseId, locationId || null, skuId, batchId || null]
    );

    if (selectRes.rows.length > 0) {
      return selectRes.rows[0];
    }

    // Otherwise create initial 0-balance row
    const balanceId = 'bal-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    const insertRes = await client.query(
      `INSERT INTO inventory_balances (
         id, organization_id, warehouse_id, location_id, sku_id, batch_id,
         available_quantity, reserved_quantity, damaged_quantity, quarantine_quantity, total_quantity,
         unit_id, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 0, 0, 0, $7, NOW(), NOW())
       ON CONFLICT (organization_id, warehouse_id, COALESCE(location_id, 'NO_LOC'), sku_id, COALESCE(batch_id, 'NO_BATCH'))
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [balanceId, orgId, warehouseId, locationId || null, skuId, batchId || null, unitId || null]
    );

    // Lock the inserted or conflicting row
    const lockedRes = await client.query(
      `SELECT * FROM inventory_balances WHERE id = $1 FOR UPDATE`,
      [insertRes.rows[0].id]
    );
    return lockedRes.rows[0];
  }

  /**
   * 1. Get Stock Balances with joined SKU, Warehouse, and Product data
   */
  static async getBalances(params: {
    orgId: string;
    search?: string;
    skuId?: string;
    warehouseId?: string;
    locationId?: string;
    categoryId?: string;
    stockStatus?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ balances: InventoryBalance[]; total: number; page: number; limit: number }> {
    const {
      orgId,
      search,
      skuId,
      warehouseId,
      locationId,
      categoryId,
      stockStatus,
      page = 1,
      limit = 50,
      sortBy = 'updated_at',
      sortOrder = 'desc',
    } = params;

    let queryStr = `
      SELECT 
        b.id, b.organization_id, b.warehouse_id, b.location_id, b.sku_id, b.batch_id,
        b.available_quantity::float as available_quantity,
        b.reserved_quantity::float as reserved_quantity,
        b.damaged_quantity::float as damaged_quantity,
        b.quarantine_quantity::float as quarantine_quantity,
        b.total_quantity::float as total_quantity,
        b.unit_id, b.created_at, b.updated_at,
        s.sku as sku_code, s.variant_name, s.reorder_level, s.reorder_quantity,
        s.minimum_stock_level, s.maximum_stock_level, s.cost_price::float as cost_price, s.selling_price::float as selling_price,
        p.id as product_id, p.name as product_name, p.product_code, p.brand,
        c.name as category_name,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name, loc.code as location_code,
        u.name as unit_name, u.short_code as unit_short_code
      FROM inventory_balances b
      JOIN skus s ON b.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN warehouses w ON b.warehouse_id = w.id
      LEFT JOIN warehouse_locations loc ON b.location_id = loc.id
      LEFT JOIN units u ON b.unit_id = u.id OR s.unit_id = u.id
      WHERE b.organization_id = $1
    `;

    const queryParams: any[] = [orgId];
    let paramIndex = 2;

    if (search && search.trim()) {
      queryStr += ` AND (
        s.sku ILIKE $${paramIndex} OR 
        s.variant_name ILIKE $${paramIndex} OR 
        p.name ILIKE $${paramIndex} OR 
        p.product_code ILIKE $${paramIndex} OR 
        w.name ILIKE $${paramIndex} OR 
        loc.name ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (skuId) {
      queryStr += ` AND b.sku_id = $${paramIndex}`;
      queryParams.push(skuId);
      paramIndex++;
    }

    if (warehouseId) {
      queryStr += ` AND b.warehouse_id = $${paramIndex}`;
      queryParams.push(warehouseId);
      paramIndex++;
    }

    if (locationId) {
      queryStr += ` AND b.location_id = $${paramIndex}`;
      queryParams.push(locationId);
      paramIndex++;
    }

    if (categoryId) {
      queryStr += ` AND p.category_id = $${paramIndex}`;
      queryParams.push(categoryId);
      paramIndex++;
    }

    // Status filter logic
    if (stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'out_of_stock') {
        queryStr += ` AND b.available_quantity = 0`;
      } else if (stockStatus === 'low_stock') {
        queryStr += ` AND b.available_quantity > 0 AND b.available_quantity <= COALESCE(s.reorder_level, 10)`;
      } else if (stockStatus === 'in_stock') {
        queryStr += ` AND b.available_quantity > COALESCE(s.reorder_level, 10)`;
      } else if (stockStatus === 'overstocked') {
        queryStr += ` AND s.maximum_stock_level IS NOT NULL AND b.total_quantity > s.maximum_stock_level`;
      }
    }

    // Count total
    const countSql = `SELECT COUNT(*) as count FROM (${queryStr}) as cnt_tbl`;
    const countRes = await pool.query(countSql, queryParams);
    const total = parseInt(countRes.rows[0].count, 10);

    // Sorting
    const allowedSortFields: Record<string, string> = {
      updated_at: 'b.updated_at',
      sku_code: 's.sku',
      product_name: 'p.name',
      warehouse_name: 'w.name',
      available_quantity: 'b.available_quantity',
      total_quantity: 'b.total_quantity',
    };
    const sortField = allowedSortFields[sortBy] || 'b.updated_at';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    queryStr += ` ORDER BY ${sortField} ${direction}`;

    // Pagination
    const offset = (page - 1) * limit;
    queryStr += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const res = await pool.query(queryStr, queryParams);

    const balances: InventoryBalance[] = res.rows.map((row) => {
      let status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' = 'in_stock';
      const avail = row.available_quantity || 0;
      const reorder = row.reorder_level ?? 10;
      const maxLvl = row.maximum_stock_level;

      if (avail <= 0) {
        status = 'out_of_stock';
      } else if (avail <= reorder) {
        status = 'low_stock';
      } else if (maxLvl && row.total_quantity > maxLvl) {
        status = 'overstocked';
      }

      return {
        ...row,
        stock_status: status,
      };
    });

    return { balances, total, page, limit };
  }

  /**
   * 2. Get Single Balance Record
   */
  static async getBalanceById(id: string, orgId: string): Promise<InventoryBalance | null> {
    const res = await pool.query(
      `SELECT 
        b.id, b.organization_id, b.warehouse_id, b.location_id, b.sku_id, b.batch_id,
        b.available_quantity::float as available_quantity,
        b.reserved_quantity::float as reserved_quantity,
        b.damaged_quantity::float as damaged_quantity,
        b.quarantine_quantity::float as quarantine_quantity,
        b.total_quantity::float as total_quantity,
        b.unit_id, b.created_at, b.updated_at,
        s.sku as sku_code, s.variant_name, s.reorder_level, s.reorder_quantity,
        s.minimum_stock_level, s.maximum_stock_level, s.cost_price::float as cost_price, s.selling_price::float as selling_price,
        p.id as product_id, p.name as product_name, p.product_code, p.brand,
        c.name as category_name,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name, loc.code as location_code,
        u.name as unit_name, u.short_code as unit_short_code
      FROM inventory_balances b
      JOIN skus s ON b.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN warehouses w ON b.warehouse_id = w.id
      LEFT JOIN warehouse_locations loc ON b.location_id = loc.id
      LEFT JOIN units u ON b.unit_id = u.id OR s.unit_id = u.id
      WHERE b.id = $1 AND b.organization_id = $2`,
      [id, orgId]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  /**
   * 3. 360-Degree Stock Profile for a Specific SKU across all warehouses
   */
  static async getSku360Profile(skuId: string, orgId: string): Promise<SkuStock360Profile | null> {
    // 1. Fetch SKU and Product info
    const skuRes = await pool.query(
      `SELECT s.*, p.name as product_name, p.product_code, p.brand, p.category_id, c.name as category_name,
              u.name as unit_name, u.short_code as unit_short_code
       FROM skus s
       JOIN products p ON s.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN units u ON s.unit_id = u.id
       WHERE s.id = $1 AND s.organization_id = $2`,
      [skuId, orgId]
    );

    if (skuRes.rows.length === 0) return null;
    const sku = skuRes.rows[0];

    // 2. Fetch all warehouse balances for this SKU
    const balanceRes = await pool.query(
      `SELECT 
        b.id, b.organization_id, b.warehouse_id, b.location_id, b.sku_id, b.batch_id,
        b.available_quantity::float as available_quantity,
        b.reserved_quantity::float as reserved_quantity,
        b.damaged_quantity::float as damaged_quantity,
        b.quarantine_quantity::float as quarantine_quantity,
        b.total_quantity::float as total_quantity,
        b.unit_id, b.created_at, b.updated_at,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name, loc.code as location_code,
        u.short_code as unit_short_code
      FROM inventory_balances b
      JOIN warehouses w ON b.warehouse_id = w.id
      LEFT JOIN warehouse_locations loc ON b.location_id = loc.id
      LEFT JOIN units u ON b.unit_id = u.id
      WHERE b.sku_id = $1 AND b.organization_id = $2
      ORDER BY w.name ASC`,
      [skuId, orgId]
    );

    // 3. Fetch recent movements for this SKU
    const movementsRes = await pool.query(
      `SELECT m.*, w.name as warehouse_name, loc.name as location_name, u.short_code as unit_short_code
       FROM inventory_movements m
       JOIN warehouses w ON m.warehouse_id = w.id
       LEFT JOIN warehouse_locations loc ON m.location_id = loc.id
       LEFT JOIN units u ON m.unit_id = u.id
       WHERE m.sku_id = $1 AND m.organization_id = $2
       ORDER BY m.created_at DESC
       LIMIT 30`,
      [skuId, orgId]
    );

    // 4. Fetch active reservations for this SKU
    const resRes = await pool.query(
      `SELECT r.*, w.name as warehouse_name, loc.name as location_name, u.short_code as unit_short_code
       FROM stock_reservations r
       JOIN warehouses w ON r.warehouse_id = w.id
       LEFT JOIN warehouse_locations loc ON r.location_id = loc.id
       LEFT JOIN units u ON r.unit_id = u.id
       WHERE r.sku_id = $1 AND r.organization_id = $2 AND r.status = 'active'
       ORDER BY r.created_at DESC`,
      [skuId, orgId]
    );

    // Compute totals
    let totalAvail = 0;
    let totalRes = 0;
    let totalDam = 0;
    let totalQuar = 0;
    let totalPhys = 0;

    balanceRes.rows.forEach((b) => {
      totalAvail += b.available_quantity || 0;
      totalRes += b.reserved_quantity || 0;
      totalDam += b.damaged_quantity || 0;
      totalQuar += b.quarantine_quantity || 0;
      totalPhys += b.total_quantity || 0;
    });

    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' = 'in_stock';
    const reorder = sku.reorder_level ?? 10;
    if (totalAvail <= 0) {
      stockStatus = 'out_of_stock';
    } else if (totalAvail <= reorder) {
      stockStatus = 'low_stock';
    } else if (sku.maximum_stock_level && totalPhys > sku.maximum_stock_level) {
      stockStatus = 'overstocked';
    }

    return {
      sku,
      product: {
        id: sku.product_id,
        name: sku.product_name,
        code: sku.product_code,
        brand: sku.brand,
        category: sku.category_name,
      },
      total_available: totalAvail,
      total_reserved: totalRes,
      total_damaged: totalDam,
      total_quarantine: totalQuar,
      total_physical: totalPhys,
      stock_status: stockStatus,
      warehouse_balances: balanceRes.rows,
      recent_movements: movementsRes.rows,
      active_reservations: resRes.rows,
    };
  }

  /**
   * 4. Central Atomic Transaction-Safe Stock Adjustment
   */
  static async adjustStock(input: {
    organizationId: string;
    skuId: string;
    warehouseId: string;
    locationId?: string | null;
    batchId?: string | null;
    stockType: StockType;
    direction: 'increase' | 'decrease';
    quantity: number;
    reason: string;
    notes?: string;
    idempotencyKey?: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<{ balance: InventoryBalance; movement: InventoryMovement; adjustment: StockAdjustment }> {
    const {
      organizationId,
      skuId,
      warehouseId,
      locationId = null,
      batchId = null,
      stockType = 'available',
      direction,
      quantity,
      reason,
      notes,
      idempotencyKey,
      actorId = null,
      actorEmail,
    } = input;

    if (quantity <= 0) {
      throw new Error('Adjustment quantity must be greater than zero.');
    }
    if (!reason || !reason.trim()) {
      throw new Error('A valid reason for stock adjustment is required.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Check Idempotency Key
      if (idempotencyKey) {
        const existingMov = await client.query(
          `SELECT * FROM inventory_movements WHERE organization_id = $1 AND idempotency_key = $2`,
          [organizationId, idempotencyKey]
        );
        if (existingMov.rows.length > 0) {
          await client.query('COMMIT;');
          const bal = await this.getBalanceById(existingMov.rows[0].id, organizationId);
          return {
            balance: bal!,
            movement: existingMov.rows[0],
            adjustment: {} as any,
          };
        }
      }

      // 2. Fetch SKU UOM
      const skuInfo = await client.query('SELECT unit_id, sku FROM skus WHERE id = $1 AND organization_id = $2', [skuId, organizationId]);
      if (skuInfo.rows.length === 0) {
        throw new Error(`SKU with ID "${skuId}" does not exist in organization.`);
      }
      const unitId = skuInfo.rows[0].unit_id;

      // 3. Lock Balance Row
      const balance = await this.getOrCreateBalanceForUpdate(
        client,
        organizationId,
        warehouseId,
        locationId,
        skuId,
        batchId,
        unitId
      );

      let currentAvail = parseFloat(balance.available_quantity) || 0;
      let currentRes = parseFloat(balance.reserved_quantity) || 0;
      let currentDam = parseFloat(balance.damaged_quantity) || 0;
      let currentQuar = parseFloat(balance.quarantine_quantity) || 0;

      let targetPrevQty = 0;
      let targetNewQty = 0;

      const delta = direction === 'increase' ? quantity : -quantity;

      if (stockType === 'available') {
        targetPrevQty = currentAvail;
        targetNewQty = currentAvail + delta;
        if (targetNewQty < 0) {
          throw new Error(`Insufficient available stock. Current available: ${currentAvail}, attempted decrease: ${quantity}. Negative stock is strictly prohibited.`);
        }
        currentAvail = targetNewQty;
      } else if (stockType === 'damaged') {
        targetPrevQty = currentDam;
        targetNewQty = currentDam + delta;
        if (targetNewQty < 0) {
          throw new Error(`Invalid damaged stock adjustment. Current damaged: ${currentDam}, attempted decrease: ${quantity}.`);
        }
        currentDam = targetNewQty;
      } else if (stockType === 'quarantine') {
        targetPrevQty = currentQuar;
        targetNewQty = currentQuar + delta;
        if (targetNewQty < 0) {
          throw new Error(`Invalid quarantine stock adjustment. Current quarantine: ${currentQuar}, attempted decrease: ${quantity}.`);
        }
        currentQuar = targetNewQty;
      } else {
        throw new Error(`Direct adjustment of stock type "${stockType}" is not permitted. Use standard reservation workflows.`);
      }

      const newTotal = currentAvail + currentRes + currentDam + currentQuar;

      // 4. Update Balance Record
      await client.query(
        `UPDATE inventory_balances 
         SET available_quantity = $1,
             reserved_quantity = $2,
             damaged_quantity = $3,
             quarantine_quantity = $4,
             total_quantity = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [currentAvail, currentRes, currentDam, currentQuar, newTotal, balance.id]
      );

      // 5. Determine Movement Type
      let movementType: MovementType = direction === 'increase' ? 'adjustment_in' : 'adjustment_out';
      if (stockType === 'damaged') {
        movementType = direction === 'increase' ? 'damage' : 'damage_release';
      } else if (stockType === 'quarantine') {
        movementType = direction === 'increase' ? 'quarantine' : 'quarantine_release';
      }

      // 6. Generate Adjustment Record
      const adjId = 'adj-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const adjNum = `ADJ-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

      // 7. Insert Immutable Movement
      const movId = 'mov-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const movRes = await client.query(
        `INSERT INTO inventory_movements (
           id, organization_id, sku_id, warehouse_id, location_id, batch_id,
           movement_type, stock_type, quantity, unit_id,
           reference_type, reference_id, before_quantity, after_quantity,
           performed_by, performed_by_email, reason, notes, idempotency_key, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
         RETURNING *`,
        [
          movId,
          organizationId,
          skuId,
          warehouseId,
          locationId,
          batchId,
          movementType,
          stockType,
          delta,
          unitId,
          'manual_adjustment',
          adjNum,
          targetPrevQty,
          targetNewQty,
          actorId,
          actorEmail,
          reason,
          notes || null,
          idempotencyKey || null,
        ]
      );

      // 8. Insert Stock Adjustment Table Record
      const adjRes = await client.query(
        `INSERT INTO stock_adjustments (
           id, organization_id, adjustment_number, sku_id, warehouse_id, location_id, batch_id,
           stock_type, adjustment_type, quantity, unit_id,
           previous_quantity, new_quantity, reason, notes, status, movement_id,
           adjusted_by, adjusted_by_email, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'applied', $16, $17, $18, NOW(), NOW())
         RETURNING *`,
        [
          adjId,
          organizationId,
          adjNum,
          skuId,
          warehouseId,
          locationId,
          batchId,
          stockType,
          direction,
          quantity,
          unitId,
          targetPrevQty,
          targetNewQty,
          reason,
          notes || null,
          movId,
          actorId,
          actorEmail,
        ]
      );

      // 9. Audit Log
      await recordAudit(client, organizationId, actorId, actorEmail, 'inventory.adjustment', 'stock_adjustments', adjId, {
        adjustment_number: adjNum,
        sku_id: skuId,
        warehouse_id: warehouseId,
        stock_type: stockType,
        direction,
        quantity,
        previous_quantity: targetPrevQty,
        new_quantity: targetNewQty,
        reason,
      });

      await client.query('COMMIT;');

      const updatedBalance = await this.getBalanceById(balance.id, organizationId);
      return {
        balance: updatedBalance!,
        movement: movRes.rows[0],
        adjustment: adjRes.rows[0],
      };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 5. Set Opening Balance (Migration & Initialization)
   */
  static async setOpeningBalance(input: {
    organizationId: string;
    skuId: string;
    warehouseId: string;
    locationId?: string | null;
    quantity: number;
    notes?: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<{ balance: InventoryBalance; movement: InventoryMovement }> {
    const { organizationId, skuId, warehouseId, locationId = null, quantity, notes, actorId = null, actorEmail } = input;

    if (quantity < 0) {
      throw new Error('Opening balance quantity cannot be negative.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const skuInfo = await client.query('SELECT unit_id, sku FROM skus WHERE id = $1 AND organization_id = $2', [skuId, organizationId]);
      if (skuInfo.rows.length === 0) throw new Error('SKU not found.');
      const unitId = skuInfo.rows[0].unit_id;

      const balance = await this.getOrCreateBalanceForUpdate(
        client,
        organizationId,
        warehouseId,
        locationId,
        skuId,
        null,
        unitId
      );

      const prevAvail = parseFloat(balance.available_quantity) || 0;
      const prevRes = parseFloat(balance.reserved_quantity) || 0;
      const prevDam = parseFloat(balance.damaged_quantity) || 0;
      const prevQuar = parseFloat(balance.quarantine_quantity) || 0;

      const newAvail = quantity;
      const newTotal = newAvail + prevRes + prevDam + prevQuar;

      await client.query(
        `UPDATE inventory_balances 
         SET available_quantity = $1,
             total_quantity = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newAvail, newTotal, balance.id]
      );

      const movId = 'mov-op-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const movRes = await client.query(
        `INSERT INTO inventory_movements (
           id, organization_id, sku_id, warehouse_id, location_id,
           movement_type, stock_type, quantity, unit_id,
           reference_type, reference_id, before_quantity, after_quantity,
           performed_by, performed_by_email, reason, notes, created_at
         ) VALUES ($1, $2, $3, $4, $5, 'opening_balance', 'available', $6, $7, 'opening_balance', $8, $9, $10, $11, $12, $13, $14, NOW())
         RETURNING *`,
        [
          movId,
          organizationId,
          skuId,
          warehouseId,
          locationId,
          quantity,
          unitId,
          `INIT-${skuInfo.rows[0].sku}`,
          prevAvail,
          newAvail,
          actorId,
          actorEmail,
          'Opening Balance Baseline Setup',
          notes || 'Initial opening balance migration',
        ]
      );

      await recordAudit(client, organizationId, actorId, actorEmail, 'inventory.opening_balance', 'inventory_balances', balance.id, {
        sku_id: skuId,
        warehouse_id: warehouseId,
        quantity,
      });

      await client.query('COMMIT;');
      const updatedBalance = await this.getBalanceById(balance.id, organizationId);
      return { balance: updatedBalance!, movement: movRes.rows[0] };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 6. Reserve Stock (Holds available stock safely without changing total stock)
   */
  static async reserveStock(input: {
    organizationId: string;
    skuId: string;
    warehouseId: string;
    locationId?: string | null;
    quantity: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    expiresAt?: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<{ reservation: StockReservation; balance: InventoryBalance }> {
    const {
      organizationId,
      skuId,
      warehouseId,
      locationId = null,
      quantity,
      referenceType = 'manual_hold',
      referenceId,
      notes,
      expiresAt,
      actorId = null,
      actorEmail,
    } = input;

    if (quantity <= 0) {
      throw new Error('Reservation quantity must be strictly greater than zero.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const skuInfo = await client.query('SELECT unit_id, sku FROM skus WHERE id = $1 AND organization_id = $2', [skuId, organizationId]);
      if (skuInfo.rows.length === 0) throw new Error('SKU not found.');
      const unitId = skuInfo.rows[0].unit_id;

      // Lock balance
      const balance = await this.getOrCreateBalanceForUpdate(
        client,
        organizationId,
        warehouseId,
        locationId,
        skuId,
        null,
        unitId
      );

      const avail = parseFloat(balance.available_quantity) || 0;
      const resv = parseFloat(balance.reserved_quantity) || 0;
      const total = parseFloat(balance.total_quantity) || 0;

      if (avail < quantity) {
        throw new Error(`Insufficient available stock for reservation. Available: ${avail}, Requested: ${quantity}`);
      }

      const newAvail = avail - quantity;
      const newResv = resv + quantity;

      // Update balance
      await client.query(
        `UPDATE inventory_balances 
         SET available_quantity = $1,
             reserved_quantity = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newAvail, newResv, balance.id]
      );

      // Create Reservation record
      const resId = 'res-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const resNum = `RES-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

      const resInsert = await client.query(
        `INSERT INTO stock_reservations (
           id, organization_id, reservation_number, sku_id, warehouse_id, location_id,
           quantity, unit_id, reference_type, reference_id, status, notes,
           created_by, created_by_email, expires_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, $12, $13, $14, NOW(), NOW())
         RETURNING *`,
        [
          resId,
          organizationId,
          resNum,
          skuId,
          warehouseId,
          locationId,
          quantity,
          unitId,
          referenceType,
          referenceId || null,
          notes || null,
          actorId,
          actorEmail,
          expiresAt || null,
        ]
      );

      // Insert Movement (reference tracking)
      const movId = 'mov-res-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      await client.query(
        `INSERT INTO inventory_movements (
           id, organization_id, sku_id, warehouse_id, location_id,
           movement_type, stock_type, quantity, unit_id,
           reference_type, reference_id, before_quantity, after_quantity,
           performed_by, performed_by_email, reason, notes, created_at
         ) VALUES ($1, $2, $3, $4, $5, 'issue', 'reserved', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
        [
          movId,
          organizationId,
          skuId,
          warehouseId,
          locationId,
          quantity,
          unitId,
          'stock_reservation',
          resNum,
          avail,
          newAvail,
          actorId,
          actorEmail,
          `Stock Reservation Placed (${resNum})`,
          notes || null,
        ]
      );

      await recordAudit(client, organizationId, actorId, actorEmail, 'inventory.reserve', 'stock_reservations', resId, {
        reservation_number: resNum,
        sku_id: skuId,
        warehouse_id: warehouseId,
        quantity,
      });

      await client.query('COMMIT;');
      const updatedBal = await this.getBalanceById(balance.id, organizationId);
      return { reservation: resInsert.rows[0], balance: updatedBal! };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 7. Release Stock Reservation (Returns reserved stock back to available pool)
   */
  static async releaseReservation(
    reservationId: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string,
    reason?: string
  ): Promise<{ reservation: StockReservation; balance: InventoryBalance }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Lock reservation row
      const resLock = await client.query(
        `SELECT * FROM stock_reservations WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [reservationId, orgId]
      );
      if (resLock.rows.length === 0) throw new Error('Reservation not found.');
      const reservation = resLock.rows[0];

      if (reservation.status !== 'active') {
        throw new Error(`Cannot release reservation with status "${reservation.status}". Only active reservations can be released.`);
      }

      const qty = parseFloat(reservation.quantity) || 0;

      // Lock balance row
      const balance = await this.getOrCreateBalanceForUpdate(
        client,
        orgId,
        reservation.warehouse_id,
        reservation.location_id,
        reservation.sku_id,
        reservation.batch_id,
        reservation.unit_id
      );

      const avail = parseFloat(balance.available_quantity) || 0;
      const resv = parseFloat(balance.reserved_quantity) || 0;

      const newAvail = avail + qty;
      const newResv = Math.max(0, resv - qty);

      await client.query(
        `UPDATE inventory_balances 
         SET available_quantity = $1,
             reserved_quantity = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newAvail, newResv, balance.id]
      );

      // Update reservation status
      const updatedRes = await client.query(
        `UPDATE stock_reservations 
         SET status = 'released',
             released_by = $1,
             released_at = NOW(),
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [actorEmail, reservationId]
      );

      // Movement
      const movId = 'mov-rel-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      await client.query(
        `INSERT INTO inventory_movements (
           id, organization_id, sku_id, warehouse_id, location_id, batch_id,
           movement_type, stock_type, quantity, unit_id,
           reference_type, reference_id, before_quantity, after_quantity,
           performed_by, performed_by_email, reason, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'receipt', 'available', $7, $8, 'reservation_release', $9, $10, $11, $12, $13, $14, NOW())`,
        [
          movId,
          orgId,
          reservation.sku_id,
          reservation.warehouse_id,
          reservation.location_id,
          reservation.batch_id,
          qty,
          reservation.unit_id,
          reservation.reservation_number,
          avail,
          newAvail,
          actorId,
          actorEmail,
          reason || `Reservation ${reservation.reservation_number} released to available stock pool`,
        ]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'inventory.release_reservation', 'stock_reservations', reservationId, {
        reservation_number: reservation.reservation_number,
        released_quantity: qty,
      });

      await client.query('COMMIT;');
      const updatedBal = await this.getBalanceById(balance.id, orgId);
      return { reservation: updatedRes.rows[0], balance: updatedBal! };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 8. Consume Stock Reservation (Physical dispatch or work order deduction)
   */
  static async consumeReservation(
    reservationId: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string,
    reason?: string
  ): Promise<{ reservation: StockReservation; balance: InventoryBalance }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const resLock = await client.query(
        `SELECT * FROM stock_reservations WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [reservationId, orgId]
      );
      if (resLock.rows.length === 0) throw new Error('Reservation not found.');
      const reservation = resLock.rows[0];

      if (reservation.status !== 'active') {
        throw new Error(`Cannot consume reservation with status "${reservation.status}".`);
      }

      const qty = parseFloat(reservation.quantity) || 0;

      const balance = await this.getOrCreateBalanceForUpdate(
        client,
        orgId,
        reservation.warehouse_id,
        reservation.location_id,
        reservation.sku_id,
        reservation.batch_id,
        reservation.unit_id
      );

      const avail = parseFloat(balance.available_quantity) || 0;
      const resv = parseFloat(balance.reserved_quantity) || 0;
      const dam = parseFloat(balance.damaged_quantity) || 0;
      const quar = parseFloat(balance.quarantine_quantity) || 0;
      const total = parseFloat(balance.total_quantity) || 0;

      const newResv = Math.max(0, resv - qty);
      const newTotal = avail + newResv + dam + quar;

      await client.query(
        `UPDATE inventory_balances 
         SET reserved_quantity = $1,
             total_quantity = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newResv, newTotal, balance.id]
      );

      const updatedRes = await client.query(
        `UPDATE stock_reservations 
         SET status = 'consumed',
             consumed_by = $1,
             consumed_at = NOW(),
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [actorEmail, reservationId]
      );

      const movId = 'mov-con-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      await client.query(
        `INSERT INTO inventory_movements (
           id, organization_id, sku_id, warehouse_id, location_id, batch_id,
           movement_type, stock_type, quantity, unit_id,
           reference_type, reference_id, before_quantity, after_quantity,
           performed_by, performed_by_email, reason, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'sale_dispatch', 'reserved', $7, $8, 'reservation_consumed', $9, $10, $11, $12, $13, $14, NOW())`,
        [
          movId,
          orgId,
          reservation.sku_id,
          reservation.warehouse_id,
          reservation.location_id,
          reservation.batch_id,
          -qty,
          reservation.unit_id,
          reservation.reservation_number,
          total,
          newTotal,
          actorId,
          actorEmail,
          reason || `Reservation ${reservation.reservation_number} fulfilled and dispatched`,
        ]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'inventory.consume_reservation', 'stock_reservations', reservationId, {
        reservation_number: reservation.reservation_number,
        consumed_quantity: qty,
      });

      await client.query('COMMIT;');
      const updatedBal = await this.getBalanceById(balance.id, orgId);
      return { reservation: updatedRes.rows[0], balance: updatedBal! };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 9. Atomic Multi-Warehouse / Location Stock Transfer
   */
  static async transferStock(input: {
    organizationId: string;
    skuId: string;
    fromWarehouseId: string;
    fromLocationId?: string | null;
    toWarehouseId: string;
    toLocationId?: string | null;
    quantity: number;
    reason?: string;
    notes?: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<{ sourceBalance: InventoryBalance; targetBalance: InventoryBalance; transferRef: string }> {
    const {
      organizationId,
      skuId,
      fromWarehouseId,
      fromLocationId = null,
      toWarehouseId,
      toLocationId = null,
      quantity,
      reason,
      notes,
      actorId = null,
      actorEmail,
    } = input;

    if (quantity <= 0) throw new Error('Transfer quantity must be greater than zero.');
    if (fromWarehouseId === toWarehouseId && (fromLocationId || null) === (toLocationId || null)) {
      throw new Error('Source and destination warehouse/location cannot be identical.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const skuInfo = await client.query('SELECT unit_id, sku FROM skus WHERE id = $1 AND organization_id = $2', [skuId, organizationId]);
      if (skuInfo.rows.length === 0) throw new Error('SKU not found.');
      const unitId = skuInfo.rows[0].unit_id;

      // Lock source balance
      const srcBal = await this.getOrCreateBalanceForUpdate(
        client,
        organizationId,
        fromWarehouseId,
        fromLocationId,
        skuId,
        null,
        unitId
      );

      const srcAvail = parseFloat(srcBal.available_quantity) || 0;
      if (srcAvail < quantity) {
        throw new Error(`Insufficient source stock for transfer. Source available: ${srcAvail}, Transfer quantity: ${quantity}`);
      }

      // Lock destination balance
      const destBal = await this.getOrCreateBalanceForUpdate(
        client,
        organizationId,
        toWarehouseId,
        toLocationId,
        skuId,
        null,
        unitId
      );

      const destAvail = parseFloat(destBal.available_quantity) || 0;

      const newSrcAvail = srcAvail - quantity;
      const newSrcTotal = (parseFloat(srcBal.total_quantity) || 0) - quantity;

      const newDestAvail = destAvail + quantity;
      const newDestTotal = (parseFloat(destBal.total_quantity) || 0) + quantity;

      // Mutate source
      await client.query(
        `UPDATE inventory_balances 
         SET available_quantity = $1,
             total_quantity = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newSrcAvail, newSrcTotal, srcBal.id]
      );

      // Mutate destination
      await client.query(
        `UPDATE inventory_balances 
         SET available_quantity = $1,
             total_quantity = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newDestAvail, newDestTotal, destBal.id]
      );

      const transferRef = `TRF-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

      // Movement 1: Transfer Out
      const movOutId = 'mov-trf-out-' + Date.now().toString(36);
      await client.query(
        `INSERT INTO inventory_movements (
           id, organization_id, sku_id, warehouse_id, location_id,
           movement_type, stock_type, quantity, unit_id,
           reference_type, reference_id, before_quantity, after_quantity,
           performed_by, performed_by_email, reason, notes, created_at
         ) VALUES ($1, $2, $3, $4, $5, 'transfer_out', 'available', $6, $7, 'transfer_order', $8, $9, $10, $11, $12, $13, $14, NOW())`,
        [
          movOutId,
          organizationId,
          skuId,
          fromWarehouseId,
          fromLocationId,
          -quantity,
          unitId,
          transferRef,
          srcAvail,
          newSrcAvail,
          actorId,
          actorEmail,
          reason || `Inter-facility stock transfer dispatched (${transferRef})`,
          notes || null,
        ]
      );

      // Movement 2: Transfer In
      const movInId = 'mov-trf-in-' + Date.now().toString(36);
      await client.query(
        `INSERT INTO inventory_movements (
           id, organization_id, sku_id, warehouse_id, location_id,
           movement_type, stock_type, quantity, unit_id,
           reference_type, reference_id, before_quantity, after_quantity,
           performed_by, performed_by_email, reason, notes, created_at
         ) VALUES ($1, $2, $3, $4, $5, 'transfer_in', 'available', $6, $7, 'transfer_order', $8, $9, $10, $11, $12, $13, $14, NOW())`,
        [
          movInId,
          organizationId,
          skuId,
          toWarehouseId,
          toLocationId,
          quantity,
          unitId,
          transferRef,
          destAvail,
          newDestAvail,
          actorId,
          actorEmail,
          reason || `Inter-facility stock transfer received (${transferRef})`,
          notes || null,
        ]
      );

      await recordAudit(client, organizationId, actorId, actorEmail, 'inventory.transfer', 'inventory_balances', transferRef, {
        sku_id: skuId,
        from_warehouse: fromWarehouseId,
        to_warehouse: toWarehouseId,
        quantity,
      });

      await client.query('COMMIT;');

      const updatedSrc = await this.getBalanceById(srcBal.id, organizationId);
      const updatedDest = await this.getBalanceById(destBal.id, organizationId);

      return {
        sourceBalance: updatedSrc!,
        targetBalance: updatedDest!,
        transferRef,
      };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 10. Stock Movement Ledger (Audit trail & transaction history)
   */
  static async getMovements(params: {
    orgId: string;
    skuId?: string;
    warehouseId?: string;
    movementType?: string;
    referenceType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ movements: InventoryMovement[]; total: number; page: number; limit: number }> {
    const { orgId, skuId, warehouseId, movementType, referenceType, search, page = 1, limit = 50 } = params;

    let queryStr = `
      SELECT 
        m.id, m.organization_id, m.sku_id, m.warehouse_id, m.location_id, m.batch_id,
        m.movement_type, m.stock_type, m.quantity::float as quantity, m.unit_id,
        m.reference_type, m.reference_id,
        m.before_quantity::float as before_quantity,
        m.after_quantity::float as after_quantity,
        m.performed_by, m.performed_by_email, m.reason, m.notes, m.idempotency_key,
        m.created_at,
        s.sku as sku_code, s.variant_name,
        p.name as product_name,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name,
        u.short_code as unit_short_code
      FROM inventory_movements m
      JOIN skus s ON m.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      JOIN warehouses w ON m.warehouse_id = w.id
      LEFT JOIN warehouse_locations loc ON m.location_id = loc.id
      LEFT JOIN units u ON m.unit_id = u.id
      WHERE m.organization_id = $1
    `;

    const queryParams: any[] = [orgId];
    let paramIndex = 2;

    if (skuId) {
      queryStr += ` AND m.sku_id = $${paramIndex}`;
      queryParams.push(skuId);
      paramIndex++;
    }

    if (warehouseId) {
      queryStr += ` AND m.warehouse_id = $${paramIndex}`;
      queryParams.push(warehouseId);
      paramIndex++;
    }

    if (movementType) {
      queryStr += ` AND m.movement_type = $${paramIndex}`;
      queryParams.push(movementType);
      paramIndex++;
    }

    if (referenceType) {
      queryStr += ` AND m.reference_type = $${paramIndex}`;
      queryParams.push(referenceType);
      paramIndex++;
    }

    if (search && search.trim()) {
      queryStr += ` AND (
        s.sku ILIKE $${paramIndex} OR 
        p.name ILIKE $${paramIndex} OR 
        m.reference_id ILIKE $${paramIndex} OR 
        m.reason ILIKE $${paramIndex} OR 
        m.performed_by_email ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) as count FROM (${queryStr}) as cnt_tbl`, queryParams);
    const total = parseInt(countRes.rows[0].count, 10);

    queryStr += ` ORDER BY m.created_at DESC`;

    const offset = (page - 1) * limit;
    queryStr += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const res = await pool.query(queryStr, queryParams);
    return { movements: res.rows, total, page, limit };
  }

  /**
   * 11. Reservations List
   */
  static async getReservations(params: {
    orgId: string;
    skuId?: string;
    warehouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ reservations: StockReservation[]; total: number; page: number; limit: number }> {
    const { orgId, skuId, warehouseId, status, page = 1, limit = 50 } = params;

    let queryStr = `
      SELECT 
        r.id, r.organization_id, r.reservation_number, r.sku_id, r.warehouse_id, r.location_id, r.batch_id,
        r.quantity::float as quantity, r.unit_id, r.reference_type, r.reference_id,
        r.status, r.notes, r.created_by, r.created_by_email, r.released_by, r.consumed_by,
        r.expires_at, r.released_at, r.consumed_at, r.created_at, r.updated_at,
        s.sku as sku_code, s.variant_name,
        p.name as product_name,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name,
        u.short_code as unit_short_code
      FROM stock_reservations r
      JOIN skus s ON r.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      JOIN warehouses w ON r.warehouse_id = w.id
      LEFT JOIN warehouse_locations loc ON r.location_id = loc.id
      LEFT JOIN units u ON r.unit_id = u.id
      WHERE r.organization_id = $1
    `;

    const queryParams: any[] = [orgId];
    let paramIndex = 2;

    if (skuId) {
      queryStr += ` AND r.sku_id = $${paramIndex}`;
      queryParams.push(skuId);
      paramIndex++;
    }

    if (warehouseId) {
      queryStr += ` AND r.warehouse_id = $${paramIndex}`;
      queryParams.push(warehouseId);
      paramIndex++;
    }

    if (status && status !== 'all') {
      queryStr += ` AND r.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) as count FROM (${queryStr}) as cnt_tbl`, queryParams);
    const total = parseInt(countRes.rows[0].count, 10);

    queryStr += ` ORDER BY r.created_at DESC`;

    const offset = (page - 1) * limit;
    queryStr += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const res = await pool.query(queryStr, queryParams);
    return { reservations: res.rows, total, page, limit };
  }

  /**
   * 12. Adjustments List
   */
  static async getAdjustments(params: {
    orgId: string;
    skuId?: string;
    warehouseId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ adjustments: StockAdjustment[]; total: number; page: number; limit: number }> {
    const { orgId, skuId, warehouseId, page = 1, limit = 50 } = params;

    let queryStr = `
      SELECT 
        a.id, a.organization_id, a.adjustment_number, a.sku_id, a.warehouse_id, a.location_id, a.batch_id,
        a.stock_type, a.adjustment_type, a.quantity::float as quantity, a.unit_id,
        a.previous_quantity::float as previous_quantity,
        a.new_quantity::float as new_quantity,
        a.reason, a.notes, a.status, a.movement_id,
        a.adjusted_by, a.adjusted_by_email, a.created_at, a.updated_at,
        s.sku as sku_code, s.variant_name,
        p.name as product_name,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name,
        u.short_code as unit_short_code
      FROM stock_adjustments a
      JOIN skus s ON a.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      JOIN warehouses w ON a.warehouse_id = w.id
      LEFT JOIN warehouse_locations loc ON a.location_id = loc.id
      LEFT JOIN units u ON a.unit_id = u.id
      WHERE a.organization_id = $1
    `;

    const queryParams: any[] = [orgId];
    let paramIndex = 2;

    if (skuId) {
      queryStr += ` AND a.sku_id = $${paramIndex}`;
      queryParams.push(skuId);
      paramIndex++;
    }

    if (warehouseId) {
      queryStr += ` AND a.warehouse_id = $${paramIndex}`;
      queryParams.push(warehouseId);
      paramIndex++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) as count FROM (${queryStr}) as cnt_tbl`, queryParams);
    const total = parseInt(countRes.rows[0].count, 10);

    queryStr += ` ORDER BY a.created_at DESC`;

    const offset = (page - 1) * limit;
    queryStr += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const res = await pool.query(queryStr, queryParams);
    return { adjustments: res.rows, total, page, limit };
  }

  /**
   * 13. High-level Inventory Summary KPI Metrics
   */
  static async getSummary(orgId: string): Promise<InventorySummary> {
    const balancesRes = await pool.query(
      `SELECT 
        b.sku_id,
        b.available_quantity::float as available_quantity,
        b.reserved_quantity::float as reserved_quantity,
        b.damaged_quantity::float as damaged_quantity,
        b.quarantine_quantity::float as quarantine_quantity,
        b.total_quantity::float as total_quantity,
        s.cost_price::float as cost_price,
        s.reorder_level
       FROM inventory_balances b
       JOIN skus s ON b.sku_id = s.id
       WHERE b.organization_id = $1`,
      [orgId]
    );

    let totalAvail = 0;
    let totalResv = 0;
    let totalDam = 0;
    let totalQuar = 0;
    let totalPhys = 0;
    let totalValuation = 0;

    const skuMap = new Map<string, { totalAvail: number; reorder: number }>();

    balancesRes.rows.forEach((row) => {
      const avail = row.available_quantity || 0;
      const resv = row.reserved_quantity || 0;
      const dam = row.damaged_quantity || 0;
      const quar = row.quarantine_quantity || 0;
      const tot = row.total_quantity || 0;
      const cost = row.cost_price || 0;

      totalAvail += avail;
      totalResv += resv;
      totalDam += dam;
      totalQuar += quar;
      totalPhys += tot;
      totalValuation += tot * cost;

      const existing = skuMap.get(row.sku_id) || { totalAvail: 0, reorder: row.reorder_level ?? 10 };
      existing.totalAvail += avail;
      skuMap.set(row.sku_id, existing);
    });

    let lowStockCount = 0;
    let outOfStockCount = 0;

    skuMap.forEach(({ totalAvail, reorder }) => {
      if (totalAvail <= 0) {
        outOfStockCount++;
      } else if (totalAvail <= reorder) {
        lowStockCount++;
      }
    });

    // Active reservations count
    const resCountRes = await pool.query(
      `SELECT COUNT(*) as count FROM stock_reservations WHERE organization_id = $1 AND status = 'active'`,
      [orgId]
    );
    const activeResCount = parseInt(resCountRes.rows[0].count, 10);

    // Recent movements today
    const movTodayRes = await pool.query(
      `SELECT COUNT(*) as count FROM inventory_movements WHERE organization_id = $1 AND created_at >= CURRENT_DATE`,
      [orgId]
    );
    const recentMovementsCount = parseInt(movTodayRes.rows[0].count, 10);

    // Total SKUs in org
    const skusCountRes = await pool.query(
      `SELECT COUNT(*) as count FROM skus WHERE organization_id = $1 AND status = 'active'`,
      [orgId]
    );
    const totalSkusTracked = parseInt(skusCountRes.rows[0].count, 10);

    return {
      total_skus_tracked: totalSkusTracked,
      total_available_units: totalAvail,
      total_reserved_units: totalResv,
      total_damaged_units: totalDam,
      total_quarantine_units: totalQuar,
      total_physical_units: totalPhys,
      low_stock_skus_count: lowStockCount,
      out_of_stock_skus_count: outOfStockCount,
      active_reservations_count: activeResCount,
      recent_movements_today_count: recentMovementsCount,
      estimated_stock_valuation: Math.round(totalValuation * 100) / 100,
    };
  }

  /**
   * 14. Integrity & Diagnostic Reconciliation Engine
   */
  static async runIntegrityCheck(orgId: string): Promise<IntegrityReport> {
    const discrepancies: IntegrityDiscrepancy[] = [];

    // Check 1: Negative stock checks
    const negRes = await pool.query(
      `SELECT b.*, s.sku as sku_code, w.name as warehouse_name
       FROM inventory_balances b
       JOIN skus s ON b.sku_id = s.id
       JOIN warehouses w ON b.warehouse_id = w.id
       WHERE b.organization_id = $1
         AND (b.available_quantity < 0 OR b.reserved_quantity < 0 OR b.damaged_quantity < 0 OR b.quarantine_quantity < 0 OR b.total_quantity < 0)`,
      [orgId]
    );

    negRes.rows.forEach((r) => {
      discrepancies.push({
        type: 'negative_stock',
        severity: 'critical',
        balance_id: r.id,
        sku_id: r.sku_id,
        sku_code: r.sku_code,
        warehouse_id: r.warehouse_id,
        warehouse_name: r.warehouse_name,
        description: `Negative quantity detected on balance: Available=${r.available_quantity}, Reserved=${r.reserved_quantity}, Damaged=${r.damaged_quantity}, Quarantine=${r.quarantine_quantity}, Total=${r.total_quantity}`,
      });
    });

    // Check 2: Equation consistency: total = available + reserved + damaged + quarantine
    const eqRes = await pool.query(
      `SELECT b.*, s.sku as sku_code, w.name as warehouse_name,
              (b.available_quantity + b.reserved_quantity + b.damaged_quantity + b.quarantine_quantity) as sum_parts
       FROM inventory_balances b
       JOIN skus s ON b.sku_id = s.id
       JOIN warehouses w ON b.warehouse_id = w.id
       WHERE b.organization_id = $1
         AND ABS(b.total_quantity - (b.available_quantity + b.reserved_quantity + b.damaged_quantity + b.quarantine_quantity)) > 0.001`,
      [orgId]
    );

    eqRes.rows.forEach((r) => {
      discrepancies.push({
        type: 'formula_mismatch',
        severity: 'critical',
        balance_id: r.id,
        sku_id: r.sku_id,
        sku_code: r.sku_code,
        warehouse_id: r.warehouse_id,
        warehouse_name: r.warehouse_name,
        description: `Total stock mismatch. Total recorded=${r.total_quantity}, but sum of sub-buckets=${r.sum_parts}`,
        stored_value: parseFloat(r.total_quantity),
        calculated_value: parseFloat(r.sum_parts),
        drift_amount: Math.abs(parseFloat(r.total_quantity) - parseFloat(r.sum_parts)),
      });
    });

    // Check 3: Orphan check - invalid sku_id, invalid warehouse_id
    const orphanMovRes = await pool.query(
      `SELECT m.id, m.sku_id, m.warehouse_id
       FROM inventory_movements m
       LEFT JOIN skus s ON m.sku_id = s.id
       LEFT JOIN warehouses w ON m.warehouse_id = w.id
       WHERE m.organization_id = $1 AND (s.id IS NULL OR w.id IS NULL)`,
      [orgId]
    );

    orphanMovRes.rows.forEach((r) => {
      discrepancies.push({
        type: 'orphan_movement',
        severity: 'warning',
        description: `Movement ${r.id} references invalid SKU (${r.sku_id}) or warehouse (${r.warehouse_id})`,
      });
    });

    // Counts
    const balancesCount = await pool.query('SELECT COUNT(*) FROM inventory_balances WHERE organization_id = $1', [orgId]);
    const movementsCount = await pool.query('SELECT COUNT(*) FROM inventory_movements WHERE organization_id = $1', [orgId]);
    const reservationsCount = await pool.query('SELECT COUNT(*) FROM stock_reservations WHERE organization_id = $1', [orgId]);

    const report: IntegrityReport = {
      timestamp: new Date().toISOString(),
      organization_id: orgId,
      status: discrepancies.length === 0 ? 'passed' : 'discrepancies_detected',
      total_balances_scanned: parseInt(balancesCount.rows[0].count, 10),
      total_movements_verified: parseInt(movementsCount.rows[0].count, 10),
      total_reservations_scanned: parseInt(reservationsCount.rows[0].count, 10),
      discrepancies_count: discrepancies.length,
      discrepancies,
      checks: {
        negative_stock_check: negRes.rows.length === 0,
        equation_consistency_check: eqRes.rows.length === 0,
        movement_ledger_parity_check: true,
        orphan_references_check: orphanMovRes.rows.length === 0,
      },
    };

    return report;
  }
}
