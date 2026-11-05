// src/services/crmApi.ts
// Frontend client for the Jyotsvan CRM API. Identity (tenant, user, permissions) comes from the signed-in session: the global
// fetch wrapper in src/lib/session.ts attaches the access token, so no identity is ever sent from here.
import type {
  Lead, CrmAccount, CrmContact, Deal, Pipeline, CrmActivity, CrmDashboardMetrics, CrmIntegrationConfig, DealHandoff,
} from '../types/crm.ts';

const BASE = '/api/crm';

export class CrmApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public extra?: Record<string, any>) {
    super(message);
  }
}

type Json = Record<string, any>;

async function call<T = any>(method: string, path: string, body?: unknown): Promise<{ data: T; total?: number; raw: Json }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: Json = {};
  try { json = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok || json.success === false) {
    const { error, message, code, success: _s, ...extra } = json;
    throw new CrmApiError(error || message || `Request failed (HTTP ${res.status})`, res.status, code, extra);
  }
  return { data: (json.data !== undefined ? json.data : json) as T, total: json.total, raw: json };
}

const qs = (o: Record<string, any> = {}) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== 'all') p.append(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : '';
};
const get = async <T = any>(path: string, q?: Record<string, any>) => (await call<T>('GET', path + qs(q))).data;
const send = async <T = any>(method: string, path: string, body?: unknown) => (await call<T>(method, path, body ?? {})).data;
const page = async <T = any>(path: string, q?: Record<string, any>) => { const r = await call<T[]>('GET', path + qs(q)); return { data: r.data, total: r.total ?? r.data.length }; };

/** Opens a CSV/ICS endpoint as an authenticated download. */
async function download(path: string, filename: string) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new CrmApiError('Download failed.', res.status);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export interface Employee { id: string; display_name: string; employee_code?: string; email?: string; designation?: string | null }
export interface ProductLookup { id: string; sku: string | null; name: string; selling_price: string; tax_rate: string | null; unit: string | null }

export const CrmApi = {
  // lookups
  getEmployees: () => get<Employee[]>('/lookups/employees'),
  searchProducts: (search: string) => get<ProductLookup[]>('/lookups/products', { search }),

  // dashboard & reports
  getDashboardMetrics: () => get<CrmDashboardMetrics & Json>('/dashboard'),
  getFunnel: (q?: Json) => get<any>('/reports/funnel', q),
  getForecast: (q?: Json) => get<any>('/reports/forecast', q),
  getWinLoss: (q?: Json) => get<any>('/reports/win-loss', q),
  getSourcePerformance: () => get<any[]>('/reports/sources'),
  getRepPerformance: () => get<any[]>('/reports/reps'),

  // leads
  getLeads: async (f: Json = {}) => (await page<Lead>('/leads', f)).data,
  getLeadsPage: (f: Json = {}) => page<Lead & Json>('/leads', f),
  getLeadById: (id: string) => get<Lead & Json>(`/leads/${id}`),
  createLead: (d: Partial<Lead> & Json) => send<Lead>('POST', '/leads', d),
  updateLead: (id: string, d: Partial<Lead> & Json) => send<Lead>('PUT', `/leads/${id}`, d),
  assignLead: (id: string, employee_id: string, team?: string) => send<Lead>('PATCH', `/leads/${id}/assign`, { employee_id, team }),
  convertLead: (id: string, d: Json) => send<{ account: CrmAccount; contact: CrmContact; deal?: Deal }>('POST', `/leads/${id}/convert`, d),
  archiveLead: (id: string, reason?: string) => send<Lead>('DELETE', `/leads/${id}`, { reason }),
  restoreLead: (id: string) => send<Lead>('POST', `/leads/${id}/restore`),
  purgeLead: (id: string) => send('DELETE', `/leads/${id}/purge`),
  mergeLeads: (survivor_id: string, merge_ids: string[]) => send<Lead>('POST', '/leads/merge', { survivor_id, merge_ids }),
  bulkLeads: (action: 'assign' | 'status' | 'archive', ids: string[], params: Json = {}) => send<{ done: number; skipped: Array<{ id: string; reason: string }> }>('POST', '/leads/bulk', { action, ids, ...params }),
  autoAssignLeads: () => send<{ examined: number; assigned: number }>('POST', '/leads/auto-assign'),
  importLeads: (d: { csv?: string; rows?: Json[]; mode?: 'skip' | 'update'; filename?: string }) => send<any>('POST', '/leads/import', d),
  exportLeads: (f: Json = {}) => download(`/leads/export${qs(f)}`, 'leads.csv'),
  getDuplicateGroups: () => get<Array<{ key: string; leads: Json[] }>>('/leads/duplicates'),
  getSlaBreaches: () => get<Json[]>('/leads/sla-breaches'),
  getLeadTimeline: (id: string) => get<Json[]>(`/leads/${id}/timeline`),

  // accounts, contacts
  getAccounts: async (f: Json = {}) => (await page<CrmAccount>('/accounts', f)).data,
  getAccountsPage: (f: Json = {}) => page<CrmAccount & Json>('/accounts', f),
  getAccount360: (id: string) => get<Json>(`/accounts/${id}/360`),
  createAccount: (d: Partial<CrmAccount> & Json) => send<CrmAccount>('POST', '/accounts', d),
  updateAccount: (id: string, d: Json) => send<CrmAccount>('PUT', `/accounts/${id}`, d),
  archiveAccount: (id: string) => send<CrmAccount>('DELETE', `/accounts/${id}`),
  getContacts: async (accountId?: string) => (await page<CrmContact>('/contacts', { account_id: accountId, limit: 200 })).data,
  createContact: (d: Partial<CrmContact> & Json) => send<CrmContact>('POST', '/contacts', d),
  updateContact: (id: string, d: Json) => send<CrmContact>('PUT', `/contacts/${id}`, d),
  archiveContact: (id: string) => send('DELETE', `/contacts/${id}`),
  searchLinkable: (type: string, search: string) => get<Array<{ id: string; name: string; code: string; status: string }>>('/lookups/linkable', { type, search }),
  linkAccount: (accountId: string, entity_type: string, entity_id: string) => send<Json>('POST', `/accounts/${accountId}/links`, { entity_type, entity_id }),
  unlinkAccount: (linkId: string) => send('DELETE', `/account-links/${linkId}`),
  getDocuments: (accountId: string) => get<Json[]>(`/accounts/${accountId}/documents`),
  addDocument: (accountId: string, d: Json) => send<Json>('POST', `/accounts/${accountId}/documents`, d),
  reviewDocument: (id: string, d: Json) => send<Json>('PATCH', `/documents/${id}`, d),
  verifyKyc: (accountId: string) => send<CrmAccount>('POST', `/accounts/${accountId}/verify-kyc`),
  getVisits: (f: Json = {}) => page<Json>('/visits', f),
  createVisit: (d: Json) => send<Json>('POST', '/visits', d),
  visitCheckIn: (id: string, d: Json) => send<Json>('POST', `/visits/${id}/check-in`, d),
  visitCheckOut: (id: string, d: Json) => send<Json>('POST', `/visits/${id}/check-out`, d),

  // pipelines & deals
  getPipelines: (includeInactive = false) => get<Pipeline[]>('/pipelines', includeInactive ? { include_inactive: 'true' } : {}),
  createPipeline: (d: Json) => send<Pipeline>('POST', '/pipelines', d),
  updatePipeline: (id: string, d: Json) => send<Pipeline>('PATCH', `/pipelines/${id}`, d),
  deletePipeline: (id: string) => send('DELETE', `/pipelines/${id}`),
  addStage: (pipelineId: string, d: Json) => send<Json>('POST', `/pipelines/${pipelineId}/stages`, d),
  updateStage: (id: string, d: Json) => send<Json>('PATCH', `/stages/${id}`, d),
  deleteStage: (id: string) => send('DELETE', `/stages/${id}`),
  reorderStages: (pipelineId: string, stage_ids: string[]) => send<Pipeline>('PUT', `/pipelines/${pipelineId}/stages/order`, { stage_ids }),
  getBoard: (pipelineId: string, owner?: string) => get<Json>(`/pipelines/${pipelineId}/board`, { owner_employee_id: owner }),
  getDeals: async (pipelineId?: string) => (await page<Deal & Json>('/deals', { pipeline_id: pipelineId, limit: 500 })).data,
  getDeal: (id: string) => get<Deal & Json>(`/deals/${id}`),
  createDeal: (d: Partial<Deal> & Json) => send<Deal>('POST', '/deals', d),
  updateDeal: (id: string, d: Json) => send<Deal>('PUT', `/deals/${id}`, d),
  updateDealStage: (id: string, stage_id: string, notes?: string, extra: Json = {}) => send<Deal>('PATCH', `/deals/${id}/stage`, { stage_id, notes, ...extra }),
  setDealItems: (id: string, items: Json[], sync_value = true) => send<Json>('PUT', `/deals/${id}/items`, { items, sync_value }),
  archiveDeal: (id: string) => send('DELETE', `/deals/${id}`),
  createDealHandoff: (id: string, d: { special_terms?: string; delivery_timeline?: string }) => send<DealHandoff>('POST', `/deals/${id}/handoff`, d),
  getHandoffs: (status?: string) => get<Json[]>('/handoffs', { status }),
  reviewHandoff: (id: string, decision: 'approve' | 'reject', note?: string) => send<Json>('POST', `/handoffs/${id}/${decision}`, { note }),

  // quotes
  getQuotes: (f: Json = {}) => page<Json>('/quotes', f),
  getQuote: (id: string) => get<Json>(`/quotes/${id}`),
  createQuote: (d: Json) => send<Json>('POST', '/quotes', d),
  updateQuote: (id: string, d: Json) => send<Json>('PUT', `/quotes/${id}`, d),
  quoteAction: (id: string, action: 'send' | 'accept' | 'reject' | 'clone', note?: string) => send<Json>('POST', `/quotes/${id}/${action}`, { note }),
  deleteQuote: (id: string) => send('DELETE', `/quotes/${id}`),

  // activities & notes
  getActivities: async (f: Json = {}) => (await page<CrmActivity & Json>('/activities', { limit: 200, ...f })).data,
  createActivity: (d: Partial<CrmActivity> & Json) => send<CrmActivity>('POST', '/activities', d),
  updateActivity: (id: string, d: Json) => send<CrmActivity>('PUT', `/activities/${id}`, d),
  completeActivity: (id: string, outcome?: string, outcome_notes?: string, next_follow_up_at?: string) =>
    send<{ activity: CrmActivity; next_follow_up: CrmActivity | null }>('PATCH', `/activities/${id}/complete`, { outcome, outcome_notes, next_follow_up_at }),
  reopenActivity: (id: string) => send('POST', `/activities/${id}/reopen`),
  deleteActivity: (id: string) => send('DELETE', `/activities/${id}`),
  getReminders: (employee_id?: string) => get<{ overdue: Json[]; upcoming: Json[]; total: number }>('/activities/reminders', { employee_id }),
  downloadCalendar: () => download('/activities/calendar.ics', 'crm-activities.ics'),
  getNotes: (f: Json) => get<Json[]>('/notes', f),
  createNote: (d: Json) => send<Json>('POST', '/notes', d),
  updateNote: (id: string, d: Json) => send<Json>('PATCH', `/notes/${id}`, d),
  deleteNote: (id: string) => send('DELETE', `/notes/${id}`),

  // helpdesk & KB
  getTickets: (f: Json = {}) => page<Json>('/tickets', f),
  getTicket: (id: string) => get<Json>(`/tickets/${id}`),
  getTicketStats: () => get<Json>('/tickets/stats'),
  getTicketCategories: () => get<Json[]>('/tickets/categories'),
  createTicket: (d: Json) => send<Json>('POST', '/tickets', d),
  updateTicket: (id: string, d: Json) => send<Json>('PATCH', `/tickets/${id}`, d),
  setTicketStatus: (id: string, status: string, note?: string) => send<Json>('PATCH', `/tickets/${id}/status`, { status, note }),
  commentTicket: (id: string, body: string, is_internal = false) => send<Json>('POST', `/tickets/${id}/comments`, { body, is_internal }),
  rateTicket: (id: string, score: number, comment?: string) => send<Json>('POST', `/tickets/${id}/csat`, { score, comment }),
  escalateTickets: () => send<Json>('POST', '/tickets/escalate'),
  getKb: (f: Json = {}) => get<Json[]>('/kb', f),
  getKbArticle: (id: string) => get<Json>(`/kb/${id}`),
  createKb: (d: Json) => send<Json>('POST', '/kb', d),
  updateKb: (id: string, d: Json) => send<Json>('PUT', `/kb/${id}`, d),
  deleteKb: (id: string) => send('DELETE', `/kb/${id}`),
  kbFeedback: (id: string, helpful: boolean) => send<Json>('POST', `/kb/${id}/feedback`, { helpful }),

  // consent & marketing
  getConsent: (type: 'lead' | 'contact', id: string) => get<{ current: Json[]; history: Json[] }>(`/consent/${type}/${id}`),
  recordConsent: (d: Json) => send<Json>('POST', '/consent', d),
  getSuppressions: (channel?: string) => get<Json[]>('/suppressions', { channel }),
  addSuppression: (d: Json) => send<Json>('POST', '/suppressions', d),
  removeSuppression: (id: string) => send('DELETE', `/suppressions/${id}`),
  getTemplates: (channel?: string) => get<Json[]>('/templates', { channel }),
  getTemplateMeta: () => get<{ placeholders: string[]; channels: string[] }>('/templates/meta'),
  createTemplate: (d: Json) => send<Json>('POST', '/templates', d),
  updateTemplate: (id: string, d: Json) => send<Json>('PATCH', `/templates/${id}`, d),
  deleteTemplate: (id: string) => send('DELETE', `/templates/${id}`),
  getAudiences: () => get<Json[]>('/audiences'),
  createAudience: (d: Json) => send<Json>('POST', '/audiences', d),
  deleteAudience: (id: string) => send('DELETE', `/audiences/${id}`),
  previewAudience: (id: string, channel: string) => get<Json>(`/audiences/${id}/preview`, { channel }),
  getCampaigns: () => get<Json[]>('/campaigns'),
  getCampaign: (id: string) => get<Json>(`/campaigns/${id}`),
  createCampaign: (d: Json) => send<Json>('POST', '/campaigns', d),
  launchCampaign: (id: string) => send<Json>('POST', `/campaigns/${id}/launch`),
  cancelCampaign: (id: string) => send<Json>('POST', `/campaigns/${id}/cancel`),
  deleteCampaign: (id: string) => send('DELETE', `/campaigns/${id}`),
  downloadRecipients: (id: string) => download(`/campaigns/${id}/recipients.csv`, 'campaign-recipients.csv'),
  getSequences: () => get<Json[]>('/sequences'),
  createSequence: (d: Json) => send<Json>('POST', '/sequences', d),
  updateSequence: (id: string, d: Json) => send<Json>('PATCH', `/sequences/${id}`, d),
  deleteSequence: (id: string) => send('DELETE', `/sequences/${id}`),
  enrollSequence: (id: string, entity_type: 'lead' | 'contact', entity_id: string) => send<Json>('POST', `/sequences/${id}/enroll`, { entity_type, entity_id }),
  runSequences: () => send<Json>('POST', '/sequences/run-due'),

  // configuration
  getSources: () => get<Json[]>('/config/sources'),
  createSource: (d: Json) => send<Json>('POST', '/config/sources', d),
  updateSource: (id: string, d: Json) => send<Json>('PATCH', `/config/sources/${id}`, d),
  deleteSource: (id: string) => send('DELETE', `/config/sources/${id}`),
  getTags: () => get<Json[]>('/config/tags'),
  createTag: (d: Json) => send<Json>('POST', '/config/tags', d),
  deleteTag: (id: string) => send('DELETE', `/config/tags/${id}`),
  getScoringMeta: () => get<{ fields: string[]; operators: string[] }>('/config/scoring/meta'),
  getScoringRules: () => get<Json[]>('/config/scoring'),
  createScoringRule: (d: Json) => send<Json>('POST', '/config/scoring', d),
  updateScoringRule: (id: string, d: Json) => send<Json>('PATCH', `/config/scoring/${id}`, d),
  deleteScoringRule: (id: string) => send('DELETE', `/config/scoring/${id}`),
  rescoreLeads: () => send<{ examined: number; changed: number }>('POST', '/config/scoring/rescore'),
  getAssignmentRules: () => get<Json[]>('/config/assignment'),
  createAssignmentRule: (d: Json) => send<Json>('POST', '/config/assignment', d),
  updateAssignmentRule: (id: string, d: Json) => send<Json>('PATCH', `/config/assignment/${id}`, d),
  deleteAssignmentRule: (id: string) => send('DELETE', `/config/assignment/${id}`),
  getSla: () => get<{ lead: Json[]; ticket: Json[] }>('/config/sla'),
  setLeadSla: (priority: string, first_response_minutes: number) => send<Json>('PUT', `/config/sla/lead/${priority}`, { first_response_minutes }),
  setTicketSla: (priority: string, first_response_minutes: number, resolution_minutes: number) => send<Json>('PUT', `/config/sla/ticket/${priority}`, { first_response_minutes, resolution_minutes }),
  getCustomFields: (entity?: string) => get<Json[]>('/config/custom-fields', { entity }),
  createCustomField: (d: Json) => send<Json>('POST', '/config/custom-fields', d),
  updateCustomField: (id: string, d: Json) => send<Json>('PATCH', `/config/custom-fields/${id}`, d),
  deleteCustomField: (id: string) => send('DELETE', `/config/custom-fields/${id}`),
  getAutomationMeta: () => get<{ events: string[]; actions: string[] }>('/automation/meta'),
  getAutomationRules: () => get<Json[]>('/automation'),
  createAutomationRule: (d: Json) => send<Json>('POST', '/automation', d),
  updateAutomationRule: (id: string, d: Json) => send<Json>('PATCH', `/automation/${id}`, d),
  deleteAutomationRule: (id: string) => send('DELETE', `/automation/${id}`),
  getAutomationLogs: (rule_id?: string) => get<Json[]>('/automation/logs', { rule_id }),

  // integrations
  getIntegrationConfigs: () => get<Array<CrmIntegrationConfig & { note?: string | null; endpoint?: string | null }>>('/integrations'),
  getWebhookLogs: () => get<Json[]>('/integrations/logs'),
  setIntegrationEnabled: (provider: string, enabled: boolean) => send<Json>('PATCH', `/integrations/${provider}`, { enabled }),
  /** Runs a provider-shaped payload through the real capture pipeline (creates a real lead). */
  simulateInboundLead: (data: Json & { source: string }) => {
    const { source, ...payload } = data;
    return send<{ success: boolean; duplicate?: boolean; lead_id?: string; lead_number?: string; message: string }>('POST', '/integrations/capture', { source, payload });
  },
};
