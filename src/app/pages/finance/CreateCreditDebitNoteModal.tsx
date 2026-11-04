// src/app/pages/finance/CreateCreditDebitNoteModal.tsx
// Credit & Debit Notes Generation & Subledger Adjustment (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck,
  Building,
  DollarSign,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import { distributorApi } from '../../../services/distributorApi.ts';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { CustomerType } from '../../../types/finance.ts';

interface CreateCreditDebitNoteModalProps {
  noteType: 'credit' | 'debit';
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateCreditDebitNoteModal: React.FC<CreateCreditDebitNoteModalProps> = ({
  noteType,
  isOpen,
  onClose,
  onCreated,
}) => {
  const [customerType, setCustomerType] = useState<CustomerType>('distributor');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [reason, setReason] = useState<string>('Sales Return & Stock Adjustment');
  const [subtotal, setSubtotal] = useState<number>(0);
  const [taxTotal, setTaxTotal] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [distributors, setDistributors] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadCustomers() {
      try {
        const [distRes, retRes] = await Promise.all([
          distributorApi.listDistributors({ limit: 100 }),
          retailerApi.listRetailers({ limit: 100 }),
        ]);
        setDistributors(distRes.data || []);
        setRetailers(retRes.data || []);

        if (distRes.data && distRes.data.length > 0 && !customerId) {
          const first = distRes.data[0];
          setCustomerId(first.id);
          setCustomerName(first.display_name || first.legal_name);
        }
      } catch (err) {
        console.error('Failed to load customers for note:', err);
      }
    }

    loadCustomers();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    if (customerType === 'distributor') {
      const dist = distributors.find((d) => d.id === id);
      if (dist) setCustomerName(dist.display_name || dist.legal_name);
    } else if (customerType === 'retailer') {
      const ret = retailers.find((r) => r.id === id);
      if (ret) setCustomerName(ret.store_name);
    }
  };

  const handleSubtotalChange = (val: number) => {
    setSubtotal(val);
    setTaxTotal(Math.round(val * 0.18 * 100) / 100);
  };

  const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subtotal <= 0) {
      setErrorMessage('Amount must be greater than zero.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Customer name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      if (noteType === 'credit') {
        await financeApi.createCreditNote({
          customerType,
          customerId: customerId || undefined,
          customerName,
          invoiceNumber: invoiceNumber || undefined,
          reason,
          subtotal: Number(subtotal),
          taxTotal: Number(taxTotal),
          grandTotal: Number(grandTotal),
          notes,
        });
      } else {
        await financeApi.createDebitNote({
          customerType,
          customerId: customerId || undefined,
          customerName,
          invoiceNumber: invoiceNumber || undefined,
          reason,
          subtotal: Number(subtotal),
          taxTotal: Number(taxTotal),
          grandTotal: Number(grandTotal),
          notes,
        });
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to issue note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${
                noteType === 'credit'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 capitalize">
                Issue GST {noteType} Note
              </h2>
              <p className="text-xs text-slate-500">
                {noteType === 'credit'
                  ? 'Reduces customer receivable balance (Returns, Discounts, Rate Rebates)'
                  : 'Increases customer balance (Interest, Freight Charge, Rate Adjustments)'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer Channel</label>
              <select
                value={customerType}
                onChange={(e) => {
                  setCustomerType(e.target.value as CustomerType);
                  setCustomerId('');
                  setCustomerName('');
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              >
                <option value="distributor">Distributor</option>
                <option value="retailer">Retailer Store</option>
                <option value="direct_customer">Direct Buyer</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Customer</label>
              {customerType === 'distributor' ? (
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                >
                  <option value="">-- Choose Distributor --</option>
                  {distributors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.display_name || d.legal_name}
                    </option>
                  ))}
                </select>
              ) : customerType === 'retailer' ? (
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                >
                  <option value="">-- Choose Retailer --</option>
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.store_name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Original Invoice Ref #</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2026-0001"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason Code</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              >
                {noteType === 'credit' ? (
                  <>
                    <option value="Sales Return & Damaged Goods">Sales Return & Damaged Goods</option>
                    <option value="Volume Target Rebate">Volume Target Rebate</option>
                    <option value="Rate Correction / Discount Adjustment">Rate Correction / Discount Adjustment</option>
                    <option value="Deficiency in Service">Deficiency in Service</option>
                  </>
                ) : (
                  <>
                    <option value="Interest on Delayed Payment">Interest on Delayed Payment</option>
                    <option value="Under-invoiced Rate Difference">Under-invoiced Rate Difference</option>
                    <option value="Cheque Return Charges">Cheque Return Penalty</option>
                    <option value="Special Freight Surcharge">Special Freight Surcharge</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Taxable (₹)</label>
              <input
                type="number"
                step="0.01"
                value={subtotal || ''}
                onChange={(e) => handleSubtotalChange(Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-right font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST (18%) (₹)</label>
              <input
                type="number"
                step="0.01"
                value={taxTotal || ''}
                onChange={(e) => setTaxTotal(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-right"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total (₹)</label>
              <div className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 text-right">
                ₹{grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Narration / Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Remarks for subledger and customer..."
              rows={2}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || subtotal <= 0}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Issue & Post {noteType === 'credit' ? 'Credit Note' : 'Debit Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
