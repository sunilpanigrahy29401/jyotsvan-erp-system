// src/services/flipkartApi.ts
// Phase 32: Flipkart Frontend API Client

import type {
  FlipkartOverviewResponse,
  FlipkartOrder,
  FlipkartListing,
  FlipkartInventory,
  FlipkartReturn,
  FlipkartPerformanceMetric,
  FlipkartEntityMapping,
  FlipkartSyncRequest,
} from '../types/flipkart.ts';

const BASE_URL = '/api/integrations/flipkart';

export const flipkartApi = {
  async getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error('Failed to fetch Flipkart health status');
    return res.json();
  },

  async getOverview(): Promise<FlipkartOverviewResponse> {
    const res = await fetch(`${BASE_URL}/overview`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch Flipkart overview');
    }
    return res.json();
  },

  async getOrders(params?: {
    status?: string;
    fulfillmentChannel?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: FlipkartOrder[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.fulfillmentChannel) query.set('fulfillmentChannel', params.fulfillmentChannel);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const res = await fetch(`${BASE_URL}/orders?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch Flipkart orders');
    return res.json();
  },

  async getListings(params?: { status?: string; search?: string }): Promise<{ listings: FlipkartListing[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`${BASE_URL}/listings?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch Flipkart listings');
    return res.json();
  },

  async getInventory(): Promise<{ inventory: FlipkartInventory[]; total: number }> {
    const res = await fetch(`${BASE_URL}/inventory`);
    if (!res.ok) throw new Error('Failed to fetch Flipkart inventory');
    return res.json();
  },

  async updateInventoryStock(sellerSku: string, fulfillmentChannel: string, quantityAvailable: number) {
    const res = await fetch(`${BASE_URL}/inventory/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sellerSku, fulfillmentChannel, quantityAvailable }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update Flipkart inventory');
    }
    return res.json();
  },

  async getReturns(): Promise<{ returns: FlipkartReturn[]; total: number }> {
    const res = await fetch(`${BASE_URL}/returns`);
    if (!res.ok) throw new Error('Failed to fetch Flipkart returns');
    return res.json();
  },

  async getPerformance(): Promise<{ metrics: FlipkartPerformanceMetric[]; total: number }> {
    const res = await fetch(`${BASE_URL}/performance`);
    if (!res.ok) throw new Error('Failed to fetch Flipkart performance metrics');
    return res.json();
  },

  async getMappings(): Promise<{ mappings: FlipkartEntityMapping[]; total: number }> {
    const res = await fetch(`${BASE_URL}/mappings`);
    if (!res.ok) throw new Error('Failed to fetch Flipkart mappings');
    return res.json();
  },

  async saveMapping(id: string, jyotsvanSku: string, mappingStatus: string) {
    const res = await fetch(`${BASE_URL}/mappings/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jyotsvanSku, mappingStatus }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update mapping');
    }
    return res.json();
  },

  async triggerSync(request: FlipkartSyncRequest) {
    const res = await fetch(`${BASE_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to trigger Flipkart sync');
    }
    return res.json();
  },

  async testConnection(credentials: {
    appId: string;
    appSecret: string;
    sellerId?: string;
    environment?: string;
  }) {
    const res = await fetch(`${BASE_URL}/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw new Error('Connection test request failed');
    return res.json();
  },

  async configureConnection(config: {
    appId: string;
    appSecret?: string;
    sellerId?: string;
    locationId?: string;
    environment?: string;
  }) {
    const res = await fetch(`${BASE_URL}/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to configure Flipkart connection');
    }
    return res.json();
  },
};
