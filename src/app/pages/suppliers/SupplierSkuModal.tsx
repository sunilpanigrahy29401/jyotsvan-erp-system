import React, { useState, useEffect } from 'react';
import { X, Layers, Check, AlertCircle, Search } from 'lucide-react';
import { SupplierSKU } from '../../../types/suppliers';
import { productService } from '../../../services/productService';
import { SKU } from '../../../types/products';

interface SupplierSkuModalProps {
  isOpen: boolean;
  supplierId: string;
  mapping: SupplierSKU | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  organizationId: string;
}

export const SupplierSkuModal: React.FC<SupplierSkuModalProps> = ({
  isOpen,
  supplierId,
  mapping,
  onClose,
  onSave,
  organizationId,
}) => {
  const [availableSkus, setAvailableSkus] = useState<SKU[]>([]);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  
  const [supplierProductCode, setSupplierProductCode] = useState('');
  const [supplierProductName, setSupplierProductName] = useState('');
  const [supplierDescription, setSupplierDescription] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState<number | string>(10);
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState<number | string>(1);
  const [preferredSupplier, setPreferredSupplier] = useState(false);
  
  // Optional initial quote price
  const [initialPrice, setInitialPrice] = useState<number | string>('');
  const [currency, setCurrency] = useState('INR');
  const [priceUnit, setPriceUnit] = useState('unit');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSkus();
    }
  }, [isOpen, organizationId]);

  const loadSkus = async () => {
    try {
      setLoadingSkus(true);
      const skus = await productService.getSKUs({ organizationId });
      setAvailableSkus(skus);
    } catch (err: any) {
      console.warn('Failed to load SKUs', err);
    } finally {
      setLoadingSkus(false);
    }
  };

  useEffect(() => {
    if (mapping) {
      setSelectedSkuId(mapping.sku_id || '');
      setSupplierProductCode(mapping.supplier_product_code || '');
      setSupplierProductName(mapping.supplier_product_name || '');
      setSupplierDescription(mapping.supplier_description || '');
      setLeadTimeDays(mapping.lead_time_days ?? 10);
      setMinimumOrderQuantity(mapping.minimum_order_quantity || 1);
      setPreferredSupplier(Boolean(mapping.preferred_supplier));
      setInitialPrice('');
    } else {
      setSelectedSkuId('');
      setSupplierProductCode('');
      setSupplierProductName('');
      setSupplierDescription('');
      setLeadTimeDays(10);
      setMinimumOrderQuantity(1);
      setPreferredSupplier(false);
      setInitialPrice('');
      setCurrency('INR');
      setPriceUnit('unit');
    }
    setError(null);
  }, [mapping, isOpen]);

  if (!isOpen) return null;

  const filteredSkus = availableSkus.filter(s => 
    s.sku.toLowerCase().includes(skuSearch.toLowerCase()) ||
    s.variant_name.toLowerCase().includes(skuSearch.toLowerCase()) ||
    (s.product_name && s.product_name.toLowerCase().includes(skuSearch.toLowerCase()))
  );

  const selectedSku = availableSkus.find(s => s.id === selectedSkuId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapping && !selectedSkuId) {
      setError('Please select a canonical Jyotsvan SKU from the catalog');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        sku_id: mapping ? mapping.sku_id : selectedSkuId,
        supplier_product_code: supplierProductCode.trim() || undefined,
        supplier_product_name: supplierProductName.trim() || undefined,
        supplier_description: supplierDescription.trim() || undefined,
        lead_time_days: leadTimeDays !== '' ? parseInt(String(leadTimeDays), 10) : null,
        minimum_order_quantity: Math.max(0, parseFloat(String(minimumOrderQuantity)) || 1),
        preferred_supplier: preferredSupplier,
        status: 'active',
        initial_price: initialPrice !== '' ? parseFloat(String(initialPrice)) : undefined,
        currency,
        price_unit: priceUnit,
        organization_id: organizationId
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save SKU mapping');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {mapping ? 'Edit Supplier SKU Parameters' : 'Map Canonical Jyotsvan SKU to Supplier'}
              </h3>
              <p className="text-xs text-slate-500">
                Associate vendor part codes, lead times, MOQ, and contract rates
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Canonical SKU Selection */}
          {!mapping ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select Canonical Product / SKU <span className="text-rose-500">*</span>
              </label>

              {/* Quick Search */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  placeholder="Filter SKUs by code or product name..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                required
                value={selectedSkuId}
                onChange={(e) => {
                  setSelectedSkuId(e.target.value);
                  const found = availableSkus.find(s => s.id === e.target.value);
                  if (found && !supplierProductName) {
                    setSupplierProductName(found.product_name || found.variant_name);
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              >
                <option value="">-- Choose an existing canonical SKU --</option>
                {filteredSkus.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.sku}] {s.product_name || 'Product'} — {s.variant_name} (Cost: ₹{s.cost_price || 0})
                  </option>
                ))}
              </select>

              {selectedSku && (
                <div className="mt-2 p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-indigo-900">{selectedSku.product_name}</span>
                    <span className="text-indigo-700 ml-1">({selectedSku.variant_name})</span>
                  </div>
                  <div className="font-mono text-indigo-800 font-medium">
                    SKU: {selectedSku.sku}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Mapped Canonical SKU
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{mapping.product_name || 'Product'}</h4>
                  <p className="text-xs text-slate-600 font-mono">{mapping.sku} ({mapping.variant_name})</p>
                </div>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                  Standard Cost: ₹{mapping.standard_cost_price || 0}
                </span>
              </div>
            </div>
          )}

          {/* Supplier Specific Part Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Supplier Product / Part Code (MPN)
              </label>
              <input
                type="text"
                value={supplierProductCode}
                onChange={(e) => setSupplierProductCode(e.target.value)}
                placeholder="e.g. BSA-316L-SHT-10"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
              <span className="text-[11px] text-slate-500">Vendor catalog identifier</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Supplier Item Name / Description
              </label>
              <input
                type="text"
                value={supplierProductName}
                onChange={(e) => setSupplierProductName(e.target.value)}
                placeholder="e.g. SS 316L Cold Rolled Plate 10mm"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Lead Time for this Item (Days)
              </label>
              <input
                type="number"
                min="0"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="Leave blank to use supplier default"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Minimum Order Quantity (MOQ)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={minimumOrderQuantity}
                onChange={(e) => setMinimumOrderQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Initial Price Rate Quote (Only for new link) */}
          {!mapping && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg space-y-3">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                Initial Purchase Rate Quote (Optional)
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rate / Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={initialPrice}
                    onChange={(e) => setInitialPrice(e.target.value)}
                    placeholder="e.g. 3600.00"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 font-mono"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={priceUnit}
                    onChange={(e) => setPriceUnit(e.target.value)}
                    placeholder="e.g. sheet / unit"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Preferred Toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="preferred_supplier_toggle"
              checked={preferredSupplier}
              onChange={(e) => setPreferredSupplier(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded-sm focus:ring-indigo-500"
            />
            <label htmlFor="preferred_supplier_toggle" className="text-xs font-semibold text-slate-800">
              Set this vendor as the Primary / Preferred Supplier for this SKU
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : mapping ? 'Update Mapping' : 'Link SKU'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
