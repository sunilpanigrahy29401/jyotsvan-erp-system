import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeftRight,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  FileText,
  User,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  PackageCheck,
  Ban,
} from 'lucide-react';
import { StockTransferOrder, StockTransferItem, StockTransferStatus } from '../../../types/warehouse';

interface TransferDetailDrawerProps {
  transferId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshList: () => void;
}

export const TransferDetailDrawer: React.FC<TransferDetailDrawerProps> = ({
  transferId,
  isOpen,
  onClose,
  onRefreshList,
}) => {
  const [transfer, setTransfer] = useState<StockTransferOrder | null>(null);
  const [items, setItems] = useState<StockTransferItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transferId && isOpen) {
      loadTransfer();
    }
  }, [transferId, isOpen]);

  const loadTransfer = async () => {
    if (!transferId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/warehouse-transfers/${transferId}`);
      const data = await res.json();
      if (data.success) {
        setTransfer(data.data.transfer);
        setItems(data.data.items || []);
      } else {
        setError(data.error || 'Failed to load transfer details');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading transfer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !transferId) return null;

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/warehouse-transfers/${transferId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Approval failed');
      await loadTransfer();
      onRefreshList();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/warehouse-transfers/${transferId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_carrier: transfer?.shipping_carrier,
          tracking_number: transfer?.tracking_number,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Dispatch failed');
      await loadTransfer();
      onRefreshList();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/warehouse-transfers/${transferId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((it) => ({
            id: it.id,
            received_quantity: it.dispatched_quantity || it.requested_quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Receive failed');
      await loadTransfer();
      onRefreshList();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Please enter the reason for cancellation:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/warehouse-transfers/${transferId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Cancel failed');
      await loadTransfer();
      onRefreshList();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatusStepper = (status: StockTransferStatus) => {
    const steps = [
      { id: 'requested', label: 'Requested' },
      { id: 'approved', label: 'Approved' },
      { id: 'in_transit', label: 'In-Transit' },
      { id: 'completed', label: 'Received' },
    ];

    const getStepIndex = (s: StockTransferStatus) => {
      if (s === 'draft' || s === 'requested') return 0;
      if (s === 'approved') return 1;
      if (s === 'dispatched' || s === 'in_transit') return 2;
      if (s === 'partially_received' || s === 'completed') return 3;
      return -1;
    };

    const currentIndex = getStepIndex(status);

    if (status === 'cancelled' || status === 'rejected') {
      return (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
          <Ban className="w-4 h-4 text-rose-600" />
          <span>Transfer Order has been {status}.</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between relative px-2 py-3">
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
        {steps.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center bg-white px-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                className={`text-2xs font-semibold mt-1.5 ${
                  isCurrent ? 'text-emerald-700 font-bold' : isDone ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">
                  {transfer?.transfer_number || 'Loading STO...'}
                </h2>
                {transfer && (
                  <span className="capitalize px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {transfer.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Stock Transfer Order & Physical Custody Ledger</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadTransfer}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {transfer && (
            <>
              {/* Stepper */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                {renderStatusStepper(transfer.status)}
              </div>

              {/* Warehouse Route Card */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">Source Dispatch</span>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{transfer.source_warehouse_name}</div>
                  <div className="text-xs font-mono text-slate-500">{transfer.source_warehouse_code}</div>
                </div>

                <div className="flex flex-col items-center px-4">
                  <ArrowRight className="w-5 h-5 text-emerald-600" />
                  <span className="text-2xs text-slate-400 mt-0.5">{transfer.transfer_type}</span>
                </div>

                <div className="text-right">
                  <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">Destination Inbound</span>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{transfer.destination_warehouse_name}</div>
                  <div className="text-xs font-mono text-slate-500">{transfer.destination_warehouse_code}</div>
                </div>
              </div>

              {/* Logistics Summary */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">Carrier / Fleet:</span>
                  <div className="font-semibold text-slate-800">{transfer.shipping_carrier || 'Internal Fleet'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Tracking / Waybill:</span>
                  <div className="font-mono font-semibold text-slate-800">{transfer.tracking_number || 'None'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Vehicle Number:</span>
                  <div className="font-mono font-semibold text-slate-800">{transfer.vehicle_number || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Driver Contact:</span>
                  <div className="font-semibold text-slate-800">{transfer.driver_name || 'N/A'}</div>
                </div>
              </div>

              {/* Transfer Item Lines */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Transferred SKU Line Items ({items.length})
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">SKU Code & Name</th>
                        <th className="py-2.5 px-3">Batch / Lot</th>
                        <th className="py-2.5 px-3 text-right">Requested</th>
                        <th className="py-2.5 px-3 text-right">Dispatched</th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-900">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-slate-900">{it.sku_code}</span>
                            <div className="text-slate-500">{it.product_name || it.sku_name}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{it.batch_number || 'Standard'}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">{it.requested_quantity}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-blue-600">
                            {it.dispatched_quantity || it.requested_quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            {it.received_quantity || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons Footer */}
        {transfer && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              {['draft', 'requested', 'approved'].includes(transfer.status) && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCancel}
                  className="px-3 py-2 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  Cancel Transfer Order
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {transfer.status === 'requested' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleApprove}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Approve Transfer
                </button>
              )}

              {transfer.status === 'approved' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDispatch}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  Dispatch Stock (Debit Source)
                </button>
              )}

              {['dispatched', 'in_transit'].includes(transfer.status) && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReceive}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  Receive & Ingest at Destination
                </button>
              )}

              {transfer.status === 'completed' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Transfer Completed & Ledger Reconciled
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
