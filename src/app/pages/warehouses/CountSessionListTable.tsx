import React, { useState } from 'react';
import {
  ClipboardCheck,
  Search,
  Plus,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { StockCountSession, StockCountStatus } from '../../../types/warehouse';

interface CountSessionListTableProps {
  sessions: StockCountSession[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onSelectSession: (session: StockCountSession) => void;
  onOpenCreate: () => void;
}

export const CountSessionListTable: React.FC<CountSessionListTableProps> = ({
  sessions,
  loading,
  total,
  page,
  limit,
  onPageChange,
  statusFilter,
  onStatusFilterChange,
  searchTerm,
  onSearchChange,
  onSelectSession,
  onOpenCreate,
}) => {
  const getStatusBadge = (status: StockCountStatus) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Scheduled
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 animate-spin" /> In-Progress
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Pending Review
          </span>
        );
      case 'reconciled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Reconciled
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Count Session Number',
      'Warehouse',
      'Audit Type',
      'Status',
      'Total Items Counted',
      'Discrepant Items',
      'Net Variance Value',
      'Conducted Date',
      'Reconciled Date',
    ];
    const rows = sessions.map((s) => [
      s.count_number,
      `"${(s.warehouse_name || '').replace(/"/g, '""')}"`,
      s.count_type,
      s.status,
      s.total_items_count || 0,
      s.discrepancy_items_count || 0,
      s.net_variance_value || 0,
      s.count_date || s.created_at,
      s.reconciled_at || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cycle_count_sessions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by count number, warehouse, type..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Filter count sessions by status"
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <option value="all">All Audit Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In-Progress</option>
            <option value="review">Pending Review</option>
            <option value="reconciled">Reconciled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audits
          </button>

          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Initiate Count Session
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3.5 px-4">Session Number</th>
              <th className="py-3.5 px-4">Target Warehouse</th>
              <th className="py-3.5 px-4">Audit Scope</th>
              <th className="py-3.5 px-4">Items Scanned</th>
              <th className="py-3.5 px-4">Variances & Discrepancies</th>
              <th className="py-3.5 px-4">Conducted Date</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={8} className="py-4 px-4">
                    <div className="h-5 bg-slate-100 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-700">No physical count sessions found</p>
                  <p className="text-xs text-slate-400 mt-1">Initiate a cycle audit or annual wall-to-wall verification.</p>
                </td>
              </tr>
            ) : (
              sessions.map((sess) => (
                <tr
                  key={sess.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onSelectSession(sess)}
                >
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-slate-900 group-hover:text-amber-700 flex items-center gap-1.5">
                      {sess.count_number}
                    </div>
                    {sess.name && <div className="text-2xs text-slate-500 mt-0.5">{sess.name}</div>}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-xs font-semibold text-slate-800">{sess.warehouse_name}</div>
                    <div className="text-2xs text-slate-400 font-mono mt-0.5">{sess.warehouse_code}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="capitalize text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {sess.count_type.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-xs font-semibold text-slate-800">{sess.total_items_count || 0} line items</div>
                    <div className="text-2xs text-slate-400 mt-0.5">{sess.counted_items_count || 0} completed</div>
                  </td>

                  <td className="py-3.5 px-4">
                    {sess.discrepancy_items_count > 0 ? (
                      <div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {sess.discrepancy_items_count} variances
                        </span>
                        {sess.net_variance_value !== 0 && (
                          <div className="text-2xs font-mono text-slate-500 mt-0.5">
                            Val: ₹{Math.abs(sess.net_variance_value).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Zero Variance
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-xs text-slate-700">
                      {new Date(sess.count_date || sess.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">{getStatusBadge(sess.status)}</td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSession(sess);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Worksheet
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} audit sessions
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
