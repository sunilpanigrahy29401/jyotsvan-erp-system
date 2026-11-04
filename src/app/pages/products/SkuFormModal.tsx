import { useState, useEffect } from 'react';
import { X, Tag, AlertCircle, Save, Barcode } from 'lucide-react';
import type { SKU, Product } from '../../../types/products';
import { productService } from '../../../services/productService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

interface SkuFormModalProps {
  isOpen: boolean;
  sku?: SKU | null;
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SkuFormModal({
  isOpen,
  sku,
  product,
  onClose,
  onSuccess,
}: SkuFormModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [skuCode, setSkuCode] = useState('');
  const [variantName, setVariantName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [packSize, setPackSize] = useState<number>(1);
  const [packUnit, setPackUnit] = useState('pcs');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18.0);
  const [taxCode, setTaxCode] = useState('HSN-8413');
  const [netWeight, setNetWeight] = useState<string>('');
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [reorderQuantity, setReorderQuantity] = useState<number>(50);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sku) {
      setSkuCode(sku.sku);
      setVariantName(sku.variant_name);
      setBarcode(sku.barcode || '');
      setPackSize(Number(sku.pack_size) || 1);
      setPackUnit(sku.pack_unit || 'pcs');
      setCostPrice(Number(sku.cost_price) || 0);
      setSellingPrice(Number(sku.selling_price) || 0);
      setMrp(Number(sku.mrp) || 0);
      setTaxRate(Number(sku.tax_rate) || 18.0);
      setTaxCode(sku.tax_code || 'HSN-8413');
      setNetWeight(sku.net_weight ? String(sku.net_weight) : '');
      setGrossWeight(sku.gross_weight ? String(sku.gross_weight) : '');
      setLength(sku.length ? String(sku.length) : '');
      setWidth(sku.width ? String(sku.width) : '');
      setHeight(sku.height ? String(sku.height) : '');
      setReorderLevel(sku.reorder_level || 10);
      setReorderQuantity(sku.reorder_quantity || 50);
      setStatus(sku.status === 'inactive' ? 'inactive' : 'active');
    } else {
      const baseCode = product ? `${product.product_code}-VAR` : 'SKU-NEW';
      setSkuCode(baseCode);
      setVariantName('Standard Variant');
      setBarcode('890' + Math.floor(1000000000 + Math.random() * 9000000000));
      setPackSize(1);
      setPackUnit(product?.unit || 'pcs');
      setCostPrice(product?.cost_price || 0);
      setSellingPrice(product?.selling_price || 0);
      setMrp(product?.mrp || product?.selling_price || 0);
      setTaxRate(product?.tax_rate || 18.0);
      setTaxCode(product?.tax_code || 'HSN-8413');
      setNetWeight('');
      setGrossWeight('');
      setLength('');
      setWidth('');
      setHeight('');
      setReorderLevel(product?.reorder_level || 10);
      setReorderQuantity(product?.reorder_quantity || 50);
      setStatus('active');
    }
    setError(null);
  }, [sku, product, isOpen]);

  if (!isOpen) return null;

  const handleGenerateBarcode = () => {
    setBarcode('890' + Math.floor(1000000000 + Math.random() * 9000000000));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuCode.trim()) {
      setError('SKU code is required');
      return;
    }
    if (!variantName.trim()) {
      setError('Variant name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      product_id: product?.id || sku?.product_id,
      sku: skuCode.trim().toUpperCase(),
      variant_name: variantName.trim(),
      barcode: barcode.trim() || null,
      pack_size: Number(packSize) || 1,
      pack_unit: packUnit,
      cost_price: Number(costPrice) || 0,
      selling_price: Number(sellingPrice) || 0,
      mrp: Number(mrp) || Number(sellingPrice) || 0,
      tax_rate: Number(taxRate),
      tax_code: taxCode.trim() || null,
      net_weight: netWeight ? Number(netWeight) : null,
      gross_weight: grossWeight ? Number(grossWeight) : null,
      length: length ? Number(length) : null,
      width: width ? Number(width) : null,
      height: height ? Number(height) : null,
      reorder_level: Number(reorderLevel) || 10,
      reorder_quantity: Number(reorderQuantity) || 50,
      status,
    };

    try {
      if (sku) {
        await productService.updateSKU(sku.id, payload, { id: user?.id, email: user?.email });
        showToast('SKU updated successfully', 'success');
      } else {
        await productService.createSKU(payload, { id: user?.id, email: user?.email });
        showToast('SKU created successfully', 'success');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      showToast(err.message || 'Failed to save SKU', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const margin = sellingPrice > 0 ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {sku ? 'Edit SKU Variant' : 'Add Canonical SKU Variant'}
              </h3>
              <p className="text-xs text-slate-500">
                {product ? `For Product: ${product.name} (${product.product_code})` : 'Configure variant identity, barcode, packaging & pricing'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                SKU Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={skuCode}
                onChange={e => setSkuCode(e.target.value.toUpperCase())}
                placeholder="e.g. JYT-PUMP-400-STD"
                required
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Variant Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={variantName}
                onChange={e => setVariantName(e.target.value)}
                placeholder="e.g. 500ml Bottle / 25kg Pack"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Barcode */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Barcode (EAN-13 / UPC / GS1)
              </label>
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <Barcode className="w-3.5 h-3.5" /> Auto-Generate
              </button>
            </div>
            <input
              type="text"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              placeholder="e.g. 8901234567890"
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Packaging */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Packaging & Physical Dimensions
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Pack Size</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={packSize}
                  onChange={e => setPackSize(parseFloat(e.target.value) || 1)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Pack Unit</label>
                <select
                  value={packUnit}
                  onChange={e => setPackUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="units">Units</option>
                  <option value="box">Box</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="l">Liters (L)</option>
                  <option value="ml">Milliliters (mL)</option>
                  <option value="drums">Drums</option>
                  <option value="cartons">Cartons</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Net Wt (kg)</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={netWeight}
                  onChange={e => setNetWeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Gross Wt (kg)</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={grossWeight}
                  onChange={e => setGrossWeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Length (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={length}
                  onChange={e => setLength(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Width (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={width}
                  onChange={e => setWidth(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Margins */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Pricing & Tax Structure
              </h4>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                Gross Margin: {margin}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Cost Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={e => setCostPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellingPrice}
                  onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">MRP (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={mrp}
                  onChange={e => setMrp(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Tax Rate (GST %)</label>
                <select
                  value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5% (GST 5)</option>
                  <option value={12}>12% (GST 12)</option>
                  <option value={18}>18% (GST 18 - Standard)</option>
                  <option value={28}>28% (GST 28 - Luxury/Heavy)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">HSN / SAC Code</label>
                <input
                  type="text"
                  value={taxCode}
                  onChange={e => setTaxCode(e.target.value)}
                  placeholder="e.g. HSN-8413"
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Reorder Planning */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reorder Level (ROL)</label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={e => setReorderLevel(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reorder Qty (ROQ)</label>
              <input
                type="number"
                min="1"
                value={reorderQuantity}
                onChange={e => setReorderQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Variant Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : sku ? 'Update Variant' : 'Create Variant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
