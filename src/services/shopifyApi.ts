// src/services/shopifyApi.ts
// Phase 25: Client API Service for Shopify Integration Engine

import type {
  ShopifyOverviewResponse,
  ShopifyProduct,
  ShopifyOrder,
  ShopifyCustomer,
  ShopifyLocation,
  IntegrationEntityMapping,
  ShopifySyncException,
  ShopifySyncRequest,
} from '../types/shopify.ts';
import type { IntegrationSyncJob } from '../types/integrations.ts';
import type { UserProfile } from '../types/auth.ts';

const BASE_URL = '/api/integrations/shopify';

function getHeaders(user?: UserProfile | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (user) {
    if (user.organization_id) headers['x-organization-id'] = user.organization_id;
    if (user.id) headers['x-user-id'] = user.id;
    if (user.full_name) headers['x-user-name'] = user.full_name;
    if (user.email) headers['x-user-email'] = user.email;
  }
  return headers;
}

export const shopifyApi = {
  async getOverview(user?: UserProfile | null): Promise<ShopifyOverviewResponse> {
    const res = await fetch(`${BASE_URL}/overview`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch overview' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getStatus(user?: UserProfile | null): Promise<{ connected: boolean; connection: any }> {
    const res = await fetch(`${BASE_URL}/status`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to check status' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async testConnection(
    params: { shop_domain: string; admin_api_access_token: string; api_version?: string },
    user?: UserProfile | null
  ): Promise<{ success: boolean; message: string; latency_ms: number; shop?: any }> {
    const res = await fetch(`${BASE_URL}/test`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }
    return data;
  },

  async configureStore(
    params: {
      shop_domain: string;
      admin_api_access_token?: string;
      api_version?: string;
      webhook_secret?: string;
      sync_frequency_minutes?: number;
      connection_name?: string;
      is_sandbox?: boolean;
    },
    user?: UserProfile | null
  ): Promise<{ success: boolean; message: string; connection: any; shop?: any }> {
    const res = await fetch(`${BASE_URL}/configure`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || `HTTP ${res.status}`);
    }
    return data;
  },

  async triggerSync(
    req?: ShopifySyncRequest,
    user?: UserProfile | null
  ): Promise<{ success: boolean; message: string; jobId?: string; [key: string]: any }> {
    const res = await fetch(`${BASE_URL}/sync`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify(req || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Sync failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getProducts(user?: UserProfile | null): Promise<ShopifyProduct[]> {
    const res = await fetch(`${BASE_URL}/products`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch products' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getOrders(user?: UserProfile | null): Promise<ShopifyOrder[]> {
    const res = await fetch(`${BASE_URL}/orders`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch orders' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getCustomers(user?: UserProfile | null): Promise<ShopifyCustomer[]> {
    const res = await fetch(`${BASE_URL}/customers`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch customers' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getMappings(
    entityType = 'sku',
    status?: string,
    search?: string,
    user?: UserProfile | null
  ): Promise<IntegrationEntityMapping[]> {
    const params = new URLSearchParams();
    params.append('entityType', entityType);
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);

    const res = await fetch(`${BASE_URL}/mappings?${params.toString()}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch mappings' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async saveMapping(
    data: {
      entityType: 'sku' | 'location' | 'customer' | 'product';
      externalId: string;
      internalId: string;
      externalIdentifier?: string;
      internalIdentifier?: string;
      metadata?: Record<string, unknown>;
    },
    user?: UserProfile | null
  ): Promise<IntegrationEntityMapping> {
    const res = await fetch(`${BASE_URL}/mappings`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to save mapping' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async autoMapSKUs(user?: UserProfile | null): Promise<{ autoMappedCount: number; remainingUnmapped: number }> {
    const res = await fetch(`${BASE_URL}/mappings/auto-map`, {
      method: 'POST',
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Auto-map failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getLocations(user?: UserProfile | null): Promise<ShopifyLocation[]> {
    const res = await fetch(`${BASE_URL}/locations`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch locations' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async mapLocation(
    shopifyLocationId: string | number,
    warehouseId: string,
    user?: UserProfile | null
  ): Promise<{ success: boolean; mapping: IntegrationEntityMapping }> {
    const res = await fetch(`${BASE_URL}/locations/map`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify({ shopifyLocationId: String(shopifyLocationId), warehouseId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to map location' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getSyncJobs(user?: UserProfile | null): Promise<IntegrationSyncJob[]> {
    const res = await fetch(`${BASE_URL}/sync-jobs`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch sync jobs' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getExceptions(user?: UserProfile | null): Promise<ShopifySyncException[]> {
    const res = await fetch(`${BASE_URL}/exceptions`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch exceptions' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async resolveException(
    id: string,
    resolutionNotes?: string,
    user?: UserProfile | null
  ): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/exceptions/${id}/resolve`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify({ resolutionNotes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to resolve exception' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
};
