// src/server/notification-service.ts
// Enterprise Central Notification Service (Phase 22)

import { pool } from './db.ts';
import type {
  BusinessEvent,
  NotificationEntity,
  NotificationPriority,
  NotificationCategory,
  NotificationActionType,
  NotificationActionStatus,
  NotificationQueryParams,
  NotificationPreference,
  NotificationCategoryPreference,
  NotificationMetrics,
} from '../types/notifications.ts';
import { NOTIFICATION_TEMPLATES, renderTemplate } from './notification-templates.ts';

// Real-time SSE / event listener registry
type SSEClient = {
  id: string;
  userId: string;
  orgId: string;
  send: (data: string) => void;
};

export class NotificationService {
  private static sseClients: Map<string, SSEClient> = new Map();

  // Register real-time SSE listener
  public static registerSSEClient(id: string, userId: string, orgId: string, send: (data: string) => void) {
    this.sseClients.set(id, { id, userId, orgId, send });
  }

  public static unregisterSSEClient(id: string) {
    this.sseClients.delete(id);
  }

  // Push real-time event to user clients
  public static broadcastToUser(userId: string, orgId: string, event: { type: string; payload: any }) {
    const raw = JSON.stringify(event);
    for (const client of this.sseClients.values()) {
      if (client.userId === userId && client.orgId === orgId) {
        try {
          client.send(`data: ${raw}\n\n`);
        } catch (err) {
          console.warn('[NotificationService] SSE dispatch error:', err);
        }
      }
    }
  }

  // Helper to log audit events
  private static async logAudit(
    client: any,
    orgId: string,
    actorId: string,
    actorEmail: string,
    action: string,
    targetResource: string,
    targetId: string,
    details?: any
  ) {
    try {
      const id = `audit-notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await client.query(
        `INSERT INTO audit_logs (id, organization_id, actor_id, actor_email, action, target_resource, target_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [id, orgId, actorId || 'system', actorEmail || 'system@jyotsvan.enterprise', action, targetResource, targetId, details ? JSON.stringify(details) : null]
      );
    } catch (err) {
      console.warn('[NotificationService] Audit log warning:', err);
    }
  }

  /**
   * 1. Core Event-Driven Publishing & Outbox Entry
   */
  public static async publishEvent(event: BusinessEvent): Promise<{ outboxId: string; deliveredCount: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const outboxId = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const idempotencyKey = event.idempotencyKey || `${event.organizationId}:${event.eventType}:${event.entityType}:${event.entityId}:${Date.now()}`;

      // Insert into Outbox for reliability & transaction safety
      await client.query(
        `INSERT INTO notification_outbox (
           id, organization_id, event_type, entity_type, entity_id,
           actor_user_id, payload, idempotency_key, status, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())`,
        [
          outboxId,
          event.organizationId,
          event.eventType,
          event.entityType,
          event.entityId,
          event.actorUserId || null,
          JSON.stringify(event.payload || {}),
          idempotencyKey,
        ]
      );

      // Process event immediately in the same transaction
      const deliveredCount = await this.processEventInternal(client, event);

      // Mark outbox item processed
      await client.query(
        `UPDATE notification_outbox
         SET status = 'processed', processed_at = NOW()
         WHERE id = $1`,
        [outboxId]
      );

      await client.query('COMMIT;');
      return { outboxId, deliveredCount };
    } catch (err: any) {
      await client.query('ROLLBACK;');
      console.error('[NotificationService] Error publishing event:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 2. Recipient Resolution Engine
   */
  public static async resolveRecipients(
    client: any,
    orgId: string,
    event: BusinessEvent
  ): Promise<string[]> {
    const recipients = new Set<string>();

    // A. Direct user
    if (event.targetUserId) {
      recipients.add(event.targetUserId);
    }

    // B. Direct employee -> resolve mapped user_id
    if (event.targetEmployeeId) {
      const empRes = await client.query(
        `SELECT user_id FROM employees WHERE id = $1 AND organization_id = $2`,
        [event.targetEmployeeId, orgId]
      );
      if (empRes.rows.length > 0 && empRes.rows[0].user_id) {
        recipients.add(empRes.rows[0].user_id);
      }
    }

    // C. Reporting Manager of an employee (e.g. for leave requests, attendance corrections)
    if (event.targetEmployeeId && (event.eventType === 'LEAVE_REQUESTED' || event.eventType === 'ATTENDANCE_CORRECTION_REQUESTED')) {
      const mgrRes = await client.query(
        `SELECT m.user_id 
         FROM employees e
         JOIN employees m ON m.id = e.reporting_manager_id
         WHERE e.id = $1 AND e.organization_id = $2`,
        [event.targetEmployeeId, orgId]
      );
      if (mgrRes.rows.length > 0 && mgrRes.rows[0].user_id) {
        recipients.add(mgrRes.rows[0].user_id);
      }
    }

    // D. By Role slug (e.g. 'finance', 'warehouse_manager', 'management', 'field_sales')
    if (event.targetRoleSlug) {
      const roleUsersRes = await client.query(
        `SELECT ur.user_id
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE r.slug = $1 AND ur.organization_id = $2`,
        [event.targetRoleSlug, orgId]
      );
      for (const row of roleUsersRes.rows) {
        recipients.add(row.user_id);
      }
    }

    // E. By Department head or staff
    if (event.targetDepartmentId) {
      const deptRes = await client.query(
        `SELECT head_user_id FROM departments WHERE id = $1 AND organization_id = $2`,
        [event.targetDepartmentId, orgId]
      );
      if (deptRes.rows.length > 0 && deptRes.rows[0].head_user_id) {
        recipients.add(deptRes.rows[0].head_user_id);
      }
    }

    // F. Automatic Role Routing based on Notification Category if no specific recipient provided
    if (recipients.size === 0) {
      const template = NOTIFICATION_TEMPLATES[event.eventType];
      const cat = event.category || template?.category || 'system';

      let fallbackRoleSlug: string | null = null;
      if (cat === 'finance' || cat === 'sales') fallbackRoleSlug = 'finance';
      else if (cat === 'procurement') fallbackRoleSlug = 'purchase_manager';
      else if (cat === 'warehouse' || cat === 'inventory') fallbackRoleSlug = 'warehouse_manager';
      else if (cat === 'quality') fallbackRoleSlug = 'quality_analyst';
      else if (cat === 'manufacturing') fallbackRoleSlug = 'plant_manager';
      else if (cat === 'people') fallbackRoleSlug = 'hr_manager';
      else if (cat === 'field_sales') fallbackRoleSlug = 'field_sales';

      if (fallbackRoleSlug) {
        const roleUsers = await client.query(
          `SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.slug = $1 AND ur.organization_id = $2`,
          [fallbackRoleSlug, orgId]
        );
        for (const row of roleUsers.rows) {
          recipients.add(row.user_id);
        }
      }

      // If still empty, fall back to Super Admin & Management
      if (recipients.size === 0) {
        const adminsRes = await client.query(
          `SELECT id FROM users WHERE organization_id = $1 AND (is_super_admin = TRUE OR id IN (
             SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.slug IN ('super_admin', 'management')
           )) LIMIT 5`,
          [orgId]
        );
        for (const row of adminsRes.rows) {
          recipients.add(row.id);
        }
      }
    }

    // Do not notify actor themselves unless explicitly the only recipient
    if (event.actorUserId && recipients.size > 1) {
      recipients.delete(event.actorUserId);
    }

    return Array.from(recipients);
  }

  /**
   * 3. Internal Event Processor with Preference Evaluation, Idempotency & Template Rendering
   */
  private static async processEventInternal(client: any, event: BusinessEvent): Promise<number> {
    const recipients = await this.resolveRecipients(client, event.organizationId, event);
    if (recipients.length === 0) return 0;

    const template = NOTIFICATION_TEMPLATES[event.eventType];
    const category = event.category || template?.category || 'system';
    const priority = event.priority || template?.defaultPriority || 'normal';
    const actionType = event.actionType || template?.defaultActionType || 'navigate';

    // Build payload dictionary for template interpolation
    const templatePayload = {
      ...event.payload,
      entity_id: event.entityId,
      entity_type: event.entityType,
      actor_name: event.actorName || 'System',
    };

    const title = event.title || (template ? renderTemplate(template.titleTemplate, templatePayload) : `${event.eventType}`);
    const message = event.message || (template ? renderTemplate(template.messageTemplate, templatePayload) : 'Notification received.');
    const actionUrl = event.actionUrl || (template?.actionUrlPattern ? renderTemplate(template.actionUrlPattern, templatePayload) : undefined);

    let deliveredCount = 0;

    for (const userId of recipients) {
      // Check User Notification Preferences
      const isEnabled = await this.checkUserPreference(client, event.organizationId, userId, category, event.eventType, priority);
      if (!isEnabled) {
        continue;
      }

      const notifId = `ntf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const idempotencyKey = event.idempotencyKey
        ? `${event.idempotencyKey}:${userId}`
        : `${event.organizationId}:${event.eventType}:${event.entityType}:${event.entityId}:${userId}:${event.payload?.instance || '0'}`;

      // Insert notification
      const insertRes = await client.query(
        `INSERT INTO notifications (
           id, organization_id, recipient_user_id, notification_type, title, message,
           priority, category, entity_type, entity_id, action_url, action_type, action_payload,
           action_status, metadata, idempotency_key, delivery_status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14, $15, 'delivered', NOW(), NOW())
         ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING id`,
        [
          notifId,
          event.organizationId,
          userId,
          event.eventType,
          title,
          message,
          priority,
          category,
          event.entityType,
          event.entityId,
          actionUrl,
          actionType,
          JSON.stringify(event.actionPayload || event.payload || {}),
          JSON.stringify({ actorUserId: event.actorUserId, ...event.payload }),
          idempotencyKey,
        ]
      );

      if (insertRes.rows.length > 0) {
        deliveredCount++;
        // Broadcast via SSE in real-time
        this.broadcastToUser(userId, event.organizationId, {
          type: 'NOTIFICATION_RECEIVED',
          payload: {
            id: notifId,
            title,
            message,
            priority,
            category,
            entityType: event.entityType,
            entityId: event.entityId,
            actionUrl,
            actionType,
            createdAt: new Date().toISOString(),
          },
        });
      }
    }

    return deliveredCount;
  }

  /**
   * 4. Check user preferences
   */
  private static async checkUserPreference(
    client: any,
    orgId: string,
    userId: string,
    category: NotificationCategory,
    notificationType: string,
    priority: NotificationPriority
  ): Promise<boolean> {
    const template = NOTIFICATION_TEMPLATES[notificationType];
    // Critical security alerts are non-disableable
    if (template?.isNonDisableable || priority === 'critical') {
      return true;
    }

    // Check category level preference
    const catPrefRes = await client.query(
      `SELECT in_app_enabled FROM notification_category_preferences
       WHERE organization_id = $1 AND user_id = $2 AND category = $3`,
      [orgId, userId, category]
    );
    if (catPrefRes.rows.length > 0 && !catPrefRes.rows[0].in_app_enabled) {
      return false;
    }

    // Check specific notification type preference
    const typePrefRes = await client.query(
      `SELECT in_app_enabled, min_priority FROM notification_preferences
       WHERE organization_id = $1 AND user_id = $2 AND notification_type = $3`,
      [orgId, userId, notificationType]
    );
    if (typePrefRes.rows.length > 0) {
      if (!typePrefRes.rows[0].in_app_enabled) return false;
      const minPriority = typePrefRes.rows[0].min_priority;
      const priorityOrder: Record<NotificationPriority, number> = { low: 1, normal: 2, high: 3, critical: 4 };
      if (priorityOrder[priority] < (priorityOrder[minPriority as NotificationPriority] || 1)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 5. Query User Notifications with Filtering, Search & Pagination
   */
  public static async getUserNotifications(
    orgId: string,
    userId: string,
    params: NotificationQueryParams
  ): Promise<{ notifications: NotificationEntity[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['n.organization_id = $1', 'n.recipient_user_id = $2'];
    const values: any[] = [orgId, userId];
    let pIdx = 3;

    // Status filter
    if (params.status === 'unread') {
      conditions.push('n.read_at IS NULL');
      conditions.push('n.archived_at IS NULL');
    } else if (params.status === 'read') {
      conditions.push('n.read_at IS NOT NULL');
      conditions.push('n.archived_at IS NULL');
    } else if (params.status === 'archived') {
      conditions.push('n.archived_at IS NOT NULL');
    } else if (params.status === 'important') {
      conditions.push("n.priority IN ('high', 'critical')");
      conditions.push('n.archived_at IS NULL');
    } else {
      // Default: exclude archived unless explicitly requested
      conditions.push('n.archived_at IS NULL');
    }

    // Category filter
    if (params.category && params.category !== 'all') {
      conditions.push(`n.category = $${pIdx++}`);
      values.push(params.category);
    }

    // Priority filter
    if (params.priority && params.priority !== 'all') {
      conditions.push(`n.priority = $${pIdx++}`);
      values.push(params.priority);
    }

    // Entity Type filter
    if (params.entityType) {
      conditions.push(`n.entity_type = $${pIdx++}`);
      values.push(params.entityType);
    }

    // Search query (title or message)
    if (params.search && params.search.trim()) {
      conditions.push(`(n.title ILIKE $${pIdx} OR n.message ILIKE $${pIdx})`);
      values.push(`%${params.search.trim()}%`);
      pIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) as total FROM notifications n WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const queryStr = `
      SELECT 
        n.id,
        n.organization_id,
        n.recipient_user_id,
        u.full_name as recipient_name,
        u.email as recipient_email,
        n.notification_type,
        n.title,
        n.message,
        n.priority,
        n.category,
        n.entity_type,
        n.entity_id,
        n.action_url,
        n.action_type,
        n.action_payload,
        n.action_status,
        n.metadata,
        n.idempotency_key,
        n.read_at,
        n.archived_at,
        n.delivery_status,
        n.created_at,
        n.updated_at
      FROM notifications n
      JOIN users u ON u.id = n.recipient_user_id
      WHERE ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const dataRes = await pool.query(queryStr, [...values, limit, offset]);

    return {
      notifications: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 6. High-Performance Unread Count
   */
  public static async getUnreadCount(orgId: string, userId: string): Promise<number> {
    try {
      const res = await pool.query(
        `SELECT COUNT(*) as count 
         FROM notifications 
         WHERE organization_id = $1 
           AND recipient_user_id = $2 
           AND (read_at IS NULL) 
           AND (archived_at IS NULL)`,
        [orgId, userId]
      );
      return parseInt(res.rows[0]?.count || '0', 10);
    } catch (err) {
      console.warn('[NotificationService.getUnreadCount] fallback to 0:', err);
      return 0;
    }
  }

  /**
   * 7. Comprehensive Notification Metrics
   */
  public static async getMetrics(orgId: string, userId: string): Promise<NotificationMetrics> {
    const res = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE read_at IS NULL AND archived_at IS NULL) as unread,
         COUNT(*) FILTER (WHERE priority = 'critical' AND archived_at IS NULL) as critical,
         COUNT(*) FILTER (WHERE priority = 'high' AND archived_at IS NULL) as high,
         COUNT(*) FILTER (WHERE archived_at IS NOT NULL) as archived,
         category,
         COUNT(*) as cat_count
       FROM notifications
       WHERE organization_id = $1 AND recipient_user_id = $2
       GROUP BY category`,
      [orgId, userId]
    );

    const categoryCounts: Record<string, number> = {};
    let totalCount = 0;
    let unreadCount = 0;
    let criticalCount = 0;
    let highCount = 0;
    let archivedCount = 0;

    for (const row of res.rows) {
      categoryCounts[row.category] = parseInt(row.cat_count, 10);
    }

    const summaryRes = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE read_at IS NULL AND archived_at IS NULL) as unread,
         COUNT(*) FILTER (WHERE priority = 'critical' AND archived_at IS NULL) as critical,
         COUNT(*) FILTER (WHERE priority = 'high' AND archived_at IS NULL) as high,
         COUNT(*) FILTER (WHERE archived_at IS NOT NULL) as archived
       FROM notifications
       WHERE organization_id = $1 AND recipient_user_id = $2`,
      [orgId, userId]
    );

    if (summaryRes.rows.length > 0) {
      const s = summaryRes.rows[0];
      totalCount = parseInt(s.total || '0', 10);
      unreadCount = parseInt(s.unread || '0', 10);
      criticalCount = parseInt(s.critical || '0', 10);
      highCount = parseInt(s.high || '0', 10);
      archivedCount = parseInt(s.archived || '0', 10);
    }

    return {
      totalCount,
      unreadCount,
      criticalCount,
      highCount,
      archivedCount,
      categoryCounts: categoryCounts as Record<NotificationCategory, number>,
    };
  }

  /**
   * 8. Mark Single Notification as Read / Unread
   */
  public static async markRead(orgId: string, userId: string, notificationId: string, isRead: boolean = true): Promise<boolean> {
    const res = await pool.query(
      `UPDATE notifications
       SET read_at = ${isRead ? 'NOW()' : 'NULL'}, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND recipient_user_id = $3
       RETURNING id`,
      [notificationId, orgId, userId]
    );
    return res.rowCount !== null && res.rowCount > 0;
  }

  /**
   * 9. Mark All Notifications Read
   */
  public static async markAllRead(orgId: string, userId: string, options?: { category?: string; ids?: string[] }): Promise<number> {
    let queryStr = `UPDATE notifications SET read_at = NOW(), updated_at = NOW() WHERE organization_id = $1 AND recipient_user_id = $2 AND read_at IS NULL`;
    const params: any[] = [orgId, userId];

    if (options?.category && options.category !== 'all') {
      params.push(options.category);
      queryStr += ` AND category = $${params.length}`;
    }

    if (options?.ids && options.ids.length > 0) {
      params.push(options.ids);
      queryStr += ` AND id = ANY($${params.length})`;
    }

    const res = await pool.query(queryStr, params);
    return res.rowCount || 0;
  }

  /**
   * 10. Archive Notification
   */
  public static async archive(orgId: string, userId: string, notificationId: string): Promise<boolean> {
    const res = await pool.query(
      `UPDATE notifications
       SET archived_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND recipient_user_id = $3
       RETURNING id`,
      [notificationId, orgId, userId]
    );
    return res.rowCount !== null && res.rowCount > 0;
  }

  /**
   * 11. Archive Multiple
   */
  public static async archiveAll(orgId: string, userId: string, ids?: string[]): Promise<number> {
    let queryStr = `UPDATE notifications SET archived_at = NOW(), updated_at = NOW() WHERE organization_id = $1 AND recipient_user_id = $2 AND archived_at IS NULL`;
    const params: any[] = [orgId, userId];

    if (ids && ids.length > 0) {
      params.push(ids);
      queryStr += ` AND id = ANY($${params.length})`;
    }

    const res = await pool.query(queryStr, params);
    return res.rowCount || 0;
  }

  /**
   * 12. Execute Notification Action with State Validation & Stale Rejection
   */
  public static async executeAction(
    orgId: string,
    userId: string,
    notificationId: string,
    action: 'approve' | 'reject' | 'review' | 'dismiss',
    remarks?: string
  ): Promise<{ success: boolean; message: string; isStale?: boolean; entityState?: any }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Fetch Notification and verify ownership
      const notifRes = await client.query(
        `SELECT * FROM notifications 
         WHERE id = $1 AND organization_id = $2 AND recipient_user_id = $3 FOR UPDATE`,
        [notificationId, orgId, userId]
      );

      if (notifRes.rows.length === 0) {
        await client.query('ROLLBACK;');
        return { success: false, message: 'Notification not found or access unauthorized.' };
      }

      const notif = notifRes.rows[0];
      const payload = typeof notif.action_payload === 'string' ? JSON.parse(notif.action_payload) : notif.action_payload || {};

      // 2. State & Entity Validation
      let isStale = false;
      let staleReason = '';

      if (notif.entity_type === 'leave_request' && notif.entity_id) {
        const lrRes = await client.query(
          `SELECT status FROM leave_requests WHERE id = $1 AND organization_id = $2`,
          [notif.entity_id, orgId]
        );
        if (lrRes.rows.length === 0) {
          isStale = true;
          staleReason = 'Leave request no longer exists.';
        } else if (lrRes.rows[0].status !== 'submitted' && lrRes.rows[0].status !== 'pending_approval') {
          isStale = true;
          staleReason = `Leave request is already in "${lrRes.rows[0].status}" status.`;
        } else if (action === 'approve' || action === 'reject') {
          // Perform canonical approval in people module
          const newStatus = action === 'approve' ? 'approved' : 'rejected';
          await client.query(
            `UPDATE leave_requests 
             SET status = $1, approved_by_user_id = $2, approval_remarks = $3, approved_at = NOW(), updated_at = NOW()
             WHERE id = $4 AND organization_id = $5`,
            [newStatus, userId, remarks || `Actioned via Central Notification`, notif.entity_id, orgId]
          );
        }
      } else if (notif.entity_type === 'purchase_requisition' && notif.entity_id) {
        const prRes = await client.query(
          `SELECT status FROM purchase_orders WHERE id = $1 AND organization_id = $2`,
          [notif.entity_id, orgId]
        );
        if (prRes.rows.length > 0 && prRes.rows[0].status !== 'draft' && prRes.rows[0].status !== 'pending_approval') {
          isStale = true;
          staleReason = `Purchase record is already in "${prRes.rows[0].status}" status.`;
        }
      }

      if (isStale) {
        // Mark notification action status as expired
        await client.query(
          `UPDATE notifications 
           SET action_status = 'expired', read_at = COALESCE(read_at, NOW()), updated_at = NOW()
           WHERE id = $1`,
          [notificationId]
        );
        await client.query('COMMIT;');
        return {
          success: false,
          isStale: true,
          message: `Action is no longer available: ${staleReason}`,
        };
      }

      // Mark notification action as completed or dismissed
      const newActionStatus = action === 'dismiss' ? 'dismissed' : 'completed';
      await client.query(
        `UPDATE notifications 
         SET action_status = $1, read_at = COALESCE(read_at, NOW()), updated_at = NOW()
         WHERE id = $2`,
        [newActionStatus, notificationId]
      );

      // Audit Log
      await this.logAudit(
        client,
        orgId,
        userId,
        '',
        `notification.action_${action}`,
        notif.entity_type || 'notification',
        notif.entity_id || notificationId,
        { notificationId, action, remarks }
      );

      await client.query('COMMIT;');
      return { success: true, message: `Notification action "${action}" completed successfully.` };
    } catch (err: any) {
      await client.query('ROLLBACK;');
      console.error('[NotificationService] Execute action error:', err);
      return { success: false, message: err.message || 'Action failed to execute.' };
    } finally {
      client.release();
    }
  }

  /**
   * 13. Get User Preferences (Category + Granular Types)
   */
  public static async getUserPreferences(
    orgId: string,
    userId: string
  ): Promise<{
    categoryPreferences: NotificationCategoryPreference[];
    typePreferences: NotificationPreference[];
  }> {
    const catRes = await pool.query(
      `SELECT * FROM notification_category_preferences
       WHERE organization_id = $1 AND user_id = $2
       ORDER BY category ASC`,
      [orgId, userId]
    );

    const typeRes = await pool.query(
      `SELECT * FROM notification_preferences
       WHERE organization_id = $1 AND user_id = $2
       ORDER BY category ASC, notification_type ASC`,
      [orgId, userId]
    );

    return {
      categoryPreferences: catRes.rows,
      typePreferences: typeRes.rows,
    };
  }

  /**
   * 14. Update Category Preference
   */
  public static async updateCategoryPreference(
    orgId: string,
    userId: string,
    category: NotificationCategory,
    inAppEnabled: boolean
  ): Promise<boolean> {
    const prefId = `ncp-${userId}-${category}`;
    await pool.query(
      `INSERT INTO notification_category_preferences (
         id, organization_id, user_id, category, in_app_enabled, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (organization_id, user_id, category)
       DO UPDATE SET in_app_enabled = EXCLUDED.in_app_enabled, updated_at = NOW()`,
      [prefId, orgId, userId, category, inAppEnabled]
    );
    return true;
  }

  /**
   * 15. Update Notification Type Preference
   */
  public static async updateTypePreference(
    orgId: string,
    userId: string,
    notificationType: string,
    category: NotificationCategory,
    preferences: {
      inAppEnabled?: boolean;
      emailEnabled?: boolean;
      whatsappEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
      minPriority?: NotificationPriority;
    }
  ): Promise<boolean> {
    const prefId = `np-${userId}-${notificationType}`;
    await pool.query(
      `INSERT INTO notification_preferences (
         id, organization_id, user_id, notification_type, category,
         in_app_enabled, email_enabled, whatsapp_enabled, sms_enabled, push_enabled,
         min_priority, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       ON CONFLICT (organization_id, user_id, notification_type)
       DO UPDATE SET 
         in_app_enabled = COALESCE(EXCLUDED.in_app_enabled, notification_preferences.in_app_enabled),
         email_enabled = COALESCE(EXCLUDED.email_enabled, notification_preferences.email_enabled),
         whatsapp_enabled = COALESCE(EXCLUDED.whatsapp_enabled, notification_preferences.whatsapp_enabled),
         sms_enabled = COALESCE(EXCLUDED.sms_enabled, notification_preferences.sms_enabled),
         push_enabled = COALESCE(EXCLUDED.push_enabled, notification_preferences.push_enabled),
         min_priority = COALESCE(EXCLUDED.min_priority, notification_preferences.min_priority),
         updated_at = NOW()`,
      [
        prefId,
        orgId,
        userId,
        notificationType,
        category,
        preferences.inAppEnabled ?? true,
        preferences.emailEnabled ?? false,
        preferences.whatsappEnabled ?? false,
        preferences.smsEnabled ?? false,
        preferences.pushEnabled ?? false,
        preferences.minPriority ?? 'low',
      ]
    );
    return true;
  }
}
