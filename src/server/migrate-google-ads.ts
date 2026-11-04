// src/server/migrate-google-ads.ts
// Phase 28 & 29: Google Ads Integration Schema Migration & Seed Foundation

import { pool } from './db.ts';
import type { IntegrationProvider } from '../types/integrations.ts';

export const GOOGLE_ADS_PROVIDER: Omit<IntegrationProvider, 'id' | 'created_at' | 'updated_at'> = {
  provider_key: 'google_ads',
  name: 'Google Ads (Search, Shopping, PMax & YouTube)',
  description: 'Enterprise Google Ads API adapter for synchronizing customer accounts, campaigns, ad groups, keywords, search terms, locations, devices, conversion actions, and daily metrics.',
  category: 'marketing',
  icon_name: 'Search',
  documentation_url: 'https://developers.google.com/google-ads/api/docs/first-call/overview',
  status: 'active',
  implementation_status: 'implemented',
  capabilities: {
    read: true,
    write: false,
    webhooks: true,
    sync: true,
    oauth: true,
    test_connection: true,
    ad_accounts: true,
    campaigns: true,
    ad_sets: true,
    ads: true,
    insights: true,
    historical_sync: true,
    incremental_sync: true,
    rate_limit_rps: 10,
    rate_limit_rpm: 600,
  },
  configuration_schema: {
    instructions: 'Connect using Google OAuth 2.0 or provide your Developer Token, Client ID, Client Secret, and Refresh Token with adwords scope.',
    fields: [
      {
        key: 'customer_id',
        label: 'Google Ads Customer ID (CID)',
        type: 'text',
        required: true,
        placeholder: '123-456-7890',
        helpText: 'The 10-digit Google Ads Customer ID (with or without dashes).',
      },
      {
        key: 'developer_token',
        label: 'Google Ads Developer Token',
        type: 'secret',
        required: true,
        placeholder: '••••••••••••••••••••••••••••',
        secret: true,
      },
      {
        key: 'client_id',
        label: 'OAuth Client ID',
        type: 'text',
        required: true,
        placeholder: 'xxxxxx.apps.googleusercontent.com',
      },
      {
        key: 'client_secret',
        label: 'OAuth Client Secret',
        type: 'secret',
        required: true,
        secret: true,
      },
      {
        key: 'refresh_token',
        label: 'OAuth Refresh Token',
        type: 'secret',
        required: true,
        secret: true,
      },
      {
        key: 'login_customer_id',
        label: 'Manager Account ID (MCC, Optional)',
        type: 'text',
        placeholder: '987-654-3210',
        helpText: 'Required if accessing customer account through a Google Ads Manager (MCC) hierarchy.',
      },
      {
        key: 'sync_frequency_minutes',
        label: 'Auto-Sync Frequency (Minutes)',
        type: 'select',
        defaultValue: 60,
        options: [
          { label: 'Every 15 minutes', value: '15' },
          { label: 'Every 30 minutes', value: '30' },
          { label: 'Every 1 hour (Recommended)', value: '60' },
          { label: 'Every 6 hours', value: '360' },
          { label: 'Once daily', value: '1440' },
        ],
      },
      {
        key: 'sync_window_days',
        label: 'Rolling Re-Sync Window (Days)',
        type: 'select',
        defaultValue: 7,
        options: [
          { label: 'Last 3 Days', value: '3' },
          { label: 'Last 7 Days (Captures Conversion Attribution)', value: '7' },
          { label: 'Last 14 Days', value: '14' },
          { label: 'Last 30 Days', value: '30' },
        ],
      },
    ],
  },
};

export async function runGoogleAdsMigration(): Promise<void> {
  console.log('[Phase 28/29 Migration] Initializing Google Ads & Analytics Database Schema...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    // 1. Register or update Google Ads Provider in integration_providers
    const provId = 'prov-google-ads';
    await client.query(
      `INSERT INTO integration_providers (
        id, provider_key, name, description, category, icon_name,
        documentation_url, status, implementation_status, capabilities,
        configuration_schema, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (provider_key) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        icon_name = EXCLUDED.icon_name,
        documentation_url = EXCLUDED.documentation_url,
        status = EXCLUDED.status,
        implementation_status = EXCLUDED.implementation_status,
        capabilities = EXCLUDED.capabilities,
        configuration_schema = EXCLUDED.configuration_schema,
        updated_at = NOW();`,
      [
        provId,
        GOOGLE_ADS_PROVIDER.provider_key,
        GOOGLE_ADS_PROVIDER.name,
        GOOGLE_ADS_PROVIDER.description,
        GOOGLE_ADS_PROVIDER.category,
        GOOGLE_ADS_PROVIDER.icon_name,
        GOOGLE_ADS_PROVIDER.documentation_url,
        GOOGLE_ADS_PROVIDER.status,
        GOOGLE_ADS_PROVIDER.implementation_status,
        JSON.stringify(GOOGLE_ADS_PROVIDER.capabilities),
        JSON.stringify(GOOGLE_ADS_PROVIDER.configuration_schema),
      ]
    );

    // 2. Table: google_ads_accounts
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_ads_accounts (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        customer_id VARCHAR(64) NOT NULL,
        descriptive_name VARCHAR(255) NOT NULL,
        currency_code VARCHAR(16) DEFAULT 'INR' NOT NULL,
        time_zone VARCHAR(64) DEFAULT 'Asia/Kolkata' NOT NULL,
        status VARCHAR(64) DEFAULT 'ENABLED' NOT NULL,
        can_manage_clients BOOLEAN DEFAULT false,
        is_manager_account BOOLEAN DEFAULT false,
        is_primary BOOLEAN DEFAULT true,
        last_synced_at TIMESTAMPTZ,
        raw_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_gads_org_customer UNIQUE (organization_id, customer_id)
      );
    `);

    // 3. Table: google_ads_campaigns
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_ads_campaigns (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        account_id VARCHAR(64) NOT NULL REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
        external_campaign_id VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(64) DEFAULT 'ENABLED' NOT NULL,
        advertising_channel_type VARCHAR(64) DEFAULT 'SEARCH' NOT NULL,
        bidding_strategy_type VARCHAR(64) DEFAULT 'MAXIMIZE_CONVERSIONS',
        daily_budget NUMERIC(16, 2) DEFAULT 0,
        currency VARCHAR(16) DEFAULT 'INR' NOT NULL,
        start_date DATE,
        end_date DATE,
        target_cpa NUMERIC(16, 2),
        target_roas NUMERIC(8, 2),
        last_synced_at TIMESTAMPTZ,
        raw_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_gads_org_campaign UNIQUE (organization_id, external_campaign_id)
      );
    `);

    // 4. Table: google_ads_ad_groups
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_ads_ad_groups (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        account_id VARCHAR(64) NOT NULL REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
        campaign_id VARCHAR(64) NOT NULL REFERENCES google_ads_campaigns(id) ON DELETE CASCADE,
        external_adgroup_id VARCHAR(128) NOT NULL,
        external_campaign_id VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(64) DEFAULT 'ENABLED' NOT NULL,
        type VARCHAR(64) DEFAULT 'SEARCH_STANDARD',
        cpc_bid NUMERIC(16, 2),
        target_cpa NUMERIC(16, 2),
        currency VARCHAR(16) DEFAULT 'INR' NOT NULL,
        last_synced_at TIMESTAMPTZ,
        raw_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_gads_org_adgroup UNIQUE (organization_id, external_adgroup_id)
      );
    `);

    // 5. Table: google_ads_keywords
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_ads_keywords (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        account_id VARCHAR(64) NOT NULL REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
        campaign_id VARCHAR(64) NOT NULL REFERENCES google_ads_campaigns(id) ON DELETE CASCADE,
        ad_group_id VARCHAR(64) NOT NULL REFERENCES google_ads_ad_groups(id) ON DELETE CASCADE,
        external_criterion_id VARCHAR(128) NOT NULL,
        keyword_text VARCHAR(255) NOT NULL,
        match_type VARCHAR(32) DEFAULT 'BROAD' NOT NULL,
        status VARCHAR(64) DEFAULT 'ENABLED' NOT NULL,
        quality_score INT,
        cpc_bid NUMERIC(16, 2),
        currency VARCHAR(16) DEFAULT 'INR' NOT NULL,
        last_synced_at TIMESTAMPTZ,
        raw_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_gads_org_keyword UNIQUE (organization_id, external_criterion_id)
      );
    `);

    // 6. Table: google_ads_search_terms
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_ads_search_terms (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        account_id VARCHAR(64) NOT NULL REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
        campaign_id VARCHAR(64) NOT NULL REFERENCES google_ads_campaigns(id) ON DELETE CASCADE,
        ad_group_id VARCHAR(64) NOT NULL REFERENCES google_ads_ad_groups(id) ON DELETE CASCADE,
        keyword_id VARCHAR(64) REFERENCES google_ads_keywords(id) ON DELETE SET NULL,
        query_text VARCHAR(255) NOT NULL,
        match_type VARCHAR(32) DEFAULT 'BROAD',
        status VARCHAR(32) DEFAULT 'NONE',
        currency VARCHAR(16) DEFAULT 'INR' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_gads_org_query UNIQUE (organization_id, ad_group_id, query_text)
      );
    `);

    // 7. Table: google_ads_locations
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_ads_locations (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        account_id VARCHAR(64) NOT NULL REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
        campaign_id VARCHAR(64) REFERENCES google_ads_campaigns(id) ON DELETE CASCADE,
        location_name VARCHAR(255) NOT NULL,
        country_code VARCHAR(8) DEFAULT 'IN' NOT NULL,
        region VARCHAR(128),
        city VARCHAR(128),
        location_type VARCHAR(64) DEFAULT 'REGION' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_gads_org_loc UNIQUE (organization_id, account_id, location_name, location_type)
      );
    `);

    // 8. Table: google_ads_devices
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_ads_devices (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        account_id VARCHAR(64) NOT NULL REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
        campaign_id VARCHAR(64) REFERENCES google_ads_campaigns(id) ON DELETE CASCADE,
        device_type VARCHAR(64) NOT NULL,
        device_label VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_gads_org_dev UNIQUE (organization_id, account_id, device_type)
      );
    `);

    // 9. Table: google_ads_conversion_actions
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_ads_conversion_actions (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        account_id VARCHAR(64) NOT NULL REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
        external_conversion_id VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(64) DEFAULT 'PURCHASE' NOT NULL,
        type VARCHAR(64) DEFAULT 'WEBPAGE' NOT NULL,
        status VARCHAR(64) DEFAULT 'ENABLED' NOT NULL,
        primary_for_goal BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_gads_org_convactions UNIQUE (organization_id, external_conversion_id)
      );
    `);

    // 10. Table: google_ads_daily_insights (Telemetry & Performance Timeseries)
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_ads_daily_insights (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        account_id VARCHAR(64) NOT NULL REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
        campaign_id VARCHAR(64) REFERENCES google_ads_campaigns(id) ON DELETE CASCADE,
        ad_group_id VARCHAR(64) REFERENCES google_ads_ad_groups(id) ON DELETE CASCADE,
        keyword_id VARCHAR(64) REFERENCES google_ads_keywords(id) ON DELETE CASCADE,
        search_term_id VARCHAR(64) REFERENCES google_ads_search_terms(id) ON DELETE CASCADE,
        location_id VARCHAR(64) REFERENCES google_ads_locations(id) ON DELETE CASCADE,
        device_type VARCHAR(64),
        conversion_action_id VARCHAR(64) REFERENCES google_ads_conversion_actions(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        level VARCHAR(32) NOT NULL, -- 'account', 'campaign', 'ad_group', 'keyword', 'search_term', 'location', 'device', 'conversion'
        spend NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        impressions BIGINT DEFAULT 0 NOT NULL,
        clicks BIGINT DEFAULT 0 NOT NULL,
        conversions NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        conversion_value NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        currency VARCHAR(16) DEFAULT 'INR' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // Create performance indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gads_insights_org_date ON google_ads_daily_insights(organization_id, date, level);
      CREATE INDEX IF NOT EXISTS idx_gads_insights_camp ON google_ads_daily_insights(campaign_id, date);
      CREATE INDEX IF NOT EXISTS idx_gads_insights_adgroup ON google_ads_daily_insights(ad_group_id, date);
      CREATE INDEX IF NOT EXISTS idx_gads_insights_keyword ON google_ads_daily_insights(keyword_id, date);
      CREATE INDEX IF NOT EXISTS idx_gads_campaigns_org ON google_ads_campaigns(organization_id, account_id, status);
      CREATE INDEX IF NOT EXISTS idx_gads_adgroups_camp ON google_ads_ad_groups(organization_id, campaign_id, status);
      CREATE INDEX IF NOT EXISTS idx_gads_keywords_ag ON google_ads_keywords(organization_id, ad_group_id, status);
    `);

    // 11. Seed Google Ads Connection & Initial Data for org-jyotsvan-core
    const orgId = 'org-jyotsvan-core';
    const connId = 'conn-google-ads-primary';
    const customerId = '648-912-4029';
    const accId = 'gacc-jyotsvan-main';

    // Check if connection exists, insert if not
    await client.query(`
      INSERT INTO integration_connections (
        id, organization_id, provider_id, provider_key, name,
        status, auth_type, external_account_id, external_account_name,
        configuration, health_status, health_message,
        last_sync_at, last_success_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'google_ads', 'Jyotsvan Enterprise Google Ads Primary',
        'connected', 'oauth2', $4, 'Jyotsvan Brand Growth [648-912-4029]',
        '{"customer_id": "648-912-4029", "sync_frequency_minutes": 60, "currency": "INR"}'::jsonb,
        'healthy', 'Synchronized normally via Google Ads REST v17 pipeline.',
        NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        status = 'connected',
        health_status = 'healthy',
        updated_at = NOW();
    `, [connId, orgId, provId, customerId]);

    // Insert Google Ads Account
    await client.query(`
      INSERT INTO google_ads_accounts (
        id, organization_id, connection_id, customer_id, descriptive_name,
        currency_code, time_zone, status, is_primary, last_synced_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'Jyotsvan Wellness Direct - India',
        'INR', 'Asia/Kolkata', 'ENABLED', true, NOW() - INTERVAL '15 minutes', NOW(), NOW()
      ) ON CONFLICT (organization_id, customer_id) DO UPDATE SET
        descriptive_name = EXCLUDED.descriptive_name,
        currency_code = EXCLUDED.currency_code,
        last_synced_at = NOW(),
        updated_at = NOW();
    `, [accId, orgId, connId, customerId]);

    // Insert Campaigns
    const campaigns = [
      {
        id: 'gcamp-brand-search',
        extId: '210948201',
        name: 'Search - Brand & Jyotsvan Core Skincare',
        type: 'SEARCH',
        bidding: 'TARGET_CPA',
        budget: 3500.0,
        status: 'ENABLED',
        target_cpa: 280.0,
        target_roas: 4.8,
      },
      {
        id: 'gcamp-pmax-allproducts',
        extId: '210948202',
        name: 'Performance Max - Ayurvedic Formulations & Bundles',
        type: 'PERFORMANCE_MAX',
        bidding: 'MAXIMIZE_CONVERSION_VALUE',
        budget: 6000.0,
        status: 'ENABLED',
        target_cpa: 420.0,
        target_roas: 3.9,
      },
      {
        id: 'gcamp-shopping-highmargin',
        extId: '210948203',
        name: 'Shopping - High Margin Serums & Oils',
        type: 'SHOPPING',
        bidding: 'TARGET_ROAS',
        budget: 4000.0,
        status: 'ENABLED',
        target_cpa: 350.0,
        target_roas: 4.2,
      },
      {
        id: 'gcamp-nonbrand-search',
        extId: '210948204',
        name: 'Search - Non-Brand Organic Cosmetics & Glow Kits',
        type: 'SEARCH',
        bidding: 'MAXIMIZE_CONVERSIONS',
        budget: 4500.0,
        status: 'ENABLED',
        target_cpa: 520.0,
        target_roas: 2.6,
      },
      {
        id: 'gcamp-youtube-awareness',
        extId: '210948205',
        name: 'YouTube - Brand Story & Clinical Purity Video Ads',
        type: 'VIDEO',
        bidding: 'MAXIMIZE_CONVERSIONS',
        budget: 2000.0,
        status: 'PAUSED',
        target_cpa: 650.0,
        target_roas: 1.8,
      },
    ];

    for (const c of campaigns) {
      await client.query(`
        INSERT INTO google_ads_campaigns (
          id, organization_id, connection_id, account_id, external_campaign_id,
          name, status, advertising_channel_type, bidding_strategy_type,
          daily_budget, currency, target_cpa, target_roas, last_synced_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'INR', $11, $12, NOW() - INTERVAL '15 minutes', NOW(), NOW()
        ) ON CONFLICT (organization_id, external_campaign_id) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          daily_budget = EXCLUDED.daily_budget,
          target_cpa = EXCLUDED.target_cpa,
          target_roas = EXCLUDED.target_roas,
          last_synced_at = NOW(),
          updated_at = NOW();
      `, [
        c.id, orgId, connId, accId, c.extId, c.name, c.status, c.type, c.bidding,
        c.budget, c.target_cpa, c.target_roas
      ]);
    }

    // Insert Ad Groups
    const adGroups = [
      {
        id: 'gag-brand-exact',
        campId: 'gcamp-brand-search',
        extAgId: '31001',
        extCampId: '210948201',
        name: 'Brand Exact - Jyotsvan Skin & Hair',
        status: 'ENABLED',
        cpc_bid: 18.5,
      },
      {
        id: 'gag-brand-phrase',
        campId: 'gcamp-brand-search',
        extAgId: '31002',
        extCampId: '210948201',
        name: 'Brand Phrase & Modifiers',
        status: 'ENABLED',
        cpc_bid: 16.0,
      },
      {
        id: 'gag-pmax-hero',
        campId: 'gcamp-pmax-allproducts',
        extAgId: '32001',
        extCampId: '210948202',
        name: 'Asset Group - Kumkumadi & Saffron Oils',
        status: 'ENABLED',
        cpc_bid: 28.0,
      },
      {
        id: 'gag-shopping-serums',
        campId: 'gcamp-shopping-highmargin',
        extAgId: '33001',
        extCampId: '210948203',
        name: 'Product Group - Vitamin C & Retinol Radiance',
        status: 'ENABLED',
        cpc_bid: 22.0,
      },
      {
        id: 'gag-nonbrand-ayurvedic',
        campId: 'gcamp-nonbrand-search',
        extAgId: '34001',
        extCampId: '210948204',
        name: 'Ayurvedic Anti-Aging & Herbal Face Cream',
        status: 'ENABLED',
        cpc_bid: 34.0,
      },
    ];

    for (const ag of adGroups) {
      await client.query(`
        INSERT INTO google_ads_ad_groups (
          id, organization_id, connection_id, account_id, campaign_id,
          external_adgroup_id, external_campaign_id, name, status, cpc_bid, currency, last_synced_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'INR', NOW() - INTERVAL '15 minutes', NOW(), NOW()
        ) ON CONFLICT (organization_id, external_adgroup_id) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          cpc_bid = EXCLUDED.cpc_bid,
          last_synced_at = NOW(),
          updated_at = NOW();
      `, [
        ag.id, orgId, connId, accId, ag.campId, ag.extAgId, ag.extCampId, ag.name, ag.status, ag.cpc_bid
      ]);
    }

    // Insert Keywords
    const keywords = [
      {
        id: 'gkw-jyotsvan-exact',
        campId: 'gcamp-brand-search',
        agId: 'gag-brand-exact',
        extCritId: '41001',
        text: 'jyotsvan skincare',
        match: 'EXACT',
        qs: 10,
        bid: 18.0,
      },
      {
        id: 'gkw-jyotsvan-kumkumadi',
        campId: 'gcamp-brand-search',
        agId: 'gag-brand-exact',
        extCritId: '41002',
        text: 'jyotsvan kumkumadi oil',
        match: 'EXACT',
        qs: 9,
        bid: 22.0,
      },
      {
        id: 'gkw-buy-jyotsvan-online',
        campId: 'gcamp-brand-search',
        agId: 'gag-brand-phrase',
        extCritId: '41003',
        text: 'buy jyotsvan online',
        match: 'PHRASE',
        qs: 9,
        bid: 16.5,
      },
      {
        id: 'gkw-best-ayurvedic-face-oil',
        campId: 'gcamp-nonbrand-search',
        agId: 'gag-nonbrand-ayurvedic',
        extCritId: '41004',
        text: 'best ayurvedic face oil',
        match: 'PHRASE',
        qs: 8,
        bid: 32.0,
      },
      {
        id: 'gkw-organic-radiance-serum',
        campId: 'gcamp-nonbrand-search',
        agId: 'gag-nonbrand-ayurvedic',
        extCritId: '41005',
        text: 'organic radiance serum india',
        match: 'BROAD',
        qs: 7,
        bid: 29.0,
      },
      {
        id: 'gkw-natural-skin-glow-cream',
        campId: 'gcamp-nonbrand-search',
        agId: 'gag-nonbrand-ayurvedic',
        extCritId: '41006',
        text: 'natural skin glow cream',
        match: 'PHRASE',
        qs: 8,
        bid: 31.0,
      },
    ];

    for (const kw of keywords) {
      await client.query(`
        INSERT INTO google_ads_keywords (
          id, organization_id, connection_id, account_id, campaign_id, ad_group_id,
          external_criterion_id, keyword_text, match_type, status, quality_score, cpc_bid, currency, last_synced_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'ENABLED', $10, $11, 'INR', NOW() - INTERVAL '15 minutes', NOW(), NOW()
        ) ON CONFLICT (organization_id, external_criterion_id) DO UPDATE SET
          keyword_text = EXCLUDED.keyword_text,
          match_type = EXCLUDED.match_type,
          quality_score = EXCLUDED.quality_score,
          cpc_bid = EXCLUDED.cpc_bid,
          last_synced_at = NOW(),
          updated_at = NOW();
      `, [
        kw.id, orgId, connId, accId, kw.campId, kw.agId, kw.extCritId, kw.text, kw.match, kw.qs, kw.bid
      ]);
    }

    // Insert Search Terms
    const searchTerms = [
      {
        id: 'gst-1',
        campId: 'gcamp-brand-search',
        agId: 'gag-brand-exact',
        kwId: 'gkw-jyotsvan-exact',
        query: 'jyotsvan skincare official store',
        match: 'EXACT',
        status: 'ADDED',
      },
      {
        id: 'gst-2',
        campId: 'gcamp-brand-search',
        agId: 'gag-brand-exact',
        kwId: 'gkw-jyotsvan-kumkumadi',
        query: 'jyotsvan pure kumkumadi tailam 30ml',
        match: 'EXACT',
        status: 'ADDED',
      },
      {
        id: 'gst-3',
        campId: 'gcamp-nonbrand-search',
        agId: 'gag-nonbrand-ayurvedic',
        kwId: 'gkw-best-ayurvedic-face-oil',
        query: 'best 100% pure ayurvedic saffron face oil for glowing skin',
        match: 'PHRASE',
        status: 'NONE',
      },
      {
        id: 'gst-4',
        campId: 'gcamp-nonbrand-search',
        agId: 'gag-nonbrand-ayurvedic',
        kwId: 'gkw-organic-radiance-serum',
        query: 'chemical free vitamin c serum ayurvedic',
        match: 'BROAD',
        status: 'NONE',
      },
      {
        id: 'gst-5',
        campId: 'gcamp-nonbrand-search',
        agId: 'gag-nonbrand-ayurvedic',
        kwId: 'gkw-natural-skin-glow-cream',
        query: 'cheap bleaching cream for skin whitening',
        match: 'BROAD',
        status: 'EXCLUDED',
      },
    ];

    for (const st of searchTerms) {
      await client.query(`
        INSERT INTO google_ads_search_terms (
          id, organization_id, account_id, campaign_id, ad_group_id, keyword_id, query_text, match_type, status, currency, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'INR', NOW(), NOW()
        ) ON CONFLICT (organization_id, ad_group_id, query_text) DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = NOW();
      `, [
        st.id, orgId, accId, st.campId, st.agId, st.kwId, st.query, st.match, st.status
      ]);
    }

    // Insert Locations
    const locations = [
      { id: 'gloc-mh', name: 'Maharashtra', country: 'IN', region: 'Maharashtra', type: 'REGION' },
      { id: 'gloc-ka', name: 'Karnataka', country: 'IN', region: 'Karnataka', type: 'REGION' },
      { id: 'gloc-dl', name: 'Delhi NCR', country: 'IN', region: 'Delhi', type: 'REGION' },
      { id: 'gloc-tn', name: 'Tamil Nadu', country: 'IN', region: 'Tamil Nadu', type: 'REGION' },
      { id: 'gloc-ts', name: 'Telangana', country: 'IN', region: 'Telangana', type: 'REGION' },
      { id: 'gloc-wb', name: 'West Bengal', country: 'IN', region: 'West Bengal', type: 'REGION' },
      { id: 'gloc-gj', name: 'Gujarat', country: 'IN', region: 'Gujarat', type: 'REGION' },
    ];

    for (const loc of locations) {
      await client.query(`
        INSERT INTO google_ads_locations (
          id, organization_id, account_id, location_name, country_code, region, location_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (organization_id, account_id, location_name, location_type) DO NOTHING;
      `, [loc.id, orgId, accId, loc.name, loc.country, loc.region, loc.type]);
    }

    // Insert Devices
    const devices = [
      { id: 'gdev-mobile', type: 'MOBILE', label: 'Mobile phones' },
      { id: 'gdev-desktop', type: 'DESKTOP', label: 'Computers & Laptops' },
      { id: 'gdev-tablet', type: 'TABLET', label: 'Tablets' },
      { id: 'gdev-tv', type: 'CONNECTED_TV', label: 'Connected TV' },
    ];

    for (const dev of devices) {
      await client.query(`
        INSERT INTO google_ads_devices (
          id, organization_id, account_id, device_type, device_label, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (organization_id, account_id, device_type) DO NOTHING;
      `, [dev.id, orgId, accId, dev.type, dev.label]);
    }

    // Insert Conversion Actions
    const convActions = [
      { id: 'gconv-purchase', extId: '7011', name: 'Direct Purchase (D2C Store)', category: 'PURCHASE', type: 'WEBPAGE', primary: true },
      { id: 'gconv-addtocart', extId: '7012', name: 'Add to Cart', category: 'ADD_TO_CART', type: 'WEBPAGE', primary: false },
      { id: 'gconv-begincheckout', extId: '7013', name: 'Begin Checkout', category: 'BEGIN_CHECKOUT', type: 'WEBPAGE', primary: false },
      { id: 'gconv-lead', extId: '7014', name: 'Ayurvedic Skin Consultation Request', category: 'LEAD', type: 'WEBPAGE', primary: true },
      { id: 'gconv-phonecall', extId: '7015', name: 'Call from Ads', category: 'CONTACT', type: 'CALL', primary: false },
    ];

    for (const ca of convActions) {
      await client.query(`
        INSERT INTO google_ads_conversion_actions (
          id, organization_id, account_id, external_conversion_id, name, category, type, status, primary_for_goal, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ENABLED', $8, NOW())
        ON CONFLICT (organization_id, external_conversion_id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          primary_for_goal = EXCLUDED.primary_for_goal;
      `, [ca.id, orgId, accId, ca.extId, ca.name, ca.category, ca.type, ca.primary]);
    }

    // Check if daily insights exist, if not generate realistic daily performance records for past 30 days
    const insightsCount = await client.query(
      `SELECT COUNT(*) as count FROM google_ads_daily_insights WHERE organization_id = $1;`,
      [orgId]
    );

    if (Number(insightsCount.rows[0]?.count || 0) < 50) {
      console.log('[Phase 28/29 Migration] Generating 30-day realistic Google Ads daily performance telemetry...');
      const now = new Date();

      for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
        const d = new Date(now);
        d.setDate(d.getDate() - dayOffset);
        const dateStr = d.toISOString().split('T')[0];
        
        // Day factor
        const dayOfWeek = d.getDay();
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.25 : 1.0;
        const trendFactor = 1 + (30 - dayOffset) * 0.015; // Growth over time

        // 1. Account level
        const baseSpend = (14500 + Math.sin(dayOffset) * 1200) * weekendMultiplier * trendFactor;
        const baseImpr = Math.round((48000 + Math.cos(dayOffset) * 4500) * weekendMultiplier * trendFactor);
        const baseClicks = Math.round((2900 + Math.sin(dayOffset * 1.5) * 300) * weekendMultiplier * trendFactor);
        const baseConv = Math.round((78 + Math.cos(dayOffset * 2) * 12) * weekendMultiplier * trendFactor);
        const baseConvVal = Math.round(baseConv * (920 + (dayOffset % 5) * 40));

        await client.query(`
          INSERT INTO google_ads_daily_insights (
            id, organization_id, account_id, date, level, spend, impressions, clicks, conversions, conversion_value, currency, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, 'account', $5, $6, $7, $8, $9, 'INR', NOW(), NOW()
          );
        `, [
          `gins-acc-${dateStr}`, orgId, accId, dateStr,
          baseSpend.toFixed(2), baseImpr, baseClicks, baseConv, baseConvVal.toFixed(2)
        ]);

        // 2. Campaign level breakdown
        const campWeights = [
          { id: 'gcamp-brand-search', spendShare: 0.22, convShare: 0.35, valShare: 0.36 },
          { id: 'gcamp-pmax-allproducts', spendShare: 0.38, convShare: 0.34, valShare: 0.36 },
          { id: 'gcamp-shopping-highmargin', spendShare: 0.25, convShare: 0.22, valShare: 0.21 },
          { id: 'gcamp-nonbrand-search', spendShare: 0.15, convShare: 0.09, valShare: 0.07 },
        ];

        for (const cw of campWeights) {
          const cSpend = baseSpend * cw.spendShare;
          const cImpr = Math.round(baseImpr * (cw.spendShare * 0.95 + 0.02));
          const cClicks = Math.round(baseClicks * cw.spendShare);
          const cConv = Math.round(baseConv * cw.convShare);
          const cVal = baseConvVal * cw.valShare;

          await client.query(`
            INSERT INTO google_ads_daily_insights (
              id, organization_id, account_id, campaign_id, date, level, spend, impressions, clicks, conversions, conversion_value, currency, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, 'campaign', $6, $7, $8, $9, $10, 'INR', NOW(), NOW()
            );
          `, [
            `gins-cmp-${cw.id}-${dateStr}`, orgId, accId, cw.id, dateStr,
            cSpend.toFixed(2), cImpr, cClicks, cConv, cVal.toFixed(2)
          ]);
        }

        // 3. Ad group level
        for (const ag of adGroups) {
          const agSpend = baseSpend * 0.18;
          const agImpr = Math.round(baseImpr * 0.18);
          const agClicks = Math.round(baseClicks * 0.18);
          const agConv = Math.round(baseConv * 0.18);
          const agVal = baseConvVal * 0.18;

          await client.query(`
            INSERT INTO google_ads_daily_insights (
              id, organization_id, account_id, campaign_id, ad_group_id, date, level, spend, impressions, clicks, conversions, conversion_value, currency, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, 'ad_group', $7, $8, $9, $10, $11, 'INR', NOW(), NOW()
            );
          `, [
            `gins-ag-${ag.id}-${dateStr}`, orgId, accId, ag.campId, ag.id, dateStr,
            agSpend.toFixed(2), agImpr, agClicks, agConv, agVal.toFixed(2)
          ]);
        }

        // 4. Keywords level
        for (const kw of keywords) {
          const kwSpend = baseSpend * 0.12;
          const kwImpr = Math.round(baseImpr * 0.12);
          const kwClicks = Math.round(baseClicks * 0.12);
          const kwConv = Math.round(baseConv * 0.12);
          const kwVal = baseConvVal * 0.12;

          await client.query(`
            INSERT INTO google_ads_daily_insights (
              id, organization_id, account_id, campaign_id, ad_group_id, keyword_id, date, level, spend, impressions, clicks, conversions, conversion_value, currency, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, 'keyword', $8, $9, $10, $11, $12, 'INR', NOW(), NOW()
            );
          `, [
            `gins-kw-${kw.id}-${dateStr}`, orgId, accId, kw.campId, kw.agId, kw.id, dateStr,
            kwSpend.toFixed(2), kwImpr, kwClicks, kwConv, kwVal.toFixed(2)
          ]);
        }

        // 5. Devices level
        const devShares = [
          { type: 'MOBILE', share: 0.68 },
          { type: 'DESKTOP', share: 0.26 },
          { type: 'TABLET', share: 0.05 },
          { type: 'CONNECTED_TV', share: 0.01 },
        ];
        for (const ds of devShares) {
          await client.query(`
            INSERT INTO google_ads_daily_insights (
              id, organization_id, account_id, device_type, date, level, spend, impressions, clicks, conversions, conversion_value, currency, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, 'device', $6, $7, $8, $9, $10, 'INR', NOW(), NOW()
            );
          `, [
            `gins-dev-${ds.type}-${dateStr}`, orgId, accId, ds.type, dateStr,
            (baseSpend * ds.share).toFixed(2), Math.round(baseImpr * ds.share), Math.round(baseClicks * ds.share),
            Math.round(baseConv * ds.share), (baseConvVal * ds.share).toFixed(2)
          ]);
        }

        // 6. Locations level
        const locShares = [
          { id: 'gloc-mh', share: 0.28 },
          { id: 'gloc-ka', share: 0.22 },
          { id: 'gloc-dl', share: 0.20 },
          { id: 'gloc-tn', share: 0.12 },
          { id: 'gloc-ts', share: 0.08 },
          { id: 'gloc-gj', share: 0.06 },
          { id: 'gloc-wb', share: 0.04 },
        ];
        for (const ls of locShares) {
          await client.query(`
            INSERT INTO google_ads_daily_insights (
              id, organization_id, account_id, location_id, date, level, spend, impressions, clicks, conversions, conversion_value, currency, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, 'location', $6, $7, $8, $9, $10, 'INR', NOW(), NOW()
            );
          `, [
            `gins-loc-${ls.id}-${dateStr}`, orgId, accId, ls.id, dateStr,
            (baseSpend * ls.share).toFixed(2), Math.round(baseImpr * ls.share), Math.round(baseClicks * ls.share),
            Math.round(baseConv * ls.share), (baseConvVal * ls.share).toFixed(2)
          ]);
        }
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 28/29 Migration] ✓ Google Ads database schema & foundation successfully synchronized.');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Phase 28/29 Migration] ✗ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
