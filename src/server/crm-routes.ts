// CRM REST API. Authentication, permission (crm.*) and tenant forcing happen in the /api middleware chain; every handler reads the
// tenant and actor from req.auth via ctx(). Only /webhooks/inbound and /public/unsubscribe are unauthenticated (own verification).
import crypto from 'crypto';
import express, { Router } from 'express';
import { pool } from './db.ts';
import { allowUnsignedWebhooks } from './core/webhook-guard.ts';
import { rateLimit } from './core/middleware.ts';
import { writeAudit } from './core/audit.ts';
import { CrmError, csvToLeadRows, pageOf } from './crm-core.ts';
import { ctx, list, route } from './crm-http.ts';
import { ensureCrmDefaults } from './crm-defaults.ts';
import { CrmLeads, LEAD_STATUSES } from './crm-leads.ts';
import { CrmAccounts, DOC_TYPES } from './crm-accounts.ts';
import { CrmDeals } from './crm-deals.ts';
import { CrmActivities, ACTIVITY_TYPES } from './crm-activities.ts';
import { CrmQuotes } from './crm-quotes.ts';
import { CrmSupport } from './crm-support.ts';
import { CrmMarketing, readUnsubscribeToken } from './crm-marketing.ts';
import { CrmConfig } from './crm-config.ts';
import { CrmReports } from './crm-reports.ts';
import { ingestLead } from './crm-ingest.ts';

export const crmRouter = Router();

// ---- public endpoints (no session) ---------------------------------------------------------------------------------------
crmRouter.post('/webhooks/inbound', rateLimit({ windowMs: 60_000, max: 120 }), async (req, res) => {
  try {
    // Shared ingest key, constant-time compare; the caller can never choose the tenant.
    const expected = process.env.CRM_INGEST_KEY || '';
    const provided = String(req.headers['x-ingest-key'] || req.query.key || '');
    const keyOk = expected.length >= 16 && provided.length === expected.length && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!keyOk && !allowUnsignedWebhooks()) return res.status(401).json({ success: false, message: 'Invalid or missing ingest key.' });
    const orgId = process.env.CRM_INGEST_ORG_ID || (await pool.query('SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1')).rows[0]?.id;
    if (!orgId) return res.status(503).json({ success: false, message: 'No organization configured.' });
    const source = String(req.query.source || req.body?.source || 'webform').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 48) || 'webform';
    const result = await ingestLead(orgId, source, req.body || {}, String(req.ip || ''));
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (e: any) {
    if (e instanceof CrmError) return res.status(e.status).json({ success: false, message: e.message, code: e.code });
    console.error('[CRM] inbound webhook failed', e?.message);
    res.status(500).json({ success: false, message: 'Lead ingestion failed.' });
  }
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
crmRouter.get('/public/unsubscribe', rateLimit({ windowMs: 60_000, max: 60 }), (req, res) => {
  // A GET never changes state (mail scanners prefetch links): it only shows a confirmation form.
  const token = String(req.query.t || '');
  let ok = true;
  try { readUnsubscribeToken(token); } catch { ok = false; }
  res.set('Content-Type', 'text/html; charset=utf-8').set('Cache-Control', 'no-store').set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");
  res.send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title>
<body style="font-family:system-ui;max-width:28rem;margin:4rem auto;padding:0 1rem">${ok
    ? `<h1>Unsubscribe</h1><p>Confirm that you no longer want to receive marketing messages from us.</p><form method="post" action="/api/crm/public/unsubscribe"><input type="hidden" name="t" value="${esc(token)}"><button style="padding:.6rem 1.2rem">Unsubscribe</button></form>`
    : '<h1>Link not valid</h1><p>This unsubscribe link is invalid or has expired.</p>'}</body>`);
});
crmRouter.post('/public/unsubscribe', rateLimit({ windowMs: 60_000, max: 30 }), express.urlencoded({ extended: false, limit: '8kb' }), async (req, res) => {
  try {
    const token = String(req.body?.t || req.body?.token || req.query.t || '');
    const r = await CrmMarketing.unsubscribe(token, String(req.ip || ''));
    if (String(req.headers.accept || '').includes('text/html') || req.is('application/x-www-form-urlencoded')) {
      return res.type('html').send('<!doctype html><meta charset="utf-8"><title>Unsubscribed</title><body style="font-family:system-ui;max-width:28rem;margin:4rem auto"><h1>You have been unsubscribed.</h1></body>');
    }
    res.json({ success: true, data: r });
  } catch (e: any) {
    if (e instanceof CrmError) return res.status(e.status).json({ success: false, error: e.message, code: e.code });
    res.status(500).json({ success: false, error: 'Could not process the request.' });
  }
});

// ---- everything below is authenticated -----------------------------------------------------------------------------------------
crmRouter.use(async (req, res, next) => {
  try {
    if (req.auth) await ensureCrmDefaults(req.auth.organizationId);
    next();
  } catch (e: any) {
    console.error('[CRM] defaults failed', e?.message);
    res.status(500).json({ success: false, error: 'CRM is not available right now.' });
  }
});

const audit = (req: any, action: string, resource: string, id: string, details: Record<string, unknown> = {}) => {
  const { orgId, actor } = ctx(req);
  void writeAudit({ organizationId: orgId, actorId: actor.id, actorEmail: actor.email, action, targetResource: resource, targetId: id, details });
};

/** Validates and normalises custom_fields in place against the tenant's field definitions. */
async function custom(req: any, entity: 'lead' | 'contact' | 'account' | 'deal', creating: boolean) {
  const { orgId } = ctx(req);
  const v = await CrmConfig.customFields.validate(orgId, entity, req.body?.custom_fields, creating);
  if (v !== undefined) req.body.custom_fields = v;
}

// ===== dashboard & reports ===================================================================================================
crmRouter.get('/dashboard', route((req) => CrmReports.dashboard(ctx(req).orgId)));
crmRouter.get('/reports/funnel', route((req) => CrmReports.funnel(ctx(req).orgId, req.query.from as string, req.query.to as string)));
crmRouter.get('/reports/forecast', route((req) => CrmReports.forecast(ctx(req).orgId, req.query.pipeline_id as string)));
crmRouter.get('/reports/win-loss', route((req) => CrmReports.winLoss(ctx(req).orgId, req.query.from as string, req.query.to as string)));
crmRouter.get('/reports/sources', route((req) => CrmReports.sourcePerformance(ctx(req).orgId)));
crmRouter.get('/reports/reps', route((req) => CrmReports.repPerformance(ctx(req).orgId)));

// ===== leads =====================================================================================================================
crmRouter.get('/leads/meta', route(() => ({ statuses: LEAD_STATUSES })));
crmRouter.get('/leads/export', async (req, res) => {
  try {
    const { orgId } = ctx(req);
    const csv = await CrmLeads.exportCsv(orgId, { status: req.query.status as string, source_id: req.query.source_id as string, assigned_employee_id: req.query.assigned_employee_id as string });
    audit(req, 'crm.leads.export', 'crm_leads', 'export');
    res.set('Content-Type', 'text/csv; charset=utf-8').set('Content-Disposition', 'attachment; filename="leads.csv"').send(csv);
  } catch (e: any) { res.status(e instanceof CrmError ? e.status : 500).json({ success: false, error: e instanceof CrmError ? e.message : 'Export failed.' }); }
});
crmRouter.get('/leads/duplicates', route((req) => CrmLeads.duplicateGroups(ctx(req).orgId)));
crmRouter.get('/leads/sla-breaches', route((req) => CrmLeads.slaBreaches(ctx(req).orgId)));
crmRouter.get('/leads', route(async (req) => {
  const { orgId } = ctx(req);
  const p = pageOf(req.query as any);
  const r = await CrmLeads.list(orgId, req.query as any, p);
  return list(r.rows, { total: r.total, page: p.page, limit: p.limit });
}));
crmRouter.get('/leads/:id', route((req) => CrmLeads.get(ctx(req).orgId, req.params.id)));
crmRouter.get('/leads/:id/duplicates', route((req) => CrmLeads.duplicatesOf(ctx(req).orgId, req.params.id)));
crmRouter.get('/leads/:id/timeline', route((req) => CrmActivities.timeline(ctx(req).orgId, 'lead', req.params.id)));
crmRouter.post('/leads', route(async (req) => {
  const { orgId, actor } = ctx(req);
  await custom(req, 'lead', true);
  const lead = await CrmLeads.create(orgId, req.body || {}, actor);
  audit(req, 'crm.lead.create', 'crm_leads', lead.id);
  return lead;
}, 201));
crmRouter.post('/leads/merge', route(async (req) => {
  const { orgId, actor } = ctx(req);
  const r = await CrmLeads.merge(orgId, String(req.body?.survivor_id || ''), req.body?.merge_ids || [], actor);
  audit(req, 'crm.lead.merge', 'crm_leads', r.id, { merged: req.body?.merge_ids });
  return r;
}));
crmRouter.post('/leads/bulk', route(async (req) => {
  const { orgId, actor } = ctx(req);
  const r = await CrmLeads.bulk(orgId, String(req.body?.action || ''), req.body?.ids, req.body || {}, actor);
  audit(req, `crm.lead.bulk.${req.body?.action}`, 'crm_leads', 'bulk', { done: r.done, skipped: r.skipped.length });
  return r;
}));
crmRouter.post('/leads/auto-assign', route(async (req) => { const { orgId, actor } = ctx(req); return CrmLeads.autoAssign(orgId, actor); }));
crmRouter.post('/leads/import', route(async (req) => {
  const { orgId, actor } = ctx(req);
  const body = req.body || {};
  let rows: Record<string, any>[] = Array.isArray(body.rows) ? body.rows : [];
  let unknown: string[] = [];
  if (!rows.length && typeof body.csv === 'string') ({ rows, unknown_columns: unknown } = csvToLeadRows(body.csv));
  // Source names in the file are resolved to this tenant's source ids.
  const sources = (await pool.query(`SELECT id, name, code FROM crm_lead_sources WHERE organization_id = $1`, [orgId])).rows;
  rows = rows.map((r) => {
    const { source_name, ...rest } = r;
    const s = source_name ? sources.find((x: any) => [x.name, x.code].some((v: string) => v.toLowerCase() === String(source_name).toLowerCase())) : null;
    return s ? { ...rest, source_id: s.id } : rest;
  });
  const defaultSource = sources.find((s: any) => s.code === 'csv_import')?.id;
  const out = await CrmLeads.import(orgId, rows, { mode: body.mode === 'update' ? 'update' : 'skip', filename: body.filename, source_id: body.source_id || defaultSource }, actor);
  audit(req, 'crm.lead.import', 'crm_import_batches', out.batch_id, { created: out.created, updated: out.updated, failed: out.failed });
  return { ...out, unknown_columns: unknown };
}));
crmRouter.get('/imports', route(async (req) => (await pool.query(`SELECT * FROM crm_import_batches WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 50`, [ctx(req).orgId])).rows));
crmRouter.put('/leads/:id', route(async (req) => { const { orgId, actor } = ctx(req); await custom(req, 'lead', false); return CrmLeads.update(orgId, req.params.id, req.body || {}, actor); }));
crmRouter.patch('/leads/:id', route(async (req) => { const { orgId, actor } = ctx(req); await custom(req, 'lead', false); return CrmLeads.update(orgId, req.params.id, req.body || {}, actor); }));
crmRouter.patch('/leads/:id/assign', route(async (req) => {
  const { orgId, actor } = ctx(req);
  if (!req.body?.employee_id) throw new CrmError('employee_id is required.', 400, 'EMPLOYEE_REQUIRED');
  const lead = await CrmLeads.update(orgId, req.params.id, { assigned_employee_id: req.body.employee_id, assigned_team: req.body.team }, actor);
  audit(req, 'crm.lead.assign', 'crm_leads', lead.id, { employee_id: req.body.employee_id });
  return lead;
}));
crmRouter.post('/leads/:id/convert', route(async (req) => {
  const { orgId, actor } = ctx(req);
  const r = await CrmLeads.convert(orgId, req.params.id, req.body || {}, actor);
  audit(req, 'crm.lead.convert', 'crm_leads', req.params.id, { account_id: r.account.id, deal_id: r.deal?.id });
  return r;
}));
crmRouter.post('/leads/:id/restore', route(async (req) => { const { orgId, actor } = ctx(req); return CrmLeads.restore(orgId, req.params.id, actor); }));
crmRouter.delete('/leads/:id', route(async (req) => {
  const { orgId, actor } = ctx(req);
  const r = await CrmLeads.archive(orgId, req.params.id, actor, req.body?.reason || (req.query.reason as string));
  audit(req, 'crm.lead.archive', 'crm_leads', req.params.id);
  return r;
}));
crmRouter.delete('/leads/:id/purge', route(async (req) => { const r = await CrmLeads.purge(ctx(req).orgId, req.params.id); audit(req, 'crm.lead.purge', 'crm_leads', req.params.id); return r; }));

// ===== accounts, contacts, KYC, visits, customer 360 ===========================================================================
crmRouter.get('/accounts', route(async (req) => { const p = pageOf(req.query as any); const r = await CrmAccounts.list(ctx(req).orgId, req.query as any, p); return list(r.rows, { total: r.total, page: p.page, limit: p.limit }); }));
crmRouter.get('/accounts/:id', route((req) => CrmAccounts.get(ctx(req).orgId, req.params.id)));
crmRouter.get('/accounts/:id/360', route((req) => CrmAccounts.customer360(ctx(req).orgId, req.params.id)));
crmRouter.get('/accounts/:id/timeline', route((req) => CrmActivities.timeline(ctx(req).orgId, 'account', req.params.id)));
crmRouter.post('/accounts', route(async (req) => { const { orgId, actor } = ctx(req); await custom(req, 'account', true); const a = await CrmAccounts.create(orgId, req.body || {}, actor); audit(req, 'crm.account.create', 'crm_accounts', a.id); return a; }, 201));
crmRouter.put('/accounts/:id', route(async (req) => { await custom(req, 'account', false); return CrmAccounts.update(ctx(req).orgId, req.params.id, req.body || {}); }));
crmRouter.patch('/accounts/:id', route(async (req) => { await custom(req, 'account', false); return CrmAccounts.update(ctx(req).orgId, req.params.id, req.body || {}); }));
crmRouter.delete('/accounts/:id', route(async (req) => { const r = await CrmAccounts.archive(ctx(req).orgId, req.params.id); audit(req, 'crm.account.archive', 'crm_accounts', req.params.id); return r; }));
crmRouter.post('/accounts/:id/restore', route((req) => CrmAccounts.restore(ctx(req).orgId, req.params.id)));
crmRouter.get('/accounts/:id/documents', route((req) => CrmAccounts.listDocuments(ctx(req).orgId, req.params.id)));
crmRouter.get('/documents/meta', route(() => ({ doc_types: DOC_TYPES })));
crmRouter.post('/accounts/:id/documents', route((req) => { const { orgId, actor } = ctx(req); return CrmAccounts.addDocument(orgId, req.params.id, req.body || {}, actor); }, 201));
crmRouter.patch('/documents/:id', route((req) => { const { orgId, actor } = ctx(req); return CrmAccounts.reviewDocument(orgId, req.params.id, req.body || {}, actor); }));
crmRouter.post('/accounts/:id/verify-kyc', route(async (req) => { const { orgId, actor } = ctx(req); const r = await CrmAccounts.verifyKyc(orgId, req.params.id, actor); audit(req, 'crm.account.kyc_verified', 'crm_accounts', req.params.id); return r; }));

crmRouter.get('/contacts', route(async (req) => { const p = pageOf(req.query as any); const r = await CrmAccounts.listContacts(ctx(req).orgId, req.query as any, p); return list(r.rows, { total: r.total, page: p.page, limit: p.limit }); }));
crmRouter.post('/contacts', route(async (req) => { await custom(req, 'contact', true); return CrmAccounts.createContact(ctx(req).orgId, req.body || {}); }, 201));
crmRouter.put('/contacts/:id', route(async (req) => { await custom(req, 'contact', false); return CrmAccounts.updateContact(ctx(req).orgId, req.params.id, req.body || {}); }));
crmRouter.patch('/contacts/:id', route(async (req) => { await custom(req, 'contact', false); return CrmAccounts.updateContact(ctx(req).orgId, req.params.id, req.body || {}); }));
crmRouter.delete('/contacts/:id', route((req) => CrmAccounts.archiveContact(ctx(req).orgId, req.params.id)));

crmRouter.get('/visits', route(async (req) => { const p = pageOf(req.query as any); const r = await CrmAccounts.listVisits(ctx(req).orgId, req.query as any, p); return list(r.rows, { total: r.total, page: p.page, limit: p.limit }); }));
crmRouter.post('/visits', route((req) => { const { orgId, actor } = ctx(req); return CrmAccounts.createVisit(orgId, req.body || {}, actor); }, 201));
crmRouter.post('/visits/:id/check-in', route((req) => CrmAccounts.checkIn(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.post('/visits/:id/check-out', route((req) => CrmAccounts.checkOut(ctx(req).orgId, req.params.id, req.body || {})));

// ===== pipelines & deals ============================================================================================================
crmRouter.get('/pipelines', route((req) => CrmDeals.listPipelines(ctx(req).orgId, req.query.include_inactive === 'true')));
crmRouter.post('/pipelines', route((req) => CrmDeals.createPipeline(ctx(req).orgId, req.body || {}), 201));
crmRouter.put('/pipelines/:id', route((req) => CrmDeals.updatePipeline(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.patch('/pipelines/:id', route((req) => CrmDeals.updatePipeline(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/pipelines/:id', route((req) => CrmDeals.deletePipeline(ctx(req).orgId, req.params.id)));
crmRouter.get('/pipelines/:id/board', route((req) => CrmDeals.board(ctx(req).orgId, req.params.id, req.query.owner_employee_id as string)));
crmRouter.post('/pipelines/:id/stages', route((req) => CrmDeals.addStage(ctx(req).orgId, req.params.id, req.body || {}), 201));
crmRouter.put('/pipelines/:id/stages/order', route((req) => CrmDeals.reorderStages(ctx(req).orgId, req.params.id, req.body?.stage_ids)));
crmRouter.patch('/stages/:id', route((req) => CrmDeals.updateStage(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/stages/:id', route((req) => CrmDeals.deleteStage(ctx(req).orgId, req.params.id)));

crmRouter.get('/deals', route(async (req) => { const p = pageOf(req.query as any, 500); const r = await CrmDeals.list(ctx(req).orgId, req.query as any, p); return list(r.rows, { total: r.total, page: p.page, limit: p.limit }); }));
crmRouter.get('/deals/:id', route((req) => CrmDeals.get(ctx(req).orgId, req.params.id)));
crmRouter.get('/deals/:id/timeline', route((req) => CrmActivities.timeline(ctx(req).orgId, 'deal', req.params.id)));
crmRouter.post('/deals', route(async (req) => { const { orgId, actor } = ctx(req); await custom(req, 'deal', true); const d = await CrmDeals.create(orgId, req.body || {}, actor); audit(req, 'crm.deal.create', 'crm_deals', d.id); return d; }, 201));
crmRouter.put('/deals/:id', route(async (req) => { await custom(req, 'deal', false); return CrmDeals.update(ctx(req).orgId, req.params.id, req.body || {}); }));
crmRouter.patch('/deals/:id', route(async (req) => { await custom(req, 'deal', false); return CrmDeals.update(ctx(req).orgId, req.params.id, req.body || {}); }));
crmRouter.patch('/deals/:id/stage', route(async (req) => { const { orgId, actor } = ctx(req); const d = await CrmDeals.moveStage(orgId, req.params.id, req.body?.stage_id, req.body || {}, actor); audit(req, 'crm.deal.stage', 'crm_deals', d.id, { stage_id: d.stage_id, status: d.status }); return d; }));
crmRouter.put('/deals/:id/items', route((req) => CrmDeals.setItems(ctx(req).orgId, req.params.id, req.body?.items, req.body?.sync_value !== false)));
crmRouter.delete('/deals/:id', route((req) => CrmDeals.archive(ctx(req).orgId, req.params.id)));
crmRouter.post('/deals/:id/restore', route((req) => CrmDeals.restore(ctx(req).orgId, req.params.id)));
crmRouter.post('/deals/:id/handoff', route(async (req) => { const { orgId, actor } = ctx(req); const h = await CrmDeals.createHandoff(orgId, req.params.id, req.body || {}, actor); audit(req, 'crm.deal.handoff', 'crm_deal_handoffs', h.id); return h; }));
crmRouter.get('/handoffs', route((req) => CrmDeals.listHandoffs(ctx(req).orgId, req.query.status as string)));
crmRouter.post('/handoffs/:id/approve', route((req) => { const { orgId, actor } = ctx(req); return CrmDeals.reviewHandoff(orgId, req.params.id, 'approved', req.body?.note, actor); }));
crmRouter.post('/handoffs/:id/reject', route((req) => { const { orgId, actor } = ctx(req); return CrmDeals.reviewHandoff(orgId, req.params.id, 'rejected', req.body?.note, actor); }));

// ===== quotations =====================================================================================================================
crmRouter.get('/quotes', route(async (req) => { const { orgId } = ctx(req); await CrmQuotes.expireStale(orgId); const p = pageOf(req.query as any); const r = await CrmQuotes.list(orgId, req.query as any, p); return list(r.rows, { total: r.total, page: p.page, limit: p.limit }); }));
crmRouter.get('/quotes/:id', route((req) => CrmQuotes.get(ctx(req).orgId, req.params.id)));
crmRouter.post('/quotes', route((req) => { const { orgId, actor } = ctx(req); return CrmQuotes.create(orgId, req.body || {}, actor); }, 201));
crmRouter.put('/quotes/:id', route((req) => CrmQuotes.update(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.post('/quotes/:id/send', route((req) => CrmQuotes.transition(ctx(req).orgId, req.params.id, 'sent')));
crmRouter.post('/quotes/:id/accept', route((req) => CrmQuotes.transition(ctx(req).orgId, req.params.id, 'accepted', req.body?.note)));
crmRouter.post('/quotes/:id/reject', route((req) => CrmQuotes.transition(ctx(req).orgId, req.params.id, 'rejected', req.body?.note)));
crmRouter.post('/quotes/:id/clone', route((req) => { const { orgId, actor } = ctx(req); return CrmQuotes.clone(orgId, req.params.id, actor); }, 201));
crmRouter.delete('/quotes/:id', route((req) => CrmQuotes.archive(ctx(req).orgId, req.params.id)));

// ===== activities & notes ===============================================================================================================
crmRouter.get('/activities/meta', route(() => ({ types: ACTIVITY_TYPES })));
crmRouter.get('/activities/reminders', route((req) => CrmActivities.reminders(ctx(req).orgId, req.query.employee_id as string)));
crmRouter.post('/activities/reminders/ack', route((req) => CrmActivities.ackReminders(ctx(req).orgId, req.body?.ids)));
crmRouter.get('/activities/calendar.ics', async (req, res) => {
  try { const ics = await CrmActivities.icsFeed(ctx(req).orgId, req.query.employee_id as string); res.set('Content-Type', 'text/calendar; charset=utf-8').set('Content-Disposition', 'attachment; filename="crm-activities.ics"').send(ics); }
  catch (e: any) { res.status(e instanceof CrmError ? e.status : 500).json({ success: false, error: e instanceof CrmError ? e.message : 'Calendar export failed.' }); }
});
crmRouter.get('/activities', route(async (req) => { const p = pageOf(req.query as any, 500); const r = await CrmActivities.list(ctx(req).orgId, req.query as any, p); return list(r.rows, { total: r.total, page: p.page, limit: p.limit }); }));
crmRouter.get('/activities/:id', route((req) => CrmActivities.get(ctx(req).orgId, req.params.id)));
crmRouter.post('/activities', route((req) => { const { orgId, actor } = ctx(req); return CrmActivities.create(orgId, req.body || {}, actor); }, 201));
crmRouter.put('/activities/:id', route((req) => CrmActivities.update(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.patch('/activities/:id', route((req) => CrmActivities.update(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.patch('/activities/:id/complete', route((req) => { const { orgId, actor } = ctx(req); return CrmActivities.complete(orgId, req.params.id, req.body || {}, actor); }));
crmRouter.post('/activities/:id/reopen', route((req) => CrmActivities.reopen(ctx(req).orgId, req.params.id)));
crmRouter.delete('/activities/:id', route((req) => CrmActivities.remove(ctx(req).orgId, req.params.id)));
crmRouter.get('/notes', route((req) => CrmActivities.listNotes(ctx(req).orgId, req.query as any)));
crmRouter.post('/notes', route((req) => { const { orgId, actor } = ctx(req); return CrmActivities.createNote(orgId, req.body || {}, actor); }, 201));
crmRouter.patch('/notes/:id', route((req) => CrmActivities.updateNote(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/notes/:id', route((req) => CrmActivities.deleteNote(ctx(req).orgId, req.params.id)));

// ===== helpdesk & knowledge base =========================================================================================================
crmRouter.get('/tickets/stats', route((req) => CrmSupport.stats(ctx(req).orgId)));
crmRouter.get('/tickets/categories', route((req) => CrmSupport.categories(ctx(req).orgId)));
crmRouter.post('/tickets/categories', route((req) => CrmSupport.createCategory(ctx(req).orgId, req.body || {}), 201));
crmRouter.delete('/tickets/categories/:id', route((req) => CrmSupport.deleteCategory(ctx(req).orgId, req.params.id)));
crmRouter.post('/tickets/escalate', route((req) => CrmSupport.sweep(ctx(req).orgId)));
crmRouter.get('/tickets', route(async (req) => { const p = pageOf(req.query as any); const r = await CrmSupport.list(ctx(req).orgId, req.query as any, p); return list(r.rows, { total: r.total, page: p.page, limit: p.limit }); }));
crmRouter.get('/tickets/:id', route((req) => CrmSupport.get(ctx(req).orgId, req.params.id)));
crmRouter.post('/tickets', route((req) => { const { orgId, actor } = ctx(req); return CrmSupport.create(orgId, req.body || {}, actor); }, 201));
crmRouter.put('/tickets/:id', route((req) => CrmSupport.update(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.patch('/tickets/:id', route((req) => CrmSupport.update(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.patch('/tickets/:id/status', route((req) => { const { orgId, actor } = ctx(req); return CrmSupport.setStatus(orgId, req.params.id, req.body?.status, actor, req.body?.note); }));
crmRouter.post('/tickets/:id/comments', route((req) => { const { orgId, actor } = ctx(req); return CrmSupport.addComment(orgId, req.params.id, req.body || {}, actor); }, 201));
crmRouter.post('/tickets/:id/csat', route((req) => CrmSupport.rate(ctx(req).orgId, req.params.id, Number(req.body?.score), req.body?.comment)));

crmRouter.get('/kb', route((req) => CrmSupport.kbList(ctx(req).orgId, req.query as any)));
crmRouter.get('/kb/:id', route((req) => CrmSupport.kbGet(ctx(req).orgId, req.params.id, true)));
crmRouter.post('/kb', route((req) => { const { orgId, actor } = ctx(req); return CrmSupport.kbCreate(orgId, req.body || {}, actor); }, 201));
crmRouter.put('/kb/:id', route((req) => CrmSupport.kbUpdate(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/kb/:id', route((req) => CrmSupport.kbDelete(ctx(req).orgId, req.params.id)));
crmRouter.post('/kb/:id/feedback', route((req) => CrmSupport.kbFeedback(ctx(req).orgId, req.params.id, Boolean(req.body?.helpful))));

// ===== consent, templates, audiences, campaigns, sequences ===============================================================================
crmRouter.get('/consent/:type/:id', route((req) => CrmMarketing.consentState(ctx(req).orgId, req.params.type, req.params.id)));
crmRouter.post('/consent', route((req) => { const { orgId, actor } = ctx(req); return CrmMarketing.recordConsent(orgId, req.body || {}, actor, String(req.ip || '')); }, 201));
crmRouter.get('/suppressions', route((req) => CrmMarketing.listSuppressions(ctx(req).orgId, req.query.channel as string)));
crmRouter.post('/suppressions', route((req) => CrmMarketing.addSuppression(ctx(req).orgId, req.body || {}), 201));
crmRouter.delete('/suppressions/:id', route((req) => CrmMarketing.removeSuppression(ctx(req).orgId, req.params.id)));

crmRouter.get('/templates/meta', route(() => CrmMarketing.meta()));
crmRouter.get('/templates', route((req) => CrmMarketing.listTemplates(ctx(req).orgId, req.query.channel as string)));
crmRouter.post('/templates', route((req) => { const { orgId, actor } = ctx(req); return CrmMarketing.createTemplate(orgId, req.body || {}, actor); }, 201));
crmRouter.patch('/templates/:id', route((req) => CrmMarketing.updateTemplate(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/templates/:id', route((req) => CrmMarketing.deleteTemplate(ctx(req).orgId, req.params.id)));
crmRouter.post('/templates/:id/preview', route((req) => CrmMarketing.preview(ctx(req).orgId, req.params.id, req.body?.entity === 'contact' ? 'contact' : 'lead', String(req.body?.entity_id || ''))));

crmRouter.get('/audiences', route((req) => CrmMarketing.listAudiences(ctx(req).orgId)));
crmRouter.post('/audiences', route((req) => { const { orgId, actor } = ctx(req); return CrmMarketing.createAudience(orgId, req.body || {}, actor); }, 201));
crmRouter.patch('/audiences/:id', route((req) => CrmMarketing.updateAudience(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/audiences/:id', route((req) => CrmMarketing.deleteAudience(ctx(req).orgId, req.params.id)));
crmRouter.get('/audiences/:id/preview', route((req) => CrmMarketing.audiencePreview(ctx(req).orgId, req.params.id, String(req.query.channel || 'email'))));

crmRouter.get('/campaigns', route((req) => CrmMarketing.listCampaigns(ctx(req).orgId)));
crmRouter.get('/campaigns/:id', route((req) => CrmMarketing.getCampaign(ctx(req).orgId, req.params.id)));
crmRouter.post('/campaigns', route((req) => { const { orgId, actor } = ctx(req); return CrmMarketing.createCampaign(orgId, req.body || {}, actor); }, 201));
crmRouter.post('/campaigns/:id/launch', route(async (req) => { const r = await CrmMarketing.launchCampaign(ctx(req).orgId, req.params.id); audit(req, 'crm.campaign.launch', 'crm_campaigns', req.params.id, { queued: (r.stats as any)?.queued }); return r; }));
crmRouter.post('/campaigns/:id/cancel', route((req) => CrmMarketing.cancelCampaign(ctx(req).orgId, req.params.id)));
crmRouter.delete('/campaigns/:id', route((req) => CrmMarketing.deleteCampaign(ctx(req).orgId, req.params.id)));
crmRouter.get('/campaigns/:id/recipients.csv', async (req, res) => {
  try { const csv = await CrmMarketing.exportRecipients(ctx(req).orgId, req.params.id); res.set('Content-Type', 'text/csv; charset=utf-8').set('Content-Disposition', 'attachment; filename="campaign-recipients.csv"').send(csv); }
  catch (e: any) { res.status(e instanceof CrmError ? e.status : 500).json({ success: false, error: e instanceof CrmError ? e.message : 'Export failed.' }); }
});

crmRouter.get('/sequences', route((req) => CrmMarketing.listSequences(ctx(req).orgId)));
crmRouter.post('/sequences', route((req) => { const { orgId, actor } = ctx(req); return CrmMarketing.createSequence(orgId, req.body || {}, actor); }, 201));
crmRouter.patch('/sequences/:id', route((req) => CrmMarketing.updateSequence(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/sequences/:id', route((req) => CrmMarketing.deleteSequence(ctx(req).orgId, req.params.id)));
crmRouter.get('/sequences/:id/enrollments', route((req) => CrmMarketing.listEnrollments(ctx(req).orgId, req.params.id)));
crmRouter.post('/sequences/:id/enroll', route((req) => CrmMarketing.enroll(ctx(req).orgId, req.params.id, String(req.body?.entity_type || ''), String(req.body?.entity_id || '')), 201));
crmRouter.post('/enrollments/:id/stop', route((req) => CrmMarketing.stopEnrollment(ctx(req).orgId, req.params.id)));
crmRouter.post('/sequences/run-due', route((req) => CrmMarketing.runDueSequences(ctx(req).orgId)));

// ===== configuration ======================================================================================================================
crmRouter.get('/config/sources', route((req) => CrmConfig.sources.list(ctx(req).orgId)));
crmRouter.post('/config/sources', route((req) => CrmConfig.sources.create(ctx(req).orgId, req.body || {}), 201));
crmRouter.patch('/config/sources/:id', route((req) => CrmConfig.sources.update(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/config/sources/:id', route((req) => CrmConfig.sources.remove(ctx(req).orgId, req.params.id)));
crmRouter.get('/config/tags', route((req) => CrmConfig.tags.list(ctx(req).orgId)));
crmRouter.post('/config/tags', route((req) => CrmConfig.tags.create(ctx(req).orgId, req.body || {}), 201));
crmRouter.delete('/config/tags/:id', route((req) => CrmConfig.tags.remove(ctx(req).orgId, req.params.id)));
crmRouter.get('/config/scoring/meta', route(() => CrmConfig.scoring.meta()));
crmRouter.get('/config/scoring', route((req) => CrmConfig.scoring.list(ctx(req).orgId)));
crmRouter.post('/config/scoring', route((req) => CrmConfig.scoring.create(ctx(req).orgId, req.body || {}), 201));
crmRouter.post('/config/scoring/rescore', route((req) => CrmConfig.scoring.rescoreAll(ctx(req).orgId)));
crmRouter.patch('/config/scoring/:id', route((req) => CrmConfig.scoring.update(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/config/scoring/:id', route((req) => CrmConfig.scoring.remove(ctx(req).orgId, req.params.id)));
crmRouter.get('/config/assignment', route((req) => CrmConfig.assignment.list(ctx(req).orgId)));
crmRouter.post('/config/assignment', route((req) => CrmConfig.assignment.create(ctx(req).orgId, req.body || {}), 201));
crmRouter.patch('/config/assignment/:id', route((req) => CrmConfig.assignment.update(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/config/assignment/:id', route((req) => CrmConfig.assignment.remove(ctx(req).orgId, req.params.id)));
crmRouter.get('/config/sla', route((req) => CrmConfig.sla.list(ctx(req).orgId)));
crmRouter.put('/config/sla/lead/:priority', route((req) => CrmConfig.sla.upsertLead(ctx(req).orgId, req.params.priority, req.body || {})));
crmRouter.put('/config/sla/ticket/:priority', route((req) => CrmConfig.sla.upsertTicket(ctx(req).orgId, req.params.priority, req.body || {})));
crmRouter.get('/config/custom-fields', route((req) => CrmConfig.customFields.list(ctx(req).orgId, req.query.entity as string)));
crmRouter.post('/config/custom-fields', route((req) => CrmConfig.customFields.create(ctx(req).orgId, req.body || {}), 201));
crmRouter.patch('/config/custom-fields/:id', route((req) => CrmConfig.customFields.update(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/config/custom-fields/:id', route((req) => CrmConfig.customFields.remove(ctx(req).orgId, req.params.id)));
crmRouter.get('/automation/meta', route(() => CrmConfig.automation.meta()));
crmRouter.get('/automation/logs', route((req) => CrmConfig.automation.logs(ctx(req).orgId, req.query.rule_id as string)));
crmRouter.get('/automation', route((req) => CrmConfig.automation.list(ctx(req).orgId)));
crmRouter.post('/automation', route((req) => CrmConfig.automation.create(ctx(req).orgId, req.body || {}), 201));
crmRouter.patch('/automation/:id', route((req) => CrmConfig.automation.update(ctx(req).orgId, req.params.id, req.body || {})));
crmRouter.delete('/automation/:id', route((req) => CrmConfig.automation.remove(ctx(req).orgId, req.params.id)));

// ===== integrations ==========================================================================================================================
crmRouter.get('/integrations', route((req) => CrmConfig.integrations.list(ctx(req).orgId)));
crmRouter.get('/integrations/logs', route((req) => CrmConfig.integrations.webhookLogs(ctx(req).orgId)));
crmRouter.patch('/integrations/:provider', route((req) => CrmConfig.integrations.setEnabled(ctx(req).orgId, req.params.provider, req.body?.enabled !== false)));
