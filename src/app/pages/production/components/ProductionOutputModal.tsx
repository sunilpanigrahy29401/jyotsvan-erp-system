import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { ProductionOrder } from '../../../../types/production';
import { productionApi } from '../../../../services/productionApi';

interface ProductionOutputModalProps {
  isOpen: boolean;
  order: ProductionOrder;
  onClose: () => void;
  onRecorded: () => void;
}

export const ProductionOutputModal: React.FC<ProductionOutputModalProps> = ({
  isOpen,
  order,
  onClose,
  onRecorded,
}) => {
  const remainingPlanned = Math.max(0, order.planned_quantity - order.actual_output_quantity);

  const [quantity, setQuantity] = useState<number>(remainingPlanned || order.expected_yield_quantity || order.planned_quantity);
  const [batchNumber, setBatchNumber] = useState<string>(
    order.batch_number || `BATCH-${order.finished_sku_code}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
  );
  const [manufacturingDate, setManufacturingDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [expiryDate, setExpiryDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [createQCHandoff, setCreateQCHandoff] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Output quantity must be greater than zero.');
      return;
    }
    if (!batchNumber.trim()) {
      setError('Batch number is required for manufactured goods traceability.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await productionApi.recordOutput(order.id, {
        quantity: Number(quantity),
        warehouseId: order.warehouse_id,
        batchNumber: batchNumber.trim(),
        manufacturingDate,
        expiryDate,
        createQCHandoff,
        notes: notes.trim() || undefined,
        idempotencyKey: `out-${order.id}-${Date.now()}`,
      });
      onRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record production output.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Record Production Output</h3>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono font-medium text-slate-700">{order.production_order_number}</span> • Finished Goods Inward
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* SKU and Production Plan context */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">{order.finished_sku_name}</span>
              <span className="text-xs font-mono bg-white px-2 py-0.5 border border-slate-200 rounded text-slate-700">
                {order.finished_sku_code}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-center text-xs">
              <div>
                <span className="text-slate-500 block">Planned Batch</span>
                <span className="font-semibold text-slate-800">
                  {order.planned_quantity} {order.unit_code}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Expected Yield</span>
                <span className="font-semibold text-emerald-700">
                  {order.expected_yield_quantity} {order.unit_code}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Produced So Far</span>
                <span className="font-semibold text-indigo-700">
                  {order.actual_output_quantity} {order.unit_code}
                </span>
              </div>
            </div>
          </div>

          {/* Quantity to Record */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Manufactured Output Quantity *
              </label>
              {remainingPlanned > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(remainingPlanned)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Fill Remaining ({remainingPlanned})
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={quantity || ''}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                {order.unit_code}
              </span>
            </div>
          </div>

          {/* Batch Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Finished Goods Batch / Lot Number *
            </label>
            <input
              type="text"
              value={batchNumber}
              onChange={e => setBatchNumber(e.target.value)}
              placeholder="e.g. BATCH-2026-001"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              required
            />
          </div>

          {/* Mfg & Expiry Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Mfg Date *
              </label>
              <input
                type="date"
                value={manufacturingDate}
                onChange={e => setManufacturingDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Quality Control Handoff Checkbox */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createQCHandoff}
                onChange={e => setCreateQCHandoff(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Initiate Quality Control & Place in Quarantine
                </span>
                <p className="text-slate-500 mt-0.5">
                  Automatically generates a QC In-Process/Finished Goods Inspection record and routes stock into quarantine status until cleared.
                </p>
              </div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Production Output Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Clean run, packaging intact, transfer to Finished Goods Warehouse Bay"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || quantity <= 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Recording Output...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Finished Goods Output
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
