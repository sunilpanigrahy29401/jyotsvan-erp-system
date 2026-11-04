// src/app/pages/finance/CreateInvoiceModal.tsx
// Commercial GST Tax Invoice Creation & Subledger Integration Interface (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Plus,
  Trash2,
  Building,
  Truck,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Calculator,
  User,
  Store,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import { distributorApi } from '../../../services/distributorApi.ts';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { CustomerType, Invoice } from '../../../types/finance.ts';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: (invoice: Invoice) => void;
  initialSalesOrder?: any;
}

interface LineItemInput {
  id: string;
  productId: string;
  skuId: string;
  productName: string;
  skuCode: string;
  variantName: string;
  hsnCode: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
  initialSalesOrder,
}) => {
  const [customerType, setCustomerType] = useState<CustomerType>('distributor');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerCode, setCustomerCode] = useState<string>('');
  const [customerGstin, setCustomerGstin] = useState<string>('');
  const [customerPan, setCustomerPan] = useState<string>('');
  const [billingAddress, setBillingAddress] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<string>('');

  const [distributors, setDistributors] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);

  // Logistics & Terms
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [isInterstate, setIsInterstate] = useState<boolean>(false);
  const [transporterName, setTransporterName] = useState<string>('V-Trans Express');
  const [vehicleNumber, setVehicleNumber] = useState<string>('GJ-01-BX-8899');
  const [lrNumber, setLrNumber] = useState<string>('LR-99201-A');
  const [eWayBillNumber, setEWayBillNumber] = useState<string>('241088291039');
  const [notes, setNotes] = useState<string>('');
  const [autoPost, setAutoPost] = useState<boolean>(true);

  // Line items
  const [items, setItems] = useState<LineItemInput[]>([
    {
      id: '1',
      productId: 'prod_herbal_face_wash',
      skuId: 'sku_hfw_100ml',
      productName: 'Kumkumadi Radiance Face Wash',
      skuCode: 'KUM-FW-100',
      variantName: '100ml Pump',
      hsnCode: '330499',
      quantity: 50,
      uom: 'Unit',
      unitPrice: 280,
      discountPct: 5,
      taxRate: 18,
    },
    {
      id: '2',
      productId: 'prod_kesh_oil',
      skuId: 'sku_kesh_oil_200ml',
      productName: 'Bhringraj & Amla Hair Vitalizer',
      skuCode: 'BHR-OIL-200',
      variantName: '200ml Flip Cap',
      hsnCode: '330590',
      quantity: 30,
      uom: 'Unit',
      unitPrice: 420,
      discountPct: 5,
      taxRate: 18,
    },
  ]);

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadCustomers() {
      setLoading(true);
      try {
        const [distRes, retRes] = await Promise.all([
          distributorApi.listDistributors({ limit: 100 }),
          retailerApi.listRetailers({ limit: 100 }),
        ]);
        setDistributors(distRes.data || []);
        setRetailers(retRes.data || []);

        // Initial default distributor if none selected
        if (distRes.data && distRes.data.length > 0 && !customerId) {
          const first = distRes.data[0];
          setCustomerId(first.id);
          setCustomerName(first.display_name || first.legal_name);
          setCustomerCode(first.distributor_code || '');
          setCustomerGstin(first.gstin || '');
          setCustomerPan(first.pan || '');
          setBillingAddress(`${first.city || ''}, ${first.state || ''}`);
        }
      } catch (err: any) {
        console.error('Failed to load customers for invoice:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCustomers();
  }, [isOpen]);

  useEffect(() => {
    // Recalculate due date based on invoiceDate + paymentTermsDays
    if (invoiceDate) {
      const invD = new Date(invoiceDate);
      const dueD = new Date(invD.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);
      setDueDate(dueD.toISOString().split('T')[0]);
    }
  }, [invoiceDate, paymentTermsDays]);

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    if (customerType === 'distributor') {
      const dist = distributors.find((d) => d.id === id);
      if (dist) {
        setCustomerName(dist.display_name || dist.legal_name);
        setCustomerCode(dist.distributor_code || '');
        setCustomerGstin(dist.gstin || '');
        setCustomerPan(dist.pan || '');
        setBillingAddress(`${dist.city || ''}, ${dist.state || ''}`);
        setShippingAddress(`${dist.city || ''}, ${dist.state || ''}`);
        setIsInterstate(dist.state ? !dist.state.toLowerCase().includes('gujarat') : false);
      }
    } else if (customerType === 'retailer') {
      const ret = retailers.find((r) => r.id === id);
      if (ret) {
        setCustomerName(ret.store_name);
        setCustomerCode(ret.retailer_code || '');
        setCustomerGstin(ret.gstin || '');
        setCustomerPan(ret.pan || '');
        setBillingAddress(`${ret.city || ''}, ${ret.state || ''}`);
        setShippingAddress(`${ret.city || ''}, ${ret.state || ''}`);
        setIsInterstate(ret.state ? !ret.state.toLowerCase().includes('gujarat') : false);
      }
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(2, 9),
        productId: 'prod_custom',
        skuId: 'sku_custom',
        productName: 'Ayurvedic Skin Clarifying Cream',
        skuCode: 'AYU-SCC-50',
        variantName: '50g Jar',
        hsnCode: '330499',
        quantity: 10,
        uom: 'Unit',
        unitPrice: 350,
        discountPct: 0,
        taxRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((it) => it.id !== id));
  };

  const handleItemChange = (id: string, field: keyof LineItemInput, value: any) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: value };
        }
        return it;
      })
    );
  };

  // Calculations
  let subtotal = 0;
  let discountTotal = 0;
  let taxableTotal = 0;
  let taxTotal = 0;

  items.forEach((it) => {
    const gross = (it.quantity || 0) * (it.unitPrice || 0);
    const disc = (gross * (it.discountPct || 0)) / 100;
    const taxable = gross - disc;
    const tax = (taxable * (it.taxRate || 0)) / 100;
    subtotal += gross;
    discountTotal += disc;
    taxableTotal += taxable;
    taxTotal += tax;
  });

  const grandTotal = Math.round((taxableTotal + taxTotal) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMessage('Please select or specify a customer name.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('At least one line item is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const created = await financeApi.createInvoice({
        customerType,
        customerId: customerId || undefined,
        customerName,
        customerCode: customerCode || undefined,
        customerGstin: customerGstin || undefined,
        customerPan: customerPan || undefined,
        billingAddress: { line1: billingAddress },
        shippingAddress: { line1: shippingAddress },
        paymentTermsDays,
        invoiceDate,
        dueDate,
        isInterstate,
        transporterName,
        vehicleNumber,
        lrNumber,
        eWayBillNumber,
        notes,
        autoPost,
        items: items.map((it) => ({
          productId: it.productId,
          skuId: it.skuId,
          productName: it.productName,
          skuCode: it.skuCode,
          variantName: it.variantName,
          hsnCode: it.hsnCode,
          quantity: Number(it.quantity),
          uom: it.uom,
          unitPrice: Number(it.unitPrice),
          discountPct: Number(it.discountPct),
          taxRate: Number(it.taxRate),
        })),
      });

      onInvoiceCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate tax invoice');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create New GST Tax Invoice</h2>
              <p className="text-xs text-slate-500">
                Generate compliant e-invoice and commit receivable to subledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-700">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Customer Selection Section */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              Customer & Commercial Recipient
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Channel Type</label>
                <select
                  value={customerType}
                  onChange={(e) => {
                    const ct = e.target.value as CustomerType;
                    setCustomerType(ct);
                    setCustomerId('');
                    setCustomerName('');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="distributor">Authorized Distributor</option>
                  <option value="retailer">Retail Store / Merchant</option>
                  <option value="direct_customer">Direct Institutional Buyer</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Select Customer Account</label>
                {customerType === 'distributor' ? (
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Distributor --</option>
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.display_name || d.legal_name} ({d.distributor_code}) - {d.state}
                      </option>
                    ))}
                  </select>
                ) : customerType === 'retailer' ? (
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Retailer Store --</option>
                    {retailers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.store_name} ({r.retailer_code}) - {r.state}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter institutional buyer / direct customer name"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Customer GSTIN</label>
                <input
                  type="text"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value)}
                  placeholder="e.g. 24AABCS1429B1Z8"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Customer PAN</label>
                <input
                  type="text"
                  value={customerPan}
                  onChange={(e) => setCustomerPan(e.target.value)}
                  placeholder="e.g. AABCS1429B"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Billing Location / State</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="City, State"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Place of Supply</label>
                <label className="inline-flex items-center gap-2 mt-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInterstate}
                    onChange={(e) => setIsInterstate(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-800">Inter-state (IGST)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Dates & Logistics */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Credit Terms (Days)</label>
              <select
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              >
                <option value={0}>0 Days (Immediate Advance)</option>
                <option value={15}>15 Days</option>
                <option value={30}>30 Days (Standard)</option>
                <option value={45}>45 Days</option>
                <option value={60}>60 Days</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Transporter Name</label>
              <input
                type="text"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Line Items Matrix */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-slate-500" />
                Line Items & Tax Calculations
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product / SKU Snapshot</th>
                    <th className="py-2.5 px-2 w-20">HSN</th>
                    <th className="py-2.5 px-2 text-right w-20">Qty</th>
                    <th className="py-2.5 px-2 text-right w-24">Rate (₹)</th>
                    <th className="py-2.5 px-2 text-right w-20">Disc %</th>
                    <th className="py-2.5 px-2 text-right w-20">Tax %</th>
                    <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                    <th className="py-2.5 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => {
                    const gross = item.quantity * item.unitPrice;
                    const disc = (gross * item.discountPct) / 100;
                    const tax = ((gross - disc) * item.taxRate) / 100;
                    const lineTot = gross - disc + tax;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                            className="w-full font-medium text-slate-900 border border-slate-200 rounded px-2 py-1 text-xs"
                          />
                          <input
                            type="text"
                            value={item.skuCode}
                            onChange={(e) => handleItemChange(item.id, 'skuCode', e.target.value)}
                            placeholder="SKU Code"
                            className="w-full text-[11px] text-slate-500 border border-slate-200 rounded px-2 py-0.5 mt-1 font-mono"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.hsnCode}
                            onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                            className="w-full text-right border border-slate-200 rounded px-2 py-1 text-xs font-medium"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                            className="w-full text-right border border-slate-200 rounded px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPct}
                            onChange={(e) => handleItemChange(item.id, 'discountPct', Number(e.target.value))}
                            className="w-full text-right border border-slate-200 rounded px-2 py-1 text-xs text-slate-600"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <select
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(item.id, 'taxRate', Number(e.target.value))}
                            className="w-full text-right border border-slate-200 rounded px-1.5 py-1 text-xs bg-white"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          ₹{lineTot.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Row */}
            <div className="flex justify-end pt-2">
              <div className="w-72 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount Total:</span>
                    <span>-₹{discountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700 font-medium">
                  <span>Taxable Total:</span>
                  <span>₹{taxableTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{isInterstate ? 'IGST Total:' : 'CGST + SGST Total:'}</span>
                  <span>₹{taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-300 text-sm">
                  <span>Grand Total:</span>
                  <span className="text-indigo-900">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Posting Toggle */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600 text-white rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-indigo-950 block">Instant Ledger Posting</span>
                <span className="text-slate-600 text-[11px]">
                  Automatically commit this invoice as an open receivable in the customer's financial ledger.
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoPost}
                onChange={(e) => setAutoPost(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Invoice...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                {autoPost ? 'Create & Post Invoice' : 'Save Invoice as Draft'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
