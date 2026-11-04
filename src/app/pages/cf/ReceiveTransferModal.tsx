import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldAlert, PackageCheck } from 'lucide-react';
import { cfApi } from '../../../services/cfApi';
import type { CFTransfer } from '../../../types/cfs';

interface ReceiveTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transfer: CFTransfer) => void;
  transfer: CFTransfer | null;
}

export const ReceiveTransferModal: React.FC<ReceiveTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transfer,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [receivedLines, setReceivedLines] = useState<Array<{
    item_id: string;
    sku_code?: string;
    sku_name?: string;
    batch_number?: string;
    dispatched_quantity: number;
    received_quantity: number;
    shortage_quantity: number;
    damaged_quantity: number;
    rejected_quantity: number;
    notes: string;
  }>>([]);

  const [generalNotes, setGeneralNotes] = useState('Physical gate count verified and verified against e-Way bill.');

  React.useEffect(() => {
    if (transfer && transfer.items) {
      setReceivedLines(
        transfer.items.map(i => ({
          item_id: i.id,
          sku_code: i.sku_code,
          sku_name: i.sku_name,
          batch_number: i.batch_number,
          dispatched_quantity: Number(i.dispatched_quantity || i.requested_quantity || 0),
          received_quantity: Number(i.dispatched_quantity || i.requested_quantity || 0),
          shortage_quantity: 0,
          damaged_quantity: 0,
          rejected_quantity: 0,
          notes: '',
        }))
      );
    }
  }, [transfer]);

  if (!isOpen || !transfer) return null;

  const handleReceivedQtyChange = (index: number, receivedVal: number) => {
    const updated = [...receivedLines];
    const line = updated[index];
    const dispatched = line.dispatched_quantity;
    line.received_quantity = receivedVal;

    // Auto-calculate shortage if received < dispatched and no manual damage entered
    if (receivedVal < dispatched && line.damaged_quantity === 0) {
      line.shortage_quantity = dispatched - receivedVal;
    } else if (receivedVal >= dispatched) {
      line.shortage_quantity = 0;
    }
    setReceivedLines(updated);
  };

  const handleDamagedQtyChange = (index: number, dmgVal: number) => {
    const updated = [...receivedLines];
    const line = updated[index];
    line.damaged_quantity = dmgVal;
    setReceivedLines(updated);
  };

  const totalDispatched = receivedLines.reduce((acc, l) => acc + l.dispatched_quantity, 0);
  const totalReceived = receivedLines.reduce((acc, l) => acc + l.received_quantity, 0);
  const totalShortage = receivedLines.reduce((acc, l) => acc + l.shortage_quantity, 0);
  const totalDamaged = receivedLines.reduce((acc, l) => acc + l.damaged_quantity, 0);
  const hasVariance = (totalShortage + totalDamaged) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const payload = {
        items: receivedLines.map(l => ({
          item_id: l.item_id,
          received_quantity: Number(l.received_quantity),
          shortage_quantity: Number(l.shortage_quantity),
          damaged_quantity: Number(l.damaged_quantity),
          rejected_quantity: Number(l.rejected_quantity),
          notes: l.notes || undefined,
        })),
        notes: generalNotes,
      };

      const updated = await cfApi.receiveTransfer(transfer.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process inward receiving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 border border-neutral-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">
                Inward Depot Receiving & Goods Receipt (GRN)
              </h3>
              <p className="text-xs text-neutral-500">
                Transfer #{transfer.transfer_number} &bull; Destination Depot: {transfer.destination_warehouse_name || 'C&F Warehouse'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Summary Banner */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-neutral-500">Dispatched Units</p>
              <p className="text-lg font-bold text-neutral-900">{totalDispatched}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Good Inward Stock</p>
              <p className="text-lg font-bold text-emerald-600">{totalReceived}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Transit Shortage</p>
              <p className={`text-lg font-bold ${totalShortage > 0 ? 'text-amber-600' : 'text-neutral-900'}`}>
                {totalShortage}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Damaged Units</p>
              <p className={`text-lg font-bold ${totalDamaged > 0 ? 'text-red-600' : 'text-neutral-900'}`}>
                {totalDamaged}
              </p>
            </div>
          </div>

          {hasVariance && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Discrepancy Notification:</strong> Discrepancies detected between dispatched and physical stock counts. 
                Formal discrepancy exception records will be logged for investigation and carrier claim verification.
              </span>
            </div>
          )}

          {/* Table Breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
              Itemized Physical Count Verification
            </h4>
            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">SKU & Batch</th>
                    <th className="py-2.5 px-3 text-right">Dispatched</th>
                    <th className="py-2.5 px-3 text-right">Received (Good)</th>
                    <th className="py-2.5 px-3 text-right">Shortage</th>
                    <th className="py-2.5 px-3 text-right">Damaged</th>
                    <th className="py-2.5 px-3">Variance Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {receivedLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/60">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-neutral-900">{line.sku_name || line.sku_code}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">Batch: {line.batch_number || 'Standard'}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-neutral-700">
                        {line.dispatched_quantity}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          max={line.dispatched_quantity}
                          value={line.received_quantity}
                          onChange={(e) => handleReceivedQtyChange(idx, Number(e.target.value))}
                          className="w-20 px-2 py-1 text-right font-semibold text-emerald-700 border border-neutral-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={line.shortage_quantity}
                          onChange={(e) => {
                            const updated = [...receivedLines];
                            updated[idx].shortage_quantity = Number(e.target.value);
                            setReceivedLines(updated);
                          }}
                          className="w-16 px-2 py-1 text-right font-semibold text-amber-700 border border-neutral-300 rounded focus:ring-1 focus:ring-amber-500 outline-none"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={line.damaged_quantity}
                          onChange={(e) => handleDamagedQtyChange(idx, Number(e.target.value))}
                          className="w-16 px-2 py-1 text-right font-semibold text-red-700 border border-neutral-300 rounded focus:ring-1 focus:ring-red-500 outline-none"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="Condition / remark"
                          value={line.notes}
                          onChange={(e) => {
                            const updated = [...receivedLines];
                            updated[idx].notes = e.target.value;
                            setReceivedLines(updated);
                          }}
                          className="w-full px-2 py-1 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-400 outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              General Inward Receiving Remarks
            </label>
            <textarea
              rows={2}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </form>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2 disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span>Updating Ledger & Inward Stock...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Inward Stock & Post GRN</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
