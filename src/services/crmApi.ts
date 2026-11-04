// src/services/crmApi.ts
// Frontend API Client for Jyotsvan CRM Subsystem

import type {
  Lead,
  CrmAccount,
  CrmContact,
  Deal,
  Pipeline,
  CrmActivity,
  CrmDashboardMetrics,
  CrmIntegrationConfig,
  DealHandoff,
} from '../types/crm.ts';

const BASE_URL = '/api/crm';

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'x-organization-id': 'org-jyotsvan-corp',
    'x-user-id': 'usr-super-admin',
    'x-user-email': 'admin@jyotsvan.enterprise',
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || `HTTP error ${res.status}`);
  }
  return data.data !== undefined ? data.data : data;
}

export const CrmApi = {
  // 1. Dashboard
  getDashboardMetrics: (): Promise<CrmDashboardMetrics> => {
    return fetchJson<CrmDashboardMetrics>(`${BASE_URL}/dashboard`);
  },

  // 2. Leads
  getLeads: (filters: {
    search?: string;
    status?: string;
    source_id?: string;
    assigned_employee_id?: string;
    priority?: string;
    relationship_type?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<Lead[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, String(v));
      }
    });
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<Lead[]>(`${BASE_URL}/leads${q}`);
  },

  getLeadById: (id: string): Promise<Lead> => {
    return fetchJson<Lead>(`${BASE_URL}/leads/${id}`);
  },

  createLead: (data: Partial<Lead>): Promise<Lead> => {
    return fetchJson<Lead>(`${BASE_URL}/leads`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateLead: (id: string, data: Partial<Lead>): Promise<Lead> => {
    return fetchJson<Lead>(`${BASE_URL}/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  assignLead: (id: string, employee_id: string, team?: string): Promise<Lead> => {
    return fetchJson<Lead>(`${BASE_URL}/leads/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ employee_id, team }),
    });
  },

  convertLead: (id: string, data: {
    account_name?: string;
    existing_account_id?: string;
    deal_title?: string;
    pipeline_id?: string;
    deal_value?: number;
    expected_close_date?: string;
  }): Promise<{ account: CrmAccount; contact: CrmContact; deal?: Deal }> => {
    return fetchJson<{ account: CrmAccount; contact: CrmContact; deal?: Deal }>(`${BASE_URL}/leads/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 3. Accounts & Contacts
  getAccounts: (filters: { search?: string; relationship_type?: string; tier?: string; status?: string } = {}): Promise<CrmAccount[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, String(v));
    });
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<CrmAccount[]>(`${BASE_URL}/accounts${q}`);
  },

  createAccount: (data: Partial<CrmAccount>): Promise<CrmAccount> => {
    return fetchJson<CrmAccount>(`${BASE_URL}/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getContacts: (accountId?: string): Promise<CrmContact[]> => {
    const q = accountId ? `?account_id=${encodeURIComponent(accountId)}` : '';
    return fetchJson<CrmContact[]>(`${BASE_URL}/contacts${q}`);
  },

  createContact: (data: Partial<CrmContact>): Promise<CrmContact> => {
    return fetchJson<CrmContact>(`${BASE_URL}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 4. Pipelines & Deals
  getPipelines: (): Promise<Pipeline[]> => {
    return fetchJson<Pipeline[]>(`${BASE_URL}/pipelines`);
  },

  getDeals: (pipelineId?: string): Promise<Deal[]> => {
    const q = pipelineId ? `?pipeline_id=${encodeURIComponent(pipelineId)}` : '';
    return fetchJson<Deal[]>(`${BASE_URL}/deals${q}`);
  },

  createDeal: (data: Partial<Deal>): Promise<Deal> => {
    return fetchJson<Deal>(`${BASE_URL}/deals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDealStage: (id: string, stage_id: string, notes?: string): Promise<Deal> => {
    return fetchJson<Deal>(`${BASE_URL}/deals/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage_id, notes }),
    });
  },

  createDealHandoff: (id: string, data: { special_terms?: string; delivery_timeline?: string }): Promise<DealHandoff> => {
    return fetchJson<DealHandoff>(`${BASE_URL}/deals/${id}/handoff`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 5. Activities
  getActivities: (filters: { lead_id?: string; account_id?: string; deal_id?: string; is_completed?: boolean } = {}): Promise<CrmActivity[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.append(k, String(v));
    });
    const q = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<CrmActivity[]>(`${BASE_URL}/activities${q}`);
  },

  createActivity: (data: Partial<CrmActivity>): Promise<CrmActivity> => {
    return fetchJson<CrmActivity>(`${BASE_URL}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  completeActivity: (id: string, outcome?: string, outcome_notes?: string): Promise<CrmActivity> => {
    return fetchJson<CrmActivity>(`${BASE_URL}/activities/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ outcome, outcome_notes }),
    });
  },

  // 6. Integrations
  getIntegrationConfigs: (): Promise<CrmIntegrationConfig[]> => {
    return fetchJson<CrmIntegrationConfig[]>(`${BASE_URL}/integrations`);
  },

  simulateInboundLead: (data: {
    source: string;
    first_name: string;
    last_name?: string;
    company_name?: string;
    email?: string;
    phone: string;
    requirement?: string;
    city?: string;
    state?: string;
    estimated_value?: number;
  }): Promise<{ success: boolean; lead_id?: string; lead_number?: string; message: string }> => {
    return fetchJson<{ success: boolean; lead_id?: string; lead_number?: string; message: string }>(`${BASE_URL}/webhooks/inbound?source=${encodeURIComponent(data.source)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
