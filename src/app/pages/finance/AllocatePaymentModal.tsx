// src/app/pages/finance/AllocatePaymentModal.tsx
// Allocation of Unallocated Customer Advance Receipts to Open Invoices (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ListFilter,
  Wand2,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import type { Payment, Invoice } from '../../../types/finance.ts';

interface AllocatePaymentModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onAllocated: (payment: Payment) => void;
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

export const AllocatePaymentModal: React.FC<AllocatePaymentModalProps> = ({
  payment,
  isOpen,
  onClose,
  onAllocated,
}) => {
  const [openInvoices, setOpenInvoices] = useState<AllocationDraft[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !payment) return;

    async function loadInvoices() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const invs = await financeApi.getInvoices({
          customerId: payment?.customer_id,
          customerType: payment?.customer_type,
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
            allocatedAmount: 0,
          }));

        setOpenInvoices(openList);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to fetch open invoices');
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  const availableUnallocated = payment.unallocated_amount;

  const handleAutoAllocateFIFO = () => {
    let remaining = availableUnallocated;
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
  const remainingUnallocated = Math.max(0, availableUnallocated - totalAllocated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAllocated <= 0) {
      setErrorMessage('Please allocate an amount to at least one invoice.');
      return;
    }
    if (totalAllocated > availableUnallocated) {
      setErrorMessage(
        `Total allocated (₹${totalAllocated}) exceeds available unallocated balance (₹${availableUnallocated}).`
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const allocations = openInvoices
        .filter((inv) => inv.allocatedAmount > 0.01)
        .map((inv) => ({
          invoiceId: inv.invoiceId,
          amount: Number(inv.allocatedAmount),
          notes: `Advance knockoff from ${payment.payment_number}`,
        }));

      const updated = await financeApi.allocatePayment(payment.id, allocations);
      onAllocated(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to allocate payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Allocate Advance Payment: {payment.payment_number}
              </h2>
              <p className="text-xs text-slate-500">
                Customer: <strong className="text-slate-800">{payment.customer_name}</strong> • Available Advance:{' '}
                <strong className="text-emerald-700">₹{availableUnallocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-xs">Open Invoices for Knock-off</h3>
              <p className="text-[11px] text-slate-500">Specify allocation against open receivables</p>
            </div>

            <button
              type="button"
              onClick={handleAutoAllocateFIFO}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Auto-Allocate FIFO
            </button>
          </div>

          {loading ? (
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
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
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
              <p>No open or overdue invoices found for this customer.</p>
            </div>
          )}

          {/* Allocation balance tally */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500 block">Available Advance</span>
              <span className="text-sm font-bold text-slate-900">
                ₹{availableUnallocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-center">
              <span className="text-slate-500 block">Allocating Now</span>
              <span className="text-sm font-bold text-emerald-700">
                ₹{totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Remaining Advance</span>
              <span className="text-sm font-bold text-slate-700">
                ₹{remainingUnallocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
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
            disabled={submitting || totalAllocated <= 0}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Applying Allocations...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm Allocations (₹{totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
