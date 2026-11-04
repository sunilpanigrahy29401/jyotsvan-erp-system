// src/server/finance-service.ts
// Enterprise Finance, Invoicing, Payments, Collections & Subledger Engine (Phase 19)

import { pool } from './db.ts';
import type {
  Invoice,
  InvoiceItem,
  InvoiceTax,
  Payment,
  PaymentAllocation,
  CreditNote,
  DebitNote,
  Expense,
  CustomerLedgerStatement,
  CustomerAgeingSummary,
  CollectionTask,
  CollectionActivityLog,
  FinanceDashboardMetrics,
  FinancialReconciliationReport,
  PaymentMethod,
  ExpenseCategory,
  FinancialSettings,
  InvoiceStatus,
  PaymentStatus,
  CreditNoteStatus,
  DebitNoteStatus,
  ExpenseStatus,
  CustomerType,
} from '../types/finance.ts';

export class FinanceService {
  /**
   * Generates a concurrency-safe unique formatted sequence number
   */
  public static async generateDocumentNumber(
    client: any,
    orgId: string,
    docType: 'invoice' | 'payment' | 'credit_note' | 'debit_note' | 'expense'
  ): Promise<string> {
    const settingsRes = await client.query(
      `SELECT * FROM financial_settings WHERE organization_id = $1 FOR UPDATE`,
      [orgId]
    );

    let prefix = 'DOC';
    let fy = '26-27';
    let startSeq = 1;

    if (settingsRes.rows.length > 0) {
      const s = settingsRes.rows[0];
      fy = s.fy_format || '26-27';
      if (docType === 'invoice') {
        prefix = s.invoice_prefix || 'INV';
        startSeq = s.invoice_seq_start || 1001;
      } else if (docType === 'payment') {
        prefix = s.payment_prefix || 'PAY';
      } else if (docType === 'credit_note') {
        prefix = s.credit_note_prefix || 'CN';
      } else if (docType === 'debit_note') {
        prefix = s.debit_note_prefix || 'DN';
      } else if (docType === 'expense') {
        prefix = 'EXP';
      }
    }

    let tableName = 'invoices';
    let colName = 'invoice_number';

    if (docType === 'payment') {
      tableName = 'payments';
      colName = 'payment_number';
    } else if (docType === 'credit_note') {
      tableName = 'credit_notes';
      colName = 'credit_note_number';
    } else if (docType === 'debit_note') {
      tableName = 'debit_notes';
      colName = 'debit_note_number';
    } else if (docType === 'expense') {
      tableName = 'expenses';
      colName = 'expense_number';
    }

    const countRes = await client.query(
      `SELECT count(*) FROM "${tableName}" WHERE organization_id = $1`,
      [orgId]
    );
    const count = parseInt(countRes.rows[0]?.count || '0', 10);
    const seq = startSeq + count;
    const formattedSeq = String(seq).padStart(6, '0');

    return `${prefix}/${fy}/${formattedSeq}`;
  }

  // ==========================================
  // INVOICE OPERATIONS
  // ==========================================

  /**
   * Retrieves invoices with filtering and pagination
   */
  public static async getInvoices(params: {
    organizationId: string;
    status?: string;
    customerType?: string;
    customerId?: string;
    search?: string;
    salesOrderId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ invoices: Invoice[]; total: number }> {
    const { organizationId, status, customerType, customerId, search, salesOrderId, limit = 50, offset = 0 } = params;

    let whereClause = `WHERE organization_id = $1`;
    const values: any[] = [organizationId];
    let idx = 2;

    if (status && status !== 'all') {
      whereClause += ` AND status = $${idx++}`;
      values.push(status);
    }
    if (customerType && customerType !== 'all') {
      whereClause += ` AND customer_type = $${idx++}`;
      values.push(customerType);
    }
    if (customerId) {
      whereClause += ` AND customer_id = $${idx++}`;
      values.push(customerId);
    }
    if (salesOrderId) {
      whereClause += ` AND sales_order_id = $${idx++}`;
      values.push(salesOrderId);
    }
    if (search) {
      whereClause += ` AND (invoice_number ILIKE $${idx} OR customer_name ILIKE $${idx} OR customer_gstin ILIKE $${idx} OR sales_order_number ILIKE $${idx})`;
      values.push(`%${search}%`);
      idx++;
    }

    const countRes = await pool.query(`SELECT count(*) FROM invoices ${whereClause}`, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const queryStr = `
      SELECT *
      FROM invoices
      ${whereClause}
      ORDER BY invoice_date DESC, created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const res = await pool.query(queryStr, values);
    return {
      invoices: res.rows.map(this.mapInvoiceRow),
      total,
    };
  }

  /**
   * Retrieves a single invoice with full line items, tax details, and allocation history
   */
  public static async getInvoiceById(invoiceId: string, orgId: string): Promise<Invoice | null> {
    const invRes = await pool.query(
      `SELECT * FROM invoices WHERE id = $1 AND organization_id = $2`,
      [invoiceId, orgId]
    );
    if (invRes.rows.length === 0) return null;

    const invoice = this.mapInvoiceRow(invRes.rows[0]);

    // Items
    const itemsRes = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 AND organization_id = $2 ORDER BY created_at ASC`,
      [invoiceId, orgId]
    );
    invoice.items = itemsRes.rows.map(this.mapInvoiceItemRow);

    // Allocations
    const allocRes = await pool.query(
      `SELECT pa.*, p.payment_number, p.payment_date, p.payment_method_name
       FROM payment_allocations pa
       JOIN payments p ON pa.payment_id = p.id
       WHERE pa.invoice_id = $1 AND pa.organization_id = $2
       ORDER BY pa.created_at DESC`,
      [invoiceId, orgId]
    );
    invoice.allocations = allocRes.rows.map((r) => ({
      id: r.id,
      organization_id: r.organization_id,
      payment_id: r.payment_id,
      payment_number: r.payment_number,
      payment_date: r.payment_date,
      payment_method_name: r.payment_method_name,
      invoice_id: r.invoice_id,
      allocated_amount: parseFloat(r.allocated_amount || '0'),
      notes: r.notes || undefined,
      created_by_email: r.created_by_email || undefined,
      created_at: r.created_at,
    }));

    // Status History
    const historyRes = await pool.query(
      `SELECT * FROM invoice_status_history WHERE invoice_id = $1 ORDER BY created_at ASC`,
      [invoiceId]
    );
    invoice.history = historyRes.rows.map((h) => ({
      id: h.id,
      invoice_id: h.invoice_id,
      old_status: h.old_status,
      new_status: h.new_status,
      reason: h.reason || undefined,
      notes: h.notes || undefined,
      changed_by: h.changed_by || undefined,
      changed_by_email: h.changed_by_email || undefined,
      created_at: h.created_at,
    }));

    return invoice;
  }

  /**
   * Creates a new Invoice (either standalone or from Sales Order / Dispatch)
   */
  public static async createInvoice(params: {
    organizationId: string;
    customerType: CustomerType;
    customerId?: string;
    customerName: string;
    customerCode?: string;
    customerGstin?: string;
    customerPan?: string;
    billingAddress?: any;
    shippingAddress?: any;
    salesOrderId?: string;
    salesOrderNumber?: string;
    dispatchId?: string;
    dispatchNumber?: string;
    transporterName?: string;
    vehicleNumber?: string;
    lrNumber?: string;
    eWayBillNumber?: string;
    paymentTermsDays?: number;
    invoiceDate?: string;
    dueDate?: string;
    items: Array<{
      productId: string;
      skuId: string;
      productName: string;
      skuCode: string;
      variantName?: string;
      hsnCode?: string;
      quantity: number;
      uom: string;
      unitPrice: number;
      discountPct?: number;
      taxRate?: number;
    }>;
    isInterstate?: boolean;
    notes?: string;
    createdBy?: string;
    createdByEmail?: string;
    autoPost?: boolean;
  }): Promise<Invoice> {
    const {
      organizationId,
      customerType,
      customerId,
      customerName,
      customerCode,
      customerGstin,
      customerPan,
      billingAddress,
      shippingAddress,
      salesOrderId,
      salesOrderNumber,
      dispatchId,
      dispatchNumber,
      transporterName,
      vehicleNumber,
      lrNumber,
      eWayBillNumber,
      paymentTermsDays = 30,
      invoiceDate = new Date().toISOString(),
      items,
      isInterstate = false,
      notes,
      createdBy,
      createdByEmail,
      autoPost = false,
    } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const invoiceId = 'inv_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      const invoiceNumber = await this.generateDocumentNumber(client, organizationId, 'invoice');

      const invDateObj = new Date(invoiceDate);
      const dueDateObj = params.dueDate
        ? new Date(params.dueDate)
        : new Date(invDateObj.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);

      // Calculate totals
      let subtotal = 0;
      let discountTotal = 0;
      let taxableAmount = 0;
      let cgstTotal = 0;
      let sgstTotal = 0;
      let igstTotal = 0;

      const processedItems = items.map((it) => {
        const qty = it.quantity || 1;
        const price = it.unitPrice || 0;
        const lineGross = qty * price;
        const discPct = it.discountPct || 0;
        const discAmt = (lineGross * discPct) / 100;
        const lineTaxable = lineGross - discAmt;
        const rate = it.taxRate !== undefined ? it.taxRate : 18;

        let cgstRate = 0;
        let cgstAmt = 0;
        let sgstRate = 0;
        let sgstAmt = 0;
        let igstRate = 0;
        let igstAmt = 0;

        if (isInterstate) {
          igstRate = rate;
          igstAmt = (lineTaxable * rate) / 100;
        } else {
          cgstRate = rate / 2;
          cgstAmt = (lineTaxable * (rate / 2)) / 100;
          sgstRate = rate / 2;
          sgstAmt = (lineTaxable * (rate / 2)) / 100;
        }

        const lineTotal = lineTaxable + cgstAmt + sgstAmt + igstAmt;

        subtotal += lineGross;
        discountTotal += discAmt;
        taxableAmount += lineTaxable;
        cgstTotal += cgstAmt;
        sgstTotal += sgstAmt;
        igstTotal += igstAmt;

        return {
          ...it,
          lineGross,
          discPct,
          discAmt,
          lineTaxable,
          rate,
          cgstRate,
          cgstAmt,
          sgstRate,
          sgstAmt,
          igstRate,
          igstAmt,
          lineTotal,
        };
      });

      const taxTotal = cgstTotal + sgstTotal + igstTotal;
      const rawGrandTotal = taxableAmount + taxTotal;
      const grandTotal = Math.round(rawGrandTotal * 100) / 100;
      const roundingAdjustment = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

      const initialStatus: InvoiceStatus = autoPost ? 'posted' : 'draft';

      await client.query(
        `INSERT INTO invoices (
          id, organization_id, invoice_number, invoice_date, customer_type, customer_id, customer_name, customer_code,
          customer_gstin, customer_pan, billing_address, shipping_address, sales_order_id, sales_order_number,
          dispatch_id, dispatch_number, transporter_name, vehicle_number, lr_number, e_way_bill_number,
          payment_terms_days, due_date, currency, subtotal, discount_total, taxable_amount, is_interstate,
          cgst_total, sgst_total, igst_total, tax_total, rounding_adjustment, grand_total, amount_paid,
          amount_allocated, amount_outstanding, status, notes, created_by, created_by_email,
          posted_by, posted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20,
          $21, $22, 'INR', $23, $24, $25, $26,
          $27, $28, $29, $30, $31, $32, 0,
          0, $32, $33, $34, $35, $36,
          $37, $38
        )`,
        [
          invoiceId,
          organizationId,
          invoiceNumber,
          invoiceDate,
          customerType,
          customerId || null,
          customerName,
          customerCode || null,
          customerGstin || null,
          customerPan || null,
          billingAddress ? JSON.stringify(billingAddress) : null,
          shippingAddress ? JSON.stringify(shippingAddress) : null,
          salesOrderId || null,
          salesOrderNumber || null,
          dispatchId || null,
          dispatchNumber || null,
          transporterName || null,
          vehicleNumber || null,
          lrNumber || null,
          eWayBillNumber || null,
          paymentTermsDays,
          dueDateObj.toISOString(),
          subtotal,
          discountTotal,
          taxableAmount,
          isInterstate,
          cgstTotal,
          sgstTotal,
          igstTotal,
          taxTotal,
          roundingAdjustment,
          grandTotal,
          initialStatus,
          notes || null,
          createdBy || null,
          createdByEmail || null,
          autoPost ? createdBy || 'system' : null,
          autoPost ? new Date().toISOString() : null,
        ]
      );

      // Insert line items
      for (const item of processedItems) {
        const itemId = 'item_' + Math.random().toString(36).substring(2, 11);
        await client.query(
          `INSERT INTO invoice_items (
            id, organization_id, invoice_id, product_id, sku_id, product_name_snapshot, sku_code_snapshot,
            variant_name_snapshot, hsn_code, quantity, uom, unit_price, discount_pct, discount_amount,
            taxable_amount, tax_rate, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount,
            line_total
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22,
            $23
          )`,
          [
            itemId,
            organizationId,
            invoiceId,
            item.productId,
            item.skuId,
            item.productName,
            item.skuCode,
            item.variantName || null,
            item.hsnCode || '330499',
            item.quantity,
            item.uom || 'Unit',
            item.unitPrice,
            item.discPct,
            item.discAmt,
            item.lineTaxable,
            item.rate,
            item.cgstRate,
            item.cgstAmt,
            item.sgstRate,
            item.sgstAmt,
            item.igstRate,
            item.igstAmt,
            item.lineTotal,
          ]
        );
      }

      // History
      await client.query(
        `INSERT INTO invoice_status_history (
          id, invoice_id, old_status, new_status, reason, notes, changed_by, changed_by_email
        ) VALUES ($1, $2, NULL, $3, 'Initial Invoice Creation', $4, $5, $6)`,
        [
          'hist_' + Math.random().toString(36).substring(2, 11),
          invoiceId,
          initialStatus,
          notes || 'Generated from sales order workflow',
          createdBy || null,
          createdByEmail || null,
        ]
      );

      // If auto-posted, record subledger entry immediately
      if (autoPost) {
        await this.postInvoiceSubledgerEntry(client, {
          organizationId,
          invoiceId,
          invoiceNumber,
          customerType,
          customerId,
          customerName,
          grandTotal,
          invoiceDate,
          createdBy: createdBy || 'system',
        });
      }

      await client.query('COMMIT;');

      const created = await this.getInvoiceById(invoiceId, organizationId);
      return created!;
    } catch (err: any) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Posts an approved or draft invoice to the Financial Ledger
   */
  public static async postInvoice(
    invoiceId: string,
    orgId: string,
    postedBy: string,
    postedByEmail?: string
  ): Promise<Invoice> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const invRes = await client.query(
        `SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [invoiceId, orgId]
      );
      if (invRes.rows.length === 0) {
        throw new Error(`Invoice with ID "${invoiceId}" not found.`);
      }

      const inv = invRes.rows[0];
      if (inv.status === 'posted' || inv.status === 'paid' || inv.status === 'partially_paid') {
        throw new Error(`Invoice "${inv.invoice_number}" is already posted.`);
      }
      if (inv.status === 'cancelled' || inv.status === 'void') {
        throw new Error(`Cannot post cancelled or void invoice "${inv.invoice_number}".`);
      }

      const now = new Date().toISOString();

      await client.query(
        `UPDATE invoices
         SET status = 'posted',
             posted_by = $1,
             posted_at = $2,
             updated_at = $2
         WHERE id = $3 AND organization_id = $4`,
        [postedBy, now, invoiceId, orgId]
      );

      await client.query(
        `INSERT INTO invoice_status_history (
          id, invoice_id, old_status, new_status, reason, notes, changed_by, changed_by_email
        ) VALUES ($1, $2, $3, 'posted', 'Invoice Posted to Receivable Subledger', NULL, $4, $5)`,
        [
          'hist_' + Math.random().toString(36).substring(2, 11),
          invoiceId,
          inv.status,
          postedBy,
          postedByEmail || null,
        ]
      );

      // Record in subledger
      await this.postInvoiceSubledgerEntry(client, {
        organizationId: orgId,
        invoiceId,
        invoiceNumber: inv.invoice_number,
        customerType: inv.customer_type,
        customerId: inv.customer_id,
        customerName: inv.customer_name,
        grandTotal: parseFloat(inv.grand_total || '0'),
        invoiceDate: inv.invoice_date,
        createdBy: postedBy,
      });

      await client.query('COMMIT;');

      const updated = await this.getInvoiceById(invoiceId, orgId);
      return updated!;
    } catch (err: any) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Inserts subledger transaction for an invoice posting
   */
  private static async postInvoiceSubledgerEntry(
    client: any,
    params: {
      organizationId: string;
      invoiceId: string;
      invoiceNumber: string;
      customerType: string;
      customerId?: string;
      customerName: string;
      grandTotal: number;
      invoiceDate: string;
      createdBy: string;
    }
  ) {
    const { organizationId, invoiceId, invoiceNumber, customerType, customerId, customerName, grandTotal, invoiceDate, createdBy } = params;

    // Fetch latest customer balance
    let prevBalance = 0;
    if (customerId) {
      const balRes = await client.query(
        `SELECT running_balance FROM finance_transactions
         WHERE organization_id = $1 AND customer_id = $2
         ORDER BY posting_date DESC, created_at DESC LIMIT 1`,
        [organizationId, customerId]
      );
      if (balRes.rows.length > 0) {
        prevBalance = parseFloat(balRes.rows[0].running_balance || '0');
      }
    }

    const newBalance = prevBalance + grandTotal;

    await client.query(
      `INSERT INTO finance_transactions (
        id, organization_id, transaction_type, reference_type, reference_id, reference_number,
        customer_type, customer_id, customer_name, debit_amount, credit_amount, running_balance,
        transaction_date, posting_date, description, created_by
      ) VALUES (
        $1, $2, 'INVOICE', 'invoice', $3, $4,
        $5, $6, $7, $8, 0, $9,
        $10, NOW(), 'Sales Invoice posted: ' || $4, $11
      )`,
      [
        'tx_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
        organizationId,
        invoiceId,
        invoiceNumber,
        customerType,
        customerId || null,
        customerName,
        grandTotal,
        newBalance,
        invoiceDate,
        createdBy,
      ]
    );
  }

  /**
   * Cancels or voids an invoice
   */
  public static async cancelInvoice(params: {
    invoiceId: string;
    organizationId: string;
    reason: string;
    cancelledBy: string;
    cancelledByEmail?: string;
  }): Promise<Invoice> {
    const { invoiceId, organizationId, reason, cancelledBy, cancelledByEmail } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const invRes = await client.query(
        `SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [invoiceId, organizationId]
      );
      if (invRes.rows.length === 0) {
        throw new Error(`Invoice with ID "${invoiceId}" not found.`);
      }

      const inv = invRes.rows[0];
      if (parseFloat(inv.amount_allocated || '0') > 0) {
        throw new Error(
          `Cannot cancel invoice "${inv.invoice_number}" because it has existing payment allocations of ₹${inv.amount_allocated}. Reverse payment allocations first.`
        );
      }

      const now = new Date().toISOString();

      await client.query(
        `UPDATE invoices
         SET status = 'cancelled',
             cancelled_by = $1,
             cancelled_at = $2,
             cancellation_reason = $3,
             updated_at = $2
         WHERE id = $4 AND organization_id = $5`,
        [cancelledBy, now, reason, invoiceId, organizationId]
      );

      await client.query(
        `INSERT INTO invoice_status_history (
          id, invoice_id, old_status, new_status, reason, changed_by, changed_by_email
        ) VALUES ($1, $2, $3, 'cancelled', $4, $5, $6)`,
        [
          'hist_' + Math.random().toString(36).substring(2, 11),
          invoiceId,
          inv.status,
          reason,
          cancelledBy,
          cancelledByEmail || null,
        ]
      );

      // If it was already posted, issue reversal transaction
      if (inv.status === 'posted' || inv.status === 'partially_paid') {
        const grandTotal = parseFloat(inv.grand_total || '0');
        let prevBalance = 0;
        if (inv.customer_id) {
          const balRes = await client.query(
            `SELECT running_balance FROM finance_transactions
             WHERE organization_id = $1 AND customer_id = $2
             ORDER BY posting_date DESC, created_at DESC LIMIT 1`,
            [organizationId, inv.customer_id]
          );
          if (balRes.rows.length > 0) {
            prevBalance = parseFloat(balRes.rows[0].running_balance || '0');
          }
        }
        const newBalance = prevBalance - grandTotal;

        await client.query(
          `INSERT INTO finance_transactions (
            id, organization_id, transaction_type, reference_type, reference_id, reference_number,
            customer_type, customer_id, customer_name, debit_amount, credit_amount, running_balance,
            transaction_date, posting_date, description, created_by
          ) VALUES (
            $1, $2, 'ADJUSTMENT', 'invoice_cancellation', $3, $4,
            $5, $6, $7, 0, $8, $9,
            NOW(), NOW(), 'Invoice cancelled / reversed: ' || $4 || ' - Reason: ' || $10, $11
          )`,
          [
            'tx_' + Math.random().toString(36).substring(2, 11),
            organizationId,
            invoiceId,
            inv.invoice_number,
            inv.customer_type,
            inv.customer_id,
            inv.customer_name,
            grandTotal,
            newBalance,
            reason,
            cancelledBy,
          ]
        );
      }

      await client.query('COMMIT;');

      const updated = await this.getInvoiceById(invoiceId, organizationId);
      return updated!;
    } catch (err: any) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // PAYMENT & ALLOCATION OPERATIONS
  // ==========================================

  /**
   * Retrieves payments with filtering and pagination
   */
  public static async getPayments(params: {
    organizationId: string;
    status?: string;
    customerType?: string;
    customerId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ payments: Payment[]; total: number }> {
    const { organizationId, status, customerType, customerId, search, limit = 50, offset = 0 } = params;

    let whereClause = `WHERE organization_id = $1`;
    const values: any[] = [organizationId];
    let idx = 2;

    if (status && status !== 'all') {
      whereClause += ` AND status = $${idx++}`;
      values.push(status);
    }
    if (customerType && customerType !== 'all') {
      whereClause += ` AND customer_type = $${idx++}`;
      values.push(customerType);
    }
    if (customerId) {
      whereClause += ` AND customer_id = $${idx++}`;
      values.push(customerId);
    }
    if (search) {
      whereClause += ` AND (payment_number ILIKE $${idx} OR customer_name ILIKE $${idx} OR reference_number ILIKE $${idx} OR cheque_number ILIKE $${idx})`;
      values.push(`%${search}%`);
      idx++;
    }

    const countRes = await pool.query(`SELECT count(*) FROM payments ${whereClause}`, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const queryStr = `
      SELECT *
      FROM payments
      ${whereClause}
      ORDER BY payment_date DESC, created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const res = await pool.query(queryStr, values);
    return {
      payments: res.rows.map(this.mapPaymentRow),
      total,
    };
  }

  /**
   * Retrieves single payment with allocations and history
   */
  public static async getPaymentById(paymentId: string, orgId: string): Promise<Payment | null> {
    const payRes = await pool.query(
      `SELECT * FROM payments WHERE id = $1 AND organization_id = $2`,
      [paymentId, orgId]
    );
    if (payRes.rows.length === 0) return null;

    const payment = this.mapPaymentRow(payRes.rows[0]);

    // Allocations
    const allocRes = await pool.query(
      `SELECT pa.*, i.invoice_number, i.invoice_date, i.grand_total as invoice_grand_total
       FROM payment_allocations pa
       JOIN invoices i ON pa.invoice_id = i.id
       WHERE pa.payment_id = $1 AND pa.organization_id = $2
       ORDER BY pa.created_at DESC`,
      [paymentId, orgId]
    );
    payment.allocations = allocRes.rows.map((r) => ({
      id: r.id,
      organization_id: r.organization_id,
      payment_id: r.payment_id,
      invoice_id: r.invoice_id,
      invoice_number: r.invoice_number,
      invoice_date: r.invoice_date,
      invoice_grand_total: parseFloat(r.invoice_grand_total || '0'),
      allocated_amount: parseFloat(r.allocated_amount || '0'),
      notes: r.notes || undefined,
      created_by_email: r.created_by_email || undefined,
      created_at: r.created_at,
    }));

    return payment;
  }

  /**
   * Records a customer payment and optionally performs immediate invoice allocations
   */
  public static async recordPayment(params: {
    organizationId: string;
    customerType: CustomerType;
    customerId?: string;
    customerName: string;
    customerCode?: string;
    paymentDate?: string;
    amount: number;
    paymentMethodCode: string;
    paymentMethodName: string;
    referenceNumber?: string;
    bankName?: string;
    bankAccountLast4?: string;
    chequeNumber?: string;
    chequeDate?: string;
    notes?: string;
    receivedBy?: string;
    createdBy?: string;
    createdByEmail?: string;
    allocations?: Array<{ invoiceId: string; amount: number; notes?: string }>;
  }): Promise<Payment> {
    const {
      organizationId,
      customerType,
      customerId,
      customerName,
      customerCode,
      paymentDate = new Date().toISOString(),
      amount,
      paymentMethodCode,
      paymentMethodName,
      referenceNumber,
      bankName,
      bankAccountLast4,
      chequeNumber,
      chequeDate,
      notes,
      receivedBy,
      createdBy,
      createdByEmail,
      allocations = [],
    } = params;

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const paymentId = 'pay_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      const paymentNumber = await this.generateDocumentNumber(client, organizationId, 'payment');

      // Validate total initial allocations
      const totalInitialAllocated = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
      if (totalInitialAllocated > amount) {
        throw new Error(
          `Total allocated amount (₹${totalInitialAllocated}) cannot exceed payment amount (₹${amount}).`
        );
      }

      const unallocatedAmount = amount - totalInitialAllocated;

      await client.query(
        `INSERT INTO payments (
          id, organization_id, payment_number, customer_type, customer_id, customer_name, customer_code,
          payment_date, amount, payment_method_code, payment_method_name, reference_number, bank_name,
          bank_account_last4, cheque_number, cheque_date, allocated_amount, unallocated_amount, status,
          notes, received_by, created_by, created_by_email
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, 'cleared',
          $19, $20, $21, $22
        )`,
        [
          paymentId,
          organizationId,
          paymentNumber,
          customerType,
          customerId || null,
          customerName,
          customerCode || null,
          paymentDate,
          amount,
          paymentMethodCode,
          paymentMethodName,
          referenceNumber || null,
          bankName || null,
          bankAccountLast4 || null,
          chequeNumber || null,
          chequeDate ? new Date(chequeDate).toISOString() : null,
          totalInitialAllocated,
          unallocatedAmount,
          notes || null,
          receivedBy || null,
          createdBy || null,
          createdByEmail || null,
        ]
      );

      // Record in subledger
      let prevBalance = 0;
      if (customerId) {
        const balRes = await client.query(
          `SELECT running_balance FROM finance_transactions
           WHERE organization_id = $1 AND customer_id = $2
           ORDER BY posting_date DESC, created_at DESC LIMIT 1`,
          [organizationId, customerId]
        );
        if (balRes.rows.length > 0) {
          prevBalance = parseFloat(balRes.rows[0].running_balance || '0');
        }
      }
      const newBalance = prevBalance - amount;

      await client.query(
        `INSERT INTO finance_transactions (
          id, organization_id, transaction_type, reference_type, reference_id, reference_number,
          customer_type, customer_id, customer_name, debit_amount, credit_amount, running_balance,
          transaction_date, posting_date, description, created_by
        ) VALUES (
          $1, $2, 'PAYMENT', 'payment', $3, $4,
          $5, $6, $7, 0, $8, $9,
          $10, NOW(), 'Payment receipt booked: ' || $4 || ' via ' || $11, $12
        )`,
        [
          'tx_' + Math.random().toString(36).substring(2, 11),
          organizationId,
          paymentId,
          paymentNumber,
          customerType,
          customerId || null,
          customerName,
          amount,
          newBalance,
          paymentDate,
          paymentMethodName,
          createdBy || 'system',
        ]
      );

      // Perform allocations
      for (const alloc of allocations) {
        if (alloc.amount <= 0) continue;

        const invRes = await client.query(
          `SELECT id, invoice_number, grand_total, amount_paid, amount_allocated, amount_outstanding, status, sales_order_id
           FROM invoices
           WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
          [alloc.invoiceId, organizationId]
        );
        if (invRes.rows.length === 0) {
          throw new Error(`Invoice with ID "${alloc.invoiceId}" not found for allocation.`);
        }

        const inv = invRes.rows[0];
        const currentOutstanding = parseFloat(inv.amount_outstanding || '0');
        if (alloc.amount > currentOutstanding) {
          throw new Error(
            `Allocated amount (₹${alloc.amount}) exceeds outstanding amount (₹${currentOutstanding}) for invoice "${inv.invoice_number}".`
          );
        }

        const newAmountPaid = parseFloat(inv.amount_paid || '0') + alloc.amount;
        const newAmountAllocated = parseFloat(inv.amount_allocated || '0') + alloc.amount;
        const newOutstanding = Math.max(0, currentOutstanding - alloc.amount);
        const newInvoiceStatus: InvoiceStatus = newOutstanding <= 0.01 ? 'paid' : 'partially_paid';

        // Insert allocation
        await client.query(
          `INSERT INTO payment_allocations (
            id, organization_id, payment_id, invoice_id, allocated_amount, notes, created_by, created_by_email
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            'alloc_' + Math.random().toString(36).substring(2, 11),
            organizationId,
            paymentId,
            alloc.invoiceId,
            alloc.amount,
            alloc.notes || 'Payment receipt knockoff',
            createdBy || null,
            createdByEmail || null,
          ]
        );

        // Update invoice
        await client.query(
          `UPDATE invoices
           SET amount_paid = $1,
               amount_allocated = $2,
               amount_outstanding = $3,
               status = $4,
               updated_at = NOW()
           WHERE id = $5 AND organization_id = $6`,
          [newAmountPaid, newAmountAllocated, newOutstanding, newInvoiceStatus, alloc.invoiceId, organizationId]
        );

        // Sync linked sales order payment status if any
        if (inv.sales_order_id) {
          const soPaymentStatus = newOutstanding <= 0.01 ? 'paid' : 'partially_paid';
          await client.query(
            `UPDATE sales_orders
             SET payment_status = $1, updated_at = NOW()
             WHERE id = $2 AND organization_id = $3`,
            [soPaymentStatus, inv.sales_order_id, organizationId]
          );
        }
      }

      await client.query('COMMIT;');

      const created = await this.getPaymentById(paymentId, organizationId);
      return created!;
    } catch (err: any) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Allocates an existing unallocated payment balance across open invoices
   */
  public static async allocatePayment(params: {
    paymentId: string;
    organizationId: string;
    allocations: Array<{ invoiceId: string; amount: number; notes?: string }>;
    allocatedBy?: string;
    allocatedByEmail?: string;
  }): Promise<Payment> {
    const { paymentId, organizationId, allocations, allocatedBy, allocatedByEmail } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const payRes = await client.query(
        `SELECT * FROM payments WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [paymentId, organizationId]
      );
      if (payRes.rows.length === 0) {
        throw new Error(`Payment with ID "${paymentId}" not found.`);
      }

      const payment = payRes.rows[0];
      const availableUnallocated = parseFloat(payment.unallocated_amount || '0');
      const totalToAllocate = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);

      if (totalToAllocate > availableUnallocated) {
        throw new Error(
          `Requested allocation (₹${totalToAllocate}) exceeds available unallocated payment balance (₹${availableUnallocated}).`
        );
      }

      for (const alloc of allocations) {
        if (alloc.amount <= 0) continue;

        const invRes = await client.query(
          `SELECT id, invoice_number, grand_total, amount_paid, amount_allocated, amount_outstanding, status, sales_order_id
           FROM invoices
           WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
          [alloc.invoiceId, organizationId]
        );
        if (invRes.rows.length === 0) {
          throw new Error(`Invoice with ID "${alloc.invoiceId}" not found for allocation.`);
        }

        const inv = invRes.rows[0];
        const currentOutstanding = parseFloat(inv.amount_outstanding || '0');
        if (alloc.amount > currentOutstanding) {
          throw new Error(
            `Allocated amount (₹${alloc.amount}) exceeds outstanding amount (₹${currentOutstanding}) for invoice "${inv.invoice_number}".`
          );
        }

        const newAmountPaid = parseFloat(inv.amount_paid || '0') + alloc.amount;
        const newAmountAllocated = parseFloat(inv.amount_allocated || '0') + alloc.amount;
        const newOutstanding = Math.max(0, currentOutstanding - alloc.amount);
        const newInvoiceStatus: InvoiceStatus = newOutstanding <= 0.01 ? 'paid' : 'partially_paid';

        // Record allocation
        await client.query(
          `INSERT INTO payment_allocations (
            id, organization_id, payment_id, invoice_id, allocated_amount, notes, created_by, created_by_email
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            'alloc_' + Math.random().toString(36).substring(2, 11),
            organizationId,
            paymentId,
            alloc.invoiceId,
            alloc.amount,
            alloc.notes || 'Subsequent allocation knockoff',
            allocatedBy || null,
            allocatedByEmail || null,
          ]
        );

        // Update invoice
        await client.query(
          `UPDATE invoices
           SET amount_paid = $1,
               amount_allocated = $2,
               amount_outstanding = $3,
               status = $4,
               updated_at = NOW()
           WHERE id = $5 AND organization_id = $6`,
          [newAmountPaid, newAmountAllocated, newOutstanding, newInvoiceStatus, alloc.invoiceId, organizationId]
        );

        // Update linked sales order if any
        if (inv.sales_order_id) {
          const soPaymentStatus = newOutstanding <= 0.01 ? 'paid' : 'partially_paid';
          await client.query(
            `UPDATE sales_orders
             SET payment_status = $1, updated_at = NOW()
             WHERE id = $2 AND organization_id = $3`,
            [soPaymentStatus, inv.sales_order_id, organizationId]
          );
        }
      }

      // Update payment record
      const newTotalAllocated = parseFloat(payment.allocated_amount || '0') + totalToAllocate;
      const newUnallocated = Math.max(0, availableUnallocated - totalToAllocate);

      await client.query(
        `UPDATE payments
         SET allocated_amount = $1,
             unallocated_amount = $2,
             updated_at = NOW()
         WHERE id = $3 AND organization_id = $4`,
        [newTotalAllocated, newUnallocated, paymentId, organizationId]
      );

      await client.query('COMMIT;');

      const updated = await this.getPaymentById(paymentId, organizationId);
      return updated!;
    } catch (err: any) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // CUSTOMER LEDGER & AGEING OPERATIONS
  // ==========================================

  /**
   * Computes the official Customer Financial Statement of Accounts / Ledger
   */
  public static async getCustomerLedger(params: {
    organizationId: string;
    customerType: CustomerType;
    customerId: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<CustomerLedgerStatement> {
    const { organizationId, customerType, customerId, fromDate, toDate } = params;

    let customerName = '';
    let customerCode = '';
    let gstin = '';
    let creditLimit = 0;

    if (customerType === 'distributor') {
      const dRes = await pool.query(
        `SELECT d.legal_name, d.display_name, d.distributor_code, d.gstin, dct.credit_limit
         FROM distributors d
         LEFT JOIN distributor_commercial_terms dct ON dct.distributor_id = d.id
         WHERE d.id = $1 AND d.organization_id = $2`,
        [customerId, organizationId]
      );
      if (dRes.rows.length > 0) {
        customerName = dRes.rows[0].display_name || dRes.rows[0].legal_name;
        customerCode = dRes.rows[0].distributor_code;
        gstin = dRes.rows[0].gstin;
        creditLimit = parseFloat(dRes.rows[0].credit_limit || '1000000');
      }
    } else if (customerType === 'retailer') {
      const rRes = await pool.query(
        `SELECT r.store_name, r.retailer_code, r.gstin, rct.credit_limit
         FROM retailers r
         LEFT JOIN retailer_commercial_terms rct ON rct.retailer_id = r.id
         WHERE r.id = $1 AND r.organization_id = $2`,
        [customerId, organizationId]
      );
      if (rRes.rows.length > 0) {
        customerName = rRes.rows[0].store_name;
        customerCode = rRes.rows[0].retailer_code;
        gstin = rRes.rows[0].gstin;
        creditLimit = parseFloat(rRes.rows[0].credit_limit || '100000');
      }
    }

    // Opening balance calculation (sum of debits - credits before fromDate)
    let openingBalance = 0;
    if (fromDate) {
      const obRes = await pool.query(
        `SELECT COALESCE(SUM(debit_amount - credit_amount), 0)::float as ob
         FROM finance_transactions
         WHERE organization_id = $1 AND customer_id = $2 AND posting_date < $3`,
        [organizationId, customerId, fromDate]
      );
      openingBalance = parseFloat(obRes.rows[0]?.ob || '0');
    }

    // Fetch transactions in range
    let txQuery = `
      SELECT *
      FROM finance_transactions
      WHERE organization_id = $1 AND customer_id = $2
    `;
    const txParams: any[] = [organizationId, customerId];
    let idx = 3;

    if (fromDate) {
      txQuery += ` AND posting_date >= $${idx++}`;
      txParams.push(fromDate);
    }
    if (toDate) {
      txQuery += ` AND posting_date <= $${idx++}`;
      txParams.push(toDate);
    }

    txQuery += ` ORDER BY posting_date ASC, created_at ASC`;

    const txRes = await pool.query(txQuery, txParams);

    let running = openingBalance;
    let totalDebits = 0;
    let totalCredits = 0;

    const transactions = txRes.rows.map((row) => {
      const debit = parseFloat(row.debit_amount || '0');
      const credit = parseFloat(row.credit_amount || '0');
      running += debit - credit;
      totalDebits += debit;
      totalCredits += credit;

      return {
        id: row.id,
        organization_id: row.organization_id,
        transaction_type: row.transaction_type,
        reference_type: row.reference_type,
        reference_id: row.reference_id,
        reference_number: row.reference_number || undefined,
        customer_type: row.customer_type,
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        debit_amount: debit,
        credit_amount: credit,
        running_balance: running,
        transaction_date: row.transaction_date,
        posting_date: row.posting_date,
        description: row.description,
        notes: row.notes || undefined,
        created_by: row.created_by || undefined,
        created_at: row.created_at,
      };
    });

    const closingBalance = openingBalance + totalDebits - totalCredits;
    const availableCredit = Math.max(0, creditLimit - closingBalance);

    return {
      customer_id: customerId,
      customer_name: customerName,
      customer_type: customerType,
      customer_code: customerCode || undefined,
      gstin: gstin || undefined,
      currency: 'INR',
      opening_balance: openingBalance,
      total_debits: totalDebits,
      total_credits: totalCredits,
      closing_balance: closingBalance,
      credit_limit: creditLimit,
      available_credit: availableCredit,
      transactions,
    };
  }

  /**
   * Calculates the full Accounts Receivable (AR) Ageing Matrix across all customers
   */
  public static async getAgeingSummary(params: {
    organizationId: string;
    customerType?: string;
    search?: string;
    overdueOnly?: boolean;
  }): Promise<CustomerAgeingSummary[]> {
    const { organizationId, customerType, search, overdueOnly } = params;

    // Fetch all open invoices
    let invSql = `
      SELECT 
        i.id, i.invoice_number, i.invoice_date, i.due_date, i.customer_type, i.customer_id, i.customer_name,
        i.customer_code, i.grand_total, i.amount_paid, i.amount_outstanding, i.payment_terms_days,
        d.primary_contact as dist_contact, d.phone as dist_phone, d.region as dist_region, d.state as dist_state,
        dct.credit_limit as dist_credit_limit, dct.credit_hold as dist_credit_hold,
        r.owner_name as ret_contact, r.phone as ret_phone, r.state as ret_state,
        rct.credit_limit as ret_credit_limit, rct.credit_hold as ret_credit_hold
      FROM invoices i
      LEFT JOIN distributors d ON i.customer_id = d.id AND i.customer_type = 'distributor'
      LEFT JOIN distributor_commercial_terms dct ON dct.distributor_id = d.id
      LEFT JOIN retailers r ON i.customer_id = r.id AND i.customer_type = 'retailer'
      LEFT JOIN retailer_commercial_terms rct ON rct.retailer_id = r.id
      WHERE i.organization_id = $1
        AND i.status IN ('posted', 'partially_paid', 'overdue')
        AND i.amount_outstanding > 0.01
    `;
    const invParams: any[] = [organizationId];
    let idx = 2;

    if (customerType && customerType !== 'all') {
      invSql += ` AND i.customer_type = $${idx++}`;
      invParams.push(customerType);
    }
    if (search) {
      invSql += ` AND (i.customer_name ILIKE $${idx} OR i.customer_code ILIKE $${idx} OR i.invoice_number ILIKE $${idx})`;
      invParams.push(`%${search}%`);
      idx++;
    }

    invSql += ` ORDER BY i.due_date ASC`;

    const res = await pool.query(invSql, invParams);
    const now = new Date().getTime();

    // Group by customer
    const map = new Map<string, CustomerAgeingSummary>();

    for (const row of res.rows) {
      const custId = row.customer_id || 'direct';
      const custType = row.customer_type as CustomerType;
      const outstanding = parseFloat(row.amount_outstanding || '0');
      const dueDate = new Date(row.due_date).getTime();
      const diffDays = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

      if (!map.has(custId)) {
        const contact = row.dist_contact || row.ret_contact || '';
        const phone = row.dist_phone || row.ret_phone || '';
        const region = row.dist_region || '';
        const state = row.dist_state || row.ret_state || '';
        const creditLimit = parseFloat(row.dist_credit_limit || row.ret_credit_limit || '500000');
        const creditHold = Boolean(row.dist_credit_hold || row.ret_credit_hold);

        map.set(custId, {
          customer_id: custId,
          customer_name: row.customer_name,
          customer_type: custType,
          customer_code: row.customer_code || undefined,
          contact_person: contact || undefined,
          phone: phone || undefined,
          region: region || undefined,
          state: state || undefined,
          credit_limit: creditLimit,
          credit_period_days: row.payment_terms_days || 30,
          credit_hold: creditHold,
          total_outstanding: 0,
          current_amount: 0,
          overdue_amount: 0,
          days_1_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          days_91_120: 0,
          days_120_plus: 0,
          open_invoices_count: 0,
          oldest_invoice_date: row.invoice_date,
          oldest_due_date: row.due_date,
          max_overdue_days: 0,
          available_credit: creditLimit,
        });
      }

      const summary = map.get(custId)!;
      summary.total_outstanding += outstanding;
      summary.open_invoices_count += 1;

      if (diffDays <= 0) {
        summary.current_amount += outstanding;
      } else {
        summary.overdue_amount += outstanding;
        if (diffDays > summary.max_overdue_days) {
          summary.max_overdue_days = diffDays;
        }

        if (diffDays >= 1 && diffDays <= 30) {
          summary.days_1_30 += outstanding;
        } else if (diffDays >= 31 && diffDays <= 60) {
          summary.days_31_60 += outstanding;
        } else if (diffDays >= 61 && diffDays <= 90) {
          summary.days_61_90 += outstanding;
        } else if (diffDays >= 91 && diffDays <= 120) {
          summary.days_91_120 += outstanding;
        } else {
          summary.days_120_plus += outstanding;
        }
      }

      summary.available_credit = Math.max(0, summary.credit_limit - summary.total_outstanding);
    }

    let summaries = Array.from(map.values());
    if (overdueOnly) {
      summaries = summaries.filter((s) => s.overdue_amount > 0.01);
    }

    return summaries.sort((a, b) => b.total_outstanding - a.total_outstanding);
  }

  // ==========================================
  // CREDIT & DEBIT NOTES
  // ==========================================

  public static async getCreditNotes(orgId: string): Promise<CreditNote[]> {
    const res = await pool.query(
      `SELECT * FROM credit_notes WHERE organization_id = $1 ORDER BY credit_date DESC, created_at DESC`,
      [orgId]
    );
    return res.rows.map(this.mapCreditNoteRow);
  }

  public static async createCreditNote(params: {
    organizationId: string;
    customerType: CustomerType;
    customerId?: string;
    customerName: string;
    invoiceId?: string;
    invoiceNumber?: string;
    salesReturnId?: string;
    returnNumber?: string;
    reason: string;
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    notes?: string;
    createdBy?: string;
    createdByEmail?: string;
    items?: Array<{
      skuId?: string;
      skuCode?: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      taxableAmount: number;
      taxRate: number;
      taxAmount: number;
      lineTotal: number;
    }>;
  }): Promise<CreditNote> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const cnId = 'cn_' + Math.random().toString(36).substring(2, 11);
      const cnNumber = await this.generateDocumentNumber(client, params.organizationId, 'credit_note');

      await client.query(
        `INSERT INTO credit_notes (
          id, organization_id, credit_note_number, customer_type, customer_id, customer_name,
          invoice_id, invoice_number, sales_return_id, return_number, reason, subtotal, tax_total,
          grand_total, status, notes, created_by, created_by_email, posted_by, posted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13,
          $14, 'posted', $15, $16, $17, $18, NOW()
        )`,
        [
          cnId,
          params.organizationId,
          cnNumber,
          params.customerType,
          params.customerId || null,
          params.customerName,
          params.invoiceId || null,
          params.invoiceNumber || null,
          params.salesReturnId || null,
          params.returnNumber || null,
          params.reason,
          params.subtotal,
          params.taxTotal,
          params.grandTotal,
          params.notes || null,
          params.createdBy || null,
          params.createdByEmail || null,
          params.createdBy || 'system',
        ]
      );

      // Record credit note subledger entry (credit to reduce customer receivable)
      let prevBalance = 0;
      if (params.customerId) {
        const balRes = await client.query(
          `SELECT running_balance FROM finance_transactions
           WHERE organization_id = $1 AND customer_id = $2
           ORDER BY posting_date DESC, created_at DESC LIMIT 1`,
          [params.organizationId, params.customerId]
        );
        if (balRes.rows.length > 0) {
          prevBalance = parseFloat(balRes.rows[0].running_balance || '0');
        }
      }
      const newBalance = prevBalance - params.grandTotal;

      await client.query(
        `INSERT INTO finance_transactions (
          id, organization_id, transaction_type, reference_type, reference_id, reference_number,
          customer_type, customer_id, customer_name, debit_amount, credit_amount, running_balance,
          transaction_date, posting_date, description, created_by
        ) VALUES (
          $1, $2, 'CREDIT_NOTE', 'credit_note', $3, $4,
          $5, $6, $7, 0, $8, $9,
          NOW(), NOW(), 'Credit Note issued: ' || $4 || ' - Reason: ' || $10, $11
        )`,
        [
          'tx_' + Math.random().toString(36).substring(2, 11),
          params.organizationId,
          cnId,
          cnNumber,
          params.customerType,
          params.customerId || null,
          params.customerName,
          params.grandTotal,
          newBalance,
          params.reason,
          params.createdBy || 'system',
        ]
      );

      await client.query('COMMIT;');

      const createdRes = await pool.query(`SELECT * FROM credit_notes WHERE id = $1`, [cnId]);
      return this.mapCreditNoteRow(createdRes.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  public static async getDebitNotes(orgId: string): Promise<DebitNote[]> {
    const res = await pool.query(
      `SELECT * FROM debit_notes WHERE organization_id = $1 ORDER BY debit_date DESC, created_at DESC`,
      [orgId]
    );
    return res.rows.map(this.mapDebitNoteRow);
  }

  public static async createDebitNote(params: {
    organizationId: string;
    customerType: CustomerType;
    customerId?: string;
    customerName: string;
    invoiceId?: string;
    invoiceNumber?: string;
    reason: string;
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    notes?: string;
    createdBy?: string;
    createdByEmail?: string;
  }): Promise<DebitNote> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const dnId = 'dn_' + Math.random().toString(36).substring(2, 11);
      const dnNumber = await this.generateDocumentNumber(client, params.organizationId, 'debit_note');

      await client.query(
        `INSERT INTO debit_notes (
          id, organization_id, debit_note_number, customer_type, customer_id, customer_name,
          invoice_id, invoice_number, reason, subtotal, tax_total, grand_total, status,
          notes, created_by, created_by_email, posted_by, posted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, 'posted',
          $13, $14, $15, $16, NOW()
        )`,
        [
          dnId,
          params.organizationId,
          dnNumber,
          params.customerType,
          params.customerId || null,
          params.customerName,
          params.invoiceId || null,
          params.invoiceNumber || null,
          params.reason,
          params.subtotal,
          params.taxTotal,
          params.grandTotal,
          params.notes || null,
          params.createdBy || null,
          params.createdByEmail || null,
          params.createdBy || 'system',
        ]
      );

      // Record debit note subledger entry (debit to increase customer receivable)
      let prevBalance = 0;
      if (params.customerId) {
        const balRes = await client.query(
          `SELECT running_balance FROM finance_transactions
           WHERE organization_id = $1 AND customer_id = $2
           ORDER BY posting_date DESC, created_at DESC LIMIT 1`,
          [params.organizationId, params.customerId]
        );
        if (balRes.rows.length > 0) {
          prevBalance = parseFloat(balRes.rows[0].running_balance || '0');
        }
      }
      const newBalance = prevBalance + params.grandTotal;

      await client.query(
        `INSERT INTO finance_transactions (
          id, organization_id, transaction_type, reference_type, reference_id, reference_number,
          customer_type, customer_id, customer_name, debit_amount, credit_amount, running_balance,
          transaction_date, posting_date, description, created_by
        ) VALUES (
          $1, $2, 'DEBIT_NOTE', 'debit_note', $3, $4,
          $5, $6, $7, $8, 0, $9,
          NOW(), NOW(), 'Debit Note issued: ' || $4 || ' - Reason: ' || $10, $11
        )`,
        [
          'tx_' + Math.random().toString(36).substring(2, 11),
          params.organizationId,
          dnId,
          dnNumber,
          params.customerType,
          params.customerId || null,
          params.customerName,
          params.grandTotal,
          newBalance,
          params.reason,
          params.createdBy || 'system',
        ]
      );

      await client.query('COMMIT;');

      const createdRes = await pool.query(`SELECT * FROM debit_notes WHERE id = $1`, [dnId]);
      return this.mapDebitNoteRow(createdRes.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // EXPENSE OPERATIONS
  // ==========================================

  public static async getExpenses(params: {
    organizationId: string;
    status?: string;
    categoryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ expenses: Expense[]; total: number }> {
    const { organizationId, status, categoryId, search, limit = 50, offset = 0 } = params;

    let whereClause = `WHERE e.organization_id = $1`;
    const values: any[] = [organizationId];
    let idx = 2;

    if (status && status !== 'all') {
      whereClause += ` AND e.status = $${idx++}`;
      values.push(status);
    }
    if (categoryId && categoryId !== 'all') {
      whereClause += ` AND e.category_id = $${idx++}`;
      values.push(categoryId);
    }
    if (search) {
      whereClause += ` AND (e.expense_number ILIKE $${idx} OR e.vendor_payee ILIKE $${idx} OR e.description ILIKE $${idx})`;
      values.push(`%${search}%`);
      idx++;
    }

    const countRes = await pool.query(
      `SELECT count(*) FROM expenses e ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const queryStr = `
      SELECT e.*, c.name as category_name, c.code as category_code
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      ${whereClause}
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const res = await pool.query(queryStr, values);
    return {
      expenses: res.rows.map(this.mapExpenseRow),
      total,
    };
  }

  public static async createExpense(params: {
    organizationId: string;
    expenseDate?: string;
    categoryId: string;
    amount: number;
    taxAmount?: number;
    paymentMethod?: string;
    vendorPayee: string;
    description: string;
    department?: string;
    branchId?: string;
    receiptUrl?: string;
    receiptFilename?: string;
    notes?: string;
    submittedBy?: string;
    submittedByEmail?: string;
  }): Promise<Expense> {
    const {
      organizationId,
      expenseDate = new Date().toISOString(),
      categoryId,
      amount,
      taxAmount = 0,
      paymentMethod = 'Bank Transfer',
      vendorPayee,
      description,
      department = 'Operations',
      branchId,
      receiptUrl,
      receiptFilename,
      notes,
      submittedBy,
      submittedByEmail,
    } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const expenseId = 'exp_' + Math.random().toString(36).substring(2, 11);
      const expenseNumber = await this.generateDocumentNumber(client, organizationId, 'expense');
      const totalAmount = amount + taxAmount;

      await client.query(
        `INSERT INTO expenses (
          id, organization_id, expense_number, expense_date, category_id, amount, tax_amount,
          total_amount, payment_method, vendor_payee, description, department, branch_id,
          receipt_url, receipt_filename, status, submitted_by, submitted_by_email, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, 'submitted', $16, $17, $18
        )`,
        [
          expenseId,
          organizationId,
          expenseNumber,
          expenseDate,
          categoryId,
          amount,
          taxAmount,
          totalAmount,
          paymentMethod,
          vendorPayee,
          description,
          department,
          branchId || null,
          receiptUrl || null,
          receiptFilename || null,
          submittedBy || null,
          submittedByEmail || null,
          notes || null,
        ]
      );

      await client.query('COMMIT;');

      const res = await pool.query(
        `SELECT e.*, c.name as category_name, c.code as category_code
         FROM expenses e
         JOIN expense_categories c ON e.category_id = c.id
         WHERE e.id = $1`,
        [expenseId]
      );
      return this.mapExpenseRow(res.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  public static async updateExpenseStatus(params: {
    expenseId: string;
    organizationId: string;
    newStatus: ExpenseStatus;
    reason?: string;
    userEmail?: string;
  }): Promise<Expense> {
    const { expenseId, organizationId, newStatus, reason, userEmail } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const expRes = await client.query(
        `SELECT * FROM expenses WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [expenseId, organizationId]
      );
      if (expRes.rows.length === 0) {
        throw new Error(`Expense with ID "${expenseId}" not found.`);
      }

      const exp = expRes.rows[0];
      const now = new Date().toISOString();

      let approvedBy = exp.approved_by;
      let approvedByEmail = exp.approved_by_email;
      let approvedAt = exp.approved_at;
      let paidAt = exp.paid_at;
      let rejectionReason = exp.rejection_reason;

      if (newStatus === 'approved') {
        approvedBy = 'Approver';
        approvedByEmail = userEmail || 'finance@jyotsvan.com';
        approvedAt = now;
      } else if (newStatus === 'paid') {
        paidAt = now;
      } else if (newStatus === 'rejected') {
        rejectionReason = reason || 'Rejected by finance authority';
      }

      await client.query(
        `UPDATE expenses
         SET status = $1,
             approved_by = $2,
             approved_by_email = $3,
             approved_at = $4,
             paid_at = $5,
             rejection_reason = $6,
             updated_at = $7
         WHERE id = $8 AND organization_id = $9`,
        [newStatus, approvedBy, approvedByEmail, approvedAt, paidAt, rejectionReason, now, expenseId, organizationId]
      );

      await client.query(
        `INSERT INTO expense_status_history (
          id, expense_id, old_status, new_status, reason, changed_by_email
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        ['ehist_' + Math.random().toString(36).substring(2, 11), expenseId, exp.status, newStatus, reason || null, userEmail || null]
      );

      await client.query('COMMIT;');

      const updated = await pool.query(
        `SELECT e.*, c.name as category_name, c.code as category_code
         FROM expenses e
         JOIN expense_categories c ON e.category_id = c.id
         WHERE e.id = $1`,
        [expenseId]
      );
      return this.mapExpenseRow(updated.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // COLLECTION WORKFLOW OPERATIONS
  // ==========================================

  public static async getCollections(params: {
    organizationId: string;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<CollectionTask[]> {
    const { organizationId, status, priority, search } = params;

    let whereClause = `WHERE organization_id = $1`;
    const values: any[] = [organizationId];
    let idx = 2;

    if (status && status !== 'all') {
      whereClause += ` AND status = $${idx++}`;
      values.push(status);
    }
    if (priority && priority !== 'all') {
      whereClause += ` AND priority = $${idx++}`;
      values.push(priority);
    }
    if (search) {
      whereClause += ` AND (customer_name ILIKE $${idx} OR customer_code ILIKE $${idx} OR notes ILIKE $${idx})`;
      values.push(`%${search}%`);
      idx++;
    }

    const queryStr = `
      SELECT *
      FROM collections
      ${whereClause}
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        follow_up_date ASC
    `;

    const res = await pool.query(queryStr, values);
    return res.rows.map(this.mapCollectionRow);
  }

  public static async createOrUpdateCollection(params: {
    id?: string;
    organizationId: string;
    customerType: CustomerType;
    customerId: string;
    customerName: string;
    customerCode?: string;
    totalOutstanding: number;
    targetCollectionAmount: number;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    followUpDate: string;
    assignedToName?: string;
    notes?: string;
    status?: string;
    promisedPaymentDate?: string;
    promisedPaymentAmount?: number;
    nextAction?: string;
  }): Promise<CollectionTask> {
    const {
      id,
      organizationId,
      customerType,
      customerId,
      customerName,
      customerCode,
      totalOutstanding,
      targetCollectionAmount,
      dueDate,
      priority = 'medium',
      followUpDate,
      assignedToName,
      notes,
      status = 'open',
      promisedPaymentDate,
      promisedPaymentAmount,
      nextAction,
    } = params;

    if (id) {
      await pool.query(
        `UPDATE collections
         SET target_collection_amount = $1,
             priority = $2,
             follow_up_date = $3,
             assigned_to_name = $4,
             notes = $5,
             status = $6,
             promised_payment_date = $7,
             promised_payment_amount = $8,
             next_action = $9,
             total_outstanding = $10,
             updated_at = NOW()
         WHERE id = $11 AND organization_id = $12`,
        [
          targetCollectionAmount,
          priority,
          followUpDate,
          assignedToName || null,
          notes || null,
          status,
          promisedPaymentDate || null,
          promisedPaymentAmount || null,
          nextAction || null,
          totalOutstanding,
          id,
          organizationId,
        ]
      );
      const res = await pool.query(`SELECT * FROM collections WHERE id = $1`, [id]);
      return this.mapCollectionRow(res.rows[0]);
    } else {
      const newId = 'col_' + Math.random().toString(36).substring(2, 11);
      await pool.query(
        `INSERT INTO collections (
          id, organization_id, customer_type, customer_id, customer_name, customer_code,
          total_outstanding, target_collection_amount, due_date, priority, follow_up_date,
          assigned_to_name, notes, status, promised_payment_date, promised_payment_amount, next_action
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17
        )`,
        [
          newId,
          organizationId,
          customerType,
          customerId,
          customerName,
          customerCode || null,
          totalOutstanding,
          targetCollectionAmount,
          dueDate ? new Date(dueDate).toISOString() : null,
          priority,
          followUpDate,
          assignedToName || null,
          notes || null,
          status,
          promisedPaymentDate || null,
          promisedPaymentAmount || null,
          nextAction || null,
        ]
      );
      const res = await pool.query(`SELECT * FROM collections WHERE id = $1`, [newId]);
      return this.mapCollectionRow(res.rows[0]);
    }
  }

  public static async logCollectionActivity(params: {
    collectionId: string;
    organizationId: string;
    action: string;
    notes?: string;
    contactPerson?: string;
    contactMethod?: string;
    outcome?: string;
    promisedDate?: string;
    promisedAmount?: number;
    loggedByEmail?: string;
  }): Promise<CollectionActivityLog> {
    const {
      collectionId,
      action,
      notes,
      contactPerson,
      contactMethod = 'phone',
      outcome,
      promisedDate,
      promisedAmount,
      loggedByEmail,
    } = params;

    const logId = 'clog_' + Math.random().toString(36).substring(2, 11);

    await pool.query(
      `INSERT INTO collection_activity_logs (
        id, collection_id, action, notes, contact_person, contact_method, outcome,
        promised_date, promised_amount, logged_by_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        logId,
        collectionId,
        action,
        notes || null,
        contactPerson || null,
        contactMethod,
        outcome || null,
        promisedDate || null,
        promisedAmount || null,
        loggedByEmail || null,
      ]
    );

    // Update collection record's last contact
    await pool.query(
      `UPDATE collections
       SET last_contact_date = NOW(),
           last_contact_notes = $1,
           promised_payment_date = COALESCE($2, promised_payment_date),
           promised_payment_amount = COALESCE($3, promised_payment_amount),
           updated_at = NOW()
       WHERE id = $4`,
      [notes || outcome || 'Contact recorded', promisedDate || null, promisedAmount || null, collectionId]
    );

    return {
      id: logId,
      collection_id: collectionId,
      action,
      notes: notes || undefined,
      contact_person: contactPerson || undefined,
      contact_method: contactMethod,
      outcome: outcome || undefined,
      promised_date: promisedDate || undefined,
      promised_amount: promisedAmount || undefined,
      logged_by_email: loggedByEmail || undefined,
      created_at: new Date().toISOString(),
    };
  }

  // ==========================================
  // DASHBOARD & ANALYTICS METRICS
  // ==========================================

  public static async getDashboardMetrics(orgId: string): Promise<FinanceDashboardMetrics> {
    // 1. Totals from Invoices
    const invRes = await pool.query(
      `SELECT 
         COALESCE(SUM(grand_total), 0)::float as total_invoiced,
         COALESCE(SUM(amount_paid), 0)::float as total_collected,
         COALESCE(SUM(amount_outstanding), 0)::float as total_outstanding,
         COALESCE(SUM(CASE WHEN due_date < NOW() AND status != 'paid' THEN amount_outstanding ELSE 0 END), 0)::float as total_overdue,
         COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_invoice_approvals
       FROM invoices
       WHERE organization_id = $1 AND status != 'cancelled' AND status != 'void'`,
      [orgId]
    );

    const totalInvoiced = parseFloat(invRes.rows[0]?.total_invoiced || '0');
    const totalCollected = parseFloat(invRes.rows[0]?.total_collected || '0');
    const totalOutstanding = parseFloat(invRes.rows[0]?.total_outstanding || '0');
    const totalOverdue = parseFloat(invRes.rows[0]?.total_overdue || '0');
    const pendingInvoiceApprovals = parseInt(invRes.rows[0]?.pending_invoice_approvals || '0', 10);

    // 2. Expenses Total
    const expRes = await pool.query(
      `SELECT 
         COALESCE(SUM(total_amount), 0)::float as total_expenses,
         COUNT(CASE WHEN status = 'submitted' THEN 1 END) as pending_expense_approvals
       FROM expenses
       WHERE organization_id = $1 AND status != 'cancelled' AND status != 'rejected'`,
      [orgId]
    );
    const totalExpenses = parseFloat(expRes.rows[0]?.total_expenses || '0');
    const pendingExpenseApprovals = parseInt(expRes.rows[0]?.pending_expense_approvals || '0', 10);

    // 3. Unallocated advances
    const payRes = await pool.query(
      `SELECT COALESCE(SUM(unallocated_amount), 0)::float as unallocated
       FROM payments
       WHERE organization_id = $1 AND status = 'cleared'`,
      [orgId]
    );
    const unallocatedAdvancesAmount = parseFloat(payRes.rows[0]?.unallocated || '0');

    // 4. Ageing breakdown
    const ageingSummaries = await this.getAgeingSummary({ organizationId: orgId });
    const ageingBreakdown = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_91_120: 0,
      days_120_plus: 0,
    };
    let overdueCount = 0;

    for (const a of ageingSummaries) {
      ageingBreakdown.current += a.current_amount;
      ageingBreakdown.days_1_30 += a.days_1_30;
      ageingBreakdown.days_31_60 += a.days_31_60;
      ageingBreakdown.days_61_90 += a.days_61_90;
      ageingBreakdown.days_91_120 += a.days_91_120;
      ageingBreakdown.days_120_plus += a.days_120_plus;
      if (a.overdue_amount > 0.01) {
        overdueCount++;
      }
    }

    // 5. Top Debtors
    const topDebtors = ageingSummaries.slice(0, 5).map((s) => ({
      customer_id: s.customer_id,
      customer_name: s.customer_name,
      customer_type: s.customer_type,
      outstanding: s.total_outstanding,
      overdue: s.overdue_amount,
      credit_limit: s.credit_limit,
    }));

    // 6. Expenses by Category
    const catRes = await pool.query(
      `SELECT c.name as category_name, COALESCE(SUM(e.total_amount), 0)::float as amount
       FROM expenses e
       JOIN expense_categories c ON e.category_id = c.id
       WHERE e.organization_id = $1 AND e.status != 'cancelled' AND e.status != 'rejected'
       GROUP BY c.name
       ORDER BY amount DESC`,
      [orgId]
    );
    const totalCatExp = catRes.rows.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
    const expensesByCategory = catRes.rows.map((r) => {
      const amt = parseFloat(r.amount || '0');
      return {
        category_name: r.category_name,
        amount: amt,
        percentage: totalCatExp > 0 ? Math.round((amt / totalCatExp) * 100) : 0,
      };
    });

    // 7. Monthly Trends (Invoiced vs Collected vs Expenses)
    const trendsRes = await pool.query(
      `SELECT 
         TO_CHAR(d, 'Mon YY') as month_label,
         DATE_TRUNC('month', d) as m_date
       FROM GENERATE_SERIES(NOW() - INTERVAL '5 months', NOW(), '1 month'::interval) d
       ORDER BY m_date ASC`
    );

    const monthlyTrends: { month: string; invoiced: number; collected: number; expenses: number }[] = [];
    for (const t of trendsRes.rows) {
      const monthStart = new Date(t.m_date);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

      const mInvRes = await pool.query(
        `SELECT COALESCE(SUM(grand_total), 0)::float as inv
         FROM invoices
         WHERE organization_id = $1 AND invoice_date >= $2 AND invoice_date < $3 AND status != 'cancelled'`,
        [orgId, monthStart.toISOString(), monthEnd.toISOString()]
      );

      const mPayRes = await pool.query(
        `SELECT COALESCE(SUM(amount), 0)::float as col
         FROM payments
         WHERE organization_id = $1 AND payment_date >= $2 AND payment_date < $3 AND status = 'cleared'`,
        [orgId, monthStart.toISOString(), monthEnd.toISOString()]
      );

      const mExpRes = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0)::float as exp
         FROM expenses
         WHERE organization_id = $1 AND expense_date >= $2 AND expense_date < $3 AND status != 'cancelled'`,
        [orgId, monthStart.toISOString(), monthEnd.toISOString()]
      );

      monthlyTrends.push({
        month: t.month_label,
        invoiced: parseFloat(mInvRes.rows[0]?.inv || '0'),
        collected: parseFloat(mPayRes.rows[0]?.col || '0'),
        expenses: parseFloat(mExpRes.rows[0]?.exp || '0'),
      });
    }

    // 8. Open collections count
    const colCountRes = await pool.query(
      `SELECT COUNT(*) FROM collections WHERE organization_id = $1 AND status != 'closed' AND status != 'collected'`,
      [orgId]
    );
    const openCollectionsCount = parseInt(colCountRes.rows[0]?.count || '0', 10);

    return {
      total_invoiced: totalInvoiced,
      total_collected: totalCollected,
      total_outstanding: totalOutstanding,
      total_overdue: totalOverdue,
      total_expenses: totalExpenses,
      net_receivable: totalOutstanding - unallocatedAdvancesAmount,
      overdue_customers_count: overdueCount,
      unallocated_advances_amount: unallocatedAdvancesAmount,
      pending_invoice_approvals: pendingInvoiceApprovals,
      pending_expense_approvals: pendingExpenseApprovals,
      open_collections_count: openCollectionsCount,
      ageing_breakdown: ageingBreakdown,
      monthly_trends: monthlyTrends,
      top_debtors: topDebtors,
      expenses_by_category: expensesByCategory,
    };
  }

  // ==========================================
  // MASTER DATA: METHODS, CATEGORIES, SETTINGS
  // ==========================================

  public static async getPaymentMethods(orgId: string): Promise<PaymentMethod[]> {
    const res = await pool.query(
      `SELECT * FROM payment_methods WHERE organization_id = $1 AND is_active = TRUE ORDER BY name ASC`,
      [orgId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      organization_id: r.organization_id,
      code: r.code,
      name: r.name,
      type: r.type,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  public static async getExpenseCategories(orgId: string): Promise<ExpenseCategory[]> {
    const res = await pool.query(
      `SELECT * FROM expense_categories WHERE organization_id = $1 AND is_active = TRUE ORDER BY name ASC`,
      [orgId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      organization_id: r.organization_id,
      code: r.code,
      name: r.name,
      description: r.description || undefined,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  public static async getFinancialSettings(orgId: string): Promise<FinancialSettings | null> {
    const res = await pool.query(
      `SELECT * FROM financial_settings WHERE organization_id = $1`,
      [orgId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      organization_id: r.organization_id,
      invoice_prefix: r.invoice_prefix,
      invoice_seq_start: r.invoice_seq_start,
      fy_format: r.fy_format,
      credit_note_prefix: r.credit_note_prefix,
      debit_note_prefix: r.debit_note_prefix,
      payment_prefix: r.payment_prefix,
      default_payment_terms_days: r.default_payment_terms_days,
      default_tax_rate: parseFloat(r.default_tax_rate || '18'),
      currency: r.currency,
      company_name: r.company_name,
      company_gstin: r.company_gstin || undefined,
      company_pan: r.company_pan || undefined,
      company_cin: r.company_cin || undefined,
      company_address: r.company_address || undefined,
      bank_name: r.bank_name || undefined,
      bank_account_name: r.bank_account_name || undefined,
      bank_account_number: r.bank_account_number || undefined,
      bank_ifsc: r.bank_ifsc || undefined,
      bank_branch: r.bank_branch || undefined,
      upi_id: r.upi_id || undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  // ==========================================
  // ROW MAPPERS
  // ==========================================

  private static mapInvoiceRow(r: any): Invoice {
    return {
      id: r.id,
      organization_id: r.organization_id,
      invoice_number: r.invoice_number,
      invoice_date: r.invoice_date,
      customer_type: r.customer_type,
      customer_id: r.customer_id || undefined,
      customer_name: r.customer_name,
      customer_code: r.customer_code || undefined,
      customer_gstin: r.customer_gstin || undefined,
      customer_pan: r.customer_pan || undefined,
      billing_address: r.billing_address || undefined,
      shipping_address: r.shipping_address || undefined,
      sales_order_id: r.sales_order_id || undefined,
      sales_order_number: r.sales_order_number || undefined,
      dispatch_id: r.dispatch_id || undefined,
      dispatch_number: r.dispatch_number || undefined,
      transporter_name: r.transporter_name || undefined,
      vehicle_number: r.vehicle_number || undefined,
      lr_number: r.lr_number || undefined,
      e_way_bill_number: r.e_way_bill_number || undefined,
      payment_terms_days: r.payment_terms_days,
      due_date: r.due_date,
      currency: r.currency,
      subtotal: parseFloat(r.subtotal || '0'),
      discount_total: parseFloat(r.discount_total || '0'),
      taxable_amount: parseFloat(r.taxable_amount || '0'),
      is_interstate: Boolean(r.is_interstate),
      cgst_total: parseFloat(r.cgst_total || '0'),
      sgst_total: parseFloat(r.sgst_total || '0'),
      igst_total: parseFloat(r.igst_total || '0'),
      tax_total: parseFloat(r.tax_total || '0'),
      rounding_adjustment: parseFloat(r.rounding_adjustment || '0'),
      grand_total: parseFloat(r.grand_total || '0'),
      amount_paid: parseFloat(r.amount_paid || '0'),
      amount_allocated: parseFloat(r.amount_allocated || '0'),
      amount_outstanding: parseFloat(r.amount_outstanding || '0'),
      status: r.status,
      notes: r.notes || undefined,
      created_by: r.created_by || undefined,
      created_by_email: r.created_by_email || undefined,
      approved_by: r.approved_by || undefined,
      approved_at: r.approved_at || undefined,
      posted_by: r.posted_by || undefined,
      posted_at: r.posted_at || undefined,
      cancelled_by: r.cancelled_by || undefined,
      cancelled_at: r.cancelled_at || undefined,
      cancellation_reason: r.cancellation_reason || undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private static mapInvoiceItemRow(r: any): InvoiceItem {
    return {
      id: r.id,
      organization_id: r.organization_id,
      invoice_id: r.invoice_id,
      sales_order_item_id: r.sales_order_item_id || undefined,
      product_id: r.product_id,
      sku_id: r.sku_id,
      product_name_snapshot: r.product_name_snapshot,
      sku_code_snapshot: r.sku_code_snapshot,
      variant_name_snapshot: r.variant_name_snapshot || undefined,
      hsn_code: r.hsn_code || undefined,
      quantity: parseFloat(r.quantity || '0'),
      uom: r.uom,
      unit_price: parseFloat(r.unit_price || '0'),
      discount_pct: parseFloat(r.discount_pct || '0'),
      discount_amount: parseFloat(r.discount_amount || '0'),
      taxable_amount: parseFloat(r.taxable_amount || '0'),
      tax_rate: parseFloat(r.tax_rate || '0'),
      cgst_rate: parseFloat(r.cgst_rate || '0'),
      cgst_amount: parseFloat(r.cgst_amount || '0'),
      sgst_rate: parseFloat(r.sgst_rate || '0'),
      sgst_amount: parseFloat(r.sgst_amount || '0'),
      igst_rate: parseFloat(r.igst_rate || '0'),
      igst_amount: parseFloat(r.igst_amount || '0'),
      line_total: parseFloat(r.line_total || '0'),
      created_at: r.created_at,
    };
  }

  private static mapPaymentRow(r: any): Payment {
    return {
      id: r.id,
      organization_id: r.organization_id,
      payment_number: r.payment_number,
      customer_type: r.customer_type,
      customer_id: r.customer_id || undefined,
      customer_name: r.customer_name,
      customer_code: r.customer_code || undefined,
      payment_date: r.payment_date,
      amount: parseFloat(r.amount || '0'),
      payment_method_id: r.payment_method_id || undefined,
      payment_method_code: r.payment_method_code,
      payment_method_name: r.payment_method_name,
      reference_number: r.reference_number || undefined,
      bank_name: r.bank_name || undefined,
      bank_account_last4: r.bank_account_last4 || undefined,
      cheque_number: r.cheque_number || undefined,
      cheque_date: r.cheque_date || undefined,
      allocated_amount: parseFloat(r.allocated_amount || '0'),
      unallocated_amount: parseFloat(r.unallocated_amount || '0'),
      status: r.status,
      notes: r.notes || undefined,
      received_by: r.received_by || undefined,
      created_by: r.created_by || undefined,
      created_by_email: r.created_by_email || undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private static mapCreditNoteRow(r: any): CreditNote {
    return {
      id: r.id,
      organization_id: r.organization_id,
      credit_note_number: r.credit_note_number,
      customer_type: r.customer_type,
      customer_id: r.customer_id || undefined,
      customer_name: r.customer_name,
      invoice_id: r.invoice_id || undefined,
      invoice_number: r.invoice_number || undefined,
      sales_return_id: r.sales_return_id || undefined,
      return_number: r.return_number || undefined,
      credit_date: r.credit_date,
      reason: r.reason,
      subtotal: parseFloat(r.subtotal || '0'),
      tax_total: parseFloat(r.tax_total || '0'),
      grand_total: parseFloat(r.grand_total || '0'),
      status: r.status,
      notes: r.notes || undefined,
      created_by: r.created_by || undefined,
      created_by_email: r.created_by_email || undefined,
      approved_by: r.approved_by || undefined,
      approved_at: r.approved_at || undefined,
      posted_by: r.posted_by || undefined,
      posted_at: r.posted_at || undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private static mapDebitNoteRow(r: any): DebitNote {
    return {
      id: r.id,
      organization_id: r.organization_id,
      debit_note_number: r.debit_note_number,
      customer_type: r.customer_type,
      customer_id: r.customer_id || undefined,
      customer_name: r.customer_name,
      invoice_id: r.invoice_id || undefined,
      invoice_number: r.invoice_number || undefined,
      debit_date: r.debit_date,
      reason: r.reason,
      subtotal: parseFloat(r.subtotal || '0'),
      tax_total: parseFloat(r.tax_total || '0'),
      grand_total: parseFloat(r.grand_total || '0'),
      status: r.status,
      notes: r.notes || undefined,
      created_by: r.created_by || undefined,
      created_by_email: r.created_by_email || undefined,
      approved_by: r.approved_by || undefined,
      approved_at: r.approved_at || undefined,
      posted_by: r.posted_by || undefined,
      posted_at: r.posted_at || undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private static mapExpenseRow(r: any): Expense {
    return {
      id: r.id,
      organization_id: r.organization_id,
      expense_number: r.expense_number,
      expense_date: r.expense_date,
      category_id: r.category_id,
      category_name: r.category_name,
      category_code: r.category_code || undefined,
      amount: parseFloat(r.amount || '0'),
      tax_amount: parseFloat(r.tax_amount || '0'),
      total_amount: parseFloat(r.total_amount || '0'),
      payment_method: r.payment_method || undefined,
      vendor_payee: r.vendor_payee,
      description: r.description,
      department: r.department || undefined,
      branch_id: r.branch_id || undefined,
      receipt_url: r.receipt_url || undefined,
      receipt_filename: r.receipt_filename || undefined,
      status: r.status,
      submitted_by: r.submitted_by || undefined,
      submitted_by_email: r.submitted_by_email || undefined,
      approved_by: r.approved_by || undefined,
      approved_by_email: r.approved_by_email || undefined,
      approved_at: r.approved_at || undefined,
      rejection_reason: r.rejection_reason || undefined,
      paid_at: r.paid_at || undefined,
      notes: r.notes || undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private static mapCollectionRow(r: any): CollectionTask {
    return {
      id: r.id,
      organization_id: r.organization_id,
      customer_type: r.customer_type,
      customer_id: r.customer_id,
      customer_name: r.customer_name,
      customer_code: r.customer_code || undefined,
      total_outstanding: parseFloat(r.total_outstanding || '0'),
      target_collection_amount: parseFloat(r.target_collection_amount || '0'),
      due_date: r.due_date || undefined,
      priority: r.priority,
      follow_up_date: r.follow_up_date,
      assigned_to: r.assigned_to || undefined,
      assigned_to_email: r.assigned_to_email || undefined,
      assigned_to_name: r.assigned_to_name || undefined,
      notes: r.notes || undefined,
      status: r.status,
      promised_payment_date: r.promised_payment_date || undefined,
      promised_payment_amount: r.promised_payment_amount
        ? parseFloat(r.promised_payment_amount)
        : undefined,
      last_contact_date: r.last_contact_date || undefined,
      last_contact_notes: r.last_contact_notes || undefined,
      next_action: r.next_action || undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }
}
