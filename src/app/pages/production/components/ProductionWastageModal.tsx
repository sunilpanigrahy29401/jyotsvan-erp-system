import React, { useState } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { ProductionOrder } from '../../../../types/production';
import { productionApi } from '../../../../services/productionApi';

interface ProductionWastageModalProps {
  isOpen: boolean;
  order: ProductionOrder;
  onClose: () => void;
  onRecorded: () => void;
}

export const ProductionWastageModal: React.FC<ProductionWastageModalProps> = ({
  isOpen,
  order,
  onClose,
  onRecorded,
}) => {
  const [category, setCategory] = useState<string>('process_loss');
  const [quantity, setQuantity] = useState<number>(0);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [reason, setReason] = useState<string>('Evaporation and kettle residue loss during heating');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Wastage quantity must be greater than zero.');
      return;
    }
    if (!reason.trim()) {
      setError('A valid reason for wastage / process loss is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const comp = (order.components || []).find(c => c.id === selectedComponentId);

    try {
      await productionApi.recordWastage(order.id, {
        category,
        quantity: Number(quantity),
        unitId: comp?.required_unit_id || order.unit_id,
        skuId: comp?.component_sku_id || order.finished_sku_id,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      onRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record process wastage.');
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
            <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Record Process Loss & Scrap</h3>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono font-medium text-slate-700">{order.production_order_number}</span> • Variance Logging
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

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Loss Category *
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
            >
              <option value="process_loss">Standard Process Loss (Evaporation / Purge)</option>
              <option value="scrap">Scrap & Off-Spec Product</option>
              <option value="spillage">Accidental Spillage / Leak</option>
              <option value="damaged_material">Damaged Packaging / Contaminated Material</option>
              <option value="testing_sample">Destructive QC Sample Consumption</option>
              <option value="other">Other Process Loss</option>
            </select>
          </div>

          {/* Item or General Batch Loss */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Affects Component or Finished Batch?
            </label>
            <select
              value={selectedComponentId}
              onChange={e => setSelectedComponentId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
            >
              <option value="">Finished Product Batch ({order.finished_sku_name})</option>
              {(order.components || []).map(comp => (
                <option key={comp.id} value={comp.id}>
                  Raw Material: {comp.component_sku_name} ({comp.component_sku_code})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Scrap / Loss Quantity *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={quantity || ''}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                placeholder="0.000"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                {selectedComponentId
                  ? (order.components || []).find(c => c.id === selectedComponentId)?.required_unit_code || 'units'
                  : order.unit_code}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Reason / Cause *
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Tank vessel bottom purge before changeover"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Additional Details / Corrective Action
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Logged for shift yield reconciliation; no contamination risk to subsequent batches"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
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
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Logging Loss...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Confirm Wastage Entry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
