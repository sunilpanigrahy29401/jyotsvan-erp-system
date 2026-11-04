// src/app/pages/finance/InvoiceDetailModal.tsx
// Professional GST Tax Invoice Viewer, Subledger Posting, PDF Print, & Payment Allocation History

import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  FileText,
  Building,
  CheckCircle2,
  Clock,
  Ban,
  DollarSign,
  Layers,
  Truck,
  ShieldCheck,
  AlertCircle,
  Loader2,
  History,
  CreditCard,
  Send,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import type { Invoice, InvoiceStatus } from '../../../types/finance.ts';

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onInvoiceUpdated?: () => void;
  onRecordPayment?: (invoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoiceId,
  isOpen,
  onClose,
  onInvoiceUpdated,
  onRecordPayment,
}) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'invoice' | 'allocations' | 'history'>('invoice');
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadInvoice = async () => {
    if (!invoiceId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await financeApi.getInvoiceById(invoiceId);
      setInvoice(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadInvoice();
    }
  }, [isOpen, invoiceId]);

  if (!isOpen || !invoiceId) return null;

  const handlePostToLedger = async () => {
    if (!invoice) return;
    if (!window.confirm(`Are you sure you want to post Invoice ${invoice.invoice_number} to the General Ledger? This will commit the receivable.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await financeApi.postInvoice(invoice.id);
      await loadInvoice();
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to post invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      await financeApi.cancelInvoice(invoice.id, cancelReason);
      setCancelModalOpen(false);
      setCancelReason('');
      await loadInvoice();
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Fully Paid
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Partially Paid
          </span>
        );
      case 'posted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Posted (Unpaid)
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Draft
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Overdue
          </span>
        );
      case 'cancelled':
      case 'void':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <Ban className="w-3.5 h-3.5 text-red-600" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {invoice?.invoice_number || 'Tax Invoice'}
                </h2>
                {invoice && getStatusBadge(invoice.status)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {invoice?.customer_name} • Issued {invoice ? new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {invoice && (
              <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium mr-2">
                <button
                  onClick={() => setActiveTab('invoice')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activeTab === 'invoice'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Invoice Document
                </button>
                <button
                  onClick={() => setActiveTab('allocations')}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === 'allocations'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Payments ({invoice.allocations?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Audit Trail
                </button>
              </div>
            )}

            <button
              onClick={() => window.print()}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Print Tax Invoice"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Loading Tax Invoice data...</p>
            </div>
          ) : errorMessage || !invoice ? (
            <div className="py-16 text-center text-red-600">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-semibold">{errorMessage || 'Invoice not found'}</p>
            </div>
          ) : activeTab === 'invoice' ? (
            /* Official GST Tax Invoice Sheet */
            <div className="bg-white border border-slate-300 rounded-xl p-8 shadow-sm print:p-0 print:border-none print:shadow-none text-slate-800">
              {/* Top Meta & Company Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-wider px-2 py-0.5 uppercase bg-indigo-50 text-indigo-800 border border-indigo-200 rounded">
                      TAX INVOICE
                    </span>
                    <span className="text-xs text-slate-500 font-medium">ORIGINAL FOR RECIPIENT</span>
                  </div>
                  <h1 className="text-xl font-bold text-slate-900 mt-2">JYOTSVAN HEALTHCARE PRIVATE LIMITED</h1>
                  <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
                    Plot 45-B, GIDC Electronics Zone, Sector 26, Gandhinagar, Gujarat - 382028
                    <br />
                    GSTIN: <span className="font-semibold text-slate-700">24AAACJ1234F1Z5</span> | PAN: <span className="font-semibold text-slate-700">AAACJ1234F</span> | CIN: U24230GJ2020PTC115000
                    <br />
                    Email: finance@jyotsvan.com | Phone: +91 79 4000 8900
                  </p>
                </div>

                <div className="text-right">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1 inline-block text-left min-w-[220px]">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Invoice No:</span>
                      <span className="font-bold text-slate-900">{invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Invoice Date:</span>
                      <span className="font-medium text-slate-800">
                        {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Payment Due:</span>
                      <span className="font-semibold text-rose-700">
                        {new Date(invoice.due_date).toLocaleDateString('en-IN')} ({invoice.payment_terms_days} Days)
                      </span>
                    </div>
                    {invoice.sales_order_number && (
                      <div className="flex justify-between gap-4 pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Sales Order:</span>
                        <span className="font-medium text-indigo-700">{invoice.sales_order_number}</span>
                      </div>
                    )}
                    {invoice.e_way_bill_number && (
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">E-Way Bill:</span>
                        <span className="font-medium text-slate-800">{invoice.e_way_bill_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Billed To & Shipped To Grid */}
              <div className="grid grid-cols-2 gap-6 pb-6 mb-6 border-b border-slate-200 text-xs">
                <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Billed To (Customer)
                  </span>
                  <p className="text-sm font-bold text-slate-900">{invoice.customer_name}</p>
                  <p className="text-slate-600 mt-1">
                    Code: <span className="font-medium">{invoice.customer_code || 'N/A'}</span> • Type: <span className="capitalize font-medium">{invoice.customer_type}</span>
                  </p>
                  <p className="text-slate-600 mt-1">
                    GSTIN: <span className="font-semibold text-slate-800">{invoice.customer_gstin || 'Unregistered'}</span>
                    {invoice.customer_pan && ` | PAN: ${invoice.customer_pan}`}
                  </p>
                  <p className="text-slate-500 mt-2 leading-relaxed">
                    {invoice.billing_address
                      ? typeof invoice.billing_address === 'string'
                        ? invoice.billing_address
                        : `${invoice.billing_address.line1 || ''} ${invoice.billing_address.city || ''} ${invoice.billing_address.state || ''} ${invoice.billing_address.pincode || ''}`
                      : 'Standard Commercial Registered Address'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Dispatch & Logistics Info
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <span className="text-slate-500">Dispatch Ref:</span>
                      <p className="font-medium text-slate-800">{invoice.dispatch_number || 'Direct Plant Dispatch'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Transporter:</span>
                      <p className="font-medium text-slate-800">{invoice.transporter_name || 'V-Trans Logistics'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Vehicle No:</span>
                      <p className="font-medium text-slate-800">{invoice.vehicle_number || 'GJ-01-BX-8899'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">LR / Docket No:</span>
                      <p className="font-medium text-slate-800">{invoice.lr_number || 'LR-893021-A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">HSN</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Disc %</th>
                      <th className="py-2.5 px-3 text-right">Taxable Val</th>
                      <th className="py-2.5 px-3 text-right">
                        {invoice.is_interstate ? 'IGST' : 'CGST + SGST'}
                      </th>
                      <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 block">
                              {item.product_name_snapshot}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              SKU: {item.sku_code_snapshot} {item.variant_name_snapshot ? `(${item.variant_name_snapshot})` : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{item.hsn_code || '330499'}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                            {item.quantity} {item.uom}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            ₹{item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            {item.discount_pct > 0 ? `${item.discount_pct}%` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                            ₹{item.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {invoice.is_interstate ? (
                              <span>₹{item.igst_amount.toFixed(2)} ({item.igst_rate}%)</span>
                            ) : (
                              <span>
                                ₹{(item.cgst_amount + item.sgst_amount).toFixed(2)} ({item.tax_rate}%)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-4 text-center text-slate-400 italic">
                          No line items attached.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals & Tax Breakdown Grid */}
              <div className="grid grid-cols-12 gap-6 border-t border-slate-200 pt-4 text-xs">
                {/* Bank Account & Payment terms */}
                <div className="col-span-7 bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Bank Remittance Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Bank Name:</span>
                      <span className="font-medium text-slate-800">HDFC Bank Limited</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">A/C Number:</span>
                      <span className="font-medium text-slate-800">50200049281920</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">IFSC Code:</span>
                      <span className="font-medium text-slate-800">HDFC0000123</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Branch / UPI:</span>
                      <span className="font-medium text-slate-800">Gandhinagar • jyotsvan@hdfcbank</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/80 italic">
                    Terms: Interest @ 18% p.a. applicable on delayed settlements beyond agreed credit days. Subject to Gandhinagar jurisdiction.
                  </p>
                </div>

                {/* Mathematical Summary */}
                <div className="col-span-5 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Subtotal:</span>
                    <span>₹{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {invoice.discount_total > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Trade Discount:</span>
                      <span>-₹{invoice.discount_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-700 font-medium">
                    <span>Taxable Amount:</span>
                    <span>₹{invoice.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {!invoice.is_interstate ? (
                    <>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>CGST Total:</span>
                        <span>₹{invoice.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>SGST Total:</span>
                        <span>₹{invoice.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>IGST Total:</span>
                      <span>₹{invoice.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-300">
                    <span>Grand Total:</span>
                    <span className="text-indigo-900">₹{invoice.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Payment Knockoff status */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2 space-y-1">
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Amount Received / Paid:</span>
                      <span>₹{invoice.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-rose-700 font-bold">
                      <span>Balance Outstanding:</span>
                      <span>₹{invoice.amount_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'allocations' ? (
            /* Payment Knock-off Allocations History */
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Payment Allocations & Knock-offs</h3>
                  <p className="text-xs text-slate-500">
                    Record of payments applied to Invoice {invoice.invoice_number}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Paid</span>
                  <span className="text-base font-bold text-emerald-700">
                    ₹{invoice.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / ₹{invoice.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {invoice.allocations && invoice.allocations.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Payment Ref #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4 text-right">Allocated Amount</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.allocations.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-indigo-700">{a.payment_number}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {a.payment_date ? new Date(a.payment_date).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{a.payment_method_name || 'Direct Transfer'}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            ₹{a.allocated_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{a.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium">No payments allocated to this invoice yet.</p>
                  {invoice.status === 'posted' && (
                    <button
                      onClick={() => onRecordPayment && onRecordPayment(invoice)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Record Payment Now
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Audit Trail & Status History */
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Invoice Status Transition History</h3>
              {invoice.history && invoice.history.length > 0 ? (
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {invoice.history.map((h, i) => (
                    <div key={h.id || i} className="relative flex items-start space-x-3 pl-8">
                      <div className="absolute left-2 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white shadow-xs" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 capitalize">
                            Status changed to: {h.new_status}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(h.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {h.reason && <p className="text-xs text-slate-600 mt-0.5">{h.reason}</p>}
                        {h.changed_by_email && (
                          <p className="text-[11px] text-slate-400 mt-0.5">By: {h.changed_by_email}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No transition history logged.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <div className="text-xs text-slate-500">
            {invoice && (
              <span>
                Outstanding Balance: <strong className="text-rose-700">₹{invoice.amount_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {invoice && invoice.status === 'draft' && (
              <button
                onClick={handlePostToLedger}
                disabled={actionLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Post to Ledger
              </button>
            )}

            {invoice && (invoice.status === 'posted' || invoice.status === 'partially_paid') && (
              <button
                onClick={() => onRecordPayment && onRecordPayment(invoice)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" />
                Record Payment
              </button>
            )}

            {invoice && (invoice.status === 'draft' || invoice.status === 'posted') && (
              <button
                onClick={() => setCancelModalOpen(true)}
                disabled={actionLoading}
                className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel / Void
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Cancellation Reason Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              Cancel Invoice {invoice?.invoice_number}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cancelling an invoice reverses any financial subledger entries.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Incorrect rate card applied, customer revised order, dispatch cancelled..."
                className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                rows={3}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Back
              </button>
              <button
                onClick={handleCancelInvoice}
                disabled={actionLoading || !cancelReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
