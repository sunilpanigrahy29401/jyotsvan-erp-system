// src/server/sales-order-routes.ts
// Enterprise Sales Order & Commerce API Routes (Phase 18)

import { Router, Request, Response } from 'express';
import { SalesOrderService } from './sales-order-service.ts';
import { PricingService } from './pricing-service.ts';
import { CreditService } from './credit-service.ts';
import { FulfillmentService } from './fulfillment-service.ts';
import { SalesReturnService } from './sales-return-service.ts';
import { InvoicePreparationService } from './invoice-preparation-service.ts';

export const salesOrderRouter = Router();

// Helper to extract session organization context
function getOrgContext(req: Request) {
  const orgId = (req.headers['x-organization-id'] as string) || (req.query.organizationId as string) || 'default-org';
  const actorId = (req.headers['x-user-id'] as string) || null;
  const actorEmail = (req.headers['x-user-email'] as string) || 'operator@jyotsvan.enterprise';
  return { orgId, actorId, actorEmail };
}

// 1. KPI Statistics & Aggregations
salesOrderRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgContext(req);
    const stats = await SalesOrderService.getOrderStats(orgId);
    res.json(stats);
  } catch (err: any) {
    console.error('[SO Stats Error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch sales order statistics' });
  }
});

// 2. Real-time Order Pricing Calculation Preview
salesOrderRouter.post('/calculate-pricing', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgContext(req);
    const { customerType, customerId, warehouseId, items, orderDiscountPct, orderDiscountAmount } = req.body;

    if (!warehouseId || !items || items.length === 0) {
      return res.status(400).json({ error: 'warehouseId and items array are required for pricing resolution.' });
    }

    const pricing = await PricingService.calculateOrderPricing({
      organizationId: orgId,
      customerType: customerType || 'direct_customer',
      customerId,
      warehouseId,
      items,
      orderDiscountPct: parseFloat(orderDiscountPct || '0'),
      orderDiscountAmount: parseFloat(orderDiscountAmount || '0'),
    });

    res.json(pricing);
  } catch (err: any) {
    console.error('[Pricing Resolution Error]', err);
    res.status(500).json({ error: err.message || 'Failed to resolve pricing and taxes' });
  }
});

// 3. Customer Credit Exposure Check Preview
salesOrderRouter.post('/evaluate-credit', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgContext(req);
    const { customerType, customerId, orderAmount, currentOrderId } = req.body;

    const credit = await CreditService.evaluateCredit({
      organizationId: orgId,
      customerType: customerType || 'direct_customer',
      customerId,
      orderAmount: parseFloat(orderAmount || '0'),
      currentOrderId,
    });

    res.json(credit);
  } catch (err: any) {
    console.error('[Credit Check Error]', err);
    res.status(500).json({ error: err.message || 'Failed to evaluate customer credit limit' });
  }
});

// 4. List Sales Orders (Search, Filter, Paginate, Sort)
salesOrderRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgContext(req);
    const {
      search,
      orderStatus,
      customerType,
      distributorId,
      retailerId,
      warehouseId,
      fulfillmentStatus,
      paymentStatus,
      creditStatus,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await SalesOrderService.listOrders(orgId, {
      search: search as string,
      orderStatus: orderStatus as string,
      customerType: customerType as string,
      distributorId: distributorId as string,
      retailerId: retailerId as string,
      warehouseId: warehouseId as string,
      fulfillmentStatus: fulfillmentStatus as string,
      paymentStatus: paymentStatus as string,
      creditStatus: creditStatus as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
      sortBy: sortBy as string,
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    });

    res.json(result);
  } catch (err: any) {
    console.error('[List Orders Error]', err);
    res.status(500).json({ error: err.message || 'Failed to list sales orders' });
  }
});

// 5. Get Single Sales Order with relations
salesOrderRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgContext(req);
    const order = await SalesOrderService.getOrderById(req.params.id, orgId);
    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }
    res.json(order);
  } catch (err: any) {
    console.error('[Get Order Error]', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve sales order' });
  }
});

// 6. Create Sales Order
salesOrderRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const order = await SalesOrderService.createOrder({
      ...req.body,
      organizationId: orgId,
      actorId,
      actorEmail,
    });
    res.status(201).json(order);
  } catch (err: any) {
    console.error('[Create Order Error]', err);
    res.status(400).json({ error: err.message || 'Failed to create sales order' });
  }
});

// 7. Update Sales Order (Draft / Amendment)
salesOrderRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const order = await SalesOrderService.updateOrder({
      ...req.body,
      orderId: req.params.id,
      organizationId: orgId,
      actorId,
      actorEmail,
    });
    res.json(order);
  } catch (err: any) {
    console.error('[Update Order Error]', err);
    res.status(400).json({ error: err.message || 'Failed to update sales order' });
  }
});

// 8. Submit Order
salesOrderRouter.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const order = await SalesOrderService.submitOrder(req.params.id, orgId, actorId, actorEmail);
    res.json(order);
  } catch (err: any) {
    console.error('[Submit Order Error]', err);
    res.status(400).json({ error: err.message || 'Failed to submit sales order' });
  }
});

// 9. Approve Order (Credit override or warehouse clearance)
salesOrderRouter.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const { overrideReason } = req.body;
    const order = await SalesOrderService.approveOrder(req.params.id, orgId, actorId, actorEmail, overrideReason);
    res.json(order);
  } catch (err: any) {
    console.error('[Approve Order Error]', err);
    res.status(400).json({ error: err.message || 'Failed to approve sales order' });
  }
});

// 10. Reject Order
salesOrderRouter.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const { reason } = req.body;
    const order = await SalesOrderService.rejectOrder(req.params.id, orgId, actorId, actorEmail, reason);
    res.json(order);
  } catch (err: any) {
    console.error('[Reject Order Error]', err);
    res.status(400).json({ error: err.message || 'Failed to reject sales order' });
  }
});

// 11. Cancel Order
salesOrderRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const { reason } = req.body;
    const order = await SalesOrderService.cancelOrder(req.params.id, orgId, actorId, actorEmail, reason);
    res.json(order);
  } catch (err: any) {
    console.error('[Cancel Order Error]', err);
    res.status(400).json({ error: err.message || 'Failed to cancel sales order' });
  }
});

// 12. Live Inventory Availability & Batch Candidate Check
salesOrderRouter.get('/:id/inventory-availability', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgContext(req);
    const avail = await FulfillmentService.checkInventoryAvailability(req.params.id, orgId);
    res.json(avail);
  } catch (err: any) {
    console.error('[Check Availability Error]', err);
    res.status(400).json({ error: err.message || 'Failed to check inventory availability' });
  }
});

// 13. Reserve Stock for Order
salesOrderRouter.post('/:id/reserve', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const { allocations, notes } = req.body;
    const result = await FulfillmentService.reserveOrderInventory({
      orderId: req.params.id,
      organizationId: orgId,
      allocations,
      notes,
      actorId,
      actorEmail,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[Reserve Stock Error]', err);
    res.status(400).json({ error: err.message || 'Failed to reserve inventory' });
  }
});

// 14. Release Stock Reservations for Order
salesOrderRouter.post('/:id/release-reservation', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const { reason } = req.body;
    const result = await FulfillmentService.releaseOrderReservations(
      req.params.id,
      orgId,
      actorId,
      actorEmail,
      reason
    );
    res.json(result);
  } catch (err: any) {
    console.error('[Release Reservation Error]', err);
    res.status(400).json({ error: err.message || 'Failed to release reservations' });
  }
});

// 15. Record Pick List Execution
salesOrderRouter.post('/:id/pick', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const { items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items to pick are required' });
    }
    const result = await FulfillmentService.recordPicking({
      orderId: req.params.id,
      organizationId: orgId,
      items,
      actorId,
      actorEmail,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[Picking Error]', err);
    res.status(400).json({ error: err.message || 'Failed to record pick items' });
  }
});

// 16. Execute Physical Dispatch
salesOrderRouter.post('/:id/dispatch', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const { transporterName, trackingNumber, vehicleNumber, eWayBillNumber, items, notes } = req.body;
    const result = await FulfillmentService.executeDispatch({
      orderId: req.params.id,
      organizationId: orgId,
      transporterName,
      trackingNumber,
      vehicleNumber,
      eWayBillNumber,
      items,
      notes,
      actorId,
      actorEmail,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[Dispatch Execution Error]', err);
    res.status(400).json({ error: err.message || 'Failed to execute dispatch' });
  }
});

// 17. Invoice Preparation Handoff Payload (Phase 19 Preview)
salesOrderRouter.get('/:id/invoice-payload', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgContext(req);
    const payload = await InvoicePreparationService.getInvoiceHandoffPayload(req.params.id, orgId);
    res.json(payload);
  } catch (err: any) {
    console.error('[Invoice Payload Error]', err);
    res.status(500).json({ error: err.message || 'Failed to construct invoice handoff payload' });
  }
});

// ==========================================
// SALES RETURNS (RMA) ROUTES
// ==========================================
export const salesReturnRouter = Router();

// 18. List Returns
salesReturnRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgContext(req);
    const { search, status, reason, salesOrderId, page, limit } = req.query;
    const result = await SalesReturnService.listReturns(orgId, {
      search: search as string,
      status: status as string,
      reason: reason as string,
      salesOrderId: salesOrderId as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[List Returns Error]', err);
    res.status(500).json({ error: err.message || 'Failed to list sales returns' });
  }
});

// 19. Get Return by ID
salesReturnRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getOrgContext(req);
    const returnDoc = await SalesReturnService.getReturnById(req.params.id, orgId);
    if (!returnDoc) return res.status(404).json({ error: 'Sales return record not found' });
    res.json(returnDoc);
  } catch (err: any) {
    console.error('[Get Return Error]', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve sales return' });
  }
});

// 20. Create Return
salesReturnRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const returnDoc = await SalesReturnService.createReturn({
      ...req.body,
      organizationId: orgId,
      actorId,
      actorEmail,
    });
    res.status(201).json(returnDoc);
  } catch (err: any) {
    console.error('[Create Return Error]', err);
    res.status(400).json({ error: err.message || 'Failed to create sales return' });
  }
});

// 21. Approve Return
salesReturnRouter.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const returnDoc = await SalesReturnService.approveReturn(req.params.id, orgId, actorId, actorEmail);
    res.json(returnDoc);
  } catch (err: any) {
    console.error('[Approve Return Error]', err);
    res.status(400).json({ error: err.message || 'Failed to approve return' });
  }
});

// 22. Receive Return
salesReturnRouter.post('/:id/receive', async (req: Request, res: Response) => {
  try {
    const { orgId, actorId, actorEmail } = getOrgContext(req);
    const returnDoc = await SalesReturnService.receiveReturn({
      returnId: req.params.id,
      organizationId: orgId,
      actorId,
      actorEmail,
    });
    res.json(returnDoc);
  } catch (err: any) {
    console.error('[Receive Return Error]', err);
    res.status(400).json({ error: err.message || 'Failed to receive returned goods' });
  }
});
