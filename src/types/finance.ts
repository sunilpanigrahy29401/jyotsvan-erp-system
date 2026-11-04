// src/types/finance.ts
// Enterprise Finance, Collections, Invoicing & Financial Ledger Types (Phase 19)

export type CustomerType = 'distributor' | 'retailer' | 'direct_customer';

export type InvoiceStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'posted'
  | 'partially_paid'
  | 'paid'
  | 'cancelled'
  | 'void'
  | 'overdue';

export type PaymentStatus =
  | 'draft'
  | 'pending_approval'
  | 'cleared'
  | 'bounced'
  | 'cancelled';

export type CreditNoteStatus = 'draft' | 'approved' | 'posted' | 'cancelled';
export type DebitNoteStatus = 'draft' | 'approved' | 'posted' | 'cancelled';

export type ExpenseStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'cancelled';

export type CollectionStatus =
  | 'open'
  | 'follow_up_scheduled'
  | 'promise_to_pay'
  | 'partially_collected'
  | 'collected'
  | 'escalated'
  | 'closed';

export type CollectionPriority = 'low' | 'medium' | 'high' | 'urgent';

export type FinanceTransactionType =
  | 'INVOICE'
  | 'PAYMENT'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'ADJUSTMENT'
  | 'OPENING_BALANCE'
  | 'EXPENSE';

// Master Data: Payment Method
export interface PaymentMethod {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Master Data: Expense Category
export interface ExpenseCategory {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Master Data: Financial Settings
export interface FinancialSettings {
  id: string;
  organization_id: string;
  invoice_prefix: string;
  invoice_seq_start: number;
  fy_format: string;
  credit_note_prefix: string;
  debit_note_prefix: string;
  payment_prefix: string;
  default_payment_terms_days: number;
  default_tax_rate: number;
  currency: string;
  company_name: string;
  company_gstin?: string;
  company_pan?: string;
  company_cin?: string;
  company_address?: any;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  upi_id?: string;
  created_at: string;
  updated_at: string;
}

// Invoice Line Item
export interface InvoiceItem {
  id: string;
  organization_id: string;
  invoice_id: string;
  sales_order_item_id?: string;
  product_id: string;
  sku_id: string;
  product_name_snapshot: string;
  sku_code_snapshot: string;
  variant_name_snapshot?: string;
  hsn_code?: string;
  quantity: number;
  uom: string;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  taxable_amount: number;
  tax_rate: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  line_total: number;
  created_at: string;
}

// Invoice Tax Breakdown
export interface InvoiceTax {
  id: string;
  organization_id: string;
  invoice_id: string;
  tax_rate: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
}

// Invoice Status History
export interface InvoiceStatusHistory {
  id: string;
  invoice_id: string;
  old_status?: InvoiceStatus;
  new_status: InvoiceStatus;
  reason?: string;
  notes?: string;
  changed_by?: string;
  changed_by_email?: string;
  created_at: string;
}

// Invoice Entity
export interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_type: CustomerType;
  customer_id?: string;
  customer_name: string;
  customer_code?: string;
  customer_gstin?: string;
  customer_pan?: string;
  billing_address?: any;
  shipping_address?: any;
  sales_order_id?: string;
  sales_order_number?: string;
  dispatch_id?: string;
  dispatch_number?: string;
  transporter_name?: string;
  vehicle_number?: string;
  lr_number?: string;
  e_way_bill_number?: string;
  payment_terms_days: number;
  due_date: string;
  currency: string;
  subtotal: number;
  discount_total: number;
  taxable_amount: number;
  is_interstate: boolean;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  tax_total: number;
  rounding_adjustment: number;
  grand_total: number;
  amount_paid: number;
  amount_allocated: number;
  amount_outstanding: number;
  status: InvoiceStatus;
  notes?: string;
  created_by?: string;
  created_by_email?: string;
  approved_by?: string;
  approved_at?: string;
  posted_by?: string;
  posted_at?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  taxes?: InvoiceTax[];
  history?: InvoiceStatusHistory[];
  allocations?: PaymentAllocation[];
}

// Payment Allocation
export interface PaymentAllocation {
  id: string;
  organization_id: string;
  payment_id: string;
  payment_number?: string;
  payment_date?: string;
  payment_method_name?: string;
  invoice_id: string;
  invoice_number?: string;
  invoice_date?: string;
  invoice_grand_total?: number;
  allocated_amount: number;
  notes?: string;
  created_by?: string;
  created_by_email?: string;
  created_at: string;
}

// Payment Status History
export interface PaymentStatusHistory {
  id: string;
  payment_id: string;
  old_status?: PaymentStatus;
  new_status: PaymentStatus;
  reason?: string;
  changed_by?: string;
  changed_by_email?: string;
  created_at: string;
}

// Payment Entity
export interface Payment {
  id: string;
  organization_id: string;
  payment_number: string;
  customer_type: CustomerType;
  customer_id?: string;
  customer_name: string;
  customer_code?: string;
  payment_date: string;
  amount: number;
  payment_method_id?: string;
  payment_method_code: string;
  payment_method_name: string;
  reference_number?: string;
  bank_name?: string;
  bank_account_last4?: string;
  cheque_number?: string;
  cheque_date?: string;
  allocated_amount: number;
  unallocated_amount: number;
  status: PaymentStatus;
  notes?: string;
  received_by?: string;
  created_by?: string;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
  allocations?: PaymentAllocation[];
  history?: PaymentStatusHistory[];
}

// Credit Note Item
export interface CreditNoteItem {
  id: string;
  organization_id: string;
  credit_note_id: string;
  sku_id?: string;
  sku_code_snapshot?: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  taxable_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
}

// Credit Note Entity
export interface CreditNote {
  id: string;
  organization_id: string;
  credit_note_number: string;
  customer_type: CustomerType;
  customer_id?: string;
  customer_name: string;
  invoice_id?: string;
  invoice_number?: string;
  sales_return_id?: string;
  return_number?: string;
  credit_date: string;
  reason: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  status: CreditNoteStatus;
  notes?: string;
  created_by?: string;
  created_by_email?: string;
  approved_by?: string;
  approved_at?: string;
  posted_by?: string;
  posted_at?: string;
  created_at: string;
  updated_at: string;
  items?: CreditNoteItem[];
}

// Debit Note Item
export interface DebitNoteItem {
  id: string;
  organization_id: string;
  debit_note_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  taxable_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
}

// Debit Note Entity
export interface DebitNote {
  id: string;
  organization_id: string;
  debit_note_number: string;
  customer_type: CustomerType;
  customer_id?: string;
  customer_name: string;
  invoice_id?: string;
  invoice_number?: string;
  debit_date: string;
  reason: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  status: DebitNoteStatus;
  notes?: string;
  created_by?: string;
  created_by_email?: string;
  approved_by?: string;
  approved_at?: string;
  posted_by?: string;
  posted_at?: string;
  created_at: string;
  updated_at: string;
  items?: DebitNoteItem[];
}

// Expense Entity
export interface Expense {
  id: string;
  organization_id: string;
  expense_number: string;
  expense_date: string;
  category_id: string;
  category_name: string;
  category_code?: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method?: string;
  vendor_payee: string;
  description: string;
  department?: string;
  branch_id?: string;
  receipt_url?: string;
  receipt_filename?: string;
  status: ExpenseStatus;
  submitted_by?: string;
  submitted_by_email?: string;
  approved_by?: string;
  approved_by_email?: string;
  approved_at?: string;
  rejection_reason?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Financial Ledger Entry
export interface FinanceTransaction {
  id: string;
  organization_id: string;
  transaction_type: FinanceTransactionType;
  reference_type: string;
  reference_id: string;
  reference_number?: string;
  customer_type?: CustomerType;
  customer_id?: string;
  customer_name?: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  transaction_date: string;
  posting_date: string;
  description: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

// Customer Statement / Ledger Summary
export interface CustomerLedgerStatement {
  customer_id: string;
  customer_name: string;
  customer_type: CustomerType;
  customer_code?: string;
  gstin?: string;
  currency: string;
  opening_balance: number;
  total_debits: number;
  total_credits: number;
  closing_balance: number;
  credit_limit: number;
  available_credit: number;
  transactions: FinanceTransaction[];
}

// Outstanding & Ageing Summary Item
export interface CustomerAgeingSummary {
  customer_id: string;
  customer_name: string;
  customer_type: CustomerType;
  customer_code?: string;
  contact_person?: string;
  phone?: string;
  region?: string;
  state?: string;
  credit_limit: number;
  credit_period_days: number;
  credit_hold: boolean;
  total_outstanding: number;
  current_amount: number; // not overdue
  overdue_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_91_120: number;
  days_120_plus: number;
  open_invoices_count: number;
  oldest_invoice_date?: string;
  oldest_due_date?: string;
  max_overdue_days: number;
  last_payment_date?: string;
  last_payment_amount?: number;
  available_credit: number;
}

// Collection Follow-up Task
export interface CollectionTask {
  id: string;
  organization_id: string;
  customer_type: CustomerType;
  customer_id: string;
  customer_name: string;
  customer_code?: string;
  total_outstanding: number;
  target_collection_amount: number;
  due_date?: string;
  priority: CollectionPriority;
  follow_up_date: string;
  assigned_to?: string;
  assigned_to_email?: string;
  assigned_to_name?: string;
  notes?: string;
  status: CollectionStatus;
  promised_payment_date?: string;
  promised_payment_amount?: number;
  last_contact_date?: string;
  last_contact_notes?: string;
  next_action?: string;
  created_at: string;
  updated_at: string;
  activity_logs?: CollectionActivityLog[];
}

export interface CollectionActivityLog {
  id: string;
  collection_id: string;
  action: string;
  notes?: string;
  contact_person?: string;
  contact_method?: string;
  outcome?: string;
  promised_date?: string;
  promised_amount?: number;
  logged_by?: string;
  logged_by_email?: string;
  created_at: string;
}

// Finance Dashboard KPI Summary
export interface FinanceDashboardMetrics {
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  total_overdue: number;
  total_expenses: number;
  net_receivable: number;
  overdue_customers_count: number;
  unallocated_advances_amount: number;
  pending_invoice_approvals: number;
  pending_expense_approvals: number;
  open_collections_count: number;
  ageing_breakdown: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_91_120: number;
    days_120_plus: number;
  };
  monthly_trends: {
    month: string;
    invoiced: number;
    collected: number;
    expenses: number;
  }[];
  top_debtors: {
    customer_id: string;
    customer_name: string;
    customer_type: CustomerType;
    outstanding: number;
    overdue: number;
    credit_limit: number;
  }[];
  expenses_by_category: {
    category_name: string;
    amount: number;
    percentage: number;
  }[];
}

// Reconciliation Report
export interface FinancialReconciliationReport {
  reconciliation_date: string;
  status: 'balanced' | 'discrepancy_detected';
  total_invoices_value: number;
  total_receivables_debit: number;
  total_payments_received: number;
  total_payments_allocated: number;
  total_unallocated_advances: number;
  total_credit_notes: number;
  total_debit_notes: number;
  calculated_outstanding: number;
  ledger_closing_balance_sum: number;
  discrepancies: {
    type: string;
    description: string;
    affected_entity: string;
    variance: number;
  }[];
}
