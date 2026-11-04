import { PoolClient } from 'pg';
import { pool } from './db.ts';
import { InventoryService } from './inventory-service.ts';
import {
  WarehouseMaster,
  WarehouseLocationHierarchy,
  WarehouseTransfer,
  WarehouseTransferItem,
  StockCountSession,
  StockCountItem,
  WarehouseAssignment,
  WarehouseSummaryMetrics,
  TransferStatus,
  CountSessionStatus,
  LocationType,
} from '../types/warehouse.ts';

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
    console.warn('[Warehouse Audit Log Error]', err);
  }
}

export class WarehouseService {
  // ==========================================
  // 1. WAREHOUSE MASTER OPERATIONS
  // ==========================================

  static async getWarehouses(params: {
    orgId: string;
    search?: string;
    type?: string;
    status?: string;
    city?: string;
    state?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ warehouses: WarehouseMaster[]; total: number; page: number; limit: number }> {
    const {
      orgId,
      search,
      type,
      status,
      city,
      state,
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc',
    } = params;

    let queryStr = `
      SELECT 
        w.id, w.organization_id, w.branch_id, w.name, w.code, w.warehouse_type,
        w.address, w.address_line1, w.city, w.state, w.postal_code, w.country,
        w.contact_name, w.contact_person, w.phone, w.contact_phone, w.email, w.contact_email,
        w.capacity_cubic_meters::float as capacity_cubic_meters,
        w.capacity_sq_ft::float as capacity_sq_ft,
        w.notes, w.status, w.created_at, w.updated_at,
        b.name as branch_name,
        COALESCE(loc_cnt.total_locations, 0) as total_locations_count,
        COALESCE(inv_agg.total_skus, 0) as total_skus_count,
        COALESCE(inv_agg.total_units, 0) as total_units_count,
        COALESCE(trf_cnt.pending_transfers, 0) as pending_transfers_count,
        COALESCE(cnt_cnt.active_counts, 0) as active_counts_count
      FROM warehouses w
      LEFT JOIN branches b ON w.branch_id = b.id
      LEFT JOIN (
        SELECT warehouse_id, COUNT(*) as total_locations 
        FROM warehouse_locations 
        WHERE status = 'active'
        GROUP BY warehouse_id
      ) loc_cnt ON loc_cnt.warehouse_id = w.id
      LEFT JOIN (
        SELECT warehouse_id, COUNT(DISTINCT sku_id) as total_skus, SUM(total_quantity) as total_units
        FROM inventory_balances
        GROUP BY warehouse_id
      ) inv_agg ON inv_agg.warehouse_id = w.id
      LEFT JOIN (
        SELECT source_warehouse_id, COUNT(*) as pending_transfers
        FROM warehouse_transfers
        WHERE status IN ('requested', 'approved', 'in_transit')
        GROUP BY source_warehouse_id
      ) trf_cnt ON trf_cnt.source_warehouse_id = w.id
      LEFT JOIN (
        SELECT warehouse_id, COUNT(*) as active_counts
        FROM stock_count_sessions
        WHERE status IN ('draft', 'in_progress', 'submitted')
        GROUP BY warehouse_id
      ) cnt_cnt ON cnt_cnt.warehouse_id = w.id
      WHERE w.organization_id = $1
    `;

    const queryParams: any[] = [orgId];
    let paramIndex = 2;

    if (search && search.trim()) {
      queryStr += ` AND (
        w.name ILIKE $${paramIndex} OR 
        w.code ILIKE $${paramIndex} OR 
        w.city ILIKE $${paramIndex} OR 
        w.state ILIKE $${paramIndex} OR
        w.contact_name ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (type && type !== 'all') {
      queryStr += ` AND w.warehouse_type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (status && status !== 'all') {
      queryStr += ` AND w.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (city && city.trim()) {
      queryStr += ` AND w.city ILIKE $${paramIndex}`;
      queryParams.push(`%${city.trim()}%`);
      paramIndex++;
    }

    if (state && state.trim()) {
      queryStr += ` AND w.state ILIKE $${paramIndex}`;
      queryParams.push(`%${state.trim()}%`);
      paramIndex++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) as count FROM (${queryStr}) as cnt_tbl`, queryParams);
    const total = parseInt(countRes.rows[0].count, 10);

    const safeSort = ['name', 'code', 'warehouse_type', 'city', 'status', 'created_at', 'updated_at'].includes(sortBy)
      ? sortBy
      : 'name';
    const safeOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    queryStr += ` ORDER BY w.${safeSort} ${safeOrder}`;

    const offset = (page - 1) * limit;
    queryStr += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const res = await pool.query(queryStr, queryParams);
    return { warehouses: res.rows, total, page, limit };
  }

  static async getWarehouseById(id: string, orgId: string): Promise<WarehouseMaster | null> {
    const res = await pool.query(
      `SELECT 
        w.id, w.organization_id, w.branch_id, w.name, w.code, w.warehouse_type,
        w.address, w.address_line1, w.city, w.state, w.postal_code, w.country,
        w.contact_name, w.contact_person, w.phone, w.contact_phone, w.email, w.contact_email,
        w.capacity_cubic_meters::float as capacity_cubic_meters,
        w.capacity_sq_ft::float as capacity_sq_ft,
        w.notes, w.status, w.created_at, w.updated_at,
        b.name as branch_name,
        COALESCE(loc_cnt.total_locations, 0) as total_locations_count,
        COALESCE(inv_agg.total_skus, 0) as total_skus_count,
        COALESCE(inv_agg.total_units, 0) as total_units_count,
        COALESCE(trf_cnt.pending_transfers, 0) as pending_transfers_count,
        COALESCE(cnt_cnt.active_counts, 0) as active_counts_count
      FROM warehouses w
      LEFT JOIN branches b ON w.branch_id = b.id
      LEFT JOIN (
        SELECT warehouse_id, COUNT(*) as total_locations 
        FROM warehouse_locations 
        WHERE status = 'active'
        GROUP BY warehouse_id
      ) loc_cnt ON loc_cnt.warehouse_id = w.id
      LEFT JOIN (
        SELECT warehouse_id, COUNT(DISTINCT sku_id) as total_skus, SUM(total_quantity) as total_units
        FROM inventory_balances
        GROUP BY warehouse_id
      ) inv_agg ON inv_agg.warehouse_id = w.id
      LEFT JOIN (
        SELECT source_warehouse_id, COUNT(*) as pending_transfers
        FROM warehouse_transfers
        WHERE status IN ('requested', 'approved', 'in_transit')
        GROUP BY source_warehouse_id
      ) trf_cnt ON trf_cnt.source_warehouse_id = w.id
      LEFT JOIN (
        SELECT warehouse_id, COUNT(*) as active_counts
        FROM stock_count_sessions
        WHERE status IN ('draft', 'in_progress', 'submitted')
        GROUP BY warehouse_id
      ) cnt_cnt ON cnt_cnt.warehouse_id = w.id
      WHERE w.id = $1 AND w.organization_id = $2`,
      [id, orgId]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  static async createWarehouse(input: {
    orgId: string;
    branchId?: string | null;
    code: string;
    name: string;
    warehouseType: string;
    address?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    capacityCubicMeters?: number;
    capacitySqFt?: number;
    notes?: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<WarehouseMaster> {
    const {
      orgId,
      branchId = null,
      code,
      name,
      warehouseType,
      address,
      addressLine1,
      city,
      state,
      postalCode,
      country = 'India',
      contactName,
      contactPhone,
      contactEmail,
      capacityCubicMeters,
      capacitySqFt,
      notes,
      actorId = null,
      actorEmail,
    } = input;

    if (!code || !code.trim()) throw new Error('Warehouse code is required.');
    if (!name || !name.trim()) throw new Error('Warehouse name is required.');
    if (!warehouseType || !warehouseType.trim()) throw new Error('Warehouse type is required.');

    const cleanCode = code.trim().toUpperCase();

    // Check unique code per org
    const dupCheck = await pool.query(
      'SELECT id FROM warehouses WHERE organization_id = $1 AND UPPER(code) = $2',
      [orgId, cleanCode]
    );
    if (dupCheck.rows.length > 0) {
      throw new Error(`Warehouse with code "${cleanCode}" already exists in organization.`);
    }

    const id = 'wh-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const insertRes = await client.query(
        `INSERT INTO warehouses (
           id, organization_id, branch_id, name, code, warehouse_type,
           address, address_line1, city, state, postal_code, country,
           contact_name, contact_person, phone, contact_phone, email, contact_email,
           capacity_cubic_meters, capacity_sq_ft, notes, status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'active', NOW(), NOW())
         RETURNING *`,
        [
          id,
          orgId,
          branchId || null,
          name.trim(),
          cleanCode,
          warehouseType,
          address || addressLine1 || null,
          addressLine1 || address || null,
          city || null,
          state || null,
          postalCode || null,
          country,
          contactName || null,
          contactName || null,
          contactPhone || null,
          contactPhone || null,
          contactEmail || null,
          contactEmail || null,
          capacityCubicMeters || null,
          capacitySqFt || null,
          notes || null,
        ]
      );

      // Create default primary storage and receiving locations for new warehouse
      const defaultLocations = [
        { code: 'RCV-01', name: 'Primary Receiving Bay', type: 'receiving' },
        { code: 'GEN-STORAGE', name: 'General Storage Area', type: 'storage' },
        { code: 'DSP-01', name: 'Primary Dispatch Dock', type: 'dispatch' },
        { code: 'QC-HOLD', name: 'Quality Hold Staging', type: 'quarantine' },
      ];

      for (const loc of defaultLocations) {
        const locId = 'loc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        await client.query(
          `INSERT INTO warehouse_locations (
             id, organization_id, warehouse_id, code, name, location_type, status, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())`,
          [locId, orgId, id, loc.code, loc.name, loc.type]
        );
      }

      await recordAudit(client, orgId, actorId, actorEmail, 'warehouse.create', 'warehouses', id, {
        code: cleanCode,
        name,
        warehouse_type: warehouseType,
        city,
      });

      await client.query('COMMIT;');
      return (await this.getWarehouseById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateWarehouse(
    id: string,
    orgId: string,
    input: Partial<{
      branchId?: string | null;
      name: string;
      warehouseType: string;
      address?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      capacityCubicMeters?: number;
      capacitySqFt?: number;
      notes?: string;
      status?: 'active' | 'inactive' | 'maintenance' | 'archived';
      actorId?: string | null;
      actorEmail: string;
    }>
  ): Promise<WarehouseMaster> {
    const existing = await this.getWarehouseById(id, orgId);
    if (!existing) throw new Error('Warehouse not found.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      await client.query(
        `UPDATE warehouses 
         SET branch_id = COALESCE($1, branch_id),
             name = COALESCE($2, name),
             warehouse_type = COALESCE($3, warehouse_type),
             address = COALESCE($4, address),
             address_line1 = COALESCE($5, address_line1),
             city = COALESCE($6, city),
             state = COALESCE($7, state),
             postal_code = COALESCE($8, postal_code),
             country = COALESCE($9, country),
             contact_name = COALESCE($10, contact_name),
             contact_person = COALESCE($10, contact_person),
             phone = COALESCE($11, phone),
             contact_phone = COALESCE($11, contact_phone),
             email = COALESCE($12, email),
             contact_email = COALESCE($12, contact_email),
             capacity_cubic_meters = COALESCE($13, capacity_cubic_meters),
             capacity_sq_ft = COALESCE($14, capacity_sq_ft),
             notes = COALESCE($15, notes),
             status = COALESCE($16, status),
             updated_at = NOW()
         WHERE id = $17 AND organization_id = $18`,
        [
          input.branchId !== undefined ? input.branchId : existing.branch_id,
          input.name || existing.name,
          input.warehouseType || existing.warehouse_type,
          input.address || input.addressLine1 || existing.address,
          input.addressLine1 || input.address || existing.address_line1,
          input.city !== undefined ? input.city : existing.city,
          input.state !== undefined ? input.state : existing.state,
          input.postalCode !== undefined ? input.postalCode : existing.postal_code,
          input.country || existing.country,
          input.contactName || existing.contact_name,
          input.contactPhone || existing.contact_phone,
          input.contactEmail || existing.contact_email,
          input.capacityCubicMeters !== undefined ? input.capacityCubicMeters : existing.capacity_cubic_meters,
          input.capacitySqFt !== undefined ? input.capacitySqFt : existing.capacity_sq_ft,
          input.notes !== undefined ? input.notes : existing.notes,
          input.status || existing.status,
          id,
          orgId,
        ]
      );

      await recordAudit(client, orgId, input.actorId || null, input.actorEmail || 'admin@jyotsvan.enterprise', 'warehouse.update', 'warehouses', id, {
        updated_fields: Object.keys(input),
      });

      await client.query('COMMIT;');
      return (await this.getWarehouseById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async changeWarehouseStatus(
    id: string,
    orgId: string,
    status: 'active' | 'inactive' | 'maintenance' | 'archived',
    actorId: string | null,
    actorEmail: string
  ): Promise<WarehouseMaster> {
    const existing = await this.getWarehouseById(id, orgId);
    if (!existing) throw new Error('Warehouse not found.');

    if (status === 'inactive' || status === 'archived') {
      // Check for active in-transit transfers
      const activeTransfers = await pool.query(
        `SELECT COUNT(*) as count FROM warehouse_transfers 
         WHERE (source_warehouse_id = $1 OR destination_warehouse_id = $1) 
           AND status IN ('in_transit', 'dispatched')`,
        [id]
      );
      if (parseInt(activeTransfers.rows[0].count, 10) > 0) {
        throw new Error('Cannot deactivate warehouse with active in-transit transfers. Please complete or cancel pending transfers first.');
      }
    }

    return this.updateWarehouse(id, orgId, { status, actorId, actorEmail });
  }

  // ==========================================
  // 2. WAREHOUSE LOCATIONS & HIERARCHY
  // ==========================================

  static async getLocations(params: {
    orgId: string;
    warehouseId: string;
    parentId?: string | null;
    type?: string;
    status?: string;
  }): Promise<WarehouseLocationHierarchy[]> {
    const { orgId, warehouseId, parentId, type, status } = params;

    let queryStr = `
      SELECT 
        l.id, l.organization_id, l.warehouse_id, l.parent_location_id,
        l.code, l.name, l.description, l.location_type,
        l.zone_code, l.aisle_code, l.rack_code, l.shelf_code, l.bin_code,
        l.capacity_quantity::float as capacity_quantity,
        l.capacity_unit,
        l.capacity_weight::float as capacity_weight,
        l.capacity_volume::float as capacity_volume,
        l.utilization_threshold::float as utilization_threshold,
        l.notes, l.status, l.created_at, l.updated_at,
        p.name as parent_location_name,
        p.code as parent_location_code,
        w.name as warehouse_name,
        w.code as warehouse_code,
        COALESCE(stk.current_units, 0) as current_stock_units,
        COALESCE(stk.skus_count, 0) as skus_count
      FROM warehouse_locations l
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN warehouse_locations p ON l.parent_location_id = p.id
      LEFT JOIN (
        SELECT location_id, SUM(total_quantity) as current_units, COUNT(DISTINCT sku_id) as skus_count
        FROM inventory_balances
        GROUP BY location_id
      ) stk ON stk.location_id = l.id
      WHERE l.organization_id = $1 AND l.warehouse_id = $2
    `;

    const queryParams: any[] = [orgId, warehouseId];
    let pIdx = 3;

    if (parentId !== undefined) {
      if (parentId === null) {
        queryStr += ` AND l.parent_location_id IS NULL`;
      } else {
        queryStr += ` AND l.parent_location_id = $${pIdx}`;
        queryParams.push(parentId);
        pIdx++;
      }
    }

    if (type && type !== 'all') {
      queryStr += ` AND l.location_type = $${pIdx}`;
      queryParams.push(type);
      pIdx++;
    }

    if (status && status !== 'all') {
      queryStr += ` AND l.status = $${pIdx}`;
      queryParams.push(status);
      pIdx++;
    }

    queryStr += ` ORDER BY l.code ASC`;

    const res = await pool.query(queryStr, queryParams);
    return res.rows;
  }

  static async getLocationTree(warehouseId: string, orgId: string): Promise<WarehouseLocationHierarchy[]> {
    const allLocations = await this.getLocations({ orgId, warehouseId });

    // Build hierarchy recursively
    const map = new Map<string, WarehouseLocationHierarchy>();
    const roots: WarehouseLocationHierarchy[] = [];

    allLocations.forEach((loc) => {
      map.set(loc.id, { ...loc, children: [], level: 0 });
    });

    allLocations.forEach((loc) => {
      const node = map.get(loc.id)!;
      if (loc.parent_location_id && map.has(loc.parent_location_id)) {
        const parent = map.get(loc.parent_location_id)!;
        node.level = (parent.level || 0) + 1;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        node.level = 0;
        roots.push(node);
      }
    });

    return roots;
  }

  static async createLocation(input: {
    orgId: string;
    warehouseId: string;
    parentLocationId?: string | null;
    code: string;
    name: string;
    description?: string;
    locationType: LocationType;
    zoneCode?: string;
    aisleCode?: string;
    rackCode?: string;
    shelfCode?: string;
    binCode?: string;
    capacityQuantity?: number;
    capacityUnit?: string;
    capacityWeight?: number;
    capacityVolume?: number;
    utilizationThreshold?: number;
    notes?: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<WarehouseLocationHierarchy> {
    const {
      orgId,
      warehouseId,
      parentLocationId = null,
      code,
      name,
      description,
      locationType,
      zoneCode,
      aisleCode,
      rackCode,
      shelfCode,
      binCode,
      capacityQuantity,
      capacityUnit = 'pcs',
      capacityWeight,
      capacityVolume,
      utilizationThreshold = 85,
      notes,
      actorId = null,
      actorEmail,
    } = input;

    if (!code || !code.trim()) throw new Error('Location code is required.');
    if (!name || !name.trim()) throw new Error('Location name is required.');
    if (!locationType) throw new Error('Location type is required.');

    const cleanCode = code.trim().toUpperCase();

    // 1. Verify warehouse belongs to organization
    const wh = await pool.query('SELECT id FROM warehouses WHERE id = $1 AND organization_id = $2', [warehouseId, orgId]);
    if (wh.rows.length === 0) throw new Error('Warehouse not found in organization.');

    // 2. Check unique code within warehouse
    const dupCheck = await pool.query(
      'SELECT id FROM warehouse_locations WHERE warehouse_id = $1 AND UPPER(code) = $2',
      [warehouseId, cleanCode]
    );
    if (dupCheck.rows.length > 0) {
      throw new Error(`Location with code "${cleanCode}" already exists in this warehouse.`);
    }

    // 3. If parent provided, verify parent exists in same warehouse
    if (parentLocationId) {
      const parentCheck = await pool.query(
        'SELECT id, warehouse_id FROM warehouse_locations WHERE id = $1 AND organization_id = $2',
        [parentLocationId, orgId]
      );
      if (parentCheck.rows.length === 0 || parentCheck.rows[0].warehouse_id !== warehouseId) {
        throw new Error('Parent location must belong to the same warehouse.');
      }
    }

    const id = 'loc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      await client.query(
        `INSERT INTO warehouse_locations (
           id, organization_id, warehouse_id, parent_location_id,
           code, name, description, location_type,
           zone_code, aisle_code, rack_code, shelf_code, bin_code,
           capacity_quantity, capacity_unit, capacity_weight, capacity_volume,
           utilization_threshold, notes, status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'active', NOW(), NOW())`,
        [
          id,
          orgId,
          warehouseId,
          parentLocationId || null,
          cleanCode,
          name.trim(),
          description || null,
          locationType,
          zoneCode || null,
          aisleCode || null,
          rackCode || null,
          shelfCode || null,
          binCode || null,
          capacityQuantity || null,
          capacityUnit || 'pcs',
          capacityWeight || null,
          capacityVolume || null,
          utilizationThreshold || 85,
          notes || null,
        ]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'location.create', 'warehouse_locations', id, {
        code: cleanCode,
        name,
        warehouse_id: warehouseId,
        parent_id: parentLocationId,
        location_type: locationType,
      });

      await client.query('COMMIT;');

      const created = await pool.query(
        `SELECT l.*, w.name as warehouse_name, p.name as parent_location_name 
         FROM warehouse_locations l
         JOIN warehouses w ON l.warehouse_id = w.id
         LEFT JOIN warehouse_locations p ON l.parent_location_id = p.id
         WHERE l.id = $1`,
        [id]
      );
      return created.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateLocation(
    id: string,
    orgId: string,
    input: Partial<{
      parentLocationId?: string | null;
      name: string;
      description?: string;
      locationType: LocationType;
      zoneCode?: string;
      aisleCode?: string;
      rackCode?: string;
      shelfCode?: string;
      binCode?: string;
      capacityQuantity?: number;
      capacityUnit?: string;
      capacityWeight?: number;
      capacityVolume?: number;
      utilizationThreshold?: number;
      notes?: string;
      status?: 'active' | 'inactive';
      actorId?: string | null;
      actorEmail: string;
    }>
  ): Promise<WarehouseLocationHierarchy> {
    const locRes = await pool.query(
      'SELECT * FROM warehouse_locations WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );
    if (locRes.rows.length === 0) throw new Error('Location not found.');
    const existing = locRes.rows[0];

    // Circular hierarchy check if changing parent
    if (input.parentLocationId) {
      if (input.parentLocationId === id) {
        throw new Error('A location cannot be its own parent.');
      }

      // Check if candidate parent is a descendant of this location
      let currentParentId: string | null = input.parentLocationId;
      while (currentParentId) {
        if (currentParentId === id) {
          throw new Error('Circular parent-child location relationship is not permitted.');
        }
        const parentRes = await pool.query(
          'SELECT parent_location_id FROM warehouse_locations WHERE id = $1',
          [currentParentId]
        );
        currentParentId = parentRes.rows.length > 0 ? parentRes.rows[0].parent_location_id : null;
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      await client.query(
        `UPDATE warehouse_locations 
         SET parent_location_id = COALESCE($1, parent_location_id),
             name = COALESCE($2, name),
             description = COALESCE($3, description),
             location_type = COALESCE($4, location_type),
             zone_code = COALESCE($5, zone_code),
             aisle_code = COALESCE($6, aisle_code),
             rack_code = COALESCE($7, rack_code),
             shelf_code = COALESCE($8, shelf_code),
             bin_code = COALESCE($9, bin_code),
             capacity_quantity = COALESCE($10, capacity_quantity),
             capacity_unit = COALESCE($11, capacity_unit),
             capacity_weight = COALESCE($12, capacity_weight),
             capacity_volume = COALESCE($13, capacity_volume),
             utilization_threshold = COALESCE($14, utilization_threshold),
             notes = COALESCE($15, notes),
             status = COALESCE($16, status),
             updated_at = NOW()
         WHERE id = $17 AND organization_id = $18`,
        [
          input.parentLocationId !== undefined ? input.parentLocationId : existing.parent_location_id,
          input.name || existing.name,
          input.description !== undefined ? input.description : existing.description,
          input.locationType || existing.location_type,
          input.zoneCode !== undefined ? input.zoneCode : existing.zone_code,
          input.aisleCode !== undefined ? input.aisleCode : existing.aisle_code,
          input.rackCode !== undefined ? input.rackCode : existing.rack_code,
          input.shelfCode !== undefined ? input.shelfCode : existing.shelf_code,
          input.binCode !== undefined ? input.binCode : existing.bin_code,
          input.capacityQuantity !== undefined ? input.capacityQuantity : existing.capacity_quantity,
          input.capacityUnit || existing.capacity_unit,
          input.capacityWeight !== undefined ? input.capacityWeight : existing.capacity_weight,
          input.capacityVolume !== undefined ? input.capacityVolume : existing.capacity_volume,
          input.utilizationThreshold !== undefined ? input.utilizationThreshold : existing.utilization_threshold,
          input.notes !== undefined ? input.notes : existing.notes,
          input.status || existing.status,
          id,
          orgId,
        ]
      );

      await recordAudit(client, orgId, input.actorId || null, input.actorEmail || 'admin@jyotsvan.enterprise', 'location.update', 'warehouse_locations', id, {
        updated_fields: Object.keys(input),
      });

      await client.query('COMMIT;');

      const updated = await pool.query(
        `SELECT l.*, w.name as warehouse_name, p.name as parent_location_name 
         FROM warehouse_locations l
         JOIN warehouses w ON l.warehouse_id = w.id
         LEFT JOIN warehouse_locations p ON l.parent_location_id = p.id
         WHERE l.id = $1`,
        [id]
      );
      return updated.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async deactivateLocation(
    id: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<WarehouseLocationHierarchy> {
    // Check if active stock exists at this location
    const stockCheck = await pool.query(
      `SELECT SUM(total_quantity) as total FROM inventory_balances 
       WHERE location_id = $1 AND organization_id = $2`,
      [id, orgId]
    );

    const totalStock = parseFloat(stockCheck.rows[0]?.total || '0');
    if (totalStock > 0) {
      throw new Error(`Cannot deactivate location holding active inventory (${totalStock} units). Relocate stock to another bin before deactivation.`);
    }

    return this.updateLocation(id, orgId, { status: 'inactive', actorId, actorEmail });
  }

  // ==========================================
  // 3. INTERNAL TRANSFERS & STO ENGINE
  // ==========================================

  static async getTransfers(params: {
    orgId: string;
    search?: string;
    sourceWarehouseId?: string;
    destWarehouseId?: string;
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<{ transfers: WarehouseTransfer[]; total: number; page: number; limit: number }> {
    const {
      orgId,
      search,
      sourceWarehouseId,
      destWarehouseId,
      status,
      priority,
      page = 1,
      limit = 50,
    } = params;

    let queryStr = `
      SELECT 
        t.id, t.organization_id, t.transfer_number,
        t.source_warehouse_id, t.destination_warehouse_id,
        t.source_location_id, t.destination_location_id,
        t.status, t.priority,
        t.requested_by, t.requested_by_email,
        t.approved_by, t.approved_by_email,
        t.dispatched_by, t.dispatched_by_email,
        t.received_by, t.received_by_email,
        t.cancelled_by, t.cancelled_by_email,
        t.requested_at, t.approved_at, t.dispatched_at, t.received_at, t.completed_at, t.cancelled_at,
        t.cancellation_reason, t.notes, t.created_at, t.updated_at,
        sw.name as source_warehouse_name, sw.code as source_warehouse_code,
        dw.name as destination_warehouse_name, dw.code as destination_warehouse_code,
        sl.name as source_location_name,
        dl.name as destination_location_name,
        COALESCE(ti.items_count, 0) as items_count,
        COALESCE(ti.total_quantity, 0) as total_quantity
      FROM warehouse_transfers t
      JOIN warehouses sw ON t.source_warehouse_id = sw.id
      JOIN warehouses dw ON t.destination_warehouse_id = dw.id
      LEFT JOIN warehouse_locations sl ON t.source_location_id = sl.id
      LEFT JOIN warehouse_locations dl ON t.destination_location_id = dl.id
      LEFT JOIN (
        SELECT transfer_id, COUNT(*) as items_count, SUM(quantity) as total_quantity
        FROM warehouse_transfer_items
        GROUP BY transfer_id
      ) ti ON ti.transfer_id = t.id
      WHERE t.organization_id = $1
    `;

    const queryParams: any[] = [orgId];
    let pIdx = 2;

    if (search && search.trim()) {
      queryStr += ` AND (
        t.transfer_number ILIKE $${pIdx} OR 
        sw.name ILIKE $${pIdx} OR 
        dw.name ILIKE $${pIdx} OR 
        t.notes ILIKE $${pIdx}
      )`;
      queryParams.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (sourceWarehouseId) {
      queryStr += ` AND t.source_warehouse_id = $${pIdx}`;
      queryParams.push(sourceWarehouseId);
      pIdx++;
    }

    if (destWarehouseId) {
      queryStr += ` AND t.destination_warehouse_id = $${pIdx}`;
      queryParams.push(destWarehouseId);
      pIdx++;
    }

    if (status && status !== 'all') {
      queryStr += ` AND t.status = $${pIdx}`;
      queryParams.push(status);
      pIdx++;
    }

    if (priority && priority !== 'all') {
      queryStr += ` AND t.priority = $${pIdx}`;
      queryParams.push(priority);
      pIdx++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) as count FROM (${queryStr}) as cnt_tbl`, queryParams);
    const total = parseInt(countRes.rows[0].count, 10);

    queryStr += ` ORDER BY t.created_at DESC`;

    const offset = (page - 1) * limit;
    queryStr += ` LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
    queryParams.push(limit, offset);

    const res = await pool.query(queryStr, queryParams);
    return { transfers: res.rows, total, page, limit };
  }

  static async getTransferById(id: string, orgId: string): Promise<WarehouseTransfer | null> {
    const res = await pool.query(
      `SELECT 
        t.id, t.organization_id, t.transfer_number,
        t.source_warehouse_id, t.destination_warehouse_id,
        t.source_location_id, t.destination_location_id,
        t.status, t.priority,
        t.requested_by, t.requested_by_email,
        t.approved_by, t.approved_by_email,
        t.dispatched_by, t.dispatched_by_email,
        t.received_by, t.received_by_email,
        t.cancelled_by, t.cancelled_by_email,
        t.requested_at, t.approved_at, t.dispatched_at, t.received_at, t.completed_at, t.cancelled_at,
        t.cancellation_reason, t.notes, t.created_at, t.updated_at,
        sw.name as source_warehouse_name, sw.code as source_warehouse_code,
        dw.name as destination_warehouse_name, dw.code as destination_warehouse_code,
        sl.name as source_location_name,
        dl.name as destination_location_name
      FROM warehouse_transfers t
      JOIN warehouses sw ON t.source_warehouse_id = sw.id
      JOIN warehouses dw ON t.destination_warehouse_id = dw.id
      LEFT JOIN warehouse_locations sl ON t.source_location_id = sl.id
      LEFT JOIN warehouse_locations dl ON t.destination_location_id = dl.id
      WHERE t.id = $1 AND t.organization_id = $2`,
      [id, orgId]
    );

    if (res.rows.length === 0) return null;
    const transfer = res.rows[0];

    // Fetch items with joined SKU details
    const itemsRes = await pool.query(
      `SELECT 
        ti.id, ti.transfer_id, ti.sku_id, ti.quantity::float as quantity,
        ti.received_quantity::float as received_quantity,
        ti.unit_id, ti.batch_id, ti.source_location_id, ti.destination_location_id,
        ti.notes, ti.status, ti.created_at,
        s.sku as sku_code, s.variant_name,
        p.name as product_name, p.product_code,
        u.short_code as unit_short_code,
        sl.name as source_location_name,
        dl.name as destination_location_name
      FROM warehouse_transfer_items ti
      JOIN skus s ON ti.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN units u ON ti.unit_id = u.id
      LEFT JOIN warehouse_locations sl ON ti.source_location_id = sl.id
      LEFT JOIN warehouse_locations dl ON ti.destination_location_id = dl.id
      WHERE ti.transfer_id = $1
      ORDER BY ti.created_at ASC`,
      [id]
    );

    transfer.items = itemsRes.rows;
    transfer.items_count = itemsRes.rows.length;
    transfer.total_quantity = itemsRes.rows.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

    return transfer;
  }

  static async createTransfer(input: {
    orgId: string;
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    sourceLocationId?: string | null;
    destinationLocationId?: string | null;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
    items: {
      skuId: string;
      quantity: number;
      sourceLocationId?: string | null;
      destinationLocationId?: string | null;
      notes?: string;
    }[];
    actorId?: string | null;
    actorEmail: string;
  }): Promise<WarehouseTransfer> {
    const {
      orgId,
      sourceWarehouseId,
      destinationWarehouseId,
      sourceLocationId = null,
      destinationLocationId = null,
      priority = 'medium',
      notes,
      items,
      actorId = null,
      actorEmail,
    } = input;

    if (!sourceWarehouseId || !destinationWarehouseId) {
      throw new Error('Source and destination warehouses are required.');
    }
    if (sourceWarehouseId === destinationWarehouseId && (!sourceLocationId || !destinationLocationId || sourceLocationId === destinationLocationId)) {
      throw new Error('Internal transfer requires either different warehouses or distinct source and destination storage locations.');
    }
    if (!items || items.length === 0) {
      throw new Error('At least one item is required for a stock transfer.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Verify both warehouses belong to the organization
      const whCheck = await client.query(
        'SELECT id, status FROM warehouses WHERE organization_id = $1 AND id IN ($2, $3)',
        [orgId, sourceWarehouseId, destinationWarehouseId]
      );
      if (whCheck.rows.length < (sourceWarehouseId === destinationWarehouseId ? 1 : 2)) {
        throw new Error('Invalid source or destination warehouse specified.');
      }

      const id = 'trf-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const transferNumber = `TRF-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

      await client.query(
        `INSERT INTO warehouse_transfers (
           id, organization_id, transfer_number, source_warehouse_id, destination_warehouse_id,
           source_location_id, destination_location_id, status, priority,
           requested_by, requested_by_email, requested_at, notes, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'requested', $8, $9, $10, NOW(), $11, NOW(), NOW())`,
        [
          id,
          orgId,
          transferNumber,
          sourceWarehouseId,
          destinationWarehouseId,
          sourceLocationId || null,
          destinationLocationId || null,
          priority,
          actorId,
          actorEmail,
          notes || null,
        ]
      );

      for (const item of items) {
        if (item.quantity <= 0) throw new Error('Transfer item quantity must be strictly greater than zero.');

        // Get SKU UOM
        const skuInfo = await client.query(
          'SELECT id, unit_id FROM skus WHERE id = $1 AND organization_id = $2',
          [item.skuId, orgId]
        );
        if (skuInfo.rows.length === 0) throw new Error(`SKU "${item.skuId}" not found in organization.`);

        const itemId = 'trfi-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        await client.query(
          `INSERT INTO warehouse_transfer_items (
             id, transfer_id, sku_id, quantity, received_quantity, unit_id,
             source_location_id, destination_location_id, notes, status, created_at
           ) VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, 'pending', NOW())`,
          [
            itemId,
            id,
            item.skuId,
            item.quantity,
            skuInfo.rows[0].unit_id,
            item.sourceLocationId || sourceLocationId || null,
            item.destinationLocationId || destinationLocationId || null,
            item.notes || null,
          ]
        );
      }

      await recordAudit(client, orgId, actorId, actorEmail, 'transfer.create', 'warehouse_transfers', id, {
        transfer_number: transferNumber,
        source_warehouse_id: sourceWarehouseId,
        destination_warehouse_id: destinationWarehouseId,
        items_count: items.length,
      });

      await client.query('COMMIT;');
      return (await this.getTransferById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async approveTransfer(
    id: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<WarehouseTransfer> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const trfLock = await client.query(
        'SELECT * FROM warehouse_transfers WHERE id = $1 AND organization_id = $2 FOR UPDATE',
        [id, orgId]
      );
      if (trfLock.rows.length === 0) throw new Error('Transfer not found.');
      const transfer = trfLock.rows[0];

      if (transfer.status !== 'requested' && transfer.status !== 'draft') {
        throw new Error(`Cannot approve transfer in "${transfer.status}" status.`);
      }

      await client.query(
        `UPDATE warehouse_transfers 
         SET status = 'approved',
             approved_by = $1,
             approved_by_email = $2,
             approved_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [actorId, actorEmail, id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'transfer.approve', 'warehouse_transfers', id, {
        transfer_number: transfer.transfer_number,
      });

      await client.query('COMMIT;');
      return (await this.getTransferById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * ATOMIC TRANSFER DISPATCH:
   * Decrements source warehouse available balance and logs immutable `transfer_out` movement.
   * Concurrency-safe: Locks source balance using SELECT FOR UPDATE.
   * Idempotent: Checks status to prevent duplicate dispatch.
   */
  static async dispatchTransfer(
    id: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<WarehouseTransfer> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Lock Transfer row
      const trfLock = await client.query(
        'SELECT * FROM warehouse_transfers WHERE id = $1 AND organization_id = $2 FOR UPDATE',
        [id, orgId]
      );
      if (trfLock.rows.length === 0) throw new Error('Transfer not found.');
      const transfer = trfLock.rows[0];

      if (transfer.status !== 'approved' && transfer.status !== 'requested') {
        throw new Error(`Cannot dispatch transfer in "${transfer.status}" status. Only approved/requested transfers can be dispatched.`);
      }

      // 2. Lock and decrement each item from Source Warehouse via Inventory Engine
      const itemsRes = await client.query(
        'SELECT * FROM warehouse_transfer_items WHERE transfer_id = $1 FOR UPDATE',
        [id]
      );

      for (const item of itemsRes.rows) {
        const srcLocId = item.source_location_id || transfer.source_location_id || null;
        const qty = parseFloat(item.quantity);

        // Lock source balance row
        const balRes = await client.query(
          `SELECT * FROM inventory_balances 
           WHERE organization_id = $1 
             AND warehouse_id = $2 
             AND ((location_id IS NULL AND $3::varchar IS NULL) OR location_id = $3)
             AND sku_id = $4 
           FOR UPDATE`,
          [orgId, transfer.source_warehouse_id, srcLocId, item.sku_id]
        );

        if (balRes.rows.length === 0) {
          throw new Error(`No stock balance record found at source warehouse for SKU "${item.sku_id}". Transfer dispatch aborted.`);
        }

        const bal = balRes.rows[0];
        const avail = parseFloat(bal.available_quantity) || 0;
        const total = parseFloat(bal.total_quantity) || 0;

        if (avail < qty) {
          throw new Error(
            `Insufficient stock for SKU "${item.sku_id}". Available: ${avail}, Requested: ${qty}. Transfer dispatch cancelled to prevent negative stock.`
          );
        }

        const newAvail = avail - qty;
        const newTotal = total - qty;

        // Decrement source balance
        await client.query(
          `UPDATE inventory_balances 
           SET available_quantity = $1,
               total_quantity = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [newAvail, newTotal, bal.id]
        );

        // Insert Immutable Movement Ledger Entry (Phase 8 Inventory Engine authoritative ledger)
        const movId = 'mov-trf-out-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        await client.query(
          `INSERT INTO inventory_movements (
             id, organization_id, sku_id, warehouse_id, location_id,
             movement_type, stock_type, quantity, unit_id,
             reference_type, reference_id, before_quantity, after_quantity,
             performed_by, performed_by_email, reason, notes, created_at
           ) VALUES ($1, $2, $3, $4, $5, 'transfer_out', 'available', $6, $7, 'warehouse_transfer', $8, $9, $10, $11, $12, $13, $14, NOW())`,
          [
            movId,
            orgId,
            item.sku_id,
            transfer.source_warehouse_id,
            srcLocId,
            -qty,
            item.unit_id,
            transfer.transfer_number,
            avail,
            newAvail,
            actorId,
            actorEmail,
            `Stock transfer dispatched to destination warehouse (${transfer.transfer_number})`,
            transfer.notes || null,
          ]
        );

        // Update item status
        await client.query(
          `UPDATE warehouse_transfer_items SET status = 'dispatched' WHERE id = $1`,
          [item.id]
        );
      }

      // 3. Mark Transfer as In-Transit
      await client.query(
        `UPDATE warehouse_transfers 
         SET status = 'in_transit',
             dispatched_by = $1,
             dispatched_by_email = $2,
             dispatched_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [actorId, actorEmail, id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'transfer.dispatch', 'warehouse_transfers', id, {
        transfer_number: transfer.transfer_number,
        status: 'in_transit',
      });

      await client.query('COMMIT;');
      return (await this.getTransferById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * ATOMIC TRANSFER RECEIPT:
   * Increments destination warehouse stock and logs immutable `transfer_in` movement.
   * Concurrency-safe: Locks destination balance with row lock.
   * Idempotent: Checks status to prevent duplicate receipt.
   */
  static async receiveTransfer(
    id: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<WarehouseTransfer> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Lock Transfer row
      const trfLock = await client.query(
        'SELECT * FROM warehouse_transfers WHERE id = $1 AND organization_id = $2 FOR UPDATE',
        [id, orgId]
      );
      if (trfLock.rows.length === 0) throw new Error('Transfer not found.');
      const transfer = trfLock.rows[0];

      if (transfer.status !== 'in_transit' && transfer.status !== 'dispatched') {
        throw new Error(`Cannot receive transfer in "${transfer.status}" status. Only in-transit transfers can be received.`);
      }

      // 2. Fetch transfer items
      const itemsRes = await client.query(
        'SELECT * FROM warehouse_transfer_items WHERE transfer_id = $1 FOR UPDATE',
        [id]
      );

      for (const item of itemsRes.rows) {
        const dstLocId = item.destination_location_id || transfer.destination_location_id || null;
        const qty = parseFloat(item.quantity);

        // Lock or create destination balance row
        const selectBal = await client.query(
          `SELECT * FROM inventory_balances 
           WHERE organization_id = $1 
             AND warehouse_id = $2 
             AND ((location_id IS NULL AND $3::varchar IS NULL) OR location_id = $3)
             AND sku_id = $4 
           FOR UPDATE`,
          [orgId, transfer.destination_warehouse_id, dstLocId, item.sku_id]
        );

        let destBalId: string;
        let prevAvail = 0;
        let prevTotal = 0;

        if (selectBal.rows.length > 0) {
          const bal = selectBal.rows[0];
          destBalId = bal.id;
          prevAvail = parseFloat(bal.available_quantity) || 0;
          prevTotal = parseFloat(bal.total_quantity) || 0;
        } else {
          destBalId = 'bal-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
          await client.query(
            `INSERT INTO inventory_balances (
               id, organization_id, warehouse_id, location_id, sku_id,
               available_quantity, reserved_quantity, damaged_quantity, quarantine_quantity, total_quantity,
               unit_id, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, 0, 0, 0, 0, 0, $6, NOW(), NOW())
             ON CONFLICT (organization_id, warehouse_id, COALESCE(location_id, 'NO_LOC'), sku_id, COALESCE(batch_id, 'NO_BATCH'))
             DO NOTHING`,
            [destBalId, orgId, transfer.destination_warehouse_id, dstLocId, item.sku_id, item.unit_id]
          );

          const lockedBal = await client.query('SELECT * FROM inventory_balances WHERE id = $1 FOR UPDATE', [destBalId]);
          if (lockedBal.rows.length > 0) {
            prevAvail = parseFloat(lockedBal.rows[0].available_quantity) || 0;
            prevTotal = parseFloat(lockedBal.rows[0].total_quantity) || 0;
          }
        }

        const newAvail = prevAvail + qty;
        const newTotal = prevTotal + qty;

        // Increment destination balance
        await client.query(
          `UPDATE inventory_balances 
           SET available_quantity = $1,
               total_quantity = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [newAvail, newTotal, destBalId]
        );

        // Insert Immutable Movement Ledger Entry
        const movId = 'mov-trf-in-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        await client.query(
          `INSERT INTO inventory_movements (
             id, organization_id, sku_id, warehouse_id, location_id,
             movement_type, stock_type, quantity, unit_id,
             reference_type, reference_id, before_quantity, after_quantity,
             performed_by, performed_by_email, reason, notes, created_at
           ) VALUES ($1, $2, $3, $4, $5, 'transfer_in', 'available', $6, $7, 'warehouse_transfer', $8, $9, $10, $11, $12, $13, $14, NOW())`,
          [
            movId,
            orgId,
            item.sku_id,
            transfer.destination_warehouse_id,
            dstLocId,
            qty,
            item.unit_id,
            transfer.transfer_number,
            prevAvail,
            newAvail,
            actorId,
            actorEmail,
            `Stock transfer received at destination warehouse (${transfer.transfer_number})`,
            transfer.notes || null,
          ]
        );

        // Update item received quantity & status
        await client.query(
          `UPDATE warehouse_transfer_items 
           SET status = 'received', received_quantity = $1 
           WHERE id = $2`,
          [qty, item.id]
        );
      }

      // 3. Mark Transfer as Completed
      await client.query(
        `UPDATE warehouse_transfers 
         SET status = 'completed',
             received_by = $1,
             received_by_email = $2,
             received_at = NOW(),
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [actorId, actorEmail, id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'transfer.receive', 'warehouse_transfers', id, {
        transfer_number: transfer.transfer_number,
        status: 'completed',
      });

      await client.query('COMMIT;');
      return (await this.getTransferById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async cancelTransfer(
    id: string,
    orgId: string,
    reason: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<WarehouseTransfer> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const trfLock = await client.query(
        'SELECT * FROM warehouse_transfers WHERE id = $1 AND organization_id = $2 FOR UPDATE',
        [id, orgId]
      );
      if (trfLock.rows.length === 0) throw new Error('Transfer not found.');
      const transfer = trfLock.rows[0];

      if (transfer.status === 'completed') {
        throw new Error('Cannot cancel a completed transfer. Create a reverse transfer if needed.');
      }
      if (transfer.status === 'in_transit') {
        throw new Error('Transfer is already dispatched/in transit. Complete receipt at destination or initiate a return transfer.');
      }

      await client.query(
        `UPDATE warehouse_transfers 
         SET status = 'cancelled',
             cancelled_by = $1,
             cancelled_by_email = $2,
             cancelled_at = NOW(),
             cancellation_reason = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [actorId, actorEmail, reason || 'Cancelled by user', id]
      );

      await client.query(
        `UPDATE warehouse_transfer_items SET status = 'cancelled' WHERE transfer_id = $1`,
        [id]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'transfer.cancel', 'warehouse_transfers', id, {
        transfer_number: transfer.transfer_number,
        reason,
      });

      await client.query('COMMIT;');
      return (await this.getTransferById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 4. STOCK VERIFICATION & CYCLE COUNTS
  // ==========================================

  static async getCountSessions(params: {
    orgId: string;
    warehouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ sessions: StockCountSession[]; total: number; page: number; limit: number }> {
    const { orgId, warehouseId, status, page = 1, limit = 50 } = params;

    let queryStr = `
      SELECT 
        c.id, c.organization_id, c.count_number, c.warehouse_id, c.location_id,
        c.count_type, c.status,
        c.conducted_by, c.conducted_by_email,
        c.approved_by, c.approved_by_email,
        c.started_at, c.completed_at, c.reconciled_at,
        c.notes, c.created_at, c.updated_at,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name,
        COALESCE(itms.total_items_count, 0) as total_items_count,
        COALESCE(itms.counted_items_count, 0) as counted_items_count,
        COALESCE(itms.discrepancy_items_count, 0) as discrepancy_items_count,
        COALESCE(itms.total_variance_units, 0) as total_variance_units
      FROM stock_count_sessions c
      JOIN warehouses w ON c.warehouse_id = w.id
      LEFT JOIN warehouse_locations loc ON c.location_id = loc.id
      LEFT JOIN (
        SELECT 
          session_id,
          COUNT(*) as total_items_count,
          COUNT(CASE WHEN counted_quantity IS NOT NULL THEN 1 END) as counted_items_count,
          COUNT(CASE WHEN variance_quantity <> 0 THEN 1 END) as discrepancy_items_count,
          SUM(COALESCE(variance_quantity, 0)) as total_variance_units
        FROM stock_count_items
        GROUP BY session_id
      ) itms ON itms.session_id = c.id
      WHERE c.organization_id = $1
    `;

    const queryParams: any[] = [orgId];
    let pIdx = 2;

    if (warehouseId) {
      queryStr += ` AND c.warehouse_id = $${pIdx}`;
      queryParams.push(warehouseId);
      pIdx++;
    }

    if (status && status !== 'all') {
      queryStr += ` AND c.status = $${pIdx}`;
      queryParams.push(status);
      pIdx++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) as count FROM (${queryStr}) as cnt_tbl`, queryParams);
    const total = parseInt(countRes.rows[0].count, 10);

    queryStr += ` ORDER BY c.created_at DESC`;

    const offset = (page - 1) * limit;
    queryStr += ` LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
    queryParams.push(limit, offset);

    const res = await pool.query(queryStr, queryParams);
    return { sessions: res.rows, total, page, limit };
  }

  static async getCountSessionById(id: string, orgId: string): Promise<StockCountSession | null> {
    const res = await pool.query(
      `SELECT 
        c.id, c.organization_id, c.count_number, c.warehouse_id, c.location_id,
        c.count_type, c.status,
        c.conducted_by, c.conducted_by_email,
        c.approved_by, c.approved_by_email,
        c.started_at, c.completed_at, c.reconciled_at,
        c.notes, c.created_at, c.updated_at,
        w.name as warehouse_name, w.code as warehouse_code,
        loc.name as location_name
      FROM stock_count_sessions c
      JOIN warehouses w ON c.warehouse_id = w.id
      LEFT JOIN warehouse_locations loc ON c.location_id = loc.id
      WHERE c.id = $1 AND c.organization_id = $2`,
      [id, orgId]
    );

    if (res.rows.length === 0) return null;
    const session = res.rows[0];

    // Fetch count items
    const itemsRes = await pool.query(
      `SELECT 
        ci.id, ci.session_id, ci.sku_id, ci.location_id,
        ci.system_quantity::float as system_quantity,
        ci.counted_quantity::float as counted_quantity,
        ci.variance_quantity::float as variance_quantity,
        ci.unit_id, ci.notes, ci.status, ci.adjustment_id,
        ci.created_at, ci.updated_at,
        s.sku as sku_code, s.variant_name, s.cost_price::float as cost_price,
        p.name as product_name, p.product_code,
        u.short_code as unit_short_code,
        loc.name as location_name, loc.code as location_code,
        (ci.variance_quantity * COALESCE(s.cost_price, 0))::float as variance_cost_impact
      FROM stock_count_items ci
      JOIN skus s ON ci.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN units u ON ci.unit_id = u.id
      LEFT JOIN warehouse_locations loc ON ci.location_id = loc.id
      WHERE ci.session_id = $1
      ORDER BY s.sku ASC`,
      [id]
    );

    session.items = itemsRes.rows;
    session.total_items_count = itemsRes.rows.length;
    session.counted_items_count = itemsRes.rows.filter((i: any) => i.counted_quantity !== null).length;
    session.discrepancy_items_count = itemsRes.rows.filter((i: any) => (i.variance_quantity || 0) !== 0).length;
    session.total_variance_units = itemsRes.rows.reduce((sum: number, i: any) => sum + (i.variance_quantity || 0), 0);

    return session;
  }

  static async createCountSession(input: {
    orgId: string;
    warehouseId: string;
    locationId?: string | null;
    countType: 'full_warehouse' | 'location' | 'sku_specific';
    skuIds?: string[];
    notes?: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<StockCountSession> {
    const {
      orgId,
      warehouseId,
      locationId = null,
      countType = 'full_warehouse',
      skuIds,
      notes,
      actorId = null,
      actorEmail,
    } = input;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const id = 'cnt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const countNumber = `CNT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

      await client.query(
        `INSERT INTO stock_count_sessions (
           id, organization_id, count_number, warehouse_id, location_id,
           count_type, status, conducted_by, conducted_by_email, started_at, notes, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', $7, $8, NOW(), $9, NOW(), NOW())`,
        [
          id,
          orgId,
          countNumber,
          warehouseId,
          locationId || null,
          countType,
          actorId,
          actorEmail,
          notes || null,
        ]
      );

      // Snapshot current system balance quantities for the session
      let balancesQuery = `
        SELECT b.sku_id, b.location_id, b.available_quantity, b.unit_id
        FROM inventory_balances b
        WHERE b.organization_id = $1 AND b.warehouse_id = $2
      `;
      const qParams: any[] = [orgId, warehouseId];

      if (locationId) {
        balancesQuery += ` AND b.location_id = $3`;
        qParams.push(locationId);
      }
      if (skuIds && skuIds.length > 0) {
        balancesQuery += ` AND b.sku_id = ANY($${qParams.length + 1})`;
        qParams.push(skuIds);
      }

      const balRes = await client.query(balancesQuery, qParams);

      for (const bal of balRes.rows) {
        const itemId = 'cnt-itm-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        const sysQty = parseFloat(bal.available_quantity) || 0;

        await client.query(
          `INSERT INTO stock_count_items (
             id, session_id, sku_id, location_id, system_quantity, counted_quantity,
             variance_quantity, unit_id, status, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, NULL, 0, $6, 'pending', NOW(), NOW())`,
          [itemId, id, bal.sku_id, bal.location_id, sysQty, bal.unit_id]
        );
      }

      await recordAudit(client, orgId, actorId, actorEmail, 'count.create', 'stock_count_sessions', id, {
        count_number: countNumber,
        warehouse_id: warehouseId,
        count_type: countType,
        items_count: balRes.rows.length,
      });

      await client.query('COMMIT;');
      return (await this.getCountSessionById(id, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async submitCountItems(
    sessionId: string,
    orgId: string,
    items: {
      id: string;
      countedQuantity: number;
      notes?: string;
    }[],
    actorId: string | null,
    actorEmail: string
  ): Promise<StockCountSession> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const sessionRes = await client.query(
        'SELECT * FROM stock_count_sessions WHERE id = $1 AND organization_id = $2 FOR UPDATE',
        [sessionId, orgId]
      );
      if (sessionRes.rows.length === 0) throw new Error('Count session not found.');
      const session = sessionRes.rows[0];

      if (session.status === 'reconciled' || session.status === 'cancelled') {
        throw new Error(`Cannot update count items for a session in "${session.status}" status.`);
      }

      for (const item of items) {
        const itemRes = await client.query(
          'SELECT system_quantity FROM stock_count_items WHERE id = $1 AND session_id = $2',
          [item.id, sessionId]
        );
        if (itemRes.rows.length > 0) {
          const sysQty = parseFloat(itemRes.rows[0].system_quantity) || 0;
          const counted = item.countedQuantity;
          const variance = counted - sysQty;
          const status = variance === 0 ? 'counted' : 'discrepancy';

          await client.query(
            `UPDATE stock_count_items 
             SET counted_quantity = $1,
                 variance_quantity = $2,
                 status = $3,
                 notes = COALESCE($4, notes),
                 updated_at = NOW()
             WHERE id = $5`,
            [counted, variance, status, item.notes || null, item.id]
          );
        }
      }

      await client.query(
        `UPDATE stock_count_sessions 
         SET status = 'submitted',
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );

      await recordAudit(client, orgId, actorId, actorEmail, 'count.submit', 'stock_count_sessions', sessionId, {
        count_number: session.count_number,
        items_updated: items.length,
      });

      await client.query('COMMIT;');
      return (await this.getCountSessionById(sessionId, orgId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * AUTHORIZED DISCREPANCY RECONCILIATION:
   * Approves count verification variance.
   * For each item with variance != 0, calls the centralized InventoryService.adjustStock()
   * to create authoritative stock adjustment and immutable movement ledger entries,
   * linking the resulting adjustment_id to the count item.
   */
  static async reconcileCountSession(
    sessionId: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<StockCountSession> {
    const session = await this.getCountSessionById(sessionId, orgId);
    if (!session) throw new Error('Count session not found.');

    if (session.status !== 'submitted' && session.status !== 'in_progress') {
      throw new Error(`Cannot reconcile count session in "${session.status}" status.`);
    }

    const items = session.items || [];

    for (const item of items) {
      const variance = item.variance_quantity || 0;
      if (variance !== 0 && !item.adjustment_id) {
        const direction = variance > 0 ? 'increase' : 'decrease';
        const qty = Math.abs(variance);
        const reason = `Physical Count Audit Variance (${session.count_number}) - ${item.notes || 'Reconciliation Adjustment'}`;

        // Call authoritative Phase 8 Inventory Engine adjustment service
        const adjResult = await InventoryService.adjustStock({
          organizationId: orgId,
          skuId: item.sku_id,
          warehouseId: session.warehouse_id,
          locationId: item.location_id || null,
          stockType: 'available',
          direction,
          quantity: qty,
          reason,
          notes: `Reconciled from count session ${session.count_number}`,
          idempotencyKey: `CNT-ADJ-${session.id}-${item.id}`,
          actorId,
          actorEmail,
        });

        // Link adjustment back to count item
        await pool.query(
          `UPDATE stock_count_items 
           SET adjustment_id = $1, status = 'reconciled', updated_at = NOW() 
           WHERE id = $2`,
          [adjResult.adjustment.id, item.id]
        );
      } else if (variance === 0) {
        await pool.query(
          `UPDATE stock_count_items SET status = 'reconciled', updated_at = NOW() WHERE id = $1`,
          [item.id]
        );
      }
    }

    // Mark session as reconciled
    await pool.query(
      `UPDATE stock_count_sessions 
       SET status = 'reconciled',
           approved_by = $1,
           approved_by_email = $2,
           reconciled_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [actorId, actorEmail, sessionId]
    );

    await recordAudit(null, orgId, actorId, actorEmail, 'count.reconcile', 'stock_count_sessions', sessionId, {
      count_number: session.count_number,
      discrepancies_reconciled: session.discrepancy_items_count,
    });

    return (await this.getCountSessionById(sessionId, orgId))!;
  }

  // ==========================================
  // 5. WAREHOUSE STAFF ASSIGNMENTS
  // ==========================================

  static async getWarehouseAssignments(warehouseId: string, orgId: string): Promise<WarehouseAssignment[]> {
    const res = await pool.query(
      `SELECT 
        wa.id, wa.organization_id, wa.warehouse_id, wa.user_id, wa.role_type,
        wa.assigned_by, wa.created_at,
        u.full_name as user_name, u.email as user_email, u.phone_number as user_phone,
        w.name as warehouse_name, w.code as warehouse_code
      FROM warehouse_assignments wa
      JOIN users u ON wa.user_id = u.id
      JOIN warehouses w ON wa.warehouse_id = w.id
      WHERE wa.warehouse_id = $1 AND wa.organization_id = $2
      ORDER BY wa.created_at DESC`,
      [warehouseId, orgId]
    );
    return res.rows;
  }

  static async assignUserToWarehouse(input: {
    orgId: string;
    warehouseId: string;
    userId: string;
    roleType: 'manager' | 'supervisor' | 'operator' | 'auditor';
    assignedBy?: string | null;
    actorEmail: string;
  }): Promise<WarehouseAssignment> {
    const { orgId, warehouseId, userId, roleType, assignedBy = null, actorEmail } = input;

    const id = 'wha-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      await client.query(
        `INSERT INTO warehouse_assignments (
           id, organization_id, warehouse_id, user_id, role_type, assigned_by, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (warehouse_id, user_id) 
         DO UPDATE SET role_type = EXCLUDED.role_type`,
        [id, orgId, warehouseId, userId, roleType, assignedBy]
      );

      await recordAudit(client, orgId, assignedBy, actorEmail, 'warehouse.assign_staff', 'warehouse_assignments', id, {
        warehouse_id: warehouseId,
        user_id: userId,
        role_type: roleType,
      });

      await client.query('COMMIT;');

      const res = await pool.query(
        `SELECT 
          wa.id, wa.organization_id, wa.warehouse_id, wa.user_id, wa.role_type,
          wa.assigned_by, wa.created_at,
          u.full_name as user_name, u.email as user_email,
          w.name as warehouse_name
        FROM warehouse_assignments wa
        JOIN users u ON wa.user_id = u.id
        JOIN warehouses w ON wa.warehouse_id = w.id
        WHERE wa.warehouse_id = $1 AND wa.user_id = $2`,
        [warehouseId, userId]
      );
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  static async removeUserFromWarehouse(assignmentId: string, orgId: string): Promise<boolean> {
    const res = await pool.query(
      'DELETE FROM warehouse_assignments WHERE id = $1 AND organization_id = $2 RETURNING id',
      [assignmentId, orgId]
    );
    return res.rows.length > 0;
  }

  // ==========================================
  // 6. EXECUTIVE SUMMARY & DASHBOARD METRICS
  // ==========================================

  static async getSummaryMetrics(orgId: string): Promise<WarehouseSummaryMetrics> {
    // Total Warehouses & Status Breakdown
    const whRes = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance,
        COUNT(CASE WHEN status = 'inactive' OR status = 'archived' THEN 1 END) as inactive
       FROM warehouses 
       WHERE organization_id = $1`,
      [orgId]
    );

    // Locations Count
    const locRes = await pool.query(
      `SELECT COUNT(*) as count FROM warehouse_locations WHERE organization_id = $1 AND status = 'active'`,
      [orgId]
    );

    // Inventory Rollup via Phase 8 Engine
    const invRes = await pool.query(
      `SELECT 
        COUNT(DISTINCT b.sku_id) as total_skus,
        SUM(b.available_quantity) as available_qty,
        SUM(b.reserved_quantity) as reserved_qty,
        SUM(b.damaged_quantity) as damaged_qty,
        SUM(b.quarantine_quantity) as quarantine_qty,
        SUM(b.total_quantity) as total_qty,
        SUM(b.total_quantity * COALESCE(s.cost_price, 0)) as total_val
       FROM inventory_balances b
       JOIN skus s ON b.sku_id = s.id
       WHERE b.organization_id = $1`,
      [orgId]
    );

    // Transfers Breakdown
    const trfRes = await pool.query(
      `SELECT 
        COUNT(CASE WHEN status IN ('requested', 'approved') THEN 1 END) as pending_transfers,
        COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit_transfers,
        COUNT(CASE WHEN status = 'completed' AND completed_at >= CURRENT_DATE THEN 1 END) as completed_today
       FROM warehouse_transfers 
       WHERE organization_id = $1`,
      [orgId]
    );

    // Active Counts
    const cntRes = await pool.query(
      `SELECT COUNT(*) as active_counts 
       FROM stock_count_sessions 
       WHERE organization_id = $1 AND status IN ('draft', 'in_progress', 'submitted')`,
      [orgId]
    );

    const whRow = whRes.rows[0];
    const invRow = invRes.rows[0];
    const trfRow = trfRes.rows[0];

    return {
      total_warehouses: parseInt(whRow.total || '0', 10),
      active_warehouses: parseInt(whRow.active || '0', 10),
      maintenance_warehouses: parseInt(whRow.maintenance || '0', 10),
      inactive_warehouses: parseInt(whRow.inactive || '0', 10),
      total_locations_count: parseInt(locRes.rows[0].count || '0', 10),
      total_skus_stored: parseInt(invRow.total_skus || '0', 10),
      total_available_units: parseFloat(invRow.available_qty || '0'),
      total_reserved_units: parseFloat(invRow.reserved_qty || '0'),
      total_damaged_units: parseFloat(invRow.damaged_qty || '0'),
      total_quarantine_units: parseFloat(invRow.quarantine_qty || '0'),
      total_physical_units: parseFloat(invRow.total_qty || '0'),
      pending_transfers_count: parseInt(trfRow.pending_transfers || '0', 10),
      in_transit_transfers_count: parseInt(trfRow.in_transit_transfers || '0', 10),
      completed_transfers_today: parseInt(trfRow.completed_today || '0', 10),
      active_counts_count: parseInt(cntRes.rows[0].active_counts || '0', 10),
      total_estimated_valuation: Math.round((parseFloat(invRow.total_val || '0')) * 100) / 100,
    };
  }
}
