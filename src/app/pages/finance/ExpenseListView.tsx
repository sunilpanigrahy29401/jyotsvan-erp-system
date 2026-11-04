// src/app/pages/finance/ExpenseListView.tsx
// Operational Expense Management (OPEX), Category Budgets & Approvals (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  DollarSign,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import type { Expense, ExpenseCategory, ExpenseStatus } from '../../../types/finance.ts';

interface ExpenseListViewProps {
  onCreateExpense: () => void;
}

export const ExpenseListView: React.FC<ExpenseListViewProps> = ({ onCreateExpense }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [exps, cats] = await Promise.all([
        financeApi.getExpenses({
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        }),
        financeApi.getExpenseCategories(),
      ]);
      setExpenses(exps);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter]);

  const handleStatusChange = async (id: string, newStatus: ExpenseStatus) => {
    setActionLoadingId(id);
    try {
      await financeApi.updateExpenseStatus(id, newStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update expense status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: ExpenseStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Approved
          </span>
        );
      case 'paid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Disbursed / Paid
          </span>
        );
      case 'submitted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Pending Approval
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const totalExpense = expenses.reduce((s, e) => s + (e.status !== 'rejected' ? e.amount : 0), 0);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by payee, voucher #, description..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Approval Statuses</option>
            <option value="submitted">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid / Disbursed</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onCreateExpense}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Record OPEX Voucher
          </button>
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-xs font-medium">Fetching Expense Vouchers...</p>
          </div>
        ) : expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vendor / Payee</th>
                  <th className="py-3 px-4">Category & Department</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Gross (₹)</th>
                  <th className="py-3 px-4 text-right">ITC Tax (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Approvals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {e.expense_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(e.expense_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{e.vendor_payee}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">{e.category_name}</span>
                      <span className="text-[10px] text-slate-500">{e.department}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{e.description}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      ₹{(e.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(e.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {e.status === 'submitted' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(e.id, 'approved')}
                              disabled={actionLoadingId === e.id}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-semibold text-[11px] border border-emerald-200 transition-colors"
                              title="Approve Expense"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(e.id, 'rejected')}
                              disabled={actionLoadingId === e.id}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-medium text-[11px] border border-rose-200 transition-colors"
                              title="Reject Expense"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {e.status === 'approved' && (
                          <button
                            onClick={() => handleStatusChange(e.id, 'paid')}
                            disabled={actionLoadingId === e.id}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold text-[11px] border border-blue-200 transition-colors"
                            title="Mark Disbursed"
                          >
                            Disburse / Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No operational expense vouchers found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
