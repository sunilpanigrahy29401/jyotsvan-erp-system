import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, AlertCircle, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { inventoryApi } from '../../../services/inventoryApi';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import type { InventoryBalance, StockType } from '../../../types/inventory';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedBalance?: InventoryBalance | null;
}

export function StockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedBalance,
}: StockAdjustmentModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [skus, setSkus] = useState<Array<{ id: string; sku: string; variant_name: string; product_name: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const [skuId, setSkuId] = useState(preselectedBalance?.sku_id || '');
  const [warehouseId, setWarehouseId] = useState(preselectedBalance?.warehouse_id || '');
  const [locationId, setLocationId] = useState(preselectedBalance?.location_id || '');
  const [stockType, setStockType] = useState<StockType>('available');
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Physical Count Cycle Variance');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync preselected balance
  useEffect(() => {
    if (preselectedBalance) {
      setSkuId(preselectedBalance.sku_id);
      setWarehouseId(preselectedBalance.warehouse_id);
      setLocationId(preselectedBalance.location_id || '');
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
          // Fallback static known warehouses
          setWarehouses([
            { id: 'wh-central-01', name: 'Central Distribution Center (Bhiwandi)', code: 'WH-CENTRAL' },
            { id: 'wh-plant-01', name: 'Manufacturing Plant Depot (Sanand)', code: 'WH-PLANT' },
            { id: 'wh-del-01', name: 'North India Regional Hub (Delhi NCR)', code: 'WH-DELHI' },
          ]);
        }
      } catch (err) {
        console.error('Failed to load modal metadata:', err);
      }
    };

    loadMeta();
  }, [isOpen]);

  // Load locations for selected warehouse
  useEffect(() => {
    if (!warehouseId) {
      setLocations([]);
      return;
    }
    const loadLocs = async () => {
      try {
        const res = await fetch(`/api/warehouses/${encodeURIComponent(warehouseId)}/locations`).then((r) => r.json());
        if (res.locations) {
          setLocations(res.locations);
        } else {
          setLocations([]);
        }
      } catch {
        setLocations([]);
      }
    };
    loadLocs();
  }, [warehouseId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!skuId) {
      setFormError('Please select a SKU');
      return;
    }
    if (!warehouseId) {
      setFormError('Please select a warehouse');
      return;
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setFormError('Quantity must be a positive numeric value greater than zero');
      return;
    }

    const finalReason = reason === 'Other' ? customReason.trim() : reason;
    if (!finalReason) {
      setFormError('Please specify the reason for this inventory adjustment');
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = `ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const result = await inventoryApi.adjustStock({
        organization_id: user?.organization_id || 'org-jyotsvan-corp',
        sku_id: skuId,
        warehouse_id: warehouseId,
        location_id: locationId || undefined,
        stock_type: stockType,
        direction,
        quantity: numQty,
        reason: finalReason,
        notes: notes.trim() || undefined,
        idempotency_key: idempotencyKey,
        actor_id: user?.id,
        actor_email: user?.email,
      });

      addToast({
        type: 'success',
        title: 'Stock Adjustment Executed',
        message: `${direction === 'increase' ? '+' : '-'}${numQty} units adjusted for ${result.adjustment.adjustment_number}. Ledger updated.`,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to execute stock adjustment');
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
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Execute Stock Adjustment</h2>
              <p className="text-xs text-slate-500">Atomic inventory count correction with immutable ledger entry</p>
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
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

          {/* Warehouse and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Depot / Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Aisle / Bay Location (Optional)
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Default General Storage --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Type & Direction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Stock Sub-Pool
              </label>
              <select
                value={stockType}
                onChange={(e) => setStockType(e.target.value as StockType)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="available">Available (Unrestricted)</option>
                <option value="damaged">Damaged / Broken</option>
                <option value="quarantine">QC Quarantine Hold</option>
                <option value="reserved">Reserved Allocation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Adjustment Action <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('increase')}
                  className={`h-10 flex items-center justify-center space-x-1.5 rounded-lg border text-sm font-medium transition-all ${
                    direction === 'increase'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm ring-1 ring-emerald-500'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span>Increase (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('decrease')}
                  className={`h-10 flex items-center justify-center space-x-1.5 rounded-lg border text-sm font-medium transition-all ${
                    direction === 'decrease'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm ring-1 ring-amber-500'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 text-amber-600" />
                  <span>Decrease (-)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Quantity to Adjust <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="e.g. 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full h-10 px-3 pl-10 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supports decimal quantities up to 3 decimal points (e.g. 12.500 KG or 50 Units).
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Adjustment Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
            >
              <option value="Physical Count Cycle Variance">Physical Count Cycle Variance</option>
              <option value="Damage on Floor / Warehouse Handling">Damage on Floor / Warehouse Handling</option>
              <option value="Spoilage / Expired Material Scrap">Spoilage / Expired Material Scrap</option>
              <option value="QC Quarantine Rejection">QC Quarantine Rejection</option>
              <option value="Customer Return Restocked">Customer Return Restocked</option>
              <option value="Pilferage / Unaccounted Loss">Pilferage / Unaccounted Loss</option>
              <option value="Opening Balance Calibration">Opening Balance Calibration</option>
              <option value="Other">Other (Custom Specification)</option>
            </select>

            {reason === 'Other' && (
              <input
                type="text"
                placeholder="Specify exact reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Audit Notes & Reference Description
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Audit tag #4892 verified by QA Inspector during weekly cycle tally..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <span>Executing Adjustment...</span>
              ) : (
                <span>Apply {direction === 'increase' ? 'Positive (+)' : 'Negative (-)'} Adjustment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
