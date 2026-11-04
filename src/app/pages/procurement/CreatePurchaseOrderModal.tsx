import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  ShoppingCart,
  Building,
  Building2,
  Layers,
} from 'lucide-react';
import { procurementApi } from '../../../services/procurementApi';
import type { PurchaseRequest } from '../../../types/procurement';

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialFromRequest?: PurchaseRequest | null;
}

interface SkuOption {
  id: string;
  sku_code: string;
  variant_name: string;
  product_name: string;
  cost_price: number;
  mrp: number;
}

interface SupplierOption {
  id: string;
  supplier_name: string;
  supplier_code: string;
  payment_terms?: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface PoItemRow {
  skuId: string;
  skuCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  notes: string;
}

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialFromRequest,
}) => {
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [currency, setCurrency] = useState('INR');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [shippingAddress, setShippingAddress] = useState('Main Inward Dock, Central Logistics Center, Plot 42, MIDC Industrial Area');
  const [shippingAmount, setShippingAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('Standard 30-day payment upon delivery and QC signoff.');

  const [availableSkus, setAvailableSkus] = useState<SkuOption[]>([]);
  const [items, setItems] = useState<PoItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen, initialFromRequest]);

  const loadDependencies = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Suppliers
      const supRes = await fetch('/api/suppliers?limit=100');
      const supData = await supRes.json();
      if (supData.success && supData.suppliers) {
        setSuppliers(supData.suppliers);
        if (supData.suppliers.length > 0) {
          setSupplierId(supData.suppliers[0].id);
        }
      }

      // 2. Fetch Warehouses
      const whRes = await fetch('/api/warehouses?limit=50');
      const whData = await whRes.json();
      if (whData.success && whData.warehouses) {
        setWarehouses(whData.warehouses);
        if (whData.warehouses.length > 0) {
          setWarehouseId(whData.warehouses[0].id);
        }
      }

      // 3. Fetch SKUs
      const skuRes = await fetch('/api/skus?limit=100');
      const skuData = await skuRes.json();
      if (skuData.success && skuData.skus) {
        setAvailableSkus(skuData.skus);

        // Populate from PR if converting
        if (initialFromRequest && initialFromRequest.items && initialFromRequest.items.length > 0) {
          const prItems = initialFromRequest.items.map((it) => ({
            skuId: it.sku_id,
            skuCode: it.sku_code || 'SKU',
            productName: it.product_name || it.variant_name || 'Material Item',
            quantity: Math.max(1, Number(it.quantity) - Number(it.converted_quantity || 0)),
            unitPrice: Number(it.estimated_unit_cost) || 100,
            taxRate: 18,
            discountPercent: 0,
            notes: it.notes || '',
          }));
          setItems(prItems);
          if (initialFromRequest.required_by_date) {
            setExpectedDeliveryDate(initialFromRequest.required_by_date);
          }
          if (initialFromRequest.purpose) {
            setNotes(`Generated from Requisition ${initialFromRequest.request_number}: ${initialFromRequest.purpose}`);
          }
        } else if (skuData.skus.length > 0) {
          const first = skuData.skus[0];
          setItems([
            {
              skuId: first.id,
              skuCode: first.sku_code,
              productName: first.product_name || first.variant_name,
              quantity: 50,
              unitPrice: Number(first.cost_price || 150),
              taxRate: 18,
              discountPercent: 0,
              notes: '',
            },
          ]);
        }
      }
    } catch (err: any) {
      console.error('[Dependency Load Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const addItemRow = () => {
    if (availableSkus.length === 0) return;
    const first = availableSkus[0];
    setItems([
      ...items,
      {
        skuId: first.id,
        skuCode: first.sku_code,
        productName: first.product_name || first.variant_name,
        quantity: 10,
        unitPrice: Number(first.cost_price || 150),
        taxRate: 18,
        discountPercent: 0,
        notes: '',
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSkuChange = (idx: number, skuId: string) => {
    const selected = availableSkus.find((s) => s.id === skuId);
    if (!selected) return;
    const newItems = [...items];
    newItems[idx] = {
      ...newItems[idx],
      skuId: selected.id,
      skuCode: selected.sku_code,
      productName: selected.product_name || selected.variant_name,
      unitPrice: Number(selected.cost_price || 150),
    };
    setItems(newItems);
  };

  const handleItemChange = (idx: number, field: keyof PoItemRow, val: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: val };
    setItems(newItems);
  };

  // Financial calculations
  const calculateSubtotal = () => {
    return items.reduce((acc, it) => {
      const gross = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      const discount = gross * ((Number(it.discountPercent) || 0) / 100);
      return acc + (gross - discount);
    }, 0);
  };

  const calculateTax = () => {
    return items.reduce((acc, it) => {
      const gross = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      const discount = gross * ((Number(it.discountPercent) || 0) / 100);
      const net = gross - discount;
      return acc + net * ((Number(it.taxRate) || 0) / 100);
    }, 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateTax() + (Number(shippingAmount) || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError('Please select a supplier.');
      return;
    }
    if (!warehouseId) {
      setError('Please select a destination warehouse.');
      return;
    }
    if (!expectedDeliveryDate) {
      setError('Please specify expected delivery date.');
      return;
    }
    if (items.length === 0) {
      setError('At least one item line is required.');
      return;
    }

    setSubmitting(true);
    try {
      await procurementApi.createPurchaseOrder({
        supplierId,
        purchaseRequestId: initialFromRequest?.id,
        orderDate,
        expectedDeliveryDate,
        currency,
        paymentTerms,
        shippingAddress,
        warehouseId,
        shippingAmount: Number(shippingAmount) || 0,
        notes: notes.trim() || undefined,
        termsAndConditions: termsAndConditions.trim() || undefined,
        items: items.map((it) => ({
          skuId: it.skuId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discountPercent: Number(it.discountPercent) || 0,
          taxRate: Number(it.taxRate) || 0,
          notes: it.notes || undefined,
        })),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialFromRequest ? `Create PO from PR (${initialFromRequest.request_number})` : 'New Purchase Order (PO)'}
              </h3>
              <p className="text-xs text-slate-500">Commercial purchasing contract with vendor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-rose-500" />
              {error}
            </div>
          )}

          {/* Supplier & Destination Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vendor / Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.supplier_name} ({s.supplier_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PO Order Date
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Delivery Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800"
              >
                <option value="Immediate">Immediate / Advance</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="Against GRN">Against Inward GRN</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Freight / Shipping (₹)
              </label>
              <input
                type="number"
                min="0"
                value={shippingAmount}
                onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold"
              />
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Order Items ({items.length})
              </h4>
              <button
                type="button"
                onClick={addItemRow}
                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item Line
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 w-4/12">Item / SKU</th>
                    <th className="px-3 py-2 w-2/12 text-right">Qty</th>
                    <th className="px-3 py-2 w-2/12 text-right">Rate (₹)</th>
                    <th className="px-3 py-2 w-1.5/12 text-right">GST %</th>
                    <th className="px-3 py-2 w-2/12 text-right">Total (₹)</th>
                    <th className="px-3 py-2 w-0.5/12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => {
                    const gross = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                    const net = gross * (1 - (Number(it.discountPercent) || 0) / 100);
                    const total = net * (1 + (Number(it.taxRate) || 0) / 100);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2">
                          <select
                            value={it.skuId}
                            onChange={(e) => handleSkuChange(idx, e.target.value)}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-800"
                          >
                            {availableSkus.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.sku_code} — {s.product_name || s.variant_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 0)}
                            className="w-18 text-xs p-1.5 text-right bg-white border border-slate-200 rounded-md font-bold text-slate-800"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-20 text-xs p-1.5 text-right bg-white border border-slate-200 rounded-md font-medium text-slate-800"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <select
                            value={it.taxRate}
                            onChange={(e) => handleItemChange(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-16 text-xs p-1.5 bg-white border border-slate-200 rounded-md text-slate-800 font-medium"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(total)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            disabled={items.length <= 1}
                            onClick={() => removeItemRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Notes / Special Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for the vendor..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Commercial Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Delivery SLA, payment terms, warranties..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
          </div>
        </form>

        {/* Footer with financial summary */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs space-y-0.5">
            <div className="text-slate-500">
              Net Subtotal: <span className="font-semibold text-slate-700">{formatCurrency(calculateSubtotal())}</span> | Tax: <span className="font-semibold text-slate-700">{formatCurrency(calculateTax())}</span>
            </div>
            <div className="text-sm font-bold text-slate-900">
              Grand Total: <span className="text-indigo-700">{formatCurrency(calculateGrandTotal())}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating PO...' : 'Create Purchase Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
