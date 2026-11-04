// src/app/pages/finance/PaymentListView.tsx
// Customer Payment Receipts, Reconciliation & Subledger Knock-offs (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  Plus,
  Layers,
  Building,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  ArrowDownLeft,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import type { Payment, CustomerType } from '../../../types/finance.ts';

interface PaymentListViewProps {
  onRecordPayment: () => void;
  onAllocatePayment: (payment: Payment) => void;
}

export const PaymentListView: React.FC<PaymentListViewProps> = ({
  onRecordPayment,
  onAllocatePayment,
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await financeApi.getPayments({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        customerType: customerTypeFilter !== 'all' ? customerTypeFilter : undefined,
        limit: 100,
      });
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [statusFilter, customerTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPayments();
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt #, customer name, UTR / ref, cheque #..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="posted">Posted & Cleared</option>
            <option value="pending">Pending Realization</option>
            <option value="rejected">Bounced / Rejected</option>
          </select>

          <select
            value={customerTypeFilter}
            onChange={(e) => setCustomerTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Channels</option>
            <option value="distributor">Distributors</option>
            <option value="retailer">Retailers</option>
            <option value="direct_customer">Direct Buyers</option>
          </select>

          <button
            onClick={loadPayments}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh Payments"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onRecordPayment}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Payment Receipt
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-xs font-medium">Fetching Payment Receipts...</p>
          </div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Receipt Ref #</th>
                  <th className="py-3 px-4">Receipt Date</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Method & UTR</th>
                  <th className="py-3 px-4 text-right">Received (₹)</th>
                  <th className="py-3 px-4 text-right">Allocated (₹)</th>
                  <th className="py-3 px-4 text-right">Unallocated Advance (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-emerald-800 font-mono">
                      {p.payment_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(p.payment_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{p.customer_name}</span>
                      <span className="text-[11px] text-slate-500 capitalize">{p.customer_type}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">{p.payment_method_name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {p.reference_number || (p.cheque_number ? `Cheque #${p.cheque_number}` : '-')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-700">
                      ₹{p.allocated_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.unallocated_amount > 0 ? (
                        <span className="font-bold text-amber-700">
                          ₹{p.unallocated_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.unallocated_amount > 0.01 && (
                        <button
                          onClick={() => onAllocatePayment(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-md border border-indigo-200 transition-colors"
                        >
                          <Layers className="w-3 h-3" />
                          Allocate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400">
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No payment receipts found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
