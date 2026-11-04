import { Router } from 'express';
import {
  cfsService,
  cfTransferService,
  cfDispatchService,
  cfInventoryService,
  cfMetricsService,
} from './cf-service.ts';

export const cfRouter = Router();

// Helper to extract actor & organization
function getContext(req: any) {
  const orgId = req.headers['x-organization-id'] as string || 'org-jyotsvan-corp';
  const actor = {
    id: (req.headers['x-user-id'] as string) || 'usr-super-admin',
    email: (req.headers['x-user-email'] as string) || 'admin@jyotsvan.enterprise',
  };
  return { orgId, actor };
}

// 1. Telemetry / Summary Metrics
cfRouter.get('/metrics', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const metrics = await cfMetricsService.getSummaryMetrics(orgId);
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    console.error('[CF Route Error] Metrics fetch failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Live Inventory Balances per C&F Depot
cfRouter.get('/inventory', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { cfId, warehouseId, search } = req.query;
    const inventory = await cfInventoryService.getCFDepotInventory(orgId, {
      cfId: cfId as string,
      warehouseId: warehouseId as string,
      search: search as string,
    });
    res.json({ success: true, data: inventory });
  } catch (err: any) {
    console.error('[CF Route Error] Inventory fetch failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Discrepancy Register
cfRouter.get('/discrepancies', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { cfId, status } = req.query;
    const discrepancies = await cfInventoryService.getDiscrepancyRegister(orgId, {
      cfId: cfId as string,
      status: status as string,
    });
    res.json({ success: true, data: discrepancies });
  } catch (err: any) {
    console.error('[CF Route Error] Discrepancies fetch failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

cfRouter.patch('/discrepancies/:id/resolve', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const { id } = req.params;
    const { resolutionStatus, resolutionNotes } = req.body;
    await cfInventoryService.resolveDiscrepancy(orgId, id, resolutionStatus, resolutionNotes, actor);
    res.json({ success: true, message: 'Discrepancy resolved successfully' });
  } catch (err: any) {
    console.error('[CF Route Error] Discrepancy resolution failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Stock Transfers (Inward Plant-to-C&F)
cfRouter.get('/transfers', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { cfId, status, search, limit, page } = req.query;
    const result = await cfTransferService.listTransfers(orgId, {
      cfId: cfId as string,
      status: status as string,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[CF Route Error] Transfers list failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

cfRouter.get('/transfers/:id', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { id } = req.params;
    const transfer = await cfTransferService.getTransferById(orgId, id);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transfer not found' });
    }
    res.json({ success: true, data: transfer });
  } catch (err: any) {
    console.error('[CF Route Error] Transfer detail failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

cfRouter.post('/transfers', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const transfer = await cfTransferService.createTransfer(orgId, req.body, actor);
    res.status(201).json({ success: true, data: transfer });
  } catch (err: any) {
    console.error('[CF Route Error] Create transfer failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

cfRouter.post('/transfers/:id/approve', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const { id } = req.params;
    const transfer = await cfTransferService.approveTransfer(orgId, id, actor);
    res.json({ success: true, data: transfer });
  } catch (err: any) {
    console.error('[CF Route Error] Approve transfer failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

cfRouter.post('/transfers/:id/dispatch', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const { id } = req.params;
    const transfer = await cfTransferService.dispatchTransfer(orgId, id, req.body, actor);
    res.json({ success: true, data: transfer });
  } catch (err: any) {
    console.error('[CF Route Error] Dispatch transfer failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

cfRouter.post('/transfers/:id/receive', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const { id } = req.params;
    const transfer = await cfTransferService.receiveTransfer(orgId, id, req.body, actor);
    res.json({ success: true, data: transfer });
  } catch (err: any) {
    console.error('[CF Route Error] Receive transfer failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Outbound Dispatches (C&F to Downstream)
cfRouter.get('/dispatches', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { cfId, status, search, limit, page } = req.query;
    const result = await cfDispatchService.listDispatches(orgId, {
      cfId: cfId as string,
      status: status as string,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[CF Route Error] Dispatches list failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

cfRouter.get('/dispatches/:id', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { id } = req.params;
    const dispatch = await cfDispatchService.getDispatchById(orgId, id);
    if (!dispatch) {
      return res.status(404).json({ success: false, error: 'Dispatch not found' });
    }
    res.json({ success: true, data: dispatch });
  } catch (err: any) {
    console.error('[CF Route Error] Dispatch detail failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

cfRouter.post('/dispatches', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const dispatch = await cfDispatchService.createDispatch(orgId, req.body, actor);
    res.status(201).json({ success: true, data: dispatch });
  } catch (err: any) {
    console.error('[CF Route Error] Create dispatch failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

cfRouter.post('/dispatches/:id/execute', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const { id } = req.params;
    const dispatch = await cfDispatchService.executeDispatch(orgId, id, actor);
    res.json({ success: true, data: dispatch });
  } catch (err: any) {
    console.error('[CF Route Error] Execute dispatch failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. C&F Master Registry CRUD
cfRouter.get('/', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { search, type, status, state, region, limit, page } = req.query;
    const result = await cfsService.listCFs(orgId, {
      search: search as string,
      type: type as any,
      status: status as any,
      state: state as string,
      region: region as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[CF Route Error] C&F list failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

cfRouter.get('/:id', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { id } = req.params;
    const cf = await cfsService.getCFById(orgId, id);
    if (!cf) {
      return res.status(404).json({ success: false, error: 'C&F agency not found' });
    }
    res.json({ success: true, data: cf });
  } catch (err: any) {
    console.error('[CF Route Error] C&F detail failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

cfRouter.post('/', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const cf = await cfsService.createCF(orgId, req.body, actor);
    res.status(201).json({ success: true, data: cf });
  } catch (err: any) {
    console.error('[CF Route Error] Create C&F failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

cfRouter.put('/:id', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const { id } = req.params;
    const cf = await cfsService.updateCF(orgId, id, req.body, actor);
    if (!cf) {
      return res.status(404).json({ success: false, error: 'C&F agency not found' });
    }
    res.json({ success: true, data: cf });
  } catch (err: any) {
    console.error('[CF Route Error] Update C&F failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

cfRouter.patch('/:id/status', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const { id } = req.params;
    const { status, reason } = req.body;
    const cf = await cfsService.updateCFStatus(orgId, id, status, reason, actor);
    if (!cf) {
      return res.status(404).json({ success: false, error: 'C&F agency not found' });
    }
    res.json({ success: true, data: cf });
  } catch (err: any) {
    console.error('[CF Route Error] Update C&F status failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

cfRouter.post('/:id/warehouses', async (req, res) => {
  try {
    const { orgId, actor } = getContext(req);
    const { id } = req.params;
    const { warehouseId, isPrimary, agreementRef } = req.body;
    await cfsService.assignWarehouse(orgId, id, warehouseId, isPrimary, agreementRef, actor);
    res.json({ success: true, message: 'Warehouse assigned to C&F successfully' });
  } catch (err: any) {
    console.error('[CF Route Error] Assign warehouse failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

cfRouter.delete('/:id/warehouses/:warehouseId', async (req, res) => {
  try {
    const { orgId } = getContext(req);
    const { id, warehouseId } = req.params;
    await cfsService.unassignWarehouse(orgId, id, warehouseId);
    res.json({ success: true, message: 'Warehouse unassigned from C&F successfully' });
  } catch (err: any) {
    console.error('[CF Route Error] Unassign warehouse failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});
