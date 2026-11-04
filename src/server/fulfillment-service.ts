// src/server/fulfillment-service.ts
// Enterprise Sales Order Fulfillment, FEFO Batch Allocation & Dispatch Engine (Phase 18)

import { pool } from './db.ts';
import { InventoryService } from './inventory-service.ts';
import type {
  SkuAvailabilityResult,
  SalesOrderReservation,
  SalesOrderDispatch,
  FulfillmentStatus,
  InventoryStatus,
  OrderStatus,
} from '../types/sales-orders.ts';

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

export class FulfillmentService {
  /**
   * 1. Check live inventory availability & FEFO batch candidates for all items in a Sales Order
   */
  public static async checkInventoryAvailability(
    orderId: string,
    orgId: string
  ): Promise<{
    order_id: string;
    warehouse_id: string;
    warehouse_name: string;
    all_available: boolean;
    has_partial: boolean;
    items: SkuAvailabilityResult[];
  }> {
    // 1. Fetch Order
    const orderRes = await pool.query(
      `SELECT so.id, so.warehouse_id, w.name as warehouse_name
       FROM sales_orders so
       JOIN warehouses w ON w.id = so.warehouse_id
       WHERE so.id = $1 AND so.organization_id = $2`,
      [orderId, orgId]
    );
    if (orderRes.rows.length === 0) {
      throw new Error(`Sales Order with ID "${orderId}" not found.`);
    }
    const order = orderRes.rows[0];

    // 2. Fetch Order Items
    const itemsRes = await pool.query(
      `SELECT 
         soi.id, soi.sku_id, soi.ordered_quantity::float as ordered_quantity,
         soi.reserved_quantity::float as reserved_quantity,
         soi.product_name_snapshot, soi.sku_code_snapshot, soi.uom
       FROM sales_order_items soi
       WHERE soi.sales_order_id = $1 AND soi.organization_id = $2
       ORDER BY soi.created_at ASC`,
      [orderId, orgId]
    );

    const results: SkuAvailabilityResult[] = [];
    let allAvailable = true;
    let hasPartial = false;

    for (const item of itemsRes.rows) {
      // Check Warehouse Available Balance
      const balRes = await pool.query(
        `SELECT COALESCE(SUM(available_quantity), 0)::float as available_qty
         FROM inventory_balances
         WHERE sku_id = $1 AND warehouse_id = $2 AND organization_id = $3`,
        [item.sku_id, order.warehouse_id, orgId]
      );
      const whAvail = parseFloat(balRes.rows[0]?.available_qty || '0');

      // Check Active Batches sorted FEFO (First Expired First Out)
      const batchesRes = await pool.query(
        `SELECT 
           b.id as batch_id, b.batch_number, b.manufacturing_date, b.expiry_date,
           b.current_quantity::float as current_quantity,
           b.reserved_quantity::float as batch_reserved,
           b.qc_status, b.location_id,
           loc.code as location_code
         FROM batches b
         LEFT JOIN warehouse_locations loc ON b.location_id = loc.id
         WHERE b.sku_id = $1 
           AND b.warehouse_id = $2 
           AND b.organization_id = $3
           AND b.status IN ('released', 'active')
           AND b.qc_status IN ('passed', 'approved')
           AND (b.expiry_date IS NULL OR b.expiry_date >= CURRENT_DATE)
           AND (b.current_quantity - b.reserved_quantity) > 0
         ORDER BY b.expiry_date ASC NULLS LAST, b.created_at ASC`,
        [item.sku_id, order.warehouse_id, orgId]
      );

      const availableBatches = batchesRes.rows.map((b) => ({
        batch_id: b.batch_id,
        batch_number: b.batch_number,
        manufacturing_date: b.manufacturing_date ? new Date(b.manufacturing_date).toISOString().split('T')[0] : undefined,
        expiry_date: b.expiry_date ? new Date(b.expiry_date).toISOString().split('T')[0] : undefined,
        available_quantity: Math.max(0, (b.current_quantity || 0) - (b.batch_reserved || 0)),
        qc_status: b.qc_status || 'passed',
        location_id: b.location_id,
        location_code: b.location_code,
      }));

      const unreservedNeeded = Math.max(0, item.ordered_quantity - item.reserved_quantity);
      const allocatable = Math.min(whAvail, unreservedNeeded);
      const shortage = Math.max(0, unreservedNeeded - whAvail);
      const isFullyAvailable = shortage === 0;

      if (!isFullyAvailable) {
        allAvailable = false;
        if (whAvail > 0 || item.reserved_quantity > 0) hasPartial = true;
      }

      results.push({
        sku_id: item.sku_id,
        sku_code: item.sku_code_snapshot,
        product_name: item.product_name_snapshot,
        uom: item.uom,
        ordered_quantity: item.ordered_quantity,
        already_reserved_quantity: item.reserved_quantity,
        warehouse_available_quantity: whAvail,
        allocatable_quantity: allocatable,
        shortage_quantity: shortage,
        is_fully_available: isFullyAvailable,
        available_batches: availableBatches,
      });
    }

    return {
      order_id: orderId,
      warehouse_id: order.warehouse_id,
      warehouse_name: order.warehouse_name,
      all_available: allAvailable,
      has_partial: hasPartial,
      items: results,
    };
  }

  /**
   * 2. Execute Atomic Stock Reservation for a Sales Order
   */
  public static async reserveOrderInventory(params: {
    orderId: string;
    organizationId: string;
    allocations?: {
      order_item_id: string;
      sku_id: string;
      quantity: number;
      batch_id?: string | null;
      location_id?: string | null;
    }[];
    actorId?: string | null;
    actorEmail: string;
    notes?: string;
  }): Promise<{
    reservations: SalesOrderReservation[];
    inventory_status: InventoryStatus;
    fulfillment_status: FulfillmentStatus;
  }> {
    const { orderId, organizationId, allocations, actorId = null, actorEmail, notes } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Lock Sales Order
      const orderRes = await client.query(
        `SELECT * FROM sales_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, organizationId]
      );
      if (orderRes.rows.length === 0) {
        throw new Error('Sales Order not found.');
      }
      const order = orderRes.rows[0];

      if (['cancelled', 'dispatched', 'completed'].includes(order.order_status)) {
        throw new Error(`Cannot reserve stock for order with status "${order.order_status}".`);
      }

      // 2. Fetch Items
      const itemsRes = await client.query(
        `SELECT * FROM sales_order_items WHERE sales_order_id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, organizationId]
      );
      const items = itemsRes.rows;

      const createdReservations: SalesOrderReservation[] = [];

      // If specific allocations provided, use them; otherwise auto-allocate based on availability
      if (allocations && allocations.length > 0) {
        for (const alloc of allocations) {
          if (alloc.quantity <= 0) continue;

          // Call canonical InventoryService.reserveStock
          const resResult = await InventoryService.reserveStock({
            organizationId,
            skuId: alloc.sku_id,
            warehouseId: order.warehouse_id,
            locationId: alloc.location_id,
            quantity: alloc.quantity,
            referenceType: 'sales_order',
            referenceId: order.order_number,
            notes: notes || `SO Reservation for ${order.order_number}`,
            actorId,
            actorEmail,
          });

          // If batch specified, increment batch reserved_quantity
          let batchNumber: string | undefined = undefined;
          if (alloc.batch_id) {
            const batchUpdate = await client.query(
              `UPDATE batches 
               SET reserved_quantity = reserved_quantity + $1, updated_at = NOW() 
               WHERE id = $2 AND organization_id = $3
               RETURNING batch_number`,
              [alloc.quantity, alloc.batch_id, organizationId]
            );
            if (batchUpdate.rows.length > 0) {
              batchNumber = batchUpdate.rows[0].batch_number;
            }
          }

          // Insert sales_order_reservations record
          const soResId = 'sores-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
          const insRes = await client.query(
            `INSERT INTO sales_order_reservations (
               id, organization_id, sales_order_id, sales_order_item_id,
               stock_reservation_id, sku_id, warehouse_id, location_id,
               batch_id, batch_number, reserved_quantity, status, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW(), NOW())
             RETURNING *`,
            [
              soResId,
              organizationId,
              orderId,
              alloc.order_item_id,
              resResult.reservation.id,
              alloc.sku_id,
              order.warehouse_id,
              alloc.location_id || null,
              alloc.batch_id || null,
              batchNumber || null,
              alloc.quantity,
            ]
          );

          // Update sales_order_items reserved_quantity
          await client.query(
            `UPDATE sales_order_items 
             SET reserved_quantity = reserved_quantity + $1, updated_at = NOW()
             WHERE id = $2`,
            [alloc.quantity, alloc.order_item_id]
          );

          createdReservations.push(insRes.rows[0]);
        }
      } else {
        // Auto-reserve all unreserved line items up to available stock
        for (const item of items) {
          const needed = Math.max(0, parseFloat(item.ordered_quantity) - parseFloat(item.reserved_quantity));
          if (needed <= 0) continue;

          // Check available in warehouse
          const balRes = await client.query(
            `SELECT available_quantity::float as available_quantity 
             FROM inventory_balances 
             WHERE sku_id = $1 AND warehouse_id = $2 AND organization_id = $3`,
            [item.sku_id, order.warehouse_id, organizationId]
          );
          const whAvail = parseFloat(balRes.rows[0]?.available_quantity || '0');
          const toReserve = Math.min(needed, whAvail);

          if (toReserve > 0) {
            // Find FEFO batch if available
            const batchRes = await client.query(
              `SELECT id, batch_number, (current_quantity - reserved_quantity)::float as allocatable
               FROM batches
               WHERE sku_id = $1 AND warehouse_id = $2 AND organization_id = $3
                 AND status IN ('released', 'active') AND qc_status IN ('passed', 'approved')
                 AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
                 AND (current_quantity - reserved_quantity) > 0
               ORDER BY expiry_date ASC NULLS LAST, created_at ASC
               LIMIT 1`,
              [item.sku_id, order.warehouse_id, organizationId]
            );

            let selectedBatchId: string | null = null;
            let selectedBatchNum: string | null = null;
            if (batchRes.rows.length > 0) {
              selectedBatchId = batchRes.rows[0].id;
              selectedBatchNum = batchRes.rows[0].batch_number;

              await client.query(
                `UPDATE batches 
                 SET reserved_quantity = reserved_quantity + $1, updated_at = NOW() 
                 WHERE id = $2`,
                [toReserve, selectedBatchId]
              );
            }

            const resResult = await InventoryService.reserveStock({
              organizationId,
              skuId: item.sku_id,
              warehouseId: order.warehouse_id,
              quantity: toReserve,
              referenceType: 'sales_order',
              referenceId: order.order_number,
              notes: `Auto SO Reservation for ${order.order_number}`,
              actorId,
              actorEmail,
            });

            const soResId = 'sores-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
            const insRes = await client.query(
              `INSERT INTO sales_order_reservations (
                 id, organization_id, sales_order_id, sales_order_item_id,
                 stock_reservation_id, sku_id, warehouse_id, location_id,
                 batch_id, batch_number, reserved_quantity, status, created_at, updated_at
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW(), NOW())
               RETURNING *`,
              [
                soResId,
                organizationId,
                orderId,
                item.id,
                resResult.reservation.id,
                item.sku_id,
                order.warehouse_id,
                null,
                selectedBatchId,
                selectedBatchNum,
                toReserve,
              ]
            );

            await client.query(
              `UPDATE sales_order_items 
               SET reserved_quantity = reserved_quantity + $1, updated_at = NOW()
               WHERE id = $2`,
              [toReserve, item.id]
            );

            createdReservations.push(insRes.rows[0]);
          }
        }
      }

      // 3. Compute aggregate order reservation status
      const updatedItemsRes = await client.query(
        `SELECT SUM(ordered_quantity)::float as total_ordered, SUM(reserved_quantity)::float as total_reserved
         FROM sales_order_items WHERE sales_order_id = $1`,
        [orderId]
      );
      const totalOrdered = parseFloat(updatedItemsRes.rows[0]?.total_ordered || '0');
      const totalReserved = parseFloat(updatedItemsRes.rows[0]?.total_reserved || '0');

      let newInvStatus: InventoryStatus = 'reserved';
      let newFulfillStatus: FulfillmentStatus = 'reserved';
      let newOrderStatus: OrderStatus = 'reserved';

      if (totalReserved === 0) {
        newInvStatus = 'shortage';
        newFulfillStatus = 'unfulfilled';
      } else if (totalReserved < totalOrdered) {
        newInvStatus = 'partially_reserved';
        newFulfillStatus = 'partially_reserved';
        newOrderStatus = 'reserved';
      }

      await client.query(
        `UPDATE sales_orders 
         SET inventory_status = $1, fulfillment_status = $2, order_status = $3, updated_at = NOW()
         WHERE id = $4`,
        [newInvStatus, newFulfillStatus, newOrderStatus, orderId]
      );

      // Status history
      await client.query(
        `INSERT INTO sales_order_status_history (
           id, organization_id, sales_order_id, old_status, new_status, changed_by, changed_by_email, reason, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          'sohist-' + Date.now().toString(36),
          organizationId,
          orderId,
          order.order_status,
          newOrderStatus,
          actorId,
          actorEmail,
          `Inventory reserved: ${totalReserved} of ${totalOrdered} units allocated`,
        ]
      );

      await recordAudit(
        organizationId,
        actorId,
        actorEmail,
        'sales_orders.reserve_stock',
        'sales_orders',
        orderId,
        {
          order_number: order.order_number,
          total_reserved: totalReserved,
          reservations_count: createdReservations.length,
        }
      );

      await client.query('COMMIT;');

      return {
        reservations: createdReservations,
        inventory_status: newInvStatus,
        fulfillment_status: newFulfillStatus,
      };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 3. Release All Active Reservations for an Order (e.g. on cancellation or amendment)
   */
  public static async releaseOrderReservations(
    orderId: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string,
    reason?: string
  ): Promise<{ released_count: number }> {
    const resRes = await pool.query(
      `SELECT * FROM sales_order_reservations 
       WHERE sales_order_id = $1 AND organization_id = $2 AND status = 'active'`,
      [orderId, orgId]
    );

    for (const r of resRes.rows) {
      if (r.stock_reservation_id) {
        try {
          await InventoryService.releaseReservation(
            r.stock_reservation_id,
            orgId,
            actorId,
            actorEmail,
            reason || `SO Reservation Release for order ${orderId}`
          );
        } catch (e) {
          console.warn(`[SO Release Res warning]`, e);
        }
      }

      // If batch linked, decrement batch reserved_quantity
      if (r.batch_id) {
        await pool.query(
          `UPDATE batches 
           SET reserved_quantity = GREATEST(0, reserved_quantity - $1), updated_at = NOW() 
           WHERE id = $2 AND organization_id = $3`,
          [r.reserved_quantity, r.batch_id, orgId]
        );
      }

      await pool.query(
        `UPDATE sales_order_reservations 
         SET status = 'released', updated_at = NOW() 
         WHERE id = $1`,
        [r.id]
      );
    }

    // Reset item reservations
    await pool.query(
      `UPDATE sales_order_items 
       SET reserved_quantity = 0, updated_at = NOW() 
       WHERE sales_order_id = $1 AND organization_id = $2`,
      [orderId, orgId]
    );

    // Update order status
    await pool.query(
      `UPDATE sales_orders 
       SET inventory_status = 'pending', fulfillment_status = 'unfulfilled', updated_at = NOW() 
       WHERE id = $1 AND organization_id = $2`,
      [orderId, orgId]
    );

    return { released_count: resRes.rows.length };
  }

  /**
   * 4. Record Picking / Staging Items
   */
  public static async recordPicking(params: {
    orderId: string;
    organizationId: string;
    items: {
      order_item_id: string;
      sku_id: string;
      picked_quantity: number;
      batch_id?: string;
      location_id?: string;
    }[];
    actorId?: string | null;
    actorEmail: string;
  }): Promise<{ picked_items_count: number }> {
    const { orderId, organizationId, items, actorId = null, actorEmail } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const orderRes = await client.query(
        `SELECT * FROM sales_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, organizationId]
      );
      if (orderRes.rows.length === 0) throw new Error('Sales Order not found.');
      const order = orderRes.rows[0];

      for (const item of items) {
        if (item.picked_quantity <= 0) continue;

        let batchNum: string | null = null;
        if (item.batch_id) {
          const bRes = await client.query('SELECT batch_number FROM batches WHERE id = $1', [item.batch_id]);
          if (bRes.rows.length > 0) batchNum = bRes.rows[0].batch_number;
        }

        const pickId = 'pick-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        await client.query(
          `INSERT INTO sales_order_pick_items (
             id, organization_id, sales_order_id, sales_order_item_id,
             sku_id, warehouse_id, location_id, batch_id, batch_number,
             picked_quantity, picked_by, picked_by_email, picked_at, status, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), 'picked', NOW())`,
          [
            pickId,
            organizationId,
            orderId,
            item.order_item_id,
            item.sku_id,
            order.warehouse_id,
            item.location_id || null,
            item.batch_id || null,
            batchNum,
            item.picked_quantity,
            actorId,
            actorEmail,
          ]
        );

        // Update sales_order_items picked_quantity
        await client.query(
          `UPDATE sales_order_items 
           SET picked_quantity = picked_quantity + $1, updated_at = NOW() 
           WHERE id = $2`,
          [item.picked_quantity, item.order_item_id]
        );
      }

      await client.query(
        `UPDATE sales_orders 
         SET fulfillment_status = 'picking', updated_at = NOW() 
         WHERE id = $1`,
        [orderId]
      );

      await client.query('COMMIT;');
      return { picked_items_count: items.length };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 5. Atomic Sales Order Dispatch Execution
   */
  public static async executeDispatch(params: {
    orderId: string;
    organizationId: string;
    transporterName?: string;
    trackingNumber?: string;
    vehicleNumber?: string;
    eWayBillNumber?: string;
    items?: {
      order_item_id: string;
      sku_id: string;
      dispatched_quantity: number;
      batch_id?: string;
      location_id?: string;
    }[];
    notes?: string;
    actorId?: string | null;
    actorEmail: string;
  }): Promise<{
    dispatch: SalesOrderDispatch;
    order_status: OrderStatus;
    fulfillment_status: FulfillmentStatus;
  }> {
    const {
      orderId,
      organizationId,
      transporterName,
      trackingNumber,
      vehicleNumber,
      eWayBillNumber,
      items,
      notes,
      actorId = null,
      actorEmail,
    } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Lock Sales Order
      const orderRes = await client.query(
        `SELECT * FROM sales_orders WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, organizationId]
      );
      if (orderRes.rows.length === 0) throw new Error('Sales Order not found.');
      const order = orderRes.rows[0];

      if (['cancelled', 'completed'].includes(order.order_status)) {
        throw new Error(`Cannot dispatch order with status "${order.order_status}".`);
      }

      // 2. Fetch Order Items
      const orderItemsRes = await client.query(
        `SELECT * FROM sales_order_items WHERE sales_order_id = $1 AND organization_id = $2 FOR UPDATE`,
        [orderId, organizationId]
      );
      const orderItems = orderItemsRes.rows;

      // Generate Unique Dispatch Number
      const year = new Date().getFullYear();
      const countRes = await client.query(
        `SELECT COUNT(*) FROM sales_order_dispatches WHERE organization_id = $1`,
        [organizationId]
      );
      const dispatchSeq = parseInt(countRes.rows[0]?.count || '0', 10) + 1;
      const dispatchNumber = `DSP-${year}-${String(dispatchSeq).padStart(5, '0')}`;

      const dispatchId = 'dsp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

      // Insert Sales Order Dispatch Record
      const dspRes = await client.query(
        `INSERT INTO sales_order_dispatches (
           id, organization_id, dispatch_number, sales_order_id, warehouse_id,
           transporter_name, tracking_number, vehicle_number, e_way_bill_number,
           dispatch_date, dispatched_by, dispatched_by_email, status, notes, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, 'dispatched', $12, NOW())
         RETURNING *`,
        [
          dispatchId,
          organizationId,
          dispatchNumber,
          orderId,
          order.warehouse_id,
          transporterName || null,
          trackingNumber || null,
          vehicleNumber || null,
          eWayBillNumber || null,
          actorId,
          actorEmail,
          notes || null,
        ]
      );

      // 3. Dispatch items iteration
      const dispatchItemsToProcess =
        items && items.length > 0
          ? items
          : orderItems.map((oi) => ({
              order_item_id: oi.id,
              sku_id: oi.sku_id,
              dispatched_quantity: Math.max(0, parseFloat(oi.reserved_quantity) || parseFloat(oi.ordered_quantity)),
              batch_id: undefined,
              location_id: undefined,
            }));

      for (const dItem of dispatchItemsToProcess) {
        const qtyToDispatch = dItem.dispatched_quantity;
        if (qtyToDispatch <= 0) continue;

        const orderItem = orderItems.find((oi) => oi.id === dItem.order_item_id);
        if (!orderItem) continue;

        // Check if there is an active reservation
        const resQuery = await client.query(
          `SELECT * FROM sales_order_reservations 
           WHERE sales_order_item_id = $1 AND status = 'active'
           LIMIT 1`,
          [dItem.order_item_id]
        );

        let linkedBatchId = dItem.batch_id || (resQuery.rows[0]?.batch_id ?? null);
        let linkedBatchNum: string | null = null;
        let reservationIdToConsume = resQuery.rows[0]?.stock_reservation_id;

        if (linkedBatchId) {
          const bRes = await client.query(
            `SELECT batch_number FROM batches WHERE id = $1`,
            [linkedBatchId]
          );
          if (bRes.rows.length > 0) linkedBatchNum = bRes.rows[0].batch_number;

          // Deduct from batch current_quantity and reserved_quantity
          await client.query(
            `UPDATE batches 
             SET current_quantity = GREATEST(0, current_quantity - $1),
                 reserved_quantity = GREATEST(0, reserved_quantity - $1),
                 updated_at = NOW()
             WHERE id = $2 AND organization_id = $3`,
            [qtyToDispatch, linkedBatchId, organizationId]
          );
        }

        // Consume inventory balance
        if (reservationIdToConsume) {
          try {
            await InventoryService.consumeReservation(
              reservationIdToConsume,
              organizationId,
              actorId,
              actorEmail,
              `Dispatched under ${dispatchNumber} for SO ${order.order_number}`
            );
          } catch (e) {
            console.warn('[Consume Res Fallback]', e);
            // Fallback to stock adjustment decrease if reservation direct consume had discrepancy
            await InventoryService.adjustStock({
              organizationId,
              skuId: dItem.sku_id,
              warehouseId: order.warehouse_id,
              stockType: 'available',
              direction: 'decrease',
              quantity: qtyToDispatch,
              reason: `Sales Order Dispatch: ${dispatchNumber}`,
              actorId,
              actorEmail,
            });
          }
        } else {
          // Direct stock decrease
          await InventoryService.adjustStock({
            organizationId,
            skuId: dItem.sku_id,
            warehouseId: order.warehouse_id,
            stockType: 'available',
            direction: 'decrease',
            quantity: qtyToDispatch,
            reason: `Sales Order Dispatch: ${dispatchNumber}`,
            actorId,
            actorEmail,
          });
        }

        // Mark sales_order_reservations as dispatched
        if (resQuery.rows.length > 0) {
          await client.query(
            `UPDATE sales_order_reservations 
             SET status = 'dispatched', updated_at = NOW() 
             WHERE id = $1`,
            [resQuery.rows[0].id]
          );
        }

        // Insert sales_order_dispatch_items
        const dspItemId = 'dspit-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        await client.query(
          `INSERT INTO sales_order_dispatch_items (
             id, organization_id, dispatch_id, sales_order_id, sales_order_item_id,
             sku_id, batch_id, batch_number, dispatched_quantity, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            dspItemId,
            organizationId,
            dispatchId,
            orderId,
            dItem.order_item_id,
            dItem.sku_id,
            linkedBatchId,
            linkedBatchNum,
            qtyToDispatch,
          ]
        );

        // Update sales_order_items quantities
        const newDispatched = (parseFloat(orderItem.dispatched_quantity) || 0) + qtyToDispatch;
        const newFulfilled = (parseFloat(orderItem.fulfilled_quantity) || 0) + qtyToDispatch;
        const ordered = parseFloat(orderItem.ordered_quantity) || 0;
        const remaining = Math.max(0, ordered - newFulfilled);
        const newReserved = Math.max(0, (parseFloat(orderItem.reserved_quantity) || 0) - qtyToDispatch);

        await client.query(
          `UPDATE sales_order_items 
           SET dispatched_quantity = $1,
               fulfilled_quantity = $2,
               remaining_quantity = $3,
               reserved_quantity = $4,
               updated_at = NOW()
           WHERE id = $5`,
          [newDispatched, newFulfilled, remaining, newReserved, dItem.order_item_id]
        );
      }

      // 4. Determine overall order fulfillment and lifecycle status
      const updatedItems = await client.query(
        `SELECT SUM(ordered_quantity)::float as total_ord, 
                SUM(fulfilled_quantity)::float as total_ful,
                SUM(remaining_quantity)::float as total_rem
         FROM sales_order_items WHERE sales_order_id = $1`,
        [orderId]
      );
      const totOrd = parseFloat(updatedItems.rows[0]?.total_ord || '0');
      const totFul = parseFloat(updatedItems.rows[0]?.total_ful || '0');
      const totRem = parseFloat(updatedItems.rows[0]?.total_rem || '0');

      let newFulfillStatus: FulfillmentStatus = 'dispatched';
      let newOrderStatus: OrderStatus = 'dispatched';

      if (totRem <= 0) {
        newFulfillStatus = 'completed';
        newOrderStatus = 'completed';
      } else if (totFul > 0) {
        newFulfillStatus = 'partially_dispatched';
        newOrderStatus = 'partially_dispatched';
      }

      await client.query(
        `UPDATE sales_orders 
         SET fulfillment_status = $1, order_status = $2, updated_at = NOW() 
         WHERE id = $3`,
        [newFulfillStatus, newOrderStatus, orderId]
      );

      // Status history entry
      await client.query(
        `INSERT INTO sales_order_status_history (
           id, organization_id, sales_order_id, old_status, new_status, changed_by, changed_by_email, reason, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          'sohist-' + Date.now().toString(36),
          organizationId,
          orderId,
          order.order_status,
          newOrderStatus,
          actorId,
          actorEmail,
          `Dispatched via ${dispatchNumber} (Transporter: ${transporterName || 'Self / Company Logistics'})`,
        ]
      );

      await recordAudit(
        organizationId,
        actorId,
        actorEmail,
        'sales_orders.dispatch',
        'sales_order_dispatches',
        dispatchId,
        {
          dispatch_number: dispatchNumber,
          sales_order_number: order.order_number,
          total_fulfilled: totFul,
          remaining: totRem,
        }
      );

      await client.query('COMMIT;');

      return {
        dispatch: dspRes.rows[0],
        order_status: newOrderStatus,
        fulfillment_status: newFulfillStatus,
      };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }
}
