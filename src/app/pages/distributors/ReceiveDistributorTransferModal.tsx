import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  Building2,
  Truck,
} from 'lucide-react';
import { distributorApi } from '../../../services/distributorApi.ts';
import type { DistributorTransfer } from '../../../types/distributors.ts';

interface ReceiveDistributorTransferModalProps {
  transfer: DistributorTransfer | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReceiveDistributorTransferModal: React.FC<ReceiveDistributorTransferModalProps> = ({
  transfer,
  onClose,
  onSuccess,
}) => {
  if (!transfer) return null;

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(
    transfer.items?.map(it => ({
      item_id: it.id,
      sku_id: it.sku_id,
      sku_name: it.sku_name,
      batch_id: it.batch_id,
      batch_number: it.batch_number,
      dispatched_quantity: it.dispatched_quantity || it.requested_quantity,
      received_quantity: it.dispatched_quantity || it.requested_quantity,
      discrepancy_type: 'shortage',
      remarks: '',
    })) || []
  );

  const handleQtyChange = (idx: number, val: number) => {
    const updated = [...items];
    updated[idx].received_quantity = val;
    setItems(updated);
  };

  const handleDiscrepancyTypeChange = (idx: number, type: string) => {
    const updated = [...items];
    updated[idx].discrepancy_type = type;
    setItems(updated);
  };

  const handleRemarksChange = (idx: number, remarks: string) => {
    const updated = [...items];
    updated[idx].remarks = remarks;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const receivePayload = {
        received_items: items.map(it => {
          const diff = it.dispatched_quantity - it.received_quantity;
          return {
            item_id: it.item_id,
            received_quantity: it.received_quantity,
            discrepancy:
              diff > 0
                ? {
                    discrepancy_type: it.discrepancy_type,
                    expected_quantity: it.dispatched_quantity,
                    received_quantity: it.received_quantity,
                    discrepant_quantity: diff,
                    remarks: it.remarks || 'Shortage / damage recorded at receiving gate',
                  }
                : undefined,
          };
        }),
      };

      await distributorApi.receiveTransfer(transfer.id, receivePayload);
      onSuccess();
    } catch (err: any) {
      alert(`Receiving failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Receive Consignment at Distributor Gate</h2>
              <p className="text-xs text-slate-500">
                Transfer <span className="font-mono font-semibold">{transfer.transfer_number}</span> from {transfer.cf_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
            Verify actual physical units received against dispatched consignment quantity.
            Any variance will automatically trigger a receiving discrepancy audit report.
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => {
              const diff = it.dispatched_quantity - it.received_quantity;
              const hasDiscrepancy = diff > 0;

              return (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{it.sku_name || it.sku_id}</span>
                      <span className="text-[11px] text-slate-500 block">Batch: {it.batch_number || 'Standard'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">Dispatched: </span>
                      <span className="font-bold text-slate-900">{it.dispatched_quantity} Units</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-slate-700 font-semibold mb-1">Physical Units Received *</label>
                      <input
                        type="number"
                        min="0"
                        max={it.dispatched_quantity}
                        value={it.received_quantity}
                        onChange={e => handleQtyChange(idx, parseInt(e.target.value, 10) || 0)}
                        className="w-full p-2 border border-slate-200 rounded bg-white font-bold text-sm text-slate-900"
                      />
                    </div>

                    {hasDiscrepancy && (
                      <div className="flex-1">
                        <label className="block text-rose-600 font-semibold mb-1">Discrepancy Cause *</label>
                        <select
                          value={it.discrepancy_type}
                          onChange={e => handleDiscrepancyTypeChange(idx, e.target.value)}
                          className="w-full p-2 border border-rose-300 rounded bg-rose-50 text-rose-900 font-medium"
                        >
                          <option value="shortage">Transit Shortage / Missing</option>
                          <option value="damaged">Transit Damage / Breakage</option>
                          <option value="expired">Expired Stock</option>
                          <option value="wrong_batch">Wrong Batch Shipped</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {hasDiscrepancy && (
                    <div>
                      <label className="block text-slate-500 mb-1">Discrepancy Remarks</label>
                      <input
                        type="text"
                        placeholder="e.g. 5 boxes crushed upon unsealing container"
                        value={it.remarks}
                        onChange={e => handleRemarksChange(idx, e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded bg-white"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-receipt"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Receiving...' : 'Confirm Gate Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
};
