import express from 'express';
import { BatchService } from './batch-service.ts';
import { pool } from './db.ts';

export const batchRouter = express.Router();

// Helper to extract actor and tenant organization ID
async function resolveAuth(req: express.Request) {
  const orgHeader = req.headers['x-organization-id'] as string;
  const userEmail = (req.headers['x-user-email'] as string) || 'admin@jyotsvan.enterprise';

  let orgId = orgHeader;
  if (!orgId) {
    const orgRes = await pool.query('SELECT id FROM organizations LIMIT 1');
    orgId = orgRes.rows[0]?.id || 'org-jyotsvan-corp';
  }

  const userRes = await pool.query('SELECT id, email FROM users WHERE organization_id = $1 LIMIT 1', [orgId]);
  const actorId = userRes.rows[0]?.id || null;

  return {
    orgId,
    actorId,
    actorEmail: userEmail,
  };
}

// 1. Summary KPIs
batchRouter.get('/summary', async (req, res) => {
  try {
    const { orgId } = await resolveAuth(req);
    const summary = await BatchService.getSummaryMetrics(orgId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load batch summary metrics' });
  }
});

// 2. Numbering Rules
batchRouter.get('/rules', async (req, res) => {
  try {
    const { orgId } = await resolveAuth(req);
    const rules = await BatchService.getNumberingRules(orgId);
    res.json({ rules });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load batch numbering rules' });
  }
});

batchRouter.post('/rules', async (req, res) => {
  try {
    const { orgId } = await resolveAuth(req);
    const rule = await BatchService.saveNumberingRule({
      ...req.body,
      orgId,
    });
    res.json({ success: true, rule });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save batch numbering rule' });
  }
});

// 3. Holds & Recalls
batchRouter.get('/holds', async (req, res) => {
  try {
    const { orgId } = await resolveAuth(req);
    const holds = await BatchService.getBatchHolds({
      orgId,
      batchId: req.query.batchId as string,
      status: req.query.status as string,
      severity: req.query.severity as string,
    });
    res.json({ holds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load batch holds' });
  }
});

batchRouter.post('/holds', async (req, res) => {
  try {
    const { orgId, actorId, actorEmail } = await resolveAuth(req);
    const hold = await BatchService.placeBatchHold({
      ...req.body,
      orgId,
      actorId,
      actorEmail,
    });
    res.json({ success: true, hold });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to place batch hold' });
  }
});

batchRouter.post('/holds/:id/release', async (req, res) => {
  try {
    const { orgId, actorId, actorEmail } = await resolveAuth(req);
    const hold = await BatchService.releaseBatchHold({
      orgId,
      holdId: req.params.id,
      releaseJustification: req.body.releaseJustification,
      resolutionNotes: req.body.resolutionNotes,
      targetStatus: req.body.targetStatus,
      actorId,
      actorEmail,
    });
    res.json({ success: true, hold });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to release batch hold' });
  }
});

// 4. Traceability Investigation
batchRouter.get('/trace/:identifier', async (req, res) => {
  try {
    const { orgId } = await resolveAuth(req);
    const report = await BatchService.getTraceabilityReport(req.params.identifier, orgId);
    res.json(report);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Traceability lookup failed' });
  }
});

// 5. FEFO Allocations
batchRouter.get('/fefo', async (req, res) => {
  try {
    const { orgId } = await resolveAuth(req);
    const skuId = req.query.skuId as string;
    const qty = parseFloat(req.query.quantity as string) || 0;
    const warehouseId = req.query.warehouseId as string;

    if (!skuId || qty <= 0) {
      return res.status(400).json({ error: 'skuId and positive quantity are required' });
    }

    const allocations = await BatchService.getFefoAllocations({
      orgId,
      skuId,
      requiredQuantity: qty,
      warehouseId,
    });
    res.json(allocations);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to compute FEFO allocations' });
  }
});

// 6. List Batches
batchRouter.get('/', async (req, res) => {
  try {
    const { orgId } = await resolveAuth(req);
    const result = await BatchService.getBatches({
      orgId,
      search: req.query.search as string,
      status: req.query.status as string,
      batchType: req.query.batchType as string,
      qcStatus: req.query.qcStatus as string,
      skuId: req.query.skuId as string,
      warehouseId: req.query.warehouseId as string,
      supplierId: req.query.supplierId as string,
      expiryFilter: req.query.expiryFilter as any,
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 25,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch batches list' });
  }
});

// 7. Get Single Batch
batchRouter.get('/:id', async (req, res) => {
  try {
    const { orgId } = await resolveAuth(req);
    const batch = await BatchService.getBatchById(req.params.id, orgId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json({ batch });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch batch details' });
  }
});

// 8. Create Batch
batchRouter.post('/', async (req, res) => {
  try {
    const { orgId, actorId, actorEmail } = await resolveAuth(req);
    const batch = await BatchService.createBatch({
      ...req.body,
      orgId,
      actorId,
      actorEmail,
    });
    res.status(201).json({ success: true, batch });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create batch' });
  }
});

// 9. Update Batch
batchRouter.put('/:id', async (req, res) => {
  try {
    const { orgId, actorId, actorEmail } = await resolveAuth(req);
    const batch = await BatchService.updateBatch({
      ...req.body,
      batchId: req.params.id,
      orgId,
      actorId,
      actorEmail,
    });
    res.json({ success: true, batch });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update batch' });
  }
});

// 10. Status Transition
batchRouter.post('/:id/status', async (req, res) => {
  try {
    const { orgId, actorId, actorEmail } = await resolveAuth(req);
    const batch = await BatchService.transitionBatchStatus({
      batchId: req.params.id,
      orgId,
      targetStatus: req.body.targetStatus,
      reason: req.body.reason,
      justification: req.body.justification,
      actorId,
      actorEmail,
    });
    res.json({ success: true, batch });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to transition batch status' });
  }
});

// 11. Backward Genealogy Tree
batchRouter.get('/:id/backward', async (req, res) => {
  try {
    const { orgId } = await resolveAuth(req);
    const tree = await BatchService.getBackwardTraceability(req.params.id, orgId);
    res.json({ tree });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get backward genealogy tree' });
  }
});

// 12. Forward Genealogy Tree
batchRouter.get('/:id/forward', async (req, res) => {
  try {
    const { orgId } = await resolveAuth(req);
    const tree = await BatchService.getForwardTraceability(req.params.id, orgId);
    res.json({ tree });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get forward genealogy tree' });
  }
});
