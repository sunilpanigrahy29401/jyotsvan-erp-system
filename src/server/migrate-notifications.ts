// src/server/migrate-notifications.ts
// Enterprise Central Notification Engine Schema & Seed Migration (Phase 22)

import { pool } from './db.ts';
import { NOTIFICATION_TEMPLATES } from './notification-templates.ts';

export async function runNotificationsMigration() {
  console.log('[Phase 22 Migration] Initializing Central Notification Engine Schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Notifications Table (`notifications`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        recipient_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(32) DEFAULT 'normal' NOT NULL,
        category VARCHAR(64) DEFAULT 'system' NOT NULL,
        entity_type VARCHAR(64),
        entity_id VARCHAR(128),
        action_url VARCHAR(255),
        action_type VARCHAR(64) DEFAULT 'navigate' NOT NULL,
        action_payload JSONB DEFAULT '{}'::jsonb,
        action_status VARCHAR(32) DEFAULT 'pending' NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        idempotency_key VARCHAR(255) UNIQUE,
        read_at TIMESTAMPTZ,
        archived_at TIMESTAMPTZ,
        delivery_status VARCHAR(32) DEFAULT 'delivered' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_user_id VARCHAR(64);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(64) DEFAULT 'system';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT '';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(32) DEFAULT 'normal';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(64) DEFAULT 'system';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(64);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id VARCHAR(128);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(255);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_type VARCHAR(64) DEFAULT 'navigate';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_payload JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_status VARCHAR(32) DEFAULT 'pending';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(32) DEFAULT 'delivered';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    // Performance Indexes on `notifications`
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_org_read ON notifications(recipient_user_id, organization_id, read_at, archived_at, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
      CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
      CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
      CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
    `);

    // 2. Notification Preferences Table (`notification_preferences`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type VARCHAR(64) NOT NULL,
        category VARCHAR(64) NOT NULL,
        in_app_enabled BOOLEAN DEFAULT TRUE NOT NULL,
        email_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        whatsapp_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        sms_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        push_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        min_priority VARCHAR(32) DEFAULT 'low' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_user_notif_pref UNIQUE (organization_id, user_id, notification_type)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON notification_preferences(user_id, organization_id);
    `);

    // 3. Category Preferences Table (`notification_category_preferences`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_category_preferences (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(64) NOT NULL,
        in_app_enabled BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT uk_user_cat_pref UNIQUE (organization_id, user_id, category)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notif_cat_pref_user ON notification_category_preferences(user_id, organization_id);
    `);

    // 4. Notification Outbox Table (`notification_outbox`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_outbox (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        event_type VARCHAR(64) NOT NULL,
        entity_type VARCHAR(64) NOT NULL,
        entity_id VARCHAR(128) NOT NULL,
        actor_user_id VARCHAR(64),
        payload JSONB DEFAULT '{}'::jsonb NOT NULL,
        idempotency_key VARCHAR(255),
        status VARCHAR(32) DEFAULT 'pending' NOT NULL,
        retry_count INTEGER DEFAULT 0 NOT NULL,
        error_message TEXT,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notif_outbox_status ON notification_outbox(status, created_at ASC);
    `);

    // 5. Seed Permissions for Notifications
    const notificationPermissions = [
      { id: 'perm-notif-01', code: 'notifications.view', module: 'notifications', description: 'View personal notifications and notification center' },
      { id: 'perm-notif-02', code: 'notifications.mark_read', module: 'notifications', description: 'Mark notifications as read or unread' },
      { id: 'perm-notif-03', code: 'notifications.archive', module: 'notifications', description: 'Archive and dismiss notifications' },
      { id: 'perm-notif-04', code: 'notifications.manage_preferences', module: 'notifications', description: 'Configure personal and channel notification preferences' },
      { id: 'perm-notif-05', code: 'notifications.manage_templates', module: 'notifications', description: 'Manage organization notification templates' },
      { id: 'perm-notif-06', code: 'notifications.manage_rules', module: 'notifications', description: 'Configure notification routing and recipient rules' },
    ];

    for (const p of notificationPermissions) {
      await client.query(
        `INSERT INTO permissions (id, code, module, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module`,
        [p.id, p.code, p.module, p.description]
      );
    }

    // Grant notification view/read/archive/preferences to all roles
    const rolesRes = await client.query(`SELECT id, slug FROM roles`);
    for (const r of rolesRes.rows) {
      for (const p of notificationPermissions) {
        // All roles get view, mark_read, archive, manage_preferences
        if (p.code.startsWith('notifications.manage_templates') || p.code.startsWith('notifications.manage_rules')) {
          if (r.slug !== 'super_admin' && r.slug !== 'management') {
            continue;
          }
        }
        await client.query(
          `INSERT INTO role_permissions (id, role_id, permission_id, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [`rp-${r.slug}-${p.id}`, r.id, p.id]
        );
      }
    }

    // 6. Seed Default Category Preferences for Existing Users
    const usersRes = await client.query(`SELECT id, organization_id FROM users`);
    const categories = [
      'system',
      'business',
      'sales',
      'finance',
      'inventory',
      'procurement',
      'manufacturing',
      'quality',
      'warehouse',
      'distribution',
      'field_sales',
      'people',
      'security',
    ];

    for (const u of usersRes.rows) {
      for (const cat of categories) {
        const prefId = `ncp-${u.id}-${cat}`;
        await client.query(
          `INSERT INTO notification_category_preferences (id, organization_id, user_id, category, in_app_enabled, created_at, updated_at)
           VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
           ON CONFLICT (organization_id, user_id, category) DO NOTHING`,
          [prefId, u.organization_id, u.id, cat]
        );
      }
    }

    // 7. Seed Initial Comprehensive Notifications for All Key Personas
    // (Ensure users have rich, actionable, high-priority, unread, and historical notifications across Procurement, QC, Production, Warehouse, Sales, Finance, People)
    const orgId = 'org-jyotsvan-corp';
    const sampleNotifications = [
      // Super Admin / Management
      {
        id: 'ntf-seed-01',
        recipientUserId: 'usr-super-admin',
        type: 'PURCHASE_REQUEST_PENDING_APPROVAL',
        title: 'Purchase Requisition PR-2026-089 Requires Approval',
        message: 'Eleanor Vance submitted requisition PR-2026-089 for Operations valued at INR 2,45,000.00.',
        priority: 'high',
        category: 'procurement',
        entityType: 'purchase_requisition',
        entityId: 'pr-2026-089',
        actionUrl: '/operations/procurement/requisitions?id=pr-2026-089',
        actionType: 'approve_reject',
        actionPayload: { pr_id: 'pr-2026-089', total_amount: 245000 },
        readAt: null,
      },
      {
        id: 'ntf-seed-02',
        recipientUserId: 'usr-super-admin',
        type: 'LEAVE_REQUESTED',
        title: 'Leave Request from Rajesh Sharma (3 Days)',
        message: 'Rajesh Sharma requested Casual Leave from 2026-03-24 to 2026-03-26. Reason: Family event.',
        priority: 'high',
        category: 'people',
        entityType: 'leave_request',
        entityId: 'lr-2026-001',
        actionUrl: '/people/leave?id=lr-2026-001',
        actionType: 'approve_reject',
        actionPayload: { leave_id: 'lr-2026-001', employee_id: 'emp-jyot-002' },
        readAt: null,
      },
      {
        id: 'ntf-seed-03',
        recipientUserId: 'usr-super-admin',
        type: 'QC_REJECTED',
        title: 'QC Out of Specification: Batch BTH-2026-042 Failed',
        message: 'Batch BTH-2026-042 failed parameter inspection (Viscosity exceeding upper specification limit). Material moved to quarantine hold.',
        priority: 'critical',
        category: 'quality',
        entityType: 'quality_inspection',
        entityId: 'qc-insp-001',
        actionUrl: '/operations/quality?inspection=qc-insp-001',
        actionType: 'review',
        actionPayload: { inspection_id: 'qc-insp-001', batch_number: 'BTH-2026-042' },
        readAt: null,
      },
      {
        id: 'ntf-seed-04',
        recipientUserId: 'usr-super-admin',
        type: 'LOW_STOCK',
        title: 'Low Stock Alert: Organic Lavender Essential Oil (SKU-RM-LAV-01)',
        message: 'Current inventory (18.50 L) is below minimum reorder point (50.00 L) at Central Depot.',
        priority: 'high',
        category: 'inventory',
        entityType: 'inventory_item',
        entityId: 'sku-rm-lav-01',
        actionUrl: '/operations/inventory?sku=sku-rm-lav-01',
        actionType: 'review',
        actionPayload: { sku_id: 'sku-rm-lav-01' },
        readAt: null,
      },
      {
        id: 'ntf-seed-05',
        recipientUserId: 'usr-super-admin',
        type: 'SALES_ORDER_PENDING_APPROVAL',
        title: 'Sales Order SO-2026-104 Pending Commercial Sign-off',
        message: 'Order SO-2026-104 for Apex Distribution Pvt Ltd valued at INR 3,85,000.00 requires credit review.',
        priority: 'high',
        category: 'sales',
        entityType: 'sales_order',
        entityId: 'so-2026-104',
        actionUrl: '/finance/orders?id=so-2026-104',
        actionType: 'approve_reject',
        actionPayload: { order_id: 'so-2026-104', total_amount: 385000 },
        readAt: null,
      },
      {
        id: 'ntf-seed-06',
        recipientUserId: 'usr-super-admin',
        type: 'INVOICE_OVERDUE',
        title: 'Overdue Invoice: INV-2026-018 (14 Days Past Due)',
        message: 'Metro Pharmacy Chain has an outstanding balance of INR 1,12,500.00 due on 2026-03-06.',
        priority: 'high',
        category: 'finance',
        entityType: 'invoice',
        entityId: 'inv-2026-018',
        actionUrl: '/finance/invoices?id=inv-2026-018',
        actionType: 'review',
        actionPayload: { invoice_id: 'inv-2026-018', outstanding: 112500 },
        readAt: null,
      },
      {
        id: 'ntf-seed-07',
        recipientUserId: 'usr-super-admin',
        type: 'SECURITY_NEW_LOGIN',
        title: 'Security Alert: New Sign-in from 192.168.1.104',
        message: 'A new session was established on 2026-03-20 09:30:00 from Chrome on macOS.',
        priority: 'normal',
        category: 'security',
        entityType: 'audit_log',
        entityId: 'audit-001',
        actionUrl: '/settings/audit-logs',
        actionType: 'navigate',
        readAt: '2026-03-20T09:35:00.000Z',
      },
      {
        id: 'ntf-seed-08',
        recipientUserId: 'usr-super-admin',
        type: 'SYSTEM_BACKUP_COMPLETED',
        title: 'System Backup Snapshot Created Successfully',
        message: 'Automated PostgreSQL database snapshot completed on 2026-03-20 04:00:00 (Size: 42.8 MB).',
        priority: 'low',
        category: 'system',
        entityType: 'system_log',
        entityId: 'backup-001',
        actionUrl: '/settings',
        actionType: 'navigate',
        readAt: '2026-03-20T08:00:00.000Z',
      },
    ];

    for (const n of sampleNotifications) {
      await client.query(
        `INSERT INTO notifications (
           id, organization_id, recipient_user_id, notification_type, title, message,
           priority, category, entity_type, entity_id, action_url, action_type, action_payload,
           action_status, read_at, delivery_status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14, 'delivered', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          n.id,
          orgId,
          n.recipientUserId,
          n.type,
          n.title,
          n.message,
          n.priority,
          n.category,
          n.entityType,
          n.entityId,
          n.actionUrl,
          n.actionType,
          JSON.stringify(n.actionPayload || {}),
          n.readAt,
        ]
      );
    }

    await client.query('COMMIT;');
    console.log('[Phase 22 Migration] Central Notification Engine initialized and synchronized.');
  } catch (err) {
    try {
      await client.query('ROLLBACK;');
    } catch {}
    console.error('[Phase 22 Migration] Central Notification Engine migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
