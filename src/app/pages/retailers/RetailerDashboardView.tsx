import React from 'react';
import {
  Store,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShoppingBag,
  TrendingUp,
  Package,
  RotateCcw,
  ShieldAlert,
  Calendar,
  Users,
  MapPin,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type { RetailerSummaryMetrics, RetailerMaster, RetailerFollowUp, RetailerVisit, RetailerOrderRequest } from '../../../types/retailers.ts';

interface RetailerDashboardViewProps {
  metrics: RetailerSummaryMetrics | null;
  recentRetailers: RetailerMaster[];
  urgentFollowups: RetailerFollowUp[];
  recentVisits: RetailerVisit[];
  recentOrders: RetailerOrderRequest[];
  onSelectRetailer: (retailer: RetailerMaster) => void;
  onNavigateTab: (tab: 'registry' | 'inventory' | 'orders' | 'returns' | 'visits' | 'followups') => void;
  onCreateRetailer: () => void;
  onLogVisit: () => void;
}

export const RetailerDashboardView: React.FC<RetailerDashboardViewProps> = ({
  metrics,
  recentRetailers,
  urgentFollowups,
  recentVisits,
  recentOrders,
  onSelectRetailer,
  onNavigateTab,
  onCreateRetailer,
  onLogVisit,
}) => {
  const m = metrics || {
    totalRetailers: 0,
    activeRetailers: 0,
    newRetailersThisMonth: 0,
    inactiveOrBlockedRetailers: 0,
    pendingOrderRequests: 0,
    pendingOrdersValue: 0,
    pendingFollowupsCount: 0,
    overdueFollowupsCount: 0,
    totalChannelStockUnits: 0,
    totalChannelStockValuation: 0,
    nearExpiryItemsCount: 0,
    activeReturnsCount: 0,
    totalCreditExposure: 0,
    totalCreditLimitAssigned: 0,
    creditHoldCount: 0,
    recentVisitsCount: 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-xl shadow-sm border border-slate-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2.5">
            <Store className="w-6 h-6 text-emerald-400" />
            Retailer Network & Channel Operations
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Downstream retail partner directory, channel inventory visibility, order requests, and field sales engagement.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onLogVisit}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            Log Field Visit
          </button>
          <button
            onClick={onCreateRetailer}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Onboard Retailer
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total & Active Retailers */}
        <div
          onClick={() => onNavigateTab('registry')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Retailer Outlets</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{m.totalRetailers}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {m.activeRetailers} Active
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>+{m.newRetailersThisMonth} new this month</span>
            <span className="text-slate-400">{m.inactiveOrBlockedRetailers} inactive/blocked</span>
          </div>
        </div>

        {/* Channel Inventory */}
        <div
          onClick={() => onNavigateTab('inventory')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Channel Stock Valuation</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(m.totalChannelStockValuation)}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>{m.totalChannelStockUnits.toLocaleString()} units on hand</span>
            {m.nearExpiryItemsCount > 0 ? (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {m.nearExpiryItemsCount} near expiry
              </span>
            ) : (
              <span className="text-emerald-600">Stock fresh</span>
            )}
          </div>
        </div>

        {/* Pending Orders */}
        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Order Requests</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{m.pendingOrderRequests}</span>
            <span className="text-xs text-slate-500">Pending Review</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Estimated Value</span>
            <span className="font-semibold text-slate-700">{formatCurrency(m.pendingOrdersValue)}</span>
          </div>
        </div>

        {/* Field Sales & Follow-ups */}
        <div
          onClick={() => onNavigateTab('followups')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Tasks & Follow-ups</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{m.pendingFollowupsCount}</span>
            {m.overdueFollowupsCount > 0 ? (
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                {m.overdueFollowupsCount} Overdue
              </span>
            ) : (
              <span className="text-xs font-medium text-emerald-600">On Schedule</span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>{m.recentVisitsCount} visits logged (30d)</span>
            {m.activeReturnsCount > 0 && (
              <span className="text-rose-500 font-medium">{m.activeReturnsCount} returns</span>
            )}
          </div>
        </div>
      </div>

      {/* Operational 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Retailers Directory & Pending Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Retailers */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Retail Merchant Outlets</h3>
              </div>
              <button
                onClick={() => onNavigateTab('registry')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentRetailers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No retailer outlets registered yet.</div>
              ) : (
                recentRetailers.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => onSelectRetailer(r)}
                    className="p-4 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{r.display_name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {r.retailer_code}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            r.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : r.status === 'blocked' || r.status === 'suspended'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {r.city}, {r.state} ({r.region})
                        </span>
                        {r.primary_distributor_name && (
                          <span className="text-slate-400">
                            Distributor: <span className="text-slate-600 font-medium">{r.primary_distributor_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-900">
                        {formatCurrency(r.stock_valuation || 0)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {r.stock_units_on_hand || 0} units • {r.active_skus_count || 0} SKUs
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Order Requests */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-purple-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Replenishment Order Requests</h3>
              </div>
              <button
                onClick={() => onNavigateTab('orders')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View all orders <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No recent order requests.</div>
              ) : (
                recentOrders.slice(0, 4).map((o) => (
                  <div key={o.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 text-sm font-mono">{o.order_number}</span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                            o.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : o.status === 'submitted'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Retailer: <span className="font-medium text-slate-700">{o.retailer_name}</span> • Fulfillment:{' '}
                        <span className="text-slate-600">{o.distributor_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {formatCurrency(o.total_estimated_amount)}
                      </div>
                      <div className="text-xs text-slate-400">{o.total_quantity} units ({o.total_items_count} items)</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Urgent Follow-ups & Recent Field Visits */}
        <div className="space-y-6">
          {/* Urgent Follow-ups */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-slate-900 text-sm">Action Items & Follow-ups</h3>
              </div>
              <button
                onClick={() => onNavigateTab('followups')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                All tasks
              </button>
            </div>
            <div className="p-4 space-y-3">
              {urgentFollowups.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No pending follow-ups.</div>
              ) : (
                urgentFollowups.slice(0, 5).map((f) => (
                  <div
                    key={f.id}
                    className={`p-3 rounded-lg border ${
                      f.is_overdue
                        ? 'border-rose-200 bg-rose-50/40'
                        : f.priority === 'urgent'
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-slate-100 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 leading-tight">{f.subject}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          f.is_overdue
                            ? 'bg-rose-100 text-rose-800'
                            : f.priority === 'urgent'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {f.is_overdue ? 'Overdue' : f.priority}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>{f.retailer_name}</span>
                      <span className="font-medium text-slate-600">
                        Due: {new Date(f.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Field Visits */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-slate-900 text-sm">Recent Field Visits</h3>
              </div>
              <button
                onClick={() => onNavigateTab('visits')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                All visits
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentVisits.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No logged field visits.</div>
              ) : (
                recentVisits.slice(0, 4).map((v) => (
                  <div key={v.id} className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">{v.retailer_name}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(v.visit_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 line-clamp-1">{v.notes || v.outcome || v.purpose}</div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Officer: {v.salesperson_name}</span>
                      <span className="capitalize">{v.purpose.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
