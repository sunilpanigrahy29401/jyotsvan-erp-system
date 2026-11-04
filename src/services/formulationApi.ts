import type {
  Formulation,
  FormulationSummaryMetrics,
  FormulationScalingResult,
  FormulationComparisonResult,
  CreateFormulationPayload,
} from '../types/formulations';

const API_BASE = '/api/formulations';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const userStr = localStorage.getItem('jyotsvan_user');
  let token = 'enterprise_admin_session';
  let orgId = 'org-jyotsvan-corp';
  let userEmail = 'sunilpanigrahy29401@gmail.com';
  let userId = 'usr-admin-001';

  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      if (u.token) token = u.token;
      if (u.organization_id) orgId = u.organization_id;
      if (u.email) userEmail = u.email;
      if (u.id) userId = u.id;
    } catch {}
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-organization-id': orgId,
    'x-user-id': userId,
    'x-user-email': userEmail,
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export const formulationApi = {
  // Summary Metrics
  getMetrics: async (): Promise<FormulationSummaryMetrics> => {
    return fetchWithAuth(`${API_BASE}/metrics`);
  },

  // Available Finished & Component SKUs
  getAvailableSkus: async (): Promise<any[]> => {
    return fetchWithAuth(`${API_BASE}/skus/available`);
  },

  // List Formulations with filters
  listFormulations: async (params?: {
    search?: string;
    status?: string;
    finishedSkuId?: string;
    finishedProductId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Formulation[]; total: number; page: number; limit: number }> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.finishedSkuId) query.append('finishedSkuId', params.finishedSkuId);
    if (params?.finishedProductId) query.append('finishedProductId', params.finishedProductId);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    return fetchWithAuth(`${API_BASE}?${query.toString()}`);
  },

  // Single Formulation
  getFormulation: async (id: string): Promise<Formulation> => {
    return fetchWithAuth(`${API_BASE}/${id}`);
  },

  // Create Formulation
  createFormulation: async (payload: CreateFormulationPayload): Promise<Formulation> => {
    return fetchWithAuth(API_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Update Formulation
  updateFormulation: async (
    id: string,
    payload: Partial<CreateFormulationPayload>
  ): Promise<Formulation> => {
    return fetchWithAuth(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Lifecycle transitions
  submitForReview: async (id: string): Promise<Formulation> => {
    return fetchWithAuth(`${API_BASE}/${id}/submit`, { method: 'POST' });
  },

  approveFormulation: async (id: string): Promise<Formulation> => {
    return fetchWithAuth(`${API_BASE}/${id}/approve`, { method: 'POST' });
  },

  activateFormulation: async (id: string, effectiveFrom?: string): Promise<Formulation> => {
    return fetchWithAuth(`${API_BASE}/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({ effective_from: effectiveFrom }),
    });
  },

  deactivateFormulation: async (id: string): Promise<Formulation> => {
    return fetchWithAuth(`${API_BASE}/${id}/deactivate`, { method: 'POST' });
  },

  archiveFormulation: async (id: string): Promise<Formulation> => {
    return fetchWithAuth(`${API_BASE}/${id}/archive`, { method: 'POST' });
  },

  createNewVersion: async (
    id: string,
    payload: { version_type: 'major' | 'minor' | 'custom'; custom_version?: string; notes?: string }
  ): Promise<Formulation> => {
    return fetchWithAuth(`${API_BASE}/${id}/version`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Batch Scaling Calculator
  scaleBatch: async (id: string, targetBatchSize: number): Promise<FormulationScalingResult> => {
    return fetchWithAuth(`${API_BASE}/${id}/scale`, {
      method: 'POST',
      body: JSON.stringify({ target_batch_size: targetBatchSize }),
    });
  },

  // Version Comparison
  compareVersions: async (id1: string, id2: string): Promise<FormulationComparisonResult> => {
    return fetchWithAuth(`${API_BASE}/compare/${id1}/${id2}`);
  },
};
