import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle2,
  Truck,
  PackageCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  Filter,
  Layers,
} from 'lucide-react';
import { cfApi } from '../../../services/cfApi';
import type { CFMaster, CFTransfer, CFTransferStatus } from '../../../types/cfs';
import { ReceiveTransferModal } from './ReceiveTransferModal';

interface CFTransfersViewProps {
  transfers: CFTransfer[];
  cfs: CFMaster[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateTransfer: () => void;
}

export const CFTransfersView: React.FC<CFTransfersViewProps> = ({
  transfers,
  cfs,
  loading,
  onRefresh,
  onOpenCreateTransfer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCf, setSelectedCf] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Inward Receiving Modal state
  const [receivingTransfer, setReceivingTransfer] = useState<CFTransfer | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Dispatch Gate Out Modal state
  const [dispatchingTransfer, setDispatchingTransfer] = useState<CFTransfer | null>(null);
  const [dispatchCarrier, setDispatchCarrier] = useState('');
  const [dispatchVehicle, setDispatchVehicle] = useState('');
  const [dispatchLrNumber, setDispatchLrNumber] = useState('');

  const filteredTransfers = transfers.filter((t) => {
    const matchesSearch =
      t.transfer_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.cf_name && t.cf_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.shipping_carrier && t.shipping_carrier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.vehicle_number && t.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    const matchesCf = selectedCf === 'all' || t.cf_id === selectedCf;

    return matchesSearch && matchesStatus && matchesCf;
  });

  const handleApprove = async (transferId: string) => {
    try {
      setActionLoading(transferId);
      await cfApi.approveTransfer(transferId);
      onRefresh();
    } catch (e: any) {
      alert(`Approval error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchingTransfer) return;
    try {
      setActionLoading(dispatchingTransfer.id);
      await cfApi.dispatchTransfer(dispatchingTransfer.id, {
        shipping_carrier: dispatchCarrier || dispatchingTransfer.shipping_carrier,
        vehicle_number: dispatchVehicle || dispatchingTransfer.vehicle_number,
        tracking_number: dispatchLrNumber,
      });
      setDispatchingTransfer(null);
      onRefresh();
    } catch (e: any) {
      alert(`Dispatch error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: CFTransferStatus) => {
    switch (status) {
      case 'requested':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
            <Clock className="w-3 h-3 text-neutral-500" />
            <span>Requested</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>Approved & Ready</span>
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
            <Truck className="w-3 h-3 text-amber-600" />
            <span>In Transit</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <PackageCheck className="w-3 h-3 text-emerald-600" />
            <span>Received (GRN)</span>
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
              placeholder="Search by transfer #, carrier, truck number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 outline-none"
          >
            <option value="all">All Transfer Stages</option>
            <option value="requested">Requested (Draft)</option>
            <option value="approved">Approved & Staged</option>
            <option value="in_transit">In Transit to Depot</option>
            <option value="completed">Received & Closed</option>
          </select>

          <select
            value={selectedCf}
            onChange={(e) => setSelectedCf(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 outline-none"
          >
            <option value="all">All C&F Agencies</option>
            {cfs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legal_name} ({c.city})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenCreateTransfer}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Inward Transfer Order</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Transfer # & Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Destination C&F Agency</th>
                <th className="py-3 px-4">Source & Destination Wh</th>
                <th className="py-3 px-4">Carrier & Transit Info</th>
                <th className="py-3 px-4 text-right">Requested / Dispatched / Received</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    Loading Stock Transfers...
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    No stock transfers matching the specified criteria.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900 font-mono text-sm text-blue-700">
                        {t.transfer_number}
                      </div>
                      <div className="text-[11px] text-neutral-500 capitalize">
                        {t.transfer_type?.replace('_', ' ')} &bull; {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">{t.cf_name || 'C&F Partner'}</div>
                      <div className="text-[11px] text-neutral-500">{t.cf_code}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-neutral-700">
                        From: <strong>{t.source_warehouse_name || 'Plant'}</strong>
                      </div>
                      <div className="text-neutral-500 text-[11px]">
                        To: {t.destination_warehouse_name || 'Depot Warehouse'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-800">
                        {t.shipping_carrier || 'Logistics Carrier'}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        {t.vehicle_number || 'Truck pending'} {t.tracking_number ? `&bull; LR: ${t.tracking_number}` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-neutral-900">
                        {t.total_requested_quantity} Req &bull; {t.total_dispatched_quantity} Disp
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold">
                        {t.total_received_quantity} Recv Units
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {t.status === 'requested' && (
                          <button
                            disabled={actionLoading === t.id}
                            onClick={() => handleApprove(t.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            Approve
                          </button>
                        )}

                        {t.status === 'approved' && (
                          <button
                            onClick={() => {
                              setDispatchingTransfer(t);
                              setDispatchCarrier(t.shipping_carrier || '');
                              setDispatchVehicle(t.vehicle_number || '');
                              setDispatchLrNumber(t.tracking_number || '');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors flex items-center space-x-1"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Gate Out</span>
                          </button>
                        )}

                        {t.status === 'in_transit' && (
                          <button
                            onClick={() => {
                              setReceivingTransfer(t);
                              setShowReceiveModal(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors flex items-center space-x-1 shadow-xs"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Inward GRN</span>
                          </button>
                        )}

                        {t.status === 'completed' && (
                          <span className="text-[11px] text-neutral-400 font-medium">Closed</span>
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

      {/* Dispatch Gate Out Modal */}
      {dispatchingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-neutral-200">
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              Confirm Dispatch & Gate Out (Transfer #{dispatchingTransfer.transfer_number})
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Enter carrier details and dispatch timestamp to change state to In Transit.
            </p>

            <form onSubmit={handleDispatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Carrier Name</label>
                <input
                  type="text"
                  required
                  value={dispatchCarrier}
                  onChange={(e) => setDispatchCarrier(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Vehicle / Truck Plate #</label>
                <input
                  type="text"
                  required
                  value={dispatchVehicle}
                  onChange={(e) => setDispatchVehicle(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">LR / e-Way Bill Tracking #</label>
                <input
                  type="text"
                  value={dispatchLrNumber}
                  onChange={(e) => setDispatchLrNumber(e.target.value)}
                  placeholder="e.g. EWB-99182371"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setDispatchingTransfer(null)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === dispatchingTransfer.id}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-xs"
                >
                  Confirm Gate Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inward Receiving Modal */}
      <ReceiveTransferModal
        isOpen={showReceiveModal}
        transfer={receivingTransfer}
        onClose={() => {
          setShowReceiveModal(false);
          setReceivingTransfer(null);
        }}
        onSuccess={() => {
          onRefresh();
          setShowReceiveModal(false);
          setReceivingTransfer(null);
        }}
      />
    </div>
  );
};
