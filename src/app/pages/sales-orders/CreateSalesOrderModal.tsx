// src/app/pages/sales-orders/CreateSalesOrderModal.tsx
// Comprehensive Commercial Sales Order Booking & Real-Time Pricing / Credit Modal (Phase 18)

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Building2,
  Store,
  Warehouse as WarehouseIcon,
  DollarSign,
  ShieldAlert,
  Calculator,
  Loader2,
  Info,
} from 'lucide-react';
import { salesOrderApi } from '../../../services/salesOrderApi.ts';
import type {
  CustomerType,
  OrderType,
  PricingResolutionItemInput,
  PricingCalculationSummary,
  CreditEvaluationResult,
} from '../../../types/sales-orders.ts';

interface CreateSalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

interface SkuOption {
  id: string;
  sku: string;
  variant_name: string;
  product_name: string;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  uom: string;
}

interface CustomerOption {
  id: string;
  name: string;
  code?: string;
  state?: string;
  credit_limit?: number;
  credit_hold?: boolean;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  state: string;
}

export const CreateSalesOrderModal: React.FC<CreateSalesOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [orderType, setOrderType] = useState<OrderType>('standard');
  const [customerType, setCustomerType] = useState<CustomerType>('distributor');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerReference, setCustomerReference] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState<string>('');
  const [orderDiscountPct, setOrderDiscountPct] = useState<number>(0);
  const [orderDiscountAmount, setOrderDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');

  // Dropdown options
  const [distributors, setDistributors] = useState<CustomerOption[]>([]);
  const [retailers, setRetailers] = useState<CustomerOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState<boolean>(true);

  // Line items state
  const [items, setItems] = useState<PricingResolutionItemInput[]>([
    { sku_id: '', quantity: 10, discount_pct: 0 },
  ]);

  // Real-time calculation previews
  const [pricingSummary, setPricingSummary] = useState<PricingCalculationSummary | null>(null);
  const [creditResult, setCreditResult] = useState<CreditEvaluationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load Initial Reference Data
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadMasterData() {
      setIsLoadingDropdowns(true);
      setError(null);
      try {
        // Fetch Warehouses
        const whRes = await fetch('/api/warehouses?limit=100', {
          headers: { 'x-organization-id': 'org-jyotsvan-corp' },
        });
        const whData = await whRes.json();
        if (isMounted && whData.data) {
          const whList = whData.data.map((w: any) => ({
            id: w.id,
            name: w.name,
            code: w.code,
            state: w.state,
          }));
          setWarehouses(whList);
          if (whList.length > 0 && !warehouseId) setWarehouseId(whList[0].id);
        }

        // Fetch Distributors
        const distRes = await fetch('/api/distributors?limit=200', {
          headers: { 'x-organization-id': 'org-jyotsvan-corp' },
        });
        const distData = await distRes.json();
        if (isMounted && distData.data) {
          setDistributors(
            distData.data.map((d: any) => ({
              id: d.id,
              name: d.display_name || d.legal_name,
              code: d.distributor_code,
              state: d.state,
              credit_limit: parseFloat(d.credit_limit || '0'),
              credit_hold: Boolean(d.credit_hold),
            }))
          );
        }

        // Fetch Retailers
        const retRes = await fetch('/api/retailers?limit=200', {
          headers: { 'x-organization-id': 'org-jyotsvan-corp' },
        });
        const retData = await retRes.json();
        if (isMounted && retData.data) {
          setRetailers(
            retData.data.map((r: any) => ({
              id: r.id,
              name: r.store_name || r.owner_name,
              code: r.retailer_code,
              state: r.state,
              credit_limit: parseFloat(r.credit_limit || '0'),
              credit_hold: Boolean(r.credit_hold),
            }))
          );
        }

        // Fetch SKUs
        const skuRes = await fetch('/api/skus?limit=200', {
          headers: { 'x-organization-id': 'org-jyotsvan-corp' },
        });
        const skuData = await skuRes.json();
        if (isMounted && skuData.data) {
          setSkus(
            skuData.data.map((s: any) => ({
              id: s.id,
              sku: s.sku,
              variant_name: s.variant_name || '',
              product_name: s.product_name || s.name || s.sku,
              cost_price: parseFloat(s.cost_price || '0'),
              selling_price: parseFloat(s.selling_price || '0'),
              tax_rate: parseFloat(s.tax_rate || '18'),
              uom: s.uom || s.unit_short_code || 'Unit',
            }))
          );
        }
      } catch (err: any) {
        console.error('Failed to load master dropdown data:', err);
      } finally {
        if (isMounted) setIsLoadingDropdowns(false);
      }
    }

    loadMasterData();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Recalculate Pricing & Credit on Input Changes
  useEffect(() => {
    const validItems = items.filter((it) => it.sku_id && it.quantity > 0);
    if (!warehouseId || validItems.length === 0) {
      setPricingSummary(null);
      setCreditResult(null);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const pricing = await salesOrderApi.calculatePricing({
          customerType,
          customerId: customerId || null,
          warehouseId,
          items: validItems,
          orderDiscountPct,
          orderDiscountAmount,
        });

        if (!isCancelled) {
          setPricingSummary(pricing);

          if (customerId) {
            const credit = await salesOrderApi.evaluateCredit({
              customerType,
              customerId,
              orderAmount: pricing.grand_total,
            });
            if (!isCancelled) setCreditResult(credit);
          } else {
            setCreditResult(null);
          }
        }
      } catch (err: any) {
        console.warn('Real-time pricing calculation error:', err);
      } finally {
        if (!isCancelled) setIsCalculating(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [items, customerType, customerId, warehouseId, orderDiscountPct, orderDiscountAmount]);

  // Add Item Row
  const handleAddItem = () => {
    setItems((prev) => [...prev, { sku_id: '', quantity: 10, discount_pct: 0 }]);
  };

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update Item Row
  const handleUpdateItem = (index: number, updates: Partial<PricingResolutionItemInput>) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  // Handle Form Submit
  const handleSubmit = async (submitStatus: 'draft' | 'submitted') => {
    const validItems = items.filter((it) => it.sku_id && it.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one valid product SKU with quantity greater than 0.');
      return;
    }

    if (!warehouseId) {
      setError('Please select a dispatch warehouse.');
      return;
    }

    if (customerType !== 'direct_customer' && !customerId) {
      setError(`Please select a ${customerType === 'distributor' ? 'Distributor' : 'Retailer'}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await salesOrderApi.createOrder({
        orderType,
        customerType,
        distributorId: customerType === 'distributor' ? customerId : null,
        retailerId: customerType === 'retailer' ? customerId : null,
        customerReference,
        requestedDeliveryDate: requestedDeliveryDate || null,
        warehouseId,
        orderDiscountPct,
        orderDiscountAmount,
        notes,
        internalNotes,
        items: validItems,
        status: submitStatus,
      });

      onSuccess(created.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create sales order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-semibold shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create New Sales Order</h2>
              <p className="text-xs text-slate-500">
                Book commercial orders for distributors, retailers, or direct business clients with automated pricing & tax calculation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <div className="text-xs">{error}</div>
            </div>
          )}

          {/* Section 1: Customer & Fulfillment Facility Selection */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            {/* Customer Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Channel *</label>
              <select
                value={customerType}
                onChange={(e) => {
                  setCustomerType(e.target.value as CustomerType);
                  setCustomerId('');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="distributor">Distributor Network</option>
                <option value="retailer">Direct Retail Merchant</option>
                <option value="direct_customer">Direct B2B Customer</option>
              </select>
            </div>

            {/* Customer Dropdown */}
            {customerType !== 'direct_customer' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {customerType === 'distributor' ? 'Select Authorized Distributor *' : 'Select Retail Merchant *'}
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={isLoadingDropdowns}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
                >
                  <option value="">-- Choose {customerType === 'distributor' ? 'Distributor' : 'Retailer'} --</option>
                  {(customerType === 'distributor' ? distributors : retailers).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''} {c.state ? `• ${c.state}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dispatch Warehouse */}
            <div className={customerType === 'direct_customer' ? 'md:col-span-3' : ''}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fulfillment Warehouse *</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                disabled={isLoadingDropdowns}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
              >
                <option value="">-- Choose Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code}) • {w.state}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Ref / PO # */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer PO / Ref #</label>
              <input
                type="text"
                placeholder="e.g. PO-2026-8941"
                value={customerReference}
                onChange={(e) => setCustomerReference(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Requested Delivery Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Delivery Date</label>
              <input
                type="date"
                value={requestedDeliveryDate}
                onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Order Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Order Classification</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="standard">Standard Commercial Order</option>
                <option value="urgent">Urgent / Priority Rush</option>
                <option value="sample">Sample / Trial Allocation</option>
                <option value="promotional">Promotional Scheme</option>
                <option value="replacement">Warranty / Replacement</option>
              </select>
            </div>
          </div>

          {/* Credit Exposure Live Assessment Banner */}
          {creditResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs ${
                creditResult.status === 'on_hold'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : creditResult.status === 'exceeds_limit'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {creditResult.status === 'on_hold' ? (
                <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              ) : creditResult.status === 'exceeds_limit' ? (
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="font-semibold flex items-center justify-between">
                  <span>Customer Credit Check: {creditResult.customer_name}</span>
                  <span className="uppercase tracking-wider font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/80 border border-current">
                    Status: {creditResult.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="opacity-75">Approved Limit:</span>{' '}
                    <span className="font-medium">₹{creditResult.credit_limit.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="opacity-75">Open Outstanding:</span>{' '}
                    <span className="font-medium">₹{creditResult.current_outstanding.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="opacity-75">Order Total:</span>{' '}
                    <span className="font-bold">₹{creditResult.order_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="opacity-75">Projected Exposure:</span>{' '}
                    <span
                      className={`font-bold ${
                        creditResult.projected_exposure > creditResult.credit_limit && creditResult.credit_limit > 0
                          ? 'text-rose-600'
                          : ''
                      }`}
                    >
                      ₹{creditResult.projected_exposure.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                {creditResult.warning_message && (
                  <p className="text-[11px] font-semibold text-rose-700 pt-0.5">
                    {creditResult.warning_message} (Requires Manager Override on Approval)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section 2: Order Line Items Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Order Line Items ({items.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors border border-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add SKU Item</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Product / SKU Variant</th>
                    <th className="py-2.5 px-3 w-28">Quantity</th>
                    <th className="py-2.5 px-3 w-32">Unit Price (₹)</th>
                    <th className="py-2.5 px-3 w-24">Disc %</th>
                    <th className="py-2.5 px-3 w-32 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Tax (GST)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Net Amount</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, idx) => {
                    const skuObj = skus.find((s) => s.id === item.sku_id);
                    const calcItem = pricingSummary?.items[idx];

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.sku_id}
                            onChange={(e) => handleUpdateItem(idx, { sku_id: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:ring-1 focus:ring-emerald-500 font-medium"
                          >
                            <option value="">-- Choose Product SKU --</option>
                            {skus.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.product_name} ({s.sku}) {s.variant_name ? `• ${s.variant_name}` : ''} [MRP ₹{s.selling_price}]
                              </option>
                            ))}
                          </select>
                          {calcItem?.price_source && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Pricing Source:{' '}
                              <span className="font-medium text-emerald-700 capitalize">
                                {calcItem.price_source.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, { quantity: Math.max(1, parseFloat(e.target.value) || 0) })}
                              className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-[11px] text-slate-500 font-medium">{skuObj?.uom || 'Unit'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.01"
                            placeholder={calcItem?.standard_price ? `₹${calcItem.standard_price}` : 'Auto'}
                            value={item.custom_unit_price !== undefined ? item.custom_unit_price : ''}
                            onChange={(e) =>
                              handleUpdateItem(idx, {
                                custom_unit_price: e.target.value ? parseFloat(e.target.value) : undefined,
                              })
                            }
                            className="w-24 px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={item.discount_pct !== undefined ? item.discount_pct : 0}
                            onChange={(e) => handleUpdateItem(idx, { discount_pct: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
                            className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {calcItem ? `₹${calcItem.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {calcItem ? (
                            <div>
                              <div className="font-semibold text-slate-800">
                                ₹{calcItem.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] text-slate-400">@{calcItem.tax_rate}%</div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {calcItem ? `₹${calcItem.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Order Discounts & Notes + Real-time Commercial Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left: Notes & Discounts */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Order Level Adjustments & Instructions
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Additional Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={orderDiscountPct}
                      onChange={(e) => {
                        setOrderDiscountPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)));
                        setOrderDiscountAmount(0);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Flat Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={orderDiscountAmount}
                      onChange={(e) => {
                        setOrderDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0));
                        setOrderDiscountPct(0);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Customer / Shipping Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Delivery instructions, gate timings, or dispatch preferences..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Internal ERP Remarks</label>
                  <input
                    type="text"
                    placeholder="Internal audit remarks (not visible to customer)..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Right: Live Commercial Breakdown Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-emerald-950 text-white space-y-3 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                      Live Financial Summary
                    </h4>
                  </div>
                  {isCalculating && (
                    <span className="flex items-center space-x-1 text-[11px] text-emerald-300">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Computing taxes...</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-3 text-xs">
                  <div className="flex justify-between text-emerald-200/90">
                    <span>Gross Subtotal:</span>
                    <span className="font-mono font-medium">
                      ₹{pricingSummary ? pricingSummary.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-200/90">
                    <span>Item & Scheme Discounts:</span>
                    <span className="font-mono font-medium text-amber-300">
                      -₹{pricingSummary ? pricingSummary.item_discount_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </span>
                  </div>

                  {pricingSummary && pricingSummary.order_discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-200/90">
                      <span>Order Level Discount:</span>
                      <span className="font-mono font-medium text-amber-300">
                        -₹{pricingSummary.order_discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-emerald-100 font-semibold border-t border-emerald-800/60 pt-2">
                    <span>Taxable Value:</span>
                    <span className="font-mono">
                      ₹{pricingSummary ? pricingSummary.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </span>
                  </div>

                  {pricingSummary?.is_interstate ? (
                    <div className="flex justify-between text-emerald-200/90">
                      <span>Inter-State IGST:</span>
                      <span className="font-mono font-medium">
                        ₹{pricingSummary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-emerald-200/90">
                        <span>Central GST (CGST):</span>
                        <span className="font-mono font-medium">
                          ₹{pricingSummary ? pricingSummary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-200/90">
                        <span>State GST (SGST):</span>
                        <span className="font-mono font-medium">
                          ₹{pricingSummary ? pricingSummary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </span>
                      </div>
                    </>
                  )}

                  {pricingSummary && pricingSummary.rounding_adjustment !== 0 && (
                    <div className="flex justify-between text-emerald-300/80 text-[11px]">
                      <span>Rounding Adjustment:</span>
                      <span className="font-mono">
                        {pricingSummary.rounding_adjustment > 0 ? '+' : ''}₹
                        {pricingSummary.rounding_adjustment.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grand Total */}
              <div className="border-t border-emerald-800 pt-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-emerald-300 uppercase tracking-widest font-semibold">
                    Net Payable Total (INR)
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    ₹{pricingSummary ? pricingSummary.grand_total.toLocaleString('en-IN') : '0'}
                  </div>
                </div>
                <div className="text-right text-[10px] text-emerald-300/80 font-mono">
                  {pricingSummary?.is_interstate ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST+SGST)'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('submitted')}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Sales Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
