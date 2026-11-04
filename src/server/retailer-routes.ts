import { Router } from 'express';
import { RetailerService } from './retailer-service.ts';
import { RetailerInventoryService } from './retailer-inventory-service.ts';
import { RetailerOrderService } from './retailer-order-service.ts';
import { RetailerActivityService } from './retailer-activity-service.ts';

export const retailerRouter = Router();

const retService = new RetailerService();
const retInvService = new RetailerInventoryService();
const retOrdService = new RetailerOrderService();
const retActService = new RetailerActivityService();

function getContext(req: any) {
  const orgId = (req.headers['x-organization-id'] as string) || 'org-jyotsvan-corp';
  const actor = {
    id: (req.headers['x-user-id'] as string) || 'usr-super-admin',
    email: (req.headers['x-user-email'] as string) || 'admin@jyotsvan.enterprise',
  };
  return { orgId, actor };
}

// 1. Telemetry / Summary KPI Metrics
retailerRouter.get('/metrics', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const metrics = await retService.getSummaryMetrics(orgId);
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    console.error('[Retailer Route] Metrics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Channel Inventory Items
retailerRouter.get('/inventory', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { retailer_id, sku_id, distributor_id, search, near_expiry, page, limit } = req.query;

    const result = await retInvService.listStockItems(orgId, {
      retailer_id: retailer_id as string,
      sku_id: sku_id as string,
      distributor_id: distributor_id as string,
      search: search as string,
      near_expiry: near_expiry === 'true' || near_expiry === '1',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Retailer Route] Inventory error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Receiving Records
retailerRouter.get('/receiving-records', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { retailer_id, distributor_id, page, limit } = req.query;

    const result = await retInvService.listReceivingRecords(orgId, {
      retailer_id: retailer_id as string,
      distributor_id: distributor_id as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/receiving-records', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const record = await retInvService.logReceivingRecord(orgId, req.body);
    res.status(201).json({ success: true, data: record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. Retailer Order Requests
retailerRouter.get('/orders', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { retailer_id, distributor_id, status, page, limit } = req.query;

    const result = await retOrdService.listOrderRequests(orgId, {
      retailer_id: retailer_id as string,
      distributor_id: distributor_id as string,
      status: status as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.get('/orders/:id', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const order = await retOrdService.getOrderRequestById(orgId, req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order request not found' });
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/orders', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const order = await retOrdService.createOrderRequest(orgId, req.body, actor);
    res.status(201).json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/orders/:id/approve', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const order = await retOrdService.approveOrderRequest(orgId, req.params.id, actor, req.body.notes);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/orders/:id/reject', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const order = await retOrdService.rejectOrderRequest(orgId, req.params.id, actor, req.body.reason || 'Rejected by distributor/company');
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/orders/:id/cancel', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const order = await retOrdService.cancelOrderRequest(orgId, req.params.id, actor, req.body.reason);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Retailer Returns
retailerRouter.get('/returns', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { retailer_id, distributor_id, status, reason, page, limit } = req.query;

    const result = await retOrdService.listReturns(orgId, {
      retailer_id: retailer_id as string,
      distributor_id: distributor_id as string,
      status: status as string,
      reason: reason as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/returns', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const record = await retOrdService.createReturn(orgId, req.body, actor);
    res.status(201).json({ success: true, data: record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/returns/:id/approve', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const record = await retOrdService.approveReturn(orgId, req.params.id, actor, req.body.notes);
    res.json({ success: true, data: record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Visits
retailerRouter.get('/visits', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { retailer_id, salesperson_id, page, limit } = req.query;

    const result = await retActService.listVisits(orgId, {
      retailer_id: retailer_id as string,
      salesperson_id: salesperson_id as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/visits', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const visit = await retActService.logVisit(orgId, req.body);
    res.status(201).json({ success: true, data: visit });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. Follow-ups
retailerRouter.get('/followups', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { retailer_id, priority, status, overdue_only, page, limit } = req.query;

    const result = await retActService.listFollowups(orgId, {
      retailer_id: retailer_id as string,
      priority: priority as string,
      status: status as string,
      overdue_only: overdue_only === 'true' || overdue_only === '1',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/followups', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const followup = await retActService.createFollowup(orgId, req.body);
    res.status(201).json({ success: true, data: followup });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.patch('/followups/:id/status', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { status, notes } = req.body;
    const updated = await retActService.updateFollowupStatus(orgId, req.params.id, status, notes);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. Retailer Master Listing & CRUD
retailerRouter.get('/', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { search, status, retailer_type, region, state, distributor_id, territory_id, salesperson_id, page, limit } = req.query;

    const result = await retService.listRetailers(orgId, {
      search: search as string,
      status: status as string,
      retailer_type: retailer_type as string,
      region: region as string,
      state: state as string,
      distributor_id: distributor_id as string,
      territory_id: territory_id as string,
      salesperson_id: salesperson_id as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Retailer Route] List error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const created = await retService.createRetailer(orgId, req.body, actor);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    console.error('[Retailer Route] Create error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.get('/:id', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const retailer = await retService.getRetailerById(orgId, req.params.id);
    if (!retailer) {
      return res.status(404).json({ success: false, error: 'Retailer not found' });
    }
    res.json({ success: true, data: retailer });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.put('/:id', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const updated = await retService.updateRetailer(orgId, req.params.id, req.body, actor);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.patch('/:id/status', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const { status, notes } = req.body;
    const updated = await retService.updateRetailerStatus(orgId, req.params.id, status, actor, notes);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Sub-resources: Contacts
retailerRouter.get('/:id/contacts', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const contacts = await retService.getContacts(orgId, req.params.id);
    res.json({ success: true, data: contacts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/:id/contacts', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const contact = await retService.addContact(orgId, req.params.id, req.body);
    res.status(201).json({ success: true, data: contact });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.delete('/:id/contacts/:contactId', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const deleted = await retService.deleteContact(orgId, req.params.id, req.params.contactId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sub-resources: Addresses
retailerRouter.get('/:id/addresses', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const addresses = await retService.getAddresses(orgId, req.params.id);
    res.json({ success: true, data: addresses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/:id/addresses', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const address = await retService.addAddress(orgId, req.params.id, req.body);
    res.status(201).json({ success: true, data: address });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.delete('/:id/addresses/:addressId', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const deleted = await retService.deleteAddress(orgId, req.params.id, req.params.addressId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sub-resources: Distributor Mappings
retailerRouter.get('/:id/distributors', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const mappings = await retService.getDistributorMappings(orgId, req.params.id);
    res.json({ success: true, data: mappings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/:id/distributors', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const mapping = await retService.mapDistributor(orgId, req.params.id, req.body);
    res.status(201).json({ success: true, data: mapping });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.delete('/:id/distributors/:distributorId', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const deleted = await retService.unmapDistributor(orgId, req.params.id, req.params.distributorId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sub-resources: Salesperson Assignments
retailerRouter.get('/:id/salespersons', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const assignments = await retService.getSalespersonAssignments(orgId, req.params.id);
    res.json({ success: true, data: assignments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/:id/salespersons', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const assignment = await retService.assignSalesperson(orgId, req.params.id, req.body);
    res.status(201).json({ success: true, data: assignment });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.delete('/:id/salespersons/:assignmentId', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const deleted = await retService.unassignSalesperson(orgId, req.params.id, req.params.assignmentId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sub-resources: Assortment
retailerRouter.get('/:id/assortment', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const assortment = await retService.getAssortment(orgId, req.params.id);
    res.json({ success: true, data: assortment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/:id/assortment', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const item = await retService.addAssortmentItem(orgId, req.params.id, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.delete('/:id/assortment/:skuId', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const deleted = await retService.removeAssortmentItem(orgId, req.params.id, req.params.skuId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sub-resources: Commercial Terms
retailerRouter.get('/:id/commercial-terms', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const terms = await retService.getCommercialTerms(orgId, req.params.id);
    res.json({ success: true, data: terms });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sub-resources: Documents
retailerRouter.get('/:id/documents', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const docs = await retActService.listDocuments(orgId, req.params.id);
    res.json({ success: true, data: docs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

retailerRouter.post('/:id/documents', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const doc = await retActService.uploadDocument(orgId, { ...req.body, retailer_id: req.params.id }, actor);
    res.status(201).json({ success: true, data: doc });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

retailerRouter.delete('/:id/documents/:documentId', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const deleted = await retActService.deleteDocument(orgId, req.params.id, req.params.documentId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
