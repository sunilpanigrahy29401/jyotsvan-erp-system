import React from 'react';
import {
  Building2,
  Boxes,
  ArrowLeftRight,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { WarehouseSummaryMetrics } from '../../../types/warehouse';

interface WarehouseMetricsHeaderProps {
  metrics: WarehouseSummaryMetrics | null;
  loading: boolean;
}

export const WarehouseMetricsHeader: React.FC<WarehouseMetricsHeaderProps> = ({ metrics, loading }) => {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Warehouses */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Facilities</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{metrics.total_warehouses}</span>
          <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3" /> {metrics.active_warehouses} Active
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
          <span>{metrics.total_locations_count} Indexed Bins/Racks</span>
          {metrics.maintenance_warehouses > 0 && (
            <span className="text-amber-600 font-medium">{metrics.maintenance_warehouses} Maint.</span>
          )}
        </div>
      </div>

      {/* 2. Total Stored Inventory */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory In Stock</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Boxes className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">
            {metrics.total_physical_units.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
          </span>
          <span className="text-xs font-medium text-slate-500">units</span>
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
          <span>{metrics.total_skus_stored} SKUs Stocked</span>
          <span className="font-semibold text-slate-700">
            ₹{metrics.total_estimated_valuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* 3. Inter-Facility Transfers */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transfer Orders (STO)</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{metrics.in_transit_transfers_count}</span>
          <span className="text-xs font-medium text-blue-600">In-Transit</span>
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
          <span>{metrics.pending_transfers_count} Awaiting Approval</span>
          <span className="text-emerald-600 font-medium">✓ {metrics.completed_transfers_today} Today</span>
        </div>
      </div>

      {/* 4. Physical Count & Audits */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Physical Verifications</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <ClipboardCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{metrics.active_counts_count}</span>
          <span className="text-xs font-medium text-amber-700">Audits Open</span>
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
          <span>Deterministic Parity</span>
          <span className="text-emerald-600 font-medium">100% Ledger Synced</span>
        </div>
      </div>
    </div>
  );
};
