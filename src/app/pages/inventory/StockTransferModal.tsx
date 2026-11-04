import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertCircle, ArrowRight, Layers } from 'lucide-react';
import { inventoryApi } from '../../../services/inventoryApi';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import type { InventoryBalance } from '../../../types/inventory';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedBalance?: InventoryBalance | null;
}

export function StockTransferModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedBalance,
}: StockTransferModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [skus, setSkus] = useState<Array<{ id: string; sku: string; variant_name: string; product_name: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const [skuId, setSkuId] = useState(preselectedBalance?.sku_id || '');
  const [fromWarehouseId, setFromWarehouseId] = useState(preselectedBalance?.warehouse_id || '');
  const [fromLocationId, setFromLocationId] = useState(preselectedBalance?.location_id || '');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Stock Rebalancing Across Hubs');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync preselected balance
  useEffect(() => {
    if (preselectedBalance) {
      setSkuId(preselectedBalance.sku_id);
      setFromWarehouseId(preselectedBalance.warehouse_id);
      setFromLocationId(preselectedBalance.location_id || '');
    }
  }, [preselectedBalance]);

  // Load SKUs and Warehouses
  useEffect(() => {
    if (!isOpen) return;

    const loadMeta = async () => {
      try {
        const [skusRes, whRes] = await Promise.all([
          fetch('/api/skus?limit=100').then((r) => r.json()),
          fetch('/api/warehouses').then((r) => r.json()).catch(() => ({ warehouses: [] })),
        ]);

        if (skusRes.skus) {
          setSkus(skusRes.skus);
        }
        if (whRes.warehouses && whRes.warehouses.length > 0) {
          setWarehouses(whRes.warehouses);
        } else {
          setWarehouses([
            { id: 'wh-central-01', name: 'Central Distribution Center (Bhiwandi)', code: 'WH-CENTRAL' },
            { id: 'wh-plant-01', name: 'Manufacturing Plant Depot (Sanand)', code: 'WH-PLANT' },
            { id: 'wh-del-01', name: 'North India Regional Hub (Delhi NCR)', code: 'WH-DELHI' },
          ]);
        }
      } catch (err) {
        console.error('Failed to load transfer metadata:', err);
      }
    };

    loadMeta();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!skuId) {
      setFormError('Please select a SKU to transfer');
      return;
    }
    if (!fromWarehouseId) {
      setFormError('Please select source warehouse');
      return;
    }
    if (!toWarehouseId) {
      setFormError('Please select destination warehouse');
      return;
    }
    if (fromWarehouseId === toWarehouseId && fromLocationId === toLocationId) {
      setFormError('Source and destination warehouse/location cannot be identical');
      return;
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setFormError('Quantity must be a positive numeric value greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      await inventoryApi.transferStock({
        organization_id: user?.organization_id || 'org-jyotsvan-corp',
        sku_id: skuId,
        from_warehouse_id: fromWarehouseId,
        from_location_id: fromLocationId || undefined,
        to_warehouse_id: toWarehouseId,
        to_location_id: toLocationId || undefined,
        quantity: numQty,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        actor_id: user?.id,
        actor_email: user?.email,
      });

      addToast({
        type: 'success',
        title: 'Stock Transfer Dispatched',
        message: `Successfully transferred ${numQty} units between depots in a single atomic transaction.`,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to execute stock transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Inter-Warehouse Stock Transfer</h2>
              <p className="text-xs text-slate-500">Atomic source deduction & destination credit with double-entry ledger audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* SKU Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Select Canonical SKU <span className="text-red-500">*</span>
            </label>
            <select
              value={skuId}
              onChange={(e) => setSkuId(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Choose SKU --</option>
              {skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sku} — {s.product_name ? `${s.product_name} (${s.variant_name})` : s.variant_name}
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Route Visual Grid */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              {/* Origin */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Origin (Source Depot)</span>
                </div>
                <select
                  value={fromWarehouseId}
                  onChange={(e) => setFromWarehouseId(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select Source Depot --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id} disabled={w.id === toWarehouseId}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Destination (Target Depot)</span>
                </div>
                <select
                  value={toWarehouseId}
                  onChange={(e) => setToWarehouseId(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select Target Depot --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id} disabled={w.id === fromWarehouseId}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Transfer Quantity <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="e.g. 100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full h-10 px-3 pl-10 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Transfer Purpose / Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            >
              <option value="Stock Rebalancing Across Hubs">Stock Rebalancing Across Hubs</option>
              <option value="Direct Fulfillment Depot Replenishment">Direct Fulfillment Depot Replenishment</option>
              <option value="Manufacturing Plant to CDC Stock Intake">Manufacturing Plant to CDC Stock Intake</option>
              <option value="Marketplace FBA Stock Ingestion Staging">Marketplace FBA Stock Ingestion Staging</option>
              <option value="Inter-Bay Relocation">Inter-Bay Relocation</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Dispatch Reference / Truck Waybill Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Dispatch via SafeXpress LORRY #GJ-01-AX-9912. LR #991284."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <span>Executing Transfer...</span>
              ) : (
                <>
                  <span>Dispatch Inter-Warehouse Transfer</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
