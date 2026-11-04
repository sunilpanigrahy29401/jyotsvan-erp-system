import type {
  CFMaster,
  CFTransfer,
  CFDispatch,
  CFStockItem,
  CFTransferDiscrepancy,
  CFSummaryMetrics,
  CFQueryParams,
  CFStatus,
} from '../types/cfs';

class CFApiService {
  private async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-organization-id': 'org-jyotsvan-corp',
      'x-user-id': 'usr-super-admin',
      'x-user-email': 'admin@jyotsvan.enterprise',
      ...(options.headers as Record<string, string> || {}),
    };

    const res = await fetch(url, { ...options, headers });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error || `HTTP error ${res.status}`);
    }
    return json;
  }

  // 1. Dashboard Metrics
  public async getSummaryMetrics(): Promise<CFSummaryMetrics> {
    const res = await this.fetchJson<{ data: CFSummaryMetrics }>('/api/cfs/metrics');
    return res.data;
  }

  // 2. C&F Master Registry
  public async listCFs(params: CFQueryParams = {}): Promise<{ data: CFMaster[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    if (params.type) searchParams.set('type', params.type);
    if (params.region) searchParams.set('region', params.region);
    if (params.state) searchParams.set('state', params.state);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const url = `/api/cfs?${searchParams.toString()}`;
    return this.fetchJson<{ data: CFMaster[]; total: number }>(url);
  }

  public async getCFById(id: string): Promise<CFMaster> {
    const res = await this.fetchJson<{ data: CFMaster }>(`/api/cfs/${id}`);
    return res.data;
  }

  public async createCF(payload: Partial<CFMaster>): Promise<CFMaster> {
    const res = await this.fetchJson<{ data: CFMaster }>('/api/cfs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async updateCF(id: string, payload: Partial<CFMaster>): Promise<CFMaster> {
    const res = await this.fetchJson<{ data: CFMaster }>(`/api/cfs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async updateCFStatus(id: string, status: CFStatus, reason?: string): Promise<CFMaster> {
    const res = await this.fetchJson<{ data: CFMaster }>(`/api/cfs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
    return res.data;
  }

  public async assignWarehouse(cfId: string, warehouseId: string, isPrimary: boolean = false, agreementRef?: string): Promise<void> {
    await this.fetchJson(`/api/cfs/${cfId}/warehouses`, {
      method: 'POST',
      body: JSON.stringify({ warehouseId, isPrimary, agreementRef }),
    });
  }

  public async unassignWarehouse(cfId: string, warehouseId: string): Promise<void> {
    await this.fetchJson(`/api/cfs/${cfId}/warehouses/${warehouseId}`, {
      method: 'DELETE',
    });
  }

  // 3. Stock Transfers (Inward)
  public async listTransfers(params: { cfId?: string; status?: string; search?: string; page?: number; limit?: number } = {}): Promise<{ data: CFTransfer[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.cfId) searchParams.set('cfId', params.cfId);
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const url = `/api/cfs/transfers?${searchParams.toString()}`;
    return this.fetchJson<{ data: CFTransfer[]; total: number }>(url);
  }

  public async getTransferById(id: string): Promise<CFTransfer> {
    const res = await this.fetchJson<{ data: CFTransfer }>(`/api/cfs/transfers/${id}`);
    return res.data;
  }

  public async createTransfer(payload: any): Promise<CFTransfer> {
    const res = await this.fetchJson<{ data: CFTransfer }>('/api/cfs/transfers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async approveTransfer(id: string): Promise<CFTransfer> {
    const res = await this.fetchJson<{ data: CFTransfer }>(`/api/cfs/transfers/${id}/approve`, {
      method: 'POST',
    });
    return res.data;
  }

  public async dispatchTransfer(id: string, payload: any): Promise<CFTransfer> {
    const res = await this.fetchJson<{ data: CFTransfer }>(`/api/cfs/transfers/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async receiveTransfer(id: string, payload: {
    items: Array<{
      item_id: string;
      received_quantity: number;
      shortage_quantity?: number;
      damaged_quantity?: number;
      rejected_quantity?: number;
      notes?: string;
    }>;
    notes?: string;
  }): Promise<CFTransfer> {
    const res = await this.fetchJson<{ data: CFTransfer }>(`/api/cfs/transfers/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  // 4. Outbound Dispatches
  public async listDispatches(params: { cfId?: string; status?: string; search?: string; page?: number; limit?: number } = {}): Promise<{ data: CFDispatch[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.cfId) searchParams.set('cfId', params.cfId);
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const url = `/api/cfs/dispatches?${searchParams.toString()}`;
    return this.fetchJson<{ data: CFDispatch[]; total: number }>(url);
  }

  public async getDispatchById(id: string): Promise<CFDispatch> {
    const res = await this.fetchJson<{ data: CFDispatch }>(`/api/cfs/dispatches/${id}`);
    return res.data;
  }

  public async createDispatch(payload: any): Promise<CFDispatch> {
    const res = await this.fetchJson<{ data: CFDispatch }>('/api/cfs/dispatches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  public async executeDispatch(id: string): Promise<CFDispatch> {
    const res = await this.fetchJson<{ data: CFDispatch }>(`/api/cfs/dispatches/${id}/execute`, {
      method: 'POST',
    });
    return res.data;
  }

  // 5. Live Depot Inventory
  public async getDepotInventory(params: { cfId?: string; warehouseId?: string; search?: string } = {}): Promise<CFStockItem[]> {
    const searchParams = new URLSearchParams();
    if (params.cfId) searchParams.set('cfId', params.cfId);
    if (params.warehouseId) searchParams.set('warehouseId', params.warehouseId);
    if (params.search) searchParams.set('search', params.search);

    const url = `/api/cfs/inventory?${searchParams.toString()}`;
    const res = await this.fetchJson<{ data: CFStockItem[] }>(url);
    return res.data;
  }

  // 6. Discrepancies
  public async getDiscrepancies(params: { cfId?: string; status?: string } = {}): Promise<CFTransferDiscrepancy[]> {
    const searchParams = new URLSearchParams();
    if (params.cfId) searchParams.set('cfId', params.cfId);
    if (params.status) searchParams.set('status', params.status);

    const url = `/api/cfs/discrepancies?${searchParams.toString()}`;
    const res = await this.fetchJson<{ data: CFTransferDiscrepancy[] }>(url);
    return res.data;
  }

  public async resolveDiscrepancy(id: string, resolutionStatus: string, resolutionNotes: string): Promise<void> {
    await this.fetchJson(`/api/cfs/discrepancies/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolutionStatus, resolutionNotes }),
    });
  }
}

export const cfApi = new CFApiService();
