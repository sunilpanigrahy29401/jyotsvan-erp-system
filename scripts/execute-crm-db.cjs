// scripts/execute-crm-db.cjs
// Script to deploy and seed CRM database tables via /api/db/query endpoint

const http = require('http');

function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ sql, params });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/db/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 400 || json.error) {
            reject(new Error(json.error || body));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(body));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function migrateAndSeed() {
  console.log('=== [CRM Database] Deploying CRM Schema & Foundations ===');

  // 1. Lead Sources
  console.log('1. Creating crm_lead_sources...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_lead_sources (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(128) NOT NULL,
      code VARCHAR(64) NOT NULL,
      channel_type VARCHAR(64) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT uk_crm_lead_source_code UNIQUE (organization_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_crm_lead_sources_org ON crm_lead_sources(organization_id);
  `);

  // 2. Lead Tags
  console.log('2. Creating crm_lead_tags...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_lead_tags (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(64) NOT NULL,
      color VARCHAR(32) DEFAULT '#3b82f6' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT uk_crm_lead_tag_name UNIQUE (organization_id, name)
    );
  `);

  // 3. Accounts
  console.log('3. Creating crm_accounts...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_accounts (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      account_number VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      legal_name VARCHAR(255),
      relationship_type VARCHAR(64) DEFAULT 'b2b_client' NOT NULL,
      industry VARCHAR(128),
      tier VARCHAR(32) DEFAULT 'tier_2' NOT NULL,
      website VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(64),
      address TEXT,
      city VARCHAR(128),
      state VARCHAR(128),
      pincode VARCHAR(32),
      gstin VARCHAR(64),
      pan VARCHAR(32),
      credit_limit NUMERIC(15,2) DEFAULT 0.00,
      annual_revenue NUMERIC(15,2),
      assigned_employee_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
      territory VARCHAR(128),
      status VARCHAR(32) DEFAULT 'active' NOT NULL,
      created_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT uk_crm_account_number UNIQUE (organization_id, account_number)
    );
    CREATE INDEX IF NOT EXISTS idx_crm_accounts_org ON crm_accounts(organization_id);
    CREATE INDEX IF NOT EXISTS idx_crm_accounts_status ON crm_accounts(status);
  `);

  // 4. Operational Entity Links
  console.log('4. Creating crm_account_links...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_account_links (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      account_id VARCHAR(64) NOT NULL REFERENCES crm_accounts(id) ON DELETE CASCADE,
      entity_type VARCHAR(64) NOT NULL,
      entity_id VARCHAR(64) NOT NULL,
      entity_name VARCHAR(255),
      is_primary BOOLEAN DEFAULT TRUE NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      linked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT uk_crm_account_link UNIQUE (account_id, entity_type, entity_id)
    );
    CREATE INDEX IF NOT EXISTS idx_crm_account_links_target ON crm_account_links(entity_type, entity_id);
  `);

  // 5. Contacts
  console.log('5. Creating crm_contacts...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_contacts (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      account_id VARCHAR(64) REFERENCES crm_accounts(id) ON DELETE SET NULL,
      first_name VARCHAR(128) NOT NULL,
      last_name VARCHAR(128) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      designation VARCHAR(128),
      department VARCHAR(128),
      role VARCHAR(64) DEFAULT 'general' NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(64) NOT NULL,
      alternate_phone VARCHAR(64),
      is_primary BOOLEAN DEFAULT FALSE NOT NULL,
      notes TEXT,
      status VARCHAR(32) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_crm_contacts_account ON crm_contacts(account_id);
  `);

  // 6. Leads
  console.log('6. Creating crm_leads...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_leads (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      lead_number VARCHAR(64) NOT NULL,
      first_name VARCHAR(128) NOT NULL,
      last_name VARCHAR(128) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      company_name VARCHAR(255),
      designation VARCHAR(128),
      email VARCHAR(255),
      phone VARCHAR(64) NOT NULL,
      alternate_phone VARCHAR(64),
      website VARCHAR(255),
      address TEXT,
      city VARCHAR(128),
      state VARCHAR(128),
      country VARCHAR(128) DEFAULT 'India',
      pincode VARCHAR(32),

      relationship_type VARCHAR(64) DEFAULT 'b2b_client' NOT NULL,
      industry VARCHAR(128),
      business_category VARCHAR(128),
      expected_requirement TEXT,
      estimated_quantity NUMERIC(15,2),
      estimated_deal_value NUMERIC(15,2) DEFAULT 0.00,
      product_interest JSONB DEFAULT '[]'::jsonb,
      purchase_timeline VARCHAR(64) DEFAULT '30_days',
      budget_range VARCHAR(64),
      current_supplier VARCHAR(255),
      business_size VARCHAR(64) DEFAULT 'medium',

      source_id VARCHAR(64) REFERENCES crm_lead_sources(id) ON DELETE SET NULL,
      campaign_id VARCHAR(128),
      campaign_name VARCHAR(255),
      assigned_employee_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
      assigned_team VARCHAR(128),
      territory VARCHAR(128),
      lead_score INTEGER DEFAULT 50 NOT NULL,
      priority VARCHAR(32) DEFAULT 'medium' NOT NULL,
      status VARCHAR(32) DEFAULT 'new' NOT NULL,
      qualification_notes TEXT,
      disqualification_reason TEXT,

      is_converted BOOLEAN DEFAULT FALSE NOT NULL,
      converted_at TIMESTAMPTZ,
      converted_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      converted_account_id VARCHAR(64) REFERENCES crm_accounts(id) ON DELETE SET NULL,
      converted_contact_id VARCHAR(64) REFERENCES crm_contacts(id) ON DELETE SET NULL,
      converted_deal_id VARCHAR(64),

      next_follow_up_date TIMESTAMPTZ,
      last_activity_date TIMESTAMPTZ,
      tags JSONB DEFAULT '[]'::jsonb,
      created_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT uk_crm_lead_number UNIQUE (organization_id, lead_number)
    );
    CREATE INDEX IF NOT EXISTS idx_crm_leads_org ON crm_leads(organization_id);
    CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
  `);

  // 7. Lead Status History
  console.log('7. Creating crm_lead_status_history...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_lead_status_history (
      id VARCHAR(64) PRIMARY KEY,
      lead_id VARCHAR(64) NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
      previous_status VARCHAR(32),
      new_status VARCHAR(32) NOT NULL,
      reason TEXT,
      changed_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);

  // 8. Pipelines & Stages
  console.log('8. Creating crm_pipelines and stages...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_pipelines (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(128) NOT NULL,
      code VARCHAR(64) NOT NULL,
      is_default BOOLEAN DEFAULT FALSE NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT uk_crm_pipeline_code UNIQUE (organization_id, code)
    );

    CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
      id VARCHAR(64) PRIMARY KEY,
      pipeline_id VARCHAR(64) NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
      name VARCHAR(128) NOT NULL,
      code VARCHAR(64) NOT NULL,
      display_order INTEGER NOT NULL,
      default_probability INTEGER DEFAULT 50 NOT NULL,
      is_won_stage BOOLEAN DEFAULT FALSE NOT NULL,
      is_lost_stage BOOLEAN DEFAULT FALSE NOT NULL,
      color VARCHAR(32) DEFAULT '#3b82f6' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT uk_crm_stage_code UNIQUE (pipeline_id, code)
    );
  `);

  // 9. Deals
  console.log('9. Creating crm_deals and items...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_deals (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      deal_number VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      pipeline_id VARCHAR(64) NOT NULL REFERENCES crm_pipelines(id) ON DELETE RESTRICT,
      stage_id VARCHAR(64) NOT NULL REFERENCES crm_pipeline_stages(id) ON DELETE RESTRICT,
      account_id VARCHAR(64) NOT NULL REFERENCES crm_accounts(id) ON DELETE CASCADE,
      primary_contact_id VARCHAR(64) REFERENCES crm_contacts(id) ON DELETE SET NULL,
      lead_id VARCHAR(64) REFERENCES crm_leads(id) ON DELETE SET NULL,
      deal_value NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
      expected_quantity NUMERIC(15,2),
      expected_close_date DATE NOT NULL,
      actual_close_date DATE,
      owner_employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      territory VARCHAR(128),
      status VARCHAR(32) DEFAULT 'open' NOT NULL,
      win_loss_reason TEXT,
      competitor_name VARCHAR(255),
      description TEXT,
      is_handed_off BOOLEAN DEFAULT FALSE NOT NULL,
      handoff_id VARCHAR(64),
      created_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT uk_crm_deal_number UNIQUE (organization_id, deal_number)
    );

    CREATE TABLE IF NOT EXISTS crm_deal_items (
      id VARCHAR(64) PRIMARY KEY,
      deal_id VARCHAR(64) NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
      product_id VARCHAR(64),
      product_name VARCHAR(255) NOT NULL,
      sku VARCHAR(64),
      quantity NUMERIC(12,2) DEFAULT 1.00 NOT NULL,
      unit_price NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
      total_price NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);

  // 10. Deal Stage History & Handoffs
  console.log('10. Creating crm_deal_stage_history & handoffs...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_deal_stage_history (
      id VARCHAR(64) PRIMARY KEY,
      deal_id VARCHAR(64) NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
      previous_stage_id VARCHAR(64) REFERENCES crm_pipeline_stages(id) ON DELETE SET NULL,
      new_stage_id VARCHAR(64) NOT NULL REFERENCES crm_pipeline_stages(id) ON DELETE RESTRICT,
      duration_days INTEGER DEFAULT 0,
      notes TEXT,
      changed_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_deal_handoffs (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      deal_id VARCHAR(64) NOT NULL REFERENCES crm_deals(id) ON DELETE RESTRICT,
      handoff_number VARCHAR(64) NOT NULL,
      account_id VARCHAR(64) NOT NULL REFERENCES crm_accounts(id) ON DELETE RESTRICT,
      contact_id VARCHAR(64) REFERENCES crm_contacts(id) ON DELETE SET NULL,
      idempotency_key VARCHAR(128) NOT NULL UNIQUE,
      pricing_assumptions JSONB DEFAULT '{}'::jsonb,
      line_items JSONB NOT NULL,
      special_terms TEXT,
      delivery_timeline VARCHAR(128),
      status VARCHAR(32) DEFAULT 'pending_review' NOT NULL,
      approved_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMPTZ,
      sales_order_id VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);

  // 11. Activities & Notes
  console.log('11. Creating crm_activities and crm_notes...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_activities (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      activity_type VARCHAR(64) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      description TEXT,
      due_date TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      is_completed BOOLEAN DEFAULT FALSE NOT NULL,
      priority VARCHAR(32) DEFAULT 'normal' NOT NULL,

      lead_id VARCHAR(64) REFERENCES crm_leads(id) ON DELETE CASCADE,
      account_id VARCHAR(64) REFERENCES crm_accounts(id) ON DELETE CASCADE,
      contact_id VARCHAR(64) REFERENCES crm_contacts(id) ON DELETE SET NULL,
      deal_id VARCHAR(64) REFERENCES crm_deals(id) ON DELETE CASCADE,

      assigned_employee_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
      logged_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

      outcome VARCHAR(64),
      outcome_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_notes (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      lead_id VARCHAR(64) REFERENCES crm_leads(id) ON DELETE CASCADE,
      account_id VARCHAR(64) REFERENCES crm_accounts(id) ON DELETE CASCADE,
      deal_id VARCHAR(64) REFERENCES crm_deals(id) ON DELETE CASCADE,
      title VARCHAR(255),
      content TEXT NOT NULL,
      created_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      created_by_name VARCHAR(128) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);

  // 12. Automations & Webhooks
  console.log('12. Creating crm_automation_rules and logs...');
  await runSql(`
    CREATE TABLE IF NOT EXISTS crm_automation_rules (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(128) NOT NULL,
      description TEXT,
      trigger_event VARCHAR(64) NOT NULL,
      conditions JSONB DEFAULT '{}'::jsonb,
      action_type VARCHAR(64) NOT NULL,
      action_params JSONB DEFAULT '{}'::jsonb,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      execution_count INTEGER DEFAULT 0 NOT NULL,
      last_executed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_automation_logs (
      id VARCHAR(64) PRIMARY KEY,
      rule_id VARCHAR(64) NOT NULL REFERENCES crm_automation_rules(id) ON DELETE CASCADE,
      organization_id VARCHAR(64) NOT NULL,
      trigger_event VARCHAR(64) NOT NULL,
      target_entity_type VARCHAR(64) NOT NULL,
      target_entity_id VARCHAR(64) NOT NULL,
      status VARCHAR(32) NOT NULL,
      execution_details JSONB,
      error_message TEXT,
      executed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_webhook_logs (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      source VARCHAR(64) NOT NULL,
      payload JSONB NOT NULL,
      headers JSONB,
      status VARCHAR(32) NOT NULL,
      created_lead_id VARCHAR(64) REFERENCES crm_leads(id) ON DELETE SET NULL,
      error_details TEXT,
      ip_address VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_integration_configs (
      id VARCHAR(64) PRIMARY KEY,
      organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      provider VARCHAR(64) NOT NULL,
      provider_name VARCHAR(128) NOT NULL,
      status VARCHAR(64) DEFAULT 'awaiting_credentials' NOT NULL,
      last_successful_sync TIMESTAMPTZ,
      last_attempted_sync TIMESTAMPTZ,
      total_records_ingested INTEGER DEFAULT 0 NOT NULL,
      failed_records_count INTEGER DEFAULT 0 NOT NULL,
      error_message TEXT,
      config_summary JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT uk_crm_integration_provider UNIQUE (organization_id, provider)
    );
  `);

  console.log('✓ All 16 CRM tables deployed successfully.');

  // ==========================================
  // SEED FOUNDATIONAL CRM DATA
  // ==========================================
  console.log('\n=== Seeding Core CRM Data ===');

  // A. Lead Sources
  await runSql(`
    INSERT INTO crm_lead_sources (id, organization_id, name, code, channel_type, is_active) VALUES
      ('src-webform', 'org-jyotsvan-corp', 'Official Corporate Webform', 'WEBFORM-01', 'webform', TRUE),
      ('src-indiamart', 'org-jyotsvan-corp', 'IndiaMART Verified B2B Inquiries', 'INDIAMART-01', 'indiamart', TRUE),
      ('src-meta', 'org-jyotsvan-corp', 'Meta Ads Lead Form (FB & IG)', 'META-LEAD-01', 'meta_ads', TRUE),
      ('src-google', 'org-jyotsvan-corp', 'Google Search & PMax Ads', 'GOOGLE-ADS-01', 'google_ads', TRUE),
      ('src-referral', 'org-jyotsvan-corp', 'Client & Partner Referral', 'REFERRAL-01', 'referral', TRUE),
      ('src-direct', 'org-jyotsvan-corp', 'Inbound Commercial Call', 'DIRECT-01', 'direct', TRUE),
      ('src-event', 'org-jyotsvan-corp', 'Annual Trade Expo 2026', 'EXPO-2026', 'field_event', TRUE)
    ON CONFLICT (organization_id, code) DO NOTHING;
  `);

  // B. Pipelines & Stages
  await runSql(`
    INSERT INTO crm_pipelines (id, organization_id, name, code, is_default, is_active) VALUES
      ('pipe-b2b', 'org-jyotsvan-corp', 'B2B & Institutional Sales Pipeline', 'PIPE-B2B-STD', TRUE, TRUE),
      ('pipe-channel', 'org-jyotsvan-corp', 'Channel Partner Onboarding Pipeline', 'PIPE-CHANNEL-ONBOARD', FALSE, TRUE)
    ON CONFLICT (organization_id, code) DO NOTHING;

    INSERT INTO crm_pipeline_stages (id, pipeline_id, name, code, display_order, default_probability, is_won_stage, is_lost_stage, color) VALUES
      ('stg-1', 'pipe-b2b', 'New Inquiry', 'NEW_INQUIRY', 1, 10, FALSE, FALSE, '#94a3b8'),
      ('stg-2', 'pipe-b2b', 'Discovery & Qualification', 'QUALIFICATION', 2, 25, FALSE, FALSE, '#38bdf8'),
      ('stg-3', 'pipe-b2b', 'Technical Evaluation', 'TECH_EVAL', 3, 40, FALSE, FALSE, '#818cf8'),
      ('stg-4', 'pipe-b2b', 'Commercial Proposal', 'PROPOSAL', 4, 60, FALSE, FALSE, '#fbbf24'),
      ('stg-5', 'pipe-b2b', 'Contract Negotiation', 'NEGOTIATION', 5, 80, FALSE, FALSE, '#f97316'),
      ('stg-6', 'pipe-b2b', 'Closed Won', 'CLOSED_WON', 6, 100, TRUE, FALSE, '#22c55e'),
      ('stg-7', 'pipe-b2b', 'Closed Lost', 'CLOSED_LOST', 7, 0, FALSE, TRUE, '#ef4444')
    ON CONFLICT (pipeline_id, code) DO NOTHING;
  `);

  // C. Integration Statuses
  await runSql(`
    INSERT INTO crm_integration_configs (id, organization_id, provider, provider_name, status, total_records_ingested, failed_records_count, config_summary) VALUES
      ('cfg-webform', 'org-jyotsvan-corp', 'webform', 'Website Inbound Form Receiver', 'connected', 24, 0, '{\"endpoint\": \"/api/crm/webhooks/inbound\", \"captcha_enabled\": true}'::jsonb),
      ('cfg-indiamart', 'org-jyotsvan-corp', 'indiamart', 'IndiaMART B2B Lead Push API', 'awaiting_credentials', 0, 0, '{\"auth_mode\": \"api_key\", \"sync_frequency\": \"15_mins\"}'::jsonb),
      ('cfg-meta', 'org-jyotsvan-corp', 'meta_ads', 'Meta Instant Forms Webhook', 'configuration_required', 0, 0, '{\"webhook_subscribed\": false, \"app_id\": \"meta-live-app\"}'::jsonb),
      ('cfg-google', 'org-jyotsvan-corp', 'google_ads', 'Google Lead Form Extensions', 'awaiting_credentials', 0, 0, '{\"lead_delivery\": \"webhook\"}'::jsonb),
      ('cfg-shopify', 'org-jyotsvan-corp', 'shopify', 'Shopify D2C Customer Linking', 'connected', 3, 0, '{\"auto_link_customers\": true, \"store\": \"jyotsvan-direct.myshopify.com\"}'::jsonb),
      ('cfg-whatsapp', 'org-jyotsvan-corp', 'whatsapp', 'WhatsApp Business Cloud Chat', 'awaiting_credentials', 0, 0, '{\"sandbox_ready\": true}'::jsonb)
    ON CONFLICT (organization_id, provider) DO UPDATE
    SET status = EXCLUDED.status, provider_name = EXCLUDED.provider_name;
  `);

  // D. Core Accounts (with linking to existing operational customers)
  await runSql(`
    INSERT INTO crm_accounts (id, organization_id, account_number, name, legal_name, relationship_type, industry, tier, website, email, phone, city, state, credit_limit, assigned_employee_id, territory, status) VALUES
      ('acc-01', 'org-jyotsvan-corp', 'ACC-BHE-001', 'Bharat Heavy Engineering Consortium Ltd', 'Bharat Heavy Engineering Consortium Ltd', 'b2b_client', 'Heavy Engineering & Infrastructure', 'tier_1', 'https://bharatheavy.in', 'procurement@bharatheavy.in', '+91 22 8899 0011', 'Pune', 'Maharashtra', 5000000.00, 'emp-007', 'West - Maharashtra', 'active'),
      ('acc-02', 'org-jyotsvan-corp', 'ACC-KAL-002', 'Kalinga Steel & Infrastructure', 'Kalinga Steel & Infrastructure Pvt Ltd', 'distributor', 'Metals & Construction Material', 'tier_1', 'https://kalingasteel.co.in', 'orders@kalingasteel.co.in', '+91 674 3322 110', 'Bhubaneswar', 'Odisha', 3000000.00, 'emp-008', 'East - Odisha', 'active'),
      ('acc-03', 'org-jyotsvan-corp', 'ACC-NPD-003', 'Northern Petrochemical Distribution Corp', 'Northern Petrochemical Distribution Corp', 'distributor', 'Industrial Chemicals & Petroleum', 'tier_2', 'https://northernpetro.org', 'supply@northernpetro.org', '+91 11 9988 7766', 'New Delhi', 'Delhi', 8000000.00, 'emp-007', 'North - NCR', 'active')
    ON CONFLICT (organization_id, account_number) DO NOTHING;

    -- Link CRM Accounts to existing customers table
    INSERT INTO crm_account_links (id, organization_id, account_id, entity_type, entity_id, entity_name, is_primary) VALUES
      ('link-01', 'org-jyotsvan-corp', 'acc-01', 'customer', 'cust-01', 'Bharat Heavy Engineering Consortium Ltd', TRUE),
      ('link-02', 'org-jyotsvan-corp', 'acc-02', 'customer', 'cust-02', 'Kalinga Steel & Infrastructure Infrastructure', TRUE),
      ('link-03', 'org-jyotsvan-corp', 'acc-03', 'customer', 'cust-03', 'Northern Petrochemical Distribution Corp', TRUE)
    ON CONFLICT (account_id, entity_type, entity_id) DO NOTHING;
  `);

  // E. Contacts
  await runSql(`
    INSERT INTO crm_contacts (id, organization_id, account_id, first_name, last_name, display_name, designation, department, role, email, phone, is_primary, status) VALUES
      ('con-01', 'org-jyotsvan-corp', 'acc-01', 'Siddharth', 'Joshi', 'Siddharth Joshi', 'General Manager Procurement', 'Commercial & Purchasing', 'decision_maker', 's.joshi@bharatheavy.in', '+91 98200 45678', TRUE, 'active'),
      ('con-02', 'org-jyotsvan-corp', 'acc-01', 'Meera', 'Ranganathan', 'Meera Ranganathan', 'Senior Quality Auditor', 'Vendor Quality & Compliance', 'influencer', 'm.ranga@bharatheavy.in', '+91 98200 87654', FALSE, 'active'),
      ('con-03', 'org-jyotsvan-corp', 'acc-02', 'Alok', 'Patnaik', 'Alok Patnaik', 'Managing Director', 'Executive Management', 'decision_maker', 'alok@kalingasteel.co.in', '+91 94370 55443', TRUE, 'active')
    ON CONFLICT (id) DO NOTHING;
  `);

  // F. Active Deals
  await runSql(`
    INSERT INTO crm_deals (id, organization_id, deal_number, title, pipeline_id, stage_id, account_id, primary_contact_id, deal_value, expected_quantity, expected_close_date, owner_employee_id, territory, status, description) VALUES
      ('deal-01', 'org-jyotsvan-corp', 'DEAL-2026-001', 'Annual Precision Alloy Component Supply Agreement', 'pipe-b2b', 'stg-4', 'acc-01', 'con-01', 4500000.00, 1500.00, '2026-11-30', 'emp-007', 'West - Maharashtra', 'open', 'Negotiating annual volume discounts and bi-monthly dispatch schedule.'),
      ('deal-02', 'org-jyotsvan-corp', 'DEAL-2026-002', 'Q4 Structural Steel Section Distribution Lot', 'pipe-b2b', 'stg-5', 'acc-02', 'con-03', 1850000.00, 500.00, '2026-11-20', 'emp-008', 'East - Odisha', 'open', 'Final review of commercial payment terms (30 days LC).')
    ON CONFLICT (organization_id, deal_number) DO NOTHING;

    INSERT INTO crm_deal_items (id, deal_id, product_name, sku, quantity, unit_price, total_price) VALUES
      ('ditem-01', 'deal-01', 'Industrial Precision Alloy Formulation Bar', 'SKU-AL-01', 1000.00, 3000.00, 3000000.00),
      ('ditem-02', 'deal-01', 'Heat Resistant Coating Finish Lot', 'SKU-COAT-04', 500.00, 3000.00, 1500000.00)
    ON CONFLICT (id) DO NOTHING;
  `);

  // G. Inbound Leads
  await runSql(`
    INSERT INTO crm_leads (
      id, organization_id, lead_number, first_name, last_name, display_name, company_name, designation,
      email, phone, city, state, relationship_type, industry, expected_requirement, estimated_deal_value,
      source_id, assigned_employee_id, territory, lead_score, priority, status, created_at, updated_at
    ) VALUES
      ('lead-01', 'org-jyotsvan-corp', 'LEAD-2026-001', 'Vikram', 'Mehta', 'Vikram Mehta', 'Godrej Process Fabricators Ltd', 'Head of Sourcing',
       'vmehta@godrejfabricators.com', '+91 98210 11223', 'Mumbai', 'Maharashtra', 'b2b_client', 'Industrial Machinery',
       'Urgent requirement for 250 MT of certified raw chemical formulation compound.', 3200000.00,
       'src-webform', 'emp-007', 'West - Maharashtra', 85, 'high', 'qualified', NOW() - INTERVAL '2 days', NOW()),
      ('lead-02', 'org-jyotsvan-corp', 'LEAD-2026-002', 'Suresh', 'Mohapatra', 'Suresh Mohapatra', 'Odisha Agro & Construction Depot', 'Proprietor',
       'smohapatra@odishaagro.in', '+91 94371 99887', 'Cuttack', 'Odisha', 'distributor', 'Building Materials',
       'Interested in authorized district distributorship for coastal Odisha region.', 1500000.00,
       'src-indiamart', 'emp-008', 'East - Odisha', 70, 'medium', 'contacted', NOW() - INTERVAL '1 day', NOW()),
      ('lead-03', 'org-jyotsvan-corp', 'LEAD-2026-003', 'Kavita', 'Sethi', 'Kavita Sethi', 'Apex Institutional Supplies', 'Commercial Director',
       'ksethi@apexsupplies.org', '+91 98100 44556', 'New Delhi', 'Delhi', 'institutional', 'Government Tenders',
       'Bulk tender procurement for central health & sanitation supplies lot.', 4800000.00,
       'src-meta', 'emp-007', 'North - NCR', 92, 'urgent', 'new', NOW(), NOW())
    ON CONFLICT (organization_id, lead_number) DO NOTHING;
  `);

  // H. Activities
  await runSql(`
    INSERT INTO crm_activities (
      id, organization_id, activity_type, subject, description, due_date, is_completed, priority,
      lead_id, account_id, deal_id, assigned_employee_id, logged_by_user_id, created_at, updated_at
    ) VALUES
      ('act-01', 'org-jyotsvan-corp', 'phone_call', 'Commercial Terms Alignment Call with Vikram Mehta', 'Discuss payment credit terms and lab testing certificates.', NOW() + INTERVAL '1 day', FALSE, 'high', 'lead-01', NULL, NULL, 'emp-007', 'usr-super-admin', NOW(), NOW()),
      ('act-02', 'org-jyotsvan-corp', 'meeting', 'Technical Proposal Presentation & QA Sign-off', 'On-site presentation at Bharat Heavy Engineering Pune facility.', NOW() + INTERVAL '3 days', FALSE, 'urgent', NULL, 'acc-01', 'deal-01', 'emp-007', 'usr-super-admin', NOW(), NOW()),
      ('act-03', 'org-jyotsvan-corp', 'whatsapp', 'Send Distributorship Application Packet', 'Dispatched draft distributor agreement PDF via corporate channel.', NOW() - INTERVAL '4 hours', TRUE, 'normal', 'lead-02', NULL, NULL, 'emp-008', 'usr-super-admin', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // I. Automation Rules
  await runSql(`
    INSERT INTO crm_automation_rules (id, organization_id, name, description, trigger_event, action_type, is_active, execution_count) VALUES
      ('rule-01', 'org-jyotsvan-corp', 'Auto-Assign Maharashtra Inquiries to Vikram Sharma', 'Assigns high-priority leads in West zone to Area Sales Manager', 'lead_created', 'assign_lead', TRUE, 4),
      ('rule-02', 'org-jyotsvan-corp', 'Create Follow-up Task on Qualified Lead', 'Automatically logs a 24-hour follow-up call reminder when lead is marked Qualified', 'lead_qualified', 'create_task', TRUE, 12),
      ('rule-03', 'org-jyotsvan-corp', 'Notify Management on Won Deals > ₹25 Lakhs', 'Sends high-priority notification to executive team when significant deal closes', 'deal_won', 'notify_owner', TRUE, 2)
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('✓ Foundational CRM data seeded successfully.');
}

migrateAndSeed().catch(err => {
  console.error('[CRM Database] Migration error:', err);
  process.exit(1);
});
