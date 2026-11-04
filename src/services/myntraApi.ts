// src/services/myntraApi.ts
// Phase 33: Myntra Frontend API Client

import type {
  MyntraOverviewResponse,
  MyntraOrder,
  MyntraListing,
  MyntraInventory,
  MyntraReturn,
  MyntraPerformanceMetric,
  MyntraSyncRequest,
} from '../types/myntra.ts';
import type { MarketplaceEntityMapping } from '../types/marketplace.ts';

const BASE_URL = '/api/integrations/myntra';

export const myntraApi = {
  async getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error('Failed to fetch Myntra health status');
    return res.json();
  },

  async getOverview(): Promise<MyntraOverviewResponse> {
    const res = await fetch(`${BASE_URL}/overview`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch Myntra overview');
    }
    return res.json();
  },

  async getOrders(params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<MyntraOrder[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const res = await fetch(`${BASE_URL}/orders?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch Myntra orders');
    return res.json();
  },

  async getListings(): Promise<MyntraListing[]> {
    const res = await fetch(`${BASE_URL}/listings`);
    if (!res.ok) throw new Error('Failed to fetch Myntra listings');
    return res.json();
  },

  async getInventory(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/inventory`);
    if (!res.ok) throw new Error('Failed to fetch Myntra inventory');
    return res.json();
  },

  async updateInventoryBuffer(sellerSku: string, quantityAvailable: number, safetyBuffer: number) {
    const res = await fetch(`${BASE_URL}/inventory/buffer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sellerSku, quantityAvailable, safetyBuffer }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update Myntra inventory buffer');
    }
    return res.json();
  },

  async getReturns(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/returns`);
    if (!res.ok) throw new Error('Failed to fetch Myntra returns');
    return res.json();
  },

  async getPerformance(): Promise<MyntraPerformanceMetric[]> {
    const res = await fetch(`${BASE_URL}/performance`);
    if (!res.ok) throw new Error('Failed to fetch Myntra performance metrics');
    return res.json();
  },

  async getMappings(): Promise<MarketplaceEntityMapping[]> {
    const res = await fetch(`${BASE_URL}/mappings`);
    if (!res.ok) throw new Error('Failed to fetch Myntra mappings');
    return res.json();
  },

  async saveMapping(id: string, jyotsvanSku: string, mappingStatus: string) {
    const res = await fetch(`${BASE_URL}/mappings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jyotsvanSku, mappingStatus }),
    });
    if (!res.ok) throw new Error('Failed to update Myntra SKU mapping');
    return res.json();
  },

  async autoMatchSkus() {
    const res = await fetch(`${BASE_URL}/mappings/auto-match`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to execute auto-match');
    return res.json();
  },

  async executeSync(request: MyntraSyncRequest) {
    const res = await fetch(`${BASE_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error('Failed to execute Myntra sync job');
    return res.json();
  },

  async testConnection(credentials: {
    clientId: string;
    clientSecret: string;
    sellerPartnerId: string;
    environment?: string;
  }) {
    const res = await fetch(`${BASE_URL}/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw new Error('Myntra connection test failed');
    return res.json();
  },

  async saveConnection(data: {
    clientId: string;
    clientSecret: string;
    sellerPartnerId: string;
    storeLocationId?: string;
    environment?: string;
  }) {
    const res = await fetch(`${BASE_URL}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save Myntra configuration');
    return res.json();
  },

  async disconnect() {
    const res = await fetch(`${BASE_URL}/disconnect`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to disconnect Myntra integration');
    return res.json();
  },
};
