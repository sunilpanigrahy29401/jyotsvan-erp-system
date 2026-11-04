import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Search,
  Filter,
  Plus,
  Download,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Calendar,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { StockTransferOrder, StockTransferStatus } from '../../../types/warehouse';

interface TransferListTableProps {
  transfers: StockTransferOrder[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onSelectTransfer: (transfer: StockTransferOrder) => void;
  onOpenCreate: () => void;
}

export const TransferListTable: React.FC<TransferListTableProps> = ({
  transfers,
  loading,
  total,
  page,
  limit,
  onPageChange,
  statusFilter,
  onStatusFilterChange,
  searchTerm,
  onSearchChange,
  onSelectTransfer,
  onOpenCreate,
}) => {
  const getStatusBadge = (status: StockTransferStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Draft
          </span>
        );
      case 'requested':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Requested
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Approved
          </span>
        );
      case 'dispatched':
      case 'in_transit':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="w-3 h-3 mr-1 animate-pulse" /> In-Transit
          </span>
        );
      case 'partially_received':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
            Partial Recv
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
          </span>
        );
      case 'cancelled':
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            {status === 'cancelled' ? 'Cancelled' : 'Rejected'}
          </span>
        );
      default:
        return null;
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Transfer Number',
      'Source Warehouse',
      'Destination Warehouse',
      'Status',
      'Items Count',
      'Total Quantity',
      'Carrier',
      'Tracking #',
      'Requested At',
      'Dispatched At',
      'Received At',
    ];
    const rows = transfers.map((t) => [
      t.transfer_number,
      `"${(t.source_warehouse_name || '').replace(/"/g, '""')}"`,
      `"${(t.destination_warehouse_name || '').replace(/"/g, '""')}"`,
      t.status,
      t.items_count || 0,
      t.total_quantity || 0,
      `"${(t.shipping_carrier || '').replace(/"/g, '""')}"`,
      t.tracking_number || '',
      t.requested_at || t.created_at,
      t.dispatched_at || '',
      t.received_at || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stock_transfers_${new Date().toISOString().split('T')[0]}.csv`);
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
              placeholder="Search by STO number, warehouse, carrier, tracking..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Filter transfer orders by status"
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Transfer Statuses</option>
            <option value="draft">Draft</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="in_transit">In-Transit / Dispatched</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled / Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export STO List
          </button>

          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Transfer Order (STO)
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3.5 px-4">Transfer Number</th>
              <th className="py-3.5 px-4">Origin & Destination</th>
              <th className="py-3.5 px-4">Items / Volume</th>
              <th className="py-3.5 px-4">Logistics / Tracking</th>
              <th className="py-3.5 px-4">Created Date</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7} className="py-4 px-4">
                    <div className="h-5 bg-slate-100 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : transfers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-700">No stock transfer orders found</p>
                  <p className="text-xs text-slate-400 mt-1">Initiate an STO to move goods between depots and stores.</p>
                </td>
              </tr>
            ) : (
              transfers.map((trf) => (
                <tr
                  key={trf.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onSelectTransfer(trf)}
                >
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1.5">
                      {trf.transfer_number}
                    </div>
                    {trf.transfer_type && (
                      <span className="text-2xs font-medium text-slate-400 uppercase">{trf.transfer_type}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <span>{trf.source_warehouse_name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{trf.destination_warehouse_name}</span>
                    </div>
                    <div className="text-2xs text-slate-400 mt-0.5">
                      {trf.source_warehouse_code} → {trf.destination_warehouse_code}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-xs font-semibold text-slate-900">
                      {trf.total_quantity?.toLocaleString() || 0} units
                    </div>
                    <div className="text-2xs text-slate-500">{trf.items_count || 0} line items</div>
                  </td>

                  <td className="py-3.5 px-4">
                    {trf.shipping_carrier ? (
                      <div>
                        <div className="text-xs font-medium text-slate-700 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-slate-400" />
                          <span>{trf.shipping_carrier}</span>
                        </div>
                        {trf.tracking_number && (
                          <div className="text-2xs font-mono text-slate-400">{trf.tracking_number}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Self / Internal Fleet</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-xs text-slate-700">
                      {new Date(trf.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    {trf.expected_delivery_date && (
                      <div className="text-2xs text-indigo-600 font-medium mt-0.5">
                        ETA: {new Date(trf.expected_delivery_date).toLocaleDateString()}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4">{getStatusBadge(trf.status)}</td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTransfer(trf);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 group-hover:border-slate-300"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View STO
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} transfer orders
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
