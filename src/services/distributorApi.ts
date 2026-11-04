import type {
  DistributorMaster,
  DistributorContact,
  DistributorAddress,
  DistributorCFMapping,
  DistributorAssortment,
  DistributorStockItem,
  DistributorTransfer,
  DistributorDiscrepancy,
  DistributorOrder,
  DistributorReturn,
  DistributorSummaryMetrics,
  Territory,
  DistributorStatus,
  DiscrepancyResolutionStatus,
} from '../types/distributors.ts';

class DistributorApiService {
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
  public async getSummaryMetrics(): Promise<DistributorSummaryMetrics> {
    const res = await this.fetchJson<{ data: DistributorSummaryMetrics }>('/api/distributors/metrics');
    return res.data;
  }

  // 2. Territories
  public async listTerritories(): Promise<Territory[]> {
    const res = await this.fetchJson<{ data: Territory[] }>('/api/distributors/territories');
    return res.data;
  }

  // 3. Distributor Master Listing & CRUD
  public async listDistributors(params: {
    search?: string;
    status?: string;
    distributor_type?: string;
    region?: string;
    state?: string;
    cf_id?: string;
    territory_id?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: DistributorMaster[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    if (params.distributor_type) searchParams.set('distributor_type', params.distributor_type);
    if (params.region) searchParams.set('region', params.region);
    if (params.state) searchParams.set('state', params.state);
    if (params.cf_id) searchParams.set('cf_id', params.cf_id);
    if (params.territory_id) searchParams.set('territory_id', params.territory_id);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const url = `/api/distributors?${searchParams.toString()}`;
    return this.fetchJson<{ data: DistributorMaster[]; total: number }>(url);
  }

  public async getDistributorById(id: string): Promise<DistributorMaster> {
    const res = await this.fetchJson<{ data: DistributorMaster }>(`/api/distributors/${id}`);
    return res.data;
  }

  public async createDistributor(payload: any): Promise<DistributorMaster> {
    const res = await this.fetchJson<{ data: DistributorMaster }>('/api/distributors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async updateDistributor(id: string, payload: any): Promise<DistributorMaster> {
    const res = await this.fetchJson<{ data: DistributorMaster }>(`/api/distributors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async updateDistributorStatus(
    id: string,
    status: DistributorStatus,
    notes?: string
  ): Promise<DistributorMaster> {
    const res = await this.fetchJson<{ data: DistributorMaster }>(`/api/distributors/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
    return res.data;
  }

  // 4. Contacts & Addresses
  public async getContacts(distId: string): Promise<DistributorContact[]> {
    const res = await this.fetchJson<{ data: DistributorContact[] }>(`/api/distributors/${distId}/contacts`);
    return res.data;
  }

  public async addContact(distId: string, payload: any): Promise<DistributorContact> {
    const res = await this.fetchJson<{ data: DistributorContact }>(`/api/distributors/${distId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async deleteContact(distId: string, contactId: string): Promise<void> {
    await this.fetchJson(`/api/distributors/${distId}/contacts/${contactId}`, { method: 'DELETE' });
  }

  public async getAddresses(distId: string): Promise<DistributorAddress[]> {
    const res = await this.fetchJson<{ data: DistributorAddress[] }>(`/api/distributors/${distId}/addresses`);
    return res.data;
  }

  public async addAddress(distId: string, payload: any): Promise<DistributorAddress> {
    const res = await this.fetchJson<{ data: DistributorAddress }>(`/api/distributors/${distId}/addresses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  // 5. C&F Mappings
  public async getMappedCFs(distId: string): Promise<DistributorCFMapping[]> {
    const res = await this.fetchJson<{ data: DistributorCFMapping[] }>(`/api/distributors/${distId}/cfs`);
    return res.data;
  }

  public async mapCF(distId: string, payload: any): Promise<DistributorCFMapping> {
    const res = await this.fetchJson<{ data: DistributorCFMapping }>(`/api/distributors/${distId}/cfs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async unmapCF(distId: string, cfId: string): Promise<void> {
    await this.fetchJson(`/api/distributors/${distId}/cfs/${cfId}`, { method: 'DELETE' });
  }

  // 6. Assortment
  public async getAssortment(distId: string): Promise<DistributorAssortment[]> {
    const res = await this.fetchJson<{ data: DistributorAssortment[] }>(`/api/distributors/${distId}/assortment`);
    return res.data;
  }

  public async addAssortmentItem(distId: string, payload: any): Promise<DistributorAssortment> {
    const res = await this.fetchJson<{ data: DistributorAssortment }>(`/api/distributors/${distId}/assortment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async removeAssortmentItem(distId: string, skuId: string): Promise<void> {
    await this.fetchJson(`/api/distributors/${distId}/assortment/${skuId}`, { method: 'DELETE' });
  }

  // 7. Channel Inventory
  public async getInventoryItems(params: {
    distributor_id?: string;
    sku_id?: string;
    cf_id?: string;
    search?: string;
    near_expiry?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: DistributorStockItem[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.distributor_id) searchParams.set('distributor_id', params.distributor_id);
    if (params.sku_id) searchParams.set('sku_id', params.sku_id);
    if (params.cf_id) searchParams.set('cf_id', params.cf_id);
    if (params.search) searchParams.set('search', params.search);
    if (params.near_expiry) searchParams.set('near_expiry', 'true');
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const url = `/api/distributors/inventory/items?${searchParams.toString()}`;
    return this.fetchJson<{ data: DistributorStockItem[]; total: number }>(url);
  }

  // 8. Transfers
  public async listTransfers(params: {
    distributor_id?: string;
    cf_id?: string;
    status?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: DistributorTransfer[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.distributor_id) searchParams.set('distributor_id', params.distributor_id);
    if (params.cf_id) searchParams.set('cf_id', params.cf_id);
    if (params.status) searchParams.set('status', params.status);
    if (params.priority) searchParams.set('priority', params.priority);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const url = `/api/distributors/transfers/list?${searchParams.toString()}`;
    return this.fetchJson<{ data: DistributorTransfer[]; total: number }>(url);
  }

  public async getTransferById(id: string): Promise<DistributorTransfer> {
    const res = await this.fetchJson<{ data: DistributorTransfer }>(`/api/distributors/transfers/${id}`);
    return res.data;
  }

  public async createTransfer(payload: any): Promise<DistributorTransfer> {
    const res = await this.fetchJson<{ data: DistributorTransfer }>('/api/distributors/transfers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async approveTransfer(id: string): Promise<DistributorTransfer> {
    const res = await this.fetchJson<{ data: DistributorTransfer }>(`/api/distributors/transfers/${id}/approve`, {
      method: 'POST',
    });
    return res.data;
  }

  public async dispatchTransfer(id: string, payload: any): Promise<DistributorTransfer> {
    const res = await this.fetchJson<{ data: DistributorTransfer }>(`/api/distributors/transfers/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async receiveTransfer(id: string, payload: any): Promise<DistributorTransfer> {
    const res = await this.fetchJson<{ data: DistributorTransfer }>(`/api/distributors/transfers/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async cancelTransfer(id: string, reason?: string): Promise<DistributorTransfer> {
    const res = await this.fetchJson<{ data: DistributorTransfer }>(`/api/distributors/transfers/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  }

  // 9. Discrepancies
  public async listDiscrepancies(params: {
    distributor_id?: string;
    cf_id?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: DistributorDiscrepancy[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.distributor_id) searchParams.set('distributor_id', params.distributor_id);
    if (params.cf_id) searchParams.set('cf_id', params.cf_id);
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const url = `/api/distributors/discrepancies/list?${searchParams.toString()}`;
    return this.fetchJson<{ data: DistributorDiscrepancy[]; total: number }>(url);
  }

  public async resolveDiscrepancy(
    id: string,
    payload: { resolution_status: DiscrepancyResolutionStatus; resolution_notes?: string }
  ): Promise<DistributorDiscrepancy> {
    const res = await this.fetchJson<{ data: DistributorDiscrepancy }>(
      `/api/distributors/discrepancies/${id}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  }

  // 10. Orders
  public async listOrders(params: {
    distributor_id?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: DistributorOrder[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.distributor_id) searchParams.set('distributor_id', params.distributor_id);
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const url = `/api/distributors/orders/list?${searchParams.toString()}`;
    return this.fetchJson<{ data: DistributorOrder[]; total: number }>(url);
  }

  public async createOrder(payload: any): Promise<DistributorOrder> {
    const res = await this.fetchJson<{ data: DistributorOrder }>('/api/distributors/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async approveOrder(id: string): Promise<DistributorOrder> {
    const res = await this.fetchJson<{ data: DistributorOrder }>(`/api/distributors/orders/${id}/approve`, {
      method: 'POST',
    });
    return res.data;
  }

  // 11. Returns
  public async listReturns(params: {
    distributor_id?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: DistributorReturn[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.distributor_id) searchParams.set('distributor_id', params.distributor_id);
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const url = `/api/distributors/returns/list?${searchParams.toString()}`;
    return this.fetchJson<{ data: DistributorReturn[]; total: number }>(url);
  }

  public async createReturn(payload: any): Promise<DistributorReturn> {
    const res = await this.fetchJson<{ data: DistributorReturn }>('/api/distributors/returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }
}

export const distributorApi = new DistributorApiService();
