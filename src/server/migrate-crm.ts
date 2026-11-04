// src/server/migrate-crm.ts
// Comprehensive Database Schema Migration & Seeding for CRM Subsystem

import { pool } from './db.ts';

export async function runCrmMigration() {
  console.log('[CRM Migration] Initializing CRM database schema & indexes...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    // 1. Lead Sources
    await client.query(`
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_lead_tags (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(64) NOT NULL,
        color VARCHAR(32) DEFAULT '#3b82f6' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_crm_lead_tag_name UNIQUE (organization_id, name)
      );
    `);

    // 3. CRM Accounts (Unified Commercial Parties)
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_crm_accounts_assigned ON crm_accounts(assigned_employee_id);
    `);

    // 4. Operational Entity Links (Linking CRM Accounts to Customers / Retailers / Distributors / C&Fs / Suppliers)
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_account_links (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        account_id VARCHAR(64) NOT NULL REFERENCES crm_accounts(id) ON DELETE CASCADE,
        entity_type VARCHAR(64) NOT NULL, -- 'customer', 'retailer', 'distributor', 'cf', 'supplier'
        entity_id VARCHAR(64) NOT NULL,
        entity_name VARCHAR(255),
        is_primary BOOLEAN DEFAULT TRUE NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        linked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_crm_account_link UNIQUE (account_id, entity_type, entity_id)
      );
      CREATE INDEX IF NOT EXISTS idx_crm_account_links_target ON crm_account_links(entity_type, entity_id);
    `);

    // 5. CRM Contacts (Directory of People within Accounts)
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_crm_contacts_phone ON crm_contacts(phone);
      CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
    `);

    // 6. CRM Leads
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON crm_leads(assigned_employee_id);
      CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON crm_leads(phone);
      CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON crm_leads(email);
    `);

    // 7. Lead Status History
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_lead_status_history (
        id VARCHAR(64) PRIMARY KEY,
        lead_id VARCHAR(64) NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
        previous_status VARCHAR(32),
        new_status VARCHAR(32) NOT NULL,
        reason TEXT,
        changed_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_crm_lead_status_lead ON crm_lead_status_history(lead_id);
    `);

    // 8. CRM Pipelines & Stages
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages ON crm_pipeline_stages(pipeline_id, display_order);
    `);

    // 9. CRM Deals / Opportunities
    await client.query(`
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
        status VARCHAR(32) DEFAULT 'open' NOT NULL, -- 'open', 'won', 'lost', 'abandoned'
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
      CREATE INDEX IF NOT EXISTS idx_crm_deals_org ON crm_deals(organization_id);
      CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage_id);
      CREATE INDEX IF NOT EXISTS idx_crm_deals_account ON crm_deals(account_id);
      CREATE INDEX IF NOT EXISTS idx_crm_deals_owner ON crm_deals(owner_employee_id);
    `);

    // 10. Deal Line Items
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_crm_deal_items_deal ON crm_deal_items(deal_id);
    `);

    // 11. Deal Stage History
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_crm_deal_stage_deal ON crm_deal_stage_history(deal_id);
    `);

    // 12. Deal Handoffs to Sales System
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_crm_deal_handoffs_deal ON crm_deal_handoffs(deal_id);
    `);

    // 13. CRM Activities (Calls, Meetings, Visits, Emails, WhatsApp)
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_crm_activities_lead ON crm_activities(lead_id);
      CREATE INDEX IF NOT EXISTS idx_crm_activities_account ON crm_activities(account_id);
      CREATE INDEX IF NOT EXISTS idx_crm_activities_deal ON crm_activities(deal_id);
      CREATE INDEX IF NOT EXISTS idx_crm_activities_due ON crm_activities(due_date);
    `);

    // 14. CRM Notes
    await client.query(`
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

    // 15. CRM Automation Rules & Logs
    await client.query(`
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
    `);

    // 16. Webhook Logs & Integration Configs
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_webhook_logs (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        source VARCHAR(64) NOT NULL, -- 'webform', 'indiamart', 'meta_ads', 'google_ads'
        payload JSONB NOT NULL,
        headers JSONB,
        status VARCHAR(32) NOT NULL, -- 'processed', 'ignored_duplicate', 'error'
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

    await client.query('COMMIT;');
    console.log('[CRM Migration] ✓ Tables & indexes created successfully.');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[CRM Migration] Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
