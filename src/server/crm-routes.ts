// src/server/crm-routes.ts
// Express REST API Router for Jyotsvan CRM Subsystem

import { Router, Request, Response } from 'express';
import { CrmService } from './crm-service.ts';

export const crmRouter = Router();

// Context extractor
function getContext(req: Request) {
  const orgId = (req.headers['x-organization-id'] as string) || (req.query.org_id as string) || 'org-jyotsvan-corp';
  const actorId = (req.headers['x-user-id'] as string) || 'usr-super-admin';
  const actorEmail = (req.headers['x-user-email'] as string) || 'admin@jyotsvan.enterprise';
  return { orgId, actor: { id: actorId, email: actorEmail } };
}

// 1. Dashboard
crmRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const metrics = await CrmService.getDashboardMetrics(orgId);
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Leads Endpoints
crmRouter.get('/leads', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const filters = {
      search: req.query.search as string,
      status: req.query.status as string,
      source_id: req.query.source_id as string,
      assigned_employee_id: req.query.assigned_employee_id as string,
      priority: req.query.priority as string,
      relationship_type: req.query.relationship_type as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    };
    const result = await CrmService.getLeads(orgId, filters);
    res.json({ success: true, data: result.leads, total: result.total });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

crmRouter.get('/leads/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const lead = await CrmService.getLeadById(orgId, req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found.' });
    res.json({ success: true, data: lead });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

crmRouter.post('/leads', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const lead = await CrmService.createLead(orgId, req.body, actor);
    res.status(201).json({ success: true, data: lead });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

crmRouter.put('/leads/:id', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const lead = await CrmService.updateLead(orgId, req.params.id, req.body, actor);
    res.json({ success: true, data: lead });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

crmRouter.patch('/leads/:id/assign', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { employee_id, team } = req.body;
    const lead = await CrmService.updateLead(orgId, req.params.id, {
      assigned_employee_id: employee_id,
      assigned_team: team,
      status: 'assigned',
    }, actor);
    res.json({ success: true, data: lead });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

crmRouter.post('/leads/:id/convert', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const result = await CrmService.convertLead(orgId, req.params.id, req.body, actor);
    res.json({ success: true, data: result, message: 'Lead converted successfully.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. Accounts & Contacts Endpoints
crmRouter.get('/accounts', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const filters = {
      search: req.query.search as string,
      relationship_type: req.query.relationship_type as string,
      tier: req.query.tier as string,
      status: req.query.status as string,
    };
    const accounts = await CrmService.getAccounts(orgId, filters);
    res.json({ success: true, data: accounts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

crmRouter.post('/accounts', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const account = await CrmService.createAccount(orgId, req.body, actor);
    res.status(201).json({ success: true, data: account });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

crmRouter.get('/contacts', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const accountId = req.query.account_id as string;
    const contacts = await CrmService.getContacts(orgId, accountId);
    res.json({ success: true, data: contacts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

crmRouter.post('/contacts', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const contact = await CrmService.createContact(orgId, req.body);
    res.status(201).json({ success: true, data: contact });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Pipelines & Deals
crmRouter.get('/pipelines', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const pipelines = await CrmService.getPipelines(orgId);
    res.json({ success: true, data: pipelines });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

crmRouter.get('/deals', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const pipelineId = req.query.pipeline_id as string;
    const deals = await CrmService.getDeals(orgId, pipelineId);
    res.json({ success: true, data: deals });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

crmRouter.post('/deals', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const deal = await CrmService.createDeal(orgId, req.body, actor);
    res.status(201).json({ success: true, data: deal });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

crmRouter.patch('/deals/:id/stage', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const { stage_id, notes } = req.body;
    const deal = await CrmService.updateDealStage(orgId, req.params.id, stage_id, notes, actor);
    res.json({ success: true, data: deal });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

crmRouter.post('/deals/:id/handoff', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const handoff = await CrmService.createSalesHandoff(orgId, req.params.id, req.body, actor);
    res.json({ success: true, data: handoff, message: 'Sales handoff created and queued for review.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Activities Endpoints
crmRouter.get('/activities', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const filters = {
      lead_id: req.query.lead_id as string,
      account_id: req.query.account_id as string,
      deal_id: req.query.deal_id as string,
      is_completed: req.query.is_completed !== undefined ? req.query.is_completed === 'true' : undefined,
    };
    const activities = await CrmService.getActivities(orgId, filters);
    res.json({ success: true, data: activities });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

crmRouter.post('/activities', async (req: Request, res: Response) => {
  try {
    const { orgId, actor } = getContext(req);
    const activity = await CrmService.createActivity(orgId, req.body, actor);
    res.status(201).json({ success: true, data: activity });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

crmRouter.patch('/activities/:id/complete', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const { outcome, outcome_notes } = req.body;
    const activity = await CrmService.completeActivity(orgId, req.params.id, outcome, outcome_notes);
    res.json({ success: true, data: activity });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. Integrations & Public Webhooks
crmRouter.get('/integrations', async (req: Request, res: Response) => {
  try {
    const { orgId } = getContext(req);
    const configs = await CrmService.getIntegrationConfigs(orgId);
    res.json({ success: true, data: configs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public Lead Ingestion Webhook Endpoint (Webform, Meta, Google, IndiaMART)
crmRouter.post('/webhooks/inbound', async (req: Request, res: Response) => {
  try {
    const orgId = (req.headers['x-organization-id'] as string) || 'org-jyotsvan-corp';
    const sourceKey = (req.query.source as string) || req.body.source || 'webform';
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '';

    const result = await CrmService.ingestInboundLead(orgId, sourceKey, req.body, ip);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
