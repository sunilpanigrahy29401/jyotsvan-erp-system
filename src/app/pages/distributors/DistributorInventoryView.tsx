import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  TrendingUp,
  Download,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import type { DistributorStockItem, DistributorMaster } from '../../../types/distributors.ts';

interface DistributorInventoryViewProps {
  stockItems: DistributorStockItem[];
  distributors: DistributorMaster[];
  loading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  selectedDistributor: string;
  onDistributorChange: (distId: string) => void;
  nearExpiryOnly: boolean;
  onNearExpiryChange: (val: boolean) => void;
  onRefresh: () => void;
}

export const DistributorInventoryView: React.FC<DistributorInventoryViewProps> = ({
  stockItems,
  distributors,
  loading,
  search,
  onSearchChange,
  selectedDistributor,
  onDistributorChange,
  nearExpiryOnly,
  onNearExpiryChange,
  onRefresh,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalUnits = stockItems.reduce((acc, curr) => acc + (curr.quantity_on_hand || 0), 0);
  const totalValuation = stockItems.reduce((acc, curr) => acc + (curr.estimated_valuation || 0), 0);
  const nearExpiryCount = stockItems.filter(item => {
    if (!item.expiry_date) return false;
    const diffDays = (new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diffDays <= 90;
  }).length;

  return (
    <div className="space-y-4">
      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Channel Units</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{totalUnits.toLocaleString()} Units</div>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Channel Inventory Value</span>
            <div className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalValuation)}</div>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Near-Expiry Batches (&le;90d)</span>
            <div className="text-xl font-bold text-amber-600 mt-1">{nearExpiryCount} SKU Batches</div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by SKU name, SKU code, batch number, distributor..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
            />
          </div>

          <select
            value={selectedDistributor}
            onChange={e => onDistributorChange(e.target.value)}
            className="text-xs py-2 px-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none font-medium text-slate-700 max-w-xs"
          >
            <option value="all">All Channel Distributors</option>
            {distributors.map(d => (
              <option key={d.id} value={d.id}>
                {d.distributor_code} — {d.display_name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={nearExpiryOnly}
              onChange={e => onNearExpiryChange(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            Near Expiry Only
          </label>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">SKU Information</th>
                <th className="py-3 px-4">Distributor Channel</th>
                <th className="py-3 px-4">Batch Details</th>
                <th className="py-3 px-4 text-right">Available</th>
                <th className="py-3 px-4 text-right">On Hand</th>
                <th className="py-3 px-4 text-right">Unit Rate</th>
                <th className="py-3 px-4 text-right">Valuation</th>
                <th className="py-3 px-4">Source C&F</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p>Loading channel stock levels...</p>
                  </td>
                </tr>
              ) : stockItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No channel stock records found</p>
                    <p className="text-xs text-slate-400 mt-1">Execute a C&F dispatch to allocate stock to channel partners.</p>
                  </td>
                </tr>
              ) : (
                stockItems.map(item => {
                  const isExpiringSoon = item.expiry_date
                    ? (new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 90
                    : false;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          <div>
                            <span className="font-mono text-[11px] text-blue-600 font-semibold block">{item.sku_code}</span>
                            <span className="text-xs font-bold text-slate-900 block">{item.sku_name}</span>
                            <span className="text-[11px] text-slate-500 block">{item.category || 'General'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900 block">{item.distributor_name}</span>
                          <span className="text-[11px] text-slate-500 block font-mono">{item.distributor_code || item.distributor_id}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs font-semibold text-slate-800 block">
                            {item.batch_number || 'Standard Batch'}
                          </span>
                          {item.expiry_date && (
                            <span className={`text-[11px] font-medium flex items-center gap-1 ${isExpiringSoon ? 'text-amber-600' : 'text-slate-500'}`}>
                              {isExpiringSoon && <Clock className="w-3 h-3" />}
                              Exp: {new Date(item.expiry_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                        {item.quantity_available?.toLocaleString() || 0}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {item.quantity_on_hand?.toLocaleString() || 0}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-600 font-medium">
                        {formatCurrency(item.unit_cost || 0)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(item.estimated_valuation || 0)}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <span className="text-xs font-medium">{item.source_cf_name || 'Primary Depot'}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
