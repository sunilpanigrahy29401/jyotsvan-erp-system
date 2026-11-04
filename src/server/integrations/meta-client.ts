// src/server/integrations/meta-client.ts
// Phase 26: Official Meta Graph Marketing API Client (v21.0) with Rate Limiting, Error Normalization & Pagination

import crypto from 'crypto';
import type {
  MetaAdAccount,
  MetaBusiness,
  MetaCampaign,
  MetaAdSet,
  MetaAd,
  MetaCreative,
  MetaDailyInsight,
  MetaBreakdownInsight,
  BreakdownType,
} from '../../types/meta.ts';

export const META_DEFAULT_API_VERSION = process.env.META_API_VERSION || 'v21.0';

export interface MetaClientConfig {
  accessToken: string;
  appId?: string;
  appSecret?: string;
  apiVersion?: string;
  adAccountId?: string;
  organizationId?: string;
  connectionId?: string;
  timeoutMs?: number;
}

export interface MetaRateLimitInfo {
  callCountPct: number;
  cpuTimePct: number;
  totalTimePct: number;
  estimatedTimeToRegainAccess: number;
}

export class MetaClient {
  private accessToken: string;
  private appId?: string;
  private appSecret?: string;
  private apiVersion: string;
  private adAccountId?: string;
  private timeoutMs: number;
  private isSandbox: boolean;
  private lastRateLimit?: MetaRateLimitInfo;

  constructor(config: MetaClientConfig) {
    this.accessToken = config.accessToken?.trim() || '';
    this.appId = config.appId || process.env.META_APP_ID;
    this.appSecret = config.appSecret || process.env.META_APP_SECRET;
    this.apiVersion = config.apiVersion || META_DEFAULT_API_VERSION;
    this.adAccountId = this.cleanAdAccountId(config.adAccountId);
    this.timeoutMs = config.timeoutMs || 15000;

    // Detect sandbox / simulated mode if placeholder tokens are detected
    this.isSandbox =
      !this.accessToken ||
      this.accessToken.includes('placeholder') ||
      this.accessToken.includes('demo') ||
      this.accessToken.includes('test') ||
      this.accessToken.startsWith('EAAB_jyotsvan');
  }

  private cleanAdAccountId(id?: string): string | undefined {
    if (!id) return undefined;
    const clean = id.trim();
    return clean.startsWith('act_') ? clean : `act_${clean}`;
  }

  private getBaseUrl(): string {
    return `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Internal HTTP Request Dispatcher with Error Normalization & Rate Limit extraction
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {},
    method: 'GET' | 'POST' | 'DELETE' = 'GET'
  ): Promise<T> {
    if (this.isSandbox) {
      return this.handleSandboxRequest<T>(endpoint, params);
    }

    const url = new URL(`${this.getBaseUrl()}/${endpoint.replace(/^\/+/, '')}`);
    url.searchParams.set('access_token', this.accessToken);

    // AppSecret Proof (Security best practice: SHA256 HMAC of access token using App Secret)
    if (this.appSecret && this.accessToken) {
      const appsecretProof = crypto
        .createHmac('sha256', this.appSecret)
        .update(this.accessToken)
        .digest('hex');
      url.searchParams.set('appsecret_proof', appsecretProof);
    }

    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) {
        url.searchParams.set(k, String(v));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Jyotsvan-Enterprise-Meta-Adapter/1.0',
        },
        signal: controller.signal,
      });

      // Parse Rate Limit Headers
      const appUsage = response.headers.get('x-app-usage');
      const businessUsage = response.headers.get('x-business-use-case-usage');
      const adAccountUsage = response.headers.get('x-ad-account-usage');

      if (adAccountUsage || appUsage) {
        try {
          const usageJson = JSON.parse(adAccountUsage || appUsage || '{}');
          this.lastRateLimit = {
            callCountPct: usageJson.call_count || usageJson.acc_id_call_count || 0,
            cpuTimePct: usageJson.total_cputime || 0,
            totalTimePct: usageJson.total_time || 0,
            estimatedTimeToRegainAccess: usageJson.estimated_time_to_regain_access || 0,
          };
        } catch {
          // ignore header parse error
        }
      }

      const body = await response.json();

      if (!response.ok || body.error) {
        const err = body.error || {};
        const code = err.code || response.status;
        const subcode = err.error_subcode;
        const msg = err.message || response.statusText || 'Unknown Meta Graph API error';

        let normalizedType = 'META_API_ERROR';
        if (code === 190) normalizedType = 'META_AUTH_EXPIRED';
        else if (code === 200 || code === 294) normalizedType = 'META_PERMISSION_DENIED';
        else if (code === 17 || code === 32 || code === 613) normalizedType = 'META_RATE_LIMIT_EXCEEDED';
        else if (code === 100) normalizedType = 'META_INVALID_PARAMETER';
        else if (response.status >= 500) normalizedType = 'META_SERVER_ERROR';

        const error = new Error(`[${normalizedType}] (Code ${code}${subcode ? `, Subcode ${subcode}` : ''}): ${msg}`);
        (error as any).metaCode = code;
        (error as any).metaSubcode = subcode;
        (error as any).metaType = err.type;
        (error as any).normalizedType = normalizedType;
        (error as any).fbtraceId = err.fbtrace_id;
        throw error;
      }

      return body as T;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`[META_TIMEOUT] Meta Graph API request to '${endpoint}' timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Paginates through all records in a Meta Graph connection
   */
  private async paginateAll<T>(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {},
    maxRecords = 5000
  ): Promise<T[]> {
    if (this.isSandbox) {
      const res = await this.handleSandboxRequest<{ data: T[] }>(endpoint, params);
      return res.data || [];
    }

    const allData: T[] = [];
    let currentEndpoint: string = endpoint;
    let currentParams: Record<string, string | number | boolean | undefined> = { ...params, limit: Math.min(100, maxRecords) };

    while (currentEndpoint && allData.length < maxRecords) {
      const response: any = await this.request<{
        data: T[];
        paging?: { next?: string; cursors?: { after?: string } };
      }>(currentEndpoint, currentParams);

      if (response.data && Array.isArray(response.data)) {
        allData.push(...response.data);
      }

      if (response.paging?.cursors?.after && allData.length < maxRecords) {
        currentParams = { ...params, after: response.paging.cursors.after, limit: 100 };
      } else {
        break;
      }
    }

    return allData;
  }

  // -------------------------------------------------------------
  // 1. ACCOUNT & BUSINESS DISCOVERY
  // -------------------------------------------------------------

  public async getMe(): Promise<{ id: string; name: string; email?: string; permissions?: string[] }> {
    return this.request<{ id: string; name: string; email?: string }>('me', {
      fields: 'id,name,email',
    });
  }

  public async getBusinesses(): Promise<MetaBusiness[]> {
    const res = await this.paginateAll<MetaBusiness>('me/businesses', {
      fields: 'id,name,verification_status,created_time,primary_page',
    });
    return res;
  }

  public async getAdAccounts(): Promise<MetaAdAccount[]> {
    const res = await this.paginateAll<any>('me/adaccounts', {
      fields: 'id,account_id,name,account_status,currency,timezone_name,business,amount_spent,balance,min_daily_budget,capabilities',
    });

    return res.map((acc) => ({
      id: acc.id,
      account_id: acc.account_id || acc.id.replace(/^act_/, ''),
      name: acc.name || `Ad Account (${acc.id})`,
      account_status: acc.account_status,
      currency: acc.currency || 'INR',
      timezone_name: acc.timezone_name || 'Asia/Kolkata',
      business_id: acc.business?.id,
      business_name: acc.business?.name,
      amount_spent: acc.amount_spent,
      balance: acc.balance,
      min_daily_budget: acc.min_daily_budget,
      capabilities: acc.capabilities || [],
    }));
  }

  public async getAdAccount(adAccountId?: string): Promise<MetaAdAccount> {
    const targetId = this.cleanAdAccountId(adAccountId || this.adAccountId);
    if (!targetId) {
      throw new Error('[META_INVALID_ACCOUNT] No ad_account_id provided or configured');
    }

    const acc = await this.request<any>(targetId, {
      fields: 'id,account_id,name,account_status,currency,timezone_name,business,amount_spent,balance,min_daily_budget,capabilities',
    });

    return {
      id: acc.id,
      account_id: acc.account_id || acc.id.replace(/^act_/, ''),
      name: acc.name,
      account_status: acc.account_status,
      currency: acc.currency || 'INR',
      timezone_name: acc.timezone_name || 'Asia/Kolkata',
      business_id: acc.business?.id,
      business_name: acc.business?.name,
      amount_spent: acc.amount_spent,
      balance: acc.balance,
      min_daily_budget: acc.min_daily_budget,
      capabilities: acc.capabilities || [],
    };
  }

  // -------------------------------------------------------------
  // 2. CAMPAIGNS, AD SETS, ADS & CREATIVES
  // -------------------------------------------------------------

  public async getCampaigns(adAccountId?: string, limit = 500): Promise<MetaCampaign[]> {
    const targetId = this.cleanAdAccountId(adAccountId || this.adAccountId);
    if (!targetId) throw new Error('Ad Account ID is required');

    const raw = await this.paginateAll<any>(`${targetId}/campaigns`, {
      fields: 'id,name,objective,status,effective_status,buying_type,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time,updated_time',
      limit: 100,
    }, limit);

    return raw.map((c) => ({
      id: c.id,
      account_id: targetId,
      external_campaign_id: c.id,
      name: c.name,
      objective: c.objective,
      status: c.status,
      effective_status: c.effective_status,
      buying_type: c.buying_type,
      daily_budget: c.daily_budget ? Number(c.daily_budget) / 100 : undefined,
      lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : undefined,
      budget_remaining: c.budget_remaining ? Number(c.budget_remaining) / 100 : undefined,
      start_time: c.start_time,
      stop_time: c.stop_time,
      created_time: c.created_time,
      updated_time: c.updated_time,
    }));
  }

  public async getAdSets(adAccountId?: string, limit = 1000): Promise<MetaAdSet[]> {
    const targetId = this.cleanAdAccountId(adAccountId || this.adAccountId);
    if (!targetId) throw new Error('Ad Account ID is required');

    const raw = await this.paginateAll<any>(`${targetId}/adsets`, {
      fields: 'id,campaign_id,name,status,effective_status,daily_budget,lifetime_budget,bid_strategy,optimization_goal,billing_event,targeting,start_time,end_time,created_time,updated_time',
      limit: 100,
    }, limit);

    return raw.map((s) => ({
      id: s.id,
      account_id: targetId,
      campaign_id: s.campaign_id,
      external_adset_id: s.id,
      external_campaign_id: s.campaign_id,
      name: s.name,
      status: s.status,
      effective_status: s.effective_status,
      daily_budget: s.daily_budget ? Number(s.daily_budget) / 100 : undefined,
      lifetime_budget: s.lifetime_budget ? Number(s.lifetime_budget) / 100 : undefined,
      bid_strategy: s.bid_strategy,
      optimization_goal: s.optimization_goal,
      billing_event: s.billing_event,
      targeting_summary: s.targeting ? JSON.stringify(s.targeting) : undefined,
      start_time: s.start_time,
      end_time: s.end_time,
      created_time: s.created_time,
      updated_time: s.updated_time,
    }));
  }

  public async getAds(adAccountId?: string, limit = 2000): Promise<MetaAd[]> {
    const targetId = this.cleanAdAccountId(adAccountId || this.adAccountId);
    if (!targetId) throw new Error('Ad Account ID is required');

    const raw = await this.paginateAll<any>(`${targetId}/ads`, {
      fields: 'id,campaign_id,adset_id,name,status,effective_status,creative,preview_shareable_link,created_time,updated_time',
      limit: 100,
    }, limit);

    return raw.map((a) => ({
      id: a.id,
      account_id: targetId,
      campaign_id: a.campaign_id,
      adset_id: a.adset_id,
      external_ad_id: a.id,
      external_adset_id: a.adset_id,
      external_campaign_id: a.campaign_id,
      name: a.name,
      status: a.status,
      effective_status: a.effective_status,
      creative_id: a.creative?.id,
      preview_url: a.preview_shareable_link,
      created_time: a.created_time,
      updated_time: a.updated_time,
    }));
  }

  public async getCreatives(adAccountId?: string, limit = 1000): Promise<MetaCreative[]> {
    const targetId = this.cleanAdAccountId(adAccountId || this.adAccountId);
    if (!targetId) throw new Error('Ad Account ID is required');

    const raw = await this.paginateAll<any>(`${targetId}/adcreatives`, {
      fields: 'id,name,title,body,call_to_action_type,image_url,thumbnail_url,video_id,object_type,object_story_id,url_tags',
      limit: 100,
    }, limit);

    return raw.map((cr) => ({
      id: cr.id,
      account_id: targetId,
      external_creative_id: cr.id,
      name: cr.name || `Creative ${cr.id}`,
      title: cr.title,
      body: cr.body,
      call_to_action_type: cr.call_to_action_type,
      image_url: cr.image_url,
      thumbnail_url: cr.thumbnail_url || cr.image_url,
      video_id: cr.video_id,
      object_type: cr.object_type,
      object_story_id: cr.object_story_id,
      url_tags: cr.url_tags,
    }));
  }

  // -------------------------------------------------------------
  // 3. INSIGHTS TELEMETRY (Account, Campaign, Ad Set, Ad)
  // -------------------------------------------------------------

  public async getInsights(
    adAccountId?: string,
    level: 'account' | 'campaign' | 'adset' | 'ad' = 'account',
    dateRange?: { startDate: string; endDate: string },
    limit = 5000
  ): Promise<any[]> {
    const targetId = this.cleanAdAccountId(adAccountId || this.adAccountId);
    if (!targetId) throw new Error('Ad Account ID is required');

    const params: Record<string, any> = {
      level,
      time_increment: 1, // Daily breakdowns
      fields: [
        'account_id',
        'account_name',
        'campaign_id',
        'campaign_name',
        'adset_id',
        'adset_name',
        'ad_id',
        'ad_name',
        'spend',
        'impressions',
        'reach',
        'frequency',
        'clicks',
        'unique_clicks',
        'cpc',
        'cpm',
        'ctr',
        'actions',
        'action_values',
        'date_start',
        'date_stop',
      ].join(','),
      limit: 100,
    };

    if (dateRange?.startDate && dateRange?.endDate) {
      params.time_range = JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      });
    } else {
      params.date_preset = 'last_30d';
    }

    return this.paginateAll<any>(`${targetId}/insights`, params, limit);
  }

  public async getInsightsBreakdown(
    adAccountId?: string,
    breakdown: BreakdownType = 'placement',
    dateRange?: { startDate: string; endDate: string }
  ): Promise<any[]> {
    const targetId = this.cleanAdAccountId(adAccountId || this.adAccountId);
    if (!targetId) throw new Error('Ad Account ID is required');

    let metaBreakdownParam = breakdown as string;
    if (breakdown === 'age_gender') metaBreakdownParam = 'age,gender';
    else if (breakdown === 'placement') metaBreakdownParam = 'publisher_platform,platform_position';
    else if (breakdown === 'device') metaBreakdownParam = 'impression_device';

    const params: Record<string, any> = {
      level: 'account',
      breakdowns: metaBreakdownParam,
      fields: 'spend,impressions,reach,clicks,cpc,ctr,actions,action_values,date_start,date_stop',
      limit: 100,
    };

    if (dateRange?.startDate && dateRange?.endDate) {
      params.time_range = JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      });
    } else {
      params.date_preset = 'last_30d';
    }

    return this.paginateAll<any>(`${targetId}/insights`, params, 1000);
  }

  // -------------------------------------------------------------
  // 4. HIGH FIDELITY SANDBOX / TEST HANDLER
  // -------------------------------------------------------------

  private async handleSandboxRequest<T>(
    endpoint: string,
    params: Record<string, any>
  ): Promise<T> {
    const cleanEndpoint = endpoint.replace(/^\/+/, '');

    if (cleanEndpoint === 'me') {
      return {
        id: 'usr_meta_sunil_dev',
        name: 'Sunil Panigrahy (Meta Developer Partner)',
        email: 'sunilpanigrahy29401@gmail.com',
      } as unknown as T;
    }

    if (cleanEndpoint === 'me/businesses') {
      return {
        data: [
          {
            id: 'biz_483920194857261',
            name: 'Jyotsvan Enterprises Business Group',
            verification_status: 'verified',
            created_time: '2025-01-15T08:00:00+0000',
            primary_page: 'Jyotsvan Organics Official',
          },
        ],
      } as unknown as T;
    }

    if (cleanEndpoint === 'me/adaccounts' || cleanEndpoint.endsWith('/adaccounts')) {
      return {
        data: [
          {
            id: 'act_894120938475612',
            account_id: '894120938475612',
            name: 'Jyotsvan Organics D2C Performance Ads',
            account_status: 1, // 1 = ACTIVE
            currency: 'INR',
            timezone_name: 'Asia/Kolkata',
            business: {
              id: 'biz_483920194857261',
              name: 'Jyotsvan Enterprises Business Group',
            },
            amount_spent: '48750000', // in cents
            balance: '1250000',
            min_daily_budget: 500,
            capabilities: ['CAN_USE_SPEND_CAP', 'CAN_USE_DYNAMIC_CREATIVE', 'CUSTOM_CONVERSIONS'],
          },
          {
            id: 'act_561209384756123',
            account_id: '561209384756123',
            name: 'Jyotsvan B2B Distributor Lead Acquisition',
            account_status: 1,
            currency: 'INR',
            timezone_name: 'Asia/Kolkata',
            business: {
              id: 'biz_483920194857261',
              name: 'Jyotsvan Enterprises Business Group',
            },
            amount_spent: '14230000',
            balance: '840000',
            min_daily_budget: 1000,
            capabilities: ['CAN_USE_LEAD_ADS', 'CUSTOM_CONVERSIONS'],
          },
        ],
      } as unknown as T;
    }

    if (cleanEndpoint.startsWith('act_') && !cleanEndpoint.includes('/')) {
      return {
        id: cleanEndpoint,
        account_id: cleanEndpoint.replace(/^act_/, ''),
        name: 'Jyotsvan Organics D2C Performance Ads',
        account_status: 1,
        currency: 'INR',
        timezone_name: 'Asia/Kolkata',
        business: {
          id: 'biz_483920194857261',
          name: 'Jyotsvan Enterprises Business Group',
        },
        amount_spent: '48750000',
        balance: '1250000',
        min_daily_budget: 500,
        capabilities: ['CAN_USE_SPEND_CAP', 'CAN_USE_DYNAMIC_CREATIVE'],
      } as unknown as T;
    }

    if (cleanEndpoint.endsWith('/campaigns')) {
      return {
        data: [
          {
            id: 'cmp_774920192837461',
            name: 'Nutrienty Pure Cold-Pressed Oils - Top of Funnel Prospecting',
            objective: 'OUTCOME_SALES',
            status: 'ACTIVE',
            effective_status: 'ACTIVE',
            buying_type: 'AUCTION',
            daily_budget: '450000',
            start_time: '2026-08-01T00:00:00+0000',
            created_time: '2026-08-01T00:00:00+0000',
            updated_time: '2026-09-20T10:00:00+0000',
          },
          {
            id: 'cmp_774920192837462',
            name: 'OptyPeak Organic Cold-Pressed Mustard Oil - Catalog Retargeting',
            objective: 'PRODUCT_CATALOG_SALES',
            status: 'ACTIVE',
            effective_status: 'ACTIVE',
            buying_type: 'AUCTION',
            daily_budget: '350000',
            start_time: '2026-08-10T00:00:00+0000',
            created_time: '2026-08-10T00:00:00+0000',
            updated_time: '2026-09-21T11:00:00+0000',
          },
          {
            id: 'cmp_774920192837463',
            name: 'Omega-3 Cold-Pressed Flaxseed Oil - Health & Wellness D2C',
            objective: 'OUTCOME_SALES',
            status: 'ACTIVE',
            effective_status: 'ACTIVE',
            buying_type: 'AUCTION',
            daily_budget: '250000',
            start_time: '2026-08-15T00:00:00+0000',
            created_time: '2026-08-15T00:00:00+0000',
            updated_time: '2026-09-22T08:00:00+0000',
          },
        ],
      } as unknown as T;
    }

    if (cleanEndpoint.endsWith('/adsets')) {
      return {
        data: [
          {
            id: 'adset_661928374651021',
            campaign_id: 'cmp_774920192837461',
            name: 'Advantage+ Shopping Campaign - Cold Audiences India Tier 1-2',
            status: 'ACTIVE',
            effective_status: 'ACTIVE',
            daily_budget: '250000',
            optimization_goal: 'OFFSITE_CONVERSIONS',
            billing_event: 'IMPRESSIONS',
            start_time: '2026-08-01T00:00:00+0000',
          },
          {
            id: 'adset_661928374651022',
            campaign_id: 'cmp_774920192837461',
            name: '1% High LTV Shopify Customers Lookalike - Groundnut & Mustard',
            status: 'ACTIVE',
            effective_status: 'ACTIVE',
            daily_budget: '200000',
            optimization_goal: 'OFFSITE_CONVERSIONS',
            billing_event: 'IMPRESSIONS',
            start_time: '2026-08-01T00:00:00+0000',
          },
        ],
      } as unknown as T;
    }

    if (cleanEndpoint.endsWith('/ads')) {
      return {
        data: [
          {
            id: 'ad_331928374650121',
            campaign_id: 'cmp_774920192837461',
            adset_id: 'adset_661928374651021',
            name: 'Video Reel - Authentic Pungent Yellow Mustard Oil 1L',
            status: 'ACTIVE',
            effective_status: 'ACTIVE',
            creative: { id: 'crt_991827364501231' },
            created_time: '2026-08-01T00:00:00+0000',
          },
          {
            id: 'ad_331928374650122',
            campaign_id: 'cmp_774920192837461',
            adset_id: 'adset_661928374651022',
            name: 'Carousel - Cold-Pressed Trio Combo Offer',
            status: 'ACTIVE',
            effective_status: 'ACTIVE',
            creative: { id: 'crt_991827364501232' },
            created_time: '2026-08-01T00:00:00+0000',
          },
        ],
      } as unknown as T;
    }

    if (cleanEndpoint.endsWith('/adcreatives')) {
      return {
        data: [
          {
            id: 'crt_991827364501231',
            name: 'Traditional Kolhu Wood-Pressed Extraction Video Reel 9:16',
            title: '100% Pure Virgin Cold-Pressed Mustard Oil | Jyotsvan',
            body: 'Crafted using wooden kachi ghani churners at <40°C. Preserves authentic pungent aroma and natural antioxidants.',
            call_to_action_type: 'SHOP_NOW',
            image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&auto=format&fit=crop&q=80',
          },
        ],
      } as unknown as T;
    }

    if (cleanEndpoint.endsWith('/insights')) {
      const todayStr = new Date().toISOString().split('T')[0];
      return {
        data: [
          {
            account_id: '894120938475612',
            account_name: 'Jyotsvan Organics D2C Performance Ads',
            spend: '14500.00',
            impressions: '355000',
            reach: '276900',
            frequency: '1.28',
            clicks: '8690',
            cpc: '1.67',
            cpm: '40.85',
            ctr: '2.45',
            date_start: todayStr,
            date_stop: todayStr,
            actions: [
              { action_type: 'link_click', value: '6430' },
              { action_type: 'offsite_conversion.fb_pixel_purchase', value: '450' },
            ],
            action_values: [
              { action_type: 'offsite_conversion.fb_pixel_purchase', value: '742500.00' },
            ],
          },
        ],
      } as unknown as T;
    }

    return { data: [] } as unknown as T;
  }
}
