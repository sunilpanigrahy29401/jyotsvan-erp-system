// src/app/pages/finance/AgeingAndLedgerView.tsx
// Accounts Receivable (AR) Aging Analysis Matrix & Subledger Statement Access (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  Building,
  ArrowRight,
  Loader2,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import type { CustomerAgeingSummary, CustomerType } from '../../../types/finance.ts';

interface AgeingAndLedgerViewProps {
  onOpenLedger: (customerId: string, customerType: CustomerType, customerName: string) => void;
}

export const AgeingAndLedgerView: React.FC<AgeingAndLedgerViewProps> = ({ onOpenLedger }) => {
  const [ageingData, setAgeingData] = useState<CustomerAgeingSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);

  const loadAgeing = async () => {
    setLoading(true);
    try {
      const data = await financeApi.getAgeingSummary({
        search: search || undefined,
        customerType: customerTypeFilter !== 'all' ? customerTypeFilter : undefined,
        overdueOnly: overdueOnly || undefined,
      });
      setAgeingData(data);
    } catch (err) {
      console.error('Failed to load ageing matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgeing();
  }, [customerTypeFilter, overdueOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAgeing();
  };

  // Totals
  const totalReceivable = ageingData.reduce((s, c) => s + (c.total_outstanding || 0), 0);
  const totalCurrent = ageingData.reduce((s, c) => s + (c.current_amount || 0), 0);
  const total1To30 = ageingData.reduce((s, c) => s + (c.days_1_30 || 0), 0);
  const total31To60 = ageingData.reduce((s, c) => s + (c.days_31_60 || 0), 0);
  const total61To90 = ageingData.reduce((s, c) => s + (c.days_61_90 || 0), 0);
  const total91To120 = ageingData.reduce((s, c) => s + (c.days_91_120 || 0), 0);
  const total120Plus = ageingData.reduce((s, c) => s + (c.days_120_plus || 0), 0);

  return (
    <div className="space-y-4">
      {/* Ageing Totals Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Accounts Receivable Aging Matrix (30 / 60 / 90 / 120+ Days)
            </h2>
            <p className="text-xs text-slate-500">
              Total Outstanding Book: <strong className="text-slate-900">₹{totalReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>
          <button
            onClick={loadAgeing}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh Ageing Matrix"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
            <span className="text-[10px] font-semibold text-emerald-800 uppercase block">Current (Not Due)</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              ₹{totalCurrent.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
            <span className="text-[10px] font-semibold text-blue-800 uppercase block">1 - 30 Days</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              ₹{total1To30.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
            <span className="text-[10px] font-semibold text-amber-800 uppercase block">31 - 60 Days</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              ₹{total31To60.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-xl">
            <span className="text-[10px] font-semibold text-orange-800 uppercase block">61 - 90 Days</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              ₹{total61To90.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
            <span className="text-[10px] font-semibold text-rose-800 uppercase block">91 - 120 Days</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              ₹{total91To120.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 bg-red-100/70 border border-red-300 rounded-xl">
            <span className="text-[10px] font-semibold text-red-900 uppercase block">120+ Days</span>
            <p className="text-sm font-bold text-red-900 mt-0.5">
              ₹{total120Plus.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer by name or code..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3">
          <select
            value={customerTypeFilter}
            onChange={(e) => setCustomerTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Channels</option>
            <option value="distributor">Distributors</option>
            <option value="retailer">Retailers</option>
            <option value="direct_customer">Direct Buyers</option>
          </select>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <span>Overdue Accounts Only</span>
          </label>
        </div>
      </div>

      {/* Ageing Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-xs font-medium">Computing AR Aging Matrix...</p>
          </div>
        ) : ageingData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-3 text-right">Current (₹)</th>
                  <th className="py-3 px-3 text-right">1-30d (₹)</th>
                  <th className="py-3 px-3 text-right">31-60d (₹)</th>
                  <th className="py-3 px-3 text-right">61-90d (₹)</th>
                  <th className="py-3 px-3 text-right">91-120d (₹)</th>
                  <th className="py-3 px-3 text-right">120+ d (₹)</th>
                  <th className="py-3 px-4 text-right">Total O/S (₹)</th>
                  <th className="py-3 px-3 text-right">Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ageingData.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{c.customer_name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Code: {c.customer_code || 'N/A'} • Open Invoices: {c.open_invoices_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize text-slate-700 font-medium">
                        {c.customer_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 font-medium">
                      {c.current_amount > 0 ? `₹${c.current_amount.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 font-medium">
                      {c.days_1_30 > 0 ? `₹${c.days_1_30.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-700 font-semibold">
                      {c.days_31_60 > 0 ? `₹${c.days_31_60.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-orange-700 font-semibold">
                      {c.days_61_90 > 0 ? `₹${c.days_61_90.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-700 font-bold">
                      {c.days_91_120 > 0 ? `₹${c.days_91_120.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-red-700 font-bold">
                      {c.days_120_plus > 0 ? `₹${c.days_120_plus.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{c.total_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onOpenLedger(c.customer_id, c.customer_type, c.customer_name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-semibold text-xs border border-indigo-200 transition-colors"
                        title="View Statement of Accounts"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No customer accounts match your ageing filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
