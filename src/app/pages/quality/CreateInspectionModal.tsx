import { useState, useEffect } from 'react';
import { X, ShieldCheck, Plus, Package, Building2, Layers, AlertCircle } from 'lucide-react';
import type { QCTemplate } from '../../../types/quality';
import { qualityApi } from '../../../services/qualityApi';

interface CreateInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateInspectionModal({
  isOpen,
  onClose,
  onCreated,
}: CreateInspectionModalProps) {
  const [sourceType, setSourceType] = useState<'goods_receipt' | 'inventory_lot' | 'manual'>('goods_receipt');
  const [sourceId, setSourceId] = useState('');
  const [skuId, setSkuId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [receivedQty, setReceivedQty] = useState<number>(100);
  const [sampleQty, setSampleQty] = useState<number>(5);
  const [templateId, setTemplateId] = useState('');
  const [inspectionType, setInspectionType] = useState<'incoming' | 'in_process' | 'finished_good'>('incoming');

  // Catalogs
  const [templates, setTemplates] = useState<QCTemplate[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen]);

  const loadOptions = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Templates
      const tplRes = await qualityApi.getTemplates({ status: 'active', limit: 100 });
      setTemplates(tplRes.templates || []);

      // 2. Fetch SKUs via db proxy or product API
      const skuFetch = await fetch('/api/products/skus', {
        headers: { Authorization: `Bearer ${localStorage.getItem('jyotsvan_token') || 'test'}` },
      });
      if (skuFetch.ok) {
        const d = await skuFetch.json();
        setSkus(d.skus || d || []);
      }

      // 3. Fetch Warehouses
      const whFetch = await fetch('/api/warehouses', {
        headers: { Authorization: `Bearer ${localStorage.getItem('jyotsvan_token') || 'test'}` },
      });
      if (whFetch.ok) {
        const d = await whFetch.json();
        setWarehouses(d.warehouses || d || []);
      }

      // 4. Fetch Suppliers
      const supFetch = await fetch('/api/suppliers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('jyotsvan_token') || 'test'}` },
      });
      if (supFetch.ok) {
        const d = await supFetch.json();
        setSuppliers(d.suppliers || d || []);
      }
    } catch (err: any) {
      console.warn('Could not load all catalogs for QC modal:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuId || !warehouseId || !receivedQty) {
      setError('Material SKU, Target Warehouse, and Received Quantity are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await qualityApi.createInspection({
        sourceType,
        sourceId: sourceId || `MANUAL-${Date.now().toString(36).toUpperCase()}`,
        skuId,
        warehouseId,
        supplierId: supplierId || null,
        batchNumber: batchNumber || `BATCH-${Date.now().toString(36).toUpperCase()}`,
        receivedQuantity: receivedQty,
        sampleQuantity: sampleQty,
        templateId: templateId || null,
        inspectionType,
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create quality inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Initiate Quality Inspection</h2>
              <p className="text-xs text-slate-500">Log incoming raw materials, blends, or finished batches for QC testing</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Source Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source Origin</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="goods_receipt">Goods Receipt (GRN)</option>
                <option value="inventory_lot">Existing Inventory Lot</option>
                <option value="manual">Manual Batch Sampling</option>
              </select>
            </div>

            {/* Source ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source Document / Reference #</label>
              <input
                type="text"
                placeholder="e.g. GRN-2026-00042 or LOT-881"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Material / Product SKU *</label>
              <select
                required
                value={skuId}
                onChange={(e) => {
                  setSkuId(e.target.value);
                  const found = skus.find((s) => s.id === e.target.value);
                  if (found && found.qc_template_id) {
                    setTemplateId(found.qc_template_id);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="">-- Select SKU --</option>
                {skus.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sku} &bull; {s.variant_name || s.name || 'Material'}
                  </option>
                ))}
              </select>
            </div>

            {/* Warehouse */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Plant / Warehouse *</label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Batch # */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch / Lot #</label>
              <input
                type="text"
                placeholder="e.g. BATCH-26A-01"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier (Optional)</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Inspection Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Inspection Type</label>
              <select
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="incoming">Incoming Material</option>
                <option value="in_process">In-Process Blend</option>
                <option value="finished_good">Finished Product</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Received Qty */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Received Qty *</label>
              <input
                type="number"
                required
                min="0.001"
                step="any"
                value={receivedQty}
                onChange={(e) => setReceivedQty(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>

            {/* Sample Qty */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sample Drawn Qty</label>
              <input
                type="number"
                min="0"
                step="any"
                value={sampleQty}
                onChange={(e) => setSampleQty(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>

            {/* QC Template */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">QC Specification Template</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="">-- Default Standard Template --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.template_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Creating QC Inspection...' : 'Create Inspection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
