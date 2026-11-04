// src/server/analytics-routes.ts
// Phase 35: Central Analytics Engine REST API

import { Router } from 'express';
import { AnalyticsEngineService, CANONICAL_METRICS } from './analytics-engine-service.ts';

export const analyticsRouter = Router();

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
const getOrgId = (req: any) => req.headers['x-organization-id'] || req.user?.organization_id || DEFAULT_ORG_ID;

/**
 * 1. Executive Analytics Overview across all operational domains
 */
analyticsRouter.get('/overview', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const period = (req.query.period as string) || '30d';
    const data = await AnalyticsEngineService.getOverview(orgId, period);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. Canonical Metrics Dictionary
 */
analyticsRouter.get('/metrics', async (req, res) => {
  try {
    const domain = req.query.domain as string;
    const metrics = domain
      ? CANONICAL_METRICS.filter((m) => m.domain === domain)
      : CANONICAL_METRICS;
    res.json({ total: metrics.length, metrics });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. Automated Reconciliation Check
 */
analyticsRouter.get('/reconciliation', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const result = await AnalyticsEngineService.runReconciliation(orgId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

analyticsRouter.post('/reconcile', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const result = await AnalyticsEngineService.runReconciliation(orgId);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
