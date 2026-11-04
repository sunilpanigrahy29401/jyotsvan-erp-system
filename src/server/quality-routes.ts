import { Router, Request, Response } from 'express';
import { QualityService } from './quality-service.ts';
import { migrateQualityControl } from './migrate-quality-control.ts';

export const qualityRouter = Router();

let migrationPromise: Promise<void> | null = null;
export async function ensureQualityTables() {
  if (!migrationPromise) {
    migrationPromise = migrateQualityControl().then(() => {}).catch(err => {
      migrationPromise = null;
      console.error('[Quality Control Migration Error]', err);
    });
  }
  return migrationPromise;
}

// Middleware to ensure schema is initialized before handling requests
qualityRouter.use(async (req, res, next) => {
  try {
    await ensureQualityTables();
  } catch (e) {
    // Proceed
  }
  next();
});

// Helper for org ID and user context
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
// 1. QUALITY SUMMARY METRICS & REPORTS
// ----------------------------------------------------
qualityRouter.get('/metrics', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const metrics = await QualityService.getSummaryMetrics(orgId);
    res.json(metrics);
  } catch (err: any) {
    console.error('[QC Route] Error fetching metrics:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch QC metrics' });
  }
});

qualityRouter.get('/reports/suppliers', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const report = await QualityService.getSupplierQualityReport(orgId);
    res.json(report);
  } catch (err: any) {
    console.error('[QC Route] Error fetching supplier report:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch supplier quality report' });
  }
});

qualityRouter.get('/reports/skus', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const report = await QualityService.getSkuQualityReport(orgId);
    res.json(report);
  } catch (err: any) {
    console.error('[QC Route] Error fetching SKU report:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch SKU quality report' });
  }
});

// ----------------------------------------------------
// 2. QC PARAMETERS MASTER
// ----------------------------------------------------
qualityRouter.get('/parameters', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { search, type, status, page, limit } = req.query;
    const result = await QualityService.getParameters({
      orgId,
      search: search as string,
      type: type as string,
      status: status as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[QC Route] Error fetching parameters:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch QC parameters' });
  }
});

qualityRouter.get('/parameters/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const param = await QualityService.getParameterById(req.params.id, orgId);
    if (!param) {
      return res.status(404).json({ error: 'QC Parameter not found' });
    }
    res.json(param);
  } catch (err: any) {
    console.error('[QC Route] Error fetching parameter by id:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch QC parameter' });
  }
});

qualityRouter.post('/parameters', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const {
      parameterCode,
      parameterName,
      description,
      parameterType,
      unitId,
      minimumValue,
      maximumValue,
      targetValue,
      allowedValues,
      testMethod,
    } = req.body;

    if (!parameterCode || !parameterName || !parameterType) {
      return res.status(400).json({ error: 'parameterCode, parameterName, and parameterType are required.' });
    }

    const created = await QualityService.createParameter({
      organizationId: orgId,
      parameterCode,
      parameterName,
      description,
      parameterType,
      unitId,
      minimumValue,
      maximumValue,
      targetValue,
      allowedValues,
      testMethod,
      actorId: actor.id,
      actorEmail: actor.email,
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('[QC Route] Error creating parameter:', err);
    res.status(400).json({ error: err.message || 'Failed to create parameter' });
  }
});

qualityRouter.put('/parameters/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const updated = await QualityService.updateParameter(req.params.id, orgId, {
      ...req.body,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    res.json(updated);
  } catch (err: any) {
    console.error('[QC Route] Error updating parameter:', err);
    res.status(400).json({ error: err.message || 'Failed to update parameter' });
  }
});

// ----------------------------------------------------
// 3. QC TEMPLATES / SPECIFICATIONS
// ----------------------------------------------------
qualityRouter.get('/templates', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { search, category, status, page, limit } = req.query;
    const result = await QualityService.getTemplates({
      orgId,
      search: search as string,
      category: category as string,
      status: status as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[QC Route] Error fetching templates:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch QC templates' });
  }
});

qualityRouter.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const template = await QualityService.getTemplateById(req.params.id, orgId);
    if (!template) {
      return res.status(404).json({ error: 'QC Template not found' });
    }
    res.json(template);
  } catch (err: any) {
    console.error('[QC Route] Error fetching template by id:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch QC template' });
  }
});

qualityRouter.post('/templates', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { templateCode, name, description, category, version, parameters } = req.body;

    if (!templateCode || !name) {
      return res.status(400).json({ error: 'templateCode and name are required.' });
    }

    const created = await QualityService.createTemplate({
      organizationId: orgId,
      templateCode,
      name,
      description,
      category,
      version,
      parameters,
      actorId: actor.id,
      actorEmail: actor.email,
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('[QC Route] Error creating template:', err);
    res.status(400).json({ error: err.message || 'Failed to create template' });
  }
});

qualityRouter.put('/templates/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const updated = await QualityService.updateTemplate(req.params.id, orgId, {
      ...req.body,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    res.json(updated);
  } catch (err: any) {
    console.error('[QC Route] Error updating template:', err);
    res.status(400).json({ error: err.message || 'Failed to update template' });
  }
});

// ----------------------------------------------------
// 4. QC INSPECTIONS LIFECYCLE
// ----------------------------------------------------
qualityRouter.get('/inspections', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { search, status, type, skuId, supplierId, warehouseId, overallResult, page, limit, sortBy, sortOrder } = req.query;
    const result = await QualityService.getInspections({
      orgId,
      search: search as string,
      status: status as string,
      type: type as string,
      skuId: skuId as string,
      supplierId: supplierId as string,
      warehouseId: warehouseId as string,
      overallResult: overallResult as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
      sortBy: sortBy as string,
      sortOrder: sortOrder as any,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[QC Route] Error fetching inspections:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch QC inspections' });
  }
});

qualityRouter.get('/inspections/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const inspection = await QualityService.getInspectionById(req.params.id, orgId);
    if (!inspection) {
      return res.status(404).json({ error: 'QC Inspection not found' });
    }
    res.json(inspection);
  } catch (err: any) {
    console.error('[QC Route] Error fetching inspection by id:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch QC inspection' });
  }
});

qualityRouter.post('/inspections', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const {
      sourceType,
      sourceId,
      sourceItemId,
      supplierId,
      skuId,
      warehouseId,
      locationId,
      batchNumber,
      manufacturingDate,
      expiryDate,
      receivedQuantity,
      sampleQuantity,
      templateId,
      inspectionType,
      assignedTo,
      assignedToEmail,
    } = req.body;

    if (!skuId || !warehouseId || !receivedQuantity) {
      return res.status(400).json({ error: 'skuId, warehouseId, and receivedQuantity are required.' });
    }

    const created = await QualityService.createInspection({
      organizationId: orgId,
      sourceType,
      sourceId: sourceId || 'MANUAL-INSP',
      sourceItemId,
      supplierId,
      skuId,
      warehouseId,
      locationId,
      batchNumber,
      manufacturingDate,
      expiryDate,
      receivedQuantity: parseFloat(receivedQuantity),
      sampleQuantity: sampleQuantity ? parseFloat(sampleQuantity) : 0,
      templateId,
      inspectionType,
      assignedTo,
      assignedToEmail,
      actorId: actor.id,
      actorEmail: actor.email,
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('[QC Route] Error creating inspection:', err);
    res.status(400).json({ error: err.message || 'Failed to create QC inspection' });
  }
});

qualityRouter.post('/inspections/:id/results', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { items, sampleQuantity, notes } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required.' });
    }

    const updated = await QualityService.submitInspectionResults({
      inspectionId: req.params.id,
      organizationId: orgId,
      items,
      sampleQuantity: sampleQuantity ? parseFloat(sampleQuantity) : undefined,
      notes,
      actorId: actor.id,
      actorEmail: actor.email,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[QC Route] Error submitting test results:', err);
    res.status(400).json({ error: err.message || 'Failed to submit test results' });
  }
});

qualityRouter.post('/inspections/:id/override', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { itemId, overrideResult, overrideReason } = req.body;

    if (!itemId || !overrideResult || !overrideReason) {
      return res.status(400).json({ error: 'itemId, overrideResult, and overrideReason are required.' });
    }

    const updated = await QualityService.overrideItemEvaluation({
      inspectionId: req.params.id,
      itemId,
      organizationId: orgId,
      overrideResult,
      overrideReason,
      actorId: actor.id,
      actorEmail: actor.email,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[QC Route] Error overriding evaluation:', err);
    res.status(400).json({ error: err.message || 'Failed to override evaluation' });
  }
});

qualityRouter.post('/inspections/:id/decision', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const {
      decision,
      rejectionReasonCode,
      decisionReason,
      comments,
      acceptedQuantity,
      rejectedQuantity,
      quarantineQuantity,
    } = req.body;

    if (!decision) {
      return res.status(400).json({ error: 'decision is required ("approved", "rejected", "quarantine").' });
    }

    const result = await QualityService.makeDecision({
      inspectionId: req.params.id,
      organizationId: orgId,
      decision,
      rejectionReasonCode,
      decisionReason,
      comments,
      acceptedQuantity: acceptedQuantity !== undefined ? parseFloat(acceptedQuantity) : undefined,
      rejectedQuantity: rejectedQuantity !== undefined ? parseFloat(rejectedQuantity) : undefined,
      quarantineQuantity: quarantineQuantity !== undefined ? parseFloat(quarantineQuantity) : undefined,
      actorId: actor.id,
      actorEmail: actor.email,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[QC Route] Error executing QC decision:', err);
    res.status(400).json({ error: err.message || 'Failed to execute QC decision' });
  }
});

qualityRouter.post('/inspections/:id/reinspection', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { reinspectionReason } = req.body;

    if (!reinspectionReason) {
      return res.status(400).json({ error: 'reinspectionReason is required.' });
    }

    const created = await QualityService.createReinspection({
      parentInspectionId: req.params.id,
      organizationId: orgId,
      reinspectionReason,
      actorId: actor.id,
      actorEmail: actor.email,
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('[QC Route] Error creating re-inspection:', err);
    res.status(400).json({ error: err.message || 'Failed to create re-inspection' });
  }
});

// ----------------------------------------------------
// 5. QC DOCUMENTS
// ----------------------------------------------------
qualityRouter.post('/inspections/:id/documents', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const { documentName, documentType, fileUrl, fileSizeBytes } = req.body;

    if (!documentName || !documentType || !fileUrl) {
      return res.status(400).json({ error: 'documentName, documentType, and fileUrl are required.' });
    }

    const doc = await QualityService.uploadDocument({
      inspectionId: req.params.id,
      organizationId: orgId,
      documentName,
      documentType,
      fileUrl,
      fileSizeBytes,
      actorId: actor.id,
      actorEmail: actor.email,
    });

    res.status(201).json(doc);
  } catch (err: any) {
    console.error('[QC Route] Error uploading QC document:', err);
    res.status(400).json({ error: err.message || 'Failed to upload document' });
  }
});

qualityRouter.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actor = getActor(req);
    const ok = await QualityService.deleteDocument(req.params.id, orgId, actor.id, actor.email);
    if (!ok) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('[QC Route] Error deleting document:', err);
    res.status(500).json({ error: err.message || 'Failed to delete document' });
  }
});
