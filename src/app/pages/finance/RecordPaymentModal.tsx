// src/app/pages/finance/RecordPaymentModal.tsx
// Customer Payment Receipt Recording & Multi-Invoice Knockoff Allocation Interface (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  DollarSign,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ListFilter,
  Wand2,
  Calendar,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import { distributorApi } from '../../../services/distributorApi.ts';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { CustomerType, Invoice, Payment, PaymentMethod } from '../../../types/finance.ts';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: (payment: Payment) => void;
  initialInvoice?: Invoice | null;
}

interface AllocationDraft {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  grandTotal: number;
  outstanding: number;
  allocatedAmount: number;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentRecorded,
  initialInvoice,
}) => {
  const [customerType, setCustomerType] = useState<CustomerType>('distributor');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerCode, setCustomerCode] = useState<string>('');

  const [distributors, setDistributors] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Payment form fields
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethodCode, setPaymentMethodCode] = useState<string>('bank_transfer');
  const [paymentMethodName, setPaymentMethodName] = useState<string>('Bank Transfer (NEFT/RTGS)');
  const [referenceNumber, setReferenceNumber] = useState<string>('UTR' + Math.floor(10000000 + Math.random() * 90000000));
  const [bankName, setBankName] = useState<string>('HDFC Bank');
  const [bankAccountLast4, setBankAccountLast4] = useState<string>('1920');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Open invoices for allocation
  const [openInvoices, setOpenInvoices] = useState<AllocationDraft[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadMasterData() {
      try {
        const [distRes, retRes, methods] = await Promise.all([
          distributorApi.listDistributors({ limit: 100 }),
          retailerApi.listRetailers({ limit: 100 }),
          financeApi.getPaymentMethods(),
        ]);
        setDistributors(distRes.data || []);
        setRetailers(retRes.data || []);
        setPaymentMethods(methods || []);

        if (initialInvoice) {
          setCustomerType(initialInvoice.customer_type);
          setCustomerId(initialInvoice.customer_id || '');
          setCustomerName(initialInvoice.customer_name);
          setCustomerCode(initialInvoice.customer_code || '');
          setAmount(initialInvoice.amount_outstanding);
        } else if (distRes.data && distRes.data.length > 0 && !customerId) {
          const first = distRes.data[0];
          setCustomerId(first.id);
          setCustomerName(first.display_name || first.legal_name);
          setCustomerCode(first.distributor_code || '');
        }
      } catch (err) {
        console.error('Failed to load payment masters:', err);
      }
    }

    loadMasterData();
  }, [isOpen, initialInvoice]);

  // Load customer open invoices whenever customer changes
  useEffect(() => {
    if (!isOpen || !customerId) return;

    async function loadCustomerInvoices() {
      setLoadingInvoices(true);
      try {
        const invs = await financeApi.getInvoices({
          customerId,
          customerType,
          limit: 100,
        });

        const openList: AllocationDraft[] = invs
          .filter((inv) => inv.amount_outstanding > 0.01 && (inv.status === 'posted' || inv.status === 'partially_paid' || inv.status === 'overdue'))
          .map((inv) => ({
            invoiceId: inv.id,
            invoiceNumber: inv.invoice_number,
            invoiceDate: inv.invoice_date,
            dueDate: inv.due_date,
            grandTotal: inv.grand_total,
            outstanding: inv.amount_outstanding,
            allocatedAmount: initialInvoice && initialInvoice.id === inv.id ? inv.amount_outstanding : 0,
          }));

        setOpenInvoices(openList);

        // If no amount set yet and open invoices exist, set amount to total outstanding or initial
        if (!initialInvoice && openList.length > 0) {
          const totalOut = openList.reduce((sum, i) => sum + i.outstanding, 0);
          setAmount(totalOut);
        }
      } catch (err) {
        console.error('Failed to load open invoices for customer:', err);
      } finally {
        setLoadingInvoices(false);
      }
    }

    loadCustomerInvoices();
  }, [isOpen, customerId, customerType]);

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    if (customerType === 'distributor') {
      const dist = distributors.find((d) => d.id === id);
      if (dist) {
        setCustomerName(dist.display_name || dist.legal_name);
        setCustomerCode(dist.distributor_code || '');
      }
    } else if (customerType === 'retailer') {
      const ret = retailers.find((r) => r.id === id);
      if (ret) {
        setCustomerName(ret.store_name);
        setCustomerCode(ret.retailer_code || '');
      }
    }
  };

  const handleMethodChange = (code: string) => {
    setPaymentMethodCode(code);
    const m = paymentMethods.find((pm) => pm.code === code);
    if (m) {
      setPaymentMethodName(m.name);
    }
  };

  // FIFO auto allocate
  const handleAutoAllocateFIFO = () => {
    let remaining = amount;
    const updated = openInvoices.map((inv) => {
      if (remaining <= 0) {
        return { ...inv, allocatedAmount: 0 };
      }
      const canAlloc = Math.min(remaining, inv.outstanding);
      remaining -= canAlloc;
      return { ...inv, allocatedAmount: canAlloc };
    });
    setOpenInvoices(updated);
  };

  const handleAllocationChange = (invoiceId: string, val: number) => {
    setOpenInvoices(
      openInvoices.map((inv) => {
        if (inv.invoiceId === invoiceId) {
          const clamped = Math.max(0, Math.min(val, inv.outstanding));
          return { ...inv, allocatedAmount: clamped };
        }
        return inv;
      })
    );
  };

  const totalAllocated = openInvoices.reduce((sum, inv) => sum + (inv.allocatedAmount || 0), 0);
  const unallocatedAmount = Math.max(0, amount - totalAllocated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMessage('Payment amount must be greater than zero.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Please select a customer.');
      return;
    }
    if (totalAllocated > amount) {
      setErrorMessage('Total allocated amount cannot exceed total payment receipt amount.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const activeAllocations = openInvoices
        .filter((inv) => inv.allocatedAmount > 0.01)
        .map((inv) => ({
          invoiceId: inv.invoiceId,
          amount: Number(inv.allocatedAmount),
          notes: `Receipt knockoff ref ${referenceNumber}`,
        }));

      const payment = await financeApi.recordPayment({
        customerType,
        customerId: customerId || undefined,
        customerName,
        customerCode: customerCode || undefined,
        paymentDate,
        amount: Number(amount),
        paymentMethodCode,
        paymentMethodName,
        referenceNumber,
        bankName,
        bankAccountLast4,
        chequeNumber: chequeNumber || undefined,
        chequeDate: chequeDate || undefined,
        notes,
        allocations: activeAllocations,
      });

      onPaymentRecorded(payment);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record customer payment receipt');
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
            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Customer Payment Receipt</h2>
              <p className="text-xs text-slate-500">
                Book incoming cash / bank receipt and knock-off open customer invoices
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

          {/* Customer & Receipt Details */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              Customer & Receipt Identification
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Channel</label>
                <select
                  value={customerType}
                  onChange={(e) => {
                    setCustomerType(e.target.value as CustomerType);
                    setCustomerId('');
                    setCustomerName('');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="distributor">Authorized Distributor</option>
                  <option value="retailer">Retail Store / Merchant</option>
                  <option value="direct_customer">Direct Institutional Buyer</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Select Customer</label>
                {customerType === 'distributor' ? (
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Distributor --</option>
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.display_name || d.legal_name} ({d.distributor_code})
                      </option>
                    ))}
                  </select>
                ) : customerType === 'retailer' ? (
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Retailer Store --</option>
                    {retailers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.store_name} ({r.retailer_code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>
            </div>

            {/* Payment Mode & Amount Grid */}
            <div className="grid grid-cols-4 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Received Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-800 text-right"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethodCode}
                  onChange={(e) => handleMethodChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="demand_draft">Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">UTR / Ref #</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. UTR8910284"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
            </div>

            {paymentMethodCode === 'cheque' && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">Cheque Number</label>
                  <input
                    type="text"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="e.g. 004921"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">Cheque Date</label>
                  <input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Invoice Knockoff Allocation Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5 text-slate-500" />
                  Invoice Knock-Off Allocations
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select which open invoices this payment receipt clears.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutoAllocateFIFO}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Auto-Allocate Oldest First (FIFO)
              </button>
            </div>

            {loadingInvoices ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <p>Loading open customer invoices...</p>
              </div>
            ) : openInvoices.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Invoice No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Invoice Total</th>
                      <th className="py-2.5 px-3 text-right">Outstanding</th>
                      <th className="py-2.5 px-3 text-right w-36">Allocate (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {openInvoices.map((inv) => (
                      <tr key={inv.invoiceId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-700">
                          ₹{inv.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            max={inv.outstanding}
                            value={inv.allocatedAmount || ''}
                            onChange={(e) => handleAllocationChange(inv.invoiceId, Number(e.target.value))}
                            placeholder="0.00"
                            className="w-full text-right border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-emerald-700"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                <p>No open or overdue invoices found for this customer. Any unallocated receipt will be held as an Advance deposit.</p>
              </div>
            )}

            {/* Allocation Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500 block">Total Payment Received</span>
                <span className="text-base font-bold text-slate-900">
                  ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-center">
                <span className="text-xs text-slate-500 block">Total Allocated to Invoices</span>
                <span className="text-base font-bold text-emerald-700">
                  ₹{totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Unallocated Customer Advance</span>
                <span className={`text-base font-bold ${unallocatedAmount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                  ₹{unallocatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
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
            disabled={submitting || amount <= 0}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Posting Receipt...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Record & Post Payment (₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
