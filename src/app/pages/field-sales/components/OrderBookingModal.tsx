// src/app/pages/field-sales/components/OrderBookingModal.tsx
import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Search,
  Building2,
  Store,
  Tag,
} from 'lucide-react';
import type { FieldSalesVisit, FieldCustomerType } from '../../../../types/field-sales';

interface OrderBookingModalProps {
  isOpen: boolean;
  visit?: FieldSalesVisit | null;
  customerType?: FieldCustomerType;
  customerId?: string;
  customerName?: string;
  onClose: () => void;
  onSuccess: (order: any) => void;
}

interface OrderItemRow {
  skuId: string;
  skuCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discountPct: number;
}

export const OrderBookingModal: React.FC<OrderBookingModalProps> = ({
  isOpen,
  visit,
  customerType: propCustomerType,
  customerId: propCustomerId,
  customerName: propCustomerName,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available SKUs from backend
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [notes, setNotes] = useState('');

  const targetCustomerType = visit?.customer_type || propCustomerType || 'retailer';
  const targetCustomerId = visit?.customer_id || propCustomerId || '';
  const targetCustomerName = visit?.customer_name || propCustomerName || 'Selected Customer';

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setItems([]);
      setNotes('');
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?pageSize=50', {
        headers: { 'x-organization-id': 'org-jyotsvan-corp' },
      });
      const json = await res.json();
      if (json.products && Array.isArray(json.products)) {
        setAvailableProducts(json.products);
      }
    } catch (err) {
      console.warn('Failed to load catalog products', err);
    }
  };

  if (!isOpen) return null;

  const addItem = (product: any) => {
    // Default SKU ID
    const skuId = product.skus?.[0]?.id || `sku-${product.id}`;
    const skuCode = product.skus?.[0]?.sku || product.product_code || 'SKU';
    const unitPrice = parseFloat(product.base_price || product.mrp || '500');

    // Check if item already exists
    const existingIndex = items.findIndex((i) => i.skuId === skuId);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          skuId,
          skuCode,
          productName: product.name,
          unitPrice,
          quantity: 1,
          discountPct: 0,
        },
      ]);
    }
  };

  const updateItem = (index: number, field: keyof OrderItemRow, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice * (1 - item.discountPct / 100);
    return sum + itemTotal;
  }, 0);
  const taxAmount = subtotal * 0.18; // 18% GST standard for agri products
  const grandTotal = subtotal + taxAmount;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Please add at least one product SKU to the order.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = visit
        ? `/api/field-sales/visits/${visit.id}/order`
        : `/api/sales-orders`;

      const bodyData = visit
        ? {
            customerType: targetCustomerType,
            customerId: targetCustomerId,
            items: items.map((i) => ({
              skuId: i.skuId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPct: i.discountPct,
            })),
            notes: notes.trim() || undefined,
          }
        : {
            organizationId: 'org-jyotsvan-corp',
            customerType: targetCustomerType,
            orderType: targetCustomerType === 'distributor' ? 'distributor_primary' : 'retailer_direct',
            distributorId: targetCustomerType === 'distributor' ? targetCustomerId : null,
            retailerId: targetCustomerType === 'retailer' ? targetCustomerId : null,
            items: items.map((i) => ({
              skuId: i.skuId,
              quantity: i.quantity,
              customPrice: i.unitPrice,
              discountPct: i.discountPct,
            })),
            notes: notes.trim() || undefined,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': 'org-jyotsvan-corp',
          'x-user-id': visit?.salesperson_id || 'usr-fieldsales',
        },
        body: JSON.stringify(bodyData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create sales order.');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter products for quick-add list
  const filteredProducts = availableProducts.filter((p) => {
    if (!skuSearch) return true;
    return (
      p.name?.toLowerCase().includes(skuSearch.toLowerCase()) ||
      p.product_code?.toLowerCase().includes(skuSearch.toLowerCase())
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Book Field Sales Order</h3>
              <p className="text-xs text-slate-500">Capture direct order booking on-site</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Bar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                targetCustomerType === 'distributor'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {targetCustomerType === 'distributor' ? (
                <Building2 className="w-4 h-4" />
              ) : (
                <Store className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 block truncate">
                {targetCustomerName}
              </span>
              <span className="text-[11px] text-slate-500 capitalize">
                {targetCustomerType} Order Booking
              </span>
            </div>
          </div>

          {/* SKU Search & Catalog Adder */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                placeholder="Search products to add..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
              />
            </div>

            <div className="max-h-32 overflow-y-auto divide-y divide-slate-100 bg-white border border-slate-200 rounded-lg">
              {filteredProducts.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="p-2 flex items-center justify-between text-xs hover:bg-slate-50 transition"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-slate-900 block truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {p.product_code} • {formatCurrency(parseFloat(p.base_price || '500'))}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(p)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold shrink-0"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Order Items Table */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Order Items ({items.length})
            </label>
            {items.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
                No items added yet. Search products above to add items.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const lineTotal =
                    item.quantity * item.unitPrice * (1 - item.discountPct / 100);
                  return (
                    <div key={idx} className="p-3 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 truncate max-w-[200px]">
                          {item.productName}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-500 block">Rate</label>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-full text-xs p-1.5 border border-slate-300 rounded font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)
                            }
                            className="w-full text-xs p-1.5 border border-slate-300 rounded font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block">Line Total</label>
                          <span className="font-bold text-slate-900 block p-1.5 text-xs text-right">
                            {formatCurrency(lineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          {items.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (18%):</span>
                <span className="font-mono">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-emerald-700 font-mono">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Order Dispatch / Indent Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., Require delivery before Friday; standard discount applied"
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition inline-flex items-center gap-2 active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Booking Order...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Order ({formatCurrency(grandTotal)})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
