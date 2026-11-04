import type {
  QCParameter,
  QCTemplate,
  QCInspection,
  QCDecision,
  QCDocument,
  QCSummaryMetrics,
  SupplierQualityReport,
  SkuQualityReport,
} from '../types/quality';

const API_BASE = '/api/quality';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const userStr = localStorage.getItem('jyotsvan_user');
  let token = 'enterprise_admin_session';
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      if (u.token) token = u.token;
    } catch {}
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
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

export const qualityApi = {
  // Metrics & Reports
  getMetrics: async (): Promise<QCSummaryMetrics> => {
    return fetchWithAuth(`${API_BASE}/metrics`);
  },
  getSupplierReports: async (): Promise<SupplierQualityReport[]> => {
    return fetchWithAuth(`${API_BASE}/reports/suppliers`);
  },
  getSkuReports: async (): Promise<SkuQualityReport[]> => {
    return fetchWithAuth(`${API_BASE}/reports/skus`);
  },

  // Parameters
  getParameters: async (params?: {
    search?: string;
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ parameters: QCParameter[]; total: number; page: number; limit: number }> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.type) q.set('type', params.type);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    return fetchWithAuth(`${API_BASE}/parameters?${q.toString()}`);
  },
  getParameterById: async (id: string): Promise<QCParameter> => {
    return fetchWithAuth(`${API_BASE}/parameters/${id}`);
  },
  createParameter: async (data: Partial<QCParameter>): Promise<QCParameter> => {
    return fetchWithAuth(`${API_BASE}/parameters`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateParameter: async (id: string, data: Partial<QCParameter>): Promise<QCParameter> => {
    return fetchWithAuth(`${API_BASE}/parameters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Templates
  getTemplates: async (params?: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ templates: QCTemplate[]; total: number; page: number; limit: number }> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.category) q.set('category', params.category);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    return fetchWithAuth(`${API_BASE}/templates?${q.toString()}`);
  },
  getTemplateById: async (id: string): Promise<QCTemplate> => {
    return fetchWithAuth(`${API_BASE}/templates/${id}`);
  },
  createTemplate: async (data: any): Promise<QCTemplate> => {
    return fetchWithAuth(`${API_BASE}/templates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateTemplate: async (id: string, data: any): Promise<QCTemplate> => {
    return fetchWithAuth(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Inspections
  getInspections: async (params?: {
    search?: string;
    status?: string;
    type?: string;
    skuId?: string;
    supplierId?: string;
    warehouseId?: string;
    overallResult?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ inspections: QCInspection[]; total: number; page: number; limit: number }> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.type) q.set('type', params.type);
    if (params?.skuId) q.set('skuId', params.skuId);
    if (params?.supplierId) q.set('supplierId', params.supplierId);
    if (params?.warehouseId) q.set('warehouseId', params.warehouseId);
    if (params?.overallResult) q.set('overallResult', params.overallResult);
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    if (params?.sortBy) q.set('sortBy', params.sortBy);
    if (params?.sortOrder) q.set('sortOrder', params.sortOrder);
    return fetchWithAuth(`${API_BASE}/inspections?${q.toString()}`);
  },
  getInspectionById: async (id: string): Promise<QCInspection> => {
    return fetchWithAuth(`${API_BASE}/inspections/${id}`);
  },
  createInspection: async (data: any): Promise<QCInspection> => {
    return fetchWithAuth(`${API_BASE}/inspections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  submitResults: async (inspectionId: string, payload: {
    items: Array<{
      id: string;
      actualValue?: number | null;
      textResult?: string | null;
      booleanResult?: boolean | null;
      selectionResult?: string | null;
      remarks?: string | null;
    }>;
    sampleQuantity?: number;
    notes?: string;
  }): Promise<QCInspection> => {
    return fetchWithAuth(`${API_BASE}/inspections/${inspectionId}/results`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  overrideItemEvaluation: async (inspectionId: string, payload: {
    itemId: string;
    overrideResult: 'pass' | 'fail' | 'conditional';
    overrideReason: string;
  }): Promise<QCInspection> => {
    return fetchWithAuth(`${API_BASE}/inspections/${inspectionId}/override`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  makeDecision: async (inspectionId: string, payload: {
    decision: 'approved' | 'rejected' | 'quarantine';
    rejectionReasonCode?: string;
    decisionReason?: string;
    comments?: string;
    acceptedQuantity?: number;
    rejectedQuantity?: number;
    quarantineQuantity?: number;
  }): Promise<{ inspection: QCInspection; decision: QCDecision }> => {
    return fetchWithAuth(`${API_BASE}/inspections/${inspectionId}/decision`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  createReinspection: async (inspectionId: string, payload: {
    reinspectionReason: string;
  }): Promise<QCInspection> => {
    return fetchWithAuth(`${API_BASE}/inspections/${inspectionId}/reinspection`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  uploadDocument: async (inspectionId: string, payload: {
    documentName: string;
    documentType: string;
    fileUrl: string;
    fileSizeBytes?: number;
  }): Promise<QCDocument> => {
    return fetchWithAuth(`${API_BASE}/inspections/${inspectionId}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteDocument: async (documentId: string): Promise<{ success: boolean }> => {
    return fetchWithAuth(`${API_BASE}/documents/${documentId}`, {
      method: 'DELETE',
    });
  },
};
