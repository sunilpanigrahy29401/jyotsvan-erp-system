-- 0006_crm_core: CRM step 1 (lead core). Additive and idempotent.
-- Adds: race-free numbering, normalised phone/email for duplicate detection, archive (soft delete) and merge support,
-- configurable scoring / auto-assignment / SLA rules, and an import audit trail.

-- Atomic per-tenant counters (replaces COUNT(*)+1, which collides under concurrency and after deletes).
CREATE TABLE IF NOT EXISTS crm_counters (
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(64) NOT NULL,
  value           BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, name)
);

-- Leads -----------------------------------------------------------------------------------------------------------
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS phone_norm VARCHAR(32);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS email_norm VARCHAR(255);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS archived_by VARCHAR(64);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS merged_into_id VARCHAR(64);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(64);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone_norm ON crm_leads (organization_id, phone_norm) WHERE phone_norm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_email_norm ON crm_leads (organization_id, email_norm) WHERE email_norm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_sla ON crm_leads (organization_id, sla_due_at) WHERE first_response_at IS NULL AND archived_at IS NULL;

UPDATE crm_leads SET phone_norm = RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10)
 WHERE phone_norm IS NULL AND phone IS NOT NULL AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 7;
UPDATE crm_leads SET email_norm = LOWER(TRIM(email)) WHERE email_norm IS NULL AND email IS NOT NULL AND TRIM(email) <> '';

-- Contacts / accounts ---------------------------------------------------------------------------------------------
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS phone_norm VARCHAR(32);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS email_norm VARCHAR(255);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_phone_norm ON crm_contacts (organization_id, phone_norm) WHERE phone_norm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email_norm ON crm_contacts (organization_id, email_norm) WHERE email_norm IS NOT NULL;
UPDATE crm_contacts SET phone_norm = RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10)
 WHERE phone_norm IS NULL AND phone IS NOT NULL AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 7;
UPDATE crm_contacts SET email_norm = LOWER(TRIM(email)) WHERE email_norm IS NULL AND email IS NOT NULL AND TRIM(email) <> '';

ALTER TABLE crm_accounts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE crm_accounts ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_crm_accounts_gstin ON crm_accounts (organization_id, UPPER(gstin)) WHERE gstin IS NOT NULL;

ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Scoring rules: points added when a field matches. lead_score = clamp(base + sum(points), 0, 100) ----------------------
CREATE TABLE IF NOT EXISTS crm_scoring_rules (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(128) NOT NULL,
  field           VARCHAR(64) NOT NULL,
  operator        VARCHAR(16) NOT NULL,          -- eq | ne | gte | lte | contains | present | absent
  value           VARCHAR(255),
  points          INTEGER NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_scoring_rules_org ON crm_scoring_rules (organization_id, is_active);

-- Assignment rules: first matching rule (lowest priority number) picks the owner by strategy ---------------------------
CREATE TABLE IF NOT EXISTS crm_assignment_rules (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(128) NOT NULL,
  strategy        VARCHAR(16) NOT NULL,          -- round_robin | load_based | fixed
  priority        INTEGER NOT NULL DEFAULT 100,
  conditions      JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {source_id, territory, state, relationship_type}
  employee_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,
  rr_cursor       INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_assignment_rules_org ON crm_assignment_rules (organization_id, is_active, priority);

-- First-response SLA per lead priority -------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_sla_policies (
  id                      VARCHAR(64) PRIMARY KEY,
  organization_id         VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  priority                VARCHAR(32) NOT NULL,
  first_response_minutes  INTEGER NOT NULL CHECK (first_response_minutes > 0),
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (organization_id, priority)
);

-- Merge trail (a snapshot allows manual recovery) --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_merge_log (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity          VARCHAR(32) NOT NULL,
  survivor_id     VARCHAR(64) NOT NULL,
  merged_id       VARCHAR(64) NOT NULL,
  snapshot        JSONB NOT NULL,
  merged_by       VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_merge_log_org ON crm_merge_log (organization_id, created_at DESC);

-- Import history ---------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_import_batches (
  id              VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity          VARCHAR(32) NOT NULL,
  filename        VARCHAR(255),
  mode            VARCHAR(16) NOT NULL,          -- skip | update
  total_rows      INTEGER NOT NULL DEFAULT 0,
  created_rows    INTEGER NOT NULL DEFAULT 0,
  updated_rows    INTEGER NOT NULL DEFAULT 0,
  duplicate_rows  INTEGER NOT NULL DEFAULT 0,
  failed_rows     INTEGER NOT NULL DEFAULT 0,
  errors          JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_import_batches_org ON crm_import_batches (organization_id, created_at DESC);

-- Counters start above any existing number so new numbers never collide with old ones -------------------------------
INSERT INTO crm_counters (organization_id, name, value)
SELECT organization_id, 'lead', COALESCE(MAX(NULLIF(REGEXP_REPLACE(lead_number, '^.*-', ''), '')::BIGINT), 0) FROM crm_leads
 WHERE lead_number ~ '-[0-9]+$' GROUP BY organization_id
ON CONFLICT (organization_id, name) DO NOTHING;
INSERT INTO crm_counters (organization_id, name, value)
SELECT organization_id, 'account', COALESCE(MAX(NULLIF(REGEXP_REPLACE(account_number, '^.*-', ''), '')::BIGINT), 0) FROM crm_accounts
 WHERE account_number ~ '-[0-9]+$' GROUP BY organization_id
ON CONFLICT (organization_id, name) DO NOTHING;
INSERT INTO crm_counters (organization_id, name, value)
SELECT organization_id, 'deal', COALESCE(MAX(NULLIF(REGEXP_REPLACE(deal_number, '^.*-', ''), '')::BIGINT), 0) FROM crm_deals
 WHERE deal_number ~ '-[0-9]+$' GROUP BY organization_id
ON CONFLICT (organization_id, name) DO NOTHING;
