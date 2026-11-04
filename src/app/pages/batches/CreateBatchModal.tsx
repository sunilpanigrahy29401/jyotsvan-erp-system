import React, { useState, useEffect } from 'react';
import { X, Plus, AlertTriangle, Calendar, Layers, Warehouse, Package, FileText, CheckCircle2 } from 'lucide-react';
import type { BatchType, BatchStatus } from '../../../types/batches';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export function CreateBatchModal({ isOpen, onClose, onSubmit }: CreateBatchModalProps) {
  const [skus, setSkus] = useState<Array<{ id: string; sku: string; variant_name: string; product_name: string; unit_id?: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; supplier_name: string; supplier_code: string }>>([]);

  const [skuId, setSkuId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [batchType, setBatchType] = useState<BatchType>('raw_material');
  const [status, setStatus] = useState<BatchStatus>('quarantine');
  const [initialQuantity, setInitialQuantity] = useState<number | ''>('');
  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierBatchNumber, setSupplierBatchNumber] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [retestDate, setRetestDate] = useState('');
  const [storageConditions, setStorageConditions] = useState('Store in cool dry place (15-25°C)');
  const [potencyOrPurity, setPotencyOrPurity] = useState<number | ''>('');
  const [costPerUnit, setCostPerUnit] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [sourceType, setSourceType] = useState('opening_stock');

  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingMeta(true);
    Promise.all([
      fetch('/api/products/skus').then((r) => r.json()).catch(() => ({ skus: [] })),
      fetch('/api/warehouses').then((r) => r.json()).catch(() => ({ warehouses: [] })),
      fetch('/api/suppliers').then((r) => r.json()).catch(() => ({ suppliers: [] })),
    ])
      .then(([skuData, whData, supData]) => {
        const list = skuData.skus || [];
        setSkus(list);
        if (list.length > 0 && !skuId) {
          setSkuId(list[0].id);
        }
        if (whData.warehouses) {
          setWarehouses(whData.warehouses);
          if (whData.warehouses.length > 0 && !warehouseId) {
            setWarehouseId(whData.warehouses[0].id);
          }
        }
        if (supData.suppliers) {
          setSuppliers(supData.suppliers);
        }
      })
      .finally(() => setIsLoadingMeta(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuId) {
      setError('Please select a SKU.');
      return;
    }
    if (initialQuantity === '' || Number(initialQuantity) <= 0) {
      setError('Please enter a valid initial quantity greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        skuId,
        batchNumber: batchNumber.trim() || undefined,
        batchType,
        status,
        initialQuantity: Number(initialQuantity),
        warehouseId: warehouseId || undefined,
        supplierId: supplierId || undefined,
        supplierBatchNumber: supplierBatchNumber.trim() || undefined,
        manufacturingDate: manufacturingDate || null,
        expiryDate: expiryDate || null,
        retestDate: retestDate || null,
        storageConditions: storageConditions.trim() || undefined,
        potencyOrPurity: potencyOrPurity !== '' ? Number(potencyOrPurity) : undefined,
        costPerUnit: costPerUnit !== '' ? Number(costPerUnit) : undefined,
        notes: notes.trim() || undefined,
        sourceType,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create batch record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Register New Batch / Lot</h3>
              <p className="text-xs text-slate-500">Record incoming raw material lot or opening stock batch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SKU Selection */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Product SKU <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={skuId}
                onChange={(e) => setSkuId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {skus.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sku} — {s.product_name || s.variant_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Number & Auto-generation notice */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Batch / Lot Number
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="Leave blank for auto-generated sequence"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 font-mono"
              />
              <span className="text-[11px] text-slate-400">Empty value will apply automatic numbering rule.</span>
            </div>

            {/* Batch Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Batch Category
              </label>
              <select
                value={batchType}
                onChange={(e) => setBatchType(e.target.value as BatchType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="raw_material">Raw Material (Active / Chemical / Herb)</option>
                <option value="intermediate">Intermediate / Bulk Compound</option>
                <option value="finished_good">Finished Good / Packaged Unit</option>
                <option value="packaging">Packaging Material</option>
                <option value="imported">Imported / Trading Good</option>
              </select>
            </div>

            {/* Initial Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Initial Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 500"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Target Warehouse */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Storage Warehouse
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Initial Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Initial State
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BatchStatus)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="quarantine">Quarantine (Pending QC)</option>
                <option value="released">Released (Immediate Availability)</option>
                <option value="hold">Investigative Hold</option>
              </select>
            </div>

            {/* Source Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Intake Source
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="opening_stock">Opening Stock Take</option>
                <option value="grn">Goods Receipt Note (GRN)</option>
                <option value="manual">Manual Registration</option>
                <option value="stock_adjustment">Inventory Adjustment Intake</option>
              </select>
            </div>

            {/* Manufacturing Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Manufacturing Date
              </label>
              <input
                type="date"
                value={manufacturingDate}
                onChange={(e) => setManufacturingDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Supplier Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Supplier / Manufacturer
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Supplier (Optional)...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.supplier_name} ({s.supplier_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier Lot Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Supplier Batch / COA Lot #
              </label>
              <input
                type="text"
                value={supplierBatchNumber}
                onChange={(e) => setSupplierBatchNumber(e.target.value)}
                placeholder="e.g. BASF-LOT-8812"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Potency / Purity % */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assay Potency / Purity (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={potencyOrPurity}
                onChange={(e) => setPotencyOrPurity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 99.85"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Unit Cost */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unit Valuation Cost (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 240.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Storage Conditions */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Storage & Environmental Specifications
              </label>
              <input
                type="text"
                value={storageConditions}
                onChange={(e) => setStorageConditions(e.target.value)}
                placeholder="e.g. Keep airtight below 25°C, away from light and humidity"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Batch Notes & Verification Remarks
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special handling instructions, COA document reference, or inspection notes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingMeta}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering...' : 'Register Batch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
