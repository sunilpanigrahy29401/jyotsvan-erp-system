// src/app/pages/field-sales/FieldSalesModule.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  TrendingUp,
  CreditCard,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Store,
  Navigation,
  CheckSquare,
  BarChart3,
  Users,
  ChevronRight,
  ShieldAlert,
  Download,
} from 'lucide-react';
import { FieldSalesMetricsHeader } from './components/FieldSalesMetricsHeader';
import { VisitCard } from './components/VisitCard';
import { CheckInModal } from './components/CheckInModal';
import { CheckOutModal } from './components/CheckOutModal';
import { CustomerQuickViewModal } from './components/CustomerQuickViewModal';
import { OrderBookingModal } from './components/OrderBookingModal';
import { CollectionModal } from './components/CollectionModal';
import { CreateVisitModal } from './components/CreateVisitModal';
import { CreateRouteModal } from './components/CreateRouteModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { useToast } from '../../../context/ToastContext';
import type {
  FieldSalesVisit,
  FieldSalesDashboardMetrics,
  FieldSalesRoute,
  FieldSalesTarget,
  FieldSalesTask,
  FieldCustomerType,
} from '../../../types/field-sales';

type ActiveTab = 'today' | 'visits' | 'routes' | 'customers' | 'targets' | 'tasks' | 'analytics';

export function FieldSalesModule() {
  const { addToast } = useToast();

  // Tab State
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');

  // Data States
  const [metrics, setMetrics] = useState<FieldSalesDashboardMetrics | null>(null);
  const [visits, setVisits] = useState<FieldSalesVisit[]>([]);
  const [routes, setRoutes] = useState<FieldSalesRoute[]>([]);
  const [targets, setTargets] = useState<FieldSalesTarget[]>([]);
  const [tasks, setTasks] = useState<FieldSalesTask[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('today');

  // Modal States
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [selectedVisitForCheckIn, setSelectedVisitForCheckIn] = useState<FieldSalesVisit | null>(null);

  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [selectedVisitForCheckOut, setSelectedVisitForCheckOut] = useState<FieldSalesVisit | null>(null);

  const [quickViewModalOpen, setQuickViewModalOpen] = useState(false);
  const [quickViewCustomerType, setQuickViewCustomerType] = useState<FieldCustomerType | null>(null);
  const [quickViewCustomerId, setQuickViewCustomerId] = useState<string | null>(null);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedVisitForOrder, setSelectedVisitForOrder] = useState<FieldSalesVisit | null>(null);

  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [selectedVisitForCollection, setSelectedVisitForCollection] = useState<FieldSalesVisit | null>(null);

  const [createVisitModalOpen, setCreateVisitModalOpen] = useState(false);
  const [createRouteModalOpen, setCreateRouteModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);

  // Load all module data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchVisits(),
        fetchRoutes(),
        fetchTargets(),
        fetchTasks(),
        fetchCustomers(),
      ]);
    } catch (err) {
      console.error('Failed to load field sales data', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchVisits(),
        fetchRoutes(),
        fetchTargets(),
        fetchTasks(),
      ]);
      addToast({
        title: 'Synchronized',
        message: 'Field sales beats & telemetry refreshed.',
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        title: 'Sync Error',
        message: err.message || 'Failed to refresh data.',
        type: 'error',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchMetrics = async () => {
    const res = await fetch('/api/field-sales/dashboard/metrics', {
      headers: { 'x-organization-id': 'org-jyotsvan-corp' },
    });
    const json = await res.json();
    if (json.success) setMetrics(json.data);
  };

  const fetchVisits = async () => {
    const res = await fetch('/api/field-sales/visits?pageSize=100', {
      headers: { 'x-organization-id': 'org-jyotsvan-corp' },
    });
    const json = await res.json();
    if (json.success && json.data) setVisits(json.data.visits || []);
  };

  const fetchRoutes = async () => {
    const res = await fetch('/api/field-sales/routes', {
      headers: { 'x-organization-id': 'org-jyotsvan-corp' },
    });
    const json = await res.json();
    if (json.success) setRoutes(json.data || []);
  };

  const fetchTargets = async () => {
    const res = await fetch('/api/field-sales/targets', {
      headers: { 'x-organization-id': 'org-jyotsvan-corp' },
    });
    const json = await res.json();
    if (json.success) setTargets(json.data || []);
  };

  const fetchTasks = async () => {
    const res = await fetch('/api/field-sales/tasks', {
      headers: { 'x-organization-id': 'org-jyotsvan-corp' },
    });
    const json = await res.json();
    if (json.success) setTasks(json.data || []);
  };

  const fetchCustomers = async () => {
    const res = await fetch('/api/field-sales/customers?type=all', {
      headers: { 'x-organization-id': 'org-jyotsvan-corp' },
    });
    const json = await res.json();
    if (json.success) setCustomers(json.data || []);
  };

  // Handlers for Visits
  const handleOpenCheckIn = (visit: FieldSalesVisit) => {
    setSelectedVisitForCheckIn(visit);
    setCheckInModalOpen(true);
  };

  const handleOpenCheckOut = (visit: FieldSalesVisit) => {
    setSelectedVisitForCheckOut(visit);
    setCheckOutModalOpen(true);
  };

  const handleOpenQuickView = (type: FieldCustomerType, id: string) => {
    setQuickViewCustomerType(type);
    setQuickViewCustomerId(id);
    setQuickViewModalOpen(true);
  };

  const handleOpenBookOrder = (visit: FieldSalesVisit) => {
    setSelectedVisitForOrder(visit);
    setOrderModalOpen(true);
  };

  const handleOpenCollection = (visit: FieldSalesVisit) => {
    setSelectedVisitForCollection(visit);
    setCollectionModalOpen(true);
  };

  const handleStatusChange = async (visit: FieldSalesVisit, newStatus: 'skipped' | 'cancelled' | 'planned') => {
    try {
      const res = await fetch(`/api/field-sales/visits/${visit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': 'org-jyotsvan-corp',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update visit status.');

      addToast({
        title: 'Status Updated',
        message: `Visit marked as ${newStatus}.`,
        type: 'info',
      });
      fetchVisits();
      fetchMetrics();
    } catch (err: any) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleCompleteTask = async (task: FieldSalesTask) => {
    try {
      const res = await fetch(`/api/field-sales/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': 'org-jyotsvan-corp',
        },
        body: JSON.stringify({ status: 'completed' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to complete task.');

      addToast({
        title: 'Task Finished',
        message: 'Action item marked as resolved.',
        type: 'success',
      });
      fetchTasks();
      fetchMetrics();
    } catch (err: any) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  // Filtered lists
  const todayVisits = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return visits.filter((v) => {
      const vDate = v.planned_date.substring(0, 10);
      const isToday = vDate === todayStr;
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchesRoute = selectedRouteId === 'all' || v.route_id === selectedRouteId;
      return isToday && matchesStatus && matchesRoute;
    });
  }, [visits, statusFilter, selectedRouteId]);

  const allFilteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const matchesSearch =
        !searchQuery ||
        v.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.customer_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.customer_city?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = customerTypeFilter === 'all' || v.customer_type === customerTypeFilter;
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [visits, searchQuery, customerTypeFilter, statusFilter]);

  const formatCurrency = (val?: number | null) => {
    if (!val || val <= 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Field Sales & Beat Operations</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Phase 20 Live
                </span>
              </div>
              <p className="text-xs text-slate-500">
                GPS check-in, beat journey planning, on-site order booking & collection recovery
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              onClick={() => setCreateVisitModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Visit</span>
            </button>

            <button
              onClick={() => setCreateRouteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="hidden md:inline">New Beat Plan</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        {/* Top Summary Metrics Banner */}
        <FieldSalesMetricsHeader metrics={metrics} loading={loading} />

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-5 border-b border-slate-200/80 no-scrollbar">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'today'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Today's Beat ({todayVisits.length})
          </button>

          <button
            onClick={() => setActiveTab('visits')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'visits'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            All Visits ({visits.length})
          </button>

          <button
            onClick={() => setActiveTab('routes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'routes'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Beat Plans ({routes.length})
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'customers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Customer 360° Directory ({customers.length})
          </button>

          <button
            onClick={() => setActiveTab('targets')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'targets'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Quotas & Targets ({targets.length})
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Follow-ups & Tasks ({tasks.filter((t) => t.status !== 'completed').length})
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Leaderboard & Analytics
          </button>
        </div>

        {/* TAB 1: TODAY'S BEAT & VISITS */}
        {activeTab === 'today' && (
          <div className="space-y-4">
            {/* Filter Sub-bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700">Status:</span>
                {['all', 'in_progress', 'planned', 'completed', 'skipped'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition ${
                      statusFilter === st
                        ? 'bg-indigo-100 text-indigo-800 font-bold'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  className="text-xs font-medium border border-slate-300 rounded-lg p-1.5 bg-white outline-none"
                >
                  <option value="all">All Today's Routes / Ad-Hoc</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visit Cards Feed */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : todayVisits.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No visits scheduled for today yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select a permanent journey plan or schedule an on-ground retailer/distributor visit to start today's beat.
                </p>
                <button
                  onClick={() => setCreateVisitModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Schedule First Visit
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todayVisits.map((visit) => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    onCheckIn={handleOpenCheckIn}
                    onCheckOut={handleOpenCheckOut}
                    onQuickView={handleOpenQuickView}
                    onBookOrder={handleOpenBookOrder}
                    onRecordCollection={handleOpenCollection}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ALL VISITS & HISTORICAL LOGS */}
        {activeTab === 'visits' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search visits by customer, town, or code..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={customerTypeFilter}
                  onChange={(e) => setCustomerTypeFilter(e.target.value)}
                  className="text-xs font-medium border border-slate-300 rounded-lg p-1.5 bg-white outline-none"
                >
                  <option value="all">All Channels</option>
                  <option value="retailer">Retailers</option>
                  <option value="distributor">Distributors</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-medium border border-slate-300 rounded-lg p-1.5 bg-white outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="planned">Planned</option>
                  <option value="skipped">Skipped</option>
                </select>
              </div>
            </div>

            {/* List */}
            {allFilteredVisits.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                No visit records matched your filter criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allFilteredVisits.map((visit) => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    onCheckIn={handleOpenCheckIn}
                    onCheckOut={handleOpenCheckOut}
                    onQuickView={handleOpenQuickView}
                    onBookOrder={handleOpenBookOrder}
                    onRecordCollection={handleOpenCollection}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BEAT & ROUTES PLANNER */}
        {activeTab === 'routes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Permanent Journey Plans (PJP Beats)</h3>
                <p className="text-xs text-slate-500">
                  Pre-configured recurring field routes with sequenced merchant stops
                </p>
              </div>
              <button
                onClick={() => setCreateRouteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Beat Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">{route.name}</span>
                        {route.route_code && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {route.route_code}
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 uppercase">
                        {route.frequency}
                      </span>
                    </div>

                    {route.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{route.description}</p>
                    )}

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Scheduled Days:</span>
                        <span className="font-semibold text-slate-900">
                          {Array.isArray(route.days_of_week) && route.days_of_week.length > 0
                            ? route.days_of_week.join(', ')
                            : 'All Days'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Total Stops:</span>
                        <span className="font-semibold text-indigo-600">{route.total_stops || route.stops?.length || 0} stops</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Territory:</span>
                        <span className="font-semibold text-slate-800">{route.territory_name || 'Assigned Beat'}</span>
                      </div>
                    </div>

                    {/* Preview of first 3 stops */}
                    {route.stops && route.stops.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-700 block">Stops Sequence:</span>
                        <div className="space-y-1">
                          {route.stops.slice(0, 3).map((s, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] text-slate-600 flex items-center gap-1.5 truncate"
                            >
                              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px] shrink-0">
                                {s.stop_sequence || idx + 1}
                              </span>
                              <span className="truncate">{s.customer_name}</span>
                            </div>
                          ))}
                          {route.stops.length > 3 && (
                            <span className="text-[10px] text-slate-400 block pl-5">
                              +{route.stops.length - 3} more stops
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Rep: {route.salesperson_name || 'Assigned Rep'}
                    </span>
                    <button
                      onClick={() => {
                        addToast({
                          title: 'Beat Scheduled',
                          message: `Scheduled visits for ${route.name} today.`,
                          type: 'success',
                        });
                        fetchVisits();
                        setActiveTab('today');
                      }}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
                    >
                      Start Beat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOMERS 360 DIRECTORY */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer account, town, phone..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={customerTypeFilter}
                  onChange={(e) => setCustomerTypeFilter(e.target.value)}
                  className="text-xs font-medium border border-slate-300 rounded-lg p-1.5 bg-white outline-none"
                >
                  <option value="all">All Accounts</option>
                  <option value="retailer">Retail Merchants Only</option>
                  <option value="distributor">Distributors Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers
                .filter((c) => {
                  const matchSearch =
                    !searchQuery ||
                    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.city?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchType =
                    customerTypeFilter === 'all' || c.customer_type === customerTypeFilter;
                  return matchSearch && matchType;
                })
                .map((cust) => (
                  <div
                    key={cust.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              cust.customer_type === 'distributor'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {cust.customer_type === 'distributor' ? (
                              <Building2 className="w-5 h-5" />
                            ) : (
                              <Store className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 text-sm block truncate">
                              {cust.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="font-mono">{cust.code}</span>
                              <span>•</span>
                              <span className="capitalize">{cust.customer_type}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Location:</span>
                          <span className="font-medium text-slate-800 truncate max-w-[160px]">
                            {cust.city || cust.territory_name || 'Main Market'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Outstanding:</span>
                          <span className="font-bold text-rose-600 font-mono">
                            {formatCurrency(parseFloat(cust.outstanding_balance || '0'))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Credit Limit:</span>
                          <span className="font-medium text-slate-800 font-mono">
                            {formatCurrency(parseFloat(cust.credit_limit || '500000'))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenQuickView(cust.customer_type, cust.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        360° Profile
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setCreateVisitModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                        >
                          Plan Visit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 5: TARGETS & QUOTAS */}
        {activeTab === 'targets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sales Quotas & Target Achievements</h3>
                <p className="text-xs text-slate-500">
                  Monthly pacing and milestone tracking for revenue, visits, and recovery
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {targets.map((tgt) => {
                const achievementPct = tgt.achievement_percent || (tgt.target_value > 0
                  ? Math.round((tgt.achieved_value / tgt.target_value) * 100)
                  : 0);

                return (
                  <div
                    key={tgt.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-base block">{tgt.period_identifier || tgt.period_type}</span>
                        <span className="text-xs text-slate-500 capitalize">{tgt.target_type.replace('_', ' ')} Quota</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {achievementPct}% Paced
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-600">Target Fulfillment</span>
                        <span className="font-bold text-slate-900">
                          {tgt.target_type.includes('value') || tgt.target_type.includes('amount')
                            ? `${formatCurrency(tgt.achieved_value)} / ${formatCurrency(tgt.target_value)}`
                            : `${tgt.achieved_value} / ${tgt.target_value}`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, achievementPct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl text-xs flex justify-between text-slate-600">
                      <span>Rep: <strong className="text-slate-900">{tgt.salesperson_name}</strong></span>
                      <span className="capitalize">{tgt.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: TASKS & FOLLOW-UPS */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Field Tasks & Customer Commitments</h3>
                <p className="text-xs text-slate-500">
                  Follow-ups logged from visits, product sample deliveries, and collection reminders
                </p>
              </div>
              <button
                onClick={() => setCreateTaskModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-amber-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Follow-up Task
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition space-y-2.5 ${
                    task.status === 'completed'
                      ? 'bg-slate-50/70 border-slate-200 opacity-80'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 text-sm block truncate">
                        {task.title}
                      </span>
                      {task.customer_name && (
                        <span className="text-[11px] text-slate-500">
                          {task.customer_name} ({task.customer_type})
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        task.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-800'
                          : task.priority === 'high'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">
                      Due:{' '}
                      {new Date(task.due_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    {task.status !== 'completed' ? (
                      <button
                        onClick={() => handleCompleteTask(task)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Done
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: ANALYTICS & LEADERBOARD */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-500 block">On-Time Beat Compliance</span>
                <span className="text-2xl font-bold text-emerald-600">94.2%</span>
                <p className="text-[11px] text-slate-500">
                  Visits executed within scheduled time windows & beats
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-500 block">GPS Verification Rate</span>
                <span className="text-2xl font-bold text-indigo-600">98.5%</span>
                <p className="text-[11px] text-slate-500">
                  Field arrivals verified against retailer GPS coordinates
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-500 block">Strike Rate (Productive Visits)</span>
                <span className="text-2xl font-bold text-blue-600">76.8%</span>
                <p className="text-[11px] text-slate-500">
                  Visits resulting in an active order or collection
                </p>
              </div>
            </div>

            {/* Field Rep Leaderboard */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Field Sales Representative Leaderboard</h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-50 text-[11px] font-bold text-slate-600 grid grid-cols-12">
                  <span className="col-span-4">Representative</span>
                  <span className="col-span-2 text-right">Visits Done</span>
                  <span className="col-span-3 text-right">Orders Booked</span>
                  <span className="col-span-3 text-right">Collections Recovered</span>
                </div>

                <div className="p-3.5 bg-white text-xs grid grid-cols-12 items-center hover:bg-slate-50 transition">
                  <div className="col-span-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      VS
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Vikram Sharma</span>
                      <span className="text-[10px] text-slate-500">Maharashtra West</span>
                    </div>
                  </div>
                  <span className="col-span-2 text-right font-bold text-slate-900">42</span>
                  <span className="col-span-3 text-right font-bold text-emerald-700">₹8,45,000</span>
                  <span className="col-span-3 text-right font-bold text-purple-700">₹4,20,000</span>
                </div>

                <div className="p-3.5 bg-white text-xs grid grid-cols-12 items-center hover:bg-slate-50 transition">
                  <div className="col-span-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                      AK
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Anand Kulkarni</span>
                      <span className="text-[10px] text-slate-500">Pune District</span>
                    </div>
                  </div>
                  <span className="col-span-2 text-right font-bold text-slate-900">38</span>
                  <span className="col-span-3 text-right font-bold text-emerald-700">₹6,80,000</span>
                  <span className="col-span-3 text-right font-bold text-purple-700">₹3,50,000</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Check In Modal */}
      <CheckInModal
        isOpen={checkInModalOpen}
        visit={selectedVisitForCheckIn}
        onClose={() => {
          setCheckInModalOpen(false);
          setSelectedVisitForCheckIn(null);
        }}
        onSuccess={(updated) => {
          addToast({
            title: 'Arrival Logged',
            message: `Checked in at ${updated.customer_name}.`,
            type: 'success',
          });
          fetchVisits();
          fetchMetrics();
        }}
      />

      {/* 2. Check Out Modal */}
      <CheckOutModal
        isOpen={checkOutModalOpen}
        visit={selectedVisitForCheckOut}
        onClose={() => {
          setCheckOutModalOpen(false);
          setSelectedVisitForCheckOut(null);
        }}
        onSuccess={(updated) => {
          addToast({
            title: 'Visit Completed',
            message: `Check-out finalized for ${updated.customer_name}.`,
            type: 'success',
          });
          fetchVisits();
          fetchMetrics();
        }}
      />

      {/* 3. Customer Quick View Modal */}
      <CustomerQuickViewModal
        isOpen={quickViewModalOpen}
        customerType={quickViewCustomerType}
        customerId={quickViewCustomerId}
        onClose={() => {
          setQuickViewModalOpen(false);
          setQuickViewCustomerType(null);
          setQuickViewCustomerId(null);
        }}
        onScheduleVisit={(type, id) => {
          setCreateVisitModalOpen(true);
        }}
        onBookOrder={(type, id) => {
          setOrderModalOpen(true);
        }}
        onRecordCollection={(type, id) => {
          setCollectionModalOpen(true);
        }}
      />

      {/* 4. Order Booking Modal */}
      <OrderBookingModal
        isOpen={orderModalOpen}
        visit={selectedVisitForOrder}
        onClose={() => {
          setOrderModalOpen(false);
          setSelectedVisitForOrder(null);
        }}
        onSuccess={(order) => {
          addToast({
            title: 'Order Created',
            message: `Sales order #${order.order_number || 'Confirmed'} booked.`,
            type: 'success',
          });
          fetchVisits();
          fetchMetrics();
        }}
      />

      {/* 5. Collection Recording Modal */}
      <CollectionModal
        isOpen={collectionModalOpen}
        visit={selectedVisitForCollection}
        onClose={() => {
          setCollectionModalOpen(false);
          setSelectedVisitForCollection(null);
        }}
        onSuccess={(receipt) => {
          addToast({
            title: 'Collection Receipt Issued',
            message: `Payment recorded and credited to ledger.`,
            type: 'success',
          });
          fetchVisits();
          fetchMetrics();
        }}
      />

      {/* 6. Create Visit Modal */}
      <CreateVisitModal
        isOpen={createVisitModalOpen}
        onClose={() => setCreateVisitModalOpen(false)}
        onSuccess={(visit) => {
          addToast({
            title: 'Visit Scheduled',
            message: `Scheduled touchpoint for ${visit.customer_name}.`,
            type: 'success',
          });
          fetchVisits();
          fetchMetrics();
        }}
      />

      {/* 7. Create Route / Beat Modal */}
      <CreateRouteModal
        isOpen={createRouteModalOpen}
        onClose={() => setCreateRouteModalOpen(false)}
        onSuccess={(route) => {
          addToast({
            title: 'Beat Plan Created',
            message: `Route ${route.name} is now active.`,
            type: 'success',
          });
          fetchRoutes();
        }}
      />

      {/* 8. Create Task Modal */}
      <CreateTaskModal
        isOpen={createTaskModalOpen}
        onClose={() => setCreateTaskModalOpen(false)}
        onSuccess={(task) => {
          addToast({
            title: 'Task Created',
            message: 'Action item added to follow-ups.',
            type: 'success',
          });
          fetchTasks();
          fetchMetrics();
        }}
      />
    </div>
  );
}
