// src/services/financeApi.ts
// Enterprise Finance, Invoicing, Payments, Collections & Subledger API Client (Phase 19)

import type {
  Invoice,
  Payment,
  CreditNote,
  DebitNote,
  Expense,
  CustomerLedgerStatement,
  CustomerAgeingSummary,
  CollectionTask,
  CollectionActivityLog,
  FinanceDashboardMetrics,
  PaymentMethod,
  ExpenseCategory,
  FinancialSettings,
  CustomerType,
  ExpenseStatus,
} from '../types/finance.ts';

class FinanceApiService {
  private async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-organization-id': 'org-jyotsvan-corp',
      'x-user-id': 'usr-super-admin',
      'x-user-email': 'admin@jyotsvan.enterprise',
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, { ...options, headers });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error || `HTTP error ${res.status}`);
    }
    return json.data !== undefined ? json.data : json;
  }

  // 1. Dashboard Metrics
  public async getDashboardMetrics(): Promise<FinanceDashboardMetrics> {
    return this.fetchJson<FinanceDashboardMetrics>('/api/finance/dashboard');
  }

  // 2. Invoices
  public async getInvoices(params: {
    status?: string;
    customerType?: string;
    customerId?: string;
    salesOrderId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Invoice[]> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.customerType) searchParams.set('customerType', params.customerType);
    if (params.customerId) searchParams.set('customerId', params.customerId);
    if (params.salesOrderId) searchParams.set('salesOrderId', params.salesOrderId);
    if (params.search) searchParams.set('search', params.search);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));

    const qs = searchParams.toString();
    return this.fetchJson<Invoice[]>(`/api/finance/invoices${qs ? '?' + qs : ''}`);
  }

  public async getInvoiceById(id: string): Promise<Invoice> {
    return this.fetchJson<Invoice>(`/api/finance/invoices/${id}`);
  }

  public async createInvoice(payload: {
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
    autoPost?: boolean;
  }): Promise<Invoice> {
    return this.fetchJson<Invoice>('/api/finance/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async postInvoice(id: string): Promise<Invoice> {
    return this.fetchJson<Invoice>(`/api/finance/invoices/${id}/post`, {
      method: 'POST',
    });
  }

  public async cancelInvoice(id: string, reason: string): Promise<Invoice> {
    return this.fetchJson<Invoice>(`/api/finance/invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // 3. Payments
  public async getPayments(params: {
    status?: string;
    customerType?: string;
    customerId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Payment[]> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.customerType) searchParams.set('customerType', params.customerType);
    if (params.customerId) searchParams.set('customerId', params.customerId);
    if (params.search) searchParams.set('search', params.search);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));

    const qs = searchParams.toString();
    return this.fetchJson<Payment[]>(`/api/finance/payments${qs ? '?' + qs : ''}`);
  }

  public async getPaymentById(id: string): Promise<Payment> {
    return this.fetchJson<Payment>(`/api/finance/payments/${id}`);
  }

  public async recordPayment(payload: {
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
    allocations?: Array<{ invoiceId: string; amount: number; notes?: string }>;
  }): Promise<Payment> {
    return this.fetchJson<Payment>('/api/finance/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async allocatePayment(
    paymentId: string,
    allocations: Array<{ invoiceId: string; amount: number; notes?: string }>
  ): Promise<Payment> {
    return this.fetchJson<Payment>(`/api/finance/payments/${paymentId}/allocate`, {
      method: 'POST',
      body: JSON.stringify({ allocations }),
    });
  }

  // 4. Ageing & Customer Ledger Statements
  public async getAgeingSummary(params: {
    customerType?: string;
    search?: string;
    overdueOnly?: boolean;
  } = {}): Promise<CustomerAgeingSummary[]> {
    const searchParams = new URLSearchParams();
    if (params.customerType) searchParams.set('customerType', params.customerType);
    if (params.search) searchParams.set('search', params.search);
    if (params.overdueOnly) searchParams.set('overdueOnly', 'true');

    const qs = searchParams.toString();
    return this.fetchJson<CustomerAgeingSummary[]>(`/api/finance/ageing${qs ? '?' + qs : ''}`);
  }

  public async getCustomerLedger(params: {
    customerId: string;
    customerType: CustomerType;
    fromDate?: string;
    toDate?: string;
  }): Promise<CustomerLedgerStatement> {
    const searchParams = new URLSearchParams();
    searchParams.set('customerId', params.customerId);
    searchParams.set('customerType', params.customerType);
    if (params.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params.toDate) searchParams.set('toDate', params.toDate);

    return this.fetchJson<CustomerLedgerStatement>(`/api/finance/ledger?${searchParams.toString()}`);
  }

  // 5. Credit & Debit Notes
  public async getCreditNotes(): Promise<CreditNote[]> {
    return this.fetchJson<CreditNote[]>('/api/finance/credit-notes');
  }

  public async createCreditNote(payload: {
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
  }): Promise<CreditNote> {
    return this.fetchJson<CreditNote>('/api/finance/credit-notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getDebitNotes(): Promise<DebitNote[]> {
    return this.fetchJson<DebitNote[]>('/api/finance/debit-notes');
  }

  public async createDebitNote(payload: {
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
  }): Promise<DebitNote> {
    return this.fetchJson<DebitNote>('/api/finance/debit-notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 6. Expenses
  public async getExpenses(params: {
    status?: string;
    categoryId?: string;
    search?: string;
  } = {}): Promise<Expense[]> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params.search) searchParams.set('search', params.search);

    const qs = searchParams.toString();
    return this.fetchJson<Expense[]>(`/api/finance/expenses${qs ? '?' + qs : ''}`);
  }

  public async createExpense(payload: {
    expenseDate?: string;
    categoryId: string;
    amount: number;
    taxAmount?: number;
    paymentMethod?: string;
    vendorPayee: string;
    description: string;
    department?: string;
    branchId?: string;
    notes?: string;
  }): Promise<Expense> {
    return this.fetchJson<Expense>('/api/finance/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateExpenseStatus(id: string, newStatus: ExpenseStatus, reason?: string): Promise<Expense> {
    return this.fetchJson<Expense>(`/api/finance/expenses/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ newStatus, reason }),
    });
  }

  // 7. Collections
  public async getCollections(params: {
    status?: string;
    priority?: string;
    search?: string;
  } = {}): Promise<CollectionTask[]> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.priority) searchParams.set('priority', params.priority);
    if (params.search) searchParams.set('search', params.search);

    const qs = searchParams.toString();
    return this.fetchJson<CollectionTask[]>(`/api/finance/collections${qs ? '?' + qs : ''}`);
  }

  public async saveCollection(payload: {
    id?: string;
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
    return this.fetchJson<CollectionTask>('/api/finance/collections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async logCollectionActivity(
    collectionId: string,
    payload: {
      action: string;
      notes?: string;
      contactPerson?: string;
      contactMethod?: string;
      outcome?: string;
      promisedDate?: string;
      promisedAmount?: number;
    }
  ): Promise<CollectionActivityLog> {
    return this.fetchJson<CollectionActivityLog>(`/api/finance/collections/${collectionId}/activity`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 8. Masters & Settings
  public async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.fetchJson<PaymentMethod[]>('/api/finance/payment-methods');
  }

  public async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return this.fetchJson<ExpenseCategory[]>('/api/finance/expense-categories');
  }

  public async getFinancialSettings(): Promise<FinancialSettings> {
    return this.fetchJson<FinancialSettings>('/api/finance/settings');
  }
}

export const financeApi = new FinanceApiService();
