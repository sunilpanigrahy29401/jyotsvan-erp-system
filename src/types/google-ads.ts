// src/types/google-ads.ts
// Phase 28 & 29: Jyotsvan Enterprise Google Ads Integration & Analytics Types

import type { IntegrationConnection, IntegrationSyncJob } from './integrations.ts';

export type GoogleCampaignStatus = 'ENABLED' | 'PAUSED' | 'REMOVED' | 'UNKNOWN';
export type GoogleAdvertisingChannelType =
  | 'SEARCH'
  | 'PERFORMANCE_MAX'
  | 'DISPLAY'
  | 'SHOPPING'
  | 'VIDEO'
  | 'MULTI_CHANNEL'
  | 'LOCAL'
  | 'DISCOVERY';

export type GoogleBiddingStrategyType =
  | 'MAXIMIZE_CONVERSIONS'
  | 'MAXIMIZE_CONVERSION_VALUE'
  | 'TARGET_CPA'
  | 'TARGET_ROAS'
  | 'MANUAL_CPC'
  | 'ENHANCED_CPC'
  | 'TARGET_IMPRESSION_SHARE'
  | 'UNKNOWN';

export type GoogleKeywordMatchType = 'EXACT' | 'PHRASE' | 'BROAD';
export type GoogleDeviceType = 'DESKTOP' | 'MOBILE' | 'TABLET' | 'CONNECTED_TV' | 'OTHER';

export interface GoogleAdsAccount {
  id: string;
  organization_id: string;
  connection_id: string;
  customer_id: string; // e.g. "123-456-7890" or "1234567890"
  descriptive_name: string;
  currency_code: string; // e.g. "INR", "USD", "EUR"
  time_zone: string; // e.g. "Asia/Kolkata"
  status: 'ENABLED' | 'CANCELLED' | 'SUSPENDED' | 'CLOSED';
  can_manage_clients?: boolean;
  is_manager_account?: boolean;
  is_primary: boolean;
  last_synced_at?: string;
  raw_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GoogleCampaign {
  id: string;
  organization_id: string;
  connection_id: string;
  account_id: string;
  external_campaign_id: string;
  name: string;
  status: GoogleCampaignStatus;
  advertising_channel_type: GoogleAdvertisingChannelType;
  bidding_strategy_type?: GoogleBiddingStrategyType;
  daily_budget?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  target_cpa?: number;
  target_roas?: number;
  last_synced_at?: string;
  raw_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  // Computed metrics
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  conversions?: number;
  cpa?: number;
  conversion_value?: number;
  roas?: number;
}

export interface GoogleAdGroup {
  id: string;
  organization_id: string;
  connection_id: string;
  account_id: string;
  campaign_id: string;
  campaign_name?: string;
  external_adgroup_id: string;
  external_campaign_id?: string;
  name: string;
  status: GoogleCampaignStatus;
  type?: string;
  cpc_bid?: number;
  target_cpa?: number;
  currency?: string;
  last_synced_at?: string;
  raw_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  // Metrics
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  conversions?: number;
  cpa?: number;
  conversion_value?: number;
  roas?: number;
}

export interface GoogleKeyword {
  id: string;
  organization_id: string;
  connection_id: string;
  account_id: string;
  campaign_id: string;
  campaign_name?: string;
  ad_group_id: string;
  ad_group_name?: string;
  external_criterion_id: string;
  keyword_text: string;
  match_type: GoogleKeywordMatchType;
  status: GoogleCampaignStatus;
  quality_score?: number | null; // 1 to 10
  cpc_bid?: number;
  currency?: string;
  last_synced_at?: string;
  // Metrics
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  conversions?: number;
  cpa?: number;
  conversion_value?: number;
  roas?: number;
}

export interface GoogleSearchTerm {
  id: string;
  organization_id: string;
  account_id: string;
  campaign_id: string;
  campaign_name?: string;
  ad_group_id: string;
  ad_group_name?: string;
  query_text: string;
  match_type?: GoogleKeywordMatchType | string;
  status?: 'ADDED' | 'EXCLUDED' | 'NONE';
  currency?: string;
  // Metrics
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  conversions?: number;
  cpa?: number;
  conversion_value?: number;
  roas?: number;
}

export interface GoogleLocationMetric {
  id: string;
  organization_id: string;
  account_id: string;
  location_name: string;
  country_code: string;
  region?: string;
  city?: string;
  location_type: 'COUNTRY' | 'REGION' | 'CITY' | 'POSTAL_CODE';
  currency?: string;
  // Metrics
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  conversions: number;
  cpa: number | null;
  conversion_value: number;
  roas: number | null;
  shareOfSpendPercent?: number;
}

export interface GoogleDeviceMetric {
  id: string;
  organization_id: string;
  account_id: string;
  device_type: GoogleDeviceType;
  device_label: string;
  currency?: string;
  // Metrics
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  conversions: number;
  cpa: number | null;
  conversion_value: number;
  roas: number | null;
  shareOfSpendPercent?: number;
}

export interface GoogleConversionAction {
  id: string;
  organization_id: string;
  account_id: string;
  external_conversion_id: string;
  name: string;
  category: string; // e.g. 'PURCHASE', 'SIGNUP', 'PAGE_VIEW', 'LEAD', 'CONTACT'
  type: string; // e.g. 'WEBPAGE', 'CALL', 'IMPORT'
  status: 'ENABLED' | 'REMOVED' | 'HIDDEN';
  primary_for_goal: boolean;
  currency?: string;
  // Metrics
  conversions: number;
  conversion_value: number;
  spend: number;
  cpa: number | null;
  value_per_conversion: number | null;
  percentage_of_total?: number;
}

export interface GoogleKPICardData {
  key: string;
  label: string;
  currentValue: number | null;
  previousValue: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  direction: 'up' | 'down' | 'neutral';
  isPositiveGood: boolean;
  isCurrency?: boolean;
  isPercentage?: boolean;
  currency?: string;
  tooltipText?: string;
}

export interface GoogleDashboardKPIs {
  spend: GoogleKPICardData;
  impressions: GoogleKPICardData;
  clicks: GoogleKPICardData;
  ctr: GoogleKPICardData;
  cpc: GoogleKPICardData;
  conversions: GoogleKPICardData;
  cpa: GoogleKPICardData;
  conversion_value: GoogleKPICardData;
  roas: GoogleKPICardData;
}

export interface GoogleTrendPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  conversions: number;
  cpa: number | null;
  conversion_value: number;
  roas: number | null;
}

export interface GoogleTopPerformer {
  id: string;
  name: string;
  status: string;
  channelType?: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversion_value: number;
  roas: number | null;
  cpa: number | null;
  ctr: number | null;
}

export interface GoogleComparisonMetric {
  key: string;
  label: string;
  currentValue: number;
  previousValue: number;
  absoluteChange: number;
  percentageChange: number;
  direction: 'up' | 'down' | 'neutral';
  isPositiveGood: boolean;
}

export interface GoogleSyncAttentionItem {
  id: string;
  title: string;
  description: string;
  severity: 'warning' | 'error' | 'info';
  actionSuggestion?: string;
  actionUrl?: string;
}

export interface GoogleAdsExecutiveOverviewData {
  isConnected: boolean;
  connection: IntegrationConnection | null;
  accounts: GoogleAdsAccount[];
  selectedAccount: GoogleAdsAccount | null;
  currency: string;
  kpis: GoogleDashboardKPIs;
  comparison?: Record<string, GoogleComparisonMetric>;
  trends: GoogleTrendPoint[];
  topCampaigns: GoogleTopPerformer[];
  topKeywords: GoogleTopPerformer[];
  campaignsCount: { total: number; active: number };
  adGroupsCount: { total: number; active: number };
  keywordsCount: { total: number; active: number };
  lastSyncAt: string | null;
  lastSyncedAt?: string | null;
  syncStatus: string;
  hasSyncExceptions: boolean;
  attentionItems: GoogleSyncAttentionItem[];
}

export interface GoogleAnalyticsFilter {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  compareStartDate?: string;
  compareEndDate?: string;
  comparisonType?: 'previous_period' | 'previous_year' | 'none';
  campaignId?: string;
  campaignType?: string;
  adGroupId?: string;
  keywordId?: string;
  matchType?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type GoogleAdsTab =
  | 'overview'
  | 'campaigns'
  | 'adgroups'
  | 'keywords'
  | 'searchterms'
  | 'locations'
  | 'devices'
  | 'conversions'
  | 'trends'
  | 'sync';
