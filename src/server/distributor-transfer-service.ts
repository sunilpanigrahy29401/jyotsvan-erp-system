import { pool } from './db.ts';
import { InventoryService } from './inventory-service.ts';
import type {
  DistributorTransfer,
  DistributorTransferItem,
  DistributorDiscrepancy,
  DistributorOrder,
  DistributorReturn,
  DiscrepancyResolutionStatus,
} from '../types/distributors.ts';

export class DistributorTransferService {
  /**
   * List C&F to Distributor Transfers
   */
  public async listTransfers(
    orgId: string,
    filters: {
      distributor_id?: string;
      cf_id?: string;
      status?: string;
      priority?: string;
      search?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: DistributorTransfer[]; total: number }> {
    const conditions: string[] = ['t.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.distributor_id) {
      conditions.push(`t.distributor_id = $${idx++}`);
      values.push(filters.distributor_id);
    }

    if (filters.cf_id) {
      conditions.push(`t.cf_id = $${idx++}`);
      values.push(filters.cf_id);
    }

    if (filters.status && filters.status !== 'all') {
      conditions.push(`t.status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.priority && filters.priority !== 'all') {
      conditions.push(`t.priority = $${idx++}`);
      values.push(filters.priority);
    }

    if (filters.search) {
      conditions.push(
        `(t.transfer_number ILIKE $${idx} OR d.display_name ILIKE $${idx} OR d.distributor_code ILIKE $${idx} OR c.display_name ILIKE $${idx} OR t.shipping_carrier ILIKE $${idx} OR t.tracking_number ILIKE $${idx})`
      );
      values.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `
      SELECT COUNT(*)
      FROM distributor_transfers t
      JOIN distributors d ON d.id = t.distributor_id
      JOIN cfs c ON c.id = t.cf_id
      WHERE ${whereClause}
    `,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        t.*,
        d.display_name as distributor_name,
        d.distributor_code as distributor_code,
        c.display_name as cf_name,
        c.cf_code as cf_code,
        w.name as source_warehouse_name,
        (SELECT COALESCE(SUM(ti.requested_quantity), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_requested_quantity,
        (SELECT COALESCE(SUM(ti.dispatched_quantity), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_dispatched_quantity,
        (SELECT COALESCE(SUM(ti.received_quantity), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_received_quantity,
        (SELECT COALESCE(SUM(ti.shortage_quantity), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_shortage_quantity,
        (SELECT COALESCE(SUM(ti.damaged_quantity), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_damaged_quantity,
        (SELECT COALESCE(SUM(ti.dispatched_quantity * ti.unit_cost), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_valuation
      FROM distributor_transfers t
      JOIN distributors d ON d.id = t.distributor_id
      JOIN cfs c ON c.id = t.cf_id
      LEFT JOIN warehouses w ON w.id = t.source_warehouse_id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    values.push(limit, offset);
    const res = await pool.query(dataSql, values);

    return {
      data: res.rows.map(this.mapTransferRow),
      total,
    };
  }

  /**
   * Get single transfer with items
   */
  public async getTransferById(orgId: string, transferId: string): Promise<DistributorTransfer | null> {
    const res = await pool.query(
      `
      SELECT 
        t.*,
        d.display_name as distributor_name,
        d.distributor_code as distributor_code,
        c.display_name as cf_name,
        c.cf_code as cf_code,
        w.name as source_warehouse_name,
        (SELECT COALESCE(SUM(ti.requested_quantity), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_requested_quantity,
        (SELECT COALESCE(SUM(ti.dispatched_quantity), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_dispatched_quantity,
        (SELECT COALESCE(SUM(ti.received_quantity), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_received_quantity,
        (SELECT COALESCE(SUM(ti.shortage_quantity), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_shortage_quantity,
        (SELECT COALESCE(SUM(ti.damaged_quantity), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_damaged_quantity,
        (SELECT COALESCE(SUM(ti.dispatched_quantity * ti.unit_cost), 0) FROM distributor_transfer_items ti WHERE ti.transfer_id = t.id) as total_valuation
      FROM distributor_transfers t
      JOIN distributors d ON d.id = t.distributor_id
      JOIN cfs c ON c.id = t.cf_id
      LEFT JOIN warehouses w ON w.id = t.source_warehouse_id
      WHERE t.organization_id = $1 AND t.id = $2
    `,
      [orgId, transferId]
    );

    if (res.rows.length === 0) return null;
    const trf = this.mapTransferRow(res.rows[0]);

    const itemRows = await pool.query(
      `
      SELECT 
        ti.*,
        s.sku_code,
        s.name as sku_name,
        u.short_code as unit_short_code,
        b.expiry_date
      FROM distributor_transfer_items ti
      JOIN skus s ON s.id = ti.sku_id
      LEFT JOIN units u ON u.id = ti.unit_id
      LEFT JOIN batches b ON b.id = ti.batch_id
      WHERE ti.transfer_id = $1
      ORDER BY s.name ASC
    `,
      [transferId]
    );

    trf.items = itemRows.rows.map(item => ({
      ...item,
      requested_quantity: Number(item.requested_quantity || 0),
      dispatched_quantity: Number(item.dispatched_quantity || 0),
      received_quantity: Number(item.received_quantity || 0),
      shortage_quantity: Number(item.shortage_quantity || 0),
      damaged_quantity: Number(item.damaged_quantity || 0),
      rejected_quantity: Number(item.rejected_quantity || 0),
      unit_cost: Number(item.unit_cost || 0),
    }));

    return trf;
  }

  /**
   * Create Transfer Request from C&F to Distributor
   */
  public async createTransfer(
    orgId: string,
    payload: {
      distributor_id: string;
      cf_id: string;
      source_warehouse_id?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      expected_delivery_date?: string;
      shipping_carrier?: string;
      tracking_number?: string;
      vehicle_number?: string;
      driver_name?: string;
      driver_phone?: string;
      eway_bill_number?: string;
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
    },
    actor?: { id: string; email: string }
  ): Promise<DistributorTransfer> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const transferId = `dtrf-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
      const transferNumber = `DTRF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      // Derive source warehouse from C&F mapping if not specified
      let sourceWarehouseId = payload.source_warehouse_id;
      if (!sourceWarehouseId) {
        const cfWh = await client.query(
          'SELECT warehouse_id FROM cf_warehouse_mappings WHERE cf_id = $1 AND is_primary = TRUE LIMIT 1',
          [payload.cf_id]
        );
        if (cfWh.rows.length > 0) {
          sourceWarehouseId = cfWh.rows[0].warehouse_id;
        } else {
          const anyWh = await client.query('SELECT id FROM warehouses WHERE organization_id = $1 LIMIT 1', [orgId]);
          sourceWarehouseId = anyWh.rows[0]?.id || null;
        }
      }

      await client.query(
        `
        INSERT INTO distributor_transfers (
          id, organization_id, transfer_number, distributor_id, cf_id, source_warehouse_id,
          status, priority, shipping_carrier, tracking_number, vehicle_number, driver_name, driver_phone,
          eway_bill_number, expected_delivery_date, requested_by, requested_by_email, requested_at, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          'requested', $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, NOW(), $17
        )
      `,
        [
          transferId,
          orgId,
          transferNumber,
          payload.distributor_id,
          payload.cf_id,
          sourceWarehouseId,
          payload.priority || 'medium',
          payload.shipping_carrier || null,
          payload.tracking_number || null,
          payload.vehicle_number || null,
          payload.driver_name || null,
          payload.driver_phone || null,
          payload.eway_bill_number || null,
          payload.expected_delivery_date ? new Date(payload.expected_delivery_date) : null,
          actor?.id || 'usr-system',
          actor?.email || 'system@jyotsvan.enterprise',
          payload.notes || null,
        ]
      );

      for (const item of payload.items) {
        const itemId = `dtrfi-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
        await client.query(
          `
          INSERT INTO distributor_transfer_items (
            id, transfer_id, sku_id, batch_id, batch_number, requested_quantity, dispatched_quantity,
            received_quantity, unit_id, unit_cost, notes, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 0, 0, $7, $8, $9, 'pending'
          )
        `,
          [
            itemId,
            transferId,
            item.sku_id,
            item.batch_id || null,
            item.batch_number || null,
            Number(item.requested_quantity || 0),
            item.unit_id || null,
            Number(item.unit_cost || 0),
            item.notes || null,
          ]
        );
      }

      await client.query(
        `
        INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
        VALUES ($1, $2, $3, $4, 'distributor_transfer.create', 'distributor_transfer', $5, $6)
      `,
        [
          `audit-${Date.now()}`,
          orgId,
          actor?.id || 'usr-system',
          actor?.email || 'system@jyotsvan.enterprise',
          transferId,
          JSON.stringify({ transferNumber, distributorId: payload.distributor_id, cfId: payload.cf_id }),
        ]
      );

      await client.query('COMMIT');

      const created = await this.getTransferById(orgId, transferId);
      return created!;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Approve Transfer Request
   */
  public async approveTransfer(
    orgId: string,
    transferId: string,
    actor?: { id: string; email: string }
  ): Promise<DistributorTransfer | null> {
    await pool.query(
      `
      UPDATE distributor_transfers
      SET status = 'approved', approved_by = $1, approved_by_email = $2, approved_at = NOW(), updated_at = NOW()
      WHERE organization_id = $3 AND id = $4 AND status IN ('draft', 'requested')
    `,
      [actor?.id || 'usr-system', actor?.email || 'system@jyotsvan.enterprise', orgId, transferId]
    );

    await pool.query(
      `
      INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
      VALUES ($1, $2, $3, $4, 'distributor_transfer.approve', 'distributor_transfer', $5, $6)
    `,
      [
        `audit-${Date.now()}`,
        orgId,
        actor?.id || 'usr-system',
        actor?.email || 'system@jyotsvan.enterprise',
        transferId,
        JSON.stringify({ approved: true }),
      ]
    );

    return this.getTransferById(orgId, transferId);
  }

  /**
   * Dispatch Transfer: Gate out from C&F depot, update status to in_transit, decrement inventory
   */
  public async dispatchTransfer(
    orgId: string,
    transferId: string,
    dispatchInfo: {
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
    },
    actor?: { id: string; email: string }
  ): Promise<DistributorTransfer | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const trfRes = await client.query(
        'SELECT * FROM distributor_transfers WHERE organization_id = $1 AND id = $2 FOR UPDATE',
        [orgId, transferId]
      );
      if (trfRes.rows.length === 0) throw new Error('Transfer not found');
      const trf = trfRes.rows[0];

      await client.query(
        `
        UPDATE distributor_transfers
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
      `,
        [
          dispatchInfo.shipping_carrier || null,
          dispatchInfo.tracking_number || null,
          dispatchInfo.vehicle_number || null,
          dispatchInfo.driver_name || null,
          dispatchInfo.driver_phone || null,
          dispatchInfo.eway_bill_number || null,
          actor?.id || 'usr-system',
          actor?.email || 'system@jyotsvan.enterprise',
          transferId,
        ]
      );

      const itemRows = await client.query('SELECT * FROM distributor_transfer_items WHERE transfer_id = $1', [
        transferId,
      ]);

      for (const item of itemRows.rows) {
        const override = dispatchInfo.items?.find(i => i.item_id === item.id);
        const dispatchedQty = override ? Number(override.dispatched_quantity) : Number(item.requested_quantity);
        const batchId = override?.batch_id || item.batch_id;
        const batchNumber = override?.batch_number || item.batch_number;

        await client.query(
          `
          UPDATE distributor_transfer_items
          SET dispatched_quantity = $1, batch_id = $2, batch_number = $3, status = 'dispatched'
          WHERE id = $4
        `,
          [dispatchedQty, batchId, batchNumber, item.id]
        );

        // Decrement source C&F / warehouse stock atomically via Inventory Engine
        if (dispatchedQty > 0 && trf.source_warehouse_id) {
          try {
            await InventoryService.adjustStock({
              organizationId: orgId,
              skuId: item.sku_id,
              warehouseId: trf.source_warehouse_id,
              batchId: batchId || null,
              stockType: 'available',
              direction: 'decrease',
              quantity: dispatchedQty,
              reason: `Distributor Outbound Gate-Out Dispatch (${trf.transfer_number})`,
              actorId: actor?.id,
              actorEmail: actor?.email || 'system@jyotsvan.enterprise',
            });
          } catch (invErr) {
            console.warn('[Distributor Transfer Dispatch] Inventory adjustment fallback:', invErr);
          }
        }
      }

      await client.query(
        `
        INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
        VALUES ($1, $2, $3, $4, 'distributor_transfer.dispatch', 'distributor_transfer', $5, $6)
      `,
        [
          `audit-${Date.now()}`,
          orgId,
          actor?.id || 'usr-system',
          actor?.email || 'system@jyotsvan.enterprise',
          transferId,
          JSON.stringify({ transferNumber: trf.transfer_number, carrier: dispatchInfo.shipping_carrier }),
        ]
      );

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
   * Receive Transfer at Distributor:
   * Inwards stock into distributor_stock table, updates transfer items, logs any shortages/damages.
   */
  public async receiveTransfer(
    orgId: string,
    transferId: string,
    receiveData: {
      items: Array<{
        item_id: string;
        received_quantity: number;
        shortage_quantity?: number;
        damaged_quantity?: number;
        rejected_quantity?: number;
        notes?: string;
      }>;
      notes?: string;
    },
    actor?: { id: string; email: string }
  ): Promise<DistributorTransfer | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const trfRes = await client.query(
        'SELECT * FROM distributor_transfers WHERE organization_id = $1 AND id = $2 FOR UPDATE',
        [orgId, transferId]
      );
      if (trfRes.rows.length === 0) throw new Error('Transfer not found');
      const trf = trfRes.rows[0];

      let hasDiscrepancy = false;

      for (const line of receiveData.items) {
        const itemRes = await client.query(
          'SELECT * FROM distributor_transfer_items WHERE id = $1 AND transfer_id = $2',
          [line.item_id, transferId]
        );
        if (itemRes.rows.length === 0) continue;
        const item = itemRes.rows[0];

        const receivedQty = Number(line.received_quantity || 0);
        const shortageQty = Number(line.shortage_quantity || 0);
        const damagedQty = Number(line.damaged_quantity || 0);
        const rejectedQty = Number(line.rejected_quantity || 0);

        if (shortageQty > 0 || damagedQty > 0 || rejectedQty > 0) {
          hasDiscrepancy = true;
        }

        await client.query(
          `
          UPDATE distributor_transfer_items
          SET received_quantity = $1,
              shortage_quantity = $2,
              damaged_quantity = $3,
              rejected_quantity = $4,
              notes = COALESCE($5, notes),
              status = 'received'
          WHERE id = $6
        `,
          [receivedQty, shortageQty, damagedQty, rejectedQty, line.notes || null, line.item_id]
        );

        // Record Discrepancies if any
        if (shortageQty > 0) {
          const discId = `ddisc-${Date.now().toString(36)}-short-${Math.random().toString(36).substr(2, 4)}`;
          await client.query(
            `
            INSERT INTO distributor_discrepancies (
              id, organization_id, transfer_id, distributor_id, cf_id, item_id, sku_id, batch_id, batch_number,
              discrepancy_type, quantity, unit_cost, reported_by, reported_by_email, reported_at, resolution_status, resolution_notes
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, 'shortage', $10, $11, $12, $13, NOW(), 'pending', 'Reported shortage during physical receiving gate check.'
            )
          `,
            [
              discId,
              orgId,
              transferId,
              trf.distributor_id,
              trf.cf_id,
              line.item_id,
              item.sku_id,
              item.batch_id,
              item.batch_number,
              shortageQty,
              Number(item.unit_cost || 0),
              actor?.id || 'usr-system',
              actor?.email || 'system@jyotsvan.enterprise',
            ]
          );
        }

        if (damagedQty > 0) {
          const discId = `ddisc-${Date.now().toString(36)}-dam-${Math.random().toString(36).substr(2, 4)}`;
          await client.query(
            `
            INSERT INTO distributor_discrepancies (
              id, organization_id, transfer_id, distributor_id, cf_id, item_id, sku_id, batch_id, batch_number,
              discrepancy_type, quantity, unit_cost, reported_by, reported_by_email, reported_at, resolution_status, resolution_notes
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, 'damaged', $10, $11, $12, $13, NOW(), 'pending', 'Physical damage observed on goods packaging upon unsealing.'
            )
          `,
            [
              discId,
              orgId,
              transferId,
              trf.distributor_id,
              trf.cf_id,
              line.item_id,
              item.sku_id,
              item.batch_id,
              item.batch_number,
              damagedQty,
              Number(item.unit_cost || 0),
              actor?.id || 'usr-system',
              actor?.email || 'system@jyotsvan.enterprise',
            ]
          );
        }

        // Inward received goods into distributor_stock (channel inventory)
        if (receivedQty > 0) {
          const stockId = `dstock-${trf.distributor_id}-${item.sku_id}-${item.batch_number || 'default'}`;
          await client.query(
            `
            INSERT INTO distributor_stock (
              id, organization_id, distributor_id, sku_id, batch_id, batch_number,
              quantity_on_hand, quantity_available, quantity_reserved, quantity_damaged, quantity_quarantine,
              unit_id, unit_cost, source_cf_id, last_inward_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $7, 0, 0, 0,
              $8, $9, $10, NOW(), NOW()
            )
            ON CONFLICT (distributor_id, sku_id, batch_number) DO UPDATE SET
              quantity_on_hand = distributor_stock.quantity_on_hand + EXCLUDED.quantity_on_hand,
              quantity_available = distributor_stock.quantity_available + EXCLUDED.quantity_available,
              source_cf_id = EXCLUDED.source_cf_id,
              last_inward_at = NOW(),
              updated_at = NOW()
          `,
            [
              stockId,
              orgId,
              trf.distributor_id,
              item.sku_id,
              item.batch_id || null,
              item.batch_number || null,
              receivedQty,
              item.unit_id || null,
              Number(item.unit_cost || 0),
              trf.cf_id,
            ]
          );
        }
      }

      await client.query(
        `
        UPDATE distributor_transfers
        SET status = 'completed',
            received_by = $1,
            received_by_email = $2,
            received_at = NOW(),
            completed_at = NOW(),
            notes = COALESCE($3, notes),
            updated_at = NOW()
        WHERE id = $4
      `,
        [actor?.id || 'usr-system', actor?.email || 'system@jyotsvan.enterprise', receiveData.notes || null, transferId]
      );

      await client.query(
        `
        INSERT INTO audit_logs (id, organization_id, user_id, actor_email, action, entity_type, entity_id, details)
        VALUES ($1, $2, $3, $4, 'distributor_transfer.receive', 'distributor_transfer', $5, $6)
      `,
        [
          `audit-${Date.now()}`,
          orgId,
          actor?.id || 'usr-system',
          actor?.email || 'system@jyotsvan.enterprise',
          transferId,
          JSON.stringify({ hasDiscrepancy, notes: receiveData.notes }),
        ]
      );

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
   * Cancel Transfer
   */
  public async cancelTransfer(
    orgId: string,
    transferId: string,
    reason?: string,
    actor?: { id: string; email: string }
  ): Promise<DistributorTransfer | null> {
    await pool.query(
      `
      UPDATE distributor_transfers
      SET status = 'cancelled',
          cancelled_by = $1,
          cancelled_by_email = $2,
          cancelled_at = NOW(),
          cancellation_reason = $3,
          updated_at = NOW()
      WHERE organization_id = $4 AND id = $5 AND status IN ('draft', 'requested', 'approved')
    `,
      [actor?.id || 'usr-system', actor?.email || 'system@jyotsvan.enterprise', reason || null, orgId, transferId]
    );

    return this.getTransferById(orgId, transferId);
  }

  /**
   * Discrepancies Listing and Resolution
   */
  public async listDiscrepancies(
    orgId: string,
    filters: {
      distributor_id?: string;
      cf_id?: string;
      status?: DiscrepancyResolutionStatus | string;
      search?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: DistributorDiscrepancy[]; total: number }> {
    const conditions: string[] = ['dd.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.distributor_id) {
      conditions.push(`dd.distributor_id = $${idx++}`);
      values.push(filters.distributor_id);
    }

    if (filters.cf_id) {
      conditions.push(`dd.cf_id = $${idx++}`);
      values.push(filters.cf_id);
    }

    if (filters.status && filters.status !== 'all') {
      conditions.push(`dd.resolution_status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.search) {
      conditions.push(
        `(d.display_name ILIKE $${idx} OR s.name ILIKE $${idx} OR s.sku_code ILIKE $${idx} OR dd.batch_number ILIKE $${idx} OR t.transfer_number ILIKE $${idx})`
      );
      values.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `
      SELECT COUNT(*)
      FROM distributor_discrepancies dd
      JOIN distributors d ON d.id = dd.distributor_id
      JOIN skus s ON s.id = dd.sku_id
      JOIN distributor_transfers t ON t.id = dd.transfer_id
      WHERE ${whereClause}
    `,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        dd.*,
        t.transfer_number,
        d.display_name as distributor_name,
        d.distributor_code,
        c.display_name as cf_name,
        s.sku_code,
        s.name as sku_name
      FROM distributor_discrepancies dd
      JOIN distributors d ON d.id = dd.distributor_id
      JOIN skus s ON s.id = dd.sku_id
      JOIN distributor_transfers t ON t.id = dd.transfer_id
      LEFT JOIN cfs c ON c.id = dd.cf_id
      WHERE ${whereClause}
      ORDER BY dd.reported_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    values.push(limit, offset);
    const res = await pool.query(dataSql, values);

    const data = res.rows.map(row => ({
      ...row,
      quantity: Number(row.quantity || 0),
      unit_cost: Number(row.unit_cost || 0),
      total_loss_value: Number(row.quantity || 0) * Number(row.unit_cost || 0),
    }));

    return { data, total };
  }

  public async resolveDiscrepancy(
    orgId: string,
    discrepancyId: string,
    payload: {
      resolution_status: DiscrepancyResolutionStatus;
      resolution_notes?: string;
    },
    actor?: { id: string; email: string }
  ): Promise<DistributorDiscrepancy | null> {
    await pool.query(
      `
      UPDATE distributor_discrepancies
      SET resolution_status = $1,
          resolution_notes = $2,
          resolved_by = $3,
          resolved_at = NOW()
      WHERE organization_id = $4 AND id = $5
    `,
      [
        payload.resolution_status,
        payload.resolution_notes || null,
        actor?.id || 'usr-system',
        orgId,
        discrepancyId,
      ]
    );

    const res = await pool.query('SELECT * FROM distributor_discrepancies WHERE id = $1', [discrepancyId]);
    return res.rows[0] || null;
  }

  /**
   * Order Requests Foundation (Phase 18 bridge)
   */
  public async listOrders(
    orgId: string,
    filters: {
      distributor_id?: string;
      status?: string;
      search?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: DistributorOrder[]; total: number }> {
    const conditions: string[] = ['o.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.distributor_id) {
      conditions.push(`o.distributor_id = $${idx++}`);
      values.push(filters.distributor_id);
    }

    if (filters.status && filters.status !== 'all') {
      conditions.push(`o.status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.search) {
      conditions.push(`(o.order_number ILIKE $${idx} OR d.display_name ILIKE $${idx})`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `
      SELECT COUNT(*)
      FROM distributor_orders o
      JOIN distributors d ON d.id = o.distributor_id
      WHERE ${whereClause}
    `,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        o.*,
        d.display_name as distributor_name,
        d.distributor_code,
        c.display_name as cf_name
      FROM distributor_orders o
      JOIN distributors d ON d.id = o.distributor_id
      LEFT JOIN cfs c ON c.id = o.cf_id
      WHERE ${whereClause}
      ORDER BY o.requested_date DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    values.push(limit, offset);
    const res = await pool.query(dataSql, values);

    const data: DistributorOrder[] = res.rows.map(row => ({
      ...row,
      total_quantity: Number(row.total_quantity || 0),
      total_estimated_amount: Number(row.total_estimated_amount || 0),
      total_items_count: Number(row.total_items_count || 0),
    }));

    return { data, total };
  }

  public async createOrder(
    orgId: string,
    payload: {
      distributor_id: string;
      cf_id?: string;
      requested_delivery_date?: string;
      notes?: string;
      items: Array<{
        sku_id: string;
        requested_quantity: number;
        unit_cost?: number;
      }>;
    },
    actor?: { id: string; email: string }
  ): Promise<DistributorOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderId = `dord-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
      const orderNumber = `DORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      let totalQty = 0;
      let totalAmt = 0;

      for (const item of payload.items) {
        totalQty += Number(item.requested_quantity || 0);
        totalAmt += Number(item.requested_quantity || 0) * Number(item.unit_cost || 0);
      }

      await client.query(
        `
        INSERT INTO distributor_orders (
          id, organization_id, order_number, distributor_id, cf_id, status, requested_date,
          requested_delivery_date, total_items_count, total_quantity, total_estimated_amount,
          currency, notes, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, 'submitted', NOW(),
          $6, $7, $8, $9, 'INR', $10, $11
        )
      `,
        [
          orderId,
          orgId,
          orderNumber,
          payload.distributor_id,
          payload.cf_id || null,
          payload.requested_delivery_date ? new Date(payload.requested_delivery_date) : null,
          payload.items.length,
          totalQty,
          totalAmt,
          payload.notes || null,
          actor?.id || 'usr-system',
        ]
      );

      for (const item of payload.items) {
        const itemId = `dordi-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
        const price = Number(item.requested_quantity || 0) * Number(item.unit_cost || 0);
        await client.query(
          `
          INSERT INTO distributor_order_items (
            id, order_id, sku_id, requested_quantity, approved_quantity, unit_cost, total_price
          ) VALUES ($1, $2, $3, $4, $4, $5, $6)
        `,
          [itemId, orderId, item.sku_id, Number(item.requested_quantity || 0), Number(item.unit_cost || 0), price]
        );
      }

      await client.query('COMMIT');

      const created = await this.listOrders(orgId, { search: orderNumber });
      return created.data[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async approveOrder(
    orgId: string,
    orderId: string,
    actor?: { id: string; email: string }
  ): Promise<DistributorOrder | null> {
    await pool.query(
      `
      UPDATE distributor_orders
      SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
      WHERE organization_id = $2 AND id = $3
    `,
      [actor?.id || 'usr-system', orgId, orderId]
    );

    const res = await this.listOrders(orgId, { search: orderId });
    return res.data[0] || null;
  }

  /**
   * Returns Management Foundation
   */
  public async listReturns(
    orgId: string,
    filters: {
      distributor_id?: string;
      status?: string;
      search?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: DistributorReturn[]; total: number }> {
    const conditions: string[] = ['r.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.distributor_id) {
      conditions.push(`r.distributor_id = $${idx++}`);
      values.push(filters.distributor_id);
    }

    if (filters.status && filters.status !== 'all') {
      conditions.push(`r.status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.search) {
      conditions.push(`(r.return_number ILIKE $${idx} OR d.display_name ILIKE $${idx} OR s.name ILIKE $${idx})`);
      values.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `
      SELECT COUNT(*)
      FROM distributor_returns r
      JOIN distributors d ON d.id = r.distributor_id
      JOIN skus s ON s.id = r.sku_id
      WHERE ${whereClause}
    `,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const dataSql = `
      SELECT 
        r.*,
        d.display_name as distributor_name,
        d.distributor_code,
        s.sku_code,
        s.name as sku_name,
        c.display_name as destination_cf_name
      FROM distributor_returns r
      JOIN distributors d ON d.id = r.distributor_id
      JOIN skus s ON s.id = r.sku_id
      LEFT JOIN cfs c ON c.id = r.destination_cf_id
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    values.push(limit, offset);
    const res = await pool.query(dataSql, values);

    const data: DistributorReturn[] = res.rows.map(row => ({
      ...row,
      quantity: Number(row.quantity || 0),
      unit_cost: Number(row.unit_cost || 0),
      total_value: Number(row.total_value || 0),
    }));

    return { data, total };
  }

  public async createReturn(
    orgId: string,
    payload: {
      distributor_id: string;
      destination_cf_id?: string;
      sku_id: string;
      batch_id?: string;
      batch_number?: string;
      quantity: number;
      unit_cost?: number;
      reason: any;
      notes?: string;
    },
    actor?: { id: string; email: string }
  ): Promise<DistributorReturn> {
    const returnId = `dret-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const returnNumber = `DRET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const cost = Number(payload.unit_cost || 0);
    const totalVal = Number(payload.quantity || 0) * cost;

    const res = await pool.query(
      `
      INSERT INTO distributor_returns (
        id, organization_id, return_number, distributor_id, destination_cf_id, sku_id,
        batch_id, batch_number, quantity, unit_cost, total_value, reason, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'submitted', $13, $14)
      RETURNING *
    `,
      [
        returnId,
        orgId,
        returnNumber,
        payload.distributor_id,
        payload.destination_cf_id || null,
        payload.sku_id,
        payload.batch_id || null,
        payload.batch_number || null,
        Number(payload.quantity || 0),
        cost,
        totalVal,
        payload.reason || 'damaged',
        payload.notes || null,
        actor?.id || 'usr-system',
      ]
    );

    return res.rows[0];
  }

  private mapTransferRow(row: any): DistributorTransfer {
    return {
      ...row,
      total_requested_quantity: Number(row.total_requested_quantity || 0),
      total_dispatched_quantity: Number(row.total_dispatched_quantity || 0),
      total_received_quantity: Number(row.total_received_quantity || 0),
      total_shortage_quantity: Number(row.total_shortage_quantity || 0),
      total_damaged_quantity: Number(row.total_damaged_quantity || 0),
      total_valuation: Number(row.total_valuation || 0),
    };
  }
}
