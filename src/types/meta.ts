// src/types/meta.ts
// Phase 26: Jyotsvan Meta Ads & Marketing Intelligence Types

import type { IntegrationConnection, IntegrationSyncJob } from './integrations.ts';

export type MetaAccountStatus =
  | 'ACTIVE'
  | 'DISABLED'
  | 'UNSETTLED'
  | 'PENDING_RISK_REVIEW'
  | 'PENDING_SETTLEMENT'
  | 'IN_GRACE_PERIOD'
  | 'PENDING_CLOSURE'
  | 'CLOSED'
  | 'ANY';

export type MetaCampaignObjective =
  | 'OUTCOME_SALES'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_APP_PROMOTION'
  | 'CONVERSIONS'
  | 'MESSAGES'
  | 'REACH'
  | 'BRAND_AWARENESS'
  | 'LINK_CLICKS'
  | 'PRODUCT_CATALOG_SALES'
  | string;

export type MetaEffectiveStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'DELETED'
  | 'PENDING_REVIEW'
  | 'DISAPPROVED'
  | 'PREAPPROVED'
  | 'CAMPAIGN_PAUSED'
  | 'ADSET_PAUSED'
  | 'IN_PROCESS'
  | 'WITH_ISSUES'
  | string;

export interface MetaBusiness {
  id: string;
  name: string;
  verification_status?: string;
  created_time?: string;
  primary_page?: string;
}

export interface MetaAdAccount {
  id: string;
  account_id: string; // The numeric id without 'act_' prefix
  name: string;
  account_status: number | MetaAccountStatus;
  currency: string;
  timezone_name: string;
  timezone_offset_hours_utc?: number;
  business?: {
    id: string;
    name: string;
  };
  business_id?: string;
  business_name?: string;
  amount_spent?: string | number;
  balance?: string | number;
  min_daily_budget?: number;
  capabilities?: string[];
  created_time?: string;
  last_synced_at?: string;
  is_primary?: boolean;
}

export interface MetaCampaign {
  id: string;
  account_id: string;
  external_campaign_id: string;
  name: string;
  objective: MetaCampaignObjective;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  effective_status: MetaEffectiveStatus;
  currency?: string;
  buying_type?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  budget_remaining?: number;
  start_time?: string;
  stop_time?: string;
  created_time?: string;
  updated_time?: string;
  last_synced_at?: string;
  // Computed/Aggregated telemetry metrics
  spend?: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  conversions?: number;
  purchases?: number;
  conversion_value?: number;
  cost_per_conversion?: number;
  cpa?: number;
  roas?: number;
}

export interface MetaAdSet {
  id: string;
  account_id: string;
  campaign_id: string;
  campaign_name?: string;
  external_adset_id: string;
  external_campaign_id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  effective_status: MetaEffectiveStatus;
  currency?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  bid_strategy?: string;
  optimization_goal?: string;
  billing_event?: string;
  targeting_summary?: string;
  start_time?: string;
  end_time?: string;
  created_time?: string;
  updated_time?: string;
  last_synced_at?: string;
  // Metrics
  spend?: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  conversions?: number;
  purchases?: number;
  conversion_value?: number;
  cost_per_conversion?: number;
  cpa?: number;
  roas?: number;
}

export interface MetaCreative {
  id: string;
  account_id: string;
  external_creative_id: string;
  name: string;
  title?: string;
  body?: string;
  call_to_action_type?: string;
  image_url?: string;
  thumbnail_url?: string;
  video_id?: string;
  object_type?: string;
  object_story_id?: string;
  url_tags?: string;
  raw_metadata?: Record<string, unknown>;
  created_at?: string;
  ads_count?: number;
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  conversions?: number;
  roas?: number;
}

export interface MetaAd {
  id: string;
  account_id: string;
  campaign_id: string;
  campaign_name?: string;
  adset_id: string;
  adset_name?: string;
  external_ad_id: string;
  external_adset_id: string;
  external_campaign_id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  effective_status: MetaEffectiveStatus;
  currency?: string;
  creative_id?: string;
  creative?: MetaCreative;
  preview_url?: string;
  created_time?: string;
  updated_time?: string;
  last_synced_at?: string;
  // Metrics
  spend?: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  conversions?: number;
  purchases?: number;
  conversion_value?: number;
  cost_per_conversion?: number;
  cpa?: number;
  roas?: number;
}

export interface MetaDailyInsight {
  id: string;
  organization_id: string;
  connection_id: string;
  ad_account_id: string;
  level: 'account' | 'campaign' | 'adset' | 'ad';
  date: string;
  external_account_id?: string;
  external_campaign_id?: string;
  external_adset_id?: string;
  external_ad_id?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  spend: number;
  currency: string;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  unique_clicks?: number;
  link_clicks: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversions: number;
  purchases?: number;
  conversion_value: number;
  cost_per_conversion: number;
  cpa?: number;
  roas: number;
  actions?: Array<{ action_type: string; value: string | number }>;
  action_values?: Array<{ action_type: string; value: string | number }>;
  created_at?: string;
  updated_at?: string;
}

export type BreakdownType =
  | 'age'
  | 'gender'
  | 'age_gender'
  | 'country'
  | 'region'
  | 'placement'
  | 'device'
  | 'device_platform'
  | 'publisher_platform';

export interface MetaBreakdownInsight {
  id: string;
  organization_id: string;
  connection_id: string;
  ad_account_id: string;
  level: 'account' | 'campaign' | 'adset' | 'ad';
  date: string;
  breakdown_type: BreakdownType;
  breakdown_value: string;
  breakdown_secondary_value?: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  purchases?: number;
  conversion_value: number;
  cpc?: number;
  ctr?: number;
  roas?: number;
}

export interface MetaSyncException {
  id: string;
  organization_id: string;
  connection_id: string;
  entity_type: 'account' | 'campaign' | 'adset' | 'ad' | 'creative' | 'insights';
  external_id?: string;
  error_code: string;
  error_message: string;
  severity: 'warning' | 'error' | 'fatal';
  retry_count: number;
  last_attempted_at: string;
  resolved: boolean;
  created_at: string;
}

export interface MetaConnectionConfig {
  app_id?: string;
  app_secret?: string;
  access_token?: string;
  ad_account_id?: string;
  business_id?: string;
  api_version?: string;
  sync_frequency_minutes?: number;
  sync_window_days?: number;
  auto_retry_enabled?: boolean;
  is_sandbox?: boolean;
  selected_ad_accounts?: string[];
}

export type MetaSyncScope =
  | 'all'
  | 'metadata'
  | 'campaigns'
  | 'adsets'
  | 'ads'
  | 'creatives'
  | 'insights'
  | 'historical'
  | 'incremental';

export interface MetaSyncRequest {
  sync_type?: MetaSyncScope;
  scope?: MetaSyncScope;
  days?: number;
  ad_account_id?: string;
  start_date?: string;
  end_date?: string;
  level?: 'account' | 'campaign' | 'adset' | 'ad';
  force_refresh?: boolean;
}

export interface MetaOverviewResponse {
  connection: IntegrationConnection | null;
  adAccounts: MetaAdAccount[];
  selectedAdAccount: MetaAdAccount | null;
  activeAdAccount?: MetaAdAccount | null;
  summary: {
    total_spend: number;
    currency: string;
    impressions: number;
    reach: number;
    clicks: number;
    link_clicks: number;
    average_ctr: number;
    average_cpc: number;
    average_cpm: number;
    conversions: number;
    conversion_value: number;
    average_roas: number;
    active_campaigns_count: number;
    active_adsets_count: number;
    active_ads_count: number;
    last_sync_at: string | null;
    sync_status: string;
  };
  metrics?: {
    total_spend: number;
    total_conversion_value: number;
    blended_roas: number;
    total_purchases: number;
    average_cpa: number;
    total_impressions: number;
    total_clicks: number;
    total_link_clicks: number;
    blended_ctr: number;
    average_cpc: number;
    average_cpm: number;
  };
  counts?: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalAdSets: number;
    totalAds: number;
  };
  recentJobs: IntegrationSyncJob[];
  exceptions: MetaSyncException[];
  availableBreakdowns: BreakdownType[];
  isSandboxMode: boolean;
}

export type MetaDateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_7d'
  | 'last_14d'
  | 'last_30d'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'custom';

export type MetaComparePeriod =
  | 'previous_period'
  | 'previous_week'
  | 'previous_month'
  | 'previous_year'
  | 'none';

export type MetaDashboardTab =
  | 'overview'
  | 'campaigns'
  | 'adsets'
  | 'ads'
  | 'creatives'
  | 'audience'
  | 'placement'
  | 'device'
  | 'geography'
  | 'trends';

export interface MetaKPICardData {
  key: string;
  label: string;
  currentValue: number | null;
  previousValue: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  direction: 'up' | 'down' | 'neutral';
  isPositiveGood: boolean; // e.g. true for spend/conversions/roas/ctr/reach, false for cpc/cpa/cpm
  isCurrency?: boolean;
  isPercentage?: boolean;
  currency?: string;
  tooltipText?: string;
}

export interface MetaDashboardKPIs {
  spend: MetaKPICardData;
  impressions: MetaKPICardData;
  reach: MetaKPICardData;
  clicks: MetaKPICardData;
  ctr: MetaKPICardData;
  cpc: MetaKPICardData;
  cpm: MetaKPICardData;
  conversions: MetaKPICardData;
  cpa: MetaKPICardData;
  conversion_value: MetaKPICardData;
  roas: MetaKPICardData;
}

export interface MetaAnalyticsFilter {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  comparePeriod?: MetaComparePeriod;
  comparisonType?: 'previous_period' | 'previous_year';
  compareStartDate?: string;
  compareEndDate?: string;
  campaignId?: string;
  adSetId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MetaTrendPoint {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  conversions: number;
  cpa: number | null;
  conversion_value: number;
  roas: number | null;
}

export interface MetaTopPerformer {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversion_value: number;
  roas: number | null;
  cpa: number | null;
  ctr: number | null;
}

export interface MetaBreakdownMetricRow {
  key: string;
  label: string;
  secondaryLabel?: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  conversions: number;
  cpa: number | null;
  conversion_value: number;
  roas: number | null;
  shareOfSpendPercent?: number;
}

export interface MetaComparisonMetric {
  key: string;
  label: string;
  currentValue: number;
  previousValue: number;
  absoluteChange: number;
  percentageChange: number;
  direction: 'up' | 'down' | 'neutral';
  isPositiveGood: boolean;
}

export interface MetaSyncAttentionItem {
  id: string;
  title: string;
  description: string;
  severity: 'warning' | 'error' | 'info';
  actionSuggestion?: string;
  actionUrl?: string;
}

export interface MetaExecutiveOverviewData {
  isConnected?: boolean;
  connection: IntegrationConnection | null;
  adAccounts: MetaAdAccount[];
  selectedAdAccount: MetaAdAccount | null;
  currency: string;
  kpis: MetaDashboardKPIs;
  comparison?: Record<string, MetaComparisonMetric>;
  trends: MetaTrendPoint[];
  topCampaigns: MetaTopPerformer[];
  topAds: MetaTopPerformer[];
  campaignsCount: { total: number; active: number };
  adSetsCount: { total: number; active: number };
  adsCount: { total: number; active: number };
  lastSyncAt: string | null;
  lastSyncedAt?: string | null;
  syncStatus: string;
  hasSyncExceptions: boolean;
  recentExceptions: MetaSyncException[];
}

export interface MetaTestConnectionResponse {
  success: boolean;
  message: string;
  latency_ms: number;
  user_info?: {
    id: string;
    name: string;
  };
  ad_accounts_count?: number;
  ad_accounts?: Array<{
    id: string;
    account_id: string;
    name: string;
    currency: string;
    account_status: number | string;
    business_name?: string;
  }>;
  permissions_granted?: string[];
  error?: string;
}
