import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Layers } from 'lucide-react';
import { inventoryApi } from '../../../services/inventoryApi';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

interface OpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function OpeningBalanceModal({
  isOpen,
  onClose,
  onSuccess,
}: OpeningBalanceModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [skus, setSkus] = useState<Array<{ id: string; sku: string; variant_name: string; product_name: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const [skuId, setSkuId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
        console.error('Failed to load opening balance metadata:', err);
      }
    };

    loadMeta();
  }, [isOpen]);

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
    if (isNaN(numQty) || numQty < 0) {
      setFormError('Quantity must be zero or a positive number');
      return;
    }

    setIsSubmitting(true);
    try {
      await inventoryApi.setOpeningBalance({
        organization_id: user?.organization_id || 'org-jyotsvan-corp',
        sku_id: skuId,
        warehouse_id: warehouseId,
        quantity: numQty,
        notes: notes.trim() || undefined,
        actor_id: user?.id,
        actor_email: user?.email,
      });

      addToast({
        type: 'success',
        title: 'Opening Balance Set',
        message: `Baseline opening balance established at ${numQty} units.`,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to set opening balance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Establish Opening Stock Baseline</h2>
              <p className="text-xs text-slate-500">Record baseline inventory count for legacy migration</p>
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
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Select Canonical SKU <span className="text-red-500">*</span>
            </label>
            <select
              value={skuId}
              onChange={(e) => setSkuId(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Depot / Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Opening Quantity <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="e.g. 500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full h-10 px-3 pl-10 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  required
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Migration / Legacy Source Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Tally ERP opening migration batch #104."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

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
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? <span>Saving Baseline...</span> : <span>Establish Opening Balance</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
