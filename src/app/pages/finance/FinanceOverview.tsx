// src/app/pages/finance/FinanceOverview.tsx
// Executive Finance Dashboard, Collections Matrix & Subledger Overview (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  FileText,
  CreditCard,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  ShieldCheck,
  Receipt,
  FileCheck,
  Plus,
  ArrowRight,
  Loader2,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import type { FinanceDashboardMetrics, Invoice, Payment, CustomerAgeingSummary } from '../../../types/finance.ts';

interface FinanceOverviewProps {
  onNavigateTab: (tab: string) => void;
  onCreateInvoice: () => void;
  onRecordPayment: () => void;
  onCreateExpense: () => void;
  onViewInvoiceDetail: (invoiceId: string) => void;
}

export const FinanceOverview: React.FC<FinanceOverviewProps> = ({
  onNavigateTab,
  onCreateInvoice,
  onRecordPayment,
  onCreateExpense,
  onViewInvoiceDetail,
}) => {
  const [metrics, setMetrics] = useState<FinanceDashboardMetrics | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [ageingList, setAgeingList] = useState<CustomerAgeingSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [m, invs, pays, age] = await Promise.all([
        financeApi.getDashboardMetrics(),
        financeApi.getInvoices({ limit: 5 }),
        financeApi.getPayments({ limit: 5 }),
        financeApi.getAgeingSummary({ overdueOnly: true }),
      ]);
      setMetrics(m);
      setRecentInvoices(invs);
      setRecentPayments(pays);
      setAgeingList(age.slice(0, 5));
    } catch (err) {
      console.error('Failed to load finance dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
        <p className="text-sm font-medium">Loading Financial Metrics & Subledgers...</p>
      </div>
    );
  }

  const totalInvoiced = metrics?.total_invoiced || 0;
  const totalCollected = metrics?.total_collected || 0;
  const totalOutstanding = metrics?.total_outstanding || 0;
  const totalOverdue = metrics?.total_overdue || 0;
  const totalExpenses = metrics?.total_expenses || 0;
  const openInvoicesCount = metrics?.pending_invoice_approvals || 0;
  const openCollectionsCount = metrics?.open_collections_count || 0;

  const ageing = metrics?.ageing_breakdown || {
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_91_120: 0,
    days_120_plus: 0,
  };

  return (
    <div className="space-y-6">
      {/* Quick Action Header Ribbon */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Financial Operations Hub</h2>
          <p className="text-xs text-slate-500">
            GST Invoicing, Payment Knock-offs, AR Aging, and Corporate Ledger Realization
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onCreateInvoice}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Tax Invoice
          </button>
          <button
            onClick={onRecordPayment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Record Payment Receipt
          </button>
          <button
            onClick={onCreateExpense}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Receipt className="w-3.5 h-3.5" />
            Record Expense
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Invoiced (MTD)</span>
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ₹{totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{recentInvoices.length}</span> recent tax invoices
          </div>
        </div>

        {/* Collections */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Collections (MTD)</span>
            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
            <span className="font-semibold text-emerald-700">
              {totalInvoiced > 0
                ? `${Math.round((totalCollected / totalInvoiced) * 100)}%`
                : '100%'}
            </span>{' '}
            realization rate
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Net Outstanding AR</span>
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
            Across active distributor & retail accounts
          </div>
        </div>

        {/* Overdue Debt */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Overdue Receivables</span>
            <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">
            ₹{totalOverdue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
            <span className="font-semibold text-rose-700">{openCollectionsCount}</span> active collection followups
          </div>
        </div>
      </div>

      {/* AR Ageing Analysis Ribbon */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Accounts Receivable (AR) Aging Analysis</h3>
          </div>
          <button
            onClick={() => onNavigateTab('outstanding')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
          >
            View Full Matrix
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Not Due (Current)</span>
            <p className="text-base font-bold text-slate-900 mt-1">
              ₹{(ageing.current || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-emerald-700">Within Credit Days</span>
          </div>

          <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl">
            <span className="text-[11px] font-semibold text-blue-800 uppercase block">1 - 30 Days</span>
            <p className="text-base font-bold text-slate-900 mt-1">
              ₹{(ageing.days_1_30 || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-blue-700">Low Risk Followup</span>
          </div>

          <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl">
            <span className="text-[11px] font-semibold text-amber-800 uppercase block">31 - 60 Days</span>
            <p className="text-base font-bold text-slate-900 mt-1">
              ₹{(ageing.days_31_60 || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-amber-700">Medium Priority</span>
          </div>

          <div className="p-3.5 bg-orange-50/50 border border-orange-200 rounded-xl">
            <span className="text-[11px] font-semibold text-orange-800 uppercase block">61 - 90 Days</span>
            <p className="text-base font-bold text-slate-900 mt-1">
              ₹{(ageing.days_61_90 || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-orange-700">High Risk Attention</span>
          </div>

          <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl">
            <span className="text-[11px] font-semibold text-rose-800 uppercase block">91 - 120 Days</span>
            <p className="text-base font-bold text-slate-900 mt-1">
              ₹{(ageing.days_91_120 || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-rose-700">Critical Dunning</span>
          </div>

          <div className="p-3.5 bg-red-100/60 border border-red-300 rounded-xl">
            <span className="text-[11px] font-semibold text-red-900 uppercase block">120+ Days</span>
            <p className="text-base font-bold text-red-900 mt-1">
              ₹{(ageing.days_120_plus || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-red-700 font-semibold">Account Blocked</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Invoices & Top Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Invoices (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent GST Tax Invoices</h3>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => onViewInvoiceDetail(inv.id)}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-bold text-indigo-700">{inv.invoice_number}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[140px] truncate">
                      {inv.customer_name}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      ₹{inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                      ₹{inv.amount_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          inv.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.status === 'partially_paid'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : inv.status === 'overdue'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Overdue Accounts (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">Highest Exposure Accounts</h3>
            </div>
            <button
              onClick={() => onNavigateTab('collections')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              Collections
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {ageingList.map((cust) => {
              const utilPct =
                cust.credit_limit > 0
                  ? Math.min(100, Math.round((cust.total_outstanding / cust.credit_limit) * 100))
                  : 0;

              return (
                <div key={cust.customer_id} className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{cust.customer_name}</span>
                      <span className="text-[11px] text-slate-500 capitalize">
                        {cust.customer_type} • Limit: ₹{(cust.credit_limit || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-rose-700">
                      ₹{cust.total_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        utilPct > 90 ? 'bg-rose-600' : utilPct > 70 ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>Credit Utilization: {utilPct}%</span>
                    {cust.overdue_amount > 0 && (
                      <span className="text-rose-600 font-semibold">
                        ₹{cust.overdue_amount.toLocaleString('en-IN')} Overdue
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
