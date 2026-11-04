// src/services/integrationApi.ts
// Frontend Client API for Jyotsvan Enterprise Integration Engine (Phase 24)

import type {
  IntegrationProvider,
  IntegrationConnection,
  IntegrationWebhook,
  IntegrationEvent,
  IntegrationLog,
  IntegrationSyncJob,
  IntegrationMetrics,
  ConnectionTestResult,
  CreateConnectionParams,
  UpdateConnectionParams,
} from '../types/integrations.ts';
import type { AuthUser } from '../types/auth.ts';

const BASE_URL = '/api/integrations';

function getHeaders(user?: AuthUser | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-organization-id': user?.organization_id || 'org-jyotsvan-corp',
    'x-user-id': user?.id || 'usr-owner-sunil',
    'x-user-name': user?.full_name || 'Sunil Patel',
    'x-user-email': user?.email || 'sunil.patel@jyotsvan.enterprise',
  };
}

export const integrationApi = {
  // 1. Providers
  async getProviders(category?: string, search?: string, user?: AuthUser | null): Promise<IntegrationProvider[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);

    const res = await fetch(`${BASE_URL}/providers?${params.toString()}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch providers (${res.status})`);
    }
    const data = await res.json();
    return data.providers || [];
  },

  async getProviderByKey(key: string, user?: AuthUser | null): Promise<IntegrationProvider> {
    const res = await fetch(`${BASE_URL}/providers/${key}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch provider details (${res.status})`);
    }
    const data = await res.json();
    return data.provider;
  },

  // 2. Metrics
  async getMetrics(user?: AuthUser | null): Promise<IntegrationMetrics> {
    const res = await fetch(`${BASE_URL}/metrics`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch metrics (${res.status})`);
    }
    return await res.json();
  },

  // 3. Connections
  async getConnections(
    filters?: { category?: string; status?: string; search?: string },
    user?: AuthUser | null
  ): Promise<IntegrationConnection[]> {
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${BASE_URL}/connections?${params.toString()}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch connections (${res.status})`);
    }
    const data = await res.json();
    return data.connections || [];
  },

  async getConnectionById(id: string, user?: AuthUser | null): Promise<IntegrationConnection> {
    const res = await fetch(`${BASE_URL}/connections/${id}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch connection (${res.status})`);
    }
    const data = await res.json();
    return data.connection;
  },

  async createConnection(params: CreateConnectionParams, user?: AuthUser | null): Promise<IntegrationConnection> {
    const res = await fetch(`${BASE_URL}/connections`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create connection (${res.status})`);
    }
    const data = await res.json();
    return data.connection;
  },

  async updateConnection(
    id: string,
    params: UpdateConnectionParams,
    user?: AuthUser | null
  ): Promise<IntegrationConnection> {
    const res = await fetch(`${BASE_URL}/connections/${id}`, {
      method: 'PUT',
      headers: getHeaders(user),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update connection (${res.status})`);
    }
    const data = await res.json();
    return data.connection;
  },

  async disconnectConnection(id: string, user?: AuthUser | null): Promise<IntegrationConnection> {
    const res = await fetch(`${BASE_URL}/connections/${id}/disconnect`, {
      method: 'POST',
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to disconnect connection (${res.status})`);
    }
    const data = await res.json();
    return data.connection;
  },

  async reconnectConnection(id: string, user?: AuthUser | null): Promise<IntegrationConnection> {
    const res = await fetch(`${BASE_URL}/connections/${id}/reconnect`, {
      method: 'POST',
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to reconnect connection (${res.status})`);
    }
    const data = await res.json();
    return data.connection;
  },

  async deleteConnection(id: string, user?: AuthUser | null): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/connections/${id}`, {
      method: 'DELETE',
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to delete connection (${res.status})`);
    }
    return true;
  },

  async testConnection(
    id: string,
    credentialsOverride?: Record<string, unknown>,
    user?: AuthUser | null
  ): Promise<ConnectionTestResult> {
    const res = await fetch(`${BASE_URL}/connections/${id}/test`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify({ credentials: credentialsOverride }),
    });
    const data = await res.json();
    if (!res.ok && !data.success) {
      return data;
    }
    return data;
  },

  async testUnsavedConnection(
    provider_key: string,
    configuration: Record<string, unknown>,
    credentials: Record<string, unknown>,
    user?: AuthUser | null
  ): Promise<ConnectionTestResult> {
    const res = await fetch(`${BASE_URL}/test`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify({ provider_key, configuration, credentials }),
    });
    const data = await res.json();
    return data;
  },

  // 4. Sync Jobs
  async triggerSync(
    connectionId: string,
    jobType: 'full' | 'incremental' | 'manual' = 'manual',
    user?: AuthUser | null
  ): Promise<IntegrationSyncJob> {
    const res = await fetch(`${BASE_URL}/connections/${connectionId}/sync`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify({ job_type: jobType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to trigger sync (${res.status})`);
    }
    const data = await res.json();
    return data.job;
  },

  async getSyncJobs(connectionId?: string, user?: AuthUser | null): Promise<IntegrationSyncJob[]> {
    const url = connectionId
      ? `${BASE_URL}/connections/${connectionId}/sync-jobs`
      : `${BASE_URL}/sync-jobs`;
    const res = await fetch(url, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch sync jobs (${res.status})`);
    }
    const data = await res.json();
    return data.jobs || [];
  },

  // 5. Webhooks
  async getWebhooks(connectionId?: string, user?: AuthUser | null): Promise<IntegrationWebhook[]> {
    const params = new URLSearchParams();
    if (connectionId) params.append('connection_id', connectionId);

    const res = await fetch(`${BASE_URL}/webhooks?${params.toString()}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch webhooks (${res.status})`);
    }
    const data = await res.json();
    return data.webhooks || [];
  },

  async rotateWebhookSecret(webhookId: string, user?: AuthUser | null): Promise<{ webhookId: string; newSecret: string }> {
    const res = await fetch(`${BASE_URL}/webhooks/${webhookId}/rotate-secret`, {
      method: 'POST',
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to rotate secret (${res.status})`);
    }
    return await res.json();
  },

  // 6. Logs & Events
  async getLogs(
    filters?: { connectionId?: string; providerKey?: string; limit?: number },
    user?: AuthUser | null
  ): Promise<IntegrationLog[]> {
    const params = new URLSearchParams();
    if (filters?.connectionId) params.append('connection_id', filters.connectionId);
    if (filters?.providerKey) params.append('provider_key', filters.providerKey);
    if (filters?.limit) params.append('limit', String(filters.limit));

    const res = await fetch(`${BASE_URL}/logs?${params.toString()}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch logs (${res.status})`);
    }
    const data = await res.json();
    return data.logs || [];
  },

  async getEvents(
    filters?: { connectionId?: string; direction?: string; limit?: number },
    user?: AuthUser | null
  ): Promise<IntegrationEvent[]> {
    const params = new URLSearchParams();
    if (filters?.connectionId) params.append('connection_id', filters.connectionId);
    if (filters?.direction) params.append('direction', filters.direction);
    if (filters?.limit) params.append('limit', String(filters.limit));

    const res = await fetch(`${BASE_URL}/events?${params.toString()}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch events (${res.status})`);
    }
    const data = await res.json();
    return data.events || [];
  },

  // 7. REST Console Runner
  async executeRest(
    connectionId: string,
    params: { method: string; path: string; body?: unknown; headers?: Record<string, string> },
    user?: AuthUser | null
  ): Promise<{ status: number; data: unknown; latencyMs: number; headers: Record<string, string> }> {
    const res = await fetch(`${BASE_URL}/connections/${connectionId}/execute-rest`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  },
};
