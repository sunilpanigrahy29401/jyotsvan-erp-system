// src/services/metaAnalyticsApi.ts
// Phase 27: Meta Ads Analytics Frontend API Client

import type {
  MetaAnalyticsFilter,
  MetaBreakdownMetricRow,
  MetaCampaign,
  MetaAdSet,
  MetaAd,
  MetaCreative,
  MetaExecutiveOverviewData,
  MetaTrendPoint,
} from '../types/meta.ts';

const BASE_URL = '/api/integrations/meta/analytics';

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-organization-id': 'org-jyotsvan-core',
    'x-user-id': 'usr-owner-sunil',
  };
}

export const metaAnalyticsApi = {
  /**
   * Fetch Executive Overview (KPIs, Comparison Diffs, Trends, Top Performers)
   */
  async getOverview(filter: MetaAnalyticsFilter = {}): Promise<MetaExecutiveOverviewData> {
    const params = new URLSearchParams();
    if (filter.accountId) params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.compareStartDate) params.append('compareStartDate', filter.compareStartDate);
    if (filter.compareEndDate) params.append('compareEndDate', filter.compareEndDate);

    const res = await fetch(`${BASE_URL}/overview?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch executive overview');
    return json.data;
  },

  /**
   * Fetch Campaigns List with Aggregated Metrics
   */
  async getCampaigns(filter: MetaAnalyticsFilter = {}): Promise<{
    campaigns: MetaCampaign[];
    total: number;
    currency: string;
  }> {
    const params = new URLSearchParams();
    if (filter.accountId) params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.status) params.append('status', filter.status);
    if (filter.search) params.append('search', filter.search);
    if (filter.sortBy) params.append('sortBy', filter.sortBy);
    if (filter.sortOrder) params.append('sortOrder', filter.sortOrder);
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.offset) params.append('offset', String(filter.offset));

    const res = await fetch(`${BASE_URL}/campaigns?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch campaigns');
    return { campaigns: json.data, total: json.total, currency: json.currency };
  },

  /**
   * Fetch Single Campaign Detail
   */
  async getCampaignDetail(
    campaignId: string,
    filter: MetaAnalyticsFilter = {}
  ): Promise<{
    campaign: MetaCampaign;
    trends: MetaTrendPoint[];
    adSets: MetaAdSet[];
    ads: MetaAd[];
  }> {
    const params = new URLSearchParams();
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const res = await fetch(`${BASE_URL}/campaigns/${encodeURIComponent(campaignId)}?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch campaign detail');
    return json.data;
  },

  /**
   * Fetch Ad Sets List
   */
  async getAdSets(filter: MetaAnalyticsFilter = {}): Promise<{
    adSets: MetaAdSet[];
    total: number;
    currency: string;
  }> {
    const params = new URLSearchParams();
    if (filter.accountId) params.append('accountId', filter.accountId);
    if (filter.campaignId) params.append('campaignId', filter.campaignId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.status) params.append('status', filter.status);
    if (filter.search) params.append('search', filter.search);
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.offset) params.append('offset', String(filter.offset));

    const res = await fetch(`${BASE_URL}/adsets?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch ad sets');
    return { adSets: json.data, total: json.total, currency: json.currency };
  },

  /**
   * Fetch Ads List
   */
  async getAds(filter: MetaAnalyticsFilter = {}): Promise<{
    ads: MetaAd[];
    total: number;
    currency: string;
  }> {
    const params = new URLSearchParams();
    if (filter.accountId) params.append('accountId', filter.accountId);
    if (filter.campaignId) params.append('campaignId', filter.campaignId);
    if (filter.adSetId) params.append('adSetId', filter.adSetId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.status) params.append('status', filter.status);
    if (filter.search) params.append('search', filter.search);
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.offset) params.append('offset', String(filter.offset));

    const res = await fetch(`${BASE_URL}/ads?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch ads');
    return { ads: json.data, total: json.total, currency: json.currency };
  },

  /**
   * Fetch Creatives List
   */
  async getCreatives(filter: MetaAnalyticsFilter = {}): Promise<{
    creatives: MetaCreative[];
    total: number;
    currency: string;
  }> {
    const params = new URLSearchParams();
    if (filter.accountId) params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const res = await fetch(`${BASE_URL}/creatives?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch creatives');
    return { creatives: json.data, total: json.total, currency: json.currency };
  },

  /**
   * Fetch Audience Breakdown (Age, Gender, Age+Gender)
   */
  async getAudience(filter: MetaAnalyticsFilter = {}): Promise<{
    age: MetaBreakdownMetricRow[];
    gender: MetaBreakdownMetricRow[];
    age_gender: MetaBreakdownMetricRow[];
    currency: string;
  }> {
    const params = new URLSearchParams();
    if (filter.accountId) params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const res = await fetch(`${BASE_URL}/audience?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch audience breakdown');
    return json.data;
  },

  /**
   * Fetch Placement Breakdown (FB/IG Feeds, Reels, Stories, etc.)
   */
  async getPlacement(filter: MetaAnalyticsFilter = {}): Promise<{
    placements: MetaBreakdownMetricRow[];
    platforms: MetaBreakdownMetricRow[];
    currency: string;
  }> {
    const params = new URLSearchParams();
    if (filter.accountId) params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const res = await fetch(`${BASE_URL}/placement?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch placement breakdown');
    return json.data;
  },

  /**
   * Fetch Device Breakdown
   */
  async getDevice(filter: MetaAnalyticsFilter = {}): Promise<{
    devices: MetaBreakdownMetricRow[];
    isAvailable: boolean;
    currency: string;
  }> {
    const params = new URLSearchParams();
    if (filter.accountId) params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const res = await fetch(`${BASE_URL}/device?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch device breakdown');
    return json.data;
  },

  /**
   * Fetch Geography Breakdown
   */
  async getGeography(filter: MetaAnalyticsFilter = {}): Promise<{
    countries: MetaBreakdownMetricRow[];
    regions: MetaBreakdownMetricRow[];
    isAvailable: boolean;
    currency: string;
  }> {
    const params = new URLSearchParams();
    if (filter.accountId) params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const res = await fetch(`${BASE_URL}/geography?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch geography breakdown');
    return json.data;
  },

  /**
   * Fetch Configurable Trends (Daily, Weekly, Monthly)
   */
  async getTrends(
    filter: MetaAnalyticsFilter = {},
    interval: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<{
    trends: MetaTrendPoint[];
    interval: string;
    currency: string;
  }> {
    const params = new URLSearchParams();
    if (filter.accountId) params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    params.append('interval', interval);

    const res = await fetch(`${BASE_URL}/trends?${params.toString()}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch trends');
    return json.data;
  },

  /**
   * Fetch Active Sync Attention Items & Exceptions
   */
  async getSyncAttention(): Promise<{ items: any[] }> {
    try {
      const res = await fetch('/api/integrations/meta/exceptions', {
        headers: getHeaders(),
      });
      const json = await res.json();
      const rawList = Array.isArray(json.data) ? json.data : [];
      return {
        items: rawList.map((ex: any) => ({
          id: ex.id,
          title: `Discrepancy on ${ex.entity_type || 'entity'} (${ex.error_code || 'ERROR'})`,
          description: ex.error_message || 'Sync encountered an issue',
          severity: ex.severity === 'fatal' ? 'error' : ex.severity || 'warning',
          actionSuggestion: 'Trigger manual sync or recheck API token permissions',
          actionUrl: '/api/integrations/meta/sync',
        })),
      };
    } catch {
      return { items: [] };
    }
  },
};
