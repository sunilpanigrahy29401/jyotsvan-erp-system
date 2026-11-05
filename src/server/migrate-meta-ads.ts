// src/server/migrate-meta-ads.ts
// Phase 26: Schema Migration & Initial Provider Registration for Meta Ads Integration

import { pool } from './db.ts';
import { encryptCredentials } from './crypto-vault.ts';
import type { IntegrationProvider } from '../types/integrations.ts';

export const META_ADS_PROVIDER: Omit<IntegrationProvider, 'id' | 'created_at' | 'updated_at'> = {
  provider_key: 'meta_ads',
  name: 'Meta Ads (Facebook & Instagram)',
  description: 'Enterprise Meta Graph Marketing API adapter for synchronizing ad accounts, campaigns, ad sets, ads, creatives, and daily performance insights.',
  category: 'marketing',
  icon_name: 'Megaphone',
  documentation_url: 'https://developers.facebook.com/docs/marketing-apis',
  status: 'active',
  implementation_status: 'implemented',
  capabilities: {
    read: true,
    write: false,
    webhooks: true,
    sync: true,
    oauth: true,
    test_connection: true,
    business_accounts: true,
    ad_accounts: true,
    campaigns: true,
    ad_sets: true,
    ads: true,
    creatives: true,
    insights: true,
    historical_sync: true,
    incremental_sync: true,
    rate_limit_rps: 5,
    rate_limit_rpm: 300,
  },
  configuration_schema: {
    instructions: 'Connect using Meta OAuth or provide a Meta System User / Long-Lived Access Token with ads_read, read_insights, and business_management permissions.',
    fields: [
      {
        key: 'access_token',
        label: 'Meta Access Token (System User / User Token)',
        type: 'secret',
        required: true,
        placeholder: 'EAAB••••••••••••••••••••••••••••',
        helpText: 'Permanent System User token or Long-Lived User Access Token with ads_read and read_insights permissions.',
        secret: true,
      },
      {
        key: 'ad_account_id',
        label: 'Primary Ad Account ID',
        type: 'text',
        required: true,
        placeholder: 'act_123456789012345',
        helpText: 'The Meta Ad Account ID (including or excluding the "act_" prefix).',
      },
      {
        key: 'app_id',
        label: 'Meta Developer App ID',
        type: 'text',
        placeholder: '1234567890123456',
      },
      {
        key: 'app_secret',
        label: 'Meta Developer App Secret',
        type: 'secret',
        placeholder: '••••••••••••••••••••••••••••••••',
        secret: true,
      },
      {
        key: 'api_version',
        label: 'Meta Graph API Version',
        type: 'select',
        defaultValue: 'v21.0',
        options: [
          { label: 'v21.0 (Latest Stable)', value: 'v21.0' },
          { label: 'v20.0', value: 'v20.0' },
          { label: 'v19.0', value: 'v19.0' },
        ],
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
          { label: 'Last 7 Days (Captures Delayed Attribution)', value: '7' },
          { label: 'Last 14 Days', value: '14' },
          { label: 'Last 30 Days', value: '30' },
        ],
      },
      {
        key: 'is_sandbox',
        label: 'Sandbox / Test Mode',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
};

export async function runMetaAdsMigration(): Promise<void> {
  console.log('[Phase 26 Migration] Initializing Meta Ads & Marketing Intelligence Database Schema...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    // 1. Register or update Meta Ads Provider in integration_providers
    const provId = 'prov-meta-ads';
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
        META_ADS_PROVIDER.provider_key,
        META_ADS_PROVIDER.name,
        META_ADS_PROVIDER.description,
        META_ADS_PROVIDER.category,
        META_ADS_PROVIDER.icon_name,
        META_ADS_PROVIDER.documentation_url,
        META_ADS_PROVIDER.status,
        META_ADS_PROVIDER.implementation_status,
        JSON.stringify(META_ADS_PROVIDER.capabilities),
        JSON.stringify(META_ADS_PROVIDER.configuration_schema),
      ]
    );

    // 2. Table: marketing_ad_accounts
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_ad_accounts (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        external_ad_account_id VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        account_status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
        currency VARCHAR(16) DEFAULT 'INR' NOT NULL,
        timezone VARCHAR(64) DEFAULT 'Asia/Kolkata' NOT NULL,
        business_id VARCHAR(128),
        business_name VARCHAR(255),
        amount_spent NUMERIC(16, 2) DEFAULT 0,
        balance NUMERIC(16, 2) DEFAULT 0,
        min_daily_budget NUMERIC(16, 2),
        capabilities JSONB DEFAULT '[]'::jsonb,
        is_primary BOOLEAN DEFAULT true,
        last_synced_at TIMESTAMPTZ,
        raw_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_org_account UNIQUE (organization_id, external_ad_account_id)
      );
    `);

    // 3. Table: marketing_campaigns
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        ad_account_id VARCHAR(64) NOT NULL REFERENCES marketing_ad_accounts(id) ON DELETE CASCADE,
        external_campaign_id VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        objective VARCHAR(128) DEFAULT 'OUTCOME_SALES' NOT NULL,
        status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
        effective_status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
        buying_type VARCHAR(64) DEFAULT 'AUCTION',
        daily_budget NUMERIC(16, 2),
        lifetime_budget NUMERIC(16, 2),
        budget_remaining NUMERIC(16, 2),
        start_time TIMESTAMPTZ,
        stop_time TIMESTAMPTZ,
        created_time TIMESTAMPTZ,
        updated_time TIMESTAMPTZ,
        last_synced_at TIMESTAMPTZ,
        raw_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_org_campaign UNIQUE (organization_id, external_campaign_id)
      );
    `);

    // 4. Table: marketing_ad_sets
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_ad_sets (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        ad_account_id VARCHAR(64) NOT NULL REFERENCES marketing_ad_accounts(id) ON DELETE CASCADE,
        campaign_id VARCHAR(64) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
        external_adset_id VARCHAR(128) NOT NULL,
        external_campaign_id VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
        effective_status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
        daily_budget NUMERIC(16, 2),
        lifetime_budget NUMERIC(16, 2),
        bid_strategy VARCHAR(128),
        optimization_goal VARCHAR(128),
        billing_event VARCHAR(128),
        targeting_summary TEXT,
        start_time TIMESTAMPTZ,
        end_time TIMESTAMPTZ,
        created_time TIMESTAMPTZ,
        updated_time TIMESTAMPTZ,
        last_synced_at TIMESTAMPTZ,
        raw_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_org_adset UNIQUE (organization_id, external_adset_id)
      );
    `);

    // 5. Table: marketing_creatives
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_creatives (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        ad_account_id VARCHAR(64) NOT NULL REFERENCES marketing_ad_accounts(id) ON DELETE CASCADE,
        external_creative_id VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        title TEXT,
        body TEXT,
        call_to_action_type VARCHAR(64),
        image_url TEXT,
        thumbnail_url TEXT,
        video_id VARCHAR(128),
        object_type VARCHAR(64),
        object_story_id VARCHAR(128),
        url_tags TEXT,
        raw_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_org_creative UNIQUE (organization_id, external_creative_id)
      );
    `);

    // 6. Table: marketing_ads
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_ads (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        ad_account_id VARCHAR(64) NOT NULL REFERENCES marketing_ad_accounts(id) ON DELETE CASCADE,
        campaign_id VARCHAR(64) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
        adset_id VARCHAR(64) REFERENCES marketing_ad_sets(id) ON DELETE CASCADE,
        external_ad_id VARCHAR(128) NOT NULL,
        external_adset_id VARCHAR(128) NOT NULL,
        external_campaign_id VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
        effective_status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
        creative_id VARCHAR(64) REFERENCES marketing_creatives(id) ON DELETE SET NULL,
        preview_url TEXT,
        created_time TIMESTAMPTZ,
        updated_time TIMESTAMPTZ,
        last_synced_at TIMESTAMPTZ,
        raw_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_org_ad UNIQUE (organization_id, external_ad_id)
      );
    `);

    // 7. Table: marketing_daily_insights (Idempotent daily performance table)
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_daily_insights (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        ad_account_id VARCHAR(64) NOT NULL REFERENCES marketing_ad_accounts(id) ON DELETE CASCADE,
        level VARCHAR(32) NOT NULL, -- 'account', 'campaign', 'adset', 'ad'
        date DATE NOT NULL,
        external_account_id VARCHAR(128),
        external_campaign_id VARCHAR(128) DEFAULT '',
        external_adset_id VARCHAR(128) DEFAULT '',
        external_ad_id VARCHAR(128) DEFAULT '',
        campaign_name VARCHAR(255),
        adset_name VARCHAR(255),
        ad_name VARCHAR(255),
        spend NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        currency VARCHAR(16) DEFAULT 'INR' NOT NULL,
        impressions BIGINT DEFAULT 0 NOT NULL,
        reach BIGINT DEFAULT 0 NOT NULL,
        frequency NUMERIC(10, 4) DEFAULT 1.0 NOT NULL,
        clicks BIGINT DEFAULT 0 NOT NULL,
        unique_clicks BIGINT DEFAULT 0,
        link_clicks BIGINT DEFAULT 0 NOT NULL,
        cpc NUMERIC(16, 4) DEFAULT 0 NOT NULL,
        cpm NUMERIC(16, 4) DEFAULT 0 NOT NULL,
        ctr NUMERIC(10, 4) DEFAULT 0 NOT NULL,
        conversions NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        conversion_value NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        cost_per_conversion NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        roas NUMERIC(10, 4) DEFAULT 0 NOT NULL,
        actions JSONB DEFAULT '[]'::jsonb,
        action_values JSONB DEFAULT '[]'::jsonb,
        raw_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_mkt_daily_insight UNIQUE (organization_id, ad_account_id, level, date, external_campaign_id, external_adset_id, external_ad_id)
      );
    `);

    // 8. Table: marketing_breakdown_insights
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_breakdown_insights (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        ad_account_id VARCHAR(64) NOT NULL REFERENCES marketing_ad_accounts(id) ON DELETE CASCADE,
        level VARCHAR(32) DEFAULT 'account' NOT NULL,
        date DATE NOT NULL,
        breakdown_type VARCHAR(64) NOT NULL, -- 'age', 'gender', 'age_gender', 'placement', 'device', 'publisher_platform'
        breakdown_value VARCHAR(128) NOT NULL,
        breakdown_secondary_value VARCHAR(128),
        spend NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        impressions BIGINT DEFAULT 0 NOT NULL,
        reach BIGINT DEFAULT 0 NOT NULL,
        clicks BIGINT DEFAULT 0 NOT NULL,
        conversions NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        conversion_value NUMERIC(16, 2) DEFAULT 0 NOT NULL,
        cpc NUMERIC(16, 4) DEFAULT 0,
        ctr NUMERIC(10, 4) DEFAULT 0,
        roas NUMERIC(10, 4) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);
    // A table-level UNIQUE constraint cannot contain an expression; a unique expression index can
    // (and still satisfies the ON CONFLICT inference used by meta-service).
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_mkt_breakdown_insight ON marketing_breakdown_insights
        (organization_id, ad_account_id, level, date, breakdown_type, breakdown_value, COALESCE(breakdown_secondary_value, ''));
    `);

    // 9. Table: marketing_sync_exceptions
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_sync_exceptions (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        entity_type VARCHAR(64) NOT NULL,
        external_id VARCHAR(128),
        error_code VARCHAR(128) NOT NULL,
        error_message TEXT NOT NULL,
        severity VARCHAR(32) DEFAULT 'error' NOT NULL,
        retry_count INTEGER DEFAULT 0 NOT NULL,
        last_attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        resolved BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 10. Performance Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mkt_acc_org ON marketing_ad_accounts(organization_id, connection_id);
      CREATE INDEX IF NOT EXISTS idx_mkt_cmp_acc ON marketing_campaigns(ad_account_id, status);
      CREATE INDEX IF NOT EXISTS idx_mkt_ads_cmp ON marketing_ad_sets(campaign_id, status);
      CREATE INDEX IF NOT EXISTS idx_mkt_ad_set ON marketing_ads(adset_id, status);
      CREATE INDEX IF NOT EXISTS idx_mkt_daily_org_date ON marketing_daily_insights(organization_id, date, level);
      CREATE INDEX IF NOT EXISTS idx_mkt_daily_acc_date ON marketing_daily_insights(ad_account_id, date);
      CREATE INDEX IF NOT EXISTS idx_mkt_daily_cmp_date ON marketing_daily_insights(external_campaign_id, date);
      CREATE INDEX IF NOT EXISTS idx_mkt_brk_org_date ON marketing_breakdown_insights(organization_id, breakdown_type, date);
    `);

    // 11. Initial Tenant Seed / Connection Setup for org-jyotsvan-core
    const orgId = 'org-jyotsvan-core';
    const connId = 'conn-meta-jyotsvan';
    const encrypted = encryptCredentials({
      access_token: 'EAAB_jyotsvan_meta_marketing_token_placeholder',
      app_id: '109827364512984',
      app_secret: 'sec_meta_secret_placeholder',
    });

    const connRes = await client.query(
      `INSERT INTO integration_connections (
        id, organization_id, provider_id, provider_key, name, status,
        auth_type, external_account_id, external_account_name, configuration,
        health_status, health_message, last_sync_at, last_success_at, created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), $13, NOW(), NOW())
      ON CONFLICT (organization_id, provider_key, name) DO UPDATE SET
        provider_id = EXCLUDED.provider_id,
        updated_at = NOW()
      RETURNING id;`,
      [
        connId,
        orgId,
        provId,
        'meta_ads',
        'Meta Ads Marketing Suite',
        'connected',
        'oauth',
        'act_894120938475612',
        'Jyotsvan Organics D2C Performance Ads',
        JSON.stringify({
          app_id: '109827364512984',
          ad_account_id: 'act_894120938475612',
          business_id: 'biz_483920194857261',
          business_name: 'Jyotsvan Enterprises Business Group',
          api_version: 'v21.0',
          sync_frequency_minutes: 60,
          sync_window_days: 7,
          is_sandbox: true,
          selected_ad_accounts: ['act_894120938475612', 'act_561209384756123'],
        }),
        'healthy',
        'Meta Graph API v21.0 active. Marketing data sync operational.',
        'usr-owner-sunil',
      ]
    );

    const actualConnId = connRes.rows[0]?.id || connId;

    await client.query(
      `INSERT INTO integration_credentials (
        id, organization_id, connection_id, encrypted_credentials, credential_version, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
      ON CONFLICT (connection_id) DO UPDATE SET
        encrypted_credentials = EXCLUDED.encrypted_credentials,
        updated_at = NOW();`,
      [`cred-${actualConnId}`, orgId, actualConnId, encrypted]
    );

    // 12. Seed Primary Ad Account for Jyotsvan
    const adAccId = 'mktacc-jyotsvan-primary';
    await client.query(
      `INSERT INTO marketing_ad_accounts (
        id, organization_id, connection_id, external_ad_account_id, name, account_status,
        currency, timezone, business_id, business_name, amount_spent, balance,
        min_daily_budget, capabilities, is_primary, last_synced_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW(), NOW())
      ON CONFLICT (organization_id, external_ad_account_id) DO UPDATE SET
        name = EXCLUDED.name,
        currency = EXCLUDED.currency,
        amount_spent = EXCLUDED.amount_spent,
        last_synced_at = NOW(),
        updated_at = NOW();`,
      [
        adAccId,
        orgId,
        actualConnId,
        'act_894120938475612',
        'Jyotsvan Organics D2C Performance Ads',
        'ACTIVE',
        'INR',
        'Asia/Kolkata',
        'biz_483920194857261',
        'Jyotsvan Enterprises Business Group',
        487500.0,
        12500.0,
        500.0,
        JSON.stringify(['CAN_USE_SPEND_CAP', 'CAN_USE_DYNAMIC_CREATIVE', 'CUSTOM_CONVERSIONS']),
        true,
      ]
    );

    // 13. Seed Secondary Ad Account (B2B Distributor Growth)
    const adAcc2Id = 'mktacc-jyotsvan-b2b';
    await client.query(
      `INSERT INTO marketing_ad_accounts (
        id, organization_id, connection_id, external_ad_account_id, name, account_status,
        currency, timezone, business_id, business_name, amount_spent, balance,
        min_daily_budget, capabilities, is_primary, last_synced_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW(), NOW())
      ON CONFLICT (organization_id, external_ad_account_id) DO NOTHING;`,
      [
        adAcc2Id,
        orgId,
        actualConnId,
        'act_561209384756123',
        'Jyotsvan B2B Distributor Lead Acquisition',
        'ACTIVE',
        'INR',
        'Asia/Kolkata',
        'biz_483920194857261',
        'Jyotsvan Enterprises Business Group',
        142300.0,
        8400.0,
        1000.0,
        JSON.stringify(['CAN_USE_LEAD_ADS', 'CUSTOM_CONVERSIONS']),
        false,
      ]
    );

    // 14. Seed Normalized Marketing Campaigns
    const sampleCampaigns = [
      {
        id: 'mktcmp-nutrienty-tofu',
        ext_id: 'cmp_774920192837461',
        name: 'Nutrienty Pure Cold-Pressed Oils - Top of Funnel Prospecting',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        effective_status: 'ACTIVE',
        daily_budget: 4500.0,
        spend: 124500.0,
      },
      {
        id: 'mktcmp-optypeak-retargeting',
        ext_id: 'cmp_774920192837462',
        name: 'OptyPeak Organic Cold-Pressed Mustard Oil - Catalog Retargeting',
        objective: 'PRODUCT_CATALOG_SALES',
        status: 'ACTIVE',
        effective_status: 'ACTIVE',
        daily_budget: 3500.0,
        spend: 98400.0,
      },
      {
        id: 'mktcmp-flaxseed-wellness',
        ext_id: 'cmp_774920192837463',
        name: 'Omega-3 Cold-Pressed Flaxseed Oil - Health & Wellness D2C',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        effective_status: 'ACTIVE',
        daily_budget: 2500.0,
        spend: 64200.0,
      },
      {
        id: 'mktcmp-festive-giftbox',
        ext_id: 'cmp_774920192837464',
        name: 'Diwali & Festive Gourmet Organic Cooking Gift Boxes',
        objective: 'OUTCOME_SALES',
        status: 'PAUSED',
        effective_status: 'PAUSED',
        daily_budget: 5000.0,
        spend: 145000.0,
      },
      {
        id: 'mktcmp-distributor-leadgen',
        ext_id: 'cmp_774920192837465',
        name: 'Distributor & C&F Partner Onboarding - Odisha & East India Region',
        objective: 'OUTCOME_LEADS',
        status: 'ACTIVE',
        effective_status: 'ACTIVE',
        daily_budget: 3000.0,
        spend: 55400.0,
      },
    ];

    for (const c of sampleCampaigns) {
      await client.query(
        `INSERT INTO marketing_campaigns (
          id, organization_id, connection_id, ad_account_id, external_campaign_id,
          name, objective, status, effective_status, buying_type, daily_budget,
          start_time, last_synced_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'AUCTION', $10, NOW() - INTERVAL '30 days', NOW(), NOW(), NOW())
        ON CONFLICT (organization_id, external_campaign_id) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          effective_status = EXCLUDED.effective_status,
          daily_budget = EXCLUDED.daily_budget,
          last_synced_at = NOW(),
          updated_at = NOW();`,
        [
          c.id,
          orgId,
          actualConnId,
          adAccId,
          c.ext_id,
          c.name,
          c.objective,
          c.status,
          c.effective_status,
          c.daily_budget,
        ]
      );
    }

    // 15. Seed Ad Sets & Creatives & Ads
    const sampleAdSets = [
      {
        id: 'mktset-mustard-advplus',
        cmp_id: 'mktcmp-nutrienty-tofu',
        ext_set_id: 'adset_661928374651021',
        ext_cmp_id: 'cmp_774920192837461',
        name: 'Advantage+ Shopping Campaign - Cold Audiences India Tier 1-2',
        status: 'ACTIVE',
        daily_budget: 2500.0,
        optimization_goal: 'OFFSITE_CONVERSIONS',
      },
      {
        id: 'mktset-groundnut-lookalike',
        cmp_id: 'mktcmp-nutrienty-tofu',
        ext_set_id: 'adset_661928374651022',
        ext_cmp_id: 'cmp_774920192837461',
        name: '1% High LTV Shopify Customers Lookalike - Groundnut & Mustard',
        status: 'ACTIVE',
        daily_budget: 2000.0,
        optimization_goal: 'OFFSITE_CONVERSIONS',
      },
      {
        id: 'mktset-dpa-view-cart',
        cmp_id: 'mktcmp-optypeak-retargeting',
        ext_set_id: 'adset_661928374651023',
        ext_cmp_id: 'cmp_774920192837462',
        name: 'Dynamic Product Ads - View Content & Add to Cart 14 Days',
        status: 'ACTIVE',
        daily_budget: 3500.0,
        optimization_goal: 'OFFSITE_CONVERSIONS',
      },
    ];

    for (const s of sampleAdSets) {
      await client.query(
        `INSERT INTO marketing_ad_sets (
          id, organization_id, connection_id, ad_account_id, campaign_id,
          external_adset_id, external_campaign_id, name, status, effective_status,
          daily_budget, optimization_goal, billing_event, start_time, last_synced_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', $10, $11, 'IMPRESSIONS', NOW() - INTERVAL '30 days', NOW(), NOW(), NOW())
        ON CONFLICT (organization_id, external_adset_id) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          daily_budget = EXCLUDED.daily_budget,
          last_synced_at = NOW(),
          updated_at = NOW();`,
        [
          s.id,
          orgId,
          actualConnId,
          adAccId,
          s.cmp_id,
          s.ext_set_id,
          s.ext_cmp_id,
          s.name,
          s.status,
          s.daily_budget,
          s.optimization_goal,
        ]
      );
    }

    // 16. Seed Creatives & Ads
    const sampleCreatives = [
      {
        id: 'mktcrt-wood-pressed-video',
        ext_id: 'crt_991827364501231',
        name: 'Traditional Kolhu Wood-Pressed Extraction Video Reel 9:16',
        title: '100% Pure Virgin Cold-Pressed Mustard Oil | Jyotsvan',
        body: 'Crafted using wooden kachi ghani churners at <40°C. Preserves authentic pungent aroma and natural antioxidants. Order directly for farm-fresh purity.',
        cta: 'SHOP_NOW',
        image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&auto=format&fit=crop&q=80',
      },
      {
        id: 'mktcrt-mustard-bottle-carousel',
        ext_id: 'crt_991827364501232',
        name: '5L Tin & 1L Glass Bottle Cold-Pressed Trio Carousel',
        title: 'Farm Fresh Organic Cooking Essentials | Delivered to Your Doorstep',
        body: 'Zero preservatives, unrefined, lab-certified organic. Flat ₹150 OFF on first order code PURE150.',
        cta: 'SHOP_NOW',
        image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&auto=format&fit=crop&q=80',
      },
    ];

    for (const cr of sampleCreatives) {
      await client.query(
        `INSERT INTO marketing_creatives (
          id, organization_id, connection_id, ad_account_id, external_creative_id,
          name, title, body, call_to_action_type, image_url, thumbnail_url,
          object_type, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, 'VIDEO', NOW(), NOW())
        ON CONFLICT (organization_id, external_creative_id) DO NOTHING;`,
        [
          cr.id,
          orgId,
          actualConnId,
          adAccId,
          cr.ext_id,
          cr.name,
          cr.title,
          cr.body,
          cr.cta,
          cr.image_url,
        ]
      );
    }

    const sampleAds = [
      {
        id: 'mktad-mustard-video-ad',
        ext_ad_id: 'ad_331928374650121',
        ext_set_id: 'adset_661928374651021',
        ext_cmp_id: 'cmp_774920192837461',
        cmp_id: 'mktcmp-nutrienty-tofu',
        set_id: 'mktset-mustard-advplus',
        crt_id: 'mktcrt-wood-pressed-video',
        name: 'Video Reel - Authentic Pungent Yellow Mustard Oil 1L',
      },
      {
        id: 'mktad-trio-carousel-ad',
        ext_ad_id: 'ad_331928374650122',
        ext_set_id: 'adset_661928374651022',
        ext_cmp_id: 'cmp_774920192837461',
        cmp_id: 'mktcmp-nutrienty-tofu',
        set_id: 'mktset-groundnut-lookalike',
        crt_id: 'mktcrt-mustard-bottle-carousel',
        name: 'Carousel - Cold-Pressed Trio Combo Offer',
      },
    ];

    for (const a of sampleAds) {
      await client.query(
        `INSERT INTO marketing_ads (
          id, organization_id, connection_id, ad_account_id, campaign_id, adset_id,
          external_ad_id, external_adset_id, external_campaign_id, name, status,
          effective_status, creative_id, last_synced_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', 'ACTIVE', $11, NOW(), NOW(), NOW())
        ON CONFLICT (organization_id, external_ad_id) DO NOTHING;`,
        [
          a.id,
          orgId,
          actualConnId,
          adAccId,
          a.cmp_id,
          a.set_id,
          a.ext_ad_id,
          a.ext_set_id,
          a.ext_cmp_id,
          a.name,
          a.crt_id,
        ]
      );
    }

    // 17. Seed 30 Days of Daily Performance Telemetry (Insights)
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];

      // Base daily spend between ₹12,000 and ₹18,500
      const variance = Math.sin(i / 3) * 2500 + (i % 7 === 0 ? 3000 : 0);
      const dailySpend = Math.round(14500 + variance);
      const dailyImpressions = Math.round(dailySpend * 24.5 + Math.random() * 5000);
      const dailyReach = Math.round(dailyImpressions * 0.78);
      const dailyClicks = Math.round(dailyImpressions * 0.0245);
      const dailyLinkClicks = Math.round(dailyClicks * 0.74);
      const dailyCtr = Number(((dailyClicks / dailyImpressions) * 100).toFixed(2));
      const dailyCpc = Number((dailySpend / Math.max(1, dailyClicks)).toFixed(2));
      const dailyCpm = Number(((dailySpend / Math.max(1, dailyImpressions)) * 1000).toFixed(2));
      const dailyConversions = Math.round(dailyLinkClicks * 0.052);
      const dailyConversionValue = Math.round(dailyConversions * 1650);
      const dailyRoas = Number((dailyConversionValue / Math.max(1, dailySpend)).toFixed(2));
      const costPerConv = Number((dailySpend / Math.max(1, dailyConversions)).toFixed(2));

      // Account Level Insight
      const accInsightId = `mktins-acc-${dateStr}`;
      await client.query(
        `INSERT INTO marketing_daily_insights (
          id, organization_id, connection_id, ad_account_id, level, date,
          external_account_id, spend, currency, impressions, reach, frequency,
          clicks, unique_clicks, link_clicks, cpc, cpm, ctr, conversions,
          conversion_value, cost_per_conversion, roas, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'account', $5, $6, $7, 'INR', $8, $9, 1.28, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
        ON CONFLICT (organization_id, ad_account_id, level, date, external_campaign_id, external_adset_id, external_ad_id)
        DO UPDATE SET
          spend = EXCLUDED.spend,
          impressions = EXCLUDED.impressions,
          reach = EXCLUDED.reach,
          clicks = EXCLUDED.clicks,
          conversions = EXCLUDED.conversions,
          conversion_value = EXCLUDED.conversion_value,
          roas = EXCLUDED.roas,
          updated_at = NOW();`,
        [
          accInsightId,
          orgId,
          actualConnId,
          adAccId,
          dateStr,
          'act_894120938475612',
          dailySpend,
          dailyImpressions,
          dailyReach,
          dailyClicks,
          Math.round(dailyClicks * 0.85),
          dailyLinkClicks,
          dailyCpc,
          dailyCpm,
          dailyCtr,
          dailyConversions,
          dailyConversionValue,
          costPerConv,
          dailyRoas,
        ]
      );

      // Campaign Level Insights for Primary Top-of-Funnel Campaign
      const cmp1Spend = Math.round(dailySpend * 0.52);
      const cmp1Imp = Math.round(dailyImpressions * 0.54);
      const cmp1Clicks = Math.round(dailyClicks * 0.55);
      const cmp1Conv = Math.round(dailyConversions * 0.48);
      const cmp1Val = Math.round(cmp1Conv * 1720);
      const cmp1Roas = Number((cmp1Val / Math.max(1, cmp1Spend)).toFixed(2));

      await client.query(
        `INSERT INTO marketing_daily_insights (
          id, organization_id, connection_id, ad_account_id, level, date,
          external_account_id, external_campaign_id, campaign_name, spend, currency,
          impressions, reach, frequency, clicks, link_clicks, cpc, cpm, ctr,
          conversions, conversion_value, cost_per_conversion, roas, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'campaign', $5, $6, $7, $8, $9, 'INR', $10, $11, 1.24, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
        ON CONFLICT (organization_id, ad_account_id, level, date, external_campaign_id, external_adset_id, external_ad_id)
        DO UPDATE SET
          spend = EXCLUDED.spend,
          impressions = EXCLUDED.impressions,
          conversions = EXCLUDED.conversions,
          conversion_value = EXCLUDED.conversion_value,
          roas = EXCLUDED.roas,
          updated_at = NOW();`,
        [
          `mktins-cmp1-${dateStr}`,
          orgId,
          actualConnId,
          adAccId,
          dateStr,
          'act_894120938475612',
          'cmp_774920192837461',
          'Nutrienty Pure Cold-Pressed Oils - Top of Funnel Prospecting',
          cmp1Spend,
          cmp1Imp,
          Math.round(cmp1Imp * 0.8),
          cmp1Clicks,
          Math.round(cmp1Clicks * 0.76),
          Number((cmp1Spend / Math.max(1, cmp1Clicks)).toFixed(2)),
          Number(((cmp1Spend / Math.max(1, cmp1Imp)) * 1000).toFixed(2)),
          Number(((cmp1Clicks / cmp1Imp) * 100).toFixed(2)),
          cmp1Conv,
          cmp1Val,
          Number((cmp1Spend / Math.max(1, cmp1Conv)).toFixed(2)),
          cmp1Roas,
        ]
      );
    }

    // 18. Seed Demographics & Platform Breakdown Telemetry
    const breakdownPlacements = [
      { type: 'publisher_platform', value: 'instagram', spendPct: 0.62, roas: 3.45 },
      { type: 'publisher_platform', value: 'facebook', spendPct: 0.35, roas: 2.92 },
      { type: 'publisher_platform', value: 'audience_network', spendPct: 0.03, roas: 1.45 },
      { type: 'placement', value: 'instagram_reels', spendPct: 0.44, roas: 3.65 },
      { type: 'placement', value: 'instagram_feed', spendPct: 0.22, roas: 3.12 },
      { type: 'placement', value: 'facebook_feed', spendPct: 0.24, roas: 2.85 },
      { type: 'placement', value: 'facebook_stories', spendPct: 0.10, roas: 2.45 },
      { type: 'age_gender', value: '25-34_female', spendPct: 0.38, roas: 3.82 },
      { type: 'age_gender', value: '35-44_female', spendPct: 0.28, roas: 3.41 },
      { type: 'age_gender', value: '25-34_male', spendPct: 0.18, roas: 2.76 },
      { type: 'age_gender', value: '45-54_female', spendPct: 0.16, roas: 2.94 },
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    for (const b of breakdownPlacements) {
      const bSpend = Math.round(16500 * b.spendPct);
      const bImp = Math.round(bSpend * 25);
      const bClicks = Math.round(bImp * 0.024);
      const bConv = Math.round(bClicks * 0.05);
      const bVal = Math.round(bSpend * b.roas);

      await client.query(
        `INSERT INTO marketing_breakdown_insights (
          id, organization_id, connection_id, ad_account_id, level, date,
          breakdown_type, breakdown_value, spend, impressions, reach, clicks,
          conversions, conversion_value, cpc, ctr, roas, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'account', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        ON CONFLICT (organization_id, ad_account_id, level, date, breakdown_type, breakdown_value, COALESCE(breakdown_secondary_value, ''))
        DO UPDATE SET
          spend = EXCLUDED.spend,
          impressions = EXCLUDED.impressions,
          conversions = EXCLUDED.conversions,
          conversion_value = EXCLUDED.conversion_value,
          roas = EXCLUDED.roas,
          updated_at = NOW();`,
        [
          `mktbrk-${b.type}-${b.value}-${todayStr}`,
          orgId,
          actualConnId,
          adAccId,
          todayStr,
          b.type,
          b.value,
          bSpend,
          bImp,
          Math.round(bImp * 0.8),
          bClicks,
          bConv,
          bVal,
          Number((bSpend / Math.max(1, bClicks)).toFixed(2)),
          Number(((bClicks / bImp) * 100).toFixed(2)),
          b.roas,
        ]
      );
    }

    // 19. Seed Initial Entity Mappings
    await client.query(
      `INSERT INTO integration_entity_mappings (
        id, organization_id, connection_id, entity_type, internal_id,
        external_id, sync_direction, last_synced_at, created_at, updated_at
      ) VALUES
        ($1, $2, $3, 'marketing_account', $4, 'act_894120938475612', 'inbound', NOW(), NOW(), NOW()),
        ($5, $2, $3, 'marketing_campaign', 'mktcmp-nutrienty-tofu', 'cmp_774920192837461', 'inbound', NOW(), NOW(), NOW())
      ON CONFLICT (organization_id, connection_id, entity_type, internal_id) DO NOTHING;`,
      [
        `map-mktacc-${Date.now()}-1`,
        orgId,
        actualConnId,
        adAccId,
        `map-mktcmp-${Date.now()}-2`,
      ]
    );

    await client.query('COMMIT;');
    console.log('[Phase 26 Migration] ✓ Meta Ads schema and seed data created successfully.');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Phase 26 Migration] ✗ Error running Meta Ads migration:', err);
    throw err;
  } finally {
    client.release();
  }
}
