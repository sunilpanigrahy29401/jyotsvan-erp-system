// src/app/pages/finance/CreateExpenseModal.tsx
// Operational Expense (OPEX & AP) Entry & Approval Creation (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Building,
  DollarSign,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import type { Expense, ExpenseCategory } from '../../../types/finance.ts';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated: (expense: Expense) => void;
}

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseCreated,
}) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [vendorPayee, setVendorPayee] = useState<string>('');
  const [department, setDepartment] = useState<string>('Logistics & Supply Chain');
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadCategories() {
      setLoading(true);
      try {
        const cats = await financeApi.getExpenseCategories();
        setCategories(cats);
        if (cats.length > 0 && !categoryId) {
          setCategoryId(cats[0].id);
        }
      } catch (err) {
        console.error('Failed to load expense categories:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      setErrorMessage('Please select an expense category.');
      return;
    }
    if (amount <= 0) {
      setErrorMessage('Expense amount must be greater than zero.');
      return;
    }
    if (!vendorPayee.trim()) {
      setErrorMessage('Vendor / Payee name is required.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Description of expenditure is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const exp = await financeApi.createExpense({
        categoryId,
        expenseDate,
        amount: Number(amount),
        taxAmount: Number(taxAmount || 0),
        vendorPayee,
        department,
        paymentMethod,
        description,
        notes,
      });

      onExpenseCreated(exp);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit expense voucher');
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
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Operational Expense (OPEX)</h2>
              <p className="text-xs text-slate-500">
                Submit corporate voucher for approval and accounts payable entry
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
              <label className="block font-semibold text-slate-700 mb-1">Expense Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expense Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 text-right"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                GST / Tax (ITC) Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={taxAmount || ''}
                onChange={(e) => setTaxAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vendor / Payee Name</label>
              <input
                type="text"
                value={vendorPayee}
                onChange={(e) => setVendorPayee(e.target.value)}
                placeholder="e.g. V-Trans Logistics, Gujarat Gas"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              >
                <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                <option value="Manufacturing & Plant">Manufacturing & Plant</option>
                <option value="Marketing & Brand">Marketing & Brand</option>
                <option value="Field Sales & TA/DA">Field Sales & TA/DA</option>
                <option value="Administration & HQ">Administration & HQ</option>
                <option value="Quality & Lab">Quality & Lab</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description / Purpose</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Freight charges for Ahmedabad-Rajkot replenishment trip (Vehicle GJ-01-BX-8899)"
              rows={2}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
            >
              <option value="bank_transfer">Corporate Bank Transfer</option>
              <option value="corporate_card">Corporate Credit Card</option>
              <option value="petty_cash">Petty Cash Imprest</option>
              <option value="cheque">Cheque</option>
            </select>
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
              disabled={submitting}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Submit Expense Voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
