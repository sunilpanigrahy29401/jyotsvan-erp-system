import React from 'react';
import {
  Building2,
  ArrowRightLeft,
  Send,
  Package,
  ShieldAlert,
  TrendingUp,
  MapPin,
  Truck,
  Plus,
  ArrowUpRight,
  Warehouse,
} from 'lucide-react';
import type { CFSummaryMetrics, CFMaster, CFTransfer, CFDispatch } from '../../../types/cfs';

interface CFDashboardViewProps {
  metrics: CFSummaryMetrics | null;
  cfs: CFMaster[];
  recentTransfers: CFTransfer[];
  recentDispatches: CFDispatch[];
  onOpenCreateCF: () => void;
  onOpenCreateTransfer: () => void;
  onOpenCreateDispatch: () => void;
  onSelectTab: (tab: 'registry' | 'transfers' | 'inventory' | 'dispatches' | 'discrepancies') => void;
}

export const CFDashboardView: React.FC<CFDashboardViewProps> = ({
  metrics,
  cfs,
  recentTransfers,
  recentDispatches,
  onOpenCreateCF,
  onOpenCreateTransfer,
  onOpenCreateDispatch,
  onSelectTab,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Telemetry KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500 font-medium">Registered C&F Partners</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1">
              {metrics?.total_cfs || cfs.length}
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-emerald-600 mt-1 font-medium">
              <span>{metrics?.active_cfs || cfs.filter(c => c.status === 'active').length} Active</span>
              <span>&bull;</span>
              <span className="text-neutral-500">{metrics?.total_warehouses || 3} Depots</span>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500 font-medium">Transfers In-Transit</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {recentTransfers.filter(t => t.status === 'in_transit').length}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              En route from plants to regional depots
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500 font-medium">Depot Stock In Custody</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              ₹{((metrics?.estimated_inventory_value || 14800000) / 10000000).toFixed(2)} Cr
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              {(metrics?.total_stock_units || 45200).toLocaleString('en-IN')} units on hand
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500 font-medium">Pending Variances & Claims</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {metrics?.total_discrepancy_count || 1}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Damages & shortages under inquiry
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Actions Strip */}
      <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 rounded-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold">C&F Logistics Operational Desk</h3>
          <p className="text-xs text-indigo-200 mt-0.5">
            Coordinate inter-facility stock transfers, manage carrier manifests, and execute distributor gate-outs.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenCreateCF}
            className="px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard C&F</span>
          </button>
          <button
            onClick={onOpenCreateTransfer}
            className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Plant-to-Depot Transfer</span>
          </button>
          <button
            onClick={onOpenCreateDispatch}
            className="px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Outbound Dispatch</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Regional Network & Active Movement Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Regional Partner Overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Regional C&F Network & Territory Depots</span>
            </h3>
            <button
              onClick={() => onSelectTab('registry')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
            >
              <span>View All Agencies ({cfs.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cfs.slice(0, 4).map((cf) => (
              <div
                key={cf.id}
                className="p-4 bg-white rounded-xl border border-neutral-200 hover:border-indigo-300 transition-all shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded">
                      {cf.cf_code}
                    </span>
                    <h4 className="text-sm font-bold text-neutral-900 mt-1">{cf.legal_name}</h4>
                    <p className="text-xs text-neutral-500">{cf.city}, {cf.state} &bull; {cf.region}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                    {cf.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-2 text-xs text-neutral-600">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Warehouses</span>
                    <strong className="text-neutral-800 font-semibold">{cf.warehouses?.length || 1} Mapped</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Commission</span>
                    <strong className="text-neutral-800 font-semibold">{cf.commission_rate || 0}%</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Live Transfer Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center space-x-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Active Transfers Pipeline</span>
            </h3>
            <button
              onClick={() => onSelectTab('transfers')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
            >
              <span>Manage ({recentTransfers.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-4 divide-y divide-neutral-100 shadow-xs space-y-3">
            {recentTransfers.slice(0, 4).map((t) => (
              <div key={t.id} className="pt-3 first:pt-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700">
                    {t.transfer_number}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase bg-blue-50 text-blue-800">
                    {t.status}
                  </span>
                </div>
                <p className="text-xs font-medium text-neutral-800">{t.cf_name || 'C&F Partner'}</p>
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Carrier: {t.shipping_carrier || 'Direct Logistics'}</span>
                  <span>{t.total_requested_quantity} Units</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
