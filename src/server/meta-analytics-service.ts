// src/server/meta-analytics-service.ts
// Phase 27: Centralized Server-Side Meta Ads Analytics Query Engine

import { pool } from './db.ts';
import {
  calcCTR,
  calcCPC,
  calcCPM,
  calcCPA,
  calcROAS,
  computeDashboardKPIs,
} from '../utils/metaMetrics.ts';
import type {
  MetaAnalyticsFilter,
  MetaBreakdownMetricRow,
  MetaDashboardKPIs,
  MetaExecutiveOverviewData,
  MetaTopPerformer,
  MetaTrendPoint,
} from '../types/meta.ts';

export class MetaAnalyticsService {
  /**
   * Helper: Resolve active primary ad account or filtered account
   */
  private static async getAdAccount(
    organizationId: string,
    accountId?: string
  ) {
    const client = await pool.connect();
    try {
      if (accountId) {
        const res = await client.query(
          `SELECT * FROM marketing_ad_accounts 
           WHERE organization_id = $1 AND (id = $2 OR external_ad_account_id = $2 OR account_id = $2)
           LIMIT 1;`,
          [organizationId, accountId]
        );
        if (res.rows.length > 0) return res.rows[0];
      }

      // Default to primary or first active account
      const res = await client.query(
        `SELECT * FROM marketing_ad_accounts 
         WHERE organization_id = $1 
         ORDER BY is_primary DESC, created_at ASC 
         LIMIT 1;`,
        [organizationId]
      );
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * 1. Executive Overview
   */
  static async getExecutiveOverview(
    organizationId: string,
    filter: MetaAnalyticsFilter = {}
  ): Promise<MetaExecutiveOverviewData> {
    const client = await pool.connect();
    try {
      // 1. Get Ad Account
      const adAccount = await this.getAdAccount(organizationId, filter.accountId);

      // 2. Get Connection & Sync Jobs
      const connRes = await client.query(
        `SELECT * FROM integration_connections 
         WHERE organization_id = $1 AND provider_id = 'prov-meta-ads' 
         ORDER BY updated_at DESC LIMIT 1;`,
        [organizationId]
      );
      const connection = connRes.rows[0] || null;

      // 3. All Ad Accounts for selector
      const allAccsRes = await client.query(
        `SELECT * FROM marketing_ad_accounts 
         WHERE organization_id = $1 
         ORDER BY is_primary DESC, name ASC;`,
        [organizationId]
      );
      const adAccounts = allAccsRes.rows;

      const currency = adAccount?.currency || 'INR';
      const adAccountId = adAccount?.id;

      // Date constraints
      const startDate = filter.startDate || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const endDate = filter.endDate || new Date().toISOString().split('T')[0];

      // Current period aggregation
      let curSpend = 0;
      let curImpressions = 0;
      let curReach = 0;
      let curClicks = 0;
      let curConversions = 0;
      let curConversionValue = 0;

      if (adAccountId) {
        const curAggRes = await client.query(
          `SELECT 
            COALESCE(SUM(spend), 0) as total_spend,
            COALESCE(SUM(impressions), 0) as total_impressions,
            COALESCE(MAX(reach), SUM(reach), 0) as total_reach,
            COALESCE(SUM(clicks), 0) as total_clicks,
            COALESCE(SUM(conversions), 0) as total_conversions,
            COALESCE(SUM(conversion_value), 0) as total_conversion_value
           FROM marketing_daily_insights
           WHERE organization_id = $1 
             AND ad_account_id = $2 
             AND level = 'account'
             AND date >= $3 AND date <= $4;`,
          [organizationId, adAccountId, startDate, endDate]
        );

        if (curAggRes.rows.length > 0) {
          const row = curAggRes.rows[0];
          curSpend = Number(row.total_spend);
          curImpressions = Number(row.total_impressions);
          curReach = Number(row.total_reach);
          curClicks = Number(row.total_clicks);
          curConversions = Number(row.total_conversions);
          curConversionValue = Number(row.total_conversion_value);
        }
      }

      // Comparison period aggregation
      let prevData: {
        spend: number;
        impressions: number;
        reach: number;
        clicks: number;
        conversions: number;
        conversion_value: number;
      } | null = null;

      if (adAccountId && filter.compareStartDate && filter.compareEndDate) {
        const prevAggRes = await client.query(
          `SELECT 
            COALESCE(SUM(spend), 0) as total_spend,
            COALESCE(SUM(impressions), 0) as total_impressions,
            COALESCE(MAX(reach), SUM(reach), 0) as total_reach,
            COALESCE(SUM(clicks), 0) as total_clicks,
            COALESCE(SUM(conversions), 0) as total_conversions,
            COALESCE(SUM(conversion_value), 0) as total_conversion_value
           FROM marketing_daily_insights
           WHERE organization_id = $1 
             AND ad_account_id = $2 
             AND level = 'account'
             AND date >= $3 AND date <= $4;`,
          [organizationId, adAccountId, filter.compareStartDate, filter.compareEndDate]
        );

        if (prevAggRes.rows.length > 0) {
          const pRow = prevAggRes.rows[0];
          prevData = {
            spend: Number(pRow.total_spend),
            impressions: Number(pRow.total_impressions),
            reach: Number(pRow.total_reach),
            clicks: Number(pRow.total_clicks),
            conversions: Number(pRow.total_conversions),
            conversion_value: Number(pRow.total_conversion_value),
          };
        }
      }

      // Compute 11 KPIs
      const kpis: MetaDashboardKPIs = computeDashboardKPIs(
        {
          spend: curSpend,
          impressions: curImpressions,
          reach: curReach,
          clicks: curClicks,
          conversions: curConversions,
          conversion_value: curConversionValue,
        },
        prevData,
        currency
      );

      // Trends time-series
      const trends: MetaTrendPoint[] = [];
      if (adAccountId) {
        const trendRes = await client.query(
          `SELECT 
            date::text,
            COALESCE(SUM(spend), 0) as spend,
            COALESCE(SUM(impressions), 0) as impressions,
            COALESCE(SUM(reach), 0) as reach,
            COALESCE(SUM(clicks), 0) as clicks,
            COALESCE(SUM(conversions), 0) as conversions,
            COALESCE(SUM(conversion_value), 0) as conversion_value
           FROM marketing_daily_insights
           WHERE organization_id = $1 
             AND ad_account_id = $2 
             AND level = 'account'
             AND date >= $3 AND date <= $4
           GROUP BY date
           ORDER BY date ASC;`,
          [organizationId, adAccountId, startDate, endDate]
        );

        for (const r of trendRes.rows) {
          const sp = Number(r.spend);
          const imp = Number(r.impressions);
          const clk = Number(r.clicks);
          const conv = Number(r.conversions);
          const cval = Number(r.conversion_value);

          trends.push({
            date: r.date,
            spend: sp,
            impressions: imp,
            reach: Number(r.reach),
            clicks: clk,
            ctr: calcCTR(clk, imp),
            cpc: calcCPC(sp, clk),
            cpm: calcCPM(sp, imp),
            conversions: conv,
            cpa: calcCPA(sp, conv),
            conversion_value: cval,
            roas: calcROAS(cval, sp),
          });
        }
      }

      // Top 5 Campaigns
      const topCampaigns: MetaTopPerformer[] = [];
      if (adAccountId) {
        const topCmpRes = await client.query(
          `SELECT 
            c.id,
            c.name,
            c.status,
            COALESCE(SUM(i.spend), 0) as spend,
            COALESCE(SUM(i.impressions), 0) as impressions,
            COALESCE(SUM(i.clicks), 0) as clicks,
            COALESCE(SUM(i.conversions), 0) as conversions,
            COALESCE(SUM(i.conversion_value), 0) as conversion_value
           FROM marketing_campaigns c
           LEFT JOIN marketing_daily_insights i 
             ON i.external_campaign_id = c.external_campaign_id 
             AND i.organization_id = c.organization_id
             AND i.date >= $3 AND i.date <= $4
           WHERE c.organization_id = $1 AND c.ad_account_id = $2
           GROUP BY c.id, c.name, c.status
           ORDER BY spend DESC
           LIMIT 5;`,
          [organizationId, adAccountId, startDate, endDate]
        );

        for (const row of topCmpRes.rows) {
          const sp = Number(row.spend);
          const imp = Number(row.impressions);
          const clk = Number(row.clicks);
          const conv = Number(row.conversions);
          const cval = Number(row.conversion_value);

          topCampaigns.push({
            id: row.id,
            name: row.name,
            status: row.status,
            spend: sp,
            impressions: imp,
            clicks: clk,
            conversions: conv,
            conversion_value: cval,
            roas: calcROAS(cval, sp),
            cpa: calcCPA(sp, conv),
            ctr: calcCTR(clk, imp),
          });
        }
      }

      // Top 5 Ads
      const topAds: MetaTopPerformer[] = [];
      if (adAccountId) {
        const topAdsRes = await client.query(
          `SELECT 
            a.id,
            a.name,
            a.status,
            COALESCE(SUM(i.spend), 0) as spend,
            COALESCE(SUM(i.impressions), 0) as impressions,
            COALESCE(SUM(i.clicks), 0) as clicks,
            COALESCE(SUM(i.conversions), 0) as conversions,
            COALESCE(SUM(i.conversion_value), 0) as conversion_value
           FROM marketing_ads a
           LEFT JOIN marketing_daily_insights i 
             ON i.external_ad_id = a.external_ad_id 
             AND i.organization_id = a.organization_id
             AND i.date >= $3 AND i.date <= $4
           WHERE a.organization_id = $1 AND a.ad_account_id = $2
           GROUP BY a.id, a.name, a.status
           ORDER BY conversions DESC, spend DESC
           LIMIT 5;`,
          [organizationId, adAccountId, startDate, endDate]
        );

        for (const row of topAdsRes.rows) {
          const sp = Number(row.spend);
          const imp = Number(row.impressions);
          const clk = Number(row.clicks);
          const conv = Number(row.conversions);
          const cval = Number(row.conversion_value);

          topAds.push({
            id: row.id,
            name: row.name,
            status: row.status,
            spend: sp,
            impressions: imp,
            clicks: clk,
            conversions: conv,
            conversion_value: cval,
            roas: calcROAS(cval, sp),
            cpa: calcCPA(sp, conv),
            ctr: calcCTR(clk, imp),
          });
        }
      }

      // Counts
      let campaignsCount = { total: 0, active: 0 };
      let adSetsCount = { total: 0, active: 0 };
      let adsCount = { total: 0, active: 0 };

      if (adAccountId) {
        const cCnt = await client.query(
          `SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'ACTIVE') as active
           FROM marketing_campaigns 
           WHERE organization_id = $1 AND ad_account_id = $2;`,
          [organizationId, adAccountId]
        );
        campaignsCount = {
          total: Number(cCnt.rows[0]?.total || 0),
          active: Number(cCnt.rows[0]?.active || 0),
        };

        const sCnt = await client.query(
          `SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'ACTIVE') as active
           FROM marketing_ad_sets 
           WHERE organization_id = $1 AND ad_account_id = $2;`,
          [organizationId, adAccountId]
        );
        adSetsCount = {
          total: Number(sCnt.rows[0]?.total || 0),
          active: Number(sCnt.rows[0]?.active || 0),
        };

        const aCnt = await client.query(
          `SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'ACTIVE') as active
           FROM marketing_ads 
           WHERE organization_id = $1 AND ad_account_id = $2;`,
          [organizationId, adAccountId]
        );
        adsCount = {
          total: Number(aCnt.rows[0]?.total || 0),
          active: Number(aCnt.rows[0]?.active || 0),
        };
      }

      // Exceptions & Sync State
      const excRes = await client.query(
        `SELECT * FROM marketing_sync_exceptions 
         WHERE organization_id = $1 AND resolved = false 
         ORDER BY created_at DESC LIMIT 5;`,
        [organizationId]
      );
      const recentExceptions = excRes.rows;

      return {
        connection,
        adAccounts,
        selectedAdAccount: adAccount,
        currency,
        kpis,
        trends,
        topCampaigns,
        topAds,
        campaignsCount,
        adSetsCount,
        adsCount,
        lastSyncAt: connection?.last_sync_at || null,
        syncStatus: connection?.sync_status || 'idle',
        hasSyncExceptions: recentExceptions.length > 0,
        recentExceptions,
      };
    } finally {
      client.release();
    }
  }

  /**
   * 2. Campaigns List with Aggregated Performance
   */
  static async getCampaigns(
    organizationId: string,
    filter: MetaAnalyticsFilter = {}
  ) {
    const client = await pool.connect();
    try {
      const adAccount = await this.getAdAccount(organizationId, filter.accountId);
      if (!adAccount) return { campaigns: [], total: 0, currency: 'INR' };

      const startDate = filter.startDate || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const endDate = filter.endDate || new Date().toISOString().split('T')[0];

      const params: (string | number)[] = [organizationId, adAccount.id, startDate, endDate];
      let whereClause = `WHERE c.organization_id = $1 AND c.ad_account_id = $2`;

      if (filter.status && filter.status !== 'ALL') {
        params.push(filter.status);
        whereClause += ` AND c.status = $${params.length}`;
      }

      if (filter.search) {
        params.push(`%${filter.search}%`);
        whereClause += ` AND (c.name ILIKE $${params.length} OR c.external_campaign_id ILIKE $${params.length})`;
      }

      // Total count
      const countRes = await client.query(
        `SELECT COUNT(*) FROM marketing_campaigns c ${whereClause};`,
        params.slice(0, whereClause.includes('ILIKE') ? params.length : (filter.status && filter.status !== 'ALL' ? 3 : 2))
      );
      const total = Number(countRes.rows[0]?.count || 0);

      // Sorting
      let orderBy = `spend DESC, c.created_at DESC`;
      if (filter.sortBy) {
        const order = filter.sortOrder === 'asc' ? 'ASC' : 'DESC';
        const validCols: Record<string, string> = {
          name: 'c.name',
          status: 'c.status',
          spend: 'spend',
          impressions: 'impressions',
          reach: 'reach',
          clicks: 'clicks',
          conversions: 'conversions',
          conversion_value: 'conversion_value',
          ctr: 'ctr',
          cpc: 'cpc',
          cpm: 'cpm',
          cpa: 'cpa',
          roas: 'roas',
        };
        if (validCols[filter.sortBy]) {
          orderBy = `${validCols[filter.sortBy]} ${order}`;
        }
      }

      const limit = Math.min(Number(filter.limit || 50), 200);
      const offset = Number(filter.offset || 0);

      params.push(limit, offset);
      const limitOffset = `LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const query = `
        SELECT 
          c.*,
          COALESCE(SUM(i.spend), 0) as spend,
          COALESCE(SUM(i.impressions), 0) as impressions,
          COALESCE(MAX(i.reach), SUM(i.reach), 0) as reach,
          COALESCE(SUM(i.clicks), 0) as clicks,
          COALESCE(SUM(i.link_clicks), 0) as link_clicks,
          COALESCE(SUM(i.conversions), 0) as conversions,
          COALESCE(SUM(i.conversion_value), 0) as conversion_value
        FROM marketing_campaigns c
        LEFT JOIN marketing_daily_insights i 
          ON i.external_campaign_id = c.external_campaign_id 
          AND i.organization_id = c.organization_id
          AND i.date >= $3 AND i.date <= $4
        ${whereClause}
        GROUP BY c.id
        ORDER BY ${orderBy}
        ${limitOffset};
      `;

      const res = await client.query(query, params);

      const campaigns = res.rows.map((row) => {
        const spend = Number(row.spend);
        const impressions = Number(row.impressions);
        const reach = Number(row.reach);
        const clicks = Number(row.clicks);
        const conversions = Number(row.conversions);
        const conversion_value = Number(row.conversion_value);

        return {
          ...row,
          spend,
          impressions,
          reach,
          clicks,
          conversions,
          conversion_value,
          ctr: calcCTR(clicks, impressions),
          cpc: calcCPC(spend, clicks),
          cpm: calcCPM(spend, impressions),
          cpa: calcCPA(spend, conversions),
          roas: calcROAS(conversion_value, spend),
        };
      });

      return { campaigns, total, currency: adAccount.currency };
    } finally {
      client.release();
    }
  }

  /**
   * 3. Single Campaign Detail + Performance + Child Ad Sets & Ads
   */
  static async getCampaignDetail(
    organizationId: string,
    campaignId: string,
    filter: MetaAnalyticsFilter = {}
  ) {
    const client = await pool.connect();
    try {
      const cmpRes = await client.query(
        `SELECT c.*, a.currency, a.name as ad_account_name
         FROM marketing_campaigns c
         JOIN marketing_ad_accounts a ON a.id = c.ad_account_id
         WHERE c.organization_id = $1 AND (c.id = $2 OR c.external_campaign_id = $2)
         LIMIT 1;`,
        [organizationId, campaignId]
      );
      if (cmpRes.rows.length === 0) return null;
      const campaign = cmpRes.rows[0];

      const startDate = filter.startDate || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const endDate = filter.endDate || new Date().toISOString().split('T')[0];

      // Aggregated KPIs
      const aggRes = await client.query(
        `SELECT 
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(MAX(reach), SUM(reach), 0) as reach,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(conversion_value), 0) as conversion_value
         FROM marketing_daily_insights
         WHERE organization_id = $1 
           AND external_campaign_id = $2 
           AND date >= $3 AND date <= $4;`,
        [organizationId, campaign.external_campaign_id, startDate, endDate]
      );
      const curRow = aggRes.rows[0];
      const spend = Number(curRow?.spend || 0);
      const impressions = Number(curRow?.impressions || 0);
      const reach = Number(curRow?.reach || 0);
      const clicks = Number(curRow?.clicks || 0);
      const conversions = Number(curRow?.conversions || 0);
      const conversion_value = Number(curRow?.conversion_value || 0);

      // Trend data points
      const trendRes = await client.query(
        `SELECT 
          date::text,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(reach), 0) as reach,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(conversion_value), 0) as conversion_value
         FROM marketing_daily_insights
         WHERE organization_id = $1 
           AND external_campaign_id = $2 
           AND date >= $3 AND date <= $4
         GROUP BY date
         ORDER BY date ASC;`,
        [organizationId, campaign.external_campaign_id, startDate, endDate]
      );

      const trends: MetaTrendPoint[] = trendRes.rows.map((r) => {
        const sp = Number(r.spend);
        const imp = Number(r.impressions);
        const clk = Number(r.clicks);
        const conv = Number(r.conversions);
        const cval = Number(r.conversion_value);

        return {
          date: r.date,
          spend: sp,
          impressions: imp,
          reach: Number(r.reach),
          clicks: clk,
          ctr: calcCTR(clk, imp),
          cpc: calcCPC(sp, clk),
          cpm: calcCPM(sp, imp),
          conversions: conv,
          cpa: calcCPA(sp, conv),
          conversion_value: cval,
          roas: calcROAS(cval, sp),
        };
      });

      // Child Ad Sets
      const adSetsRes = await client.query(
        `SELECT s.*, 
          COALESCE(SUM(i.spend), 0) as spend,
          COALESCE(SUM(i.impressions), 0) as impressions,
          COALESCE(SUM(i.clicks), 0) as clicks,
          COALESCE(SUM(i.conversions), 0) as conversions,
          COALESCE(SUM(i.conversion_value), 0) as conversion_value
         FROM marketing_ad_sets s
         LEFT JOIN marketing_daily_insights i 
           ON i.external_adset_id = s.external_adset_id 
           AND i.organization_id = s.organization_id
           AND i.date >= $3 AND i.date <= $4
         WHERE s.organization_id = $1 AND s.campaign_id = $2
         GROUP BY s.id
         ORDER BY spend DESC;`,
        [organizationId, campaign.id, startDate, endDate]
      );

      // Child Ads
      const adsRes = await client.query(
        `SELECT a.*, c.title as creative_title, c.image_url, c.thumbnail_url,
          COALESCE(SUM(i.spend), 0) as spend,
          COALESCE(SUM(i.impressions), 0) as impressions,
          COALESCE(SUM(i.clicks), 0) as clicks,
          COALESCE(SUM(i.conversions), 0) as conversions,
          COALESCE(SUM(i.conversion_value), 0) as conversion_value
         FROM marketing_ads a
         LEFT JOIN marketing_creatives c ON c.id = a.creative_id
         LEFT JOIN marketing_daily_insights i 
           ON i.external_ad_id = a.external_ad_id 
           AND i.organization_id = a.organization_id
           AND i.date >= $3 AND i.date <= $4
         WHERE a.organization_id = $1 AND a.campaign_id = $2
         GROUP BY a.id, c.title, c.image_url, c.thumbnail_url
         ORDER BY spend DESC;`,
        [organizationId, campaign.id, startDate, endDate]
      );

      return {
        campaign: {
          ...campaign,
          spend,
          impressions,
          reach,
          clicks,
          conversions,
          conversion_value,
          ctr: calcCTR(clicks, impressions),
          cpc: calcCPC(spend, clicks),
          cpm: calcCPM(spend, impressions),
          cpa: calcCPA(spend, conversions),
          roas: calcROAS(conversion_value, spend),
        },
        trends,
        adSets: adSetsRes.rows.map((row) => {
          const sp = Number(row.spend);
          const imp = Number(row.impressions);
          const clk = Number(row.clicks);
          const conv = Number(row.conversions);
          const cval = Number(row.conversion_value);
          return {
            ...row,
            spend: sp,
            impressions: imp,
            clicks: clk,
            conversions: conv,
            conversion_value: cval,
            ctr: calcCTR(clk, imp),
            cpc: calcCPC(sp, clk),
            cpm: calcCPM(sp, imp),
            cpa: calcCPA(sp, conv),
            roas: calcROAS(cval, sp),
          };
        }),
        ads: adsRes.rows.map((row) => {
          const sp = Number(row.spend);
          const imp = Number(row.impressions);
          const clk = Number(row.clicks);
          const conv = Number(row.conversions);
          const cval = Number(row.conversion_value);
          return {
            ...row,
            spend: sp,
            impressions: imp,
            clicks: clk,
            conversions: conv,
            conversion_value: cval,
            ctr: calcCTR(clk, imp),
            cpc: calcCPC(sp, clk),
            cpm: calcCPM(sp, imp),
            cpa: calcCPA(sp, conv),
            roas: calcROAS(cval, sp),
          };
        }),
      };
    } finally {
      client.release();
    }
  }

  /**
   * 4. Ad Sets List
   */
  static async getAdSets(
    organizationId: string,
    filter: MetaAnalyticsFilter = {}
  ) {
    const client = await pool.connect();
    try {
      const adAccount = await this.getAdAccount(organizationId, filter.accountId);
      if (!adAccount) return { adSets: [], total: 0, currency: 'INR' };

      const startDate = filter.startDate || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const endDate = filter.endDate || new Date().toISOString().split('T')[0];

      const params: (string | number)[] = [organizationId, adAccount.id, startDate, endDate];
      let whereClause = `WHERE s.organization_id = $1 AND s.ad_account_id = $2`;

      if (filter.campaignId) {
        params.push(filter.campaignId);
        whereClause += ` AND (s.campaign_id = $${params.length} OR s.external_campaign_id = $${params.length})`;
      }

      if (filter.status && filter.status !== 'ALL') {
        params.push(filter.status);
        whereClause += ` AND s.status = $${params.length}`;
      }

      if (filter.search) {
        params.push(`%${filter.search}%`);
        whereClause += ` AND (s.name ILIKE $${params.length} OR s.external_adset_id ILIKE $${params.length})`;
      }

      const countRes = await client.query(
        `SELECT COUNT(*) FROM marketing_ad_sets s ${whereClause};`,
        params.slice(0, whereClause.includes('ILIKE') ? params.length : 2)
      );
      const total = Number(countRes.rows[0]?.count || 0);

      const limit = Math.min(Number(filter.limit || 50), 200);
      const offset = Number(filter.offset || 0);
      params.push(limit, offset);

      const query = `
        SELECT 
          s.*,
          c.name as campaign_name,
          COALESCE(SUM(i.spend), 0) as spend,
          COALESCE(SUM(i.impressions), 0) as impressions,
          COALESCE(MAX(i.reach), SUM(i.reach), 0) as reach,
          COALESCE(SUM(i.clicks), 0) as clicks,
          COALESCE(SUM(i.conversions), 0) as conversions,
          COALESCE(SUM(i.conversion_value), 0) as conversion_value
        FROM marketing_ad_sets s
        JOIN marketing_campaigns c ON c.id = s.campaign_id
        LEFT JOIN marketing_daily_insights i 
          ON i.external_adset_id = s.external_adset_id 
          AND i.organization_id = s.organization_id
          AND i.date >= $3 AND i.date <= $4
        ${whereClause}
        GROUP BY s.id, c.name
        ORDER BY spend DESC, s.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length};
      `;

      const res = await client.query(query, params);

      const adSets = res.rows.map((row) => {
        const spend = Number(row.spend);
        const impressions = Number(row.impressions);
        const reach = Number(row.reach);
        const clicks = Number(row.clicks);
        const conversions = Number(row.conversions);
        const conversion_value = Number(row.conversion_value);

        return {
          ...row,
          spend,
          impressions,
          reach,
          clicks,
          conversions,
          conversion_value,
          ctr: calcCTR(clicks, impressions),
          cpc: calcCPC(spend, clicks),
          cpm: calcCPM(spend, impressions),
          cpa: calcCPA(spend, conversions),
          roas: calcROAS(conversion_value, spend),
        };
      });

      return { adSets, total, currency: adAccount.currency };
    } finally {
      client.release();
    }
  }

  /**
   * 5. Ads List with Creative Data
   */
  static async getAds(
    organizationId: string,
    filter: MetaAnalyticsFilter = {}
  ) {
    const client = await pool.connect();
    try {
      const adAccount = await this.getAdAccount(organizationId, filter.accountId);
      if (!adAccount) return { ads: [], total: 0, currency: 'INR' };

      const startDate = filter.startDate || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const endDate = filter.endDate || new Date().toISOString().split('T')[0];

      const params: (string | number)[] = [organizationId, adAccount.id, startDate, endDate];
      let whereClause = `WHERE a.organization_id = $1 AND a.ad_account_id = $2`;

      if (filter.campaignId) {
        params.push(filter.campaignId);
        whereClause += ` AND (a.campaign_id = $${params.length} OR a.external_campaign_id = $${params.length})`;
      }

      if (filter.adSetId) {
        params.push(filter.adSetId);
        whereClause += ` AND (a.adset_id = $${params.length} OR a.external_adset_id = $${params.length})`;
      }

      if (filter.status && filter.status !== 'ALL') {
        params.push(filter.status);
        whereClause += ` AND a.status = $${params.length}`;
      }

      if (filter.search) {
        params.push(`%${filter.search}%`);
        whereClause += ` AND (a.name ILIKE $${params.length} OR a.external_ad_id ILIKE $${params.length})`;
      }

      const countRes = await client.query(
        `SELECT COUNT(*) FROM marketing_ads a ${whereClause};`,
        params.slice(0, whereClause.includes('ILIKE') ? params.length : 2)
      );
      const total = Number(countRes.rows[0]?.count || 0);

      const limit = Math.min(Number(filter.limit || 50), 200);
      const offset = Number(filter.offset || 0);
      params.push(limit, offset);

      const query = `
        SELECT 
          a.*,
          c.name as campaign_name,
          s.name as adset_name,
          cr.name as creative_name,
          cr.title as creative_title,
          cr.body as creative_body,
          cr.image_url,
          cr.thumbnail_url,
          cr.call_to_action_type,
          COALESCE(SUM(i.spend), 0) as spend,
          COALESCE(SUM(i.impressions), 0) as impressions,
          COALESCE(MAX(i.reach), SUM(i.reach), 0) as reach,
          COALESCE(SUM(i.clicks), 0) as clicks,
          COALESCE(SUM(i.conversions), 0) as conversions,
          COALESCE(SUM(i.conversion_value), 0) as conversion_value
        FROM marketing_ads a
        JOIN marketing_campaigns c ON c.id = a.campaign_id
        JOIN marketing_ad_sets s ON s.id = a.adset_id
        LEFT JOIN marketing_creatives cr ON cr.id = a.creative_id
        LEFT JOIN marketing_daily_insights i 
          ON i.external_ad_id = a.external_ad_id 
          AND i.organization_id = a.organization_id
          AND i.date >= $3 AND i.date <= $4
        ${whereClause}
        GROUP BY a.id, c.name, s.name, cr.name, cr.title, cr.body, cr.image_url, cr.thumbnail_url, cr.call_to_action_type
        ORDER BY spend DESC, a.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length};
      `;

      const res = await client.query(query, params);

      const ads = res.rows.map((row) => {
        const spend = Number(row.spend);
        const impressions = Number(row.impressions);
        const reach = Number(row.reach);
        const clicks = Number(row.clicks);
        const conversions = Number(row.conversions);
        const conversion_value = Number(row.conversion_value);

        return {
          ...row,
          creative: {
            id: row.creative_id,
            name: row.creative_name,
            title: row.creative_title,
            body: row.creative_body,
            image_url: row.image_url,
            thumbnail_url: row.thumbnail_url,
            call_to_action_type: row.call_to_action_type,
          },
          spend,
          impressions,
          reach,
          clicks,
          conversions,
          conversion_value,
          ctr: calcCTR(clicks, impressions),
          cpc: calcCPC(spend, clicks),
          cpm: calcCPM(spend, impressions),
          cpa: calcCPA(spend, conversions),
          roas: calcROAS(conversion_value, spend),
        };
      });

      return { ads, total, currency: adAccount.currency };
    } finally {
      client.release();
    }
  }

  /**
   * 6. Creatives List
   */
  static async getCreatives(
    organizationId: string,
    filter: MetaAnalyticsFilter = {}
  ) {
    const client = await pool.connect();
    try {
      const adAccount = await this.getAdAccount(organizationId, filter.accountId);
      if (!adAccount) return { creatives: [], total: 0, currency: 'INR' };

      const startDate = filter.startDate || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const endDate = filter.endDate || new Date().toISOString().split('T')[0];

      const res = await client.query(
        `SELECT 
          cr.*,
          COUNT(DISTINCT a.id) as ads_count,
          COALESCE(SUM(i.spend), 0) as spend,
          COALESCE(SUM(i.impressions), 0) as impressions,
          COALESCE(SUM(i.clicks), 0) as clicks,
          COALESCE(SUM(i.conversions), 0) as conversions,
          COALESCE(SUM(i.conversion_value), 0) as conversion_value
         FROM marketing_creatives cr
         LEFT JOIN marketing_ads a ON a.creative_id = cr.id
         LEFT JOIN marketing_daily_insights i 
           ON i.external_ad_id = a.external_ad_id 
           AND i.organization_id = cr.organization_id
           AND i.date >= $3 AND i.date <= $4
         WHERE cr.organization_id = $1 AND cr.ad_account_id = $2
         GROUP BY cr.id
         ORDER BY spend DESC, cr.created_at DESC;`,
        [organizationId, adAccount.id, startDate, endDate]
      );

      const creatives = res.rows.map((row) => {
        const spend = Number(row.spend);
        const impressions = Number(row.impressions);
        const clicks = Number(row.clicks);
        const conversions = Number(row.conversions);
        const conversion_value = Number(row.conversion_value);

        return {
          ...row,
          ads_count: Number(row.ads_count || 0),
          spend,
          impressions,
          clicks,
          conversions,
          conversion_value,
          ctr: calcCTR(clicks, impressions),
          cpc: calcCPC(spend, clicks),
          cpa: calcCPA(spend, conversions),
          roas: calcROAS(conversion_value, spend),
        };
      });

      return { creatives, total: creatives.length, currency: adAccount.currency };
    } finally {
      client.release();
    }
  }

  /**
   * 7. Audience Demographics Breakdown (Age, Gender, Age+Gender)
   */
  static async getAudienceBreakdown(
    organizationId: string,
    filter: MetaAnalyticsFilter = {}
  ) {
    const client = await pool.connect();
    try {
      const adAccount = await this.getAdAccount(organizationId, filter.accountId);
      if (!adAccount) {
        return {
          age: [],
          gender: [],
          age_gender: [],
          currency: 'INR',
        };
      }

      const startDate = filter.startDate || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const endDate = filter.endDate || new Date().toISOString().split('T')[0];

      const res = await client.query(
        `SELECT 
          breakdown_type,
          breakdown_value,
          breakdown_secondary_value,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(reach), 0) as reach,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(conversion_value), 0) as conversion_value
         FROM marketing_breakdown_insights
         WHERE organization_id = $1 
           AND ad_account_id = $2
           AND breakdown_type IN ('age', 'gender', 'age_gender')
           AND date >= $3 AND date <= $4
         GROUP BY breakdown_type, breakdown_value, breakdown_secondary_value
         ORDER BY spend DESC;`,
        [organizationId, adAccount.id, startDate, endDate]
      );

      const age: MetaBreakdownMetricRow[] = [];
      const gender: MetaBreakdownMetricRow[] = [];
      const age_gender: MetaBreakdownMetricRow[] = [];

      let totalAudienceSpend = 0;

      for (const row of res.rows) {
        const spend = Number(row.spend);
        const impressions = Number(row.impressions);
        const reach = Number(row.reach);
        const clicks = Number(row.clicks);
        const conversions = Number(row.conversions);
        const conversion_value = Number(row.conversion_value);

        totalAudienceSpend += spend;

        const formattedRow: MetaBreakdownMetricRow = {
          key: `${row.breakdown_value}_${row.breakdown_secondary_value || ''}`,
          label: row.breakdown_value,
          secondaryLabel: row.breakdown_secondary_value,
          spend,
          impressions,
          reach,
          clicks,
          ctr: calcCTR(clicks, impressions),
          cpc: calcCPC(spend, clicks),
          conversions,
          cpa: calcCPA(spend, conversions),
          conversion_value,
          roas: calcROAS(conversion_value, spend),
        };

        if (row.breakdown_type === 'age') age.push(formattedRow);
        else if (row.breakdown_type === 'gender') gender.push(formattedRow);
        else if (row.breakdown_type === 'age_gender') age_gender.push(formattedRow);
      }

      // Add share of spend
      if (totalAudienceSpend > 0) {
        age.forEach((r) => (r.shareOfSpendPercent = (r.spend / totalAudienceSpend) * 100));
        gender.forEach((r) => (r.shareOfSpendPercent = (r.spend / totalAudienceSpend) * 100));
      }

      return {
        age,
        gender,
        age_gender,
        currency: adAccount.currency,
      };
    } finally {
      client.release();
    }
  }

  /**
   * 8. Placement & Platform Breakdown (Feed, Stories, Reels, Audience Network)
   */
  static async getPlacementBreakdown(
    organizationId: string,
    filter: MetaAnalyticsFilter = {}
  ) {
    const client = await pool.connect();
    try {
      const adAccount = await this.getAdAccount(organizationId, filter.accountId);
      if (!adAccount) return { placements: [], platforms: [], currency: 'INR' };

      const startDate = filter.startDate || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const endDate = filter.endDate || new Date().toISOString().split('T')[0];

      const res = await client.query(
        `SELECT 
          breakdown_type,
          breakdown_value,
          breakdown_secondary_value,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(reach), 0) as reach,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(conversion_value), 0) as conversion_value
         FROM marketing_breakdown_insights
         WHERE organization_id = $1 
           AND ad_account_id = $2
           AND breakdown_type IN ('placement', 'publisher_platform')
           AND date >= $3 AND date <= $4
         GROUP BY breakdown_type, breakdown_value, breakdown_secondary_value
         ORDER BY spend DESC;`,
        [organizationId, adAccount.id, startDate, endDate]
      );

      const placements: MetaBreakdownMetricRow[] = [];
      const platforms: MetaBreakdownMetricRow[] = [];

      for (const row of res.rows) {
        const spend = Number(row.spend);
        const impressions = Number(row.impressions);
        const reach = Number(row.reach);
        const clicks = Number(row.clicks);
        const conversions = Number(row.conversions);
        const conversion_value = Number(row.conversion_value);

        const item: MetaBreakdownMetricRow = {
          key: row.breakdown_value,
          label: row.breakdown_value,
          secondaryLabel: row.breakdown_secondary_value,
          spend,
          impressions,
          reach,
          clicks,
          ctr: calcCTR(clicks, impressions),
          cpc: calcCPC(spend, clicks),
          conversions,
          cpa: calcCPA(spend, conversions),
          conversion_value,
          roas: calcROAS(conversion_value, spend),
        };

        if (row.breakdown_type === 'placement') placements.push(item);
        else platforms.push(item);
      }

      return { placements, platforms, currency: adAccount.currency };
    } finally {
      client.release();
    }
  }

  /**
   * 9. Device Breakdown (Mobile, Desktop, Tablet)
   */
  static async getDeviceBreakdown(
    organizationId: string,
    filter: MetaAnalyticsFilter = {}
  ) {
    const client = await pool.connect();
    try {
      const adAccount = await this.getAdAccount(organizationId, filter.accountId);
      if (!adAccount) return { devices: [], isAvailable: false, currency: 'INR' };

      const startDate = filter.startDate || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const endDate = filter.endDate || new Date().toISOString().split('T')[0];

      const res = await client.query(
        `SELECT 
          breakdown_value,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(reach), 0) as reach,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(conversion_value), 0) as conversion_value
         FROM marketing_breakdown_insights
         WHERE organization_id = $1 
           AND ad_account_id = $2
           AND breakdown_type IN ('device', 'device_platform')
           AND date >= $3 AND date <= $4
         GROUP BY breakdown_value
         ORDER BY spend DESC;`,
        [organizationId, adAccount.id, startDate, endDate]
      );

      const devices: MetaBreakdownMetricRow[] = res.rows.map((row) => {
        const spend = Number(row.spend);
        const impressions = Number(row.impressions);
        const reach = Number(row.reach);
        const clicks = Number(row.clicks);
        const conversions = Number(row.conversions);
        const conversion_value = Number(row.conversion_value);

        return {
          key: row.breakdown_value,
          label: row.breakdown_value,
          spend,
          impressions,
          reach,
          clicks,
          ctr: calcCTR(clicks, impressions),
          cpc: calcCPC(spend, clicks),
          conversions,
          cpa: calcCPA(spend, conversions),
          conversion_value,
          roas: calcROAS(conversion_value, spend),
        };
      });

      return {
        devices,
        isAvailable: devices.length > 0,
        currency: adAccount.currency,
      };
    } finally {
      client.release();
    }
  }

  /**
   * 10. Geography Breakdown (Country, Region)
   */
  static async getGeographyBreakdown(
    organizationId: string,
    filter: MetaAnalyticsFilter = {}
  ) {
    const client = await pool.connect();
    try {
      const adAccount = await this.getAdAccount(organizationId, filter.accountId);
      if (!adAccount) return { countries: [], regions: [], isAvailable: false, currency: 'INR' };

      const startDate = filter.startDate || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const endDate = filter.endDate || new Date().toISOString().split('T')[0];

      const res = await client.query(
        `SELECT 
          breakdown_type,
          breakdown_value,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(reach), 0) as reach,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(conversion_value), 0) as conversion_value
         FROM marketing_breakdown_insights
         WHERE organization_id = $1 
           AND ad_account_id = $2
           AND breakdown_type IN ('country', 'region')
           AND date >= $3 AND date <= $4
         GROUP BY breakdown_type, breakdown_value
         ORDER BY spend DESC;`,
        [organizationId, adAccount.id, startDate, endDate]
      );

      const countries: MetaBreakdownMetricRow[] = [];
      const regions: MetaBreakdownMetricRow[] = [];

      for (const row of res.rows) {
        const spend = Number(row.spend);
        const impressions = Number(row.impressions);
        const reach = Number(row.reach);
        const clicks = Number(row.clicks);
        const conversions = Number(row.conversions);
        const conversion_value = Number(row.conversion_value);

        const item: MetaBreakdownMetricRow = {
          key: row.breakdown_value,
          label: row.breakdown_value,
          spend,
          impressions,
          reach,
          clicks,
          ctr: calcCTR(clicks, impressions),
          cpc: calcCPC(spend, clicks),
          conversions,
          cpa: calcCPA(spend, conversions),
          conversion_value,
          roas: calcROAS(conversion_value, spend),
        };

        if (row.breakdown_type === 'country') countries.push(item);
        else regions.push(item);
      }

      return {
        countries,
        regions,
        isAvailable: countries.length > 0 || regions.length > 0,
        currency: adAccount.currency,
      };
    } finally {
      client.release();
    }
  }

  /**
   * 11. Configurable Aggregated Trends (Daily, Weekly, Monthly)
   */
  static async getTrends(
    organizationId: string,
    filter: MetaAnalyticsFilter = {},
    interval: 'daily' | 'weekly' | 'monthly' = 'daily'
  ) {
    const client = await pool.connect();
    try {
      const adAccount = await this.getAdAccount(organizationId, filter.accountId);
      if (!adAccount) return { trends: [], interval, currency: 'INR' };

      const startDate = filter.startDate || new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
      const endDate = filter.endDate || new Date().toISOString().split('T')[0];

      let dateTrunc = `date::text`;
      if (interval === 'weekly') {
        dateTrunc = `TO_CHAR(DATE_TRUNC('week', date), 'YYYY-MM-DD')`;
      } else if (interval === 'monthly') {
        dateTrunc = `TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM')`;
      }

      const res = await client.query(
        `SELECT 
          ${dateTrunc} as period_key,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(MAX(reach), SUM(reach), 0) as reach,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(conversion_value), 0) as conversion_value
         FROM marketing_daily_insights
         WHERE organization_id = $1 
           AND ad_account_id = $2 
           AND level = 'account'
           AND date >= $3 AND date <= $4
         GROUP BY period_key
         ORDER BY period_key ASC;`,
        [organizationId, adAccount.id, startDate, endDate]
      );

      const trends: MetaTrendPoint[] = res.rows.map((r) => {
        const sp = Number(r.spend);
        const imp = Number(r.impressions);
        const clk = Number(r.clicks);
        const conv = Number(r.conversions);
        const cval = Number(r.conversion_value);

        return {
          date: r.period_key,
          spend: sp,
          impressions: imp,
          reach: Number(r.reach),
          clicks: clk,
          ctr: calcCTR(clk, imp),
          cpc: calcCPC(sp, clk),
          cpm: calcCPM(sp, imp),
          conversions: conv,
          cpa: calcCPA(sp, conv),
          conversion_value: cval,
          roas: calcROAS(cval, sp),
        };
      });

      return { trends, interval, currency: adAccount.currency };
    } finally {
      client.release();
    }
  }
}
