import type {
  Batch,
  BatchGenealogyRecord,
  BatchStatusLog,
  BatchHold,
  BatchNumberingRule,
  TraceabilitySearchResult,
  BatchSummaryMetrics,
  BatchStatus,
  BatchType,
  BatchHoldType,
  BatchHoldSeverity,
} from '../types/batches';

const API_BASE = '/api/batches';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const userStr = localStorage.getItem('jyotsvan_user');
  let token = 'enterprise_admin_session';
  let userEmail = 'admin@jyotsvan.enterprise';
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      if (u.token) token = u.token;
      if (u.email) userEmail = u.email;
    } catch {}
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
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

export const batchApi = {
  // Summary Metrics
  getSummary: async (): Promise<BatchSummaryMetrics> => {
    return fetchWithAuth(`${API_BASE}/summary`);
  },

  // Batch Registry List
  getBatches: async (params?: {
    search?: string;
    status?: string;
    batchType?: string;
    qcStatus?: string;
    skuId?: string;
    warehouseId?: string;
    supplierId?: string;
    expiryFilter?: 'all' | 'expired' | 'near_30' | 'near_60' | 'near_90' | 'fresh';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ batches: Batch[]; total: number; page: number; limit: number; totalPages: number }> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      });
    }
    return fetchWithAuth(`${API_BASE}?${query.toString()}`);
  },

  // Get Single Batch with 360 View
  getBatchById: async (id: string): Promise<Batch> => {
    const data = await fetchWithAuth(`${API_BASE}/${id}`);
    return data.batch;
  },

  // Create Batch
  createBatch: async (payload: {
    skuId: string;
    batchNumber?: string;
    batchType?: BatchType;
    status?: BatchStatus;
    manufacturingDate?: string | null;
    expiryDate?: string | null;
    retestDate?: string | null;
    bestBeforeDate?: string | null;
    initialQuantity: number;
    currentQuantity?: number;
    unitId?: string | null;
    warehouseId?: string | null;
    locationId?: string | null;
    sourceType?: string;
    sourceReferenceId?: string | null;
    sourceReferenceNumber?: string | null;
    supplierId?: string | null;
    supplierBatchNumber?: string | null;
    storageConditions?: string | null;
    potencyOrPurity?: number | null;
    costPerUnit?: number | null;
    notes?: string | null;
  }): Promise<{ success: boolean; batch: Batch }> => {
    return fetchWithAuth(`${API_BASE}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Update Batch
  updateBatch: async (
    id: string,
    payload: {
      storageConditions?: string | null;
      retestDate?: string | null;
      expiryDate?: string | null;
      bestBeforeDate?: string | null;
      coaDocumentUrl?: string | null;
      potencyOrPurity?: number | null;
      costPerUnit?: number | null;
      notes?: string | null;
    }
  ): Promise<{ success: boolean; batch: Batch }> => {
    return fetchWithAuth(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Transition Batch Status
  transitionStatus: async (
    id: string,
    payload: {
      targetStatus: BatchStatus;
      reason: string;
      justification?: string | null;
    }
  ): Promise<{ success: boolean; batch: Batch }> => {
    return fetchWithAuth(`${API_BASE}/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Traceability Investigation (Backward + Forward)
  getTraceabilityReport: async (identifier: string): Promise<TraceabilitySearchResult> => {
    return fetchWithAuth(`${API_BASE}/trace/${encodeURIComponent(identifier)}`);
  },

  // Genealogy Trees
  getBackwardTree: async (batchId: string): Promise<{ tree: any[] }> => {
    return fetchWithAuth(`${API_BASE}/${batchId}/backward`);
  },

  getForwardTree: async (batchId: string): Promise<{ tree: any[] }> => {
    return fetchWithAuth(`${API_BASE}/${batchId}/forward`);
  },

  // Holds & Recalls
  getHolds: async (params?: { batchId?: string; status?: string; severity?: string }): Promise<{ holds: BatchHold[] }> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      });
    }
    return fetchWithAuth(`${API_BASE}/holds?${query.toString()}`);
  },

  placeHold: async (payload: {
    batchId: string;
    holdType: BatchHoldType;
    severity: BatchHoldSeverity;
    reason: string;
    impactScope?: 'single_batch' | 'genealogy_tree' | 'entire_sku_lot';
  }): Promise<{ success: boolean; hold: BatchHold }> => {
    return fetchWithAuth(`${API_BASE}/holds`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  releaseHold: async (
    holdId: string,
    payload: {
      releaseJustification: string;
      resolutionNotes?: string | null;
      targetStatus?: BatchStatus;
    }
  ): Promise<{ success: boolean; hold: BatchHold }> => {
    return fetchWithAuth(`${API_BASE}/holds/${holdId}/release`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Numbering Rules
  getNumberingRules: async (): Promise<{ rules: BatchNumberingRule[] }> => {
    return fetchWithAuth(`${API_BASE}/rules`);
  },

  saveNumberingRule: async (payload: Partial<BatchNumberingRule>): Promise<{ success: boolean; rule: BatchNumberingRule }> => {
    return fetchWithAuth(`${API_BASE}/rules`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // FEFO Allocations
  getFefoAllocations: async (skuId: string, quantity: number, warehouseId?: string) => {
    const query = new URLSearchParams({ skuId, quantity: String(quantity) });
    if (warehouseId) query.append('warehouseId', warehouseId);
    return fetchWithAuth(`${API_BASE}/fefo?${query.toString()}`);
  },
};
