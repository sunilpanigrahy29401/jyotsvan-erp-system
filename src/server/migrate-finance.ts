// src/server/migrate-finance.ts
// Schema Migrations & Initial Seed Data for Phase 19 Finance & Collections

import { pool } from './db.ts';

export async function runFinanceMigration() {
  console.log('[Phase 19 Migration] Initializing Finance, Collections, Invoicing & Financial Ledger schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Payment Methods Master (`payment_methods`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        type VARCHAR(64) NOT NULL DEFAULT 'bank',
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_payment_method_code UNIQUE (organization_id, code)
      );
    `);

    // 2. Expense Categories Master (`expense_categories`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_expense_category_code UNIQUE (organization_id, code)
      );
    `);

    // 3. Financial Settings (`financial_settings`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_settings (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        invoice_prefix VARCHAR(32) NOT NULL DEFAULT 'INV',
        invoice_seq_start INTEGER NOT NULL DEFAULT 1,
        fy_format VARCHAR(32) NOT NULL DEFAULT 'YY-YY',
        credit_note_prefix VARCHAR(32) NOT NULL DEFAULT 'CN',
        debit_note_prefix VARCHAR(32) NOT NULL DEFAULT 'DN',
        payment_prefix VARCHAR(32) NOT NULL DEFAULT 'PAY',
        default_payment_terms_days INTEGER NOT NULL DEFAULT 30,
        default_tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
        currency VARCHAR(8) NOT NULL DEFAULT 'INR',
        company_name VARCHAR(255) NOT NULL DEFAULT 'Jyotsvan Enterprises Pvt Ltd',
        company_gstin VARCHAR(32) DEFAULT '27AABCJ1234F1Z5',
        company_pan VARCHAR(32) DEFAULT 'AABCJ1234F',
        company_cin VARCHAR(32) DEFAULT 'U24246MH2024PTC123456',
        company_address JSONB DEFAULT '{"line1":"Plot 45, MIDC Industrial Area","city":"Nagpur","state":"Maharashtra","pincode":"440016","country":"India"}'::jsonb,
        bank_name VARCHAR(128) DEFAULT 'HDFC Bank Ltd',
        bank_account_name VARCHAR(255) DEFAULT 'Jyotsvan Enterprises Pvt Ltd',
        bank_account_number VARCHAR(64) DEFAULT '50200084920194',
        bank_ifsc VARCHAR(32) DEFAULT 'HDFC0001234',
        bank_branch VARCHAR(128) DEFAULT 'MIDC Industrial Estate Branch',
        upi_id VARCHAR(128) DEFAULT 'jyotsvan.enterprises@hdfcbank',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_financial_settings UNIQUE (organization_id)
      );
    `);

    // 4. Sales Invoices Master (`invoices`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        invoice_number VARCHAR(64) NOT NULL,
        invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        customer_type VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64),
        customer_name VARCHAR(255) NOT NULL,
        customer_code VARCHAR(64),
        customer_gstin VARCHAR(32),
        customer_pan VARCHAR(32),
        billing_address JSONB,
        shipping_address JSONB,
        sales_order_id VARCHAR(64) REFERENCES sales_orders(id) ON DELETE SET NULL,
        sales_order_number VARCHAR(64),
        dispatch_id VARCHAR(64) REFERENCES sales_order_dispatches(id) ON DELETE SET NULL,
        dispatch_number VARCHAR(64),
        transporter_name VARCHAR(128),
        vehicle_number VARCHAR(64),
        lr_number VARCHAR(64),
        e_way_bill_number VARCHAR(64),
        payment_terms_days INTEGER NOT NULL DEFAULT 30,
        due_date TIMESTAMPTZ NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'INR',
        subtotal NUMERIC(16,2) NOT NULL DEFAULT 0,
        discount_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        taxable_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        is_interstate BOOLEAN DEFAULT FALSE,
        cgst_total NUMERIC(16,2) DEFAULT 0,
        sgst_total NUMERIC(16,2) DEFAULT 0,
        igst_total NUMERIC(16,2) DEFAULT 0,
        tax_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        rounding_adjustment NUMERIC(8,2) DEFAULT 0,
        grand_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        amount_paid NUMERIC(16,2) NOT NULL DEFAULT 0,
        amount_allocated NUMERIC(16,2) NOT NULL DEFAULT 0,
        amount_outstanding NUMERIC(16,2) NOT NULL DEFAULT 0,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        notes TEXT,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        approved_by VARCHAR(64),
        approved_at TIMESTAMPTZ,
        posted_by VARCHAR(64),
        posted_at TIMESTAMPTZ,
        cancelled_by VARCHAR(64),
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_invoice_number UNIQUE (organization_id, invoice_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(organization_id, customer_type, customer_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date ASC);
      CREATE INDEX IF NOT EXISTS idx_invoices_so ON invoices(sales_order_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
    `);

    // 5. Invoice Line Items (`invoice_items`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        sales_order_item_id VARCHAR(64) REFERENCES sales_order_items(id) ON DELETE SET NULL,
        product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        sku_id VARCHAR(64) NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
        product_name_snapshot VARCHAR(255) NOT NULL,
        sku_code_snapshot VARCHAR(64) NOT NULL,
        variant_name_snapshot VARCHAR(128),
        hsn_code VARCHAR(32) DEFAULT '330499',
        quantity NUMERIC(16,4) NOT NULL DEFAULT 1,
        uom VARCHAR(32) NOT NULL DEFAULT 'Unit',
        unit_price NUMERIC(16,4) NOT NULL DEFAULT 0,
        discount_pct NUMERIC(5,2) DEFAULT 0,
        discount_amount NUMERIC(16,4) DEFAULT 0,
        taxable_amount NUMERIC(16,4) NOT NULL DEFAULT 0,
        tax_rate NUMERIC(5,2) DEFAULT 18,
        cgst_rate NUMERIC(5,2) DEFAULT 9,
        cgst_amount NUMERIC(16,4) DEFAULT 0,
        sgst_rate NUMERIC(5,2) DEFAULT 9,
        sgst_amount NUMERIC(16,4) DEFAULT 0,
        igst_rate NUMERIC(5,2) DEFAULT 0,
        igst_amount NUMERIC(16,4) DEFAULT 0,
        line_total NUMERIC(16,4) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    `);

    // 6. Invoice Status History (`invoice_status_history`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_status_history (
        id VARCHAR(64) PRIMARY KEY,
        invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        old_status VARCHAR(64),
        new_status VARCHAR(64) NOT NULL,
        reason TEXT,
        notes TEXT,
        changed_by VARCHAR(64),
        changed_by_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 7. Payments Master (`payments`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        payment_number VARCHAR(64) NOT NULL,
        customer_type VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64),
        customer_name VARCHAR(255) NOT NULL,
        customer_code VARCHAR(64),
        payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        payment_method_id VARCHAR(64) REFERENCES payment_methods(id) ON DELETE SET NULL,
        payment_method_code VARCHAR(64) NOT NULL,
        payment_method_name VARCHAR(128) NOT NULL,
        reference_number VARCHAR(128),
        bank_name VARCHAR(128),
        bank_account_last4 VARCHAR(16),
        cheque_number VARCHAR(64),
        cheque_date TIMESTAMPTZ,
        allocated_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        unallocated_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        status VARCHAR(64) NOT NULL DEFAULT 'cleared',
        notes TEXT,
        received_by VARCHAR(64),
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_payment_number UNIQUE (organization_id, payment_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(organization_id, customer_type, customer_id);
      CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(organization_id, status);
    `);

    // 8. Payment Allocations (`payment_allocations`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_allocations (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        payment_id VARCHAR(64) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        allocated_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_allocations_payment ON payment_allocations(payment_id);
      CREATE INDEX IF NOT EXISTS idx_allocations_invoice ON payment_allocations(invoice_id);
    `);

    // 9. Payment Status History (`payment_status_history`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_status_history (
        id VARCHAR(64) PRIMARY KEY,
        payment_id VARCHAR(64) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        old_status VARCHAR(64),
        new_status VARCHAR(64) NOT NULL,
        reason TEXT,
        changed_by VARCHAR(64),
        changed_by_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 10. Credit Notes Master (`credit_notes`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_notes (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        credit_note_number VARCHAR(64) NOT NULL,
        customer_type VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64),
        customer_name VARCHAR(255) NOT NULL,
        invoice_id VARCHAR(64) REFERENCES invoices(id) ON DELETE SET NULL,
        invoice_number VARCHAR(64),
        sales_return_id VARCHAR(64) REFERENCES sales_returns(id) ON DELETE SET NULL,
        return_number VARCHAR(64),
        credit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reason VARCHAR(255) NOT NULL,
        subtotal NUMERIC(16,2) NOT NULL DEFAULT 0,
        tax_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        grand_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        status VARCHAR(64) NOT NULL DEFAULT 'posted',
        notes TEXT,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        approved_by VARCHAR(64),
        approved_at TIMESTAMPTZ,
        posted_by VARCHAR(64),
        posted_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_credit_note_number UNIQUE (organization_id, credit_note_number)
      );
    `);

    // Credit Note Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_note_items (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        credit_note_id VARCHAR(64) NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
        sku_id VARCHAR(64) REFERENCES skus(id) ON DELETE SET NULL,
        sku_code_snapshot VARCHAR(64),
        product_name_snapshot VARCHAR(255) NOT NULL,
        quantity NUMERIC(16,4) NOT NULL DEFAULT 1,
        unit_price NUMERIC(16,4) NOT NULL DEFAULT 0,
        taxable_amount NUMERIC(16,4) NOT NULL DEFAULT 0,
        tax_rate NUMERIC(5,2) DEFAULT 18,
        tax_amount NUMERIC(16,4) DEFAULT 0,
        line_total NUMERIC(16,4) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 11. Debit Notes Master (`debit_notes`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS debit_notes (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        debit_note_number VARCHAR(64) NOT NULL,
        customer_type VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64),
        customer_name VARCHAR(255) NOT NULL,
        invoice_id VARCHAR(64) REFERENCES invoices(id) ON DELETE SET NULL,
        invoice_number VARCHAR(64),
        debit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reason VARCHAR(255) NOT NULL,
        subtotal NUMERIC(16,2) NOT NULL DEFAULT 0,
        tax_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        grand_total NUMERIC(16,2) NOT NULL DEFAULT 0,
        status VARCHAR(64) NOT NULL DEFAULT 'posted',
        notes TEXT,
        created_by VARCHAR(64),
        created_by_email VARCHAR(255),
        approved_by VARCHAR(64),
        approved_at TIMESTAMPTZ,
        posted_by VARCHAR(64),
        posted_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_debit_note_number UNIQUE (organization_id, debit_note_number)
      );
    `);

    // Debit Note Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS debit_note_items (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        debit_note_id VARCHAR(64) NOT NULL REFERENCES debit_notes(id) ON DELETE CASCADE,
        description VARCHAR(255) NOT NULL,
        quantity NUMERIC(16,4) NOT NULL DEFAULT 1,
        unit_price NUMERIC(16,4) NOT NULL DEFAULT 0,
        taxable_amount NUMERIC(16,4) NOT NULL DEFAULT 0,
        tax_rate NUMERIC(5,2) DEFAULT 18,
        tax_amount NUMERIC(16,4) DEFAULT 0,
        line_total NUMERIC(16,4) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 12. Expenses Master (`expenses`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        expense_number VARCHAR(64) NOT NULL,
        expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        category_id VARCHAR(64) NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
        amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        tax_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        total_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(64) DEFAULT 'Bank Transfer',
        vendor_payee VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        department VARCHAR(128) DEFAULT 'Operations',
        branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
        receipt_url TEXT,
        receipt_filename VARCHAR(255),
        status VARCHAR(64) NOT NULL DEFAULT 'submitted',
        submitted_by VARCHAR(64),
        submitted_by_email VARCHAR(255),
        approved_by VARCHAR(64),
        approved_by_email VARCHAR(255),
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        paid_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_org_expense_number UNIQUE (organization_id, expense_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_org_status ON expenses(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_expenses_cat ON expenses(category_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
    `);

    // Expense Status History
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_status_history (
        id VARCHAR(64) PRIMARY KEY,
        expense_id VARCHAR(64) NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        old_status VARCHAR(64),
        new_status VARCHAR(64) NOT NULL,
        reason TEXT,
        changed_by VARCHAR(64),
        changed_by_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 13. Financial Transactions / Subledger Table (`finance_transactions`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS finance_transactions (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        transaction_type VARCHAR(64) NOT NULL,
        reference_type VARCHAR(64) NOT NULL,
        reference_id VARCHAR(64) NOT NULL,
        reference_number VARCHAR(64),
        customer_type VARCHAR(64),
        customer_id VARCHAR(64),
        customer_name VARCHAR(255),
        debit_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        credit_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        running_balance NUMERIC(16,2) NOT NULL DEFAULT 0,
        transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        posting_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        description TEXT NOT NULL,
        notes TEXT,
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fin_tx_org ON finance_transactions(organization_id);
      CREATE INDEX IF NOT EXISTS idx_fin_tx_cust ON finance_transactions(organization_id, customer_id);
      CREATE INDEX IF NOT EXISTS idx_fin_tx_date ON finance_transactions(posting_date ASC);
      CREATE INDEX IF NOT EXISTS idx_fin_tx_ref ON finance_transactions(reference_type, reference_id);
    `);

    // 14. Collections / Follow-up Tasks (`collections`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        customer_type VARCHAR(64) NOT NULL,
        customer_id VARCHAR(64) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_code VARCHAR(64),
        total_outstanding NUMERIC(16,2) NOT NULL DEFAULT 0,
        target_collection_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
        due_date TIMESTAMPTZ,
        priority VARCHAR(32) NOT NULL DEFAULT 'medium',
        follow_up_date TIMESTAMPTZ NOT NULL,
        assigned_to VARCHAR(64),
        assigned_to_email VARCHAR(255),
        assigned_to_name VARCHAR(128),
        notes TEXT,
        status VARCHAR(64) NOT NULL DEFAULT 'open',
        promised_payment_date TIMESTAMPTZ,
        promised_payment_amount NUMERIC(16,2),
        last_contact_date TIMESTAMPTZ,
        last_contact_notes TEXT,
        next_action TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_collections_org_status ON collections(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_collections_cust ON collections(customer_id);
      CREATE INDEX IF NOT EXISTS idx_collections_followup ON collections(follow_up_date ASC);
    `);

    // Collection Activity Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS collection_activity_logs (
        id VARCHAR(64) PRIMARY KEY,
        collection_id VARCHAR(64) NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        action VARCHAR(128) NOT NULL,
        notes TEXT,
        contact_person VARCHAR(128),
        contact_method VARCHAR(64) DEFAULT 'phone',
        outcome VARCHAR(128),
        promised_date TIMESTAMPTZ,
        promised_amount NUMERIC(16,2),
        logged_by VARCHAR(64),
        logged_by_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 15. Permissions Seeding for Finance & Collections
    const financePermissions = [
      { code: 'finance.view', module: 'finance', description: 'View financial analytics, reports and dashboards' },
      { code: 'finance.create', module: 'finance', description: 'Create general financial entries' },
      { code: 'finance.edit', module: 'finance', description: 'Edit financial records' },
      { code: 'finance.approve', module: 'finance', description: 'Approve financial workflows' },
      { code: 'finance.post', module: 'finance', description: 'Post financial entries to general ledger' },
      { code: 'finance.cancel', module: 'finance', description: 'Cancel financial entries' },
      { code: 'finance.export', module: 'finance', description: 'Export financial reports and ledgers' },
      { code: 'invoices.view', module: 'finance', description: 'View sales invoices and tax documents' },
      { code: 'invoices.create', module: 'finance', description: 'Create and generate sales invoices' },
      { code: 'invoices.edit', module: 'finance', description: 'Edit draft invoices' },
      { code: 'invoices.approve', module: 'finance', description: 'Approve draft invoices' },
      { code: 'invoices.post', module: 'finance', description: 'Post invoices to customer receivable ledger' },
      { code: 'invoices.cancel', module: 'finance', description: 'Cancel or void posted invoices' },
      { code: 'invoices.export', module: 'finance', description: 'Export invoices and tax summaries' },
      { code: 'payments.view', module: 'finance', description: 'View payments registry and bank settlements' },
      { code: 'payments.create', module: 'finance', description: 'Record customer receipt payments' },
      { code: 'payments.edit', module: 'finance', description: 'Edit payment details and allocations' },
      { code: 'payments.approve', module: 'finance', description: 'Approve receipt payments' },
      { code: 'payments.post', module: 'finance', description: 'Post payments and knock off invoice balances' },
      { code: 'payments.export', module: 'finance', description: 'Export payment statements' },
      { code: 'collections.view', module: 'finance', description: 'View collection follow-up queues and promises to pay' },
      { code: 'collections.create', module: 'finance', description: 'Create collection tasks and follow-up schedules' },
      { code: 'collections.edit', module: 'finance', description: 'Update collection status and log conversations' },
      { code: 'collections.assign', module: 'finance', description: 'Assign collection accounts to field representatives' },
      { code: 'collections.close', module: 'finance', description: 'Close completed collection follow-ups' },
      { code: 'collections.export', module: 'finance', description: 'Export collection tracking sheets' },
      { code: 'expenses.view', module: 'finance', description: 'View OPEX expense registry' },
      { code: 'expenses.create', module: 'finance', description: 'Submit operational expense vouchers' },
      { code: 'expenses.edit', module: 'finance', description: 'Edit expense entries' },
      { code: 'expenses.approve', module: 'finance', description: 'Managerial approval of submitted expenses' },
      { code: 'expenses.post', module: 'finance', description: 'Post approved expenses as paid' },
      { code: 'expenses.cancel', module: 'finance', description: 'Cancel or reject expenses' },
      { code: 'expenses.export', module: 'finance', description: 'Export expense reports by cost center' },
      { code: 'credit_notes.view', module: 'finance', description: 'View credit notes register' },
      { code: 'credit_notes.create', module: 'finance', description: 'Issue commercial and sales return credit notes' },
      { code: 'credit_notes.approve', module: 'finance', description: 'Approve credit notes' },
      { code: 'credit_notes.post', module: 'finance', description: 'Post credit notes to customer subledger' },
      { code: 'credit_notes.cancel', module: 'finance', description: 'Cancel credit notes' },
      { code: 'debit_notes.view', module: 'finance', description: 'View debit notes register' },
      { code: 'debit_notes.create', module: 'finance', description: 'Issue debit notes for price adjustments' },
      { code: 'debit_notes.approve', module: 'finance', description: 'Approve debit notes' },
      { code: 'debit_notes.post', module: 'finance', description: 'Post debit notes to customer subledger' },
      { code: 'debit_notes.cancel', module: 'finance', description: 'Cancel debit notes' },
    ];

    for (const p of financePermissions) {
      await client.query(`
        INSERT INTO permissions (id, code, module, description, created_at)
        VALUES ('perm_' || md5($1), $1, $2, $3, NOW())
        ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module;
      `, [p.code, p.module, p.description]);
    }

    // Map permissions to system admin and manager roles
    await client.query(`
      INSERT INTO role_permissions (id, role_id, permission_id, created_at)
      SELECT 'rp_' || md5(r.id || '_' || p.id), r.id, p.id, NOW()
      FROM roles r
      CROSS JOIN permissions p
      WHERE (r.slug = 'super_admin' OR r.slug = 'admin' OR r.slug = 'finance_manager' OR r.slug = 'general_manager')
        AND p.module = 'finance'
      ON CONFLICT DO NOTHING;
    `);

    // 16. Seed Organization Master Data for Default Organization
    const orgRes = await client.query(`SELECT id FROM organizations LIMIT 1`);
    if (orgRes.rows.length > 0) {
      const orgId = orgRes.rows[0].id;

      // Seed Financial Settings
      await client.query(`
        INSERT INTO financial_settings (
          id, organization_id, invoice_prefix, invoice_seq_start, fy_format, credit_note_prefix, debit_note_prefix, payment_prefix,
          default_payment_terms_days, default_tax_rate, currency, company_name, company_gstin, company_pan
        ) VALUES (
          'fin_set_' || $1, $1, 'INV', 1001, '26-27', 'CN', 'DN', 'PAY', 30, 18.00, 'INR',
          'Jyotsvan Enterprises Pvt Ltd', '27AABCJ1234F1Z5', 'AABCJ1234F'
        ) ON CONFLICT (organization_id) DO NOTHING;
      `, [orgId]);

      // Seed Payment Methods
      const defaultMethods = [
        { code: 'BANK_TRANSFER', name: 'Bank Transfer (NEFT/RTGS/IMPS)', type: 'bank' },
        { code: 'UPI', name: 'UPI / QR Code', type: 'digital' },
        { code: 'CHEQUE', name: 'Cheque / Demand Draft', type: 'bank' },
        { code: 'CASH', name: 'Cash', type: 'cash' },
        { code: 'CARD', name: 'Corporate Credit/Debit Card', type: 'card' },
      ];

      for (const m of defaultMethods) {
        await client.query(`
          INSERT INTO payment_methods (id, organization_id, code, name, type, is_active)
          VALUES ('pm_' || $1 || '_' || $2, $1, $2, $3, $4, TRUE)
          ON CONFLICT (organization_id, code) DO NOTHING;
        `, [orgId, m.code, m.name, m.type]);
      }

      // Seed Expense Categories
      const defaultCategories = [
        { code: 'LOGISTICS', name: 'Freight & Logistics', desc: 'Freight outwards, secondary transport, and courier expenses' },
        { code: 'RENT', name: 'Warehouse & Office Rent', desc: 'Rental leases for depots, plants and corporate offices' },
        { code: 'MARKETING', name: 'Marketing & Trade Promotions', desc: 'Distributor dealer meet, retail branding, POP materials' },
        { code: 'UTILITIES', name: 'Electricity & Utilities', desc: 'Manufacturing unit electricity, water, and broadband' },
        { code: 'TRAVEL', name: 'Field Travel & Conveyance', desc: 'Field sales executive DA/TA, travel, and lodging' },
        { code: 'MAINTENANCE', name: 'Repairs & Machinery Maintenance', desc: 'Plant machinery servicing, calibration, and spare parts' },
        { code: 'OFFICE', name: 'Office Supplies & Stationery', desc: 'Invoicing paper, stationery, printing and consumables' },
        { code: 'PROFESSIONAL', name: 'Legal & Professional Fees', desc: 'Statutory audit, legal counsel, and certification fees' },
        { code: 'PACKAGING', name: 'Secondary Packaging Consumables', desc: 'Corrugated boxes, strapping rolls, shrink wrap, and tape' },
      ];

      for (const c of defaultCategories) {
        await client.query(`
          INSERT INTO expense_categories (id, organization_id, code, name, description, is_active)
          VALUES ('exp_cat_' || $1 || '_' || $2, $1, $2, $3, $4, TRUE)
          ON CONFLICT (organization_id, code) DO NOTHING;
        `, [orgId, c.code, c.name, c.desc]);
      }

      // 17. Seed Realistic Initial Invoices, Payments, Ledger Entries, Expenses, and Collections
      // Check if invoices already seeded
      const invCount = await client.query(`SELECT count(*) FROM invoices WHERE organization_id = $1`, [orgId]);
      if (parseInt(invCount.rows[0].count, 10) === 0) {
        // Find existing distributors and retailers
        const distRes = await client.query(`SELECT id, legal_name, distributor_code, gstin, city, state FROM distributors WHERE organization_id = $1 LIMIT 5`, [orgId]);
        const retRes = await client.query(`SELECT id, legal_name, display_name, retailer_code, gstin, city, state FROM retailers WHERE organization_id = $1 LIMIT 5`, [orgId]);
        const skuRes = await client.query(`SELECT id, sku, product_id, mrp, selling_price FROM skus WHERE organization_id = $1 LIMIT 6`, [orgId]);
        const prodRes = await client.query(`SELECT id, name FROM products WHERE organization_id = $1`, [orgId]);
        const prodMap = new Map(prodRes.rows.map(p => [p.id, p.name]));
        const catRes = await client.query(`SELECT id, code, name FROM expense_categories WHERE organization_id = $1`, [orgId]);
        const catMap = new Map(catRes.rows.map(c => [c.code, c.id]));

        if (distRes.rows.length > 0 && skuRes.rows.length > 0) {
          const d1 = distRes.rows[0];
          const d2 = distRes.rows.length > 1 ? distRes.rows[1] : d1;
          const r1 = retRes.rows.length > 0 ? retRes.rows[0] : null;

          // Invoice 1: Posted & Partially Paid for Distributor 1
          const inv1Id = 'inv_seed_001_' + orgId;
          const inv1Num = 'INV/26-27/001001';
          const sku1 = skuRes.rows[0];
          const sku2 = skuRes.rows.length > 1 ? skuRes.rows[1] : sku1;

          await client.query(`
            INSERT INTO invoices (
              id, organization_id, invoice_number, invoice_date, customer_type, customer_id, customer_name, customer_code,
              customer_gstin, payment_terms_days, due_date, currency, subtotal, discount_total, taxable_amount, is_interstate,
              cgst_total, sgst_total, igst_total, tax_total, rounding_adjustment, grand_total, amount_paid, amount_allocated,
              amount_outstanding, status, posted_by, posted_at, notes, created_by_email
            ) VALUES (
              $1, $2, $3, NOW() - INTERVAL '25 days', 'distributor', $4, $5, $6,
              $7, 30, NOW() + INTERVAL '5 days', 'INR', 245000, 12250, 232750, FALSE,
              20947.50, 20947.50, 0, 41895, 0, 274645, 150000, 150000,
              124645, 'partially_paid', 'system', NOW() - INTERVAL '25 days', 'Primary stock replenishment dispatch #DSP-2026-001', 'finance@jyotsvan.com'
            );
          `, [inv1Id, orgId, inv1Num, d1.id, d1.legal_name, d1.distributor_code, d1.gstin]);

          // Invoice 1 Line Items
          await client.query(`
            INSERT INTO invoice_items (
              id, organization_id, invoice_id, product_id, sku_id, product_name_snapshot, sku_code_snapshot,
              quantity, uom, unit_price, discount_pct, discount_amount, taxable_amount, tax_rate, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, line_total
            ) VALUES
            ('item_seed_01', $1, $2, $3, $4, $5, $6, 500, 'Unit', 350, 5, 8750, 166250, 18, 9, 14962.50, 9, 14962.50, 0, 0, 196175),
            ('item_seed_02', $1, $2, $7, $8, $9, $10, 250, 'Unit', 280, 5, 3500, 66500, 18, 9, 5985, 9, 5985, 0, 0, 78470);
          `, [
            orgId, inv1Id, sku1.product_id, sku1.id, prodMap.get(sku1.product_id) || 'Jyotsvan Premium Product', sku1.sku,
            sku2.product_id, sku2.id, prodMap.get(sku2.product_id) || 'Jyotsvan Standard Product', sku2.sku
          ]);

          // Subledger entry for Invoice 1
          await client.query(`
            INSERT INTO finance_transactions (
              id, organization_id, transaction_type, reference_type, reference_id, reference_number,
              customer_type, customer_id, customer_name, debit_amount, credit_amount, running_balance,
              transaction_date, posting_date, description, created_by
            ) VALUES (
              $1, $2, 'INVOICE', 'invoice', $3, $4,
              'distributor', $5, $6, 274645, 0, 274645,
              NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', $7, 'system'
            );
          `, [`tx_seed_01_${orgId}`, orgId, inv1Id, inv1Num, d1.id, d1.legal_name, `Sales Invoice booked: ${inv1Num}`]);

          // Payment 1 for Distributor 1
          const pay1Id = 'pay_seed_001_' + orgId;
          const pay1Num = 'PAY/26-27/000101';
          await client.query(`
            INSERT INTO payments (
              id, organization_id, payment_number, customer_type, customer_id, customer_name, customer_code,
              payment_date, amount, payment_method_code, payment_method_name, reference_number, bank_name,
              allocated_amount, unallocated_amount, status, notes, created_by_email
            ) VALUES (
              $1, $2, $3, 'distributor', $4, $5, $6,
              NOW() - INTERVAL '10 days', 150000, 'BANK_TRANSFER', 'Bank Transfer (NEFT/RTGS/IMPS)', 'HDFC-NEFT-9402810', 'HDFC Bank',
              150000, 0, 'cleared', 'Part payment received via NEFT against INV/26-27/001001', 'accounts@jyotsvan.com'
            );
          `, [pay1Id, orgId, pay1Num, d1.id, d1.legal_name, d1.distributor_code]);

          // Payment Allocation 1
          await client.query(`
            INSERT INTO payment_allocations (
              id, organization_id, payment_id, invoice_id, allocated_amount, notes, created_by_email
            ) VALUES (
              'alloc_seed_01_' || $1, $1, $2, $3, 150000, 'Auto-knockoff allocation', 'accounts@jyotsvan.com'
            );
          `, [orgId, pay1Id, inv1Id]);

          // Subledger entry for Payment 1
          await client.query(`
            INSERT INTO finance_transactions (
              id, organization_id, transaction_type, reference_type, reference_id, reference_number,
              customer_type, customer_id, customer_name, debit_amount, credit_amount, running_balance,
              transaction_date, posting_date, description, created_by
            ) VALUES (
              $1, $2, 'PAYMENT', 'payment', $3, $4,
              'distributor', $5, $6, 0, 150000, 124645,
              NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', $7, 'system'
            );
          `, [`tx_seed_02_${orgId}`, orgId, pay1Id, pay1Num, d1.id, d1.legal_name, `Bank Settlement receipt: ${pay1Num}`]);

          // Invoice 2: Overdue Invoice for Distributor 2
          const inv2Id = 'inv_seed_002_' + orgId;
          const inv2Num = 'INV/26-27/001002';
          await client.query(`
            INSERT INTO invoices (
              id, organization_id, invoice_number, invoice_date, customer_type, customer_id, customer_name, customer_code,
              customer_gstin, payment_terms_days, due_date, currency, subtotal, discount_total, taxable_amount, is_interstate,
              cgst_total, sgst_total, igst_total, tax_total, rounding_adjustment, grand_total, amount_paid, amount_allocated,
              amount_outstanding, status, posted_by, posted_at, notes, created_by_email
            ) VALUES (
              $1, $2, $3, NOW() - INTERVAL '45 days', 'distributor', $4, $5, $6,
              $7, 30, NOW() - INTERVAL '15 days', 'INR', 180000, 9000, 171000, TRUE,
              0, 0, 30780, 30780, 0, 201780, 0, 0,
              201780, 'overdue', 'system', NOW() - INTERVAL '45 days', 'Commercial supply dispatch #DSP-2026-002', 'finance@jyotsvan.com'
            );
          `, [inv2Id, orgId, inv2Num, d2.id, d2.legal_name, d2.distributor_code, d2.gstin]);

          await client.query(`
            INSERT INTO invoice_items (
              id, organization_id, invoice_id, product_id, sku_id, product_name_snapshot, sku_code_snapshot,
              quantity, uom, unit_price, discount_pct, discount_amount, taxable_amount, tax_rate, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, line_total
            ) VALUES
            ('item_seed_03', $1, $2, $3, $4, $5, $6, 400, 'Unit', 450, 5, 9000, 171000, 18, 0, 0, 0, 0, 18, 30780, 201780);
          `, [
            orgId, inv2Id, sku1.product_id, sku1.id, prodMap.get(sku1.product_id) || 'Jyotsvan Premium Product', sku1.sku
          ]);

          await client.query(`
            INSERT INTO finance_transactions (
              id, organization_id, transaction_type, reference_type, reference_id, reference_number,
              customer_type, customer_id, customer_name, debit_amount, credit_amount, running_balance,
              transaction_date, posting_date, description, created_by
            ) VALUES (
              $1, $2, 'INVOICE', 'invoice', $3, $4,
              'distributor', $5, $6, 201780, 0, 201780,
              NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', $7, 'system'
            );
          `, [`tx_seed_03_${orgId}`, orgId, inv2Id, inv2Num, d2.id, d2.legal_name, `Sales Invoice booked: ${inv2Num}`]);

          // Collection Task for Overdue Distributor 2
          await client.query(`
            INSERT INTO collections (
              id, organization_id, customer_type, customer_id, customer_name, customer_code,
              total_outstanding, target_collection_amount, due_date, priority, follow_up_date,
              assigned_to_name, notes, status, next_action
            ) VALUES (
              'col_seed_01_' || $1, $1, 'distributor', $2, $3, $4,
              201780, 201780, NOW() - INTERVAL '15 days', 'high', NOW() + INTERVAL '2 days',
              'Finance Recovery Lead', '15 days overdue for invoice INV/26-27/001002. Distributor requested grace period till Friday.',
              'promise_to_pay', 'Collect RTGS remittance UTR and confirm bank receipt'
            );
          `, [orgId, d2.id, d2.legal_name, d2.distributor_code]);

          // Invoice 3 for Retailer (if available)
          if (r1) {
            const retailerName = r1.display_name || r1.legal_name || 'Retail Store';
            const inv3Id = 'inv_seed_003_' + orgId;
            const inv3Num = 'INV/26-27/001003';
            await client.query(`
              INSERT INTO invoices (
                id, organization_id, invoice_number, invoice_date, customer_type, customer_id, customer_name, customer_code,
                customer_gstin, payment_terms_days, due_date, currency, subtotal, discount_total, taxable_amount, is_interstate,
                cgst_total, sgst_total, igst_total, tax_total, rounding_adjustment, grand_total, amount_paid, amount_allocated,
                amount_outstanding, status, posted_by, posted_at, notes, created_by_email
              ) VALUES (
                $1, $2, $3, NOW() - INTERVAL '5 days', 'retailer', $4, $5, $6,
                $7, 15, NOW() + INTERVAL '10 days', 'INR', 45000, 2250, 42750, FALSE,
                3847.50, 3847.50, 0, 7695, 0, 50445, 50445, 50445,
                0, 'paid', 'system', NOW() - INTERVAL '5 days', 'Direct store delivery order', 'finance@jyotsvan.com'
              );
            `, [inv3Id, orgId, inv3Num, r1.id, retailerName, r1.retailer_code, r1.gstin]);

            await client.query(`
              INSERT INTO invoice_items (
                id, organization_id, invoice_id, product_id, sku_id, product_name_snapshot, sku_code_snapshot,
                quantity, uom, unit_price, discount_pct, discount_amount, taxable_amount, tax_rate, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, line_total
              ) VALUES
              ('item_seed_04', $1, $2, $3, $4, $5, $6, 100, 'Unit', 450, 5, 2250, 42750, 18, 9, 3847.50, 9, 3847.50, 0, 0, 50445);
            `, [
              orgId, inv3Id, sku1.product_id, sku1.id, prodMap.get(sku1.product_id) || 'Jyotsvan Premium Product', sku1.sku
            ]);

            // Subledger debit
            await client.query(`
              INSERT INTO finance_transactions (
                id, organization_id, transaction_type, reference_type, reference_id, reference_number,
                customer_type, customer_id, customer_name, debit_amount, credit_amount, running_balance,
                transaction_date, posting_date, description, created_by
              ) VALUES (
                $1, $2, 'INVOICE', 'invoice', $3, $4,
                'retailer', $5, $6, 50445, 0, 50445,
                NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', $7, 'system'
              );
            `, [`tx_seed_04_${orgId}`, orgId, inv3Id, inv3Num, r1.id, retailerName, `Sales Invoice booked: ${inv3Num}`]);

            // Retailer payment
            const pay2Id = 'pay_seed_002_' + orgId;
            const pay2Num = 'PAY/26-27/000102';
            await client.query(`
              INSERT INTO payments (
                id, organization_id, payment_number, customer_type, customer_id, customer_name, customer_code,
                payment_date, amount, payment_method_code, payment_method_name, reference_number,
                allocated_amount, unallocated_amount, status, notes, created_by_email
              ) VALUES (
                $1, $2, $3, 'retailer', $4, $5, $6,
                NOW() - INTERVAL '3 days', 50445, 'UPI', 'UPI / QR Code', 'UPI-994829104812',
                50445, 0, 'cleared', 'Full invoice settlement via UPI', 'store.ops@jyotsvan.com'
              );
            `, [pay2Id, orgId, pay2Num, r1.id, retailerName, r1.retailer_code]);

            await client.query(`
              INSERT INTO payment_allocations (
                id, organization_id, payment_id, invoice_id, allocated_amount, notes, created_by_email
              ) VALUES (
                'alloc_seed_02_' || $1, $1, $2, $3, 50445, 'Direct payment knockoff', 'store.ops@jyotsvan.com'
              );
            `, [orgId, pay2Id, inv3Id]);

            // Subledger credit
            await client.query(`
              INSERT INTO finance_transactions (
                id, organization_id, transaction_type, reference_type, reference_id, reference_number,
                customer_type, customer_id, customer_name, debit_amount, credit_amount, running_balance,
                transaction_date, posting_date, description, created_by
              ) VALUES (
                $1, $2, 'PAYMENT', 'payment', $3, $4,
                'retailer', $5, $6, 0, 50445, 0,
                NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', $7, 'system'
              );
            `, [`tx_seed_05_${orgId}`, orgId, pay2Id, pay2Num, r1.id, retailerName, `UPI Settlement receipt: ${pay2Num}`]);
          }

          // Seed Sample OPEX Expenses
          const catLogistics = catMap.get('LOGISTICS');
          const catRent = catMap.get('RENT');
          const catTravel = catMap.get('TRAVEL');
          const catMarketing = catMap.get('MARKETING');

          if (catLogistics) {
            await client.query(`
              INSERT INTO expenses (
                id, organization_id, expense_number, expense_date, category_id, amount, tax_amount, total_amount,
                payment_method, vendor_payee, description, department, status, submitted_by_email, approved_by_email, approved_at, paid_at
              ) VALUES (
                'exp_seed_01_' || $1, $1, 'EXP/26-27/0001', NOW() - INTERVAL '12 days', $2, 45000, 8100, 53100,
                'Bank Transfer', 'VRL Logistics Ltd', 'Primary depot freight transit invoice #VRL-84912', 'Logistics', 'paid',
                'logistics.mgr@jyotsvan.com', 'finance.head@jyotsvan.com', NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days'
              );
            `, [orgId, catLogistics]);
          }

          if (catRent) {
            await client.query(`
              INSERT INTO expenses (
                id, organization_id, expense_number, expense_date, category_id, amount, tax_amount, total_amount,
                payment_method, vendor_payee, description, department, status, submitted_by_email, approved_by_email, approved_at, paid_at
              ) VALUES (
                'exp_seed_02_' || $1, $1, 'EXP/26-27/0002', NOW() - INTERVAL '18 days', $2, 120000, 0, 120000,
                'Bank Transfer', 'MIDC Industrial Warehousing Corp', 'Monthly central hub warehouse lease rent', 'Operations', 'paid',
                'ops.head@jyotsvan.com', 'finance.head@jyotsvan.com', NOW() - INTERVAL '17 days', NOW() - INTERVAL '16 days'
              );
            `, [orgId, catRent]);
          }

          if (catTravel) {
            await client.query(`
              INSERT INTO expenses (
                id, organization_id, expense_number, expense_date, category_id, amount, tax_amount, total_amount,
                payment_method, vendor_payee, description, department, status, submitted_by_email, approved_by_email, approved_at
              ) VALUES (
                'exp_seed_03_' || $1, $1, 'EXP/26-27/0003', NOW() - INTERVAL '3 days', $2, 18500, 925, 19425,
                'UPI', 'Anil Sharma (Area Sales Manager)', 'Distributor onboarding tour TA/DA across Vidarbha belt', 'Sales', 'approved',
                'anil.sales@jyotsvan.com', 'sales.head@jyotsvan.com', NOW() - INTERVAL '1 day'
              );
            `, [orgId, catTravel]);
          }

          if (catMarketing) {
            await client.query(`
              INSERT INTO expenses (
                id, organization_id, expense_number, expense_date, category_id, amount, tax_amount, total_amount,
                payment_method, vendor_payee, description, department, status, submitted_by_email
              ) VALUES (
                'exp_seed_04_' || $1, $1, 'EXP/26-27/0004', NOW() - INTERVAL '1 day', $2, 35000, 6300, 41300,
                'Bank Transfer', 'Creative Media Printing Works', 'Retail store flex glow-sign boards and counter danglers', 'Marketing', 'submitted',
                'marketing.lead@jyotsvan.com'
              );
            `, [orgId, catMarketing]);
          }
        }
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 19 Migration] ✓ Finance & Collections schema synchronized successfully.');
  } catch (err: any) {
    await client.query('ROLLBACK;');
    console.error('[Phase 19 Migration] ✗ Error running Finance migration:', err);
    throw err;
  } finally {
    client.release();
  }
}
