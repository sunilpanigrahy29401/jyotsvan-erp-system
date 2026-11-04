import React, { useState } from 'react';
import {
  X,
  Package,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { ProductionOrder, ProductionOrderComponent } from '../../../../types/production';
import { productionApi } from '../../../../services/productionApi';

interface MaterialIssueModalProps {
  isOpen: boolean;
  order: ProductionOrder;
  onClose: () => void;
  onIssued: () => void;
}

export const MaterialIssueModal: React.FC<MaterialIssueModalProps> = ({
  isOpen,
  order,
  onClose,
  onIssued,
}) => {
  const [selectedComponentId, setSelectedComponentId] = useState<string>(
    order.components && order.components.length > 0 ? order.components[0].id : ''
  );
  const [quantity, setQuantity] = useState<number>(() => {
    const first = order.components && order.components.length > 0 ? order.components[0] : null;
    if (first) {
      return Math.max(0, first.planned_quantity - first.issued_quantity);
    }
    return 0;
  });
  const [batchNumber, setBatchNumber] = useState<string>('LOT-RM-2026-01');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentComp = (order.components || []).find(c => c.id === selectedComponentId);
  const remainingNeeded = currentComp
    ? Math.max(0, Math.round((currentComp.planned_quantity - currentComp.issued_quantity) * 1000) / 1000)
    : 0;

  const handleComponentChange = (compId: string) => {
    setSelectedComponentId(compId);
    const comp = (order.components || []).find(c => c.id === compId);
    if (comp) {
      setQuantity(Math.max(0, Math.round((comp.planned_quantity - comp.issued_quantity) * 1000) / 1000));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComponentId) {
      setError('Please select a component to issue.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity to issue must be strictly greater than zero.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await productionApi.issueMaterials(order.id, [
        {
          componentId: selectedComponentId,
          quantity: Number(quantity),
          warehouseId: order.warehouse_id,
          batchNumber: batchNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          idempotencyKey: `iss-${order.id}-${selectedComponentId}-${Date.now()}`,
        },
      ]);
      onIssued();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue materials.');
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
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Issue Materials to Shop Floor</h3>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono font-medium text-slate-700">{order.production_order_number}</span> • Warehouse Dispensing
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
              onChange={e => handleComponentChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              {(order.components || []).map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.component_sku_name} ({comp.component_sku_code}) — Rem: {Math.max(0, comp.planned_quantity - comp.issued_quantity)} {comp.required_unit_code}
                </option>
              ))}
            </select>
          </div>

          {/* Component Balance Summary Box */}
          {currentComp && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-500 block">Planned Gross</span>
                <span className="font-semibold text-slate-800">
                  {currentComp.planned_quantity} {currentComp.required_unit_code}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Already Issued</span>
                <span className="font-semibold text-blue-600">
                  {currentComp.issued_quantity} {currentComp.required_unit_code}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Remaining Needed</span>
                <span className="font-semibold text-amber-600">
                  {remainingNeeded} {currentComp.required_unit_code}
                </span>
              </div>
            </div>
          )}

          {/* Quantity to Issue */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Quantity to Issue *
              </label>
              {remainingNeeded > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(remainingNeeded)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Set to Remaining ({remainingNeeded})
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={quantity || ''}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                placeholder="0.000"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                {currentComp?.required_unit_code || 'units'}
              </span>
            </div>
          </div>

          {/* Lot / Batch Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Raw Material Batch / Lot Number
            </label>
            <input
              type="text"
              value={batchNumber}
              onChange={e => setBatchNumber(e.target.value)}
              placeholder="e.g. LOT-RM-2026-A1"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Dispensing Notes / Comments
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Dispensed to reactor kettle prep staging corridor"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Issuing Stock...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Confirm Dispensing & Issue
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
