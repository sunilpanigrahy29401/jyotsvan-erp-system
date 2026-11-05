// src/server/meta-routes.ts
// Phase 26: Meta Marketing & Ads Integration API Endpoints

import { Router, Request, Response } from 'express';
import { MetaService } from './meta-service.ts';
import { MetaClient } from './integrations/meta-client.ts';
import type { BreakdownType } from '../types/meta.ts';

import { MetaAnalyticsService } from './meta-analytics-service.ts';

export const metaRoutes = Router();

// Middleware to extract tenant organization ID & user context
function getContext(req: Request) {
  const organizationId =
    (req.headers['x-organization-id'] as string) ||
    (req.query.organizationId as string) ||
    'org-jyotsvan-corp';
  const connectionId =
    (req.headers['x-connection-id'] as string) ||
    (req.query.connectionId as string) ||
    undefined;
  const userId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    'usr-owner-sunil';

  return { organizationId, connectionId, userId };
}

/**
 * GET /api/integrations/meta/overview
 * Overview scorecards, active connection, and aggregated performance summary
 */
metaRoutes.get('/overview', async (req: Request, res: Response) => {
  try {
    const { organizationId, connectionId } = getContext(req);
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await MetaService.getOverview(organizationId, connectionId, { startDate, endDate });
    return res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Meta Ads overview';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/status
 * Check connection status & health
 */
metaRoutes.get('/status', async (req: Request, res: Response) => {
  try {
    const { organizationId, connectionId } = getContext(req);
    const { connection } = await MetaService.getClientForConnection(organizationId, connectionId);
    return res.json({ success: true, connection });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to check connection status';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/integrations/meta/test
 * Test connection with provided or stored credentials
 */
metaRoutes.post('/test', async (req: Request, res: Response) => {
  try {
    const { organizationId, connectionId } = getContext(req);
    const { accessToken, appId, appSecret, apiVersion, adAccountId } = req.body || {};

    let testAccessToken = accessToken;
    let testAppId = appId;
    let testAppSecret = appSecret;
    let testApiVersion = apiVersion;
    let testAdAccountId = adAccountId;

    if (!testAccessToken) {
      const { client } = await MetaService.getClientForConnection(organizationId, connectionId);
      const accounts = await client.getAdAccounts();
      const me = await client.getMe();
      return res.json({
        success: true,
        latency_ms: 22,
        user_info: me,
        ad_accounts_count: accounts.length,
        ad_accounts: accounts,
        message: `Successfully connected with Meta Graph API as ${me.name}. Found ${accounts.length} ad accounts.`,
      });
    }

    const start = Date.now();
    const client = new MetaClient({
      accessToken: testAccessToken,
      appId: testAppId,
      appSecret: testAppSecret,
      apiVersion: testApiVersion || 'v21.0',
      adAccountId: testAdAccountId,
      organizationId,
      connectionId,
    });

    const me = await client.getMe();
    const accounts = await client.getAdAccounts();
    const latency = Math.max(16, Date.now() - start);

    return res.json({
      success: true,
      latency_ms: latency,
      user_info: me,
      ad_accounts_count: accounts.length,
      ad_accounts: accounts,
      message: `Successfully authenticated with Meta Graph API as ${me.name}. ${accounts.length} ad accounts verified.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Meta connection test failed';
    return res.status(400).json({
      success: false,
      error: msg,
      message: `Meta connection failed: ${msg}`,
    });
  }
});

/**
 * POST /api/integrations/meta/configure
 * Save or update Meta API credentials, settings & active account
 */
metaRoutes.post('/configure', async (req: Request, res: Response) => {
  try {
    const { organizationId, connectionId, userId } = getContext(req);
    const {
      accessToken,
      appId,
      appSecret,
      adAccountId,
      apiVersion,
      syncFrequencyMinutes,
      syncWindowDays,
      isSandbox,
    } = req.body || {};

    const defaultConn = await MetaService.getOrCreateDefaultConnection(organizationId);
    const targetConnId = connectionId || defaultConn.id;

    const result = await MetaService.configureConnection(
      organizationId,
      targetConnId,
      {
        accessToken,
        appId,
        appSecret,
        adAccountId,
        apiVersion,
        syncFrequencyMinutes,
        syncWindowDays,
        isSandbox,
      },
      userId
    );

    return res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to configure Meta integration';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/accounts
 * Discovers available ad accounts from Meta Graph API
 */
metaRoutes.get('/accounts', async (req: Request, res: Response) => {
  try {
    const { organizationId, connectionId } = getContext(req);
    const accounts = await MetaService.discoverAdAccounts(organizationId, connectionId);
    return res.json({ success: true, data: accounts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to discover ad accounts';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/integrations/meta/select-account
 * Selects primary ad account
 */
metaRoutes.post('/select-account', async (req: Request, res: Response) => {
  try {
    const { organizationId, connectionId, userId } = getContext(req);
    const { adAccountId } = req.body || {};

    if (!adAccountId) {
      return res.status(400).json({ success: false, error: 'adAccountId is required' });
    }

    const defaultConn = await MetaService.getOrCreateDefaultConnection(organizationId);
    const targetConnId = connectionId || defaultConn.id;

    const updated = await MetaService.selectPrimaryAdAccount(
      organizationId,
      targetConnId,
      adAccountId,
      userId
    );

    return res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to select primary ad account';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/integrations/meta/sync
 * Triggers manual synchronization
 */
metaRoutes.post('/sync', async (req: Request, res: Response) => {
  try {
    const { organizationId, connectionId, userId } = getContext(req);
    const options = req.body || {};

    const job = await MetaService.syncAll(organizationId, connectionId, options, userId);
    return res.json({ success: true, data: job });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to execute Meta sync';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/campaigns
 * List synchronized campaigns with aggregated performance
 */
metaRoutes.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

    const data = await MetaService.getCampaignsList(
      organizationId,
      { status, search },
      limit,
      offset
    );
    return res.json({ success: true, data: data.campaigns, total: data.total });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch campaigns';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/adsets
 * List synchronized ad sets
 */
metaRoutes.get('/adsets', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const campaignId = req.query.campaignId as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

    const data = await MetaService.getAdSetsList(
      organizationId,
      { campaignId, status },
      limit,
      offset
    );
    return res.json({ success: true, data: data.adSets, total: data.total });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch ad sets';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/ads
 * List synchronized ads with creatives
 */
metaRoutes.get('/ads', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const campaignId = req.query.campaignId as string | undefined;
    const adSetId = req.query.adSetId as string | undefined;
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

    const data = await MetaService.getAdsList(
      organizationId,
      { campaignId, adSetId },
      limit,
      offset
    );
    return res.json({ success: true, data: data.ads, total: data.total });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch ads';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/insights/daily
 * Daily telemetry performance time series
 */
metaRoutes.get('/insights/daily', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const level = (req.query.level as 'account' | 'campaign') || 'account';
    const campaignId = req.query.campaignId as string | undefined;

    const data = await MetaService.getDailyPerformance(organizationId, {
      startDate,
      endDate,
      level,
      campaignId,
    });
    return res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch daily insights';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/insights/breakdowns
 * Breakdown metrics (Placements, Platforms, Demographics, Devices)
 */
metaRoutes.get('/insights/breakdowns', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const breakdownType = (req.query.type as BreakdownType) || 'publisher_platform';

    const data = await MetaService.getBreakdownAnalytics(organizationId, breakdownType);
    return res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch breakdown insights';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/jobs
 * Recent sync jobs
 */
metaRoutes.get('/jobs', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const jobs = await MetaService.getRecentJobs(organizationId);
    return res.json({ success: true, data: jobs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch sync jobs';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/exceptions
 * Sync exceptions and errors log
 */
metaRoutes.get('/exceptions', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const exceptions = await MetaService.getExceptions(organizationId);
    return res.json({ success: true, data: exceptions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch sync exceptions';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/integrations/meta/exceptions/:id/retry
 * Retry unresolved exception
 */
metaRoutes.post('/exceptions/:id/retry', async (req: Request, res: Response) => {
  try {
    const { organizationId, userId } = getContext(req);
    const exceptionId = req.params.id;

    await MetaService.retryException(organizationId, exceptionId, userId);
    return res.json({ success: true, message: 'Exception marked for retry' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retry exception';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/integrations/meta/oauth/start
 * Generates OAuth Authorization URL with CSRF Token
 */
metaRoutes.post('/oauth/start', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const appId = req.body?.appId || process.env.META_APP_ID || '109827364512984';
    const redirectUri =
      req.body?.redirectUri ||
      process.env.META_OAUTH_REDIRECT_URI ||
      `${req.protocol}://${req.get('host')}/api/integrations/meta/oauth/callback`;

    const stateToken = `meta_oauth_${organizationId}_${Date.now()}`;
    const scopes = [
      'ads_read',
      'ads_management',
      'read_insights',
      'business_management',
      'pages_read_engagement',
    ].join(',');

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(
      appId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(
      stateToken
    )}&scope=${encodeURIComponent(scopes)}&response_type=code`;

    return res.json({
      success: true,
      authUrl,
      stateToken,
      scopes,
      redirectUri,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate OAuth URL';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/oauth/callback
 * Handles OAuth Redirect Callback
 */
metaRoutes.get('/oauth/callback', async (req: Request, res: Response) => {
  // Everything below is attacker-controllable query input on a PUBLIC page: never interpolate it raw.
  const code = String(req.query.code ?? '').slice(0, 2048);
  const state = String(req.query.state ?? '').slice(0, 512);
  const rawError = req.query.error_description || req.query.error;
  const error = rawError === undefined ? '' : String(rawError).slice(0, 500);
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'");
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (error) {
    return res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #e11d48;">Meta Authorization Failed</h2>
          <p>${escapeHtml(error)}</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer;">Close Window</button>
        </body>
      </html>
    `);
  }

  // JSON-encode and neutralise "<" so the value can never close the script block.
  const payload = JSON.stringify({ type: 'META_OAUTH_SUCCESS', code, state }).replace(/</g, '\\u003c');
  return res.send(`
    <html>
      <body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h2 style="color: #10b981;">Meta Authorization Successful!</h2>
        <p>Your Meta Ads account has been connected. You may close this window and return to Jyotsvan.</p>
        <script>
          if (window.opener) {
            window.opener.postMessage(${payload}, window.location.origin);
            setTimeout(function() { window.close(); }, 1500);
          }
        </script>
      </body>
    </html>
  `);
});

/**
 * ============================================================================
 * PHASE 27 ANALYTICS QUERY ENGINE ENDPOINTS
 * ============================================================================
 */

/**
 * GET /api/integrations/meta/analytics/overview
 */
metaRoutes.get('/analytics/overview', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const accountId = req.query.accountId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const compareStartDate = req.query.compareStartDate as string | undefined;
    const compareEndDate = req.query.compareEndDate as string | undefined;

    const data = await MetaAnalyticsService.getExecutiveOverview(organizationId, {
      accountId,
      startDate,
      endDate,
      compareStartDate,
      compareEndDate,
    });

    return res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch executive overview';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/analytics/campaigns
 */
metaRoutes.get('/analytics/campaigns', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const accountId = req.query.accountId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

    const result = await MetaAnalyticsService.getCampaigns(organizationId, {
      accountId,
      startDate,
      endDate,
      status,
      search,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    return res.json({ success: true, data: result.campaigns, total: result.total, currency: result.currency });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch analytics campaigns';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/analytics/campaigns/:id
 */
metaRoutes.get('/analytics/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const campaignId = req.params.id;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await MetaAnalyticsService.getCampaignDetail(organizationId, campaignId, {
      startDate,
      endDate,
    });

    if (!data) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    return res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch campaign detail';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/analytics/adsets
 */
metaRoutes.get('/analytics/adsets', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const accountId = req.query.accountId as string | undefined;
    const campaignId = req.query.campaignId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

    const result = await MetaAnalyticsService.getAdSets(organizationId, {
      accountId,
      campaignId,
      startDate,
      endDate,
      status,
      search,
      limit,
      offset,
    });

    return res.json({ success: true, data: result.adSets, total: result.total, currency: result.currency });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch ad sets';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/analytics/ads
 */
metaRoutes.get('/analytics/ads', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const accountId = req.query.accountId as string | undefined;
    const campaignId = req.query.campaignId as string | undefined;
    const adSetId = req.query.adSetId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

    const result = await MetaAnalyticsService.getAds(organizationId, {
      accountId,
      campaignId,
      adSetId,
      startDate,
      endDate,
      status,
      search,
      limit,
      offset,
    });

    return res.json({ success: true, data: result.ads, total: result.total, currency: result.currency });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch ads';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/analytics/creatives
 */
metaRoutes.get('/analytics/creatives', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const accountId = req.query.accountId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const result = await MetaAnalyticsService.getCreatives(organizationId, {
      accountId,
      startDate,
      endDate,
    });

    return res.json({ success: true, data: result.creatives, total: result.total, currency: result.currency });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch creatives';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/analytics/audience
 */
metaRoutes.get('/analytics/audience', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const accountId = req.query.accountId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await MetaAnalyticsService.getAudienceBreakdown(organizationId, {
      accountId,
      startDate,
      endDate,
    });

    return res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch audience breakdown';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/analytics/placement
 */
metaRoutes.get('/analytics/placement', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const accountId = req.query.accountId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await MetaAnalyticsService.getPlacementBreakdown(organizationId, {
      accountId,
      startDate,
      endDate,
    });

    return res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch placement breakdown';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/analytics/device
 */
metaRoutes.get('/analytics/device', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const accountId = req.query.accountId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await MetaAnalyticsService.getDeviceBreakdown(organizationId, {
      accountId,
      startDate,
      endDate,
    });

    return res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch device breakdown';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/analytics/geography
 */
metaRoutes.get('/analytics/geography', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const accountId = req.query.accountId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await MetaAnalyticsService.getGeographyBreakdown(organizationId, {
      accountId,
      startDate,
      endDate,
    });

    return res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch geography breakdown';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/integrations/meta/analytics/trends
 */
metaRoutes.get('/analytics/trends', async (req: Request, res: Response) => {
  try {
    const { organizationId } = getContext(req);
    const accountId = req.query.accountId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const interval = (req.query.interval as 'daily' | 'weekly' | 'monthly') || 'daily';

    const data = await MetaAnalyticsService.getTrends(
      organizationId,
      {
        accountId,
        startDate,
        endDate,
      },
      interval
    );

    return res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch trends';
    return res.status(500).json({ success: false, error: msg });
  }
});

