// src/app/pages/sales-orders/InvoiceHandoffModal.tsx
// Commercial Tax Invoice Preparation & Phase 19 Finance Handoff Interface (Phase 18)

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Printer,
  Copy,
  Check,
  Building,
  Truck,
  DollarSign,
  Layers,
  Code,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { salesOrderApi } from '../../../services/salesOrderApi.ts';
import type { InvoiceHandoffData } from '../../../types/sales-orders.ts';

interface InvoiceHandoffModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceHandoffModal: React.FC<InvoiceHandoffModalProps> = ({
  orderId,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'invoice' | 'json'>('invoice');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [payload, setPayload] = useState<InvoiceHandoffData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadPayload() {
      setLoading(true);
      setError(null);
      try {
        const data = await salesOrderApi.getInvoicePayload(orderId);
        if (isMounted) setPayload(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to generate invoice handoff payload');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPayload();
    return () => {
      isMounted = false;
    };
  }, [isOpen, orderId]);

  const handleCopyJson = () => {
    if (!payload) return;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-semibold shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">Commercial Tax Invoice / Finance Handoff</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Phase 19 Ready
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Statutory commercial billing breakdown ready for ERP finance ledger posting and E-Invoicing.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab switch */}
            <div className="flex p-1 bg-slate-200 rounded-lg text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab('invoice')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'invoice' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center space-x-1 ${
                  activeTab === 'json' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>JSON Payload</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-emerald-600" />
              <p>Preparing commercial GST invoice snapshot...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          ) : payload ? (
            activeTab === 'invoice' ? (
              <div className="bg-white border border-slate-300 rounded-xl p-6 space-y-6 shadow-xs font-sans text-slate-800">
                {/* Invoice Header Top */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <div className="text-xl font-black text-slate-900 tracking-tight">JYOTSVAN ENTERPRISE LTD.</div>
                    <div className="text-[11px] text-slate-500">Manufactured Goods, Ayurvedic & FMCG Distribution</div>
                    <div className="text-[11px] text-slate-600 mt-1 font-mono">
                      GSTIN: <span className="font-semibold">29AAAAA0000A1Z5</span> • State: Karnataka (29)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-800 uppercase tracking-wider">PROFORMA / TAX INVOICE</div>
                    <div className="text-sm font-bold font-mono text-slate-900">{payload.order_number}</div>
                    <div className="text-[11px] text-slate-500">
                      Date: {new Date(payload.order_date).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Bill To & Dispatch From */}
                <div className="grid grid-cols-2 gap-6 bg-slate-50/70 p-4 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px] text-emerald-800 mb-1">
                      Billed / Consignee Customer
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{payload.customer_name}</div>
                    {payload.customer_code && (
                      <div className="text-slate-500 font-mono text-[11px]">Code: {payload.customer_code}</div>
                    )}
                    <div className="text-slate-600 font-mono text-[11px]">
                      GSTIN/PAN: {payload.customer_gstin || 'Unregistered / Direct Consumer'}
                    </div>
                    <div className="text-slate-500 mt-1">Channel: {payload.customer_type.toUpperCase()}</div>
                  </div>

                  <div>
                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px] text-emerald-800 mb-1">
                      Dispatching Depot / Facility
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{payload.warehouse_name}</div>
                    <div className="text-slate-500">Status: {payload.fulfillment_status.toUpperCase()}</div>
                    {payload.dispatches && payload.dispatches.length > 0 && (
                      <div className="mt-2 text-[11px] space-y-0.5 font-mono text-slate-700">
                        <div>DSP Ref: {payload.dispatches[0].dispatch_number}</div>
                        {payload.dispatches[0].transporter_name && (
                          <div>Carrier: {payload.dispatches[0].transporter_name}</div>
                        )}
                        {payload.dispatches[0].vehicle_number && (
                          <div>Vehicle: {payload.dispatches[0].vehicle_number}</div>
                        )}
                        {payload.dispatches[0].e_way_bill_number && (
                          <div className="text-emerald-700 font-bold">
                            E-Way Bill: {payload.dispatches[0].e_way_bill_number}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Matrix */}
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <tr>
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                        <th className="py-2.5 px-3 text-right">GST Rate</th>
                        <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payload.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{item.product_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">SKU: {item.sku_code}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">{item.fulfilled_quantity || item.ordered_quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{item.unit_price.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium">₹{item.taxable_amount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{item.tax_rate}%</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{item.tax_amount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{item.net_amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary Breakdown */}
                <div className="flex justify-end pt-2">
                  <div className="w-80 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (Gross):</span>
                      <span className="font-mono font-medium">₹{payload.subtotal.toFixed(2)}</span>
                    </div>
                    {payload.discount_total > 0 && (
                      <div className="flex justify-between text-amber-700">
                        <span>Total Discounts:</span>
                        <span className="font-mono font-medium">-₹{payload.discount_total.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-200 pt-1.5">
                      <span>Taxable Amount:</span>
                      <span className="font-mono">₹{payload.taxable_amount.toFixed(2)}</span>
                    </div>
                    {payload.cgst_total > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>CGST:</span>
                        <span className="font-mono">₹{payload.cgst_total.toFixed(2)}</span>
                      </div>
                    )}
                    {payload.sgst_total > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>SGST:</span>
                        <span className="font-mono">₹{payload.sgst_total.toFixed(2)}</span>
                      </div>
                    )}
                    {payload.igst_total > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST (Inter-State):</span>
                        <span className="font-mono">₹{payload.igst_total.toFixed(2)}</span>
                      </div>
                    )}
                    {payload.rounding_adjustment !== 0 && (
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Rounding Adj:</span>
                        <span className="font-mono">{payload.rounding_adjustment > 0 ? '+' : ''}₹{payload.rounding_adjustment.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2">
                      <span>Grand Total (INR):</span>
                      <span className="font-mono">₹{payload.grand_total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[60vh] border border-slate-800">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            )
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleCopyJson}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Payload!' : 'Copy JSON'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Tax Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
