import React from 'react';
import {
  Building2,
  TrendingUp,
  Package,
  Truck,
  AlertTriangle,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
  Boxes,
  Plus,
  Send,
  FileText,
} from 'lucide-react';
import type { DistributorSummaryMetrics, DistributorMaster, DistributorTransfer } from '../../../types/distributors.ts';

interface DistributorDashboardViewProps {
  metrics: DistributorSummaryMetrics | null;
  distributors: DistributorMaster[];
  transfers: DistributorTransfer[];
  onOpenCreateDistributor: () => void;
  onOpenCreateTransfer: () => void;
  onSelectDistributor: (dist: DistributorMaster) => void;
  onNavigateTab: (tab: string) => void;
}

export const DistributorDashboardView: React.FC<DistributorDashboardViewProps> = ({
  metrics,
  distributors,
  transfers,
  onOpenCreateDistributor,
  onOpenCreateTransfer,
  onSelectDistributor,
  onNavigateTab,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const activeCount = metrics?.active_distributors || 0;
  const totalCount = metrics?.total_distributors || 0;
  const activePercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

  const inTransitTransfers = transfers.filter(t => t.status === 'in_transit');
  const pendingOrdersCount = metrics?.pending_orders_count || 0;
  const openDiscrepancies = metrics?.open_discrepancies_count || 0;

  return (
    <div className="space-y-6">
      {/* Top Action & Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Phase 16 Operational
            </span>
            <span className="text-xs text-slate-400 font-medium">Secondary Channel Distribution Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-2">Distributor Management & Commercial Control</h2>
          <p className="text-sm text-slate-300 max-w-2xl mt-1">
            Manage authorized regional distributors, territory allocations, C&F-to-distributor dispatches,
            commercial credit limits, and real-time channel stock visibility across India.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="btn-quick-create-transfer"
            onClick={onOpenCreateTransfer}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Send className="w-4 h-4 text-emerald-400" />
            Dispatch from C&F
          </button>
          <button
            id="btn-quick-onboard-distributor"
            onClick={onOpenCreateDistributor}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Onboard Distributor
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total & Active Network */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distributor Network</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalCount}</span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {activeCount} Active ({activePercent}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Mapped C&F Depots</span>
            <span className="font-semibold text-slate-700">{metrics?.total_mapped_cfs || 0} Hubs</span>
          </div>
        </div>

        {/* Channel Stock Valuation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Channel Stock Value</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(metrics?.estimated_channel_stock_value || 0)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Total Units on Ground</span>
            <span className="font-semibold text-slate-700">
              {(metrics?.total_channel_stock_units || 0).toLocaleString()} Units
            </span>
          </div>
        </div>

        {/* Dispatches & In-Transit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In-Transit Dispatches</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics?.transfers_in_transit_count || 0}</span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Consignments
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Pending Receiving</span>
            <span className="font-semibold text-slate-700">{metrics?.pending_receiving_count || 0} Orders</span>
          </div>
        </div>

        {/* Credit Exposure & Limits */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit Allocation</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(metrics?.total_credit_limit || 0)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Utilized Exposure</span>
            <span className="font-semibold text-purple-700">
              {formatCurrency(metrics?.total_credit_utilized || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Row: Active Pipelines & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* In-Transit Dispatches List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Active C&F-to-Distributor Dispatches</h3>
              <p className="text-xs text-slate-500">Live consignments moving from C&F depots to channel partners</p>
            </div>
            <button
              onClick={() => onNavigateTab('transfers')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all dispatches <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {inTransitTransfers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No active in-transit dispatches currently.
              </div>
            ) : (
              inTransitTransfers.slice(0, 5).map(trf => (
                <div key={trf.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{trf.transfer_number}</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">
                          In Transit
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">{trf.cf_name}</span> → <span className="font-medium text-slate-700">{trf.distributor_name}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">
                      {trf.total_dispatched_quantity || trf.total_requested_quantity} units
                    </div>
                    <div className="text-xs text-slate-500">
                      Carrier: {trf.shipping_carrier || 'Fleet Transport'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Operational Attention & Quick Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Operational Attention</h3>
            <p className="text-xs text-slate-500 mb-4">Pending items requiring channel coordinator review</p>

            <div className="space-y-3">
              {/* Discrepancies */}
              <div 
                onClick={() => onNavigateTab('discrepancies')}
                className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-lg flex items-center justify-between cursor-pointer hover:bg-amber-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Open Receiving Discrepancies</div>
                    <div className="text-[11px] text-slate-600">Shortages or transit damages pending review</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                  {openDiscrepancies}
                </span>
              </div>

              {/* Order Requests */}
              <div 
                onClick={() => onNavigateTab('orders')}
                className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-lg flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Pending Order Requests</div>
                    <div className="text-[11px] text-slate-600">Distributor bookings awaiting approval</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-200 text-blue-900">
                  {pendingOrdersCount}
                </span>
              </div>

              {/* Returns */}
              <div 
                onClick={() => onNavigateTab('returns')}
                className="p-3 bg-rose-50/60 border border-rose-200/70 rounded-lg flex items-center justify-between cursor-pointer hover:bg-rose-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Distributor Return Claims</div>
                    <div className="text-[11px] text-slate-600">Reverse logistics / damage claims</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-900">
                  {metrics?.open_returns_count || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Hub summary */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Channel Integration Health</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Synced
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Distributors List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Primary Channel Distributors</h3>
            <p className="text-xs text-slate-500">Top active franchise & super-distributor partners</p>
          </div>
          <button
            onClick={() => onNavigateTab('registry')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Open Full Directory ({distributors.length}) <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {distributors.slice(0, 6).map(dist => (
            <div
              key={dist.id}
              onClick={() => onSelectDistributor(dist)}
              className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all bg-slate-50/50 hover:bg-white"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-medium text-slate-500">{dist.distributor_code}</span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">{dist.display_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{dist.city}, {dist.state} • {dist.region}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    dist.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : dist.status === 'suspended'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {dist.status}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Stock Units:</span>
                  <span className="font-semibold text-slate-800">
                    {(dist.stock_units_on_hand || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Credit Limit:</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(dist.credit_limit)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
