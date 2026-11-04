// src/server/reports-routes.ts
// Phase 36: Central Reports Engine REST API

import { Router } from 'express';
import { ReportsEngineService } from './reports-engine-service.ts';

export const reportsRouter = Router();

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
const getOrgId = (req: any) => req.headers['x-organization-id'] || req.user?.organization_id || DEFAULT_ORG_ID;

/**
 * 1. Get List of all Available Standard Reports in Catalogue
 */
reportsRouter.get('/catalogue', (req, res) => {
  const catalogue = ReportsEngineService.getCatalogue();
  res.json({ total: catalogue.length, reports: catalogue });
});

/**
 * 2. Execute a Specific Report by ID with Filter Parameters
 */
reportsRouter.get('/execute/:reportId', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { reportId } = req.params;
    const result = await ReportsEngineService.executeReport(orgId, reportId, req.query);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. Export Report to CSV Format
 */
reportsRouter.get('/export/:reportId', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { reportId } = req.params;
    const data = await ReportsEngineService.executeReport(orgId, reportId, req.query);
    const csv = ReportsEngineService.generateCsv(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${reportId}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
