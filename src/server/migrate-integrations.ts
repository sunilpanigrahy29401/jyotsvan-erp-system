// src/server/migrate-integrations.ts
// Schema migration & initial provider registry for Phase 24: Jyotsvan Enterprise Integration Engine

import { pool } from './db.ts';
import { encryptCredentials } from './crypto-vault.ts';
import type { IntegrationProvider } from '../types/integrations.ts';

export const INITIAL_INTEGRATION_PROVIDERS: Omit<IntegrationProvider, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    provider_key: 'custom_api',
    name: 'Custom REST API Connector',
    description: 'Connect any external enterprise RESTful endpoint with custom headers, API keys, bearer tokens, or basic auth.',
    category: 'custom',
    icon_name: 'Code2',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/custom-api',
    status: 'active',
    implementation_status: 'implemented',
    capabilities: {
      read: true,
      write: true,
      webhooks: false,
      sync: true,
      oauth: false,
      test_connection: true,
      custom_headers: true,
      rate_limit_rps: 50,
    },
    configuration_schema: {
      instructions: 'Configure your target endpoint URL and select authentication method. SSRF protection is active.',
      fields: [
        {
          key: 'base_url',
          label: 'Base API Endpoint URL',
          type: 'url',
          required: true,
          placeholder: 'https://api.partner.com/v1',
          helpText: 'Must be a public HTTPS endpoint. Private IPs and localhost are restricted.',
        },
        {
          key: 'auth_type',
          label: 'Authentication Mechanism',
          type: 'select',
          required: true,
          defaultValue: 'api_key',
          options: [
            { label: 'API Key (Custom Header)', value: 'api_key' },
            { label: 'Bearer Token (Authorization Header)', value: 'bearer' },
            { label: 'HTTP Basic Authentication', value: 'basic' },
            { label: 'No Authentication (Public)', value: 'none' },
          ],
        },
        {
          key: 'api_key_header',
          label: 'API Key Header Name',
          type: 'text',
          placeholder: 'X-API-Key',
          defaultValue: 'X-API-Key',
          helpText: 'The HTTP header name to send the API key in.',
        },
        {
          key: 'api_key_value',
          label: 'API Key Secret',
          type: 'secret',
          placeholder: 'ak_live_••••••••••••',
          secret: true,
        },
        {
          key: 'bearer_token',
          label: 'Bearer Authorization Token',
          type: 'secret',
          placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...',
          secret: true,
        },
        {
          key: 'basic_username',
          label: 'HTTP Basic Username',
          type: 'text',
          placeholder: 'api_user',
        },
        {
          key: 'basic_password',
          label: 'HTTP Basic Password',
          type: 'secret',
          placeholder: '••••••••••••',
          secret: true,
        },
        {
          key: 'timeout_ms',
          label: 'Request Timeout (ms)',
          type: 'number',
          defaultValue: 10000,
          placeholder: '10000',
          helpText: 'Maximum time to wait for a response (1000 - 60000ms).',
        },
        {
          key: 'retry_attempts',
          label: 'Max Retry Attempts on 5xx/429',
          type: 'number',
          defaultValue: 3,
          placeholder: '3',
        },
      ],
    },
  },
  {
    provider_key: 'generic_webhook',
    name: 'Generic Inbound Webhook',
    description: 'Receive real-time transactional payloads, order dispatches, payments, or telemetry with HMAC-SHA256 signature verification.',
    category: 'custom',
    icon_name: 'Webhook',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/webhooks',
    status: 'active',
    implementation_status: 'implemented',
    capabilities: {
      read: true,
      write: false,
      webhooks: true,
      sync: false,
      oauth: false,
      test_connection: true,
      rate_limit_rpm: 600,
    },
    configuration_schema: {
      instructions: 'Configure inbound webhook verification. Payloads will be verified, deduplicated, and logged.',
      fields: [
        {
          key: 'event_type',
          label: 'Primary Event Category',
          type: 'select',
          required: true,
          defaultValue: 'order.created',
          options: [
            { label: 'Order Events (order.*)', value: 'order.events' },
            { label: 'Payment Events (payment.*)', value: 'payment.events' },
            { label: 'Shipment Tracking (shipment.*)', value: 'shipment.events' },
            { label: 'Inventory Sync (inventory.*)', value: 'inventory.events' },
            { label: 'Generic Payload (custom.*)', value: 'custom.events' },
          ],
        },
        {
          key: 'signature_header',
          label: 'Signature HTTP Header',
          type: 'text',
          defaultValue: 'X-Webhook-Signature',
          placeholder: 'X-Webhook-Signature',
          helpText: 'HTTP header containing the HMAC signature.',
        },
        {
          key: 'secret_key',
          label: 'HMAC Signing Secret',
          type: 'secret',
          placeholder: 'whsec_••••••••••••••••',
          secret: true,
          helpText: 'Used to compute and verify the HMAC-SHA256 signature.',
        },
      ],
    },
  },
  {
    provider_key: 'shopify',
    name: 'Shopify Store Connector',
    description: 'Bi-directional synchronization of online store catalog, live inventory reservations, customer profiles, and order fulfillments.',
    category: 'commerce',
    icon_name: 'ShoppingBag',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/shopify',
    status: 'available',
    implementation_status: 'registered',
    capabilities: {
      read: true,
      write: true,
      webhooks: true,
      sync: true,
      oauth: true,
      test_connection: true,
      rate_limit_rps: 4,
    },
    configuration_schema: {
      instructions: 'Enter your Shopify store domain and Admin API Access Token.',
      fields: [
        {
          key: 'shop_domain',
          label: 'Shopify Store Domain',
          type: 'text',
          required: true,
          placeholder: 'your-brand.myshopify.com',
          helpText: 'Your primary .myshopify.com store domain.',
        },
        {
          key: 'admin_api_access_token',
          label: 'Admin API Access Token',
          type: 'secret',
          required: true,
          placeholder: 'shpat_••••••••••••••••••••••••••••••••',
          secret: true,
        },
        {
          key: 'api_version',
          label: 'API Version',
          type: 'select',
          defaultValue: '2026-01',
          options: [
            { label: '2026-01 (Latest Supported)', value: '2026-01' },
            { label: '2025-10', value: '2025-10' },
          ],
        },
        {
          key: 'webhook_secret',
          label: 'Webhook Shared Secret',
          type: 'secret',
          placeholder: 'shpss_••••••••••••••••',
          secret: true,
        },
      ],
    },
  },
  {
    provider_key: 'whatsapp',
    name: 'WhatsApp Business Cloud API',
    description: 'Send transactional order notifications, dispatch alerts, payment reminders, and receive customer replies via Meta Graph API.',
    category: 'communication',
    icon_name: 'MessageSquare',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/whatsapp',
    status: 'available',
    implementation_status: 'registered',
    capabilities: {
      read: true,
      write: true,
      webhooks: true,
      sync: false,
      oauth: false,
      test_connection: true,
      rate_limit_rps: 80,
    },
    configuration_schema: {
      instructions: 'Provide your WhatsApp Business Phone Number ID and Meta System User Access Token.',
      fields: [
        {
          key: 'phone_number_id',
          label: 'WhatsApp Phone Number ID',
          type: 'text',
          required: true,
          placeholder: '109876543210987',
        },
        {
          key: 'business_account_id',
          label: 'WhatsApp Business Account (WABA) ID',
          type: 'text',
          required: true,
          placeholder: '123456789012345',
        },
        {
          key: 'system_user_access_token',
          label: 'Permanent System User Access Token',
          type: 'secret',
          required: true,
          placeholder: 'EAAB••••••••••••••••••••••••',
          secret: true,
        },
        {
          key: 'webhook_verify_token',
          label: 'Webhook Verification Token',
          type: 'secret',
          placeholder: 'whtok_••••••••••••',
          secret: true,
        },
      ],
    },
  },
  {
    provider_key: 'razorpay',
    name: 'Razorpay Payment Gateway',
    description: 'Automatic collection reconciliation, payment link generation, instant UPI payouts, and refund webhooks.',
    category: 'payments',
    icon_name: 'CreditCard',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/razorpay',
    status: 'available',
    implementation_status: 'registered',
    capabilities: {
      read: true,
      write: true,
      webhooks: true,
      sync: true,
      oauth: false,
      test_connection: true,
      rate_limit_rps: 30,
    },
    configuration_schema: {
      instructions: 'Enter your Razorpay Key ID, Key Secret, and Webhook Secret.',
      fields: [
        {
          key: 'key_id',
          label: 'Razorpay Key ID',
          type: 'text',
          required: true,
          placeholder: 'rzp_live_••••••••••••',
        },
        {
          key: 'key_secret',
          label: 'Razorpay Key Secret',
          type: 'secret',
          required: true,
          placeholder: '••••••••••••••••••••',
          secret: true,
        },
        {
          key: 'merchant_id',
          label: 'Merchant ID',
          type: 'text',
          placeholder: 'MID12345678',
        },
        {
          key: 'webhook_secret',
          label: 'Webhook Signing Secret',
          type: 'secret',
          placeholder: 'whsec_••••••••••••',
          secret: true,
        },
      ],
    },
  },
  {
    provider_key: 'cashfree',
    name: 'Cashfree Payments',
    description: 'Enterprise payment routing, auto-collect virtual accounts, escrow reconciliations, and bulk vendor payouts.',
    category: 'payments',
    icon_name: 'DollarSign',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/cashfree',
    status: 'available',
    implementation_status: 'registered',
    capabilities: {
      read: true,
      write: true,
      webhooks: true,
      sync: true,
      oauth: false,
      test_connection: true,
    },
    configuration_schema: {
      instructions: 'Provide Cashfree App ID, Secret Key, and Environment (Production or Sandbox).',
      fields: [
        {
          key: 'app_id',
          label: 'Cashfree App ID',
          type: 'text',
          required: true,
          placeholder: 'CF_LIVE_••••••••',
        },
        {
          key: 'secret_key',
          label: 'Cashfree Secret Key',
          type: 'secret',
          required: true,
          placeholder: '••••••••••••••••••••••••••••••••',
          secret: true,
        },
        {
          key: 'environment',
          label: 'Environment',
          type: 'select',
          defaultValue: 'production',
          options: [
            { label: 'Production Live', value: 'production' },
            { label: 'Sandbox / Test', value: 'sandbox' },
          ],
        },
      ],
    },
  },
  {
    provider_key: 'shiprocket',
    name: 'Shiprocket Logistics Engine',
    description: 'Automated courier assignment, AWB generation, shipping label printing, real-time NDR management, and tracking updates.',
    category: 'shipping',
    icon_name: 'Truck',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/shiprocket',
    status: 'available',
    implementation_status: 'registered',
    capabilities: {
      read: true,
      write: true,
      webhooks: true,
      sync: true,
      oauth: false,
      test_connection: true,
    },
    configuration_schema: {
      instructions: 'Enter your Shiprocket API account credentials and default pickup location.',
      fields: [
        {
          key: 'email',
          label: 'Shiprocket Account Email',
          type: 'text',
          required: true,
          placeholder: 'logistics@jyotsvan.enterprise',
        },
        {
          key: 'password',
          label: 'Shiprocket Account Password',
          type: 'secret',
          required: true,
          placeholder: '••••••••••••',
          secret: true,
        },
        {
          key: 'pickup_location_id',
          label: 'Default Pickup Location Name/ID',
          type: 'text',
          placeholder: 'Warehouse-Bhubaneswar-Hub',
        },
      ],
    },
  },
  {
    provider_key: 'delhivery',
    name: 'Delhivery Surface & Express',
    description: 'Direct enterprise B2B and B2C surface freight dispatching, waybill allocation, and electronic proof of delivery (e-POD).',
    category: 'shipping',
    icon_name: 'Navigation',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/delhivery',
    status: 'available',
    implementation_status: 'registered',
    capabilities: {
      read: true,
      write: true,
      webhooks: true,
      sync: true,
      oauth: false,
      test_connection: true,
    },
    configuration_schema: {
      instructions: 'Enter your Delhivery Client Name and API Token.',
      fields: [
        {
          key: 'client_name',
          label: 'Delhivery Client Name',
          type: 'text',
          required: true,
          placeholder: 'JYOTSVAN_LOGISTICS',
        },
        {
          key: 'api_token',
          label: 'API Authorization Token',
          type: 'secret',
          required: true,
          placeholder: '••••••••••••••••••••••••••••••••',
          secret: true,
        },
        {
          key: 'pickup_pincode',
          label: 'Registered Pickup Pincode',
          type: 'text',
          placeholder: '752054',
        },
      ],
    },
  },
  {
    provider_key: 'woocommerce',
    name: 'WooCommerce B2B/B2C Connector',
    description: 'Sync WordPress/WooCommerce product inventory, order statuses, tax rates, and customer accounts.',
    category: 'commerce',
    icon_name: 'Store',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/woocommerce',
    status: 'available',
    implementation_status: 'registered',
    capabilities: {
      read: true,
      write: true,
      webhooks: true,
      sync: true,
      oauth: false,
      test_connection: true,
    },
    configuration_schema: {
      instructions: 'Enter WooCommerce store URL, Consumer Key, and Consumer Secret.',
      fields: [
        {
          key: 'store_url',
          label: 'WooCommerce Store URL',
          type: 'url',
          required: true,
          placeholder: 'https://shop.jyotsvan.enterprise',
        },
        {
          key: 'consumer_key',
          label: 'Consumer Key',
          type: 'text',
          required: true,
          placeholder: 'ck_••••••••••••••••••••••••',
        },
        {
          key: 'consumer_secret',
          label: 'Consumer Secret',
          type: 'secret',
          required: true,
          placeholder: 'cs_••••••••••••••••••••••••',
          secret: true,
        },
      ],
    },
  },
  {
    provider_key: 'amazon',
    name: 'Amazon SP-API (Seller Central)',
    description: 'Amazon Selling Partner API for direct order ingestion, FBA inventory reconciliation, and merchant-fulfilled dispatches.',
    category: 'commerce',
    icon_name: 'Package',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/amazon',
    status: 'coming_soon',
    implementation_status: 'registered',
    capabilities: {
      read: true,
      write: true,
      webhooks: false,
      sync: true,
      oauth: true,
      test_connection: false,
    },
    configuration_schema: {
      instructions: 'Connect using Amazon Selling Partner OAuth authorization.',
      fields: [
        {
          key: 'seller_id',
          label: 'Amazon Merchant / Seller ID',
          type: 'text',
          required: true,
          placeholder: 'A2XXXXXXXXXXXX',
        },
        {
          key: 'region',
          label: 'Marketplace Region',
          type: 'select',
          defaultValue: 'IN',
          options: [
            { label: 'India (amazon.in)', value: 'IN' },
            { label: 'North America (amazon.com)', value: 'NA' },
            { label: 'Europe (amazon.co.uk)', value: 'EU' },
          ],
        },
      ],
    },
  },
  {
    provider_key: 'flipkart',
    name: 'Flipkart Marketplace Seller Portal',
    description: 'Flipkart Seller API connector for listings sync, return management, and courier dispatch SLA tracking.',
    category: 'commerce',
    icon_name: 'Layers',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/flipkart',
    status: 'coming_soon',
    implementation_status: 'registered',
    capabilities: {
      read: true,
      write: true,
      webhooks: false,
      sync: true,
      oauth: false,
      test_connection: false,
    },
    configuration_schema: {
      instructions: 'Provide Flipkart Seller App ID and Secret.',
      fields: [
        {
          key: 'app_id',
          label: 'Flipkart Developer App ID',
          type: 'text',
          required: true,
          placeholder: '••••••••••••',
        },
        {
          key: 'app_secret',
          label: 'App Secret Key',
          type: 'secret',
          required: true,
          placeholder: '••••••••••••',
          secret: true,
        },
      ],
    },
  },
  {
    provider_key: 'google_sheets',
    name: 'Google Sheets Live Sync',
    description: 'Automated bi-directional ledger synchronization to Google Sheets for reporting, field audits, and executive summaries.',
    category: 'productivity',
    icon_name: 'FileSpreadsheet',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/google-sheets',
    status: 'available',
    implementation_status: 'registered',
    capabilities: {
      read: true,
      write: true,
      webhooks: false,
      sync: true,
      oauth: true,
      test_connection: true,
    },
    configuration_schema: {
      instructions: 'Enter your Google Spreadsheet ID and Service Account configuration JSON.',
      fields: [
        {
          key: 'spreadsheet_id',
          label: 'Google Spreadsheet ID',
          type: 'text',
          required: true,
          placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          helpText: 'The string between /d/ and /edit in your Google Sheet URL.',
        },
        {
          key: 'sheet_name',
          label: 'Target Sheet / Tab Name',
          type: 'text',
          defaultValue: 'Daily_Sync',
          placeholder: 'Daily_Sync',
        },
        {
          key: 'service_account_json',
          label: 'Google Service Account JSON Key',
          type: 'secret',
          required: true,
          placeholder: '{"type": "service_account", ...}',
          secret: true,
        },
      ],
    },
  },
  {
    provider_key: 'gmail',
    name: 'Gmail Workspace Integration',
    description: 'Inbound invoice & PO attachment parsing, automated tracking email dispatch, and supplier thread syncing.',
    category: 'communication',
    icon_name: 'Mail',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/gmail',
    status: 'coming_soon',
    implementation_status: 'registered',
    capabilities: {
      read: true,
      write: true,
      webhooks: true,
      sync: true,
      oauth: true,
      test_connection: false,
    },
    configuration_schema: {
      instructions: 'OAuth2 authentication required for Google Workspace Gmail API.',
      fields: [
        {
          key: 'service_email',
          label: 'Workspace Service Email',
          type: 'text',
          required: true,
          placeholder: 'erp-notifications@jyotsvan.enterprise',
        },
      ],
    },
  },
  {
    provider_key: 'smtp',
    name: 'Corporate SMTP Relay',
    description: 'Dedicated enterprise SMTP relay for transactional emails, customer invoices, dispatch notices, and system alerts.',
    category: 'communication',
    icon_name: 'Send',
    documentation_url: 'https://docs.jyotsvan.enterprise/integrations/smtp',
    status: 'active',
    implementation_status: 'registered',
    capabilities: {
      read: false,
      write: true,
      webhooks: false,
      sync: false,
      oauth: false,
      test_connection: true,
    },
    configuration_schema: {
      instructions: 'Configure your company SMTP host, port, credentials, and from address.',
      fields: [
        {
          key: 'smtp_host',
          label: 'SMTP Host Server',
          type: 'text',
          required: true,
          placeholder: 'smtp.mailgun.org or smtp.sendgrid.net',
        },
        {
          key: 'smtp_port',
          label: 'SMTP Port',
          type: 'number',
          defaultValue: 587,
          placeholder: '587',
        },
        {
          key: 'smtp_username',
          label: 'SMTP Username',
          type: 'text',
          required: true,
          placeholder: 'postmaster@jyotsvan.enterprise',
        },
        {
          key: 'smtp_password',
          label: 'SMTP Password / API Key',
          type: 'secret',
          required: true,
          placeholder: '••••••••••••••••••••',
          secret: true,
        },
        {
          key: 'from_email',
          label: 'Sender From Email',
          type: 'text',
          required: true,
          placeholder: 'no-reply@jyotsvan.enterprise',
        },
        {
          key: 'from_name',
          label: 'Sender Display Name',
          type: 'text',
          defaultValue: 'Jyotsvan Enterprise Notifications',
          placeholder: 'Jyotsvan Enterprise',
        },
      ],
    },
  },
];

export async function runIntegrationsMigration() {
  console.log('[Phase 24 Migration] Initializing Jyotsvan Enterprise Integration Engine Schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. integration_providers
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_providers (
        id VARCHAR(64) PRIMARY KEY,
        provider_key VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(64) NOT NULL,
        logo_url TEXT,
        icon_name VARCHAR(64),
        documentation_url TEXT,
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        implementation_status VARCHAR(32) DEFAULT 'registered' NOT NULL,
        capabilities JSONB DEFAULT '{}'::jsonb NOT NULL,
        configuration_schema JSONB DEFAULT '{"fields": []}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 2. integration_connections
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_connections (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        provider_id VARCHAR(64) NOT NULL REFERENCES integration_providers(id) ON DELETE RESTRICT,
        provider_key VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(32) DEFAULT 'connected' NOT NULL,
        auth_type VARCHAR(32) DEFAULT 'api_key' NOT NULL,
        external_account_id VARCHAR(255),
        external_account_name VARCHAR(255),
        configuration JSONB DEFAULT '{}'::jsonb NOT NULL,
        health_status VARCHAR(32) DEFAULT 'healthy' NOT NULL,
        health_message TEXT,
        last_sync_at TIMESTAMPTZ,
        last_success_at TIMESTAMPTZ,
        last_error_at TIMESTAMPTZ,
        last_error_message TEXT,
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_org_provider_name UNIQUE (organization_id, provider_key, name)
      );
    `);

    // 3. integration_credentials
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_credentials (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) UNIQUE NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        encrypted_credentials TEXT NOT NULL,
        credential_version INTEGER DEFAULT 1 NOT NULL,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 4. integration_webhooks
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_webhooks (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        provider VARCHAR(64) NOT NULL,
        event_type VARCHAR(128) NOT NULL,
        endpoint_identifier VARCHAR(128) UNIQUE NOT NULL,
        secret_hash VARCHAR(255),
        status VARCHAR(32) DEFAULT 'active' NOT NULL,
        events_received_count INTEGER DEFAULT 0 NOT NULL,
        last_received_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 5. integration_events
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_events (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        event_type VARCHAR(128) NOT NULL,
        direction VARCHAR(32) DEFAULT 'inbound' NOT NULL,
        external_event_id VARCHAR(255),
        payload JSONB DEFAULT '{}'::jsonb NOT NULL,
        status VARCHAR(32) DEFAULT 'received' NOT NULL,
        retry_count INTEGER DEFAULT 0 NOT NULL,
        processed_at TIMESTAMPTZ,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_connection_external_event UNIQUE (connection_id, external_event_id)
      );
    `);

    // 6. integration_logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_logs (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) REFERENCES integration_connections(id) ON DELETE SET NULL,
        provider_key VARCHAR(64) NOT NULL,
        operation VARCHAR(128) NOT NULL,
        direction VARCHAR(32) DEFAULT 'outbound' NOT NULL,
        request_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        response_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        status_code INTEGER,
        duration_ms INTEGER,
        error_code VARCHAR(64),
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 7. integration_sync_jobs
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_sync_jobs (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id VARCHAR(64) NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        job_type VARCHAR(32) DEFAULT 'manual' NOT NULL,
        status VARCHAR(32) DEFAULT 'pending' NOT NULL,
        cursor TEXT,
        records_processed INTEGER DEFAULT 0 NOT NULL,
        records_created INTEGER DEFAULT 0 NOT NULL,
        records_updated INTEGER DEFAULT 0 NOT NULL,
        records_failed INTEGER DEFAULT 0 NOT NULL,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 8. Performance Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_int_conn_org ON integration_connections(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_int_conn_provider ON integration_connections(provider_key);
      CREATE INDEX IF NOT EXISTS idx_int_webhooks_org ON integration_webhooks(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_int_webhooks_ident ON integration_webhooks(endpoint_identifier);
      CREATE INDEX IF NOT EXISTS idx_int_events_org_status ON integration_events(organization_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_int_events_conn ON integration_events(connection_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_int_logs_org_time ON integration_logs(organization_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_int_logs_conn ON integration_logs(connection_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_int_sync_conn ON integration_sync_jobs(connection_id, created_at DESC);
    `);

    // 9. Seed Integration Providers
    for (const p of INITIAL_INTEGRATION_PROVIDERS) {
      const providerId = `prov-${p.provider_key}`;
      await client.query(
        `INSERT INTO integration_providers (
          id, provider_key, name, description, category, icon_name,
          documentation_url, status, implementation_status, capabilities, configuration_schema, created_at, updated_at
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
          providerId,
          p.provider_key,
          p.name,
          p.description,
          p.category,
          p.icon_name,
          p.documentation_url,
          p.status,
          p.implementation_status,
          JSON.stringify(p.capabilities),
          JSON.stringify(p.configuration_schema),
        ]
      );
    }

    // 10. Seed Initial Sample Connections for Org (org-jyotsvan-corp)
    const orgId = 'org-jyotsvan-corp';
    const sampleConnections = [
      {
        id: 'conn-shopify-prod',
        provider_id: 'prov-shopify',
        provider_key: 'shopify',
        name: 'Jyotsvan Direct-to-Consumer Flagship Store',
        status: 'connected',
        auth_type: 'api_key',
        external_account_id: 'shop_88492019',
        external_account_name: 'jyotsvan-organics.myshopify.com',
        configuration: {
          shop_domain: 'jyotsvan-organics.myshopify.com',
          api_version: '2026-01',
          auto_sync_inventory: true,
          sync_interval_mins: 15,
        },
        credentials: {
          admin_api_access_token: 'shpat_98fbc923a48e71b2d3e4f50123456789',
          webhook_secret: 'whsec_shopify_88492019_live_key',
        },
        health_status: 'healthy',
        health_message: 'All API routes operating under 220ms latency.',
      },
      {
        id: 'conn-custom-wms',
        provider_id: 'prov-custom_api',
        provider_key: 'custom_api',
        name: 'Automated 3PL Warehouse Gateway (Bhubaneswar Hub)',
        status: 'connected',
        auth_type: 'bearer',
        external_account_id: 'wms-bbsr-hub-01',
        external_account_name: 'Hub-3PL-Infovalley',
        configuration: {
          base_url: 'https://wms-gateway.partner-logistics.in/v2',
          auth_type: 'bearer',
          timeout_ms: 8000,
          retry_attempts: 3,
        },
        credentials: {
          bearer_token: 'wms_live_bearer_token_7761928340192847',
        },
        health_status: 'healthy',
        health_message: 'SSRF validation active. Endpoints responding normally.',
      },
      {
        id: 'conn-webhook-inbound',
        provider_id: 'prov-generic_webhook',
        provider_key: 'generic_webhook',
        name: 'ERP Order & Dispatch Webhook Receiver',
        status: 'connected',
        auth_type: 'webhook',
        external_account_id: 'wh-inbound-listener-01',
        external_account_name: 'Inbound Orders & Statuses',
        configuration: {
          event_type: 'order.events',
          signature_header: 'X-Webhook-Signature',
        },
        credentials: {
          secret_key: 'whsec_jyotsvan_inbound_hmac_secret_2026',
        },
        health_status: 'healthy',
        health_message: 'Listening for incoming HMAC-SHA256 signed payloads.',
      },
      {
        id: 'conn-razorpay-live',
        provider_id: 'prov-razorpay',
        provider_key: 'razorpay',
        name: 'Razorpay Auto-Collect & UPI Gateway',
        status: 'connected',
        auth_type: 'api_key',
        external_account_id: 'rzp_mid_992019',
        external_account_name: 'Jyotsvan Enterprise Corp',
        configuration: {
          merchant_id: 'MID_JYOTSVAN_CORP_01',
          auto_reconcile: true,
        },
        credentials: {
          key_id: 'rzp_live_88492019827364',
          key_secret: 'rzp_secret_9918273645102938',
          webhook_secret: 'rzp_whsec_771829304857',
        },
        health_status: 'healthy',
        health_message: 'Webhook listeners active and verified.',
      },
    ];

    for (const sc of sampleConnections) {
      await client.query(
        `INSERT INTO integration_connections (
          id, organization_id, provider_id, provider_key, name, status,
          auth_type, external_account_id, external_account_name, configuration,
          health_status, health_message, last_sync_at, last_success_at, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '15 minutes', 'usr-owner-sunil', NOW() - INTERVAL '10 days', NOW())
        ON CONFLICT (organization_id, provider_key, name) DO UPDATE SET
          health_status = EXCLUDED.health_status,
          health_message = EXCLUDED.health_message,
          updated_at = NOW();`,
        [
          sc.id,
          orgId,
          sc.provider_id,
          sc.provider_key,
          sc.name,
          sc.status,
          sc.auth_type,
          sc.external_account_id,
          sc.external_account_name,
          JSON.stringify(sc.configuration),
          sc.health_status,
          sc.health_message,
        ]
      );

      // Store encrypted credentials
      const encrypted = encryptCredentials(sc.credentials);
      await client.query(
        `INSERT INTO integration_credentials (
          id, organization_id, connection_id, encrypted_credentials, credential_version, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 1, NOW() - INTERVAL '10 days', NOW())
        ON CONFLICT (connection_id) DO UPDATE SET
          encrypted_credentials = EXCLUDED.encrypted_credentials,
          updated_at = NOW();`,
        [`cred-${sc.id}`, orgId, sc.id, encrypted]
      );
    }

    // 11. Seed Sample Webhooks
    const sampleWebhooks = [
      {
        id: 'wh-shopify-orders',
        organization_id: orgId,
        connection_id: 'conn-shopify-prod',
        provider: 'shopify',
        event_type: 'orders/create',
        endpoint_identifier: 'wh-shopify-orders-create-8849',
        secret_hash: 'whsec_shopify_88492019_live_key',
        status: 'active',
        events_received_count: 342,
      },
      {
        id: 'wh-generic-inbound',
        organization_id: orgId,
        connection_id: 'conn-webhook-inbound',
        provider: 'generic_webhook',
        event_type: 'order.dispatched',
        endpoint_identifier: 'wh-generic-listener-7721',
        secret_hash: 'whsec_jyotsvan_inbound_hmac_secret_2026',
        status: 'active',
        events_received_count: 128,
      },
      {
        id: 'wh-razorpay-payments',
        organization_id: orgId,
        connection_id: 'conn-razorpay-live',
        provider: 'razorpay',
        event_type: 'payment.captured',
        endpoint_identifier: 'wh-rzp-captured-9920',
        secret_hash: 'rzp_whsec_771829304857',
        status: 'active',
        events_received_count: 890,
      },
    ];

    for (const w of sampleWebhooks) {
      await client.query(
        `INSERT INTO integration_webhooks (
          id, organization_id, connection_id, provider, event_type, endpoint_identifier,
          secret_hash, status, events_received_count, last_received_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '5 days', NOW())
        ON CONFLICT (endpoint_identifier) DO NOTHING;`,
        [
          w.id,
          w.organization_id,
          w.connection_id,
          w.provider,
          w.event_type,
          w.endpoint_identifier,
          w.secret_hash,
          w.status,
          w.events_received_count,
        ]
      );
    }

    // 12. Seed Sample Logs & Sync Jobs
    const sampleLogs = [
      {
        id: 'log-int-001',
        organization_id: orgId,
        connection_id: 'conn-shopify-prod',
        provider_key: 'shopify',
        operation: 'GET /admin/api/2026-01/inventory_levels.json',
        direction: 'outbound',
        request_metadata: { limit: 50, location_id: 'loc_99281' },
        response_metadata: { records_returned: 50, has_next_page: false },
        status_code: 200,
        duration_ms: 184,
      },
      {
        id: 'log-int-002',
        organization_id: orgId,
        connection_id: 'conn-razorpay-live',
        operation: 'POST /v1/payment_links',
        direction: 'outbound',
        request_metadata: { amount: 450000, currency: 'INR', reference_id: 'INV-2026-0042' },
        response_metadata: { status: 'created', short_url: 'https://rzp.io/i/88fbc92' },
        status_code: 200,
        duration_ms: 142,
      },
      {
        id: 'log-int-003',
        organization_id: orgId,
        connection_id: 'conn-webhook-inbound',
        operation: 'POST /api/integrations/webhooks/generic_webhook/wh-generic-listener-7721',
        direction: 'inbound',
        request_metadata: { event_type: 'order.dispatched', headers: { 'x-webhook-signature': 'sha256=••••••' } },
        response_metadata: { accepted: true, status: 'processed' },
        status_code: 200,
        duration_ms: 32,
      },
      {
        id: 'log-int-004',
        organization_id: orgId,
        connection_id: 'conn-custom-wms',
        operation: 'POST /v2/stock/allocations',
        direction: 'outbound',
        request_metadata: { sku: 'SKU-COCONUT-OIL-500ML', qty: 240, bay: 'BAY-A3' },
        response_metadata: { allocation_id: 'ALC-881920', status: 'confirmed' },
        status_code: 200,
        duration_ms: 210,
      },
    ];

    for (const l of sampleLogs) {
      await client.query(
        `INSERT INTO integration_logs (
          id, organization_id, connection_id, provider_key, operation, direction,
          request_metadata, response_metadata, status_code, duration_ms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '30 minutes')
        ON CONFLICT (id) DO NOTHING;`,
        [
          l.id,
          l.organization_id,
          l.connection_id,
          l.provider_key,
          l.operation,
          l.direction,
          JSON.stringify(l.request_metadata),
          JSON.stringify(l.response_metadata),
          l.status_code,
          l.duration_ms,
        ]
      );
    }

    const sampleSyncJob = {
      id: 'job-sync-001',
      organization_id: orgId,
      connection_id: 'conn-shopify-prod',
      job_type: 'manual',
      status: 'completed',
      records_processed: 148,
      records_created: 12,
      records_updated: 136,
      records_failed: 0,
    };

    await client.query(
      `INSERT INTO integration_sync_jobs (
        id, organization_id, connection_id, job_type, status,
        records_processed, records_created, records_updated, records_failed,
        started_at, completed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 58 minutes', NOW() - INTERVAL '2 hours', NOW())
      ON CONFLICT (id) DO NOTHING;`,
      [
        sampleSyncJob.id,
        sampleSyncJob.organization_id,
        sampleSyncJob.connection_id,
        sampleSyncJob.job_type,
        sampleSyncJob.status,
        sampleSyncJob.records_processed,
        sampleSyncJob.records_created,
        sampleSyncJob.records_updated,
        sampleSyncJob.records_failed,
      ]
    );

    // 13. Ensure RBAC Permissions for Integrations exist
    const integrationPermissions = [
      { code: 'integrations.view', module: 'settings', description: 'View connected integrations, providers, and integration metrics' },
      { code: 'integrations.create', module: 'settings', description: 'Provision new external integration connections' },
      { code: 'integrations.update', module: 'settings', description: 'Modify integration configurations and settings' },
      { code: 'integrations.delete', module: 'settings', description: 'Remove integration connections and associated credentials' },
      { code: 'integrations.connect', module: 'settings', description: 'Authorize and activate external system connections' },
      { code: 'integrations.disconnect', module: 'settings', description: 'Deactivate external connections and revoke access' },
      { code: 'integrations.logs.view', module: 'settings', description: 'Inspect operational integration traffic logs and error traces' },
      { code: 'integrations.sync', module: 'settings', description: 'Trigger manual and scheduled synchronization jobs' },
      { code: 'integrations.webhooks.manage', module: 'settings', description: 'Configure inbound webhook listeners and rotate signing secrets' },
      { code: 'integrations.manage', module: 'settings', description: 'Full administrative control over all enterprise integrations' },
    ];

    for (const perm of integrationPermissions) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;`,
        [`perm-${perm.code.replace('.', '-')}`, perm.code, perm.module, perm.description]
      );
    }

    // Grant all integration permissions to enterprise Owner and Admin roles
    const adminRoles = await client.query(`SELECT id FROM roles WHERE slug IN ('owner', 'admin', 'system-administrator')`);
    for (const r of adminRoles.rows) {
      for (const perm of integrationPermissions) {
        const permRes = await client.query(`SELECT id FROM permissions WHERE code = $1`, [perm.code]);
        if (permRes.rows.length > 0) {
          await client.query(
            `INSERT INTO role_permissions (id, role_id, permission_id, created_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT DO NOTHING;`,
            [`rp-${r.id}-${permRes.rows[0].id}`, r.id, permRes.rows[0].id]
          );
        }
      }
    }

    await client.query('COMMIT;');
    console.log('[Phase 24 Migration] ✓ Jyotsvan Enterprise Integration Engine Schema & Provider Registry initialized successfully.');
  } catch (err: unknown) {
    await client.query('ROLLBACK;');
    const errorMsg = err instanceof Error ? err.message : 'Integration migration failed';
    console.error('[Phase 24 Migration] ✗ Migration Error:', errorMsg);
    throw err;
  } finally {
    client.release();
  }
}
