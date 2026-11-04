// src/components/notifications/NotificationBellDropdown.tsx
// Real-time Global Header Notification Dropdown & Bell Trigger (Phase 22)

import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  SlidersHorizontal,
  ExternalLink,
  Shield,
  Package,
  Layers,
  Factory,
  Warehouse,
  TrendingUp,
  Landmark,
  Users,
  AlertTriangle,
  Clock,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { NotificationsAPI } from '../../services/notifications-api.ts';
import type { NotificationEntity, NotificationCategory, NotificationPriority } from '../../types/notifications.ts';
import { NotificationPreferencesModal } from './NotificationPreferencesModal.tsx';
import { PublishEventModal } from './PublishEventModal.tsx';

interface NotificationBellDropdownProps {
  onNavigate?: (path: string) => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  procurement: Package,
  quality: Layers,
  manufacturing: Factory,
  warehouse: Warehouse,
  inventory: Package,
  sales: TrendingUp,
  finance: Landmark,
  field_sales: Users,
  people: Users,
  security: Shield,
  system: Bell,
};

export function NotificationBellDropdown({ onNavigate }: NotificationBellDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEntity[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isPublishEventOpen, setIsPublishEventOpen] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Initial fetch and polling
  useEffect(() => {
    loadData();

    // Subscribe to SSE Live Stream
    const unsubscribe = NotificationsAPI.subscribeToRealtime(
      (event) => {
        // When a real-time event arrives, refresh unread count and reload list
        loadData();
      },
      () => {
        setIsLiveConnected(true);
      }
    );

    // Fallback interval check every 30 seconds
    const interval = setInterval(() => {
      NotificationsAPI.fetchUnreadCount().then(setUnreadCount).catch(() => {});
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    try {
      const [count, listRes] = await Promise.all([
        NotificationsAPI.fetchUnreadCount(),
        NotificationsAPI.fetchNotifications({ limit: 15 }),
      ]);
      setUnreadCount(count);
      setNotifications(listRes.notifications);
    } catch (err) {
      console.warn('[NotificationBell] Load error:', err);
    }
  };

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      loadData();
    }
  };

  const handleMarkRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await NotificationsAPI.markRead(id, true);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await NotificationsAPI.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleExecuteAction = async (
    e: React.MouseEvent,
    id: string,
    action: 'approve' | 'reject' | 'review' | 'dismiss'
  ) => {
    e.stopPropagation();
    setActionInProgressId(id);
    try {
      const res = await NotificationsAPI.executeAction(id, action);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id
              ? { ...n, action_status: action === 'dismiss' ? 'dismissed' : 'completed', read_at: n.read_at || new Date().toISOString() }
              : n
          )
        );
      } else if (res.isStale) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, action_status: 'expired', read_at: n.read_at || new Date().toISOString() } : n
          )
        );
      }
      loadData();
    } catch (err) {
      console.error('Action error:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleItemClick = (n: NotificationEntity) => {
    if (!n.read_at) {
      NotificationsAPI.markRead(n.id, true).catch(() => {});
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (n.action_url && onNavigate) {
      onNavigate(n.action_url);
    } else if (onNavigate) {
      onNavigate('/notifications');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read_at;
    if (activeFilter === 'important') return n.priority === 'high' || n.priority === 'critical';
    return true;
  });

  const formatRelativeTime = (isoString: string) => {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getPriorityStyle = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'normal':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button Trigger */}
      <button
        id="global-notifications-bell"
        onClick={handleToggle}
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          isOpen
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
        title="Central Notifications"
        aria-label="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Popover */}
      {isOpen && (
        <div
          id="global-notifications-dropdown-menu"
          className="absolute right-0 mt-2.5 w-88 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl text-xs z-50 overflow-hidden animate-in fade-in-0 zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">Notifications</span>
              {unreadCount > 0 ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                  {unreadCount} Unread
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  All Caught Up
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-slate-500" />
                  <span>Mark Read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPreferencesOpen(true)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                title="Notification Settings"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-100 bg-white px-3 py-2 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`flex-1 py-1 rounded-md text-center font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('unread')}
              className={`flex-1 py-1 rounded-md text-center font-medium transition-all ${
                activeFilter === 'unread'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('important')}
              className={`flex-1 py-1 rounded-md text-center font-medium transition-all ${
                activeFilter === 'important'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Priority
            </button>
          </div>

          {/* Notification Items List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-2">
                  <Check className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-slate-700">No notifications to display</p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mt-0.5">
                  You are up to date on all operational events and requests.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const Icon = CATEGORY_ICONS[item.category] || Bell;
                const isUnread = !item.read_at;
                const isPendingAction = item.action_type === 'approve_reject' && item.action_status === 'pending';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`group relative flex flex-col p-3.5 transition-colors cursor-pointer ${
                      isUnread ? 'bg-slate-50/70 hover:bg-slate-100/60' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Unread dot indicator */}
                    {isUnread && (
                      <div className="absolute top-3.5 left-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                    )}

                    <div className="flex items-start gap-2.5 pl-2">
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                          isUnread ? 'bg-white border-slate-200 text-slate-800 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border ${getPriorityStyle(
                              item.priority
                            )}`}
                          >
                            {item.category} • {item.priority}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </div>

                        <h4 className={`text-xs mt-1 leading-snug truncate ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.message}
                        </p>

                        {/* Inline Actions for Pending Approval/Sign-off */}
                        {isPendingAction && (
                          <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60">
                            <button
                              type="button"
                              disabled={actionInProgressId === item.id}
                              onClick={(e) => handleExecuteAction(e, item.id, 'approve')}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              {actionInProgressId === item.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              disabled={actionInProgressId === item.id}
                              onClick={(e) => handleExecuteAction(e, item.id, 'reject')}
                              className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-2xs hover:bg-rose-700 transition-colors disabled:opacity-50"
                            >
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                        {item.action_status === 'completed' && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                            <Check className="h-3 w-3" />
                            <span>Action Completed</span>
                          </div>
                        )}
                        {item.action_status === 'expired' && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Action Expired</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <button
              type="button"
              onClick={() => setIsPublishEventOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Simulate</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('/notifications');
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 hover:text-blue-600 transition-colors"
            >
              <span>View All Notifications</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        onPreferencesUpdated={loadData}
      />

      {/* Simulator Modal */}
      <PublishEventModal
        isOpen={isPublishEventOpen}
        onClose={() => setIsPublishEventOpen(false)}
        onEventPublished={loadData}
      />
    </div>
  );
}
