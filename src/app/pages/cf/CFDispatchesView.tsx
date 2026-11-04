import React, { useState } from 'react';
import {
  Send,
  Plus,
  Search,
  CheckCircle2,
  Truck,
  PackageCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  ShieldCheck,
  User,
  Phone,
} from 'lucide-react';
import { cfApi } from '../../../services/cfApi';
import type { CFMaster, CFDispatch, CFDispatchStatus } from '../../../types/cfs';

interface CFDispatchesViewProps {
  dispatches: CFDispatch[];
  cfs: CFMaster[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateDispatch: () => void;
}

export const CFDispatchesView: React.FC<CFDispatchesViewProps> = ({
  dispatches,
  cfs,
  loading,
  onRefresh,
  onOpenCreateDispatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCf, setSelectedCf] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredDispatches = dispatches.filter((d) => {
    const matchesSearch =
      d.dispatch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.destination_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.destination_reference && d.destination_reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.shipping_carrier && d.shipping_carrier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.vehicle_number && d.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = selectedStatus === 'all' || d.status === selectedStatus;
    const matchesCf = selectedCf === 'all' || d.cf_id === selectedCf;

    return matchesSearch && matchesStatus && matchesCf;
  });

  const handleExecuteDispatch = async (dispatchId: string) => {
    if (!confirm('Execute gate-out dispatch? This will deduct physical stock from the C&F depot ledger.')) return;
    try {
      setActionLoading(dispatchId);
      await cfApi.executeDispatch(dispatchId);
      onRefresh();
    } catch (e: any) {
      alert(`Execution error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: CFDispatchStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
            <Clock className="w-3 h-3 text-neutral-500" />
            <span>Draft</span>
          </span>
        );
      case 'requested':
      case 'approved':
      case 'picking':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>{status === 'picking' ? 'Picking in Depot' : 'Approved Order'}</span>
          </span>
        );
      case 'dispatched':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Truck className="w-3 h-3 text-emerald-600" />
            <span>Dispatched (Gated Out)</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <PackageCheck className="w-3 h-3 text-emerald-700" />
            <span>Completed (POD)</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1 flex items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by dispatch #, destination customer/distributor, truck..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 outline-none"
          >
            <option value="all">All Dispatch Stages</option>
            <option value="draft">Draft Orders</option>
            <option value="confirmed">Confirmed & Picked</option>
            <option value="dispatched">Dispatched (Gate Out)</option>
            <option value="delivered">Delivered to Customer</option>
          </select>

          <select
            value={selectedCf}
            onChange={(e) => setSelectedCf(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 outline-none"
          >
            <option value="all">All Fulfilling C&Fs</option>
            {cfs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legal_name} ({c.city})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenCreateDispatch}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Outbound Dispatch Order</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Dispatch # & Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Origin C&F Depot</th>
                <th className="py-3 px-4">Destination Distributor / Channel</th>
                <th className="py-3 px-4">Carrier & Transport</th>
                <th className="py-3 px-4 text-right">Lines & Units</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    Loading C&F Dispatches...
                  </td>
                </tr>
              ) : filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    No outbound dispatches matching specified filters.
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((d) => (
                  <tr key={d.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900 font-mono text-sm text-amber-700">
                        {d.dispatch_number}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {new Date(d.created_at).toLocaleDateString()} &bull; Ref: {d.destination_reference || 'N/A'}
                      </div>
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(d.status)}</td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">{d.cf_name || 'C&F Partner'}</div>
                      <div className="text-[11px] text-neutral-500">{d.warehouse_name || 'Main Warehouse'}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">{d.destination_name}</div>
                      <div className="text-[11px] text-neutral-500 capitalize">
                        Channel: <strong>{d.destination_type?.replace('_', ' ')}</strong>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-800">
                        {d.shipping_carrier || 'Local Logistics'}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        {d.vehicle_number || 'Pending'} {d.driver_phone ? `&bull; ${d.driver_phone}` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-neutral-900">
                        {d.total_requested_quantity || d.total_dispatched_quantity || 0} Units
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {d.items?.length || 1} SKU lines
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {d.status === 'draft' || d.status === 'requested' || d.status === 'approved' || d.status === 'picking' ? (
                        <button
                          disabled={actionLoading === d.id}
                          onClick={() => handleExecuteDispatch(d.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors flex items-center space-x-1 ml-auto shadow-xs"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Gate Out</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-neutral-400 font-medium">Dispatched</span>
                      )}
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
