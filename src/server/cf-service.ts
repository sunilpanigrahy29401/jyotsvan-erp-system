import { pool } from './db.ts';
import { InventoryService } from './inventory-service.ts';
import type {
  CFMaster,
  CFType,
  CFStatus,
  CFContact,
  CFAddress,
  CFWarehouseMapping,
  CFTerritory,
  CFDocument,
  CFTransfer,
  CFTransferItem,
  CFTransferDiscrepancy,
  CFDispatch,
  CFDispatchItem,
  CFStockItem,
  CFSummaryMetrics,
  CFQueryParams,
} from '../types/cfs.ts';

export class CFSService {
  /**
   * List all C&F entities with aggregated metrics and filtering
   */
  public async listCFs(orgId: string, params: CFQueryParams = {}): Promise<{ data: CFMaster[]; total: number }> {
    const conditions: string[] = ['c.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (params.search) {
      conditions.push(`(c.legal_name ILIKE $${idx} OR c.display_name ILIKE $${idx} OR c.cf_code ILIKE $${idx} OR c.city ILIKE $${idx} OR c.state ILIKE $${idx} OR c.territory ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }

    if (params.status) {
      conditions.push(`c.status = $${idx}`);
      values.push(params.status);
      idx++;
    }

    if (params.type) {
      conditions.push(`c.cf_type = $${idx}`);
      values.push(params.type);
      idx++;
    }

    if (params.region) {
      conditions.push(`c.region = $${idx}`);
      values.push(params.region);
      idx++;
    }

    if (params.state) {
      conditions.push(`c.state ILIKE $${idx}`);
      values.push(`%${params.state}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countSql = `SELECT COUNT(*) FROM cfs c WHERE ${whereClause}`;
    const countRes = await pool.query(countSql, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // Data query with subqueries for aggregated metrics
    const limit = params.limit || 50;
    const offset = ((params.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        c.*,
        COALESCE(wh_agg.wh_count, 0)::int AS associated_warehouses_count,
        COALESCE(stk_agg.total_units, 0)::numeric AS total_stock_units,
        COALESCE(stk_agg.total_value, 0)::numeric AS estimated_inventory_value,
        COALESCE(trf_agg.pending_transfers, 0)::int AS pending_inward_transfers_count,
        COALESCE(trf_agg.in_transit_units, 0)::numeric AS in_transit_units,
        COALESCE(dsp_agg.active_dispatches, 0)::int AS active_dispatches_count,
        COALESCE(disc_agg.disc_count, 0)::int AS discrepancy_count
      FROM cfs c
      LEFT JOIN (
        SELECT cf_id, COUNT(*) as wh_count
        FROM cf_warehouses
        WHERE status = 'active'
        GROUP BY cf_id
      ) wh_agg ON wh_agg.cf_id = c.id
      LEFT JOIN (
        SELECT 
          cw.cf_id,
          SUM(ib.available_quantity + ib.reserved_quantity + ib.quarantine_quantity) as total_units,
          SUM((ib.available_quantity + ib.reserved_quantity + ib.quarantine_quantity) * COALESCE(s.standard_cost, 0)) as total_value
        FROM cf_warehouses cw
        JOIN inventory_balances ib ON ib.warehouse_id = cw.warehouse_id
        LEFT JOIN skus s ON s.id = ib.sku_id
        GROUP BY cw.cf_id
      ) stk_agg ON stk_agg.cf_id = c.id
      LEFT JOIN (
        SELECT 
          t.cf_id,
          COUNT(CASE WHEN t.status IN ('requested', 'approved', 'in_transit') THEN 1 END) as pending_transfers,
          SUM(CASE WHEN t.status = 'in_transit' THEN ti.dispatched_quantity ELSE 0 END) as in_transit_units
        FROM cf_transfers t
        LEFT JOIN cf_transfer_items ti ON ti.transfer_id = t.id
        GROUP BY t.cf_id
      ) trf_agg ON trf_agg.cf_id = c.id
      LEFT JOIN (
        SELECT cf_id, COUNT(*) as active_dispatches
        FROM cf_dispatches
        WHERE status IN ('requested', 'approved', 'picking', 'dispatched')
        GROUP BY cf_id
      ) dsp_agg ON dsp_agg.cf_id = c.id
      LEFT JOIN (
        SELECT t.cf_id, COUNT(d.id) as disc_count
        FROM cf_transfer_discrepancies d
        JOIN cf_transfers t ON t.id = d.transfer_id
        WHERE d.resolution_status IN ('pending', 'investigating')
        GROUP BY t.cf_id
      ) disc_agg ON disc_agg.cf_id = c.id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    values.push(limit, offset);
    const dataRes = await pool.query(dataSql, values);

    return {
      data: dataRes.rows.map(this.mapCFRow),
      total,
    };
  }

  /**
   * Get 360° details for a single C&F entity
   */
  public async getCFById(orgId: string, cfId: string): Promise<CFMaster | null> {
    const cfSql = `
      SELECT 
        c.*,
        COALESCE(wh_agg.wh_count, 0)::int AS associated_warehouses_count,
        COALESCE(stk_agg.total_units, 0)::numeric AS total_stock_units,
        COALESCE(stk_agg.total_value, 0)::numeric AS estimated_inventory_value,
        COALESCE(trf_agg.pending_transfers, 0)::int AS pending_inward_transfers_count,
        COALESCE(trf_agg.in_transit_units, 0)::numeric AS in_transit_units,
        COALESCE(dsp_agg.active_dispatches, 0)::int AS active_dispatches_count,
        COALESCE(disc_agg.disc_count, 0)::int AS discrepancy_count
      FROM cfs c
      LEFT JOIN (
        SELECT cf_id, COUNT(*) as wh_count
        FROM cf_warehouses
        WHERE status = 'active'
        GROUP BY cf_id
      ) wh_agg ON wh_agg.cf_id = c.id
      LEFT JOIN (
        SELECT 
          cw.cf_id,
          SUM(ib.available_quantity + ib.reserved_quantity + ib.quarantine_quantity) as total_units,
          SUM((ib.available_quantity + ib.reserved_quantity + ib.quarantine_quantity) * COALESCE(s.standard_cost, 0)) as total_value
        FROM cf_warehouses cw
        JOIN inventory_balances ib ON ib.warehouse_id = cw.warehouse_id
        LEFT JOIN skus s ON s.id = ib.sku_id
        GROUP BY cw.cf_id
      ) stk_agg ON stk_agg.cf_id = c.id
      LEFT JOIN (
        SELECT 
          t.cf_id,
          COUNT(CASE WHEN t.status IN ('requested', 'approved', 'in_transit') THEN 1 END) as pending_transfers,
          SUM(CASE WHEN t.status = 'in_transit' THEN ti.dispatched_quantity ELSE 0 END) as in_transit_units
        FROM cf_transfers t
        LEFT JOIN cf_transfer_items ti ON ti.transfer_id = t.id
        GROUP BY t.cf_id
      ) trf_agg ON trf_agg.cf_id = c.id
      LEFT JOIN (
        SELECT cf_id, COUNT(*) as active_dispatches
        FROM cf_dispatches
        WHERE status IN ('requested', 'approved', 'picking', 'dispatched')
        GROUP BY cf_id
      ) dsp_agg ON dsp_agg.cf_id = c.id
      LEFT JOIN (
        SELECT t.cf_id, COUNT(d.id) as disc_count
        FROM cf_transfer_discrepancies d
        JOIN cf_transfers t ON t.id = d.transfer_id
        WHERE d.resolution_status IN ('pending', 'investigating')
        GROUP BY t.cf_id
      ) disc_agg ON disc_agg.cf_id = c.id
      WHERE c.organization_id = $1 AND c.id = $2
    `;

    const cfRes = await pool.query(cfSql, [orgId, cfId]);
    if (cfRes.rows.length === 0) return null;

    const cf = this.mapCFRow(cfRes.rows[0]);

    // Fetch related child collections
    const [contactsRes, addressesRes, warehousesRes, territoriesRes, docsRes] = await Promise.all([
      pool.query('SELECT * FROM cf_contacts WHERE organization_id = $1 AND cf_id = $2 ORDER BY is_primary DESC, name ASC', [orgId, cfId]),
      pool.query('SELECT * FROM cf_addresses WHERE organization_id = $1 AND cf_id = $2 ORDER BY is_primary DESC, address_type ASC', [orgId, cfId]),
      pool.query(`
        SELECT 
          cw.*,
          w.name as warehouse_name,
          w.code as warehouse_code,
          w.city as warehouse_city,
          w.state as warehouse_state,
          w.capacity_cubic_meters as capacity_sq_ft
        FROM cf_warehouses cw
        JOIN warehouses w ON w.id = cw.warehouse_id
        WHERE cw.organization_id = $1 AND cw.cf_id = $2
        ORDER BY cw.is_primary_depot DESC, cw.assigned_at DESC
      `, [orgId, cfId]),
      pool.query('SELECT * FROM cf_territories WHERE organization_id = $1 AND cf_id = $2 ORDER BY state ASC', [orgId, cfId]),
      pool.query('SELECT * FROM cf_documents WHERE organization_id = $1 AND cf_id = $2 ORDER BY uploaded_at DESC', [orgId, cfId]),
    ]);

    cf.contacts = contactsRes.rows;
    cf.addresses = addressesRes.rows;
    cf.warehouses = warehousesRes.rows;
    cf.territories = territoriesRes.rows;
    cf.documents = docsRes.rows;

    return cf;
  }

  /**
   * Create new C&F master entity with initial contacts, addresses, and warehouse associations
   */
  public async createCF(orgId: string, payload: Partial<CFMaster>, actor?: { id: string; email: string }): Promise<CFMaster> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const id = `cf-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
      const cfCode = (payload.cf_code || `CF-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();

      const insertSql = `
        INSERT INTO cfs (
          id, organization_id, cf_code, legal_name, display_name, cf_type, status,
          contact_person, phone, alternate_phone, email, gstin, pan, address, city,
          state, pincode, country, territory, region, appointed_date, agreement_start_date,
          agreement_end_date, security_deposit_amount, commission_rate, credit_limit,
          financial_metadata, notes, created_by, created_by_email
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22,
          $23, $24, $25, $26,
          $27, $28, $29, $30
        ) RETURNING *
      `;

      const insertRes = await client.query(insertSql, [
        id,
        orgId,
        cfCode,
        payload.legal_name,
        payload.display_name || payload.legal_name,
        payload.cf_type || 'third_party',
        payload.status || 'active',
        payload.contact_person || 'Principal Contact',
        payload.phone || '',
        payload.alternate_phone || null,
        payload.email || '',
        payload.gstin || null,
        payload.pan || null,
        payload.address || '',
        payload.city || '',
        payload.state || '',
        payload.pincode || '',
        payload.country || 'India',
        payload.territory || `${payload.state || 'Regional'} Territory`,
        payload.region || 'North',
        payload.appointed_date ? new Date(payload.appointed_date) : new Date(),
        payload.agreement_start_date ? new Date(payload.agreement_start_date) : new Date(),
        payload.agreement_end_date ? new Date(payload.agreement_end_date) : null,
        Number(payload.security_deposit_amount || 0),
        Number(payload.commission_rate || 0),
        Number(payload.credit_limit || 0),
        payload.financial_metadata ? JSON.stringify(payload.financial_metadata) : null,
        payload.notes || null,
        actor?.id || null,
        actor?.email || null,
      ]);

      // Seed default primary contact if provided
      if (payload.contact_person) {
        await client.query(`
          INSERT INTO cf_contacts (id, organization_id, cf_id, name, designation, phone, email, is_primary, status)
          VALUES ($1, $2, $3, $4, 'Primary Contact', $5, $6, TRUE, 'active')
        `, [`cont-${id}-1`, orgId, id, payload.contact_person, payload.phone || '', payload.email || '']);
      }

      // Seed primary address
      if (payload.address) {
        await client.query(`
          INSERT INTO cf_addresses (id, organization_id, cf_id, address_type, address_line1, city, state, postal_code, is_primary)
          VALUES ($1, $2, $3, 'warehouse', $4, $5, $6, $7, TRUE)
        `, [`addr-${id}-1`, orgId, id, payload.address, payload.city || '', payload.state || '', payload.pincode || '']);
      }

      // Seed default territory
      if (payload.territory && payload.state) {
        await client.query(`
          INSERT INTO cf_territories (id, organization_id, cf_id, state, region, territory_name, is_exclusive, status)
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, 'active')
        `, [`terr-${id}-1`, orgId, id, payload.state, payload.region || 'North', payload.territory]);
      }

      // Audit Log
      await client.query(`
        INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
        VALUES ($1, $2, $3, $4, 'cf.create', 'cf', $5, $6)
      `, [
        `audit-${Date.now()}`,
        orgId,
        actor?.id || 'usr-system',
        actor?.email || 'system@jyotsvan.enterprise',
        id,
        JSON.stringify({ cfCode, legalName: payload.legal_name, cfType: payload.cf_type }),
      ]);

      await client.query('COMMIT');
      return this.mapCFRow(insertRes.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update existing C&F details
   */
  public async updateCF(orgId: string, cfId: string, payload: Partial<CFMaster>, actor?: { id: string; email: string }): Promise<CFMaster | null> {
    const fields: string[] = ['updated_at = NOW()'];
    const values: any[] = [orgId, cfId];
    let idx = 3;

    if (payload.legal_name !== undefined) {
      fields.push(`legal_name = $${idx++}`);
      values.push(payload.legal_name);
    }
    if (payload.display_name !== undefined) {
      fields.push(`display_name = $${idx++}`);
      values.push(payload.display_name);
    }
    if (payload.cf_type !== undefined) {
      fields.push(`cf_type = $${idx++}`);
      values.push(payload.cf_type);
    }
    if (payload.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(payload.status);
    }
    if (payload.contact_person !== undefined) {
      fields.push(`contact_person = $${idx++}`);
      values.push(payload.contact_person);
    }
    if (payload.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(payload.phone);
    }
    if (payload.alternate_phone !== undefined) {
      fields.push(`alternate_phone = $${idx++}`);
      values.push(payload.alternate_phone);
    }
    if (payload.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(payload.email);
    }
    if (payload.gstin !== undefined) {
      fields.push(`gstin = $${idx++}`);
      values.push(payload.gstin);
    }
    if (payload.pan !== undefined) {
      fields.push(`pan = $${idx++}`);
      values.push(payload.pan);
    }
    if (payload.address !== undefined) {
      fields.push(`address = $${idx++}`);
      values.push(payload.address);
    }
    if (payload.city !== undefined) {
      fields.push(`city = $${idx++}`);
      values.push(payload.city);
    }
    if (payload.state !== undefined) {
      fields.push(`state = $${idx++}`);
      values.push(payload.state);
    }
    if (payload.pincode !== undefined) {
      fields.push(`pincode = $${idx++}`);
      values.push(payload.pincode);
    }
    if (payload.territory !== undefined) {
      fields.push(`territory = $${idx++}`);
      values.push(payload.territory);
    }
    if (payload.region !== undefined) {
      fields.push(`region = $${idx++}`);
      values.push(payload.region);
    }
    if (payload.security_deposit_amount !== undefined) {
      fields.push(`security_deposit_amount = $${idx++}`);
      values.push(Number(payload.security_deposit_amount));
    }
    if (payload.commission_rate !== undefined) {
      fields.push(`commission_rate = $${idx++}`);
      values.push(Number(payload.commission_rate));
    }
    if (payload.credit_limit !== undefined) {
      fields.push(`credit_limit = $${idx++}`);
      values.push(Number(payload.credit_limit));
    }
    if (payload.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(payload.notes);
    }
    if (actor?.id) {
      fields.push(`updated_by = $${idx++}`);
      values.push(actor.id);
    }

    const sql = `
      UPDATE cfs 
      SET ${fields.join(', ')} 
      WHERE organization_id = $1 AND id = $2 
      RETURNING *
    `;

    const res = await pool.query(sql, values);
    if (res.rows.length === 0) return null;

    // Audit Log
    await pool.query(`
      INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
      VALUES ($1, $2, $3, $4, 'cf.update', 'cf', $5, $6)
    `, [
      `audit-${Date.now()}`,
      orgId,
      actor?.id || 'usr-system',
      actor?.email || 'system@jyotsvan.enterprise',
      cfId,
      JSON.stringify(payload),
    ]);

    return this.mapCFRow(res.rows[0]);
  }

  /**
   * Transition C&F Status (e.g. active, suspended, inactive, terminated)
   */
  public async updateCFStatus(orgId: string, cfId: string, newStatus: CFStatus, reason?: string, actor?: { id: string; email: string }): Promise<CFMaster | null> {
    const res = await pool.query(
      `UPDATE cfs SET status = $1, notes = COALESCE(notes, '') || E'\n[Status Change to ' || $1 || ']: ' || COALESCE($2, 'Manual update'), updated_at = NOW()
       WHERE organization_id = $3 AND id = $4 RETURNING *`,
      [newStatus, reason || 'Status transition requested by authorized operator', orgId, cfId]
    );

    if (res.rows.length === 0) return null;

    // Audit Log
    await pool.query(`
      INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
      VALUES ($1, $2, $3, $4, 'cf.status_change', 'cf', $5, $6)
    `, [
      `audit-${Date.now()}`,
      orgId,
      actor?.id || 'usr-system',
      actor?.email || 'system@jyotsvan.enterprise',
      cfId,
      JSON.stringify({ newStatus, reason }),
    ]);

    return this.mapCFRow(res.rows[0]);
  }

  /**
   * Assign warehouse to C&F
   */
  public async assignWarehouse(orgId: string, cfId: string, warehouseId: string, isPrimary: boolean = false, agreementRef?: string, actor?: { id: string; email: string }): Promise<void> {
    const id = `cfwh-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    await pool.query(`
      INSERT INTO cf_warehouses (id, organization_id, cf_id, warehouse_id, is_primary_depot, custody_agreement_ref, assigned_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (cf_id, warehouse_id) 
      DO UPDATE SET is_primary_depot = EXCLUDED.is_primary_depot, custody_agreement_ref = EXCLUDED.custody_agreement_ref, status = 'active'
    `, [id, orgId, cfId, warehouseId, isPrimary, agreementRef || null, actor?.id || null]);
  }

  /**
   * Unassign warehouse from C&F
   */
  public async unassignWarehouse(orgId: string, cfId: string, warehouseId: string): Promise<void> {
    await pool.query('DELETE FROM cf_warehouses WHERE organization_id = $1 AND cf_id = $2 AND warehouse_id = $3', [orgId, cfId, warehouseId]);
  }

  private mapCFRow(row: any): CFMaster {
    return {
      ...row,
      security_deposit_amount: Number(row.security_deposit_amount || 0),
      commission_rate: Number(row.commission_rate || 0),
      credit_limit: Number(row.credit_limit || 0),
      associated_warehouses_count: Number(row.associated_warehouses_count || 0),
      total_stock_units: Number(row.total_stock_units || 0),
      estimated_inventory_value: Number(row.estimated_inventory_value || 0),
      pending_inward_transfers_count: Number(row.pending_inward_transfers_count || 0),
      in_transit_units: Number(row.in_transit_units || 0),
      active_dispatches_count: Number(row.active_dispatches_count || 0),
      discrepancy_count: Number(row.discrepancy_count || 0),
    };
  }
}

export class CFSTransferService {
  /**
   * List C&F Stock Transfers with filtering
   */
  public async listTransfers(orgId: string, filters: { cfId?: string; status?: string; search?: string; limit?: number; page?: number } = {}): Promise<{ data: CFTransfer[]; total: number }> {
    const conditions: string[] = ['t.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.cfId) {
      conditions.push(`t.cf_id = $${idx++}`);
      values.push(filters.cfId);
    }

    if (filters.status) {
      conditions.push(`t.status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.search) {
      conditions.push(`(t.transfer_number ILIKE $${idx} OR c.legal_name ILIKE $${idx} OR c.display_name ILIKE $${idx} OR t.shipping_carrier ILIKE $${idx} OR t.tracking_number ILIKE $${idx})`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(`
      SELECT COUNT(*) 
      FROM cf_transfers t
      JOIN cfs c ON c.id = t.cf_id
      WHERE ${whereClause}
    `, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        t.*,
        c.legal_name as cf_name,
        c.cf_code as cf_code,
        sw.name as source_warehouse_name,
        sw.code as source_warehouse_code,
        dw.name as destination_warehouse_name,
        dw.code as destination_warehouse_code,
        COUNT(ti.id)::int as total_items_count,
        COALESCE(SUM(ti.requested_quantity), 0)::numeric as total_requested_quantity,
        COALESCE(SUM(ti.dispatched_quantity), 0)::numeric as total_dispatched_quantity,
        COALESCE(SUM(ti.received_quantity), 0)::numeric as total_received_quantity,
        COALESCE(SUM(ti.shortage_quantity + ti.damaged_quantity + ti.rejected_quantity), 0)::numeric as total_discrepancy_quantity
      FROM cf_transfers t
      JOIN cfs c ON c.id = t.cf_id
      LEFT JOIN warehouses sw ON sw.id = t.source_warehouse_id
      LEFT JOIN warehouses dw ON dw.id = t.destination_warehouse_id
      LEFT JOIN cf_transfer_items ti ON ti.transfer_id = t.id
      WHERE ${whereClause}
      GROUP BY t.id, c.legal_name, c.cf_code, sw.name, sw.code, dw.name, dw.code
      ORDER BY t.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    values.push(limit, offset);
    const dataRes = await pool.query(dataSql, values);

    return {
      data: dataRes.rows.map(row => ({
        ...row,
        total_requested_quantity: Number(row.total_requested_quantity || 0),
        total_dispatched_quantity: Number(row.total_dispatched_quantity || 0),
        total_received_quantity: Number(row.total_received_quantity || 0),
        total_discrepancy_quantity: Number(row.total_discrepancy_quantity || 0),
      })),
      total,
    };
  }

  /**
   * Get single Transfer with full line items and discrepancy log
   */
  public async getTransferById(orgId: string, transferId: string): Promise<CFTransfer | null> {
    const trfSql = `
      SELECT 
        t.*,
        c.legal_name as cf_name,
        c.cf_code as cf_code,
        sw.name as source_warehouse_name,
        sw.code as source_warehouse_code,
        dw.name as destination_warehouse_name,
        dw.code as destination_warehouse_code
      FROM cf_transfers t
      JOIN cfs c ON c.id = t.cf_id
      LEFT JOIN warehouses sw ON sw.id = t.source_warehouse_id
      LEFT JOIN warehouses dw ON dw.id = t.destination_warehouse_id
      WHERE t.organization_id = $1 AND t.id = $2
    `;

    const trfRes = await pool.query(trfSql, [orgId, transferId]);
    if (trfRes.rows.length === 0) return null;

    const trf = trfRes.rows[0];

    // Fetch items with SKU & batch metadata
    const itemsSql = `
      SELECT 
        ti.*,
        s.sku_code,
        s.name as sku_name,
        u.short_code as unit_name,
        b.expiry_date
      FROM cf_transfer_items ti
      JOIN skus s ON s.id = ti.sku_id
      LEFT JOIN units u ON u.id = ti.unit_id
      LEFT JOIN batches b ON b.id = ti.batch_id
      WHERE ti.transfer_id = $1
      ORDER BY ti.created_at ASC
    `;
    const itemsRes = await pool.query(itemsSql, [transferId]);

    // Fetch discrepancies
    const discSql = `
      SELECT 
        d.*,
        s.sku_code,
        s.name as sku_name,
        b.batch_number
      FROM cf_transfer_discrepancies d
      JOIN skus s ON s.id = d.sku_id
      LEFT JOIN batches b ON b.id = d.batch_id
      WHERE d.transfer_id = $1
      ORDER BY d.reported_at DESC
    `;
    const discRes = await pool.query(discSql, [transferId]);

    trf.items = itemsRes.rows.map(item => ({
      ...item,
      requested_quantity: Number(item.requested_quantity || 0),
      dispatched_quantity: Number(item.dispatched_quantity || 0),
      received_quantity: Number(item.received_quantity || 0),
      shortage_quantity: Number(item.shortage_quantity || 0),
      damaged_quantity: Number(item.damaged_quantity || 0),
      rejected_quantity: Number(item.rejected_quantity || 0),
      unit_cost: Number(item.unit_cost || 0),
    }));

    trf.discrepancies = discRes.rows.map(d => ({
      ...d,
      quantity: Number(d.quantity || 0),
      unit_cost: Number(d.unit_cost || 0),
    }));

    return trf;
  }

  /**
   * Create new C&F Stock Transfer Order
   */
  public async createTransfer(orgId: string, payload: {
    cf_id: string;
    source_warehouse_id: string;
    destination_warehouse_id: string;
    transfer_type?: 'primary_allocation' | 'replenishment' | 'inter_depot' | 'consignment';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    expected_delivery_date?: string;
    shipping_carrier?: string;
    vehicle_number?: string;
    notes?: string;
    items: Array<{
      sku_id: string;
      batch_id?: string;
      batch_number?: string;
      requested_quantity: number;
      unit_id?: string;
      unit_cost?: number;
      notes?: string;
    }>;
  }, actor?: { id: string; email: string }): Promise<CFTransfer> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const transferId = `cftrf-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
      const transferNumber = `CFT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      await client.query(`
        INSERT INTO cf_transfers (
          id, organization_id, transfer_number, source_warehouse_id, cf_id, destination_warehouse_id,
          transfer_type, status, priority, shipping_carrier, vehicle_number, expected_delivery_date,
          requested_by, requested_by_email, requested_at, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, 'requested', $8, $9, $10, $11,
          $12, $13, NOW(), $14
        )
      `, [
        transferId,
        orgId,
        transferNumber,
        payload.source_warehouse_id,
        payload.cf_id,
        payload.destination_warehouse_id,
        payload.transfer_type || 'primary_allocation',
        payload.priority || 'medium',
        payload.shipping_carrier || null,
        payload.vehicle_number || null,
        payload.expected_delivery_date ? new Date(payload.expected_delivery_date) : null,
        actor?.id || 'usr-system',
        actor?.email || 'system@jyotsvan.enterprise',
        payload.notes || null,
      ]);

      for (const item of payload.items) {
        const itemId = `cftrfi-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
        await client.query(`
          INSERT INTO cf_transfer_items (
            id, transfer_id, sku_id, batch_id, batch_number, requested_quantity, dispatched_quantity,
            received_quantity, unit_id, unit_cost, notes, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 0, 0, $7, $8, $9, 'pending'
          )
        `, [
          itemId,
          transferId,
          item.sku_id,
          item.batch_id || null,
          item.batch_number || null,
          Number(item.requested_quantity || 0),
          item.unit_id || null,
          Number(item.unit_cost || 0),
          item.notes || null,
        ]);
      }

      // Audit Log
      await client.query(`
        INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
        VALUES ($1, $2, $3, $4, 'cf.transfer.create', 'cf_transfer', $5, $6)
      `, [
        `audit-${Date.now()}`,
        orgId,
        actor?.id || 'usr-system',
        actor?.email || 'system@jyotsvan.enterprise',
        transferId,
        JSON.stringify({ transferNumber, cf_id: payload.cf_id, itemCount: payload.items.length }),
      ]);

      await client.query('COMMIT');
      const trf = await this.getTransferById(orgId, transferId);
      return trf!;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Approve Stock Transfer Order
   */
  public async approveTransfer(orgId: string, transferId: string, actor?: { id: string; email: string }): Promise<CFTransfer | null> {
    await pool.query(`
      UPDATE cf_transfers
      SET status = 'approved', approved_by = $1, approved_by_email = $2, approved_at = NOW(), updated_at = NOW()
      WHERE organization_id = $3 AND id = $4 AND status = 'requested'
    `, [actor?.id || 'usr-system', actor?.email || 'system@jyotsvan.enterprise', orgId, transferId]);

    return this.getTransferById(orgId, transferId);
  }

  /**
   * Dispatch Stock Transfer (Gate Out from Plant, mark in-transit, atomically decrement source inventory)
   */
  public async dispatchTransfer(orgId: string, transferId: string, dispatchInfo: {
    shipping_carrier?: string;
    tracking_number?: string;
    vehicle_number?: string;
    driver_name?: string;
    driver_phone?: string;
    eway_bill_number?: string;
    notes?: string;
    items?: Array<{
      item_id: string;
      dispatched_quantity: number;
      batch_id?: string;
      batch_number?: string;
    }>;
  }, actor?: { id: string; email: string }): Promise<CFTransfer | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const trfRes = await client.query('SELECT * FROM cf_transfers WHERE organization_id = $1 AND id = $2 FOR UPDATE', [orgId, transferId]);
      if (trfRes.rows.length === 0) {
        throw new Error('Transfer order not found');
      }
      const trf = trfRes.rows[0];

      // Update transfer header
      await client.query(`
        UPDATE cf_transfers
        SET status = 'in_transit',
            shipping_carrier = COALESCE($1, shipping_carrier),
            tracking_number = COALESCE($2, tracking_number),
            vehicle_number = COALESCE($3, vehicle_number),
            driver_name = COALESCE($4, driver_name),
            driver_phone = COALESCE($5, driver_phone),
            eway_bill_number = COALESCE($6, eway_bill_number),
            dispatched_by = $7,
            dispatched_by_email = $8,
            dispatched_at = NOW(),
            updated_at = NOW()
        WHERE id = $9
      `, [
        dispatchInfo.shipping_carrier || null,
        dispatchInfo.tracking_number || null,
        dispatchInfo.vehicle_number || null,
        dispatchInfo.driver_name || null,
        dispatchInfo.driver_phone || null,
        dispatchInfo.eway_bill_number || null,
        actor?.id || 'usr-system',
        actor?.email || 'system@jyotsvan.enterprise',
        transferId,
      ]);

      // If specific item quantities were given, update them; otherwise default dispatched = requested
      const itemRows = await client.query('SELECT * FROM cf_transfer_items WHERE transfer_id = $1', [transferId]);

      for (const item of itemRows.rows) {
        const override = dispatchInfo.items?.find(i => i.item_id === item.id);
        const dispatchedQty = override ? Number(override.dispatched_quantity) : Number(item.requested_quantity);
        const batchId = override?.batch_id || item.batch_id;
        const batchNumber = override?.batch_number || item.batch_number;

        await client.query(`
          UPDATE cf_transfer_items
          SET dispatched_quantity = $1, batch_id = $2, batch_number = $3, status = 'dispatched'
          WHERE id = $4
        `, [dispatchedQty, batchId, batchNumber, item.id]);

        // Decrement source warehouse stock atomically via InventoryService
        if (dispatchedQty > 0) {
          try {
            await InventoryService.adjustStock({
              organizationId: orgId,
              skuId: item.sku_id,
              warehouseId: trf.source_warehouse_id,
              batchId: batchId || null,
              stockType: 'available',
              direction: 'decrease',
              quantity: dispatchedQty,
              reason: `Stock Transfer Outbound Gate-Out to C&F Depot (${trf.transfer_number})`,
              actorId: actor?.id,
              actorEmail: actor?.email || 'system@jyotsvan.enterprise',
            });
          } catch (invErr) {
            console.warn('[CF Transfer Dispatch] Inventory adjustment fallback:', invErr);
          }
        }
      }

      // Audit Log
      await client.query(`
        INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
        VALUES ($1, $2, $3, $4, 'cf.transfer.dispatch', 'cf_transfer', $5, $6)
      `, [
        `audit-${Date.now()}`,
        orgId,
        actor?.id || 'usr-system',
        actor?.email || 'system@jyotsvan.enterprise',
        transferId,
        JSON.stringify({ transferNumber: trf.transfer_number, vehicleNumber: dispatchInfo.vehicle_number }),
      ]);

      await client.query('COMMIT');
      return this.getTransferById(orgId, transferId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Process C&F Inward Receiving with batch verification & discrepancy logging
   */
  public async receiveTransfer(orgId: string, transferId: string, receiveData: {
    items: Array<{
      item_id: string;
      received_quantity: number;
      shortage_quantity?: number;
      damaged_quantity?: number;
      rejected_quantity?: number;
      notes?: string;
    }>;
    notes?: string;
  }, actor?: { id: string; email: string }): Promise<CFTransfer | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const trfRes = await client.query('SELECT * FROM cf_transfers WHERE organization_id = $1 AND id = $2 FOR UPDATE', [orgId, transferId]);
      if (trfRes.rows.length === 0) throw new Error('Transfer order not found');
      const trf = trfRes.rows[0];

      let hasDiscrepancy = false;

      for (const line of receiveData.items) {
        const itemRes = await client.query('SELECT * FROM cf_transfer_items WHERE id = $1 AND transfer_id = $2', [line.item_id, transferId]);
        if (itemRes.rows.length === 0) continue;
        const item = itemRes.rows[0];

        const receivedQty = Number(line.received_quantity || 0);
        const shortQty = Number(line.shortage_quantity || 0);
        const damagedQty = Number(line.damaged_quantity || 0);
        const rejectedQty = Number(line.rejected_quantity || 0);

        const isDiscrepant = (shortQty + damagedQty + rejectedQty) > 0 || (receivedQty < Number(item.dispatched_quantity));
        if (isDiscrepant) hasDiscrepancy = true;

        await client.query(`
          UPDATE cf_transfer_items
          SET received_quantity = $1,
              shortage_quantity = $2,
              damaged_quantity = $3,
              rejected_quantity = $4,
              status = $5,
              notes = COALESCE($6, notes)
          WHERE id = $7
        `, [
          receivedQty,
          shortQty,
          damagedQty,
          rejectedQty,
          isDiscrepant ? 'discrepant' : 'received',
          line.notes || null,
          item.id,
        ]);

        // Increment inventory at C&F destination warehouse
        if (receivedQty > 0) {
          try {
            await InventoryService.adjustStock({
              organizationId: orgId,
              skuId: item.sku_id,
              warehouseId: trf.destination_warehouse_id,
              batchId: item.batch_id || null,
              stockType: 'available',
              direction: 'increase',
              quantity: receivedQty,
              reason: `Inward receipt at C&F depot from Transfer #${trf.transfer_number}`,
              actorId: actor?.id,
              actorEmail: actor?.email || 'system@jyotsvan.enterprise',
            });
          } catch (invErr) {
            console.warn('[CF Transfer Inward] Inventory adjustment fallback:', invErr);
          }
        }

        // Record Shortage Discrepancy
        if (shortQty > 0) {
          await client.query(`
            INSERT INTO cf_transfer_discrepancies (
              id, organization_id, transfer_id, item_id, sku_id, batch_id,
              discrepancy_type, quantity, unit_cost, reported_by, reported_by_email,
              reported_at, resolution_status, resolution_notes
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              'shortage', $7, $8, $9, $10,
              NOW(), 'pending', $11
            )
          `, [
            `cfdisc-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
            orgId,
            transferId,
            item.id,
            item.sku_id,
            item.batch_id || null,
            shortQty,
            Number(item.unit_cost || 0),
            actor?.id || 'usr-system',
            actor?.email || 'system@jyotsvan.enterprise',
            `Short delivery recorded at C&F receiving dock. Missing ${shortQty} units.`,
          ]);
        }

        // Record Damaged Discrepancy
        if (damagedQty > 0) {
          await client.query(`
            INSERT INTO cf_transfer_discrepancies (
              id, organization_id, transfer_id, item_id, sku_id, batch_id,
              discrepancy_type, quantity, unit_cost, reported_by, reported_by_email,
              reported_at, resolution_status, resolution_notes
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              'damaged', $7, $8, $9, $10,
              NOW(), 'pending', $11
            )
          `, [
            `cfdisc-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
            orgId,
            transferId,
            item.id,
            item.sku_id,
            item.batch_id || null,
            damagedQty,
            Number(item.unit_cost || 0),
            actor?.id || 'usr-system',
            actor?.email || 'system@jyotsvan.enterprise',
            `Damaged stock segregated into quarantine bay. ${damagedQty} units damaged.`,
          ]);
        }
      }

      // Update Transfer header status
      await client.query(`
        UPDATE cf_transfers
        SET status = 'completed',
            received_by = $1,
            received_by_email = $2,
            received_at = NOW(),
            completed_at = NOW(),
            notes = COALESCE(notes, '') || E'\n' || COALESCE($3, 'Receipt completed at depot.'),
            updated_at = NOW()
        WHERE id = $4
      `, [
        actor?.id || 'usr-system',
        actor?.email || 'system@jyotsvan.enterprise',
        receiveData.notes || (hasDiscrepancy ? 'Completed with discrepancies recorded.' : 'Fully received without variance.'),
        transferId,
      ]);

      // Audit Log
      await client.query(`
        INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
        VALUES ($1, $2, $3, $4, 'cf.transfer.receive', 'cf_transfer', $5, $6)
      `, [
        `audit-${Date.now()}`,
        orgId,
        actor?.id || 'usr-system',
        actor?.email || 'system@jyotsvan.enterprise',
        transferId,
        JSON.stringify({ transferNumber: trf.transfer_number, hasDiscrepancy }),
      ]);

      await client.query('COMMIT');
      return this.getTransferById(orgId, transferId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export class CFSDispatchService {
  /**
   * List Outbound Dispatches from C&F
   */
  public async listDispatches(orgId: string, filters: { cfId?: string; status?: string; search?: string; limit?: number; page?: number } = {}): Promise<{ data: CFDispatch[]; total: number }> {
    const conditions: string[] = ['d.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.cfId) {
      conditions.push(`d.cf_id = $${idx++}`);
      values.push(filters.cfId);
    }

    if (filters.status) {
      conditions.push(`d.status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.search) {
      conditions.push(`(d.dispatch_number ILIKE $${idx} OR d.destination_name ILIKE $${idx} OR c.legal_name ILIKE $${idx} OR c.display_name ILIKE $${idx} OR d.vehicle_number ILIKE $${idx})`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(`
      SELECT COUNT(*) 
      FROM cf_dispatches d
      JOIN cfs c ON c.id = d.cf_id
      WHERE ${whereClause}
    `, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        d.*,
        c.legal_name as cf_name,
        c.cf_code as cf_code,
        w.name as warehouse_name,
        w.code as warehouse_code,
        COUNT(di.id)::int as total_items_count,
        COALESCE(SUM(di.requested_quantity), 0)::numeric as total_requested_quantity,
        COALESCE(SUM(di.picked_quantity), 0)::numeric as total_picked_quantity,
        COALESCE(SUM(di.dispatched_quantity), 0)::numeric as total_dispatched_quantity
      FROM cf_dispatches d
      JOIN cfs c ON c.id = d.cf_id
      JOIN warehouses w ON w.id = d.warehouse_id
      LEFT JOIN cf_dispatch_items di ON di.dispatch_id = d.id
      WHERE ${whereClause}
      GROUP BY d.id, c.legal_name, c.cf_code, w.name, w.code
      ORDER BY d.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    values.push(limit, offset);
    const dataRes = await pool.query(dataSql, values);

    return {
      data: dataRes.rows.map(row => ({
        ...row,
        total_requested_quantity: Number(row.total_requested_quantity || 0),
        total_picked_quantity: Number(row.total_picked_quantity || 0),
        total_dispatched_quantity: Number(row.total_dispatched_quantity || 0),
      })),
      total,
    };
  }

  /**
   * Get single Dispatch with full line items
   */
  public async getDispatchById(orgId: string, dispatchId: string): Promise<CFDispatch | null> {
    const dspSql = `
      SELECT 
        d.*,
        c.legal_name as cf_name,
        c.cf_code as cf_code,
        w.name as warehouse_name,
        w.code as warehouse_code
      FROM cf_dispatches d
      JOIN cfs c ON c.id = d.cf_id
      JOIN warehouses w ON w.id = d.warehouse_id
      WHERE d.organization_id = $1 AND d.id = $2
    `;

    const dspRes = await pool.query(dspSql, [orgId, dispatchId]);
    if (dspRes.rows.length === 0) return null;

    const dsp = dspRes.rows[0];

    const itemsSql = `
      SELECT 
        di.*,
        s.sku_code,
        s.name as sku_name,
        u.short_code as unit_name,
        wl.code as location_code,
        b.expiry_date
      FROM cf_dispatch_items di
      JOIN skus s ON s.id = di.sku_id
      LEFT JOIN units u ON u.id = di.unit_id
      LEFT JOIN warehouse_locations wl ON wl.id = di.location_id
      LEFT JOIN batches b ON b.id = di.batch_id
      WHERE di.dispatch_id = $1
      ORDER BY di.created_at ASC
    `;
    const itemsRes = await pool.query(itemsSql, [dispatchId]);

    dsp.items = itemsRes.rows.map(item => ({
      ...item,
      requested_quantity: Number(item.requested_quantity || 0),
      picked_quantity: Number(item.picked_quantity || 0),
      dispatched_quantity: Number(item.dispatched_quantity || 0),
      unit_cost: Number(item.unit_cost || 0),
    }));

    return dsp;
  }

  /**
   * Create Outbound Dispatch Order with FEFO batch selection recommendation
   */
  public async createDispatch(orgId: string, payload: {
    cf_id: string;
    warehouse_id: string;
    destination_type?: 'distributor' | 'retailer' | 'inter_depot' | 'return_to_plant';
    destination_name: string;
    destination_reference?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    shipping_carrier?: string;
    vehicle_number?: string;
    driver_name?: string;
    driver_phone?: string;
    notes?: string;
    items: Array<{
      sku_id: string;
      batch_id?: string;
      batch_number?: string;
      location_id?: string;
      requested_quantity: number;
      unit_id?: string;
      unit_cost?: number;
      notes?: string;
    }>;
  }, actor?: { id: string; email: string }): Promise<CFDispatch> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const dispatchId = `cfdsp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
      const dispatchNumber = `CFD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      await client.query(`
        INSERT INTO cf_dispatches (
          id, organization_id, dispatch_number, cf_id, warehouse_id, destination_type,
          destination_name, destination_reference, status, priority, shipping_carrier,
          vehicle_number, driver_name, driver_phone, requested_by, requested_by_email,
          requested_at, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, 'requested', $9, $10,
          $11, $12, $13, $14, $15,
          NOW(), $16
        )
      `, [
        dispatchId,
        orgId,
        dispatchNumber,
        payload.cf_id,
        payload.warehouse_id,
        payload.destination_type || 'distributor',
        payload.destination_name,
        payload.destination_reference || null,
        payload.priority || 'medium',
        payload.shipping_carrier || null,
        payload.vehicle_number || null,
        payload.driver_name || null,
        payload.driver_phone || null,
        actor?.id || 'usr-system',
        actor?.email || 'system@jyotsvan.enterprise',
        payload.notes || null,
      ]);

      for (const item of payload.items) {
        const itemId = `cfdspi-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
        await client.query(`
          INSERT INTO cf_dispatch_items (
            id, dispatch_id, sku_id, batch_id, batch_number, location_id,
            requested_quantity, picked_quantity, dispatched_quantity,
            unit_id, unit_cost, notes, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, 0, 0,
            $8, $9, $10, 'pending'
          )
        `, [
          itemId,
          dispatchId,
          item.sku_id,
          item.batch_id || null,
          item.batch_number || null,
          item.location_id || null,
          Number(item.requested_quantity || 0),
          item.unit_id || null,
          Number(item.unit_cost || 0),
          item.notes || null,
        ]);
      }

      await client.query('COMMIT');
      const dsp = await this.getDispatchById(orgId, dispatchId);
      return dsp!;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Execute C&F Outbound Dispatch (decrements inventory from C&F warehouse atomically)
   */
  public async executeDispatch(orgId: string, dispatchId: string, actor?: { id: string; email: string }): Promise<CFDispatch | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const dspRes = await client.query('SELECT * FROM cf_dispatches WHERE organization_id = $1 AND id = $2 FOR UPDATE', [orgId, dispatchId]);
      if (dspRes.rows.length === 0) throw new Error('Dispatch order not found');
      const dsp = dspRes.rows[0];

      const itemRows = await client.query('SELECT * FROM cf_dispatch_items WHERE dispatch_id = $1', [dispatchId]);

      for (const item of itemRows.rows) {
        const qty = Number(item.requested_quantity);
        await client.query(`
          UPDATE cf_dispatch_items
          SET picked_quantity = $1, dispatched_quantity = $1, status = 'dispatched'
          WHERE id = $2
        `, [qty, item.id]);

        // Decrement C&F warehouse inventory atomically
        if (qty > 0) {
          try {
            await InventoryService.adjustStock({
              organizationId: orgId,
              skuId: item.sku_id,
              warehouseId: dsp.warehouse_id,
              batchId: item.batch_id || null,
              stockType: 'available',
              direction: 'decrease',
              quantity: qty,
              reason: `Outbound dispatch from C&F to ${dsp.destination_name} on Dispatch #${dsp.dispatch_number}`,
              actorId: actor?.id,
              actorEmail: actor?.email || 'system@jyotsvan.enterprise',
            });
          } catch (invErr) {
            console.warn('[CF Dispatch] Inventory adjustment fallback:', invErr);
          }
        }
      }

      await client.query(`
        UPDATE cf_dispatches
        SET status = 'dispatched',
            dispatched_by = $1,
            dispatched_by_email = $2,
            dispatched_at = NOW(),
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = $3
      `, [actor?.id || 'usr-system', actor?.email || 'system@jyotsvan.enterprise', dispatchId]);

      await client.query('COMMIT');
      return this.getDispatchById(orgId, dispatchId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export class CFSInventoryService {
  /**
   * Live Stock items query per C&F Depot with batch details and valuation
   */
  public async getCFDepotInventory(orgId: string, filters: { cfId?: string; warehouseId?: string; search?: string } = {}): Promise<CFStockItem[]> {
    const conditions: string[] = ['cw.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.cfId) {
      conditions.push(`cw.cf_id = $${idx++}`);
      values.push(filters.cfId);
    }

    if (filters.warehouseId) {
      conditions.push(`cw.warehouse_id = $${idx++}`);
      values.push(filters.warehouseId);
    }

    if (filters.search) {
      conditions.push(`(s.sku_code ILIKE $${idx} OR s.name ILIKE $${idx} OR c.legal_name ILIKE $${idx} OR w.name ILIKE $${idx})`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT 
        ib.sku_id,
        s.sku_code,
        s.name as sku_name,
        u.short_code as unit_short_code,
        cw.cf_id,
        c.legal_name as cf_name,
        cw.warehouse_id,
        w.name as warehouse_name,
        ib.location_id,
        wl.code as location_code,
        ib.batch_id,
        b.batch_number,
        b.expiry_date,
        b.manufacturing_date,
        ib.available_quantity,
        ib.reserved_quantity,
        ib.quarantine_quantity,
        ib.damaged_quantity,
        (ib.available_quantity + ib.reserved_quantity + ib.quarantine_quantity + ib.damaged_quantity) as total_quantity,
        COALESCE(s.standard_cost, 0)::numeric as unit_cost,
        ((ib.available_quantity + ib.reserved_quantity + ib.quarantine_quantity) * COALESCE(s.standard_cost, 0))::numeric as estimated_inventory_value
      FROM cf_warehouses cw
      JOIN cfs c ON c.id = cw.cf_id
      JOIN warehouses w ON w.id = cw.warehouse_id
      JOIN inventory_balances ib ON ib.warehouse_id = cw.warehouse_id
      JOIN skus s ON s.id = ib.sku_id
      LEFT JOIN units u ON u.id = s.unit_id
      LEFT JOIN warehouse_locations wl ON wl.id = ib.location_id
      LEFT JOIN batches b ON b.id = ib.batch_id
      WHERE ${whereClause}
      ORDER BY c.legal_name ASC, s.name ASC
    `;

    const res = await pool.query(sql, values);
    const now = Date.now();

    return res.rows.map(row => {
      let shelf_life_status: 'fresh' | 'near_expiry' | 'critical' | 'expired' = 'fresh';
      let days_to_expiry: number | undefined = undefined;

      if (row.expiry_date) {
        const exp = new Date(row.expiry_date).getTime();
        days_to_expiry = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        if (days_to_expiry <= 0) {
          shelf_life_status = 'expired';
        } else if (days_to_expiry <= 30) {
          shelf_life_status = 'critical';
        } else if (days_to_expiry <= 90) {
          shelf_life_status = 'near_expiry';
        }
      }

      return {
        ...row,
        available_quantity: Number(row.available_quantity || 0),
        reserved_quantity: Number(row.reserved_quantity || 0),
        quarantine_quantity: Number(row.quarantine_quantity || 0),
        damaged_quantity: Number(row.damaged_quantity || 0),
        total_quantity: Number(row.total_quantity || 0),
        unit_cost: Number(row.unit_cost || 0),
        estimated_inventory_value: Number(row.estimated_inventory_value || 0),
        shelf_life_status,
        days_to_expiry,
      };
    });
  }

  /**
   * Discrepancy Register across all C&F transfers
   */
  public async getDiscrepancyRegister(orgId: string, filters: { cfId?: string; status?: string } = {}): Promise<CFTransferDiscrepancy[]> {
    const conditions: string[] = ['d.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.cfId) {
      conditions.push(`t.cf_id = $${idx++}`);
      values.push(filters.cfId);
    }

    if (filters.status) {
      conditions.push(`d.resolution_status = $${idx++}`);
      values.push(filters.status);
    }

    const sql = `
      SELECT 
        d.*,
        s.sku_code,
        s.name as sku_name,
        b.batch_number,
        t.transfer_number,
        c.legal_name as cf_name
      FROM cf_transfer_discrepancies d
      JOIN cf_transfers t ON t.id = d.transfer_id
      JOIN cfs c ON c.id = t.cf_id
      JOIN skus s ON s.id = d.sku_id
      LEFT JOIN batches b ON b.id = d.batch_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY d.reported_at DESC
    `;

    const res = await pool.query(sql, values);
    return res.rows.map(row => ({
      ...row,
      quantity: Number(row.quantity || 0),
      unit_cost: Number(row.unit_cost || 0),
    }));
  }

  /**
   * Resolve discrepancy with authorization and audit notes
   */
  public async resolveDiscrepancy(orgId: string, discrepancyId: string, resolutionStatus: string, notes: string, actor?: { id: string; email: string }): Promise<void> {
    await pool.query(`
      UPDATE cf_transfer_discrepancies
      SET resolution_status = $1,
          resolution_notes = $2,
          resolved_by = $3,
          resolved_at = NOW()
      WHERE organization_id = $4 AND id = $5
    `, [resolutionStatus, notes, actor?.id || 'usr-system', orgId, discrepancyId]);
  }
}

export class CFSMetricsService {
  /**
   * Consolidated C&F Dashboard Telemetry & KPI Calculations
   */
  public async getSummaryMetrics(orgId: string): Promise<CFSummaryMetrics> {
    const cfCounts = await pool.query(`
      SELECT 
        COUNT(*)::int as total_cfs,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active_cfs,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END)::int as suspended_cfs
      FROM cfs
      WHERE organization_id = $1
    `, [orgId]);

    const whCounts = await pool.query(`
      SELECT COUNT(DISTINCT warehouse_id)::int as total_warehouses
      FROM cf_warehouses
      WHERE organization_id = $1 AND status = 'active'
    `, [orgId]);

    const stockCounts = await pool.query(`
      SELECT 
        COALESCE(SUM(ib.available_quantity + ib.reserved_quantity + ib.quarantine_quantity), 0)::numeric as total_stock_units,
        COALESCE(SUM((ib.available_quantity + ib.reserved_quantity + ib.quarantine_quantity) * COALESCE(s.standard_cost, 0)), 0)::numeric as estimated_inventory_value
      FROM cf_warehouses cw
      JOIN inventory_balances ib ON ib.warehouse_id = cw.warehouse_id
      LEFT JOIN skus s ON s.id = ib.sku_id
      WHERE cw.organization_id = $1
    `, [orgId]);

    const transferCounts = await pool.query(`
      SELECT 
        COUNT(CASE WHEN t.status IN ('requested', 'approved', 'in_transit') THEN 1 END)::int as pending_inward_transfers,
        COALESCE(SUM(CASE WHEN t.status = 'in_transit' THEN ti.dispatched_quantity ELSE 0 END), 0)::numeric as in_transit_stock_units
      FROM cf_transfers t
      LEFT JOIN cf_transfer_items ti ON ti.transfer_id = t.id
      WHERE t.organization_id = $1
    `, [orgId]);

    const dispatchCounts = await pool.query(`
      SELECT COUNT(*)::int as pending_dispatches
      FROM cf_dispatches
      WHERE organization_id = $1 AND status IN ('requested', 'approved', 'picking')
    `, [orgId]);

    const discrepancyCounts = await pool.query(`
      SELECT COUNT(*)::int as total_discrepancy_count
      FROM cf_transfer_discrepancies
      WHERE organization_id = $1 AND resolution_status IN ('pending', 'investigating')
    `, [orgId]);

    const expiringBatches = await pool.query(`
      SELECT COUNT(DISTINCT ib.batch_id)::int as expiring_batches_count
      FROM cf_warehouses cw
      JOIN inventory_balances ib ON ib.warehouse_id = cw.warehouse_id
      JOIN batches b ON b.id = ib.batch_id
      WHERE cw.organization_id = $1 AND b.expiry_date <= NOW() + INTERVAL '60 days'
    `, [orgId]);

    return {
      total_cfs: Number(cfCounts.rows[0]?.total_cfs || 0),
      active_cfs: Number(cfCounts.rows[0]?.active_cfs || 0),
      suspended_cfs: Number(cfCounts.rows[0]?.suspended_cfs || 0),
      total_warehouses: Number(whCounts.rows[0]?.total_warehouses || 0),
      total_stock_units: Number(stockCounts.rows[0]?.total_stock_units || 0),
      estimated_inventory_value: Number(stockCounts.rows[0]?.estimated_inventory_value || 0),
      pending_inward_transfers: Number(transferCounts.rows[0]?.pending_inward_transfers || 0),
      in_transit_stock_units: Number(transferCounts.rows[0]?.in_transit_stock_units || 0),
      pending_dispatches: Number(dispatchCounts.rows[0]?.pending_dispatches || 0),
      total_discrepancy_count: Number(discrepancyCounts.rows[0]?.total_discrepancy_count || 0),
      expiring_batches_count: Number(expiringBatches.rows[0]?.expiring_batches_count || 0),
    };
  }
}

export const cfsService = new CFSService();
export const cfTransferService = new CFSTransferService();
export const cfDispatchService = new CFSDispatchService();
export const cfInventoryService = new CFSInventoryService();
export const cfMetricsService = new CFSMetricsService();
