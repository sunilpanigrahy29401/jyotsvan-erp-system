// src/server/invoice-preparation-service.ts
// Enterprise Invoice-Ready Commercial Handoff Interface for Phase 19 (Finance)

import { pool } from './db.ts';
import type { InvoiceHandoffData } from '../types/sales-orders.ts';

export class InvoicePreparationService {
  /**
   * Generates a validated invoice-ready payload for a Sales Order
   */
  public static async getInvoiceHandoffPayload(orderId: string, orgId: string): Promise<InvoiceHandoffData> {
    const orderRes = await pool.query(
      `SELECT 
         so.*,
         w.name as warehouse_name,
         d.gstin as distributor_gstin,
         d.distributor_code,
         r.gstin as retailer_gstin,
         r.retailer_code
       FROM sales_orders so
       JOIN warehouses w ON so.warehouse_id = w.id
       LEFT JOIN distributors d ON so.distributor_id = d.id
       LEFT JOIN retailers r ON so.retailer_id = r.id
       WHERE so.id = $1 AND so.organization_id = $2`,
      [orderId, orgId]
    );

    if (orderRes.rows.length === 0) {
      throw new Error(`Sales Order with ID "${orderId}" not found.`);
    }
    const order = orderRes.rows[0];

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

    const dispatchesRes = await pool.query(
      `SELECT 
         dispatch_number, dispatch_date, transporter_name, tracking_number, vehicle_number, e_way_bill_number
       FROM sales_order_dispatches
       WHERE sales_order_id = $1 AND organization_id = $2
       ORDER BY dispatch_date DESC`,
      [orderId, orgId]
    );

    const customerGstin = order.distributor_gstin || order.retailer_gstin || undefined;
    const customerCode = order.distributor_code || order.retailer_code || undefined;

    let cgstSum = 0;
    let sgstSum = 0;
    let igstSum = 0;

    const items = itemsRes.rows.map((row) => {
      const cgst = parseFloat(row.cgst_amount || '0');
      const sgst = parseFloat(row.sgst_amount || '0');
      const igst = parseFloat(row.igst_amount || '0');
      cgstSum += cgst;
      sgstSum += sgst;
      igstSum += igst;

      return {
        sku_id: row.sku_id,
        sku_code: row.sku_code || row.sku_code_snapshot,
        product_name: row.product_name || row.product_name_snapshot,
        ordered_quantity: parseFloat(row.ordered_quantity || '0'),
        fulfilled_quantity: parseFloat(row.fulfilled_quantity || '0'),
        unit_price: parseFloat(row.unit_price || '0'),
        tax_rate: parseFloat(row.tax_rate || '18'),
        taxable_amount: parseFloat(row.taxable_amount || '0'),
        tax_amount: parseFloat(row.tax_amount || '0'),
        net_amount: parseFloat(row.net_amount || '0'),
      };
    });

    return {
      order_id: order.id,
      order_number: order.order_number,
      order_date: order.order_date,
      customer_type: order.customer_type,
      customer_id: order.distributor_id || order.retailer_id || undefined,
      customer_name: order.customer_name,
      customer_code: customerCode,
      customer_gstin: customerGstin,
      billing_address: order.billing_address,
      shipping_address: order.shipping_address,
      warehouse_id: order.warehouse_id,
      warehouse_name: order.warehouse_name,
      currency: order.currency || 'INR',
      subtotal: parseFloat(order.subtotal || '0'),
      discount_total: parseFloat(order.discount_total || '0'),
      taxable_amount: parseFloat(order.taxable_amount || '0'),
      cgst_total: Math.round(cgstSum * 100) / 100,
      sgst_total: Math.round(sgstSum * 100) / 100,
      igst_total: Math.round(igstSum * 100) / 100,
      tax_total: parseFloat(order.tax_total || '0'),
      grand_total: parseFloat(order.grand_total || '0'),
      rounding_adjustment: parseFloat(order.rounding_adjustment || '0'),
      fulfillment_status: order.fulfillment_status,
      items,
      dispatches: dispatchesRes.rows,
    };
  }
}
