import React, { useState } from 'react';
import {
  Truck,
  Search,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  ChevronRight,
  Download,
  Building2,
} from 'lucide-react';
import type { DistributorTransfer, TransferPriority } from '../../../types/distributors.ts';
import { distributorApi } from '../../../services/distributorApi.ts';

interface DistributorTransfersViewProps {
  transfers: DistributorTransfer[];
  loading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onOpenCreateTransfer: () => void;
  onOpenReceiveTransfer: (transfer: DistributorTransfer) => void;
  onRefresh: () => void;
}

export const DistributorTransfersView: React.FC<DistributorTransfersViewProps> = ({
  transfers,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenCreateTransfer,
  onOpenReceiveTransfer,
  onRefresh,
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleApprove = async (trf: DistributorTransfer) => {
    setActionLoading(trf.id);
    try {
      await distributorApi.approveTransfer(trf.id);
      onRefresh();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatch = async (trf: DistributorTransfer) => {
    const carrier = prompt('Enter Shipping Carrier:', trf.shipping_carrier || 'Fleet Transport');
    if (!carrier) return;
    const tracking = prompt('Enter Tracking / LR Number:', trf.tracking_number || `LR-${Math.floor(100000 + Math.random() * 900000)}`);
    const vehicle = prompt('Enter Vehicle Number:', trf.vehicle_number || 'MH-04-AB-1234');

    setActionLoading(trf.id);
    try {
      await distributorApi.dispatchTransfer(trf.id, {
        shipping_carrier: carrier,
        tracking_number: tracking || undefined,
        vehicle_number: vehicle || undefined,
      });
      onRefresh();
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_transit':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">In Transit</span>;
      case 'received':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Received</span>;
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Approved</span>;
      case 'requested':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">Requested</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search transfer #, distributor, C&F depot, carrier..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            className="text-xs py-2 px-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none font-medium text-slate-700"
          >
            <option value="all">All Dispatches</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="in_transit">In Transit</option>
            <option value="received">Received / Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button
          id="btn-create-transfer"
          onClick={onOpenCreateTransfer}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Send className="w-4 h-4" /> Create C&F Dispatch
        </button>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Transfer Number</th>
                <th className="py-3 px-4">Source C&F Depot</th>
                <th className="py-3 px-4">Recipient Distributor</th>
                <th className="py-3 px-4">Logistics / Vehicle</th>
                <th className="py-3 px-4 text-right">Dispatched Qty</th>
                <th className="py-3 px-4 text-right">Valuation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p>Loading C&F to distributor transfers...</p>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No transfer dispatches found</p>
                    <p className="text-xs text-slate-400 mt-1">Create a new dispatch from any C&F depot to a distributor.</p>
                  </td>
                </tr>
              ) : (
                transfers.map(trf => (
                  <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {trf.transfer_number}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {trf.cf_name}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{trf.distributor_name}</span>
                      <span className="text-[11px] text-slate-500 block font-mono">{trf.distributor_code || trf.distributor_id}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-medium text-slate-800 block">{trf.shipping_carrier || 'Pending Assignment'}</span>
                        <span className="text-[11px] text-slate-500 block">{trf.vehicle_number || trf.tracking_number || 'Direct Fleet'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {(trf.total_dispatched_quantity || trf.total_requested_quantity || 0).toLocaleString()} Units
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">
                      {formatCurrency(trf.total_valuation || 0)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(trf.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {trf.status === 'requested' && (
                          <button
                            onClick={() => handleApprove(trf)}
                            disabled={actionLoading === trf.id}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                          >
                            Approve
                          </button>
                        )}

                        {trf.status === 'approved' && (
                          <button
                            onClick={() => handleDispatch(trf)}
                            disabled={actionLoading === trf.id}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold"
                          >
                            Gate-Out Dispatch
                          </button>
                        )}

                        {trf.status === 'in_transit' && (
                          <button
                            onClick={() => onOpenReceiveTransfer(trf)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                          >
                            Receive at Distributor
                          </button>
                        )}

                        {trf.status === 'received' && (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Closed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
