// src/server/credit-service.ts
// Enterprise Customer Credit Assessment & Governance Service (Phase 18)

import { pool } from './db.ts';
import type { CustomerType, CreditEvaluationResult, CreditStatus } from '../types/sales-orders.ts';

export class CreditService {
  /**
   * Evaluates customer credit exposure against limits and holds
   */
  public static async evaluateCredit(params: {
    organizationId: string;
    customerType: CustomerType;
    customerId?: string | null;
    orderAmount: number;
    currentOrderId?: string;
  }): Promise<CreditEvaluationResult> {
    const { organizationId, customerType, customerId, orderAmount, currentOrderId } = params;

    if (!customerId || customerType === 'direct_customer') {
      return {
        customer_id: customerId || 'direct',
        customer_name: 'Direct Business Customer',
        customer_type: customerType,
        credit_limit: 0,
        current_outstanding: 0,
        credit_hold: false,
        order_amount: orderAmount,
        projected_exposure: orderAmount,
        available_credit: 0,
        status: 'approved',
        requires_override: false,
      };
    }

    let customerName = '';
    let creditLimit = 0;
    let creditHold = false;
    let creditHoldReason: string | undefined = undefined;

    if (customerType === 'distributor') {
      const res = await pool.query(
        `SELECT d.legal_name, d.display_name, dct.credit_limit, dct.credit_hold, dct.credit_hold_reason
         FROM distributors d
         LEFT JOIN distributor_commercial_terms dct ON dct.distributor_id = d.id
         WHERE d.id = $1 AND d.organization_id = $2`,
        [customerId, organizationId]
      );
      if (res.rows.length === 0) {
        throw new Error(`Distributor with ID "${customerId}" not found.`);
      }
      customerName = res.rows[0].display_name || res.rows[0].legal_name;
      creditLimit = parseFloat(res.rows[0].credit_limit || '0');
      creditHold = Boolean(res.rows[0].credit_hold);
      creditHoldReason = res.rows[0].credit_hold_reason || undefined;
    } else if (customerType === 'retailer') {
      const res = await pool.query(
        `SELECT r.store_name, r.owner_name, rct.credit_limit, rct.credit_hold, rct.credit_hold_reason
         FROM retailers r
         LEFT JOIN retailer_commercial_terms rct ON rct.retailer_id = r.id
         WHERE r.id = $1 AND r.organization_id = $2`,
        [customerId, organizationId]
      );
      if (res.rows.length === 0) {
        throw new Error(`Retailer with ID "${customerId}" not found.`);
      }
      customerName = res.rows[0].store_name || res.rows[0].owner_name;
      creditLimit = parseFloat(res.rows[0].credit_limit || '0');
      creditHold = Boolean(res.rows[0].credit_hold);
      creditHoldReason = res.rows[0].credit_hold_reason || undefined;
    }

    // Calculate current outstanding open exposure across active Sales Orders (excluding cancelled/rejected & current order if amending)
    let outstandingSql = `
      SELECT COALESCE(SUM(grand_total), 0)::float as open_exposure
      FROM sales_orders
      WHERE organization_id = $1
        AND order_status IN ('submitted', 'approved', 'reserved', 'partially_dispatched')
        AND payment_status != 'paid'
    `;
    const queryParams: any[] = [organizationId];

    if (customerType === 'distributor') {
      outstandingSql += ` AND distributor_id = $2`;
      queryParams.push(customerId);
    } else {
      outstandingSql += ` AND retailer_id = $2`;
      queryParams.push(customerId);
    }

    if (currentOrderId) {
      outstandingSql += ` AND id != $3`;
      queryParams.push(currentOrderId);
    }

    const exposureRes = await pool.query(outstandingSql, queryParams);
    const currentOutstanding = parseFloat(exposureRes.rows[0]?.open_exposure || '0');

    const projectedExposure = currentOutstanding + orderAmount;
    const availableCredit = Math.max(0, creditLimit - currentOutstanding);

    let status: CreditStatus = 'within_limit';
    let requiresOverride = false;
    let warningMessage: string | undefined = undefined;

    if (creditHold) {
      status = 'on_hold';
      requiresOverride = true;
      warningMessage = `Customer is on active commercial credit hold: ${creditHoldReason || 'Administrative freeze'}`;
    } else if (creditLimit > 0 && projectedExposure > creditLimit) {
      status = 'exceeds_limit';
      requiresOverride = true;
      warningMessage = `Projected exposure ₹${projectedExposure.toLocaleString('en-IN')} exceeds approved credit limit ₹${creditLimit.toLocaleString('en-IN')} by ₹${(projectedExposure - creditLimit).toLocaleString('en-IN')}`;
    } else if (creditLimit === 0 && orderAmount > 0) {
      // Zero limit means advance payment or standard approval
      status = 'within_limit';
    }

    return {
      customer_id: customerId,
      customer_name: customerName,
      customer_type: customerType,
      credit_limit: creditLimit,
      current_outstanding: currentOutstanding,
      credit_hold: creditHold,
      credit_hold_reason: creditHoldReason,
      order_amount: orderAmount,
      projected_exposure: projectedExposure,
      available_credit: availableCredit,
      status,
      requires_override: requiresOverride,
      warning_message: warningMessage,
    };
  }
}
