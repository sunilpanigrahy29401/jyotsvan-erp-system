import { Router, Request, Response } from 'express';
import { ProcurementService } from './procurement-service.ts';
import { pool } from './db.ts';

export const procurementRouter = Router();

// Helper to resolve orgId and actor from headers or defaults
function getRequestContext(req: Request) {
  const orgId = (req.headers['x-organization-id'] as string) || (req.query.orgId as string) || 'org-jyotsvan-corp';
  const actorId = (req.headers['x-user-id'] as string) || null;
  const actorEmail = (req.headers['x-user-email'] as string) || 'sunilpanigrahy29401@gmail.com';
  return { orgId, actorId, actorEmail };
}

// ==========================================
// 1. DASHBOARD & KPI SUMMARY
// ==========================================
procurementRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const { orgId } = getRequestContext(req);
    const summary = await ProcurementService.getProcurementSummary(orgId);
    res.json({ success: true, summary });
  } catch (err: any) {
    console.error('[Procurement API Error] getSummary:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch procurement summary' });
  }
});

// ==========================================
// 2. PURCHASE REQUESTS (PR)
// ==========================================
procurementRouter.get('/requests', async (req: Request, res: Response) => {
  try {
    const { orgId } = getRequestContext(req);
    const { search, status, priority, departmentId, requestedBy, fromDate, toDate, page, limit } = req.query;

    const result = await ProcurementService.getPurchaseRequests({
      orgId,
      search: search as string,
      status: status as string,
      priority: priority as string,
      departmentId: departmentId as string,
      requestedBy: requestedBy as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Procurement API Error] getRequests:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch purchase requests' });
  }
});

procurementRouter.get('/requests/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getRequestContext(req);
    const pr = await ProcurementService.getPurchaseRequestById(req.params.id, orgId);
    if (!pr) {
      return res.status(404).json({ success: false, error: 'Purchase Request not found' });
    }
    res.json({ success: true, request: pr });
  } catch (err: any) {
    console.error('[Procurement API Error] getRequestById:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch purchase request' });
  }
});

procurementRouter.post('/requests', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const { departmentId, requiredByDate, priority, purpose, notes, items } = req.body;

    if (!requiredByDate) {
      return res.status(400).json({ success: false, error: 'Required By Date is required.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one line item is required.' });
    }

    const created = await ProcurementService.createPurchaseRequest({
      orgId,
      departmentId,
      requiredByDate,
      priority,
      purpose,
      notes,
      items,
      actorId,
      actorEmail,
    });

    res.status(201).json({ success: true, request: created, message: `Purchase Request ${created.request_number} created successfully.` });
  } catch (err: any) {
    console.error('[Procurement API Error] createRequest:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to create purchase request' });
  }
});

procurementRouter.post('/requests/:id/submit', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const updated = await ProcurementService.submitPurchaseRequest(req.params.id, orgId, actorId, actorEmail);
    res.json({ success: true, request: updated, message: `Purchase Request ${updated.request_number} submitted for review.` });
  } catch (err: any) {
    console.error('[Procurement API Error] submitRequest:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to submit purchase request' });
  }
});

procurementRouter.post('/requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const { notes } = req.body;
    const updated = await ProcurementService.approvePurchaseRequest(req.params.id, orgId, actorId, actorEmail, notes);
    res.json({ success: true, request: updated, message: `Purchase Request ${updated.request_number} approved successfully.` });
  } catch (err: any) {
    console.error('[Procurement API Error] approveRequest:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to approve purchase request' });
  }
});

procurementRouter.post('/requests/:id/reject', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required.' });
    }
    const updated = await ProcurementService.rejectPurchaseRequest(req.params.id, orgId, reason, actorId, actorEmail);
    res.json({ success: true, request: updated, message: `Purchase Request ${updated.request_number} returned with notes.` });
  } catch (err: any) {
    console.error('[Procurement API Error] rejectRequest:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to reject purchase request' });
  }
});

procurementRouter.post('/requests/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const { reason } = req.body;
    const updated = await ProcurementService.cancelPurchaseRequest(req.params.id, orgId, reason || 'Cancelled by user', actorId, actorEmail);
    res.json({ success: true, request: updated, message: `Purchase Request ${updated.request_number} cancelled.` });
  } catch (err: any) {
    console.error('[Procurement API Error] cancelRequest:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to cancel purchase request' });
  }
});

// ==========================================
// 3. PURCHASE ORDERS (PO)
// ==========================================
procurementRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const { orgId } = getRequestContext(req);
    const { search, status, supplierId, warehouseId, fromDate, toDate, page, limit } = req.query;

    const result = await ProcurementService.getPurchaseOrders({
      orgId,
      search: search as string,
      status: status as string,
      supplierId: supplierId as string,
      warehouseId: warehouseId as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Procurement API Error] getOrders:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch purchase orders' });
  }
});

procurementRouter.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getRequestContext(req);
    const po = await ProcurementService.getPurchaseOrderById(req.params.id, orgId);
    if (!po) {
      return res.status(404).json({ success: false, error: 'Purchase Order not found' });
    }
    res.json({ success: true, order: po });
  } catch (err: any) {
    console.error('[Procurement API Error] getOrderById:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch purchase order' });
  }
});

procurementRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const {
      supplierId,
      purchaseRequestId,
      orderDate,
      expectedDeliveryDate,
      currency,
      paymentTerms,
      shippingAddress,
      warehouseId,
      shippingAmount,
      notes,
      termsAndConditions,
      items,
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({ success: false, error: 'Supplier ID is required.' });
    }
    if (!warehouseId) {
      return res.status(400).json({ success: false, error: 'Destination Warehouse ID is required.' });
    }
    if (!expectedDeliveryDate) {
      return res.status(400).json({ success: false, error: 'Expected Delivery Date is required.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one line item is required.' });
    }

    const created = await ProcurementService.createPurchaseOrder({
      orgId,
      supplierId,
      purchaseRequestId,
      orderDate,
      expectedDeliveryDate,
      currency,
      paymentTerms,
      shippingAddress,
      warehouseId,
      shippingAmount: shippingAmount ? parseFloat(shippingAmount) : 0,
      notes,
      termsAndConditions,
      items,
      actorId,
      actorEmail,
    });

    res.status(201).json({ success: true, order: created, message: `Purchase Order ${created.po_number} created successfully.` });
  } catch (err: any) {
    console.error('[Procurement API Error] createOrder:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to create purchase order' });
  }
});

procurementRouter.post('/orders/:id/submit', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const updated = await ProcurementService.submitPurchaseOrderForApproval(req.params.id, orgId, actorId, actorEmail);
    res.json({ success: true, order: updated, message: `Purchase Order ${updated.po_number} submitted for approval.` });
  } catch (err: any) {
    console.error('[Procurement API Error] submitOrder:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to submit purchase order' });
  }
});

procurementRouter.post('/orders/:id/approve', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const updated = await ProcurementService.approvePurchaseOrder(req.params.id, orgId, actorId, actorEmail);
    res.json({ success: true, order: updated, message: `Purchase Order ${updated.po_number} approved.` });
  } catch (err: any) {
    console.error('[Procurement API Error] approveOrder:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to approve purchase order' });
  }
});

procurementRouter.post('/orders/:id/send', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const updated = await ProcurementService.sendPurchaseOrder(req.params.id, orgId, actorId, actorEmail);
    res.json({ success: true, order: updated, message: `Purchase Order ${updated.po_number} marked as dispatched to supplier.` });
  } catch (err: any) {
    console.error('[Procurement API Error] sendOrder:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to dispatch purchase order' });
  }
});

procurementRouter.post('/orders/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const updated = await ProcurementService.acknowledgePurchaseOrder(req.params.id, orgId, actorId, actorEmail);
    res.json({ success: true, order: updated, message: `Purchase Order ${updated.po_number} supplier acknowledgement recorded.` });
  } catch (err: any) {
    console.error('[Procurement API Error] acknowledgeOrder:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to record acknowledgement' });
  }
});

procurementRouter.post('/orders/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const { reason } = req.body;
    const updated = await ProcurementService.cancelPurchaseOrder(req.params.id, orgId, reason || 'Cancelled by user', actorId, actorEmail);
    res.json({ success: true, order: updated, message: `Purchase Order ${updated.po_number} cancelled.` });
  } catch (err: any) {
    console.error('[Procurement API Error] cancelOrder:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to cancel purchase order' });
  }
});

procurementRouter.post('/orders/:id/close', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const { reason } = req.body;
    const updated = await ProcurementService.closePurchaseOrder(req.params.id, orgId, reason || 'Completed', actorId, actorEmail);
    res.json({ success: true, order: updated, message: `Purchase Order ${updated.po_number} formally closed.` });
  } catch (err: any) {
    console.error('[Procurement API Error] closeOrder:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to close purchase order' });
  }
});

// ==========================================
// 4. GOODS RECEIPT NOTES (GRN)
// ==========================================
procurementRouter.get('/receipts', async (req: Request, res: Response) => {
  try {
    const { orgId } = getRequestContext(req);
    const { search, status, qcStatus, supplierId, warehouseId, purchaseOrderId, page, limit } = req.query;

    const result = await ProcurementService.getGoodsReceipts({
      orgId,
      search: search as string,
      status: status as string,
      qcStatus: qcStatus as string,
      supplierId: supplierId as string,
      warehouseId: warehouseId as string,
      purchaseOrderId: purchaseOrderId as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Procurement API Error] getReceipts:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch goods receipts' });
  }
});

procurementRouter.get('/receipts/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getRequestContext(req);
    const grn = await ProcurementService.getGoodsReceiptById(req.params.id, orgId);
    if (!grn) {
      return res.status(404).json({ success: false, error: 'Goods Receipt not found' });
    }
    res.json({ success: true, receipt: grn });
  } catch (err: any) {
    console.error('[Procurement API Error] getReceiptById:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch goods receipt' });
  }
});

procurementRouter.post('/receipts', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getRequestContext(req);
    const {
      purchaseOrderId,
      warehouseId,
      receivingLocationId,
      receivedDate,
      supplierReference,
      deliveryChallanNumber,
      vehicleNumber,
      driverName,
      driverPhone,
      notes,
      items,
    } = req.body;

    if (!purchaseOrderId) {
      return res.status(400).json({ success: false, error: 'Purchase Order ID is required for Goods Receipt.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one received item line is required.' });
    }

    const created = await ProcurementService.createGoodsReceipt({
      orgId,
      purchaseOrderId,
      warehouseId,
      receivingLocationId,
      receivedDate,
      supplierReference,
      deliveryChallanNumber,
      vehicleNumber,
      driverName,
      driverPhone,
      notes,
      items,
      actorId,
      actorEmail,
    });

    res.status(201).json({
      success: true,
      receipt: created,
      message: `Goods Receipt ${created.grn_number} created and inward stock balances updated successfully.`,
    });
  } catch (err: any) {
    console.error('[Procurement API Error] createReceipt:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to create goods receipt' });
  }
});

// ==========================================
// 5. OPERATIONAL REPORTS
// ==========================================
procurementRouter.get('/reports/orders', async (req: Request, res: Response) => {
  try {
    const { orgId } = getRequestContext(req);
    const rows = await ProcurementService.getPurchaseOrderReport(orgId);
    res.json({ success: true, report: rows });
  } catch (err: any) {
    console.error('[Procurement API Error] getOrderReport:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate order report' });
  }
});

procurementRouter.get('/reports/suppliers', async (req: Request, res: Response) => {
  try {
    const { orgId } = getRequestContext(req);
    const rows = await ProcurementService.getSupplierProcurementSummary(orgId);
    res.json({ success: true, report: rows });
  } catch (err: any) {
    console.error('[Procurement API Error] getSupplierReport:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate supplier summary report' });
  }
});

procurementRouter.get('/reports/receiving', async (req: Request, res: Response) => {
  try {
    const { orgId } = getRequestContext(req);
    const rows = await ProcurementService.getReceivingReport(orgId);
    res.json({ success: true, report: rows });
  } catch (err: any) {
    console.error('[Procurement API Error] getReceivingReport:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate receiving report' });
  }
});
