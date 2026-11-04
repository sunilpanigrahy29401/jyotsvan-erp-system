// src/server/sales-order-service.ts
// Enterprise Sales Order Master Lifecycle Service (Phase 18)

import { pool } from './db.ts';
import { PricingService } from './pricing-service.ts';
import { CreditService } from './credit-service.ts';
import { FulfillmentService } from './fulfillment-service.ts';
import type {
  SalesOrder,
  SalesOrderItem,
  OrderStatus,
  OrderType,
  CustomerType,
  SalesOrderSummaryMetrics,
  PricingResolutionItemInput,
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

export class SalesOrderService {
  /**
   * 1. Create a new Sales Order (Draft or Submitted)
   */
  public static async createOrder(params: {
    organizationId: string;
    orderType: OrderType;
    customerType: CustomerType;
    distributorId?: string | null;
    retailerId?: string | null;
    customerReference?: string;
    orderDate?: string;
    requestedDeliveryDate?: string | null;
    warehouseId: string;
    sourceCFId?: string | null;
    currency?: string;
    orderDiscountPct?: number;
    orderDiscountAmount?: number;
    notes?: string;
    internalNotes?: string;
    billingAddress?: any;
    shippingAddress?: any;
    items: PricingResolutionItemInput[];
    status?: 'draft' | 'submitted';
    actorId?: string | null;
    actorEmail: string;
  }): Promise<SalesOrder> {
    const {
      organizationId,
      orderType,
      customerType,
      distributorId = null,
      retailerId = null,
      customerReference,
      orderDate,
      requestedDeliveryDate = null,
      warehouseId,
      sourceCFId = null,
      currency = 'INR',
      orderDiscountPct = 0,
      orderDiscountAmount = 0,
      notes,
      internalNotes,
      billingAddress,
      shippingAddress,
      items,
      status = 'draft',
      actorId = null,
      actorEmail,
    } = params;

    if (!items || items.length === 0) {
      throw new Error('Sales Order must contain at least one line item.');
    }

    const customerId = customerType === 'distributor' ? distributorId : customerType === 'retailer' ? retailerId : null;

    // 1. Resolve Customer Name Snapshot
    let customerName = 'Direct Business Customer';
    if (customerId) {
      if (customerType === 'distributor') {
        const dRes = await pool.query(
          `SELECT display_name, legal_name FROM distributors WHERE id = $1 AND organization_id = $2`,
          [customerId, organizationId]
        );
        if (dRes.rows.length === 0) throw new Error('Distributor not found.');
        customerName = dRes.rows[0].display_name || dRes.rows[0].legal_name;
      } else if (customerType === 'retailer') {
        const rRes = await pool.query(
          `SELECT store_name, owner_name FROM retailers WHERE id = $1 AND organization_id = $2`,
          [customerId, organizationId]
        );
        if (rRes.rows.length === 0) throw new Error('Retailer not found.');
        customerName = rRes.rows[0].store_name || rRes.rows[0].owner_name;
      }
    }

    // 2. Resolve Pricing, Discounts & Taxes
    const pricing = await PricingService.calculateOrderPricing({
      organizationId,
      customerType,
      customerId,
      warehouseId,
      items,
      orderDiscountPct,
      orderDiscountAmount,
    });

    // 3. Evaluate Credit Limit
    const credit = await CreditService.evaluateCredit({
      organizationId,
      customerType,
      customerId,
      orderAmount: pricing.grand_total,
    });

    // 4. Generate Unique Order Number
    const year = new Date().getFullYear();
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM sales_orders WHERE organization_id = $1`,
      [organizationId]
    );
    const orderSeq = parseInt(countRes.rows[0]?.count || '0', 10) + 1;
    const orderNumber = `SO-${year}-${String(orderSeq).padStart(6, '0')}`;

    const orderId = 'so-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    let initialStatus: OrderStatus = status === 'submitted' ? (credit.requires_override ? 'pending_approval' : 'submitted') : 'draft';

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Insert Sales Order Master
      await client.query(
        `INSERT INTO sales_orders (
           id, organization_id, order_number, order_type, customer_type,
           distributor_id, retailer_id, customer_name, customer_reference,
           order_date, requested_delivery_date, warehouse_id, source_c_and_f_id,
           currency, subtotal, discount_total, order_discount_pct, order_discount_amount,
           taxable_amount, tax_total, grand_total, rounding_adjustment,
           credit_status, credit_limit_snapshot, credit_exposure_snapshot,
           inventory_status, fulfillment_status, payment_status, order_status,
           notes, internal_notes, billing_address, shipping_address,
           created_by, created_by_email, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9,
           $10, $11, $12, $13,
           $14, $15, $16, $17, $18,
           $19, $20, $21, $22,
           $23, $24, $25,
           'pending', 'unfulfilled', 'unpaid', $26,
           $27, $28, $29, $30,
           $31, $32, NOW(), NOW()
         )`,
        [
          orderId,
          organizationId,
          orderNumber,
          orderType,
          customerType,
          distributorId,
          retailerId,
          customerName,
          customerReference || null,
          orderDate || new Date().toISOString(),
          requestedDeliveryDate,
          warehouseId,
          sourceCFId,
          currency,
          pricing.subtotal,
          pricing.total_discount,
          pricing.order_discount_pct,
          pricing.order_discount_amount,
          pricing.taxable_amount,
          pricing.tax_total,
          pricing.grand_total,
          pricing.rounding_adjustment,
          credit.status,
          credit.credit_limit,
          credit.projected_exposure,
          initialStatus,
          notes || null,
          internalNotes || null,
          billingAddress ? JSON.stringify(billingAddress) : null,
          shippingAddress ? JSON.stringify(shippingAddress) : null,
          actorId,
          actorEmail,
        ]
      );

      // Insert Sales Order Items
      for (const item of pricing.items) {
        const itemId = 'soitem-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        await client.query(
          `INSERT INTO sales_order_items (
             id, organization_id, sales_order_id, product_id, sku_id,
             product_name_snapshot, sku_code_snapshot, variant_name_snapshot,
             ordered_quantity, uom, unit_id, unit_price,
             gross_amount, discount_pct, discount_amount, taxable_amount,
             tax_rate, tax_amount, cgst_amount, sgst_amount, igst_amount,
             net_amount, reserved_quantity, picked_quantity, dispatched_quantity,
             fulfilled_quantity, returned_quantity, cancelled_quantity, remaining_quantity,
             notes, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8,
             $9, $10, $11, $12,
             $13, $14, $15, $16,
             $17, $18, $19, $20, $21,
             $22, 0, 0, 0,
             0, 0, 0, $9,
             $23, NOW(), NOW()
           )`,
          [
            itemId,
            organizationId,
            orderId,
            item.product_id,
            item.sku_id,
            item.product_name,
            item.sku_code,
            item.variant_name || null,
            item.quantity,
            item.uom,
            item.unit_id || null,
            item.resolved_unit_price,
            item.gross_amount,
            item.discount_pct,
            item.discount_amount,
            item.taxable_amount,
            item.tax_rate,
            item.tax_amount,
            item.cgst_amount,
            item.sgst_amount,
            item.igst_amount,
            item.net_amount,
            null,
          ]
        );
      }

      // Record Initial Status History
      await client.query(
        `INSERT INTO sales_order_status_history (
           id, organization_id, sales_order_id, old_status, new_status, changed_by, changed_by_email, reason, created_at
         ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, NOW())`,
        [
          'sohist-' + Date.now().toString(36),
          organizationId,
          orderId,
          initialStatus,
          actorId,
          actorEmail,
          initialStatus === 'draft' ? 'Order created as Draft' : 'Order submitted for processing',
        ]
      );

      await recordAudit(
        organizationId,
        actorId,
        actorEmail,
        'sales_orders.create',
        'sales_orders',
        orderId,
        {
          order_number: orderNumber,
          customer_name: customerName,
          grand_total: pricing.grand_total,
          items_count: pricing.items.length,
          status: initialStatus,
        }
      );

      await client.query('COMMIT;');

      return (await this.getOrderById(orderId, organizationId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 2. Update Draft / Amend Sales Order
   */
  public static async updateOrder(params: {
    orderId: string;
    organizationId: string;
    orderType?: OrderType;
    customerType?: CustomerType;
    distributorId?: string | null;
    retailerId?: string | null;
    customerReference?: string;
    orderDate?: string;
    requestedDeliveryDate?: string | null;
    warehouseId?: string;
    sourceCFId?: string | null;
    currency?: string;
    orderDiscountPct?: number;
    orderDiscountAmount?: number;
    notes?: string;
    internalNotes?: string;
    billingAddress?: any;
    shippingAddress?: any;
    items?: PricingResolutionItemInput[];
    actorId?: string | null;
    actorEmail: string;
  }): Promise<SalesOrder> {
    const { orderId, organizationId, items, actorId = null, actorEmail, ...updates } = params;

    const currentOrder = await this.getOrderById(orderId, organizationId);
    if (!currentOrder) throw new Error('Sales Order not found.');

    if (['dispatched', 'completed', 'cancelled'].includes(currentOrder.order_status)) {
      throw new Error(`Cannot modify order with status "${currentOrder.order_status}".`);
    }

    const warehouseId = updates.warehouseId || currentOrder.warehouse_id;
    const customerType = updates.customerType || currentOrder.customer_type;
    const distributorId = updates.distributorId !== undefined ? updates.distributorId : currentOrder.distributor_id;
    const retailerId = updates.retailerId !== undefined ? updates.retailerId : currentOrder.retailer_id;
    const customerId = customerType === 'distributor' ? distributorId : retailerId;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // If stock was reserved, release existing reservations before applying amended item changes
      if (currentOrder.fulfillment_status === 'reserved' || currentOrder.fulfillment_status === 'partially_reserved') {
        await FulfillmentService.releaseOrderReservations(
          orderId,
          organizationId,
          actorId,
          actorEmail,
          'Order amended: Re-evaluating inventory reservation'
        );
      }

      // If items provided, recalculate pricing and re-insert items
      if (items && items.length > 0) {
        const pricing = await PricingService.calculateOrderPricing({
          organizationId,
          customerType,
          customerId,
          warehouseId,
          items,
          orderDiscountPct: updates.orderDiscountPct ?? currentOrder.order_discount_pct,
          orderDiscountAmount: updates.orderDiscountAmount ?? currentOrder.order_discount_amount,
        });

        const credit = await CreditService.evaluateCredit({
          organizationId,
          customerType,
          customerId,
          orderAmount: pricing.grand_total,
          currentOrderId: orderId,
        });

        // Delete old items
        await client.query(`DELETE FROM sales_order_items WHERE sales_order_id = $1`, [orderId]);

        // Insert new items
        for (const item of pricing.items) {
          const itemId = 'soitem-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
          await client.query(
            `INSERT INTO sales_order_items (
               id, organization_id, sales_order_id, product_id, sku_id,
               product_name_snapshot, sku_code_snapshot, variant_name_snapshot,
               ordered_quantity, uom, unit_id, unit_price,
               gross_amount, discount_pct, discount_amount, taxable_amount,
               tax_rate, tax_amount, cgst_amount, sgst_amount, igst_amount,
               net_amount, reserved_quantity, picked_quantity, dispatched_quantity,
               fulfilled_quantity, returned_quantity, cancelled_quantity, remaining_quantity,
               notes, created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4, $5,
               $6, $7, $8,
               $9, $10, $11, $12,
               $13, $14, $15, $16,
               $17, $18, $19, $20, $21,
               $22, 0, 0, 0,
               0, 0, 0, $9,
               $23, NOW(), NOW()
             )`,
            [
              itemId,
              organizationId,
              orderId,
              item.product_id,
              item.sku_id,
              item.product_name,
              item.sku_code,
              item.variant_name || null,
              item.quantity,
              item.uom,
              item.unit_id || null,
              item.resolved_unit_price,
              item.gross_amount,
              item.discount_pct,
              item.discount_amount,
              item.taxable_amount,
              item.tax_rate,
              item.tax_amount,
              item.cgst_amount,
              item.sgst_amount,
              item.igst_amount,
              item.net_amount,
              null,
            ]
          );
        }

        // Update header financials
        await client.query(
          `UPDATE sales_orders 
           SET subtotal = $1, discount_total = $2, order_discount_pct = $3, order_discount_amount = $4,
               taxable_amount = $5, tax_total = $6, grand_total = $7, rounding_adjustment = $8,
               credit_status = $9, credit_limit_snapshot = $10, credit_exposure_snapshot = $11,
               warehouse_id = $12, updated_at = NOW()
           WHERE id = $13`,
          [
            pricing.subtotal,
            pricing.total_discount,
            pricing.order_discount_pct,
            pricing.order_discount_amount,
            pricing.taxable_amount,
            pricing.tax_total,
            pricing.grand_total,
            pricing.rounding_adjustment,
            credit.status,
            credit.credit_limit,
            credit.projected_exposure,
            warehouseId,
            orderId,
          ]
        );
      }

      // Update remaining fields
      if (updates.notes !== undefined) {
        await client.query(`UPDATE sales_orders SET notes = $1 WHERE id = $2`, [updates.notes, orderId]);
      }
      if (updates.internalNotes !== undefined) {
        await client.query(`UPDATE sales_orders SET internal_notes = $1 WHERE id = $2`, [updates.internalNotes, orderId]);
      }
      if (updates.customerReference !== undefined) {
        await client.query(`UPDATE sales_orders SET customer_reference = $1 WHERE id = $2`, [updates.customerReference, orderId]);
      }
      if (updates.requestedDeliveryDate !== undefined) {
        await client.query(`UPDATE sales_orders SET requested_delivery_date = $1 WHERE id = $2`, [updates.requestedDeliveryDate, orderId]);
      }

      await recordAudit(
        organizationId,
        actorId,
        actorEmail,
        'sales_orders.update',
        'sales_orders',
        orderId,
        {
          order_number: currentOrder.order_number,
          changes: updates,
        }
      );

      await client.query('COMMIT;');

      return (await this.getOrderById(orderId, organizationId))!;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 3. Submit Order
   */
  public static async submitOrder(
    orderId: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string
  ): Promise<SalesOrder> {
    const order = await this.getOrderById(orderId, orgId);
    if (!order) throw new Error('Sales Order not found.');

    if (order.order_status !== 'draft') {
      throw new Error(`Only draft orders can be submitted. Current status: "${order.order_status}".`);
    }

    const newStatus: OrderStatus = order.credit_status === 'exceeds_limit' || order.credit_status === 'on_hold'
      ? 'pending_approval'
      : 'submitted';

    await pool.query(
      `UPDATE sales_orders 
       SET order_status = $1, updated_at = NOW() 
       WHERE id = $2 AND organization_id = $3`,
      [newStatus, orderId, orgId]
    );

    await pool.query(
      `INSERT INTO sales_order_status_history (
         id, organization_id, sales_order_id, old_status, new_status, changed_by, changed_by_email, reason, created_at
       ) VALUES ($1, $2, $3, 'draft', $4, $5, $6, 'Order submitted by user', NOW())`,
      ['sohist-' + Date.now().toString(36), orgId, orderId, newStatus, actorId, actorEmail]
    );

    await recordAudit(orgId, actorId, actorEmail, 'sales_orders.submit', 'sales_orders', orderId, {
      order_number: order.order_number,
      new_status: newStatus,
    });

    return (await this.getOrderById(orderId, orgId))!;
  }

  /**
   * 4. Approve Order (Credit override or standard approval)
   */
  public static async approveOrder(
    orderId: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string,
    overrideReason?: string
  ): Promise<SalesOrder> {
    const order = await this.getOrderById(orderId, orgId);
    if (!order) throw new Error('Sales Order not found.');

    if (!['draft', 'submitted', 'pending_approval', 'on_hold'].includes(order.order_status)) {
      throw new Error(`Cannot approve order with status "${order.order_status}".`);
    }

    const creditStatusUpdate = overrideReason ? 'overridden' : order.credit_status;

    await pool.query(
      `UPDATE sales_orders 
       SET order_status = 'approved',
           credit_status = $1,
           approved_by = $2,
           approved_by_email = $3,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $4 AND organization_id = $5`,
      [creditStatusUpdate, actorId, actorEmail, orderId, orgId]
    );

    await pool.query(
      `INSERT INTO sales_order_status_history (
         id, organization_id, sales_order_id, old_status, new_status, changed_by, changed_by_email, reason, created_at
       ) VALUES ($1, $2, $3, $4, 'approved', $5, $6, $7, NOW())`,
      [
        'sohist-' + Date.now().toString(36),
        orgId,
        orderId,
        order.order_status,
        actorId,
        actorEmail,
        overrideReason ? `Approved with credit override: ${overrideReason}` : 'Approved for warehouse fulfillment',
      ]
    );

    await recordAudit(orgId, actorId, actorEmail, 'sales_orders.approve', 'sales_orders', orderId, {
      order_number: order.order_number,
      override_reason: overrideReason,
    });

    return (await this.getOrderById(orderId, orgId))!;
  }

  /**
   * 5. Reject Order
   */
  public static async rejectOrder(
    orderId: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string,
    reason: string
  ): Promise<SalesOrder> {
    const order = await this.getOrderById(orderId, orgId);
    if (!order) throw new Error('Sales Order not found.');

    await pool.query(
      `UPDATE sales_orders 
       SET order_status = 'rejected', updated_at = NOW() 
       WHERE id = $1 AND organization_id = $2`,
      [orderId, orgId]
    );

    await pool.query(
      `INSERT INTO sales_order_status_history (
         id, organization_id, sales_order_id, old_status, new_status, changed_by, changed_by_email, reason, created_at
       ) VALUES ($1, $2, $3, $4, 'rejected', $5, $6, $7, NOW())`,
      ['sohist-' + Date.now().toString(36), orgId, orderId, order.order_status, actorId, actorEmail, reason || 'Order rejected by manager']
    );

    await recordAudit(orgId, actorId, actorEmail, 'sales_orders.reject', 'sales_orders', orderId, {
      order_number: order.order_number,
      reason,
    });

    return (await this.getOrderById(orderId, orgId))!;
  }

  /**
   * 6. Cancel Order (Atomic reservation release if held)
   */
  public static async cancelOrder(
    orderId: string,
    orgId: string,
    actorId: string | null,
    actorEmail: string,
    reason: string
  ): Promise<SalesOrder> {
    const order = await this.getOrderById(orderId, orgId);
    if (!order) throw new Error('Sales Order not found.');

    if (['dispatched', 'completed', 'cancelled'].includes(order.order_status)) {
      throw new Error(`Cannot cancel order with status "${order.order_status}".`);
    }

    // Release any active inventory reservations
    await FulfillmentService.releaseOrderReservations(
      orderId,
      orgId,
      actorId,
      actorEmail,
      `Order Cancelled: ${reason || 'Customer request'}`
    );

    await pool.query(
      `UPDATE sales_orders 
       SET order_status = 'cancelled',
           cancelled_by = $1,
           cancelled_by_email = $2,
           cancelled_at = NOW(),
           cancellation_reason = $3,
           updated_at = NOW()
       WHERE id = $4 AND organization_id = $5`,
      [actorId, actorEmail, reason, orderId, orgId]
    );

    await pool.query(
      `INSERT INTO sales_order_status_history (
         id, organization_id, sales_order_id, old_status, new_status, changed_by, changed_by_email, reason, created_at
       ) VALUES ($1, $2, $3, $4, 'cancelled', $5, $6, $7, NOW())`,
      ['sohist-' + Date.now().toString(36), orgId, orderId, order.order_status, actorId, actorEmail, reason || 'Order cancelled']
    );

    await recordAudit(orgId, actorId, actorEmail, 'sales_orders.cancel', 'sales_orders', orderId, {
      order_number: order.order_number,
      reason,
    });

    return (await this.getOrderById(orderId, orgId))!;
  }

  /**
   * 7. Fetch Single Sales Order with 360° relations
   */
  public static async getOrderById(orderId: string, orgId: string): Promise<SalesOrder | null> {
    const orderRes = await pool.query(
      `SELECT 
         so.*,
         w.name as warehouse_name,
         cf.name as cf_name,
         COALESCE(d.distributor_code, ret.retailer_code) as customer_code
       FROM sales_orders so
       JOIN warehouses w ON so.warehouse_id = w.id
       LEFT JOIN cfs cf ON so.source_c_and_f_id = cf.id
       LEFT JOIN distributors d ON so.distributor_id = d.id
       LEFT JOIN retailers ret ON so.retailer_id = ret.id
       WHERE so.id = $1 AND so.organization_id = $2`,
      [orderId, orgId]
    );
    if (orderRes.rows.length === 0) return null;

    const order = orderRes.rows[0];

    // Convert Numeric Types
    order.subtotal = parseFloat(order.subtotal || '0');
    order.discount_total = parseFloat(order.discount_total || '0');
    order.order_discount_pct = parseFloat(order.order_discount_pct || '0');
    order.order_discount_amount = parseFloat(order.order_discount_amount || '0');
    order.taxable_amount = parseFloat(order.taxable_amount || '0');
    order.tax_total = parseFloat(order.tax_total || '0');
    order.grand_total = parseFloat(order.grand_total || '0');
    order.rounding_adjustment = parseFloat(order.rounding_adjustment || '0');
    order.credit_limit_snapshot = parseFloat(order.credit_limit_snapshot || '0');
    order.credit_exposure_snapshot = parseFloat(order.credit_exposure_snapshot || '0');

    // Fetch Items
    const itemsRes = await pool.query(
      `SELECT 
         soi.*,
         s.sku as sku_code,
         p.name as product_name
       FROM sales_order_items soi
       JOIN skus s ON soi.sku_id = s.id
       JOIN products p ON soi.product_id = p.id
       WHERE soi.sales_order_id = $1 AND soi.organization_id = $2
       ORDER BY soi.created_at ASC`,
      [orderId, orgId]
    );
    order.items = itemsRes.rows.map((row) => ({
      ...row,
      ordered_quantity: parseFloat(row.ordered_quantity || '0'),
      unit_price: parseFloat(row.unit_price || '0'),
      gross_amount: parseFloat(row.gross_amount || '0'),
      discount_pct: parseFloat(row.discount_pct || '0'),
      discount_amount: parseFloat(row.discount_amount || '0'),
      taxable_amount: parseFloat(row.taxable_amount || '0'),
      tax_rate: parseFloat(row.tax_rate || '18'),
      tax_amount: parseFloat(row.tax_amount || '0'),
      cgst_amount: parseFloat(row.cgst_amount || '0'),
      sgst_amount: parseFloat(row.sgst_amount || '0'),
      igst_amount: parseFloat(row.igst_amount || '0'),
      net_amount: parseFloat(row.net_amount || '0'),
      reserved_quantity: parseFloat(row.reserved_quantity || '0'),
      picked_quantity: parseFloat(row.picked_quantity || '0'),
      dispatched_quantity: parseFloat(row.dispatched_quantity || '0'),
      fulfilled_quantity: parseFloat(row.fulfilled_quantity || '0'),
      returned_quantity: parseFloat(row.returned_quantity || '0'),
      cancelled_quantity: parseFloat(row.cancelled_quantity || '0'),
      remaining_quantity: parseFloat(row.remaining_quantity || '0'),
    }));

    // Fetch Reservations
    const resRes = await pool.query(
      `SELECT 
         sor.*,
         s.sku as sku_code,
         p.name as product_name,
         w.name as warehouse_name,
         loc.name as location_name
       FROM sales_order_reservations sor
       JOIN skus s ON sor.sku_id = s.id
       JOIN products p ON s.product_id = p.id
       JOIN warehouses w ON sor.warehouse_id = w.id
       LEFT JOIN warehouse_locations loc ON sor.location_id = loc.id
       WHERE sor.sales_order_id = $1 AND sor.organization_id = $2
       ORDER BY sor.created_at ASC`,
      [orderId, orgId]
    );
    order.reservations = resRes.rows.map((r) => ({
      ...r,
      reserved_quantity: parseFloat(r.reserved_quantity || '0'),
    }));

    // Fetch Dispatches
    const dspRes = await pool.query(
      `SELECT sod.*, w.name as warehouse_name 
       FROM sales_order_dispatches sod
       JOIN warehouses w ON sod.warehouse_id = w.id
       WHERE sod.sales_order_id = $1 AND sod.organization_id = $2
       ORDER BY sod.dispatch_date DESC`,
      [orderId, orgId]
    );
    order.dispatches = dspRes.rows;

    // Fetch Returns
    const retRes = await pool.query(
      `SELECT * FROM sales_returns 
       WHERE sales_order_id = $1 AND organization_id = $2
       ORDER BY return_date DESC`,
      [orderId, orgId]
    );
    order.returns = retRes.rows.map((r) => ({
      ...r,
      subtotal: parseFloat(r.subtotal || '0'),
      tax_total: parseFloat(r.tax_total || '0'),
      grand_total: parseFloat(r.grand_total || '0'),
    }));

    // Fetch History
    const histRes = await pool.query(
      `SELECT * FROM sales_order_status_history 
       WHERE sales_order_id = $1 AND organization_id = $2
       ORDER BY created_at ASC`,
      [orderId, orgId]
    );
    order.history = histRes.rows;

    return order;
  }

  /**
   * 8. List Orders with search, filters, pagination, and sorting
   */
  public static async listOrders(
    orgId: string,
    filters: {
      search?: string;
      orderStatus?: string;
      customerType?: string;
      distributorId?: string;
      retailerId?: string;
      warehouseId?: string;
      fulfillmentStatus?: string;
      paymentStatus?: string;
      creditStatus?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ data: SalesOrder[]; total: number }> {
    const conditions: string[] = ['so.organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (filters.search) {
      conditions.push(
        `(so.order_number ILIKE $${idx} OR so.customer_name ILIKE $${idx} OR so.customer_reference ILIKE $${idx} OR EXISTS (
           SELECT 1 FROM sales_order_items soi WHERE soi.sales_order_id = so.id AND (soi.sku_code_snapshot ILIKE $${idx} OR soi.product_name_snapshot ILIKE $${idx})
         ))`
      );
      values.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.orderStatus && filters.orderStatus !== 'all') {
      conditions.push(`so.order_status = $${idx++}`);
      values.push(filters.orderStatus);
    }

    if (filters.customerType && filters.customerType !== 'all') {
      conditions.push(`so.customer_type = $${idx++}`);
      values.push(filters.customerType);
    }

    if (filters.distributorId) {
      conditions.push(`so.distributor_id = $${idx++}`);
      values.push(filters.distributorId);
    }

    if (filters.retailerId) {
      conditions.push(`so.retailer_id = $${idx++}`);
      values.push(filters.retailerId);
    }

    if (filters.warehouseId && filters.warehouseId !== 'all') {
      conditions.push(`so.warehouse_id = $${idx++}`);
      values.push(filters.warehouseId);
    }

    if (filters.fulfillmentStatus && filters.fulfillmentStatus !== 'all') {
      conditions.push(`so.fulfillment_status = $${idx++}`);
      values.push(filters.fulfillmentStatus);
    }

    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      conditions.push(`so.payment_status = $${idx++}`);
      values.push(filters.paymentStatus);
    }

    if (filters.creditStatus && filters.creditStatus !== 'all') {
      conditions.push(`so.credit_status = $${idx++}`);
      values.push(filters.creditStatus);
    }

    if (filters.startDate) {
      conditions.push(`so.order_date >= $${idx++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`so.order_date <= $${idx++}`);
      values.push(filters.endDate);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM sales_orders so WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;
    const sortBy = filters.sortBy || 'order_date';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const allowedSortFields: Record<string, string> = {
      order_date: 'so.order_date',
      order_number: 'so.order_number',
      customer_name: 'so.customer_name',
      grand_total: 'so.grand_total',
      order_status: 'so.order_status',
      created_at: 'so.created_at',
    };
    const sortField = allowedSortFields[sortBy] || 'so.created_at';

    const dataRes = await pool.query(
      `SELECT 
         so.*,
         w.name as warehouse_name,
         (SELECT COUNT(*) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) as items_count,
         (SELECT COALESCE(SUM(soi.ordered_quantity), 0) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) as total_units_ordered,
         (SELECT COALESCE(SUM(soi.fulfilled_quantity), 0) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) as total_units_fulfilled
       FROM sales_orders so
       JOIN warehouses w ON so.warehouse_id = w.id
       WHERE ${whereClause}
       ORDER BY ${sortField} ${sortOrder}
       LIMIT ${limit} OFFSET ${offset}`,
      values
    );

    const formattedData = dataRes.rows.map((r) => ({
      ...r,
      subtotal: parseFloat(r.subtotal || '0'),
      discount_total: parseFloat(r.discount_total || '0'),
      taxable_amount: parseFloat(r.taxable_amount || '0'),
      tax_total: parseFloat(r.tax_total || '0'),
      grand_total: parseFloat(r.grand_total || '0'),
      rounding_adjustment: parseFloat(r.rounding_adjustment || '0'),
      credit_limit_snapshot: parseFloat(r.credit_limit_snapshot || '0'),
      credit_exposure_snapshot: parseFloat(r.credit_exposure_snapshot || '0'),
      items_count: parseInt(r.items_count || '0', 10),
      total_units_ordered: parseFloat(r.total_units_ordered || '0'),
      total_units_fulfilled: parseFloat(r.total_units_fulfilled || '0'),
    }));

    return { data: formattedData, total };
  }

  /**
   * 9. Summary Metrics & Operational KPI Statistics
   */
  public static async getOrderStats(orgId: string): Promise<SalesOrderSummaryMetrics> {
    const statsRes = await pool.query(
      `SELECT 
         COUNT(*) as total_orders,
         COALESCE(SUM(grand_total), 0)::float as total_order_value,
         COUNT(*) FILTER (WHERE order_status = 'draft') as draft_orders,
         COUNT(*) FILTER (WHERE order_status = 'pending_approval') as pending_approval,
         COUNT(*) FILTER (WHERE order_status = 'approved') as approved_orders,
         COUNT(*) FILTER (WHERE order_status = 'reserved') as reserved_orders,
         COUNT(*) FILTER (WHERE order_status = 'partially_dispatched') as partially_dispatched,
         COUNT(*) FILTER (WHERE order_status = 'completed') as completed_orders,
         COUNT(*) FILTER (WHERE order_status = 'cancelled') as cancelled_orders,
         COUNT(*) FILTER (WHERE inventory_status = 'backordered' OR inventory_status = 'shortage') as backordered_orders
       FROM sales_orders
       WHERE organization_id = $1`,
      [orgId]
    );

    const returnStatsRes = await pool.query(
      `SELECT 
         COUNT(*) as total_active_returns,
         COALESCE(SUM(grand_total), 0)::float as total_returns_value
       FROM sales_returns
       WHERE organization_id = $1 AND status NOT IN ('cancelled', 'completed')`,
      [orgId]
    );

    const s = statsRes.rows[0];
    const r = returnStatsRes.rows[0];

    return {
      totalOrders: parseInt(s.total_orders || '0', 10),
      totalOrderValue: parseFloat(s.total_order_value || '0'),
      draftOrders: parseInt(s.draft_orders || '0', 10),
      pendingApproval: parseInt(s.pending_approval || '0', 10),
      approvedOrders: parseInt(s.approved_orders || '0', 10),
      reservedOrders: parseInt(s.reserved_orders || '0', 10),
      partiallyDispatched: parseInt(s.partially_dispatched || '0', 10),
      completedOrders: parseInt(s.completed_orders || '0', 10),
      cancelledOrders: parseInt(s.cancelled_orders || '0', 10),
      backorderedOrders: parseInt(s.backordered_orders || '0', 10),
      totalActiveReturns: parseInt(r?.total_active_returns || '0', 10),
      totalReturnsValue: parseFloat(r?.total_returns_value || '0'),
    };
  }
}
