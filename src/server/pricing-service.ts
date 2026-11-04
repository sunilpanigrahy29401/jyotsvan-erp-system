// src/server/pricing-service.ts
// Enterprise Pricing, Discount & Tax Calculation Engine (Phase 18)

import { pool } from './db.ts';
import type {
  PricingResolutionItemInput,
  PricingCalculationResult,
  PricingCalculationSummary,
  CustomerType,
} from '../types/sales-orders.ts';

export class PricingService {
  /**
   * Helper to round monetary amounts cleanly to 2 decimal places
   */
  public static roundMoney(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  /**
   * Resolves pricing, discounts, and statutory taxes for an entire Sales Order
   */
  public static async calculateOrderPricing(params: {
    organizationId: string;
    customerType: CustomerType;
    customerId?: string | null;
    warehouseId: string;
    items: PricingResolutionItemInput[];
    orderDiscountPct?: number;
    orderDiscountAmount?: number;
  }): Promise<PricingCalculationSummary> {
    const {
      organizationId,
      customerType,
      customerId,
      warehouseId,
      items,
      orderDiscountPct = 0,
      orderDiscountAmount = 0,
    } = params;

    if (!items || items.length === 0) {
      return {
        items: [],
        subtotal: 0,
        item_discount_total: 0,
        order_discount_pct: 0,
        order_discount_amount: 0,
        total_discount: 0,
        taxable_amount: 0,
        cgst_total: 0,
        sgst_total: 0,
        igst_total: 0,
        tax_total: 0,
        rounding_adjustment: 0,
        grand_total: 0,
        is_interstate: false,
      };
    }

    // 1. Determine Interstate / Intrastate from Warehouse & Customer State
    const whRes = await pool.query(
      `SELECT state, postal_code FROM warehouses WHERE id = $1 AND organization_id = $2`,
      [warehouseId, organizationId]
    );
    const warehouseState = (whRes.rows[0]?.state || '').trim().toLowerCase();

    let customerState = '';
    let customerTermsDiscountPct = 0;

    if (customerId) {
      if (customerType === 'distributor') {
        const distRes = await pool.query(
          `SELECT d.state, dct.standard_discount_pct, dct.cash_discount_pct
           FROM distributors d
           LEFT JOIN distributor_commercial_terms dct ON dct.distributor_id = d.id
           WHERE d.id = $1 AND d.organization_id = $2`,
          [customerId, organizationId]
        );
        if (distRes.rows.length > 0) {
          customerState = (distRes.rows[0].state || '').trim().toLowerCase();
          customerTermsDiscountPct = parseFloat(distRes.rows[0].standard_discount_pct || '0');
        }
      } else if (customerType === 'retailer') {
        const retRes = await pool.query(
          `SELECT r.state, rct.standard_discount_pct, rct.cash_discount_pct
           FROM retailers r
           LEFT JOIN retailer_commercial_terms rct ON rct.retailer_id = r.id
           WHERE r.id = $1 AND r.organization_id = $2`,
          [customerId, organizationId]
        );
        if (retRes.rows.length > 0) {
          customerState = (retRes.rows[0].state || '').trim().toLowerCase();
          customerTermsDiscountPct = parseFloat(retRes.rows[0].standard_discount_pct || '0');
        }
      }
    }

    // Default state fallback
    if (!customerState) customerState = warehouseState;
    const isInterstate = Boolean(warehouseState && customerState && warehouseState !== customerState);

    // 2. Fetch SKU & Product details for all item IDs
    const skuIds = items.map((it) => it.sku_id);
    const skuRes = await pool.query(
      `SELECT 
         s.id as sku_id, s.sku as sku_code, s.variant_name, s.selling_price::float as selling_price, s.cost_price::float as cost_price,
         s.unit_id,
         p.id as product_id, p.name as product_name, p.tax_rate::float as product_tax_rate,
         u.short_code as uom
       FROM skus s
       JOIN products p ON s.product_id = p.id
       LEFT JOIN units u ON s.unit_id = u.id
       WHERE s.id = ANY($1::varchar[]) AND s.organization_id = $2`,
      [skuIds, organizationId]
    );

    const skuMap = new Map<string, any>();
    skuRes.rows.forEach((row) => skuMap.set(row.sku_id, row));

    // 3. Fetch Assortment contract pricing if customerId is present
    const assortmentPriceMap = new Map<string, number>();
    if (customerId) {
      if (customerType === 'distributor') {
        const assRes = await pool.query(
          `SELECT sku_id, base_price::float as base_price 
           FROM distributor_assortments 
           WHERE distributor_id = $1 AND sku_id = ANY($2::varchar[]) AND status = 'active'`,
          [customerId, skuIds]
        );
        assRes.rows.forEach((a) => {
          if (a.base_price > 0) assortmentPriceMap.set(a.sku_id, a.base_price);
        });
      } else if (customerType === 'retailer') {
        const assRes = await pool.query(
          `SELECT sku_id, custom_price::float as custom_price 
           FROM retailer_assortments 
           WHERE retailer_id = $1 AND sku_id = ANY($2::varchar[]) AND status = 'active'`,
          [customerId, skuIds]
        );
        assRes.rows.forEach((a) => {
          if (a.custom_price > 0) assortmentPriceMap.set(a.sku_id, a.custom_price);
        });
      }
    }

    // 4. Resolve line item calculations
    const calculatedItems: PricingCalculationResult[] = [];
    let grossSubtotal = 0;
    let itemDiscountSum = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    for (const item of items) {
      const skuData = skuMap.get(item.sku_id);
      if (!skuData) {
        throw new Error(`SKU with ID "${item.sku_id}" not found or does not belong to organization.`);
      }

      const qty = Math.max(0, item.quantity || 0);
      const standardPrice = skuData.selling_price || skuData.cost_price * 1.25 || 100;

      let resolvedPrice = standardPrice;
      let priceSource: 'custom_override' | 'contract_assortment' | 'price_tier' | 'standard_mrp' = 'standard_mrp';

      if (item.custom_unit_price !== undefined && item.custom_unit_price > 0) {
        resolvedPrice = item.custom_unit_price;
        priceSource = 'custom_override';
      } else if (assortmentPriceMap.has(item.sku_id)) {
        resolvedPrice = assortmentPriceMap.get(item.sku_id)!;
        priceSource = 'contract_assortment';
      } else if (customerTermsDiscountPct > 0 && (!item.discount_pct || item.discount_pct === 0)) {
        priceSource = 'price_tier';
      }

      // Line Gross Amount
      const grossAmount = this.roundMoney(resolvedPrice * qty);
      grossSubtotal += grossAmount;

      // Line Discount
      const discountPct = item.discount_pct !== undefined ? item.discount_pct : customerTermsDiscountPct;
      const discountAmount = this.roundMoney((grossAmount * Math.max(0, Math.min(100, discountPct))) / 100);
      itemDiscountSum += discountAmount;

      // Line Taxable Amount
      const taxableAmount = Math.max(0, grossAmount - discountAmount);
      totalTaxable += taxableAmount;

      // Line Statutory Tax
      const taxRate = skuData.product_tax_rate !== undefined && skuData.product_tax_rate !== null ? skuData.product_tax_rate : 18.0;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      let taxAmount = 0;

      if (isInterstate) {
        igst = this.roundMoney((taxableAmount * taxRate) / 100);
        taxAmount = igst;
        totalIgst += igst;
      } else {
        const halfRate = taxRate / 2;
        cgst = this.roundMoney((taxableAmount * halfRate) / 100);
        sgst = this.roundMoney((taxableAmount * halfRate) / 100);
        taxAmount = cgst + sgst;
        totalCgst += cgst;
        totalSgst += sgst;
      }

      const netAmount = this.roundMoney(taxableAmount + taxAmount);

      calculatedItems.push({
        sku_id: item.sku_id,
        product_id: skuData.product_id,
        product_name: skuData.product_name,
        sku_code: skuData.sku_code,
        variant_name: skuData.variant_name,
        uom: skuData.uom || 'Unit',
        unit_id: skuData.unit_id,
        standard_price: this.roundMoney(standardPrice),
        resolved_unit_price: this.roundMoney(resolvedPrice),
        price_source: priceSource,
        quantity: qty,
        gross_amount: grossAmount,
        discount_pct: discountPct,
        discount_amount: discountAmount,
        taxable_amount: taxableAmount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        net_amount: netAmount,
      });
    }

    // 5. Order-level additional discount if specified
    let orderDiscount = 0;
    if (orderDiscountAmount > 0) {
      orderDiscount = Math.min(totalTaxable, orderDiscountAmount);
    } else if (orderDiscountPct > 0) {
      orderDiscount = this.roundMoney((totalTaxable * Math.min(100, orderDiscountPct)) / 100);
    }

    const netTaxableAfterOrderDiscount = Math.max(0, totalTaxable - orderDiscount);
    const totalDiscountAll = this.roundMoney(itemDiscountSum + orderDiscount);

    // Adjust taxes proportionally if order-level discount is applied
    let finalCgst = totalCgst;
    let finalSgst = totalSgst;
    let finalIgst = totalIgst;
    if (totalTaxable > 0 && orderDiscount > 0) {
      const discountRatio = netTaxableAfterOrderDiscount / totalTaxable;
      finalCgst = this.roundMoney(totalCgst * discountRatio);
      finalSgst = this.roundMoney(totalSgst * discountRatio);
      finalIgst = this.roundMoney(totalIgst * discountRatio);
    }
    const finalTaxTotal = this.roundMoney(finalCgst + finalSgst + finalIgst);

    const rawGrandTotal = netTaxableAfterOrderDiscount + finalTaxTotal;
    const roundedGrandTotal = Math.round(rawGrandTotal);
    const roundingAdj = this.roundMoney(roundedGrandTotal - rawGrandTotal);

    return {
      items: calculatedItems,
      subtotal: this.roundMoney(grossSubtotal),
      item_discount_total: this.roundMoney(itemDiscountSum),
      order_discount_pct: orderDiscountPct,
      order_discount_amount: this.roundMoney(orderDiscount),
      total_discount: totalDiscountAll,
      taxable_amount: this.roundMoney(netTaxableAfterOrderDiscount),
      cgst_total: this.roundMoney(finalCgst),
      sgst_total: this.roundMoney(finalSgst),
      igst_total: this.roundMoney(finalIgst),
      tax_total: finalTaxTotal,
      rounding_adjustment: roundingAdj,
      grand_total: roundedGrandTotal,
      is_interstate: isInterstate,
    };
  }
}
