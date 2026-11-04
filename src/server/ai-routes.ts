// src/server/ai-routes.ts
// Phase 38-42: Enterprise AI Foundation, Copilot, Insights, Recommendations & Actions Routes

import { Router } from 'express';
import { AiFoundationService } from './ai-foundation-service.ts';
import { AiInsightsService } from './ai-insights-service.ts';
import { AiRecommendationsService } from './ai-recommendations-service.ts';
import { AiActionsService } from './ai-actions-service.ts';

export const aiRouter = Router();

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

const getContext = (req: any) => ({
  organizationId: (req.headers['x-organization-id'] || req.user?.organization_id || DEFAULT_ORG_ID) as string,
  userId: (req.user?.id || 'usr_executive_admin') as string,
  userRole: (req.user?.role || 'super_admin') as string,
  userPermissions: (req.user?.permissions || ['*']) as string[],
});

/**
 * 1. AI Copilot Natural Language Query
 */
aiRouter.post('/copilot/query', async (req, res) => {
  try {
    const ctx = getContext(req);
    const { query, conversationHistory } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query string is required.' });
    }

    const response = await AiFoundationService.processCopilotQuery({ query, conversationHistory }, ctx);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. AI Insights
 */
aiRouter.get('/insights', async (req, res) => {
  try {
    const ctx = getContext(req);
    const status = req.query.status as string;
    const insights = await AiInsightsService.getInsights(ctx.organizationId, status);
    res.json(insights);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.put('/insights/:id/status', async (req, res) => {
  try {
    const ctx = getContext(req);
    const { id } = req.params;
    const { status } = req.body;
    const updated = await AiInsightsService.updateStatus(ctx.organizationId, id, status, ctx.userId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. AI Recommendations
 */
aiRouter.get('/recommendations', async (req, res) => {
  try {
    const ctx = getContext(req);
    const status = req.query.status as string;
    const recommendations = await AiRecommendationsService.getRecommendations(ctx.organizationId, status);
    res.json(recommendations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.put('/recommendations/:id/status', async (req, res) => {
  try {
    const ctx = getContext(req);
    const { id } = req.params;
    const { status } = req.body;
    const updated = await AiRecommendationsService.updateStatus(ctx.organizationId, id, status);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. AI Controlled Actions
 */
aiRouter.get('/actions', async (req, res) => {
  try {
    const ctx = getContext(req);
    const status = req.query.status as string;
    const actions = await AiActionsService.getActions(ctx.organizationId, status);
    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.post('/actions/propose', async (req, res) => {
  try {
    const ctx = getContext(req);
    const action = await AiActionsService.proposeAction(ctx.organizationId, req.body);
    res.json(action);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.post('/actions/:id/approve', async (req, res) => {
  try {
    const ctx = getContext(req);
    const { id } = req.params;
    const approved = await AiActionsService.approveAction(ctx.organizationId, id, ctx.userId, (req as any).user?.email || 'admin@jyotsvan.enterprise');
    res.json(approved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.post('/actions/:id/reject', async (req, res) => {
  try {
    const ctx = getContext(req);
    const { id } = req.params;
    const { reason } = req.body;
    const rejected = await AiActionsService.rejectAction(ctx.organizationId, id, reason, (req as any).user?.email || 'admin@jyotsvan.enterprise');
    res.json(rejected);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.post('/actions/:id/execute', async (req, res) => {
  try {
    const ctx = getContext(req);
    const { id } = req.params;
    const executed = await AiActionsService.executeAction(ctx.organizationId, id, (req as any).user?.email || 'admin@jyotsvan.enterprise');
    res.json(executed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
