// src/services/metaApi.ts
// Phase 26: Frontend Client Service for Meta Marketing & Ads API

import type {
  MetaOverviewResponse,
  MetaAdAccount,
  MetaCampaign,
  MetaAdSet,
  MetaAd,
  MetaDailyInsight,
  MetaBreakdownInsight,
  MetaSyncException,
  MetaSyncRequest,
  MetaTestConnectionResponse,
  BreakdownType,
} from '../types/meta.ts';
import type { IntegrationSyncJob } from '../types/integrations.ts';
import type { UserProfile } from '../types/auth.ts';

const BASE_URL = '/api/integrations/meta';

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

export const metaApi = {
  async getOverview(
    dateRange?: { startDate?: string; endDate?: string },
    user?: UserProfile | null
  ): Promise<MetaOverviewResponse> {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.set('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.set('endDate', dateRange.endDate);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${BASE_URL}/overview${qs}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch Meta Ads overview' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return body.data;
  },

  async testConnection(
    params: {
      accessToken?: string;
      appId?: string;
      appSecret?: string;
      apiVersion?: string;
      adAccountId?: string;
    },
    user?: UserProfile | null
  ): Promise<MetaTestConnectionResponse> {
    const res = await fetch(`${BASE_URL}/test`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify(params),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || body.message || `HTTP ${res.status}`);
    }
    return body;
  },

  async configure(
    params: {
      accessToken?: string;
      appId?: string;
      appSecret?: string;
      adAccountId?: string;
      apiVersion?: string;
      syncFrequencyMinutes?: number;
      syncWindowDays?: number;
      isSandbox?: boolean;
    },
    user?: UserProfile | null
  ): Promise<{ success: boolean; connection: any; testResult: any }> {
    const res = await fetch(`${BASE_URL}/configure`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to configure Meta integration' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return body.data;
  },

  async discoverAdAccounts(user?: UserProfile | null): Promise<MetaAdAccount[]> {
    const res = await fetch(`${BASE_URL}/accounts`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to discover ad accounts' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return body.data || [];
  },

  async selectPrimaryAccount(adAccountId: string, user?: UserProfile | null): Promise<any> {
    const res = await fetch(`${BASE_URL}/select-account`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify({ adAccountId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to select ad account' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return body.data;
  },

  async triggerSync(options: MetaSyncRequest = {}, user?: UserProfile | null): Promise<IntegrationSyncJob> {
    const res = await fetch(`${BASE_URL}/sync`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify(options),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to trigger Meta sync' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return body.data;
  },

  async getCampaigns(
    filters: { status?: string; search?: string; limit?: number; offset?: number } = {},
    user?: UserProfile | null
  ): Promise<{ campaigns: MetaCampaign[]; total: number }> {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${BASE_URL}/campaigns${qs}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch campaigns' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return { campaigns: body.data || [], total: body.total || 0 };
  },

  async getAdSets(
    filters: { campaignId?: string; status?: string; limit?: number; offset?: number } = {},
    user?: UserProfile | null
  ): Promise<{ adSets: MetaAdSet[]; total: number }> {
    const params = new URLSearchParams();
    if (filters.campaignId) params.set('campaignId', filters.campaignId);
    if (filters.status) params.set('status', filters.status);
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${BASE_URL}/adsets${qs}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch ad sets' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return { adSets: body.data || [], total: body.total || 0 };
  },

  async getAds(
    filters: { campaignId?: string; adSetId?: string; limit?: number; offset?: number } = {},
    user?: UserProfile | null
  ): Promise<{ ads: MetaAd[]; total: number }> {
    const params = new URLSearchParams();
    if (filters.campaignId) params.set('campaignId', filters.campaignId);
    if (filters.adSetId) params.set('adSetId', filters.adSetId);
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${BASE_URL}/ads${qs}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch ads' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return { ads: body.data || [], total: body.total || 0 };
  },

  async getDailyPerformance(
    options: { startDate?: string; endDate?: string; level?: 'account' | 'campaign'; campaignId?: string } = {},
    user?: UserProfile | null
  ): Promise<MetaDailyInsight[]> {
    const params = new URLSearchParams();
    if (options.startDate) params.set('startDate', options.startDate);
    if (options.endDate) params.set('endDate', options.endDate);
    if (options.level) params.set('level', options.level);
    if (options.campaignId) params.set('campaignId', options.campaignId);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${BASE_URL}/insights/daily${qs}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch daily insights' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return body.data || [];
  },

  async getBreakdowns(
    type: BreakdownType = 'publisher_platform',
    user?: UserProfile | null
  ): Promise<MetaBreakdownInsight[]> {
    const res = await fetch(`${BASE_URL}/insights/breakdowns?type=${type}`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch breakdowns' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return body.data || [];
  },

  async getRecentJobs(user?: UserProfile | null): Promise<IntegrationSyncJob[]> {
    const res = await fetch(`${BASE_URL}/jobs`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch sync jobs' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return body.data || [];
  },

  async getExceptions(user?: UserProfile | null): Promise<MetaSyncException[]> {
    const res = await fetch(`${BASE_URL}/exceptions`, {
      headers: getHeaders(user),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch exceptions' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return body.data || [];
  },

  async retryException(exceptionId: string, user?: UserProfile | null): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/exceptions/${exceptionId}/retry`, {
      method: 'POST',
      headers: getHeaders(user),
    });
    return res.ok;
  },

  async startOAuthFlow(
    appId?: string,
    redirectUri?: string,
    user?: UserProfile | null
  ): Promise<{ authUrl: string; stateToken: string }> {
    const res = await fetch(`${BASE_URL}/oauth/start`, {
      method: 'POST',
      headers: getHeaders(user),
      body: JSON.stringify({ appId, redirectUri }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to start OAuth' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    return body;
  },
};
