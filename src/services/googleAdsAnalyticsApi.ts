// src/services/googleAdsAnalyticsApi.ts
// Phase 29: Frontend Client Query Layer for Google Ads Analytics (Reads from Jyotsvan Backend)

import type {
  GoogleAdsExecutiveOverviewData,
  GoogleCampaign,
  GoogleAdGroup,
  GoogleKeyword,
  GoogleSearchTerm,
  GoogleLocationMetric,
  GoogleDeviceMetric,
  GoogleConversionAction,
  GoogleTrendPoint,
  GoogleAnalyticsFilter,
} from '../types/google-ads.ts';

const BASE_URL = '/api/google-ads';

export const googleAdsAnalyticsApi = {
  /**
   * Get Executive Overview & 9-KPI Grid
   */
  async getOverview(filter: GoogleAnalyticsFilter = {}): Promise<GoogleAdsExecutiveOverviewData> {
    const params = new URLSearchParams();
    if (filter.accountId && filter.accountId !== 'ALL') params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.compareStartDate) params.append('compareStartDate', filter.compareStartDate);
    if (filter.compareEndDate) params.append('compareEndDate', filter.compareEndDate);
    if (filter.comparisonType) params.append('comparisonType', filter.comparisonType);

    const res = await fetch(`${BASE_URL}/overview?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch Google Ads overview');
    }
    return json.data;
  },

  /**
   * Get Campaigns List
   */
  async getCampaigns(filter: GoogleAnalyticsFilter = {}): Promise<{ campaigns: GoogleCampaign[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.accountId && filter.accountId !== 'ALL') params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.status && filter.status !== 'ALL') params.append('status', filter.status);
    if (filter.campaignType && filter.campaignType !== 'ALL') params.append('campaignType', filter.campaignType);
    if (filter.search) params.append('search', filter.search);

    const res = await fetch(`${BASE_URL}/campaigns?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch campaigns');
    }
    return json.data;
  },

  /**
   * Get Campaign Details & Timeseries
   */
  async getCampaignDetails(campaignId: string, filter: GoogleAnalyticsFilter = {}) {
    const params = new URLSearchParams();
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const res = await fetch(`${BASE_URL}/campaigns/${campaignId}?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch campaign details');
    }
    return json.data;
  },

  /**
   * Get Ad Groups List
   */
  async getAdGroups(filter: GoogleAnalyticsFilter = {}): Promise<{ adGroups: GoogleAdGroup[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.accountId && filter.accountId !== 'ALL') params.append('accountId', filter.accountId);
    if (filter.campaignId && filter.campaignId !== 'ALL') params.append('campaignId', filter.campaignId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.status && filter.status !== 'ALL') params.append('status', filter.status);
    if (filter.search) params.append('search', filter.search);

    const res = await fetch(`${BASE_URL}/adgroups?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch ad groups');
    }
    return json.data;
  },

  /**
   * Get Keywords List
   */
  async getKeywords(filter: GoogleAnalyticsFilter = {}): Promise<{ keywords: GoogleKeyword[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.accountId && filter.accountId !== 'ALL') params.append('accountId', filter.accountId);
    if (filter.campaignId && filter.campaignId !== 'ALL') params.append('campaignId', filter.campaignId);
    if (filter.adGroupId && filter.adGroupId !== 'ALL') params.append('adGroupId', filter.adGroupId);
    if (filter.matchType && filter.matchType !== 'ALL') params.append('matchType', filter.matchType);
    if (filter.status && filter.status !== 'ALL') params.append('status', filter.status);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.search) params.append('search', filter.search);

    const res = await fetch(`${BASE_URL}/keywords?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch keywords');
    }
    return json.data;
  },

  /**
   * Get Search Terms List
   */
  async getSearchTerms(filter: GoogleAnalyticsFilter = {}): Promise<{ searchTerms: GoogleSearchTerm[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.accountId && filter.accountId !== 'ALL') params.append('accountId', filter.accountId);
    if (filter.campaignId && filter.campaignId !== 'ALL') params.append('campaignId', filter.campaignId);
    if (filter.adGroupId && filter.adGroupId !== 'ALL') params.append('adGroupId', filter.adGroupId);
    if (filter.search) params.append('search', filter.search);

    const res = await fetch(`${BASE_URL}/searchterms?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch search terms');
    }
    return json.data;
  },

  /**
   * Get Location Metrics
   */
  async getLocations(filter: GoogleAnalyticsFilter = {}): Promise<{ locations: GoogleLocationMetric[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.accountId && filter.accountId !== 'ALL') params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const res = await fetch(`${BASE_URL}/locations?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch locations');
    }
    return json.data;
  },

  /**
   * Get Device Metrics
   */
  async getDevices(filter: GoogleAnalyticsFilter = {}): Promise<{ devices: GoogleDeviceMetric[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.accountId && filter.accountId !== 'ALL') params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const res = await fetch(`${BASE_URL}/devices?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch devices');
    }
    return json.data;
  },

  /**
   * Get Conversion Actions
   */
  async getConversions(filter: GoogleAnalyticsFilter = {}): Promise<{ conversions: GoogleConversionAction[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.accountId && filter.accountId !== 'ALL') params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const res = await fetch(`${BASE_URL}/conversions?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch conversions');
    }
    return json.data;
  },

  /**
   * Get Trends Data
   */
  async getTrends(filter: GoogleAnalyticsFilter = {}): Promise<{ trends: GoogleTrendPoint[]; summary: Record<string, number> }> {
    const params = new URLSearchParams();
    if (filter.accountId && filter.accountId !== 'ALL') params.append('accountId', filter.accountId);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const res = await fetch(`${BASE_URL}/trends?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch trends');
    }
    return json.data;
  },

  /**
   * Get Sync Health & Jobs
   */
  async getSyncHealth() {
    const res = await fetch(`${BASE_URL}/sync-health`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch sync health');
    }
    return json.data;
  },

  /**
   * Trigger Manual Sync Job
   */
  async triggerSync(syncType = 'incremental', windowDays = 7) {
    const res = await fetch(`${BASE_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncType, windowDays }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Sync request failed');
    }
    return json;
  },

  /**
   * Test Connection
   */
  async testConnection(customerId?: string) {
    const res = await fetch(`${BASE_URL}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Connection test failed');
    }
    return json;
  },
};
