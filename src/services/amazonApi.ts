// src/services/amazonApi.ts
// Phase 31: Amazon SP-API & Marketplace Frontend API Client

import type {
  AmazonOverviewResponse,
  AmazonMarketplace,
  AmazonOrder,
  AmazonProduct,
  AmazonInventory,
  AmazonReturn,
  AmazonReport,
  AmazonSettlement,
  AmazonFee,
  AmazonEntityMapping,
  AmazonSyncRequest,
} from '../types/amazon.ts';

const BASE_URL = '/api/integrations/amazon';

export const amazonApi = {
  async getOverview(marketplaceId?: string, connectionId?: string): Promise<AmazonOverviewResponse> {
    const params = new URLSearchParams();
    if (marketplaceId) params.append('marketplaceId', marketplaceId);
    if (connectionId) params.append('connectionId', connectionId);

    const res = await fetch(`${BASE_URL}/overview?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch Amazon overview');
    }
    return res.json();
  },

  async getOrders(params: {
    marketplaceId?: string;
    status?: string;
    fulfillmentChannel?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ orders: AmazonOrder[]; total: number }> {
    const q = new URLSearchParams();
    if (params.marketplaceId) q.append('marketplaceId', params.marketplaceId);
    if (params.status) q.append('status', params.status);
    if (params.fulfillmentChannel) q.append('fulfillmentChannel', params.fulfillmentChannel);
    if (params.startDate) q.append('startDate', params.startDate);
    if (params.endDate) q.append('endDate', params.endDate);
    if (params.search) q.append('search', params.search);
    if (params.limit) q.append('limit', String(params.limit));
    if (params.offset) q.append('offset', String(params.offset));

    const res = await fetch(`${BASE_URL}/orders?${q.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch Amazon orders');
    }
    return res.json();
  },

  async getProducts(params: {
    marketplaceId?: string;
    status?: string;
    fulfillmentChannel?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ products: AmazonProduct[]; total: number }> {
    const q = new URLSearchParams();
    if (params.marketplaceId) q.append('marketplaceId', params.marketplaceId);
    if (params.status) q.append('status', params.status);
    if (params.fulfillmentChannel) q.append('fulfillmentChannel', params.fulfillmentChannel);
    if (params.search) q.append('search', params.search);
    if (params.limit) q.append('limit', String(params.limit));
    if (params.offset) q.append('offset', String(params.offset));

    const res = await fetch(`${BASE_URL}/products?${q.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch Amazon products');
    }
    return res.json();
  },

  async getInventory(params: {
    marketplaceId?: string;
    fulfillmentChannel?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ inventory: AmazonInventory[]; total: number }> {
    const q = new URLSearchParams();
    if (params.marketplaceId) q.append('marketplaceId', params.marketplaceId);
    if (params.fulfillmentChannel) q.append('fulfillmentChannel', params.fulfillmentChannel);
    if (params.search) q.append('search', params.search);
    if (params.limit) q.append('limit', String(params.limit));
    if (params.offset) q.append('offset', String(params.offset));

    const res = await fetch(`${BASE_URL}/inventory?${q.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch Amazon inventory');
    }
    return res.json();
  },

  async getReturns(params: {
    marketplaceId?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ returns: AmazonReturn[]; total: number }> {
    const q = new URLSearchParams();
    if (params.marketplaceId) q.append('marketplaceId', params.marketplaceId);
    if (params.status) q.append('status', params.status);
    if (params.search) q.append('search', params.search);
    if (params.limit) q.append('limit', String(params.limit));
    if (params.offset) q.append('offset', String(params.offset));

    const res = await fetch(`${BASE_URL}/returns?${q.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch Amazon returns');
    }
    return res.json();
  },

  async getReports(params: {
    reportType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ reports: AmazonReport[]; total: number }> {
    const q = new URLSearchParams();
    if (params.reportType) q.append('reportType', params.reportType);
    if (params.status) q.append('status', params.status);
    if (params.limit) q.append('limit', String(params.limit));
    if (params.offset) q.append('offset', String(params.offset));

    const res = await fetch(`${BASE_URL}/reports?${q.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch Amazon reports');
    }
    return res.json();
  },

  async requestReport(data: {
    reportType: string;
    marketplaceId?: string;
    dataStartTime?: string;
    dataEndTime?: string;
  }): Promise<{ success: boolean; report: AmazonReport }> {
    const res = await fetch(`${BASE_URL}/reports/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to request Amazon report');
    }
    return res.json();
  },

  async getSettlements(): Promise<{ settlements: AmazonSettlement[]; total: number }> {
    const res = await fetch(`${BASE_URL}/settlements`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch Amazon settlements');
    }
    return res.json();
  },

  async getFees(params: { feeType?: string; limit?: number; offset?: number } = {}): Promise<{ fees: AmazonFee[]; total: number }> {
    const q = new URLSearchParams();
    if (params.feeType) q.append('feeType', params.feeType);
    if (params.limit) q.append('limit', String(params.limit));
    if (params.offset) q.append('offset', String(params.offset));

    const res = await fetch(`${BASE_URL}/fees?${q.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch Amazon fees');
    }
    return res.json();
  },

  async getMappings(): Promise<{ mappings: AmazonEntityMapping[]; total: number }> {
    const res = await fetch(`${BASE_URL}/mappings`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch Amazon SKU mappings');
    }
    return res.json();
  },

  async updateMapping(
    mappingId: string,
    body: {
      jyotsvan_sku?: string;
      jyotsvan_product_name?: string;
      mapping_status: 'mapped' | 'unmapped' | 'auto_matched' | 'ignored';
      notes?: string;
    }
  ): Promise<{ success: boolean; mapping: AmazonEntityMapping }> {
    const res = await fetch(`${BASE_URL}/mappings/${mappingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update mapping');
    }
    return res.json();
  },

  async autoMatchMappings(): Promise<{ matchedCount: number; message: string }> {
    const res = await fetch(`${BASE_URL}/mappings/auto-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to auto-match SKUs');
    }
    return res.json();
  },

  async testConnection(body?: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${BASE_URL}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Connection test failed');
    }
    return res.json();
  },

  async triggerSync(request: AmazonSyncRequest): Promise<{ success: boolean; recordsProcessed: number; details: Record<string, any> }> {
    const res = await fetch(`${BASE_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Sync execution failed');
    }
    return res.json();
  },

  async saveConfiguration(config: any): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save configuration');
    }
    return res.json();
  },
};
