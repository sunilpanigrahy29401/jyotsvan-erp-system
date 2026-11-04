// src/server/notification-routes.ts
// Enterprise Central Notification API Endpoints (Phase 22)

import { Router } from 'express';
import { NotificationService } from './notification-service.ts';
import type { NotificationQueryParams } from '../types/notifications.ts';

export const notificationRouter = Router();

// Helper to extract orgId and userId from request headers or query
function getAuthContext(req: any) {
  const orgId = (req.headers['x-organization-id'] as string) || (req.query.organizationId as string) || 'org-jyotsvan-corp';
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'usr-super-admin';
  return { orgId, userId };
}

/**
 * 1. GET /api/notifications
 * Paginated query of user notifications with filtering & search
 */
notificationRouter.get('/notifications', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const queryParams: NotificationQueryParams = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      category: req.query.category as any,
      priority: req.query.priority as any,
      status: req.query.status as any,
      search: req.query.search as string,
      entityType: req.query.entityType as string,
    };

    const result = await NotificationService.getUserNotifications(orgId, userId, queryParams);
    res.json(result);
  } catch (err: any) {
    console.error('[API] Error fetching notifications:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
});

/**
 * 2. GET /api/notifications/unread-count
 * Fast unread counter for global header badge
 */
notificationRouter.get('/notifications/unread-count', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const unreadCount = await NotificationService.getUnreadCount(orgId, userId);
    res.json({ unreadCount });
  } catch (err: any) {
    console.error('[API] Error fetching unread count:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch unread count' });
  }
});

/**
 * 3. GET /api/notifications/metrics
 * Comprehensive breakdown by category & priority
 */
notificationRouter.get('/notifications/metrics', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const metrics = await NotificationService.getMetrics(orgId, userId);
    res.json(metrics);
  } catch (err: any) {
    console.error('[API] Error fetching metrics:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch metrics' });
  }
});

/**
 * 4. POST /api/notifications/:id/read
 * Mark notification as read or unread
 */
notificationRouter.post('/notifications/:id/read', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const { id } = req.params;
    const isRead = req.body.isRead !== false; // default true
    const success = await NotificationService.markRead(orgId, userId, id, isRead);
    res.json({ success });
  } catch (err: any) {
    console.error('[API] Error marking notification read:', err);
    res.status(500).json({ error: err.message || 'Failed to mark notification read' });
  }
});

/**
 * 5. POST /api/notifications/read-all
 * Mark all notifications as read (optionally filtered by category or IDs)
 */
notificationRouter.post('/notifications/read-all', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const { category, ids } = req.body || {};
    const updatedCount = await NotificationService.markAllRead(orgId, userId, { category, ids });
    res.json({ success: true, updatedCount });
  } catch (err: any) {
    console.error('[API] Error marking all read:', err);
    res.status(500).json({ error: err.message || 'Failed to mark all read' });
  }
});

/**
 * 6. POST /api/notifications/:id/archive
 * Archive a notification
 */
notificationRouter.post('/notifications/:id/archive', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const { id } = req.params;
    const success = await NotificationService.archive(orgId, userId, id);
    res.json({ success });
  } catch (err: any) {
    console.error('[API] Error archiving notification:', err);
    res.status(500).json({ error: err.message || 'Failed to archive notification' });
  }
});

/**
 * 7. POST /api/notifications/archive-all
 * Bulk archive notifications
 */
notificationRouter.post('/notifications/archive-all', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const { ids } = req.body || {};
    const archivedCount = await NotificationService.archiveAll(orgId, userId, ids);
    res.json({ success: true, archivedCount });
  } catch (err: any) {
    console.error('[API] Error bulk archiving:', err);
    res.status(500).json({ error: err.message || 'Failed to bulk archive' });
  }
});

/**
 * 8. POST /api/notifications/:id/action
 * Execute notification action with entity validation & stale checks
 */
notificationRouter.post('/notifications/:id/action', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const { id } = req.params;
    const { action, remarks } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action parameter is required (approve, reject, review, dismiss)' });
    }

    const result = await NotificationService.executeAction(orgId, userId, id, action, remarks);
    res.json(result);
  } catch (err: any) {
    console.error('[API] Error executing notification action:', err);
    res.status(500).json({ error: err.message || 'Failed to execute action' });
  }
});

/**
 * 9. GET /api/notifications/preferences
 * Retrieve user notification preferences
 */
notificationRouter.get('/notifications/preferences', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const preferences = await NotificationService.getUserPreferences(orgId, userId);
    res.json(preferences);
  } catch (err: any) {
    console.error('[API] Error fetching preferences:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch preferences' });
  }
});

/**
 * 10. PUT /api/notifications/preferences/category
 * Update category-level preference
 */
notificationRouter.put('/notifications/preferences/category', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const { category, inAppEnabled } = req.body;
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    const success = await NotificationService.updateCategoryPreference(orgId, userId, category, inAppEnabled !== false);
    res.json({ success });
  } catch (err: any) {
    console.error('[API] Error updating category preference:', err);
    res.status(500).json({ error: err.message || 'Failed to update category preference' });
  }
});

/**
 * 11. PUT /api/notifications/preferences/type
 * Update specific notification type preference
 */
notificationRouter.put('/notifications/preferences/type', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const { notificationType, category, inAppEnabled, emailEnabled, whatsappEnabled, smsEnabled, pushEnabled, minPriority } = req.body;
    if (!notificationType || !category) {
      return res.status(400).json({ error: 'notificationType and category are required' });
    }
    const success = await NotificationService.updateTypePreference(orgId, userId, notificationType, category, {
      inAppEnabled,
      emailEnabled,
      whatsappEnabled,
      smsEnabled,
      pushEnabled,
      minPriority,
    });
    res.json({ success });
  } catch (err: any) {
    console.error('[API] Error updating type preference:', err);
    res.status(500).json({ error: err.message || 'Failed to update type preference' });
  }
});

/**
 * 12. POST /api/notifications/events
 * Internal business event publisher endpoint for cross-service publishing
 */
notificationRouter.post('/notifications/events', async (req, res) => {
  try {
    const { orgId, userId } = getAuthContext(req);
    const event = {
      organizationId: req.body.organizationId || orgId,
      eventType: req.body.eventType,
      entityType: req.body.entityType,
      entityId: req.body.entityId,
      actorUserId: req.body.actorUserId || userId,
      actorName: req.body.actorName,
      targetUserId: req.body.targetUserId,
      targetEmployeeId: req.body.targetEmployeeId,
      targetRoleSlug: req.body.targetRoleSlug,
      targetDepartmentId: req.body.targetDepartmentId,
      title: req.body.title,
      message: req.body.message,
      priority: req.body.priority,
      category: req.body.category,
      actionUrl: req.body.actionUrl,
      actionType: req.body.actionType,
      actionPayload: req.body.actionPayload,
      payload: req.body.payload,
      idempotencyKey: req.body.idempotencyKey,
    };

    if (!event.eventType || !event.entityType || !event.entityId) {
      return res.status(400).json({ error: 'eventType, entityType, and entityId are required' });
    }

    const result = await NotificationService.publishEvent(event);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[API] Error publishing event:', err);
    res.status(500).json({ error: err.message || 'Failed to publish event' });
  }
});

/**
 * 13. GET /api/notifications/stream
 * Server-Sent Events (SSE) live notification stream
 */
notificationRouter.get('/notifications/stream', (req, res) => {
  const { orgId, userId } = getAuthContext(req);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `sse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  NotificationService.registerSSEClient(clientId, userId, orgId, (data) => {
    res.write(data);
  });

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, timestamp: new Date().toISOString() })}\n\n`);

  // Periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    NotificationService.unregisterSSEClient(clientId);
  });
});
