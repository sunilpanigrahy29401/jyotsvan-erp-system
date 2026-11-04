// src/app/pages/NotificationCenterPage.tsx
// Enterprise Central Notification Center & Operational Inbox (Phase 22)

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Archive,
  SlidersHorizontal,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  Package,
  Layers,
  Factory,
  Warehouse,
  TrendingUp,
  Landmark,
  Users,
  Radio,
  Loader2,
  Trash2,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { NotificationsAPI } from '../../services/notifications-api.ts';
import type {
  NotificationEntity,
  NotificationCategory,
  NotificationPriority,
  NotificationFilterState,
  NotificationMetrics,
} from '../../types/notifications.ts';
import { NotificationPreferencesModal } from '../../components/notifications/NotificationPreferencesModal.tsx';
import { PublishEventModal } from '../../components/notifications/PublishEventModal.tsx';

interface NotificationCenterPageProps {
  onNavigate?: (path: string) => void;
}

const CATEGORY_MAP: Record<string, { label: string; icon: any }> = {
  procurement: { label: 'Procurement', icon: Package },
  quality: { label: 'Quality Control', icon: Layers },
  manufacturing: { label: 'Manufacturing', icon: Factory },
  warehouse: { label: 'Warehouse', icon: Warehouse },
  inventory: { label: 'Inventory', icon: Package },
  sales: { label: 'Sales & Orders', icon: TrendingUp },
  finance: { label: 'Finance & Invoicing', icon: Landmark },
  field_sales: { label: 'Field Sales', icon: Users },
  people: { label: 'People & Staff', icon: Users },
  security: { label: 'Security & Auth', icon: Shield },
  system: { label: 'System Ops', icon: Bell },
};

export function NotificationCenterPage({ onNavigate }: NotificationCenterPageProps) {
  const [notifications, setNotifications] = useState<NotificationEntity[]>([]);
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & Pagination States
  const [activeStatus, setActiveStatus] = useState<NotificationFilterState>('all');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<NotificationPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Async States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; message: string; isError?: boolean } | null>(null);

  // Fetch Notifications
  const loadNotifications = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [listRes, metricsRes] = await Promise.all([
        NotificationsAPI.fetchNotifications({
          page: currentPage,
          limit: 20,
          status: activeStatus,
          category: selectedCategory,
          priority: selectedPriority,
          search: searchQuery,
        }),
        NotificationsAPI.fetchMetrics(),
      ]);

      setNotifications(listRes.notifications);
      setTotalPages(listRes.totalPages || 1);
      setTotalCount(listRes.total || 0);
      setMetrics(metricsRes);
    } catch (err) {
      console.error('[NotificationCenter] Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, activeStatus, selectedCategory, selectedPriority, searchQuery]);

  useEffect(() => {
    loadNotifications();

    // Subscribe to SSE
    const unsubscribe = NotificationsAPI.subscribeToRealtime(
      (event) => {
        loadNotifications(true);
      },
      () => {
        setIsLiveConnected(true);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [loadNotifications]);

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Actions
  const handleMarkReadSingle = async (id: string, isRead: boolean) => {
    try {
      await NotificationsAPI.markRead(id, isRead);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: isRead ? new Date().toISOString() : null } : n))
      );
      loadNotifications(true);
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleBulkMarkRead = async () => {
    if (selectedIds.size === 0) return;
    try {
      await NotificationsAPI.markAllRead({ ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      loadNotifications(true);
    } catch (err) {
      console.error('Bulk mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await NotificationsAPI.markAllRead({ category: selectedCategory !== 'all' ? selectedCategory : undefined });
      loadNotifications(true);
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleArchiveSingle = async (id: string) => {
    try {
      await NotificationsAPI.archive(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      loadNotifications(true);
    } catch (err) {
      console.error('Archive error:', err);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    try {
      await NotificationsAPI.archiveAll(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadNotifications(true);
    } catch (err) {
      console.error('Bulk archive error:', err);
    }
  };

  const handleExecuteAction = async (
    id: string,
    action: 'approve' | 'reject' | 'review' | 'dismiss'
  ) => {
    setActionInProgressId(id);
    setActionFeedback(null);
    try {
      const res = await NotificationsAPI.executeAction(id, action);
      if (res.success) {
        setActionFeedback({ id, message: res.message || `Action ${action} successful` });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id
              ? {
                  ...n,
                  action_status: action === 'dismiss' ? 'dismissed' : 'completed',
                  read_at: n.read_at || new Date().toISOString(),
                }
              : n
          )
        );
      } else {
        setActionFeedback({ id, message: res.message || 'Action failed', isError: true });
        if (res.isStale) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, action_status: 'expired' } : n))
          );
        }
      }
      loadNotifications(true);
    } catch (err: any) {
      setActionFeedback({ id, message: err.message || 'Action execution failed', isError: true });
    } finally {
      setActionInProgressId(null);
    }
  };

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
    <div className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="border border-slate-200 bg-white rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Central Notification Center</h1>
                {isLiveConnected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live SSE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Unified multi-module operational alerts, cross-department approval requests, and business events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPublishModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Simulate Event</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPreferencesOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>Preferences</span>
            </button>

            <button
              type="button"
              onClick={() => loadNotifications(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Telemetry KPI Metrics Bar */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Unread Alerts</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {metrics?.unreadCount ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
            <div className="text-[11px] font-medium text-red-600">Critical Priority</div>
            <div className="text-lg font-bold text-red-700 mt-0.5">
              {metrics?.criticalCount ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <div className="text-[11px] font-medium text-amber-600">High Priority</div>
            <div className="text-lg font-bold text-amber-700 mt-0.5">
              {metrics?.highCount ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Total Filtered</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{totalCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Archived Records</div>
            <div className="text-lg font-bold text-slate-700 mt-0.5">
              {metrics?.archivedCount ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-4">
        {/* Controls & Filter Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          {/* Status Tabs & Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
              {(['all', 'unread', 'read', 'important', 'archived'] as NotificationFilterState[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setActiveStatus(st);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                    activeStatus === st
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'important' ? 'Priority Only' : st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search alerts by title, keyword, PO #, SKU, or staff..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Module Category & Priority Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-900 focus:outline-none"
                >
                  <option value="all">All Modules</option>
                  <option value="procurement">Procurement</option>
                  <option value="quality">Quality Control</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="inventory">Inventory</option>
                  <option value="sales">Sales & Commercial</option>
                  <option value="finance">Finance</option>
                  <option value="field_sales">Field Sales</option>
                  <option value="people">People & HR</option>
                  <option value="security">Security</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Priority:</span>
                <select
                  value={selectedPriority}
                  onChange={(e) => {
                    setSelectedPriority(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-900 focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Quick Batch Actions */}
            <div className="flex items-center gap-2">
              {metrics && metrics.unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-slate-500" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Selection Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-2.5 text-xs text-white shadow-md animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{selectedIds.size}</span>
              <span>notifications selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkMarkRead}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 font-medium transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Mark as Read</span>
              </button>
              <button
                type="button"
                onClick={handleBulkArchive}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 font-medium transition-colors"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archive</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-slate-400 hover:text-white ml-2 text-[11px]"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Notifications List Card */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs divide-y divide-slate-100">
          {/* Header row with Select All */}
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50/70 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.length > 0 && selectedIds.size === notifications.length}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <span>Select All Displayed</span>
            </div>
            <span>Page {currentPage} of {totalPages}</span>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-xs text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-slate-400 mb-2" />
              <span>Loading notification stream...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">No notifications found</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                There are no alerts matching your current filter criteria. Use "Simulate Event" to test notifications.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const categoryDef = CATEGORY_MAP[item.category] || { label: item.category, icon: Bell };
              const Icon = categoryDef.icon;
              const isUnread = !item.read_at;
              const isSelected = selectedIds.has(item.id);
              const isPendingAction = item.action_type === 'approve_reject' && item.action_status === 'pending';

              return (
                <div
                  key={item.id}
                  className={`group relative flex flex-col sm:flex-row items-start justify-between p-4 sm:p-5 transition-colors gap-3 ${
                    isSelected
                      ? 'bg-blue-50/40'
                      : isUnread
                      ? 'bg-slate-50/70 hover:bg-slate-100/50'
                      : 'bg-white hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(item.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />

                    {/* Icon */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        isUnread
                          ? 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Priority Badge */}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${getPriorityStyle(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>

                        {/* Category Tag */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {categoryDef.label}
                        </span>

                        {/* Unread Pill */}
                        {isUnread && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-600 text-white">
                            NEW
                          </span>
                        )}

                        {/* Action Status Badge */}
                        {item.action_status === 'completed' && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="h-3 w-3" />
                            Completed
                          </span>
                        )}
                        {item.action_status === 'expired' && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="h-3 w-3" />
                            Action Expired
                          </span>
                        )}
                      </div>

                      {/* Title & Message */}
                      <h4
                        className={`text-sm mt-1.5 leading-snug ${
                          isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                        {item.message}
                      </p>

                      {/* Action Feedback Banner */}
                      {actionFeedback && actionFeedback.id === item.id && (
                        <div
                          className={`mt-2 flex items-center gap-1.5 rounded-lg p-2 text-xs font-medium border ${
                            actionFeedback.isError
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {actionFeedback.isError ? (
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span>{actionFeedback.message}</span>
                        </div>
                      )}

                      {/* Interactive Actions */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        {isPendingAction && (
                          <>
                            <button
                              type="button"
                              disabled={actionInProgressId === item.id}
                              onClick={() => handleExecuteAction(item.id, 'approve')}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              {actionInProgressId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              <span>Approve Request</span>
                            </button>

                            <button
                              type="button"
                              disabled={actionInProgressId === item.id}
                              onClick={() => handleExecuteAction(item.id, 'reject')}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 transition-colors disabled:opacity-50"
                            >
                              <span>Reject Request</span>
                            </button>
                          </>
                        )}

                        {item.action_url && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!item.read_at) handleMarkReadSingle(item.id, true);
                              onNavigate?.(item.action_url!);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                          >
                            <span>Open Record</span>
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Meta & Controls */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto">
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(item.created_at)}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMarkReadSingle(item.id, !item.read_at)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title={item.read_at ? 'Mark as Unread' : 'Mark as Read'}
                      >
                        {item.read_at ? <Check className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleArchiveSingle(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Archive Alert"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination Toolbar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50/80 text-xs">
              <span className="text-slate-500">
                Showing {notifications.length} of {totalCount} notifications
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <span className="px-2 font-semibold text-slate-800">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        onPreferencesUpdated={() => loadNotifications(true)}
      />

      {/* Simulator Modal */}
      <PublishEventModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onEventPublished={() => loadNotifications(true)}
      />
    </div>
  );
}
