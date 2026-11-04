import type {
  RetailerMaster,
  RetailerContact,
  RetailerAddress,
  RetailerDistributorMapping,
  RetailerSalespersonAssignment,
  RetailerAssortment,
  RetailerCommercialTerms,
  RetailerStockItem,
  RetailerReceivingRecord,
  RetailerOrderRequest,
  RetailerReturn,
  RetailerVisit,
  RetailerFollowUp,
  RetailerDocument,
  RetailerSummaryMetrics,
  RetailerStatus,
  FollowupStatus,
} from '../types/retailers.ts';

class RetailerApiService {
  private async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-organization-id': 'org-jyotsvan-corp',
      'x-user-id': 'usr-super-admin',
      'x-user-email': 'admin@jyotsvan.enterprise',
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, { ...options, headers });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error || `HTTP error ${res.status}`);
    }
    return json;
  }

  // 1. Dashboard Metrics
  public async getSummaryMetrics(): Promise<RetailerSummaryMetrics> {
    const res = await this.fetchJson<{ data: RetailerSummaryMetrics }>('/api/retailers/metrics');
    return res.data;
  }

  // 2. Retailer Master Listing & CRUD
  public async listRetailers(params: {
    search?: string;
    status?: string;
    retailer_type?: string;
    region?: string;
    state?: string;
    distributor_id?: string;
    territory_id?: string;
    salesperson_id?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: RetailerMaster[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.retailer_type && params.retailer_type !== 'all') searchParams.set('retailer_type', params.retailer_type);
    if (params.region && params.region !== 'all') searchParams.set('region', params.region);
    if (params.state && params.state !== 'all') searchParams.set('state', params.state);
    if (params.distributor_id && params.distributor_id !== 'all') searchParams.set('distributor_id', params.distributor_id);
    if (params.territory_id && params.territory_id !== 'all') searchParams.set('territory_id', params.territory_id);
    if (params.salesperson_id && params.salesperson_id !== 'all') searchParams.set('salesperson_id', params.salesperson_id);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    const url = qs ? `/api/retailers?${qs}` : '/api/retailers';
    return this.fetchJson<{ data: RetailerMaster[]; total: number }>(url);
  }

  public async getRetailerById(id: string): Promise<RetailerMaster> {
    const res = await this.fetchJson<{ data: RetailerMaster }>(`/api/retailers/${id}`);
    return res.data;
  }

  public async createRetailer(data: Partial<RetailerMaster>): Promise<RetailerMaster> {
    const res = await this.fetchJson<{ data: RetailerMaster }>('/api/retailers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async updateRetailer(id: string, data: Partial<RetailerMaster>): Promise<RetailerMaster> {
    const res = await this.fetchJson<{ data: RetailerMaster }>(`/api/retailers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async updateRetailerStatus(id: string, status: RetailerStatus, notes?: string): Promise<RetailerMaster> {
    const res = await this.fetchJson<{ data: RetailerMaster }>(`/api/retailers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
    return res.data;
  }

  // 3. Contacts
  public async getContacts(retailerId: string): Promise<RetailerContact[]> {
    const res = await this.fetchJson<{ data: RetailerContact[] }>(`/api/retailers/${retailerId}/contacts`);
    return res.data;
  }

  public async addContact(retailerId: string, data: Partial<RetailerContact>): Promise<RetailerContact> {
    const res = await this.fetchJson<{ data: RetailerContact }>(`/api/retailers/${retailerId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async deleteContact(retailerId: string, contactId: string): Promise<boolean> {
    const res = await this.fetchJson<{ deleted: boolean }>(`/api/retailers/${retailerId}/contacts/${contactId}`, {
      method: 'DELETE',
    });
    return res.deleted;
  }

  // 4. Addresses
  public async getAddresses(retailerId: string): Promise<RetailerAddress[]> {
    const res = await this.fetchJson<{ data: RetailerAddress[] }>(`/api/retailers/${retailerId}/addresses`);
    return res.data;
  }

  public async addAddress(retailerId: string, data: Partial<RetailerAddress>): Promise<RetailerAddress> {
    const res = await this.fetchJson<{ data: RetailerAddress }>(`/api/retailers/${retailerId}/addresses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async deleteAddress(retailerId: string, addressId: string): Promise<boolean> {
    const res = await this.fetchJson<{ deleted: boolean }>(`/api/retailers/${retailerId}/addresses/${addressId}`, {
      method: 'DELETE',
    });
    return res.deleted;
  }

  // 5. Distributor Mappings
  public async getDistributorMappings(retailerId: string): Promise<RetailerDistributorMapping[]> {
    const res = await this.fetchJson<{ data: RetailerDistributorMapping[] }>(`/api/retailers/${retailerId}/distributors`);
    return res.data;
  }

  public async mapDistributor(retailerId: string, data: {
    distributor_id: string;
    is_preferred?: boolean;
    priority_rank?: number;
    territory_id?: string;
    notes?: string;
  }): Promise<RetailerDistributorMapping> {
    const res = await this.fetchJson<{ data: RetailerDistributorMapping }>(`/api/retailers/${retailerId}/distributors`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async unmapDistributor(retailerId: string, distributorId: string): Promise<boolean> {
    const res = await this.fetchJson<{ deleted: boolean }>(`/api/retailers/${retailerId}/distributors/${distributorId}`, {
      method: 'DELETE',
    });
    return res.deleted;
  }

  // 6. Salesperson Assignments
  public async getSalespersonAssignments(retailerId: string): Promise<RetailerSalespersonAssignment[]> {
    const res = await this.fetchJson<{ data: RetailerSalespersonAssignment[] }>(`/api/retailers/${retailerId}/salespersons`);
    return res.data;
  }

  public async assignSalesperson(retailerId: string, data: {
    user_id: string;
    user_name: string;
    role?: string;
    is_primary?: boolean;
    notes?: string;
  }): Promise<RetailerSalespersonAssignment> {
    const res = await this.fetchJson<{ data: RetailerSalespersonAssignment }>(`/api/retailers/${retailerId}/salespersons`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async unassignSalesperson(retailerId: string, assignmentId: string): Promise<boolean> {
    const res = await this.fetchJson<{ deleted: boolean }>(`/api/retailers/${retailerId}/salespersons/${assignmentId}`, {
      method: 'DELETE',
    });
    return res.deleted;
  }

  // 7. Assortment
  public async getAssortment(retailerId: string): Promise<RetailerAssortment[]> {
    const res = await this.fetchJson<{ data: RetailerAssortment[] }>(`/api/retailers/${retailerId}/assortment`);
    return res.data;
  }

  public async addAssortmentItem(retailerId: string, data: {
    sku_id: string;
    minimum_order_quantity?: number;
    target_stock?: number;
    preferred_pack_size?: number;
    agreed_price_basis?: number;
    notes?: string;
  }): Promise<RetailerAssortment> {
    const res = await this.fetchJson<{ data: RetailerAssortment }>(`/api/retailers/${retailerId}/assortment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async removeAssortmentItem(retailerId: string, skuId: string): Promise<boolean> {
    const res = await this.fetchJson<{ deleted: boolean }>(`/api/retailers/${retailerId}/assortment/${skuId}`, {
      method: 'DELETE',
    });
    return res.deleted;
  }

  // 8. Commercial Terms
  public async getCommercialTerms(retailerId: string): Promise<RetailerCommercialTerms> {
    const res = await this.fetchJson<{ data: RetailerCommercialTerms }>(`/api/retailers/${retailerId}/commercial-terms`);
    return res.data;
  }

  // 9. Channel Inventory & Receiving
  public async getStockItems(params: {
    retailer_id?: string;
    sku_id?: string;
    distributor_id?: string;
    search?: string;
    near_expiry?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: RetailerStockItem[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.retailer_id && params.retailer_id !== 'all') searchParams.set('retailer_id', params.retailer_id);
    if (params.sku_id && params.sku_id !== 'all') searchParams.set('sku_id', params.sku_id);
    if (params.distributor_id && params.distributor_id !== 'all') searchParams.set('distributor_id', params.distributor_id);
    if (params.search) searchParams.set('search', params.search);
    if (params.near_expiry) searchParams.set('near_expiry', 'true');
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    const url = qs ? `/api/retailers/inventory?${qs}` : '/api/retailers/inventory';
    return this.fetchJson<{ data: RetailerStockItem[]; total: number }>(url);
  }

  public async listReceivingRecords(params: {
    retailer_id?: string;
    distributor_id?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: RetailerReceivingRecord[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.retailer_id && params.retailer_id !== 'all') searchParams.set('retailer_id', params.retailer_id);
    if (params.distributor_id && params.distributor_id !== 'all') searchParams.set('distributor_id', params.distributor_id);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    const url = qs ? `/api/retailers/receiving-records?${qs}` : '/api/retailers/receiving-records';
    return this.fetchJson<{ data: RetailerReceivingRecord[]; total: number }>(url);
  }

  public async logReceivingRecord(data: any): Promise<RetailerReceivingRecord> {
    const res = await this.fetchJson<{ data: RetailerReceivingRecord }>('/api/retailers/receiving-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  // 10. Orders
  public async listOrders(params: {
    retailer_id?: string;
    distributor_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: RetailerOrderRequest[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.retailer_id && params.retailer_id !== 'all') searchParams.set('retailer_id', params.retailer_id);
    if (params.distributor_id && params.distributor_id !== 'all') searchParams.set('distributor_id', params.distributor_id);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    const url = qs ? `/api/retailers/orders?${qs}` : '/api/retailers/orders';
    return this.fetchJson<{ data: RetailerOrderRequest[]; total: number }>(url);
  }

  public async getOrderById(id: string): Promise<RetailerOrderRequest> {
    const res = await this.fetchJson<{ data: RetailerOrderRequest }>(`/api/retailers/orders/${id}`);
    return res.data;
  }

  public async createOrder(data: any): Promise<RetailerOrderRequest> {
    const res = await this.fetchJson<{ data: RetailerOrderRequest }>('/api/retailers/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async approveOrder(id: string, notes?: string): Promise<RetailerOrderRequest> {
    const res = await this.fetchJson<{ data: RetailerOrderRequest }>(`/api/retailers/orders/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    return res.data;
  }

  public async rejectOrder(id: string, reason: string): Promise<RetailerOrderRequest> {
    const res = await this.fetchJson<{ data: RetailerOrderRequest }>(`/api/retailers/orders/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  }

  // 11. Returns
  public async listReturns(params: {
    retailer_id?: string;
    distributor_id?: string;
    status?: string;
    reason?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: RetailerReturn[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.retailer_id && params.retailer_id !== 'all') searchParams.set('retailer_id', params.retailer_id);
    if (params.distributor_id && params.distributor_id !== 'all') searchParams.set('distributor_id', params.distributor_id);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.reason && params.reason !== 'all') searchParams.set('reason', params.reason);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    const url = qs ? `/api/retailers/returns?${qs}` : '/api/retailers/returns';
    return this.fetchJson<{ data: RetailerReturn[]; total: number }>(url);
  }

  public async createReturn(data: any): Promise<RetailerReturn> {
    const res = await this.fetchJson<{ data: RetailerReturn }>('/api/retailers/returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async approveReturn(id: string, notes?: string): Promise<RetailerReturn> {
    const res = await this.fetchJson<{ data: RetailerReturn }>(`/api/retailers/returns/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    return res.data;
  }

  // 12. Visits
  public async listVisits(params: {
    retailer_id?: string;
    salesperson_id?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: RetailerVisit[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.retailer_id && params.retailer_id !== 'all') searchParams.set('retailer_id', params.retailer_id);
    if (params.salesperson_id && params.salesperson_id !== 'all') searchParams.set('salesperson_id', params.salesperson_id);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    const url = qs ? `/api/retailers/visits?${qs}` : '/api/retailers/visits';
    return this.fetchJson<{ data: RetailerVisit[]; total: number }>(url);
  }

  public async logVisit(data: any): Promise<RetailerVisit> {
    const res = await this.fetchJson<{ data: RetailerVisit }>('/api/retailers/visits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  // 13. Follow-ups
  public async listFollowups(params: {
    retailer_id?: string;
    priority?: string;
    status?: string;
    overdue_only?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: RetailerFollowUp[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.retailer_id && params.retailer_id !== 'all') searchParams.set('retailer_id', params.retailer_id);
    if (params.priority && params.priority !== 'all') searchParams.set('priority', params.priority);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.overdue_only) searchParams.set('overdue_only', 'true');
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    const url = qs ? `/api/retailers/followups?${qs}` : '/api/retailers/followups';
    return this.fetchJson<{ data: RetailerFollowUp[]; total: number }>(url);
  }

  public async createFollowup(data: any): Promise<RetailerFollowUp> {
    const res = await this.fetchJson<{ data: RetailerFollowUp }>('/api/retailers/followups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async updateFollowupStatus(id: string, status: FollowupStatus, notes?: string): Promise<RetailerFollowUp> {
    const res = await this.fetchJson<{ data: RetailerFollowUp }>(`/api/retailers/followups/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
    return res.data;
  }

  // 14. Documents
  public async listDocuments(retailerId: string): Promise<RetailerDocument[]> {
    const res = await this.fetchJson<{ data: RetailerDocument[] }>(`/api/retailers/${retailerId}/documents`);
    return res.data;
  }

  public async uploadDocument(retailerId: string, data: any): Promise<RetailerDocument> {
    const res = await this.fetchJson<{ data: RetailerDocument }>(`/api/retailers/${retailerId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async deleteDocument(retailerId: string, documentId: string): Promise<boolean> {
    const res = await this.fetchJson<{ deleted: boolean }>(`/api/retailers/${retailerId}/documents/${documentId}`, {
      method: 'DELETE',
    });
    return res.deleted;
  }
}

export const retailerApi = new RetailerApiService();
