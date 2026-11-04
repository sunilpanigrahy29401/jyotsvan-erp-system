// src/server/finance-routes.ts
// Express REST Routes for Finance, Invoicing, Payments, Collections, Ageing & Subledger

import { Router } from 'express';
import { FinanceService } from './finance-service.ts';

export const financeRouter = Router();

// Middleware to extract organization ID and user information safely
const getRequestContext = (req: any) => {
  const organizationId =
    req.headers['x-organization-id'] ||
    req.query.organizationId ||
    'org_default_super_admin';
  const userEmail = req.headers['x-user-email'] || req.query.userEmail || 'admin@jyotsvan.com';
  const userId = req.headers['x-user-id'] || req.query.userId || 'usr_super_admin';
  return { organizationId: String(organizationId), userEmail: String(userEmail), userId: String(userId) };
};

// ----------------------------------------------------
// DASHBOARD METRICS
// ----------------------------------------------------
financeRouter.get('/dashboard', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const metrics = await FinanceService.getDashboardMetrics(organizationId);
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    console.error('[Finance API] Dashboard Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch dashboard metrics' });
  }
});

// ----------------------------------------------------
// INVOICES
// ----------------------------------------------------
financeRouter.get('/invoices', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const { status, customerType, customerId, search, salesOrderId, limit, offset } = req.query;

    const result = await FinanceService.getInvoices({
      organizationId,
      status: status ? String(status) : undefined,
      customerType: customerType ? String(customerType) : undefined,
      customerId: customerId ? String(customerId) : undefined,
      salesOrderId: salesOrderId ? String(salesOrderId) : undefined,
      search: search ? String(search) : undefined,
      limit: limit ? parseInt(String(limit), 10) : 50,
      offset: offset ? parseInt(String(offset), 10) : 0,
    });

    res.json({ success: true, data: result.invoices, total: result.total });
  } catch (err: any) {
    console.error('[Finance API] Get Invoices Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch invoices' });
  }
});

financeRouter.get('/invoices/:id', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const invoice = await FinanceService.getInvoiceById(req.params.id, organizationId);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true, data: invoice });
  } catch (err: any) {
    console.error('[Finance API] Get Invoice By ID Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch invoice details' });
  }
});

financeRouter.post('/invoices', async (req, res) => {
  try {
    const { organizationId, userEmail, userId } = getRequestContext(req);
    const invoice = await FinanceService.createInvoice({
      ...req.body,
      organizationId,
      createdBy: userId,
      createdByEmail: userEmail,
    });
    res.status(201).json({ success: true, data: invoice });
  } catch (err: any) {
    console.error('[Finance API] Create Invoice Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to create invoice' });
  }
});

financeRouter.post('/invoices/:id/post', async (req, res) => {
  try {
    const { organizationId, userEmail, userId } = getRequestContext(req);
    const invoice = await FinanceService.postInvoice(req.params.id, organizationId, userId, userEmail);
    res.json({ success: true, data: invoice, message: 'Invoice successfully posted to ledger.' });
  } catch (err: any) {
    console.error('[Finance API] Post Invoice Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to post invoice' });
  }
});

financeRouter.post('/invoices/:id/cancel', async (req, res) => {
  try {
    const { organizationId, userEmail, userId } = getRequestContext(req);
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Cancellation reason is required' });
    }
    const invoice = await FinanceService.cancelInvoice({
      invoiceId: req.params.id,
      organizationId,
      reason,
      cancelledBy: userId,
      cancelledByEmail: userEmail,
    });
    res.json({ success: true, data: invoice, message: 'Invoice successfully cancelled.' });
  } catch (err: any) {
    console.error('[Finance API] Cancel Invoice Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to cancel invoice' });
  }
});

// ----------------------------------------------------
// PAYMENTS & ALLOCATIONS
// ----------------------------------------------------
financeRouter.get('/payments', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const { status, customerType, customerId, search, limit, offset } = req.query;

    const result = await FinanceService.getPayments({
      organizationId,
      status: status ? String(status) : undefined,
      customerType: customerType ? String(customerType) : undefined,
      customerId: customerId ? String(customerId) : undefined,
      search: search ? String(search) : undefined,
      limit: limit ? parseInt(String(limit), 10) : 50,
      offset: offset ? parseInt(String(offset), 10) : 0,
    });

    res.json({ success: true, data: result.payments, total: result.total });
  } catch (err: any) {
    console.error('[Finance API] Get Payments Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch payments' });
  }
});

financeRouter.get('/payments/:id', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const payment = await FinanceService.getPaymentById(req.params.id, organizationId);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    res.json({ success: true, data: payment });
  } catch (err: any) {
    console.error('[Finance API] Get Payment By ID Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch payment details' });
  }
});

financeRouter.post('/payments', async (req, res) => {
  try {
    const { organizationId, userEmail, userId } = getRequestContext(req);
    const payment = await FinanceService.recordPayment({
      ...req.body,
      organizationId,
      createdBy: userId,
      createdByEmail: userEmail,
    });
    res.status(201).json({ success: true, data: payment, message: 'Payment recorded successfully.' });
  } catch (err: any) {
    console.error('[Finance API] Record Payment Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to record payment' });
  }
});

financeRouter.post('/payments/:id/allocate', async (req, res) => {
  try {
    const { organizationId, userEmail, userId } = getRequestContext(req);
    const { allocations } = req.body;
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one invoice allocation is required.' });
    }

    const updatedPayment = await FinanceService.allocatePayment({
      paymentId: req.params.id,
      organizationId,
      allocations,
      allocatedBy: userId,
      allocatedByEmail: userEmail,
    });
    res.json({ success: true, data: updatedPayment, message: 'Allocations applied successfully.' });
  } catch (err: any) {
    console.error('[Finance API] Allocate Payment Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to allocate payment' });
  }
});

// ----------------------------------------------------
// AGEING & SUBLEDGER STATEMENTS
// ----------------------------------------------------
financeRouter.get('/ageing', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const { customerType, search, overdueOnly } = req.query;

    const ageing = await FinanceService.getAgeingSummary({
      organizationId,
      customerType: customerType ? String(customerType) : undefined,
      search: search ? String(search) : undefined,
      overdueOnly: overdueOnly === 'true',
    });

    res.json({ success: true, data: ageing });
  } catch (err: any) {
    console.error('[Finance API] Get Ageing Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch ageing analysis' });
  }
});

financeRouter.get('/ledger', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const { customerId, customerType, fromDate, toDate } = req.query;

    if (!customerId || !customerType) {
      return res.status(400).json({ success: false, error: 'customerId and customerType are required' });
    }

    const statement = await FinanceService.getCustomerLedger({
      organizationId,
      customerId: String(customerId),
      customerType: customerType as any,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
    });

    res.json({ success: true, data: statement });
  } catch (err: any) {
    console.error('[Finance API] Get Ledger Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch customer ledger' });
  }
});

// ----------------------------------------------------
// CREDIT & DEBIT NOTES
// ----------------------------------------------------
financeRouter.get('/credit-notes', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const notes = await FinanceService.getCreditNotes(organizationId);
    res.json({ success: true, data: notes });
  } catch (err: any) {
    console.error('[Finance API] Get Credit Notes Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch credit notes' });
  }
});

financeRouter.post('/credit-notes', async (req, res) => {
  try {
    const { organizationId, userEmail, userId } = getRequestContext(req);
    const note = await FinanceService.createCreditNote({
      ...req.body,
      organizationId,
      createdBy: userId,
      createdByEmail: userEmail,
    });
    res.status(201).json({ success: true, data: note, message: 'Credit Note issued successfully.' });
  } catch (err: any) {
    console.error('[Finance API] Create Credit Note Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to create credit note' });
  }
});

financeRouter.get('/debit-notes', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const notes = await FinanceService.getDebitNotes(organizationId);
    res.json({ success: true, data: notes });
  } catch (err: any) {
    console.error('[Finance API] Get Debit Notes Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch debit notes' });
  }
});

financeRouter.post('/debit-notes', async (req, res) => {
  try {
    const { organizationId, userEmail, userId } = getRequestContext(req);
    const note = await FinanceService.createDebitNote({
      ...req.body,
      organizationId,
      createdBy: userId,
      createdByEmail: userEmail,
    });
    res.status(201).json({ success: true, data: note, message: 'Debit Note issued successfully.' });
  } catch (err: any) {
    console.error('[Finance API] Create Debit Note Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to create debit note' });
  }
});

// ----------------------------------------------------
// EXPENSES
// ----------------------------------------------------
financeRouter.get('/expenses', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const { status, categoryId, search, limit, offset } = req.query;

    const result = await FinanceService.getExpenses({
      organizationId,
      status: status ? String(status) : undefined,
      categoryId: categoryId ? String(categoryId) : undefined,
      search: search ? String(search) : undefined,
      limit: limit ? parseInt(String(limit), 10) : 50,
      offset: offset ? parseInt(String(offset), 10) : 0,
    });

    res.json({ success: true, data: result.expenses, total: result.total });
  } catch (err: any) {
    console.error('[Finance API] Get Expenses Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch expenses' });
  }
});

financeRouter.post('/expenses', async (req, res) => {
  try {
    const { organizationId, userEmail, userId } = getRequestContext(req);
    const expense = await FinanceService.createExpense({
      ...req.body,
      organizationId,
      submittedBy: userId,
      submittedByEmail: userEmail,
    });
    res.status(201).json({ success: true, data: expense, message: 'Expense submitted successfully.' });
  } catch (err: any) {
    console.error('[Finance API] Create Expense Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to create expense' });
  }
});

financeRouter.patch('/expenses/:id/status', async (req, res) => {
  try {
    const { organizationId, userEmail } = getRequestContext(req);
    const { newStatus, reason } = req.body;
    if (!newStatus) {
      return res.status(400).json({ success: false, error: 'newStatus is required' });
    }
    const expense = await FinanceService.updateExpenseStatus({
      expenseId: req.params.id,
      organizationId,
      newStatus,
      reason,
      userEmail,
    });
    res.json({ success: true, data: expense, message: `Expense updated to ${newStatus}.` });
  } catch (err: any) {
    console.error('[Finance API] Update Expense Status Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to update expense status' });
  }
});

// ----------------------------------------------------
// COLLECTIONS
// ----------------------------------------------------
financeRouter.get('/collections', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const { status, priority, search } = req.query;

    const collections = await FinanceService.getCollections({
      organizationId,
      status: status ? String(status) : undefined,
      priority: priority ? String(priority) : undefined,
      search: search ? String(search) : undefined,
    });

    res.json({ success: true, data: collections });
  } catch (err: any) {
    console.error('[Finance API] Get Collections Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch collections' });
  }
});

financeRouter.post('/collections', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const task = await FinanceService.createOrUpdateCollection({
      ...req.body,
      organizationId,
    });
    res.json({ success: true, data: task, message: 'Collection task saved successfully.' });
  } catch (err: any) {
    console.error('[Finance API] Save Collection Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to save collection task' });
  }
});

financeRouter.post('/collections/:id/activity', async (req, res) => {
  try {
    const { organizationId, userEmail } = getRequestContext(req);
    const activity = await FinanceService.logCollectionActivity({
      ...req.body,
      collectionId: req.params.id,
      organizationId,
      loggedByEmail: userEmail,
    });
    res.json({ success: true, data: activity, message: 'Collection activity logged.' });
  } catch (err: any) {
    console.error('[Finance API] Log Activity Error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to log collection activity' });
  }
});

// ----------------------------------------------------
// MASTER DATA & SETTINGS
// ----------------------------------------------------
financeRouter.get('/payment-methods', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const methods = await FinanceService.getPaymentMethods(organizationId);
    res.json({ success: true, data: methods });
  } catch (err: any) {
    console.error('[Finance API] Get Payment Methods Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

financeRouter.get('/expense-categories', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const categories = await FinanceService.getExpenseCategories(organizationId);
    res.json({ success: true, data: categories });
  } catch (err: any) {
    console.error('[Finance API] Get Expense Categories Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

financeRouter.get('/settings', async (req, res) => {
  try {
    const { organizationId } = getRequestContext(req);
    const settings = await FinanceService.getFinancialSettings(organizationId);
    res.json({ success: true, data: settings });
  } catch (err: any) {
    console.error('[Finance API] Get Financial Settings Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
