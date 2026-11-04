import type {
  ProductionOrder,
  ProductionPlan,
  MaterialAvailabilityReport,
  ProductionSummaryMetrics,
  CreateProductionOrderPayload,
  CreateProductionPlanPayload,
} from '../types/production';

const API_BASE = '/api/production';

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
    'x-user-context': JSON.stringify({ id: userId, email: userEmail }),
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

export const productionApi = {
  // Telemetry & Metrics
  getMetrics: async (): Promise<ProductionSummaryMetrics> => {
    return fetchWithAuth(`${API_BASE}/metrics`);
  },

  // Production Plans
  listPlans: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}): Promise<{ data: ProductionPlan[]; total: number; page: number; limit: number }> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    return fetchWithAuth(`${API_BASE}/plans?${query.toString()}`);
  },

  getPlanById: async (id: string): Promise<ProductionPlan> => {
    return fetchWithAuth(`${API_BASE}/plans/${id}`);
  },

  createPlan: async (payload: CreateProductionPlanPayload): Promise<ProductionPlan> => {
    return fetchWithAuth(`${API_BASE}/plans`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  approvePlan: async (id: string): Promise<ProductionPlan> => {
    return fetchWithAuth(`${API_BASE}/plans/${id}/approve`, {
      method: 'POST',
    });
  },

  // Production Orders
  listOrders: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    material_status?: string;
    warehouse_id?: string;
    sku_id?: string;
    plan_id?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}): Promise<{ data: ProductionOrder[]; total: number; page: number; limit: number }> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.material_status && params.material_status !== 'all') query.set('material_status', params.material_status);
    if (params.warehouse_id && params.warehouse_id !== 'all') query.set('warehouse_id', params.warehouse_id);
    if (params.sku_id) query.set('sku_id', params.sku_id);
    if (params.plan_id) query.set('plan_id', params.plan_id);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    return fetchWithAuth(`${API_BASE}/orders?${query.toString()}`);
  },

  getOrderById: async (id: string): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${id}`);
  },

  createOrder: async (payload: CreateProductionOrderPayload): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Material Availability & Staging
  checkMaterialAvailability: async (orderId: string): Promise<MaterialAvailabilityReport> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/availability`);
  },

  reserveMaterials: async (orderId: string): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/reserve`, {
      method: 'POST',
    });
  },

  issueMaterials: async (
    orderId: string,
    issues: Array<{
      componentId: string;
      quantity: number;
      warehouseId?: string;
      locationId?: string;
      batchNumber?: string;
      notes?: string;
      idempotencyKey?: string;
    }>
  ): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/issue`, {
      method: 'POST',
      body: JSON.stringify({ issues }),
    });
  },

  recordConsumption: async (
    orderId: string,
    consumptions: Array<{ componentId: string; actualConsumedQuantity: number }>
  ): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/consumption`, {
      method: 'POST',
      body: JSON.stringify({ consumptions }),
    });
  },

  returnMaterials: async (
    orderId: string,
    returnData: {
      componentId: string;
      quantity: number;
      warehouseId?: string;
      locationId?: string;
      reason: string;
      notes?: string;
      idempotencyKey?: string;
    }
  ): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/return`, {
      method: 'POST',
      body: JSON.stringify(returnData),
    });
  },

  // Output & Wastage
  recordOutput: async (
    orderId: string,
    outputData: {
      quantity: number;
      warehouseId?: string;
      locationId?: string;
      batchNumber?: string;
      manufacturingDate?: string;
      expiryDate?: string;
      createQCHandoff?: boolean;
      qcTemplateId?: string;
      notes?: string;
      idempotencyKey?: string;
    }
  ): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/output`, {
      method: 'POST',
      body: JSON.stringify(outputData),
    });
  },

  recordWastage: async (
    orderId: string,
    wastageData: {
      category: string;
      quantity: number;
      unitId?: string;
      skuId?: string;
      reason: string;
      notes?: string;
    }
  ): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/wastage`, {
      method: 'POST',
      body: JSON.stringify(wastageData),
    });
  },

  // Lifecycle
  completeOrder: async (orderId: string): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/complete`, {
      method: 'POST',
    });
  },

  cancelOrder: async (orderId: string, reason: string): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  approveOrder: async (orderId: string): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/approve`, {
      method: 'POST',
    });
  },

  holdOrder: async (orderId: string, reason: string): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/hold`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  resumeOrder: async (orderId: string, reason: string): Promise<ProductionOrder> => {
    return fetchWithAuth(`${API_BASE}/orders/${orderId}/resume`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
