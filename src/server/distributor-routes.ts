import { Router } from 'express';
import { DistributorService } from './distributor-service.ts';
import { DistributorInventoryService } from './distributor-inventory-service.ts';
import { DistributorTransferService } from './distributor-transfer-service.ts';

export const distributorRouter = Router();

const distService = new DistributorService();
const distInvService = new DistributorInventoryService();
const distTrfService = new DistributorTransferService();

function getContext(req: any) {
  const orgId = (req.headers['x-organization-id'] as string) || 'org-jyotsvan-corp';
  const actor = {
    id: (req.headers['x-user-id'] as string) || 'usr-super-admin',
    email: (req.headers['x-user-email'] as string) || 'admin@jyotsvan.enterprise',
  };
  return { orgId, actor };
}

// 1. Telemetry / Summary KPI Metrics
distributorRouter.get('/metrics', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const metrics = await distService.getSummaryMetrics(orgId);
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    console.error('[Distributor Route] Metrics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Territories
distributorRouter.get('/territories', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const data = await distService.listTerritories(orgId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/territories', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const created = await distService.createTerritory(orgId, req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. Distributor Master Listing & CRUD
distributorRouter.get('/', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { search, status, distributor_type, region, state, cf_id, territory_id, page, limit } = req.query;

    const result = await distService.listDistributors(orgId, {
      search: search as string,
      status: status as string,
      distributor_type: distributor_type as string,
      region: region as string,
      state: state as string,
      cf_id: cf_id as string,
      territory_id: territory_id as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Distributor Route] List error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const created = await distService.createDistributor(orgId, req.body, actor);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    console.error('[Distributor Route] Create error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

distributorRouter.get('/:id', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const distributor = await distService.getDistributorById(orgId, req.params.id);
    if (!distributor) {
      return res.status(404).json({ success: false, error: 'Distributor not found' });
    }
    res.json({ success: true, data: distributor });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.patch('/:id', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const updated = await distService.updateDistributor(orgId, req.params.id, req.body, actor);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/:id/status', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const { status, notes } = req.body;
    const updated = await distService.updateDistributorStatus(orgId, req.params.id, status, actor, notes);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Contacts & Addresses Sub-resources
distributorRouter.get('/:id/contacts', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const contacts = await distService.getContacts(orgId, req.params.id);
    res.json({ success: true, data: contacts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/:id/contacts', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const contact = await distService.addContact(orgId, req.params.id, req.body);
    res.status(201).json({ success: true, data: contact });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

distributorRouter.delete('/:id/contacts/:contactId', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    await distService.deleteContact(orgId, req.params.id, req.params.contactId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.get('/:id/addresses', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const addresses = await distService.getAddresses(orgId, req.params.id);
    res.json({ success: true, data: addresses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/:id/addresses', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const address = await distService.addAddress(orgId, req.params.id, req.body);
    res.status(201).json({ success: true, data: address });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. C&F Mapping Sub-resources
distributorRouter.get('/:id/cfs', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const mappings = await distService.getMappedCFs(orgId, req.params.id);
    res.json({ success: true, data: mappings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/:id/cfs', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const mapping = await distService.mapCF(orgId, req.params.id, req.body);
    res.status(201).json({ success: true, data: mapping });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

distributorRouter.delete('/:id/cfs/:cfId', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    await distService.unmapCF(orgId, req.params.id, req.params.cfId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Product Assortment Sub-resources
distributorRouter.get('/:id/assortment', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const assortment = await distService.getAssortment(orgId, req.params.id);
    res.json({ success: true, data: assortment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/:id/assortment', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const item = await distService.addAssortmentItem(orgId, req.params.id, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

distributorRouter.delete('/:id/assortment/:skuId', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    await distService.removeAssortmentItem(orgId, req.params.id, req.params.skuId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Channel Inventory Registers
distributorRouter.get('/inventory/items', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { distributor_id, sku_id, cf_id, search, near_expiry, days_threshold, page, limit } = req.query;

    const result = await distInvService.getStockItems(orgId, {
      distributor_id: distributor_id as string,
      sku_id: sku_id as string,
      cf_id: cf_id as string,
      search: search as string,
      near_expiry: near_expiry === 'true',
      days_threshold: days_threshold ? parseInt(days_threshold as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. C&F-to-Distributor Transfers & Dispatches
distributorRouter.get('/transfers/list', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { distributor_id, cf_id, status, priority, search, page, limit } = req.query;

    const result = await distTrfService.listTransfers(orgId, {
      distributor_id: distributor_id as string,
      cf_id: cf_id as string,
      status: status as string,
      priority: priority as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/transfers', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const created = await distTrfService.createTransfer(orgId, req.body, actor);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

distributorRouter.get('/transfers/:id', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const transfer = await distTrfService.getTransferById(orgId, req.params.id);
    if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found' });
    res.json({ success: true, data: transfer });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/transfers/:id/approve', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const approved = await distTrfService.approveTransfer(orgId, req.params.id, actor);
    res.json({ success: true, data: approved });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/transfers/:id/dispatch', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const dispatched = await distTrfService.dispatchTransfer(orgId, req.params.id, req.body, actor);
    res.json({ success: true, data: dispatched });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/transfers/:id/receive', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const received = await distTrfService.receiveTransfer(orgId, req.params.id, req.body, actor);
    res.json({ success: true, data: received });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/transfers/:id/cancel', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const cancelled = await distTrfService.cancelTransfer(orgId, req.params.id, req.body.reason, actor);
    res.json({ success: true, data: cancelled });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 9. Discrepancies Register & Resolution
distributorRouter.get('/discrepancies/list', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { distributor_id, cf_id, status, search, page, limit } = req.query;

    const result = await distTrfService.listDiscrepancies(orgId, {
      distributor_id: distributor_id as string,
      cf_id: cf_id as string,
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/discrepancies/:id/resolve', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const resolved = await distTrfService.resolveDiscrepancy(orgId, req.params.id, req.body, actor);
    res.json({ success: true, data: resolved });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 10. Orders Pipeline Foundation
distributorRouter.get('/orders/list', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { distributor_id, status, search, page, limit } = req.query;

    const result = await distTrfService.listOrders(orgId, {
      distributor_id: distributor_id as string,
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/orders', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const created = await distTrfService.createOrder(orgId, req.body, actor);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/orders/:id/approve', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const approved = await distTrfService.approveOrder(orgId, req.params.id, actor);
    res.json({ success: true, data: approved });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 11. Returns Pipeline Foundation
distributorRouter.get('/returns/list', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { distributor_id, status, search, page, limit } = req.query;

    const result = await distTrfService.listReturns(orgId, {
      distributor_id: distributor_id as string,
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

distributorRouter.post('/returns', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const created = await distTrfService.createReturn(orgId, req.body, actor);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
