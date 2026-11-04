import type {
  PurchaseRequest,
  PurchaseOrder,
  GoodsReceipt,
  ProcurementSummary,
} from '../types/procurement';

const BASE_URL = '/api/procurement';

export const procurementApi = {
  // 1. Dashboard KPI Summary
  async getSummary(orgId = 'org-jyotsvan-corp'): Promise<ProcurementSummary> {
    const res = await fetch(`${BASE_URL}/summary?orgId=${encodeURIComponent(orgId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch procurement summary');
    }
    const data = await res.json();
    return data.summary;
  },

  // 2. Purchase Requests
  async getPurchaseRequests(params: {
    orgId?: string;
    search?: string;
    status?: string;
    priority?: string;
    departmentId?: string;
    requestedBy?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    requests: PurchaseRequest[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = new URLSearchParams();
    if (params.orgId) query.set('orgId', params.orgId);
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.priority && params.priority !== 'all') query.set('priority', params.priority);
    if (params.departmentId) query.set('departmentId', params.departmentId);
    if (params.requestedBy) query.set('requestedBy', params.requestedBy);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${BASE_URL}/requests?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch purchase requests');
    }
    return await res.json();
  },

  async getPurchaseRequestById(id: string, orgId = 'org-jyotsvan-corp'): Promise<PurchaseRequest> {
    const res = await fetch(`${BASE_URL}/requests/${encodeURIComponent(id)}?orgId=${encodeURIComponent(orgId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch purchase request');
    }
    const data = await res.json();
    return data.request;
  },

  async createPurchaseRequest(payload: {
    departmentId?: string;
    requiredByDate: string;
    priority?: string;
    purpose?: string;
    notes?: string;
    items: Array<{
      skuId: string;
      quantity: number;
      unitId?: string;
      requiredByDate?: string;
      estimatedUnitCost?: number;
      notes?: string;
    }>;
  }): Promise<PurchaseRequest> {
    const res = await fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create purchase request');
    }
    const data = await res.json();
    return data.request;
  },

  async submitPurchaseRequest(id: string): Promise<PurchaseRequest> {
    const res = await fetch(`${BASE_URL}/requests/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit purchase request');
    }
    const data = await res.json();
    return data.request;
  },

  async approvePurchaseRequest(id: string, notes?: string): Promise<PurchaseRequest> {
    const res = await fetch(`${BASE_URL}/requests/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to approve purchase request');
    }
    const data = await res.json();
    return data.request;
  },

  async rejectPurchaseRequest(id: string, reason: string): Promise<PurchaseRequest> {
    const res = await fetch(`${BASE_URL}/requests/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reject purchase request');
    }
    const data = await res.json();
    return data.request;
  },

  async cancelPurchaseRequest(id: string, reason?: string): Promise<PurchaseRequest> {
    const res = await fetch(`${BASE_URL}/requests/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to cancel purchase request');
    }
    const data = await res.json();
    return data.request;
  },

  // 3. Purchase Orders
  async getPurchaseOrders(params: {
    orgId?: string;
    search?: string;
    status?: string;
    supplierId?: string;
    warehouseId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    orders: PurchaseOrder[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = new URLSearchParams();
    if (params.orgId) query.set('orgId', params.orgId);
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.supplierId) query.set('supplierId', params.supplierId);
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${BASE_URL}/orders?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch purchase orders');
    }
    return await res.json();
  },

  async getPurchaseOrderById(id: string, orgId = 'org-jyotsvan-corp'): Promise<PurchaseOrder> {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}?orgId=${encodeURIComponent(orgId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch purchase order');
    }
    const data = await res.json();
    return data.order;
  },

  async createPurchaseOrder(payload: {
    supplierId: string;
    purchaseRequestId?: string;
    orderDate?: string;
    expectedDeliveryDate: string;
    currency?: string;
    paymentTerms?: string;
    shippingAddress?: string;
    warehouseId: string;
    shippingAmount?: number;
    notes?: string;
    termsAndConditions?: string;
    items: Array<{
      skuId: string;
      supplierSkuId?: string;
      description?: string;
      quantity: number;
      unitId?: string;
      unitPrice: number;
      discountPercent?: number;
      taxRate?: number;
      expectedDeliveryDate?: string;
      notes?: string;
    }>;
  }): Promise<PurchaseOrder> {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create purchase order');
    }
    const data = await res.json();
    return data.order;
  },

  async submitPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit purchase order');
    }
    const data = await res.json();
    return data.order;
  },

  async approvePurchaseOrder(id: string): Promise<PurchaseOrder> {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to approve purchase order');
    }
    const data = await res.json();
    return data.order;
  },

  async sendPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send purchase order');
    }
    const data = await res.json();
    return data.order;
  },

  async acknowledgePurchaseOrder(id: string): Promise<PurchaseOrder> {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to acknowledge purchase order');
    }
    const data = await res.json();
    return data.order;
  },

  async cancelPurchaseOrder(id: string, reason?: string): Promise<PurchaseOrder> {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to cancel purchase order');
    }
    const data = await res.json();
    return data.order;
  },

  async closePurchaseOrder(id: string, reason?: string): Promise<PurchaseOrder> {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to close purchase order');
    }
    const data = await res.json();
    return data.order;
  },

  // 4. Goods Receipt Notes (GRN)
  async getGoodsReceipts(params: {
    orgId?: string;
    search?: string;
    status?: string;
    qcStatus?: string;
    supplierId?: string;
    warehouseId?: string;
    purchaseOrderId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    receipts: GoodsReceipt[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = new URLSearchParams();
    if (params.orgId) query.set('orgId', params.orgId);
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.qcStatus && params.qcStatus !== 'all') query.set('qcStatus', params.qcStatus);
    if (params.supplierId) query.set('supplierId', params.supplierId);
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params.purchaseOrderId) query.set('purchaseOrderId', params.purchaseOrderId);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${BASE_URL}/receipts?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch goods receipts');
    }
    return await res.json();
  },

  async getGoodsReceiptById(id: string, orgId = 'org-jyotsvan-corp'): Promise<GoodsReceipt> {
    const res = await fetch(`${BASE_URL}/receipts/${encodeURIComponent(id)}?orgId=${encodeURIComponent(orgId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch goods receipt');
    }
    const data = await res.json();
    return data.receipt;
  },

  async createGoodsReceipt(payload: {
    purchaseOrderId: string;
    warehouseId?: string;
    receivingLocationId?: string;
    receivedDate?: string;
    supplierReference?: string;
    deliveryChallanNumber?: string;
    vehicleNumber?: string;
    driverName?: string;
    driverPhone?: string;
    notes?: string;
    items: Array<{
      purchaseOrderItemId: string;
      skuId: string;
      orderedQuantity: number;
      receivedQuantity: number;
      acceptedQuantity?: number;
      rejectedQuantity?: number;
      quarantineQuantity?: number;
      unitId?: string;
      batchNumber?: string;
      manufacturingDate?: string;
      expiryDate?: string;
      requiresQc?: boolean;
      notes?: string;
    }>;
  }): Promise<GoodsReceipt> {
    const res = await fetch(`${BASE_URL}/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create goods receipt');
    }
    const data = await res.json();
    return data.receipt;
  },

  // 5. Reports
  async getOrderReport(orgId = 'org-jyotsvan-corp'): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/reports/orders?orgId=${encodeURIComponent(orgId)}`);
    if (!res.ok) throw new Error('Failed to fetch order report');
    const data = await res.json();
    return data.report;
  },

  async getSupplierReport(orgId = 'org-jyotsvan-corp'): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/reports/suppliers?orgId=${encodeURIComponent(orgId)}`);
    if (!res.ok) throw new Error('Failed to fetch supplier spend report');
    const data = await res.json();
    return data.report;
  },

  async getReceivingReport(orgId = 'org-jyotsvan-corp'): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/reports/receiving?orgId=${encodeURIComponent(orgId)}`);
    if (!res.ok) throw new Error('Failed to fetch receiving report');
    const data = await res.json();
    return data.report;
  },
};
