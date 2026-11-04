import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { ProductionOrder } from '../../../../types/production';
import { productionApi } from '../../../../services/productionApi';

interface MaterialReturnModalProps {
  isOpen: boolean;
  order: ProductionOrder;
  onClose: () => void;
  onReturned: () => void;
}

export const MaterialReturnModal: React.FC<MaterialReturnModalProps> = ({
  isOpen,
  order,
  onClose,
  onReturned,
}) => {
  const [selectedComponentId, setSelectedComponentId] = useState<string>(
    order.components && order.components.length > 0 ? order.components[0].id : ''
  );
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState<string>('Unused excess material from batch execution');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentComp = (order.components || []).find(c => c.id === selectedComponentId);
  const maxReturnable = currentComp
    ? Math.max(0, currentComp.issued_quantity - currentComp.consumed_quantity - currentComp.returned_quantity)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComponentId) {
      setError('Please select a component to return.');
      return;
    }
    if (quantity <= 0) {
      setError('Return quantity must be greater than zero.');
      return;
    }
    if (quantity > maxReturnable) {
      setError(`Cannot return more than unconsumed issued quantity (${maxReturnable}).`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await productionApi.returnMaterials(order.id, {
        componentId: selectedComponentId,
        quantity: Number(quantity),
        warehouseId: order.warehouse_id,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        idempotencyKey: `ret-${order.id}-${selectedComponentId}-${Date.now()}`,
      });
      onReturned();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process material return.');
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
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Return Unused Materials</h3>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono font-medium text-slate-700">{order.production_order_number}</span> • Restock to Warehouse
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

          {/* Component Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Component / Raw Material *
            </label>
            <select
              value={selectedComponentId}
              onChange={e => {
                setSelectedComponentId(e.target.value);
                setQuantity(0);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            >
              {(order.components || []).map(comp => {
                const ret = Math.max(0, comp.issued_quantity - comp.consumed_quantity - comp.returned_quantity);
                return (
                  <option key={comp.id} value={comp.id}>
                    {comp.component_sku_name} ({comp.component_sku_code}) — In Floor: {ret} {comp.required_unit_code}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Current Staging Stats */}
          {currentComp && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-500 block">Issued</span>
                <span className="font-semibold text-slate-800">
                  {currentComp.issued_quantity} {currentComp.required_unit_code}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Consumed</span>
                <span className="font-semibold text-slate-800">
                  {currentComp.consumed_quantity} {currentComp.required_unit_code}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Available on Floor</span>
                <span className="font-semibold text-amber-600">
                  {maxReturnable} {currentComp.required_unit_code}
                </span>
              </div>
            </div>
          )}

          {/* Quantity to Return */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Quantity to Return *
              </label>
              {maxReturnable > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(maxReturnable)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  Return All ({maxReturnable})
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.001"
                max={maxReturnable || undefined}
                value={quantity || ''}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                placeholder="0.000"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                {currentComp?.required_unit_code || 'units'}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Reason for Return *
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Unused excess material after batch output"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Clean sealed container returned to Raw Material Bay B"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
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
              disabled={submitting || quantity <= 0 || quantity > maxReturnable}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Returning Stock...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Confirm Restocking Return
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
