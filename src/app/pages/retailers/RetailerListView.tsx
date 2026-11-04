import React from 'react';
import {
  Search,
  Filter,
  Plus,
  Store,
  MapPin,
  Building2,
  Users,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Download,
} from 'lucide-react';
import type { RetailerMaster, RetailerStatus } from '../../../types/retailers.ts';

interface RetailerListViewProps {
  retailers: RetailerMaster[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  typeFilter: string;
  onTypeFilterChange: (val: string) => void;
  regionFilter: string;
  onRegionFilterChange: (val: string) => void;
  onSelectRetailer: (retailer: RetailerMaster) => void;
  onCreateRetailer: () => void;
  onUpdateStatus: (retailer: RetailerMaster, status: RetailerStatus) => void;
  onLogVisitForRetailer?: (retailer: RetailerMaster) => void;
  onCreateOrderForRetailer?: (retailer: RetailerMaster) => void;
}

export const RetailerListView: React.FC<RetailerListViewProps> = ({
  retailers,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  regionFilter,
  onRegionFilterChange,
  onSelectRetailer,
  onCreateRetailer,
  onUpdateStatus,
  onLogVisitForRetailer,
  onCreateOrderForRetailer,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportCSV = () => {
    if (retailers.length === 0) return;
    const headers = ['Code', 'Display Name', 'Legal Name', 'Type', 'Status', 'City', 'State', 'Region', 'GSTIN', 'Phone', 'Distributor', 'Credit Limit', 'Stock Units'];
    const rows = retailers.map((r) => [
      r.retailer_code,
      `"${r.display_name.replace(/"/g, '""')}"`,
      `"${r.legal_name.replace(/"/g, '""')}"`,
      r.retailer_type,
      r.status,
      r.city,
      r.state,
      r.region,
      r.gstin || '',
      r.phone,
      `"${(r.primary_distributor_name || '').replace(/"/g, '""')}"`,
      r.credit_limit,
      r.stock_units_on_hand || 0,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `retailers_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by code, store name, city, GSTIN, phone..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="blocked">Blocked</option>
              <option value="terminated">Terminated</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Store Types</option>
              <option value="agro_input_shop">Agro Input Shop</option>
              <option value="dealer_outlet">Dealer Outlet</option>
              <option value="specialty_store">Specialty Store</option>
              <option value="agricultural_retailer">Agricultural Retailer</option>
              <option value="cooperative_society">Cooperative Society</option>
              <option value="general_store">General Store</option>
            </select>

            <select
              value={regionFilter}
              onChange={(e) => onRegionFilterChange(e.target.value)}
              className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Regions</option>
              <option value="West">West</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="Central">Central</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={onCreateRetailer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Onboard Retailer
          </button>
        </div>
      </div>

      {/* Retailers Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Retailer Outlet</th>
                <th className="py-3 px-4">Type & Territory</th>
                <th className="py-3 px-4">Distributor & Salesperson</th>
                <th className="py-3 px-4">Credit Terms</th>
                <th className="py-3 px-4">Channel Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading retailer directory...
                  </td>
                </tr>
              ) : retailers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No retailers matching the current filters.
                  </td>
                </tr>
              ) : (
                retailers.map((r) => {
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      {/* Retailer Outlet */}
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => onSelectRetailer(r)}
                          className="cursor-pointer group space-y-0.5"
                        >
                          <div className="font-semibold text-slate-900 group-hover:text-emerald-600 transition flex items-center gap-2">
                            {r.display_name}
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-normal">
                              {r.retailer_code}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {r.city}, {r.state}
                            </span>
                            {r.gstin && <span className="text-slate-400 font-mono">GST: {r.gstin}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Type & Territory */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="inline-block text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize">
                            {r.retailer_type.replace(/_/g, ' ')}
                          </span>
                          <div className="text-[11px] text-slate-500">
                            {r.territory_name || r.region + ' Region'}
                          </div>
                        </div>
                      </td>

                      {/* Distributor & Salesperson */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-800 flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {r.primary_distributor_name || 'Direct / Unassigned'}
                          </div>
                          {r.assigned_salesperson_name && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              {r.assigned_salesperson_name}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Credit Terms */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900">{formatCurrency(r.credit_limit)}</div>
                          <div className="text-[11px] text-slate-500">
                            {r.payment_terms_days} days terms • {r.agreed_discount_percent}% disc
                          </div>
                          {r.credit_hold && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                              Credit Hold
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Channel Stock */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900">{formatCurrency(r.stock_valuation || 0)}</div>
                          <div className="text-[11px] text-slate-500">
                            {r.stock_units_on_hand || 0} units • {r.active_skus_count || 0} active SKUs
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            r.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : r.status === 'blocked'
                              ? 'bg-rose-50 text-rose-700'
                              : r.status === 'suspended'
                              ? 'bg-amber-50 text-amber-700'
                              : r.status === 'draft'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectRetailer(r)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                            title="View Full Retailer 360° Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {r.status === 'active' ? (
                            <button
                              onClick={() => onUpdateStatus(r, 'suspended')}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                              title="Suspend Retailer"
                            >
                              <AlertOctagon className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateStatus(r, 'active')}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                              title="Activate Retailer"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
