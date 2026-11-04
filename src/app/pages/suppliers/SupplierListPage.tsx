import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Filter,
  Download,
  Phone,
  Mail,
  MapPin,
  Star,
  Layers,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowUpDown,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Supplier, SupplierFilterParams, SupplierType, SupplierStatus } from '../../../types/suppliers';
import { supplierService } from '../../../services/supplierService';

interface SupplierListPageProps {
  onSelectSupplier: (supplierId: string) => void;
  onOpenCreateModal: () => void;
  onOpenStatusModal: (supplier: Supplier) => void;
  organizationId: string;
  hasCreatePermission: boolean;
}

export const SupplierListPage: React.FC<SupplierListPageProps> = ({
  onSelectSupplier,
  onOpenCreateModal,
  onOpenStatusModal,
  organizationId,
  hasCreatePermission,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filters
  const [queryText, setQueryText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  // Summary Metrics
  const [stats, setStats] = useState({
    totalCount: 0,
    activeCount: 0,
    preferredCount: 0,
    totalMappedSkus: 0
  });

  useEffect(() => {
    fetchSuppliers();
  }, [page, pageSize, typeFilter, statusFilter, ratingFilter, organizationId]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params: SupplierFilterParams = {
        organizationId,
        page,
        pageSize,
        query: queryText.trim() || undefined,
        supplierType: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        ratingStatus: ratingFilter !== 'all' ? ratingFilter : undefined,
      };

      const res = await supplierService.getSuppliers(params);
      setSuppliers(res.data);
      setTotal(res.total);

      // Compute quick metrics
      const active = res.data.filter(s => s.status === 'active').length;
      const preferred = res.data.filter(s => s.rating_status === 'preferred').length;
      const skus = res.data.reduce((acc, s) => acc + (s.sku_count || 0), 0);

      setStats({
        totalCount: res.total,
        activeCount: active,
        preferredCount: preferred,
        totalMappedSkus: skus
      });
    } catch (err) {
      console.error('Failed to load suppliers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSuppliers();
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const data = await supplierService.exportSuppliers(organizationId);
      if (!data || data.length === 0) {
        alert('No supplier records available for export');
        return;
      }

      // Format CSV
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(fieldName => {
            const val = row[fieldName] !== null && row[fieldName] !== undefined ? String(row[fieldName]) : '';
            return `"${val.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Jyotsvan_Suppliers_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: SupplierStatus) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Active</span>;
      case 'inactive':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Inactive</span>;
      case 'blocked':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Blocked</span>;
      case 'archived':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Archived</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'preferred':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            Preferred
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Approved
          </span>
        );
      case 'conditional':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            Conditional
          </span>
        );
      case 'blacklisted':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800">
            Blacklisted
          </span>
        );
      default:
        return <span className="text-xs text-slate-600 capitalize">{rating}</span>;
    }
  };

  const getTypeLabel = (type: SupplierType) => {
    switch (type) {
      case 'raw_material': return 'Raw Materials';
      case 'packaging': return 'Packaging';
      case 'chemical': return 'Chemicals & Solvents';
      case 'equipment': return 'Equipment & Pumps';
      case 'consumables': return 'Consumables';
      case 'service': return 'Service Provider';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Registered Vendors</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalCount}</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active for Procurement</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.activeCount}</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preferred Tier Partners</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.preferredCount}</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Star className="w-6 h-6 fill-amber-500" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active SKU Linkages</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.totalMappedSkus}</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action Bar & Multi-Criteria Filtering */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search by vendor name, code, GST, phone..."
              className="w-full pl-9 pr-20 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Search
            </button>
          </form>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={fetchSuppliers}
              title="Refresh dataset"
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              disabled={isExporting || suppliers.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            {hasCreatePermission && (
              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Register Vendor</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            <option value="all">All Vendor Types</option>
            <option value="raw_material">Raw Materials</option>
            <option value="packaging">Packaging</option>
            <option value="chemical">Chemicals & Solvents</option>
            <option value="equipment">Equipment & Pumps</option>
            <option value="consumables">Consumables</option>
            <option value="service">Service Provider</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            <option value="all">All Rating Tiers</option>
            <option value="preferred">Preferred</option>
            <option value="approved">Approved</option>
            <option value="standard">Standard</option>
            <option value="conditional">Conditional</option>
          </select>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Vendor Code & Name</th>
                <th className="py-3 px-4">Category / Type</th>
                <th className="py-3 px-4">Rating Tier</th>
                <th className="py-3 px-4">Primary Representative</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Payment Terms</th>
                <th className="py-3 px-4 text-center">SKUs</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading supplier directory...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-semibold text-slate-700">No suppliers found matching current criteria</p>
                    <p className="text-xs text-slate-500 mt-1">Try broadening your search query or reset filters</p>
                  </td>
                </tr>
              ) : (
                suppliers.map((sup) => (
                  <tr
                    key={sup.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectSupplier(sup.id)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {sup.supplier_code.split('-')[1] || sup.supplier_code.slice(0, 3)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                            {sup.supplier_name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                            <span>{sup.supplier_code}</span>
                            {sup.tax_id && (
                              <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-600">
                                GST: {sup.tax_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-xs font-medium text-slate-800">
                        {getTypeLabel(sup.supplier_type)}
                      </span>
                      {sup.industry && (
                        <p className="text-[11px] text-slate-500">{sup.industry}</p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {getRatingBadge(sup.rating_status)}
                    </td>

                    <td className="py-3 px-4">
                      {sup.primary_contact_name ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{sup.primary_contact_name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            {sup.primary_contact_phone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                {sup.primary_contact_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : sup.primary_email ? (
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {sup.primary_email}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-xs text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{sup.city || '—'}, {sup.state || ''}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-xs font-mono font-medium text-slate-700 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                        {sup.payment_terms.replace('_', ' ')}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        LT: {sup.lead_time_days} days
                      </p>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                        {sup.sku_count || 0}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(sup.status)}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectSupplier(sup.id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="View 360° Supplier Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenStatusModal(sup)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors text-xs"
                          title="Lifecycle Status Transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50">
          <div>
            Showing <span className="font-semibold text-slate-900">{suppliers.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="font-semibold text-slate-900">{total}</span> suppliers
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-900 px-1">
              Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * pageSize >= total}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
