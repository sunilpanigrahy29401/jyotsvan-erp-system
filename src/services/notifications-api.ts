// src/services/notifications-api.ts
// Enterprise Central Notification API Client (Phase 22)

import type {
  NotificationEntity,
  NotificationQueryParams,
  NotificationPreference,
  NotificationCategoryPreference,
  NotificationMetrics,
  BusinessEvent,
  NotificationCategory,
  NotificationPriority,
} from '../types/notifications.ts';

export class NotificationsAPI {
  private static getHeaders(): Record<string, string> {
    const orgId = localStorage.getItem('jyotsvan_active_org_id') || 'org-jyotsvan-corp';
    const userId = localStorage.getItem('jyotsvan_active_user_id') || 'usr-super-admin';
    return {
      'Content-Type': 'application/json',
      'x-organization-id': orgId,
      'x-user-id': userId,
    };
  }

  /**
   * Fetch paginated notifications
   */
  public static async fetchNotifications(params: NotificationQueryParams = {}): Promise<{
    notifications: NotificationEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.category && params.category !== 'all') searchParams.append('category', params.category);
    if (params.priority && params.priority !== 'all') searchParams.append('priority', params.priority);
    if (params.status && params.status !== 'all') searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    if (params.entityType) searchParams.append('entityType', params.entityType);

    const res = await fetch(`/api/notifications?${searchParams.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch notifications');
    }
    return res.json();
  }

  /**
   * Fetch unread counter for top bar badge
   */
  public static async fetchUnreadCount(): Promise<number> {
    const res = await fetch('/api/notifications/unread-count', {
      headers: this.getHeaders(),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.unreadCount || 0;
  }

  /**
   * Fetch metrics breakdown
   */
  public static async fetchMetrics(): Promise<NotificationMetrics> {
    const res = await fetch('/api/notifications/metrics', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to fetch notification metrics');
    }
    return res.json();
  }

  /**
   * Mark as read / unread
   */
  public static async markRead(id: string, isRead: boolean = true): Promise<boolean> {
    const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ isRead }),
    });
    if (!res.ok) throw new Error('Failed to update read status');
    const data = await res.json();
    return data.success;
  }

  /**
   * Mark all as read
   */
  public static async markAllRead(options?: { category?: string; ids?: string[] }): Promise<number> {
    const res = await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error('Failed to mark all read');
    const data = await res.json();
    return data.updatedCount || 0;
  }

  /**
   * Archive notification
   */
  public static async archive(id: string): Promise<boolean> {
    const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to archive notification');
    const data = await res.json();
    return data.success;
  }

  /**
   * Archive multiple notifications
   */
  public static async archiveAll(ids?: string[]): Promise<number> {
    const res = await fetch('/api/notifications/archive-all', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error('Failed to archive notifications');
    const data = await res.json();
    return data.archivedCount || 0;
  }

  /**
   * Execute Action with entity check
   */
  public static async executeAction(
    id: string,
    action: 'approve' | 'reject' | 'review' | 'dismiss',
    remarks?: string
  ): Promise<{ success: boolean; message: string; isStale?: boolean }> {
    const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/action`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ action, remarks }),
    });
    return res.json();
  }

  /**
   * Fetch User Preferences
   */
  public static async fetchPreferences(): Promise<{
    categoryPreferences: NotificationCategoryPreference[];
    typePreferences: NotificationPreference[];
  }> {
    const res = await fetch('/api/notifications/preferences', {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch notification preferences');
    return res.json();
  }

  /**
   * Update Category In-App Toggle
   */
  public static async updateCategoryPreference(category: NotificationCategory, inAppEnabled: boolean): Promise<boolean> {
    const res = await fetch('/api/notifications/preferences/category', {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ category, inAppEnabled }),
    });
    if (!res.ok) throw new Error('Failed to update category preference');
    return true;
  }

  /**
   * Update Type Preferences
   */
  public static async updateTypePreference(
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
    const res = await fetch('/api/notifications/preferences/type', {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ notificationType, category, ...preferences }),
    });
    if (!res.ok) throw new Error('Failed to update type preference');
    return true;
  }

  /**
   * Publish Business Event
   */
  public static async publishEvent(event: BusinessEvent): Promise<{ success: boolean; outboxId: string; deliveredCount: number }> {
    const res = await fetch('/api/notifications/events', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to publish event');
    }
    return res.json();
  }

  /**
   * Subscribe to Live SSE Stream
   */
  public static subscribeToRealtime(
    onNotification: (data: any) => void,
    onConnected?: () => void
  ): () => void {
    const orgId = localStorage.getItem('jyotsvan_active_org_id') || 'org-jyotsvan-corp';
    const userId = localStorage.getItem('jyotsvan_active_user_id') || 'usr-super-admin';
    const sseUrl = `/api/notifications/stream?organizationId=${encodeURIComponent(orgId)}&userId=${encodeURIComponent(userId)}`;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        onConnected?.();
      };

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          onNotification(parsed);
        } catch (err) {
          // ignore heartbeat
        }
      };

      eventSource.onerror = (err) => {
        // SSE handles reconnection automatically
      };
    } catch (err) {
      console.warn('[NotificationsAPI] SSE connection failed:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }
}
