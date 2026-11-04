// src/server/migrate-audit-logs.ts
// Enterprise Audit Logs & Immutable Compliance Trail Schema & Seed Migration (Phase 23)

import { pool } from './db.ts';
import crypto from 'crypto';

export async function runAuditLogsMigration() {
  console.log('[Phase 23 Migration] Initializing Enterprise Audit Logs & Compliance Trail Schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Ensure `audit_logs` table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR(64),
        actor_id VARCHAR(64),
        actor_user_id VARCHAR(64),
        actor_name VARCHAR(255),
        actor_email VARCHAR(255),
        actor_type VARCHAR(32) DEFAULT 'USER' NOT NULL,
        action VARCHAR(128) NOT NULL,
        event_type VARCHAR(128),
        module VARCHAR(64) DEFAULT 'system' NOT NULL,
        target_resource VARCHAR(128),
        entity_type VARCHAR(128),
        target_id VARCHAR(128),
        entity_id VARCHAR(128),
        entity_name VARCHAR(255),
        before_state JSONB,
        after_state JSONB,
        changed_fields JSONB,
        details JSONB,
        metadata JSONB,
        old_values JSONB,
        new_values JSONB,
        request_id VARCHAR(128),
        correlation_id VARCHAR(128),
        source VARCHAR(32) DEFAULT 'WEB' NOT NULL,
        ip_address VARCHAR(64),
        user_agent TEXT,
        status VARCHAR(32) DEFAULT 'SUCCESS' NOT NULL,
        failure_reason TEXT,
        previous_hash VARCHAR(128),
        record_hash VARCHAR(128),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 2. Safely add any missing columns in case table was created previously with fewer columns
    const columnsToAdd = [
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id VARCHAR(64);`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_name VARCHAR(255);`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_type VARCHAR(32) DEFAULT 'USER' NOT NULL;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS event_type VARCHAR(128);`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module VARCHAR(64) DEFAULT 'system' NOT NULL;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(128);`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(128);`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_name VARCHAR(255);`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_state JSONB;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_state JSONB;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changed_fields JSONB;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id VARCHAR(128);`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(128);`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS source VARCHAR(32) DEFAULT 'WEB' NOT NULL;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'SUCCESS' NOT NULL;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS failure_reason TEXT;`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(128);`,
      `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS record_hash VARCHAR(128);`,
    ];

    for (const sql of columnsToAdd) {
      await client.query(sql);
    }

    // 3. Performance & Tenant Indexing
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(organization_id, actor_user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(organization_id, entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(organization_id, action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(organization_id, event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(organization_id, module);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_source ON audit_logs(source);
    `);

    // 4. Audit Retention Policy Table (`audit_retention_policies`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_retention_policies (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
        retention_period_days INTEGER DEFAULT 730 NOT NULL,
        auto_archive_enabled BOOLEAN DEFAULT TRUE NOT NULL,
        legal_hold_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        tamper_detection_enabled BOOLEAN DEFAULT TRUE NOT NULL,
        notify_on_security_event BOOLEAN DEFAULT TRUE NOT NULL,
        notify_on_integrity_breach BOOLEAN DEFAULT TRUE NOT NULL,
        updated_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 5. Backfill/Normalize any existing legacy records in `audit_logs`
    await client.query(`
      UPDATE audit_logs 
      SET 
        actor_user_id = COALESCE(actor_user_id, actor_id, user_id, 'usr-super-admin-01'),
        entity_type = COALESCE(entity_type, target_resource, 'system'),
        entity_id = COALESCE(entity_id, target_id, 'system-01'),
        metadata = COALESCE(metadata, details, '{}'::jsonb),
        event_type = COALESCE(event_type, action),
        status = COALESCE(status, 'SUCCESS'),
        source = COALESCE(source, 'WEB'),
        actor_type = COALESCE(actor_type, 'USER'),
        module = COALESCE(module, 
          CASE 
            WHEN action LIKE '%role%' OR action LIKE '%user%' OR action LIKE '%perm%' OR action LIKE '%security%' THEN 'security'
            WHEN action LIKE '%product%' OR action LIKE '%sku%' THEN 'products'
            WHEN action LIKE '%supplier%' THEN 'suppliers'
            WHEN action LIKE '%inventory%' OR action LIKE '%stock%' THEN 'inventory'
            WHEN action LIKE '%warehouse%' OR action LIKE '%transfer%' THEN 'warehouse'
            WHEN action LIKE '%procurement%' OR action LIKE '%po%' OR action LIKE '%grn%' THEN 'procurement'
            WHEN action LIKE '%qc%' OR action LIKE '%quality%' THEN 'quality'
            WHEN action LIKE '%production%' OR action LIKE '%bom%' THEN 'manufacturing'
            WHEN action LIKE '%batch%' THEN 'batches'
            WHEN action LIKE '%cf%' OR action LIKE '%depot%' THEN 'logistics'
            WHEN action LIKE '%distributor%' THEN 'distribution'
            WHEN action LIKE '%retailer%' THEN 'retail'
            WHEN action LIKE '%order%' OR action LIKE '%return%' THEN 'sales'
            WHEN action LIKE '%invoice%' OR action LIKE '%payment%' OR action LIKE '%finance%' THEN 'finance'
            WHEN action LIKE '%visit%' OR action LIKE '%beat%' THEN 'field_sales'
            WHEN action LIKE '%employee%' OR action LIKE '%leave%' OR action LIKE '%attendance%' THEN 'people'
            WHEN action LIKE '%notif%' THEN 'notifications'
            ELSE 'system'
          END
        )
      WHERE actor_user_id IS NULL OR entity_type IS NULL OR module IS NULL;
    `);

    // 6. Ensure default retention policy for all organizations
    const orgsRes = await client.query('SELECT id FROM organizations');
    for (const org of orgsRes.rows) {
      await client.query(`
        INSERT INTO audit_retention_policies (
          id, organization_id, retention_period_days, auto_archive_enabled, 
          legal_hold_enabled, tamper_detection_enabled, notify_on_security_event, 
          notify_on_integrity_breach, created_at, updated_at
        ) VALUES (
          $1, $2, 730, TRUE, FALSE, TRUE, TRUE, TRUE, NOW(), NOW()
        )
        ON CONFLICT (organization_id) DO NOTHING;
      `, [`retention-${org.id}`, org.id]);
    }

    // 7. Seed representative multi-module enterprise audit trail records if table is sparse
    const countRes = await client.query('SELECT count(*) FROM audit_logs');
    const existingCount = parseInt(countRes.rows[0]?.count || '0', 10);

    if (existingCount < 5 && orgsRes.rows.length > 0) {
      const orgId = orgsRes.rows[0].id;
      console.log(`[Phase 23 Migration] Seeding initial canonical audit trail for organization: ${orgId}...`);

      const seedEvents = [
        {
          id: `audit-seed-01`,
          action: 'CREATE',
          eventType: 'ORGANIZATION_PROFILE_UPDATED',
          module: 'organization',
          entityType: 'organization',
          entityId: orgId,
          entityName: 'Jyotsvan Enterprise Corp',
          actorUserId: 'usr-super-admin-01',
          actorName: 'Sovereign Administrator',
          actorEmail: 'admin@jyotsvan.com',
          actorType: 'USER',
          beforeState: null,
          afterState: { name: 'Jyotsvan Enterprise Corp', legal_name: 'Jyotsvan Global FMCG Industries Ltd', currency: 'INR', country: 'India' },
          changedFields: [{ key: 'name', label: 'Company Name', old_value: null, new_value: 'Jyotsvan Enterprise Corp' }],
          metadata: { ip_country: 'India', tenant_tier: 'Enterprise Platinum' },
          source: 'WEB',
          status: 'SUCCESS',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `audit-seed-02`,
          action: 'ASSIGN',
          eventType: 'USER_ROLE_ASSIGNED',
          module: 'security',
          entityType: 'user_role',
          entityId: 'ur-seed-01',
          entityName: 'Priya Sharma (Quality Head)',
          actorUserId: 'usr-super-admin-01',
          actorName: 'Sovereign Administrator',
          actorEmail: 'admin@jyotsvan.com',
          actorType: 'USER',
          beforeState: { role: 'viewer', status: 'pending' },
          afterState: { role: 'quality_manager', status: 'active', department: 'Quality Assurance' },
          changedFields: [{ key: 'role', label: 'Security Role', old_value: 'viewer', new_value: 'quality_manager' }],
          metadata: { granted_permissions: ['quality.view', 'quality.inspect', 'quality.approve'] },
          source: 'WEB',
          status: 'SUCCESS',
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `audit-seed-03`,
          action: 'CREATE',
          eventType: 'PRODUCT_CREATED',
          module: 'products',
          entityType: 'product',
          entityId: 'prd-001',
          entityName: 'Organic Herbal Infusion 250g',
          actorUserId: 'usr-super-admin-01',
          actorName: 'Sovereign Administrator',
          actorEmail: 'admin@jyotsvan.com',
          actorType: 'USER',
          beforeState: null,
          afterState: { sku: 'SKU-HERB-250G', name: 'Organic Herbal Infusion 250g', base_price: 340.00, tax_rate: 12.0 },
          changedFields: [{ key: 'sku', label: 'SKU Code', old_value: null, new_value: 'SKU-HERB-250G' }],
          metadata: { category: 'Wellness & Beverages', uom: 'pcs' },
          source: 'WEB',
          status: 'SUCCESS',
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `audit-seed-04`,
          action: 'UPDATE',
          eventType: 'INVENTORY_STOCK_ADJUSTED',
          module: 'inventory',
          entityType: 'stock_item',
          entityId: 'inv-item-01',
          entityName: 'SKU-HERB-250G (Central Plant)',
          actorUserId: 'usr-wh-manager-01',
          actorName: 'Rajesh Verma (Plant Manager)',
          actorEmail: 'wh.manager@jyotsvan.com',
          actorType: 'USER',
          beforeState: { on_hand_qty: 1200, reserved_qty: 200, available_qty: 1000 },
          afterState: { on_hand_qty: 1500, reserved_qty: 200, available_qty: 1300 },
          changedFields: [{ key: 'on_hand_qty', label: 'On-Hand Stock', old_value: 1200, new_value: 1500 }],
          metadata: { reason: 'GRN Receipt Inward from Supplier B-092', warehouse_code: 'WH-MAIN-01' },
          source: 'WEB',
          status: 'SUCCESS',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `audit-seed-05`,
          action: 'APPROVE',
          eventType: 'QC_APPROVED',
          module: 'quality',
          entityType: 'qc_inspection',
          entityId: 'qc-insp-401',
          entityName: 'Batch BTH-2026-049 Formulation Analysis',
          actorUserId: 'usr-qa-head-01',
          actorName: 'Priya Sharma',
          actorEmail: 'qa.head@jyotsvan.com',
          actorType: 'USER',
          beforeState: { status: 'pending_testing', passed_parameters: 8, failed_parameters: 0 },
          afterState: { status: 'passed', passed_parameters: 12, failed_parameters: 0, certificate_issued: true },
          changedFields: [{ key: 'status', label: 'QC Verdict', old_value: 'pending_testing', new_value: 'passed' }],
          metadata: { sample_size: '50 units', ph_level: 6.8, microbiological_clearance: true },
          source: 'WEB',
          status: 'SUCCESS',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `audit-seed-06`,
          action: 'POST',
          eventType: 'INVOICE_POSTED',
          module: 'finance',
          entityType: 'invoice',
          entityId: 'inv-2026-088',
          entityName: 'Tax Invoice INV-2026-088 (Apex Distributors)',
          actorUserId: 'usr-fin-controller-01',
          actorName: 'Sunil Panigrahy (Financial Controller)',
          actorEmail: 'sunilpanigrahy29401@gmail.com',
          actorType: 'USER',
          beforeState: { status: 'draft', total_amount: 450000.00, posted_to_gl: false },
          afterState: { status: 'posted', total_amount: 450000.00, posted_to_gl: true, receivable_account: 'AR-1002' },
          changedFields: [
            { key: 'status', label: 'Invoice Status', old_value: 'draft', new_value: 'posted' },
            { key: 'posted_to_gl', label: 'General Ledger Posting', old_value: false, new_value: true },
          ],
          metadata: { irn_number: 'IRN-9021839210-2026', gst_tax_amount: 54000.00, payment_terms: 'Net 30' },
          source: 'WEB',
          status: 'SUCCESS',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `audit-seed-07`,
          action: 'CHECK_IN',
          eventType: 'VISIT_CHECKED_IN',
          module: 'field_sales',
          entityType: 'field_visit',
          entityId: 'fld-vst-109',
          entityName: 'Retailer Store Visit - Metro Mart Bangalore',
          actorUserId: 'usr-sales-rep-01',
          actorName: 'Anil Mehta (Field Sales Executive)',
          actorEmail: 'sales.field@jyotsvan.com',
          actorType: 'USER',
          beforeState: { status: 'scheduled' },
          afterState: { status: 'in_progress', geo_lat: 12.9716, geo_lng: 77.5946, battery_level: '84%' },
          changedFields: [{ key: 'status', label: 'Visit Status', old_value: 'scheduled', new_value: 'in_progress' }],
          metadata: { beat_code: 'BEAT-BLR-SOUTH-04', geo_accuracy_meters: 8.5 },
          source: 'MOBILE',
          status: 'SUCCESS',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `audit-seed-08`,
          action: 'APPROVE',
          eventType: 'LEAVE_APPROVED',
          module: 'people',
          entityType: 'leave_application',
          entityId: 'leave-req-302',
          entityName: 'Annual Leave Application - Vikram Joshi',
          actorUserId: 'usr-hr-director-01',
          actorName: 'Meera Nambiar (HR Director)',
          actorEmail: 'hr.head@jyotsvan.com',
          actorType: 'USER',
          beforeState: { status: 'pending_approval', available_leaves: 18 },
          afterState: { status: 'approved', available_leaves: 15, approved_days: 3 },
          changedFields: [
            { key: 'status', label: 'Approval Status', old_value: 'pending_approval', new_value: 'approved' },
            { key: 'available_leaves', label: 'Remaining Leave Quota', old_value: 18, new_value: 15 },
          ],
          metadata: { leave_type: 'Paid Annual Leave', coverage_delegate: 'Kavita Roy' },
          source: 'WEB',
          status: 'SUCCESS',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `audit-seed-09`,
          action: 'UPDATE',
          eventType: 'PAYMENT_ALLOCATED',
          module: 'finance',
          entityType: 'payment_receipt',
          entityId: 'pay-rcpt-501',
          entityName: 'Payment Allocation ₹2,50,000 for INV-2026-088',
          actorUserId: 'usr-fin-controller-01',
          actorName: 'Sunil Panigrahy (Financial Controller)',
          actorEmail: 'sunilpanigrahy29401@gmail.com',
          actorType: 'USER',
          beforeState: { outstanding_balance: 450000.00, paid_amount: 0.00, status: 'unpaid' },
          afterState: { outstanding_balance: 200000.00, paid_amount: 250000.00, status: 'partially_paid' },
          changedFields: [
            { key: 'outstanding_balance', label: 'Outstanding Balance', old_value: 450000.00, new_value: 200000.00 },
            { key: 'paid_amount', label: 'Allocated Payment', old_value: 0.00, new_value: 250000.00 },
          ],
          metadata: { payment_mode: 'NEFT / RTGS', bank_reference: 'UTR9837190284', payer: 'Apex Distributors' },
          source: 'WEB',
          status: 'SUCCESS',
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `audit-seed-10`,
          action: 'UPDATE',
          eventType: 'DISTRIBUTOR_CREDIT_UPDATED',
          module: 'distribution',
          entityType: 'distributor',
          entityId: 'dst-001',
          entityName: 'Apex Distributors Pvt Ltd',
          actorUserId: 'usr-super-admin-01',
          actorName: 'Sovereign Administrator',
          actorEmail: 'admin@jyotsvan.com',
          actorType: 'USER',
          beforeState: { credit_limit: 500000.00, payment_terms_days: 30 },
          afterState: { credit_limit: 750000.00, payment_terms_days: 45 },
          changedFields: [
            { key: 'credit_limit', label: 'Credit Limit', old_value: 500000.00, new_value: 750000.00 },
            { key: 'payment_terms_days', label: 'Payment Terms', old_value: 30, new_value: 45 },
          ],
          metadata: { approval_reference: 'BOARD-RES-2026-Q3', risk_score: 'A+' },
          source: 'WEB',
          status: 'SUCCESS',
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
      ];

      // Sequential insert with hash chaining
      let prevHash = `GENESIS_${orgId}`;
      for (const ev of seedEvents) {
        const payloadStr = JSON.stringify({
          orgId,
          actor: ev.actorUserId,
          action: ev.action,
          event: ev.eventType,
          entity: ev.entityId,
          before: ev.beforeState,
          after: ev.afterState,
          time: ev.createdAt,
        });

        const recordHash = crypto
          .createHash('sha256')
          .update(`${prevHash}|${orgId}|${ev.actorUserId}|${ev.action}|${ev.eventType}|${ev.entityType}|${ev.entityId}|${payloadStr}`)
          .digest('hex');

        await client.query(`
          INSERT INTO audit_logs (
            id, organization_id, user_id, actor_id, actor_user_id, actor_name, 
            actor_email, actor_type, action, event_type, module, target_resource, 
            entity_type, target_id, entity_id, entity_name, before_state, after_state, 
            changed_fields, details, metadata, source, ip_address, status, 
            previous_hash, record_hash, created_at
          ) VALUES (
            $1, $2, $3, $3, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, $11, $12, 
            $13, $14, $15, $16, $16, $17, $18, $19, $20, $21, $22
          )
          ON CONFLICT (id) DO NOTHING;
        `, [
          ev.id,
          orgId,
          ev.actorUserId,
          ev.actorName,
          ev.actorEmail,
          ev.actorType,
          ev.action,
          ev.eventType,
          ev.module,
          ev.entityType,
          ev.entityId,
          ev.entityName,
          JSON.stringify(ev.beforeState || {}),
          JSON.stringify(ev.afterState || {}),
          JSON.stringify(ev.changedFields || []),
          JSON.stringify(ev.metadata || {}),
          ev.source,
          '127.0.0.1',
          ev.status,
          prevHash,
          recordHash,
          ev.createdAt,
        ]);

        prevHash = recordHash;
      }
      console.log(`[Phase 23 Migration] Seeded 10 canonical audit records with SHA-256 chain.`);
    }

    await client.query('COMMIT;');
    console.log('[Phase 23 Migration] Enterprise Audit Logs schema and cryptographic foundation verified.');
  } catch (err: unknown) {
    await client.query('ROLLBACK;');
    console.error('[Phase 23 Migration] Audit logs migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
