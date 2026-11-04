import { Router, Request, Response } from 'express';
import { ProductionService } from './production-service.ts';
import { runProductionMigration } from './migrate-production.ts';

export const productionRouter = Router();

let migrationPromise: Promise<void> | null = null;
export async function ensureProductionTables() {
  if (!migrationPromise) {
    migrationPromise = runProductionMigration().then(() => {}).catch(err => {
      migrationPromise = null;
      console.error('[Production Migration Error]', err);
    });
  }
  return migrationPromise;
}

// Middleware to ensure schema is initialized before handling requests
productionRouter.use(async (req, res, next) => {
  try {
    await ensureProductionTables();
  } catch (e) {
    // Proceed
  }
  next();
});

// Helper to extract org and user context
function getContext(req: Request) {
  const orgId = (req.headers['x-organization-id'] as string) || 'org-jyotsvan-corp';
  const userHeader = req.headers['x-user-context'] as string;
  let actor = { id: 'usr-owner-sunil', email: 'sunilpanigrahy29401@gmail.com' };

  if (userHeader) {
    try {
      const parsed = JSON.parse(userHeader);
      actor = {
        id: parsed.id || actor.id,
        email: parsed.email || actor.email,
      };
    } catch {
      // Fallback to default
    }
  }

  return { orgId, actor };
}

// 1. Telemetry & Metrics
productionRouter.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const metrics = await ProductionService.getProductionMetrics(orgId);
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch production metrics.' });
  }
});

// 2. Production Plans
productionRouter.get('/plans', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const { page, limit, search, status } = req.query;
    const result = await ProductionService.listProductionPlans(orgId, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      search: search as string,
      status: status as string,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list production plans.' });
  }
});

productionRouter.post('/plans', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const plan = await ProductionService.createProductionPlan(orgId, req.body, actor);
    res.status(201).json(plan);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create production plan.' });
  }
});

productionRouter.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const plan = await ProductionService.getProductionPlanById(orgId, req.params.id);
    if (!plan) return res.status(404).json({ error: 'Production plan not found.' });
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve production plan.' });
  }
});

productionRouter.post('/plans/:id/approve', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const plan = await ProductionService.approveProductionPlan(orgId, req.params.id, actor);
    res.json(plan);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to approve production plan.' });
  }
});

// 3. Production Orders
productionRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const { page, limit, search, status, material_status, warehouse_id, sku_id, plan_id, sortBy, sortOrder } = req.query;
    const result = await ProductionService.listProductionOrders(orgId, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      search: search as string,
      status: status as string,
      material_status: material_status as string,
      warehouse_id: warehouse_id as string,
      sku_id: sku_id as string,
      plan_id: plan_id as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list production orders.' });
  }
});

productionRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const order = await ProductionService.createProductionOrder(orgId, req.body, actor);
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create production order.' });
  }
});

productionRouter.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const order = await ProductionService.getProductionOrderById(orgId, req.params.id);
    if (!order) return res.status(404).json({ error: 'Production order not found.' });
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve production order.' });
  }
});

// 4. Material Availability Check
productionRouter.get('/orders/:id/availability', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const report = await ProductionService.checkMaterialAvailability(orgId, req.params.id);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to evaluate material availability.' });
  }
});

// 5. Reserve Materials
productionRouter.post('/orders/:id/reserve', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const order = await ProductionService.reserveMaterials(orgId, req.params.id, actor);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reserve production materials.' });
  }
});

// 6. Issue Materials
productionRouter.post('/orders/:id/issue', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { issues } = req.body;
    const order = await ProductionService.issueMaterials(orgId, req.params.id, issues || [], actor);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to issue materials.' });
  }
});

// 7. Actual Consumption
productionRouter.post('/orders/:id/consumption', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { consumptions } = req.body;
    const order = await ProductionService.recordActualConsumption(orgId, req.params.id, consumptions || [], actor);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record actual consumption.' });
  }
});

// 8. Return Unused Materials
productionRouter.post('/orders/:id/return', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const order = await ProductionService.returnUnusedMaterials(orgId, req.params.id, req.body, actor);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to process material return.' });
  }
});

// 9. Record Output & QC Handoff
productionRouter.post('/orders/:id/output', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const order = await ProductionService.recordProductionOutput(orgId, req.params.id, req.body, actor);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record production output.' });
  }
});

// 10. Record Wastage
productionRouter.post('/orders/:id/wastage', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const order = await ProductionService.recordWastage(orgId, req.params.id, req.body, actor);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record process wastage.' });
  }
});

// 11. Complete Order
productionRouter.post('/orders/:id/complete', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const order = await ProductionService.completeProductionOrder(orgId, req.params.id, actor);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to complete production order.' });
  }
});

// 12. Cancel Order
productionRouter.post('/orders/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { reason } = req.body;
    const order = await ProductionService.cancelProductionOrder(orgId, req.params.id, reason || 'Cancelled by user', actor);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to cancel production order.' });
  }
});

// 13. Approve Order
productionRouter.post('/orders/:id/approve', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const order = await ProductionService.approveOrder(orgId, req.params.id, actor);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to approve production order.' });
  }
});

// 14. Hold / Resume Order
productionRouter.post('/orders/:id/hold', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { reason } = req.body;
    const order = await ProductionService.setOrderHold(orgId, req.params.id, true, reason || 'Placed on operational hold', actor);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to hold production order.' });
  }
});

productionRouter.post('/orders/:id/resume', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { reason } = req.body;
    const order = await ProductionService.setOrderHold(orgId, req.params.id, false, reason || 'Resumed operation', actor);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to resume production order.' });
  }
});
