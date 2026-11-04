import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCw,
  GitBranch,
  Lock,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { batchApi } from '../../../services/batchApi';
import type { Batch, BatchStatus, BatchType } from '../../../types/batches';

interface BatchRegistryTabProps {
  onOpenCreate: () => void;
  onInspectBatch: (batchId: string) => void;
  onChangeStatus: (batch: Batch) => void;
  onPlaceHold: (batch: Batch) => void;
  onOpenTraceability: (batchNumber: string) => void;
}

export function BatchRegistryTab({
  onOpenCreate,
  onInspectBatch,
  onChangeStatus,
  onPlaceHold,
  onOpenTraceability,
}: BatchRegistryTabProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [batchType, setBatchType] = useState('all');
  const [qcStatus, setQcStatus] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'near_30' | 'near_60' | 'near_90' | 'fresh'>('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [isLoading, setIsLoading] = useState(true);

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const data = await batchApi.getBatches({
        search: search.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        batchType: batchType !== 'all' ? batchType : undefined,
        qcStatus: qcStatus !== 'all' ? qcStatus : undefined,
        expiryFilter: expiryFilter !== 'all' ? expiryFilter : undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      setBatches(data.batches);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [page, limit, status, batchType, qcStatus, expiryFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBatches();
  };

  const getStatusBadge = (batchStatus: BatchStatus) => {
    switch (batchStatus) {
      case 'released':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Released</span>;
      case 'quarantine':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">Quarantine</span>;
      case 'hold':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">QC Hold</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">Rejected</span>;
      case 'recalled':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">Recalled</span>;
      case 'expired':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700 border border-slate-300">Expired</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">{batchStatus}</span>;
    }
  };

  const getShelfLifeTag = (batch: Batch) => {
    if (!batch.expiry_date) return <span className="text-slate-400 text-xs">No Expiry</span>;
    const days = batch.days_to_expiry;
    if (days === null || days === undefined) return null;

    if (days < 0) {
      return <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-sm">Expired ({Math.abs(days)}d ago)</span>;
    } else if (days <= 30) {
      return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm">Critical: {days}d left</span>;
    } else if (days <= 90) {
      return <span className="text-[11px] font-semibold text-amber-600 bg-amber-50/50 px-2 py-0.5 rounded-sm">FEFO: {days}d left</span>;
    } else {
      return <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm">{days} days remaining</span>;
    }
  };

  const handleExportCSV = () => {
    if (batches.length === 0) return;
    const headers = ['Batch Number', 'SKU Code', 'Product Name', 'Type', 'Status', 'Available Qty', 'Quarantine Qty', 'Total Qty', 'Expiry Date', 'Warehouse', 'Supplier'];
    const rows = batches.map((b) => [
      b.batch_number,
      b.sku_code || '',
      `"${b.product_name || ''}"`,
      b.batch_type,
      b.status,
      b.current_quantity - b.reserved_quantity - b.quarantine_quantity,
      b.quarantine_quantity,
      b.current_quantity,
      b.expiry_date ? new Date(b.expiry_date).toISOString().split('T')[0] : '',
      `"${b.warehouse_name || ''}"`,
      `"${b.supplier_name || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Batch_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Batch #, SKU Code, Product Name, Supplier Lot, or GRN..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Filter
            </button>
          </form>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={onOpenCreate}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Batch</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="released">Released</option>
              <option value="quarantine">Quarantine</option>
              <option value="hold">QC Hold</option>
              <option value="rejected">Rejected</option>
              <option value="recalled">Recalled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Batch Category</label>
            <select
              value={batchType}
              onChange={(e) => {
                setBatchType(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="raw_material">Raw Materials</option>
              <option value="intermediate">Intermediates / Bulk</option>
              <option value="finished_good">Finished Goods</option>
              <option value="packaging">Packaging</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">QC Decision</label>
            <select
              value={qcStatus}
              onChange={(e) => {
                setQcStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All QC Decisions</option>
              <option value="passed">Passed</option>
              <option value="pending">Pending</option>
              <option value="quarantine">Quarantined</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">FEFO Shelf-Life</label>
            <select
              value={expiryFilter}
              onChange={(e) => {
                setExpiryFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Shelf-Life Ranges</option>
              <option value="near_30">Critical (&lt; 30 Days)</option>
              <option value="near_60">Near Expiry (&lt; 60 Days)</option>
              <option value="near_90">Near Expiry (&lt; 90 Days)</option>
              <option value="expired">Expired Lots</option>
              <option value="fresh">Fresh (&gt; 90 Days)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so as any);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="expiry_date-asc">FEFO (First Expiring)</option>
              <option value="current_quantity-desc">Highest Stock</option>
              <option value="batch_number-asc">Batch Number (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Batch Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Batch / Lot #</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Available Qty</th>
                <th className="py-3 px-4 text-right">Total Lot</th>
                <th className="py-3 px-4">Shelf-Life / Expiry</th>
                <th className="py-3 px-4">Facility / Location</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading canonical batch records...</span>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No batch records match your active search filters.
                  </td>
                </tr>
              ) : (
                batches.map((b) => {
                  const avail = b.current_quantity - b.reserved_quantity - b.quarantine_quantity;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span
                            onClick={() => onInspectBatch(b.id)}
                            className="font-mono font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            {b.batch_number}
                          </span>
                          {b.active_holds_count && b.active_holds_count > 0 ? (
                            <span className="p-0.5 bg-rose-100 text-rose-700 rounded-sm" title="Active Hold on Batch">
                              <Lock className="w-3 h-3" />
                            </span>
                          ) : null}
                        </div>
                        {b.supplier_batch_number && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Sup Lot: {b.supplier_batch_number}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-semibold text-slate-800 block truncate">{b.product_name}</span>
                        <span className="text-[11px] text-slate-400">{b.sku_code}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-slate-600">{b.batch_type.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          {getStatusBadge(b.status)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                        {avail.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{b.unit_short_code}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {b.current_quantity.toLocaleString()} <span className="text-[10px] text-slate-400">{b.unit_short_code}</span>
                      </td>
                      <td className="py-3 px-4">
                        {getShelfLifeTag(b)}
                        {b.expiry_date && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(b.expiry_date).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-700 block">{b.warehouse_name || 'Main Warehouse'}</span>
                        <span className="text-[10px] text-slate-400">{b.location_name || 'General Storage'}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => onOpenTraceability(b.batch_number)}
                            title="Trace Lineage Flow"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onInspectBatch(b.id)}
                            title="Inspect 360 View"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onChangeStatus(b)}
                            title="Authorize Status Change"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{batches.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold text-slate-800">{total}</span> canonical batches
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
