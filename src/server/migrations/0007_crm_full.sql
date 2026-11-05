-- 0007_crm_full: CRM steps 2-3. Additive and idempotent. No demo data here (per-tenant defaults are created lazily by the app).

-- Activities / notes ---------------------------------------------------------------------------------------------------
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS direction VARCHAR(16);            -- inbound | outbound (calls, e-mail)
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS ticket_id VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_crm_activities_due ON crm_activities (organization_id, is_completed, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead ON crm_activities (organization_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_account ON crm_activities (organization_id, account_id);

ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS contact_id VARCHAR(64);
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS ticket_id VARCHAR(64);
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Partner (B2B) CRM: onboarding + KYC ----------------------------------------------------------------------------------
ALTER TABLE crm_accounts ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(24) NOT NULL DEFAULT 'not_started'; -- not_started | in_progress | completed
ALTER TABLE crm_accounts ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(24) NOT NULL DEFAULT 'pending';           -- pending | submitted | verified | rejected
ALTER TABLE crm_accounts ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;
ALTER TABLE crm_accounts ADD COLUMN IF NOT EXISTS kyc_verified_by VARCHAR(64);

CREATE TABLE IF NOT EXISTS crm_account_documents (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id      VARCHAR(64) NOT NULL REFERENCES crm_accounts(id) ON DELETE CASCADE,
  doc_type        VARCHAR(32) NOT NULL,         -- gst | pan | drug_licence | fssai | shop_act | cheque | agreement | photo | other
  doc_number      VARCHAR(64),
  file_name       VARCHAR(255),
  file_url        TEXT,
  status          VARCHAR(16) NOT NULL DEFAULT 'pending',  -- pending | verified | rejected
  expires_on      DATE,
  reviewed_by     VARCHAR(64),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_account_docs ON crm_account_documents (organization_id, account_id);

CREATE TABLE IF NOT EXISTS crm_visits (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id      VARCHAR(64) REFERENCES crm_accounts(id) ON DELETE SET NULL,
  lead_id         VARCHAR(64),
  contact_id      VARCHAR(64),
  employee_id     VARCHAR(64),
  visit_type      VARCHAR(24) NOT NULL DEFAULT 'sales',   -- sales | onboarding | collection | service | other
  planned_for     TIMESTAMPTZ,
  check_in_at     TIMESTAMPTZ,
  check_out_at    TIMESTAMPTZ,
  check_in_lat    NUMERIC(9,6),
  check_in_lng    NUMERIC(9,6),
  check_out_lat   NUMERIC(9,6),
  check_out_lng   NUMERIC(9,6),
  photo_url       TEXT,
  summary         TEXT,
  outcome         VARCHAR(32),
  next_action     TEXT,
  next_visit_date DATE,
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_visits_account ON crm_visits (organization_id, account_id, check_in_at DESC);

-- Custom fields ------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_custom_field_defs (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity          VARCHAR(16) NOT NULL,         -- lead | contact | account | deal
  field_key       VARCHAR(48) NOT NULL,
  label           VARCHAR(96) NOT NULL,
  field_type      VARCHAR(16) NOT NULL DEFAULT 'text',   -- text | number | date | select | boolean
  options         JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_required     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, entity, field_key)
);

-- Quotations ---------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_quotes (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_number    VARCHAR(32) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  account_id      VARCHAR(64) REFERENCES crm_accounts(id) ON DELETE SET NULL,
  contact_id      VARCHAR(64),
  deal_id         VARCHAR(64),
  status          VARCHAR(16) NOT NULL DEFAULT 'draft',  -- draft | sent | accepted | rejected | expired
  valid_until     DATE,
  currency        VARCHAR(8) NOT NULL DEFAULT 'INR',
  subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_total  NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total     NUMERIC(14,2) NOT NULL DEFAULT 0,
  terms           TEXT,
  notes           TEXT,
  sent_at         TIMESTAMPTZ,
  decided_at      TIMESTAMPTZ,
  decision_note   TEXT,
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at     TIMESTAMPTZ,
  UNIQUE (organization_id, quote_number)
);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_deal ON crm_quotes (organization_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_account ON crm_quotes (organization_id, account_id);

CREATE TABLE IF NOT EXISTS crm_quote_items (
  id           VARCHAR(64) PRIMARY KEY,
  quote_id     VARCHAR(64) NOT NULL REFERENCES crm_quotes(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL DEFAULT 0,
  product_id   VARCHAR(64),
  sku          VARCHAR(64),
  description  VARCHAR(500) NOT NULL,
  quantity     NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  tax_pct      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_pct >= 0 AND tax_pct <= 100),
  line_total   NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_items_quote ON crm_quote_items (quote_id, position);

-- Helpdesk ------------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_ticket_categories (
  id               VARCHAR(64) PRIMARY KEY,
  organization_id  VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             VARCHAR(96) NOT NULL,
  default_priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  default_owner_id VARCHAR(64),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS crm_ticket_sla_policies (
  id                      VARCHAR(64) PRIMARY KEY,
  organization_id         VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  priority                VARCHAR(16) NOT NULL,
  first_response_minutes  INTEGER NOT NULL CHECK (first_response_minutes > 0),
  resolution_minutes      INTEGER NOT NULL CHECK (resolution_minutes > 0),
  escalate_after_minutes  INTEGER,           -- escalate when unresolved this long past creation (NULL = resolution deadline)
  UNIQUE (organization_id, priority)
);

CREATE TABLE IF NOT EXISTS crm_tickets (
  id                     VARCHAR(64) PRIMARY KEY,
  organization_id        VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_number          VARCHAR(32) NOT NULL,
  subject                VARCHAR(255) NOT NULL,
  description            TEXT,
  category_id            VARCHAR(64),
  priority               VARCHAR(16) NOT NULL DEFAULT 'medium',  -- low | medium | high | urgent
  status                 VARCHAR(16) NOT NULL DEFAULT 'open',    -- open | pending | resolved | closed
  channel                VARCHAR(24) NOT NULL DEFAULT 'manual',  -- manual | email | phone | whatsapp | web | marketplace
  account_id             VARCHAR(64),
  contact_id             VARCHAR(64),
  order_ref              VARCHAR(64),
  assigned_employee_id   VARCHAR(64),
  first_response_due_at  TIMESTAMPTZ,
  resolution_due_at      TIMESTAMPTZ,
  first_response_at      TIMESTAMPTZ,
  resolved_at            TIMESTAMPTZ,
  closed_at              TIMESTAMPTZ,
  escalation_level       INTEGER NOT NULL DEFAULT 0,
  escalated_at           TIMESTAMPTZ,
  sla_breached_at        TIMESTAMPTZ,
  csat_score             INTEGER CHECK (csat_score BETWEEN 1 AND 5),
  csat_comment           TEXT,
  csat_at                TIMESTAMPTZ,
  created_by             VARCHAR(64),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, ticket_number)
);
CREATE INDEX IF NOT EXISTS idx_crm_tickets_status ON crm_tickets (organization_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_crm_tickets_account ON crm_tickets (organization_id, account_id);

CREATE TABLE IF NOT EXISTS crm_ticket_comments (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_id       VARCHAR(64) NOT NULL REFERENCES crm_tickets(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  is_internal     BOOLEAN NOT NULL DEFAULT FALSE,
  author_id       VARCHAR(64),
  author_name     VARCHAR(128),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_ticket_comments ON crm_ticket_comments (ticket_id, created_at);

CREATE TABLE IF NOT EXISTS crm_kb_articles (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(160) NOT NULL,
  category        VARCHAR(96),
  body            TEXT NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'draft',   -- draft | published
  tags            JSONB NOT NULL DEFAULT '[]'::jsonb,
  views           INTEGER NOT NULL DEFAULT 0,
  helpful_yes     INTEGER NOT NULL DEFAULT 0,
  helpful_no      INTEGER NOT NULL DEFAULT 0,
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

-- Consent (DPDP) and suppression ---------------------------------------------------------------------------------------
-- crm_consents is an append-only ledger; the latest row per (subject, channel, purpose) is the current state.
CREATE TABLE IF NOT EXISTS crm_consents (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject_type    VARCHAR(16) NOT NULL,         -- lead | contact
  subject_id      VARCHAR(64) NOT NULL,
  channel         VARCHAR(16) NOT NULL,         -- email | sms | whatsapp | call
  purpose         VARCHAR(16) NOT NULL DEFAULT 'marketing',
  status          VARCHAR(16) NOT NULL,         -- granted | withdrawn
  source          VARCHAR(48),                  -- webform | verbal | import | unsubscribe_link | staff
  evidence        TEXT,
  ip_address      VARCHAR(64),
  recorded_by     VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_consents_subject ON crm_consents (organization_id, subject_type, subject_id, channel, purpose, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_suppressions (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel         VARCHAR(16) NOT NULL,
  address_norm    VARCHAR(255) NOT NULL,        -- lower-case e-mail or 10-digit phone
  reason          VARCHAR(32) NOT NULL DEFAULT 'unsubscribed',  -- unsubscribed | bounced | complaint | manual
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, channel, address_norm)
);

-- Campaigns / templates / audiences / sequences -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_message_templates (
  id                 VARCHAR(64) PRIMARY KEY,
  organization_id    VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name               VARCHAR(128) NOT NULL,
  channel            VARCHAR(16) NOT NULL,      -- email | sms | whatsapp
  subject            VARCHAR(255),
  body               TEXT NOT NULL,
  provider_template  VARCHAR(128),              -- approved WhatsApp/DLT template id, when the channel needs one
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by         VARCHAR(64),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, channel, name)
);

CREATE TABLE IF NOT EXISTS crm_audiences (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(128) NOT NULL,
  description     TEXT,
  entity          VARCHAR(16) NOT NULL DEFAULT 'lead',   -- lead | contact
  filters         JSONB NOT NULL DEFAULT '{}'::jsonb,    -- {status, source_id, state, city, tag, relationship_type, min_score}
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS crm_campaigns (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(160) NOT NULL,
  channel         VARCHAR(16) NOT NULL,
  template_id     VARCHAR(64) NOT NULL,
  audience_id     VARCHAR(64) NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'draft',  -- draft | completed | cancelled
  scheduled_at    TIMESTAMPTZ,
  launched_at     TIMESTAMPTZ,
  stats           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_campaign_recipients (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id     VARCHAR(64) NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  entity_type     VARCHAR(16) NOT NULL,
  entity_id       VARCHAR(64) NOT NULL,
  address         VARCHAR(255),
  -- queued: ready, waiting for a delivery provider | skipped_*: excluded before sending | sent/failed: provider outcome
  status          VARCHAR(24) NOT NULL DEFAULT 'queued',
  detail          TEXT,
  sent_at         TIMESTAMPTZ,
  UNIQUE (campaign_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients ON crm_campaign_recipients (campaign_id, status);

CREATE TABLE IF NOT EXISTS crm_sequences (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(128) NOT NULL,
  channel         VARCHAR(16) NOT NULL,
  steps           JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{delay_hours, template_id}]
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS crm_sequence_enrollments (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sequence_id     VARCHAR(64) NOT NULL REFERENCES crm_sequences(id) ON DELETE CASCADE,
  entity_type     VARCHAR(16) NOT NULL,
  entity_id       VARCHAR(64) NOT NULL,
  current_step    INTEGER NOT NULL DEFAULT 0,
  next_run_at     TIMESTAMPTZ,
  status          VARCHAR(16) NOT NULL DEFAULT 'active',   -- active | completed | stopped
  last_detail     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sequence_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_seq_due ON crm_sequence_enrollments (organization_id, status, next_run_at);

-- Automation rules (table exists from the legacy migration) ---------------------------------------------------------------
ALTER TABLE crm_automation_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_crm_automation_rules_event ON crm_automation_rules (organization_id, trigger_event, is_active);
