import { Router, Request, Response } from 'express';
import { FormulationService } from './formulation-service.ts';
import { runFormulationMigration } from './migrate-formulations.ts';

export const formulationRouter = Router();

let migrationPromise: Promise<void> | null = null;
export async function ensureFormulationTables() {
  if (!migrationPromise) {
    migrationPromise = runFormulationMigration().then(() => {}).catch(err => {
      migrationPromise = null;
      console.error('[Formulation Migration Error]', err);
    });
  }
  return migrationPromise;
}

// Middleware to ensure schema is initialized before handling requests
formulationRouter.use(async (req, res, next) => {
  try {
    await ensureFormulationTables();
  } catch (e) {
    // Proceed
  }
  next();
});

function getOrgId(req: Request): string {
  return (
    (req.headers['x-organization-id'] as string) ||
    (req.query.orgId as string) ||
    (req as any).user?.organization_id ||
    'org-jyotsvan-corp'
  );
}

function getActor(req: Request) {
  const user = (req as any).user;
  return {
    id: (req.headers['x-user-id'] as string) || user?.id || null,
    email: (req.headers['x-user-email'] as string) || user?.email || 'sunilpanigrahy29401@gmail.com',
  };
}

// ----------------------------------------------------
// 1. SUMMARY METRICS & SKUs
// ----------------------------------------------------
formulationRouter.get('/metrics', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const metrics = await FormulationService.getSummaryMetrics(orgId);
    res.json(metrics);
  } catch (err: any) {
    console.error('[Formulation Route] Error fetching metrics:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch formulation metrics' });
  }
});

formulationRouter.get('/skus/available', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const skus = await FormulationService.getAvailableSkus(orgId);
    res.json(skus);
  } catch (err: any) {
    console.error('[Formulation Route] Error fetching available SKUs:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch available SKUs' });
  }
});

// ----------------------------------------------------
// 2. VERSION COMPARISON & BATCH SCALING
// ----------------------------------------------------
formulationRouter.get('/compare/:id1/:id2', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { id1, id2 } = req.params;
    const comparison = await FormulationService.compareVersions(orgId, id1, id2);
    res.json(comparison);
  } catch (err: any) {
    console.error('[Formulation Route] Error comparing versions:', err);
    res.status(400).json({ error: err.message || 'Failed to compare versions' });
  }
});

formulationRouter.post('/:id/scale', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { id } = req.params;
    const { target_batch_size } = req.body;

    const sizeNum = parseFloat(target_batch_size);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      return res.status(400).json({ error: 'target_batch_size must be a valid positive number.' });
    }

    const scaling = await FormulationService.scaleBatch(orgId, id, sizeNum);
    res.json(scaling);
  } catch (err: any) {
    console.error('[Formulation Route] Error scaling batch:', err);
    res.status(400).json({ error: err.message || 'Failed to scale batch' });
  }
});

// ----------------------------------------------------
// 3. FORMULATIONS CRUD
// ----------------------------------------------------
formulationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { search, status, finishedSkuId, finishedProductId, page, limit } = req.query;

    const result = await FormulationService.listFormulations(orgId, {
      search: search as string,
      status: status as string,
      finishedSkuId: finishedSkuId as string,
      finishedProductId: finishedProductId as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[Formulation Route] Error listing formulations:', err);
    res.status(500).json({ error: err.message || 'Failed to list formulations' });
  }
});

formulationRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { id } = req.params;
    const formulation = await FormulationService.getFormulationById(orgId, id);

    if (!formulation) {
      return res.status(404).json({ error: 'Formulation not found.' });
    }

    res.json(formulation);
  } catch (err: any) {
    console.error('[Formulation Route] Error fetching formulation detail:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch formulation' });
  }
});

formulationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const formulation = await FormulationService.createFormulation(orgId, actor, req.body);
    res.status(201).json(formulation);
  } catch (err: any) {
    console.error('[Formulation Route] Error creating formulation:', err);
    res.status(400).json({ error: err.message || 'Failed to create formulation' });
  }
});

formulationRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { id } = req.params;
    const updated = await FormulationService.updateFormulation(orgId, id, actor, req.body);
    res.json(updated);
  } catch (err: any) {
    console.error('[Formulation Route] Error updating formulation:', err);
    res.status(400).json({ error: err.message || 'Failed to update formulation' });
  }
});

// ----------------------------------------------------
// 4. LIFECYCLE STATE TRANSITIONS
// ----------------------------------------------------
formulationRouter.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { id } = req.params;
    const result = await FormulationService.submitForReview(orgId, id, actor);
    res.json(result);
  } catch (err: any) {
    console.error('[Formulation Route] Error submitting formulation for review:', err);
    res.status(400).json({ error: err.message || 'Failed to submit formulation' });
  }
});

formulationRouter.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { id } = req.params;
    const result = await FormulationService.approveFormulation(orgId, id, actor);
    res.json(result);
  } catch (err: any) {
    console.error('[Formulation Route] Error approving formulation:', err);
    res.status(400).json({ error: err.message || 'Failed to approve formulation' });
  }
});

formulationRouter.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { id } = req.params;
    const { effective_from } = req.body || {};
    const result = await FormulationService.activateFormulation(orgId, id, actor, effective_from);
    res.json(result);
  } catch (err: any) {
    console.error('[Formulation Route] Error activating formulation:', err);
    res.status(400).json({ error: err.message || 'Failed to activate formulation' });
  }
});

formulationRouter.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { id } = req.params;
    const result = await FormulationService.deactivateFormulation(orgId, id, actor);
    res.json(result);
  } catch (err: any) {
    console.error('[Formulation Route] Error deactivating formulation:', err);
    res.status(400).json({ error: err.message || 'Failed to deactivate formulation' });
  }
});

formulationRouter.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { id } = req.params;
    const result = await FormulationService.archiveFormulation(orgId, id, actor);
    res.json(result);
  } catch (err: any) {
    console.error('[Formulation Route] Error archiving formulation:', err);
    res.status(400).json({ error: err.message || 'Failed to archive formulation' });
  }
});

formulationRouter.post('/:id/version', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { id } = req.params;
    const { version_type, custom_version, notes } = req.body;
    const result = await FormulationService.createNewVersion(orgId, id, actor, {
      versionType: version_type || 'minor',
      customVersion: custom_version,
      notes,
    });
    res.status(201).json(result);
  } catch (err: any) {
    console.error('[Formulation Route] Error creating new version:', err);
    res.status(400).json({ error: err.message || 'Failed to create new version' });
  }
});
