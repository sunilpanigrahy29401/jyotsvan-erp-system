import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ChevronRight,
  Download,
  CreditCard,
  Boxes,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
} from 'lucide-react';
import type { DistributorMaster, DistributorType, DistributorStatus } from '../../../types/distributors.ts';

interface DistributorListViewProps {
  distributors: DistributorMaster[];
  total: number;
  loading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  regionFilter: string;
  onRegionFilterChange: (region: string) => void;
  onOpenCreateDistributor: () => void;
  onSelectDistributor: (distributor: DistributorMaster) => void;
  onRefresh: () => void;
}

export const DistributorListView: React.FC<DistributorListViewProps> = ({
  distributors,
  total,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  regionFilter,
  onRegionFilterChange,
  onOpenCreateDistributor,
  onSelectDistributor,
  onRefresh,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getStatusBadge = (status: DistributorStatus) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Active</span>;
      case 'suspended':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Suspended</span>;
      case 'blocked':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Blocked</span>;
      case 'terminated':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">Terminated</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const getTypeLabel = (type: DistributorType) => {
    switch (type) {
      case 'super_distributor':
        return 'Super Distributor';
      case 'primary':
        return 'Primary Distributor';
      case 'regional':
        return 'Regional Distributor';
      case 'state':
        return 'State Franchisee';
      case 'district':
        return 'District Distributor';
      case 'specialty':
        return 'Specialty Channel';
      default:
        return type;
    }
  };

  const exportCSV = () => {
    const headers = ['Code', 'Display Name', 'Legal Name', 'Type', 'Status', 'City', 'State', 'Region', 'Phone', 'Email', 'Credit Limit', 'Stock Units'];
    const rows = distributors.map(d => [
      d.distributor_code,
      `"${d.display_name.replace(/"/g, '""')}"`,
      `"${d.legal_name.replace(/"/g, '""')}"`,
      d.distributor_type,
      d.status,
      d.city,
      d.state,
      d.region,
      d.phone,
      d.email,
      d.credit_limit,
      d.stock_units_on_hand || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jyotsvan_Distributors_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search distributor code, business name, city, GSTIN, phone..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            className="text-xs py-2 px-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none font-medium text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="blocked">Blocked</option>
            <option value="draft">Draft</option>
            <option value="terminated">Terminated</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => onTypeFilterChange(e.target.value)}
            className="text-xs py-2 px-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none font-medium text-slate-700 hidden sm:block"
          >
            <option value="all">All Distributor Types</option>
            <option value="super_distributor">Super Distributor</option>
            <option value="primary">Primary Distributor</option>
            <option value="regional">Regional</option>
            <option value="state">State</option>
            <option value="district">District</option>
          </select>

          <select
            value={regionFilter}
            onChange={e => onRegionFilterChange(e.target.value)}
            className="text-xs py-2 px-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none font-medium text-slate-700 hidden lg:block"
          >
            <option value="all">All Regions</option>
            <option value="West">West</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="Central">Central</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            title="Export CSV"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            id="btn-onboard-distributor-list"
            onClick={onOpenCreateDistributor}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Onboard Distributor
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Distributor Details</th>
                <th className="py-3 px-4">Location & Territory</th>
                <th className="py-3 px-4">Mapped C&F</th>
                <th className="py-3 px-4">Channel Stock</th>
                <th className="py-3 px-4">Credit Exposure</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p>Loading authorized distributors...</p>
                  </td>
                </tr>
              ) : distributors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No distributors matching query</p>
                    <p className="text-xs text-slate-400 mt-1">Try changing filters or onboard a new distributor partner.</p>
                  </td>
                </tr>
              ) : (
                distributors.map(dist => {
                  const creditLimit = dist.credit_limit || 0;
                  const creditUtilized = dist.current_outstanding_amount || 0;
                  const utilPercent = creditLimit > 0 ? Math.min(100, Math.round((creditUtilized / creditLimit) * 100)) : 0;

                  return (
                    <tr
                      key={dist.id}
                      onClick={() => onSelectDistributor(dist)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 mt-0.5">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-mono text-[11px] text-blue-600 font-semibold block">{dist.distributor_code}</span>
                            <span className="text-sm font-bold text-slate-900 line-clamp-1">{dist.display_name}</span>
                            <span className="text-[11px] text-slate-500 block">{getTypeLabel(dist.distributor_type)} • GSTIN: {dist.gstin || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-medium text-slate-800 block">{dist.city}, {dist.state}</span>
                          <span className="text-[11px] text-slate-500 block">{dist.territory_name || dist.region + ' Region'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 block">{dist.mapped_cfs_count || 1} C&F Depots</span>
                          <span className="text-[11px] text-slate-500 block">{dist.active_skus_count || 5} Active SKUs</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block">{(dist.stock_units_on_hand || 0).toLocaleString()} Units</span>
                          <span className="text-[11px] text-emerald-600 font-medium block">Valuation: {formatCurrency(dist.stock_valuation || 0)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">{formatCurrency(creditLimit)}</span>
                            <span className="text-slate-500">{utilPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                utilPercent > 85 ? 'bg-rose-500' : utilPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${utilPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(dist.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSelectDistributor(dist);
                          }}
                          className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-md font-medium text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          Manage <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {distributors.length} of {total} registered distributors</span>
          <span>Sorted by registration date (newest first)</span>
        </div>
      </div>
    </div>
  );
};
