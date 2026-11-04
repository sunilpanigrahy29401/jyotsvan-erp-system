// src/server/marketplace-hub-routes.ts
// Phase 34: Centralized Multi-Marketplace Hub Routes

import { Router } from 'express';
import { MarketplaceHubService } from './marketplace-hub-service.ts';

export const marketplaceHubRouter = Router();

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

const getOrgId = (req: any) => req.headers['x-organization-id'] || req.user?.organization_id || DEFAULT_ORG_ID;

marketplaceHubRouter.get('/overview', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const data = await MarketplaceHubService.getOverview(orgId, days);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
