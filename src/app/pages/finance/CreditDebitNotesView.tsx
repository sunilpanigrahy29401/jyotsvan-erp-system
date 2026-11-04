// src/app/pages/finance/CreditDebitNotesView.tsx
// GST Credit & Debit Notes Ledger, Adjustments & Subledger Reversals (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Plus,
  Building,
  DollarSign,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import type { CreditNote, DebitNote } from '../../../types/finance.ts';

interface CreditDebitNotesViewProps {
  onIssueNote: (type: 'credit' | 'debit') => void;
}

export const CreditDebitNotesView: React.FC<CreditDebitNotesViewProps> = ({ onIssueNote }) => {
  const [activeTab, setActiveTab] = useState<'credit' | 'debit'>('credit');
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const loadNotes = async () => {
    setLoading(true);
    try {
      const [cn, dn] = await Promise.all([
        financeApi.getCreditNotes(),
        financeApi.getDebitNotes(),
      ]);
      setCreditNotes(cn);
      setDebitNotes(dn);
    } catch (err) {
      console.error('Failed to load credit/debit notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const filteredCreditNotes = creditNotes.filter(
    (n) =>
      !search ||
      (n.credit_note_number && n.credit_note_number.toLowerCase().includes(search.toLowerCase())) ||
      n.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (n.invoice_number && n.invoice_number.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredDebitNotes = debitNotes.filter(
    (n) =>
      !search ||
      (n.debit_note_number && n.debit_note_number.toLowerCase().includes(search.toLowerCase())) ||
      n.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (n.invoice_number && n.invoice_number.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('credit')}
            className={`px-4 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'credit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-amber-600" />
            Credit Notes ({creditNotes.length})
          </button>
          <button
            onClick={() => setActiveTab('debit')}
            className={`px-4 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'debit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
            Debit Notes ({debitNotes.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={loadNotes}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => onIssueNote(activeTab)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Issue {activeTab === 'credit' ? 'Credit Note' : 'Debit Note'}
          </button>
        </div>
      </div>

      {/* Notes Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-xs font-medium">Fetching Note Register...</p>
          </div>
        ) : activeTab === 'credit' ? (
          filteredCreditNotes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Credit Note #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Orig Invoice Ref</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-right">Taxable (₹)</th>
                    <th className="py-3 px-4 text-right">Tax (₹)</th>
                    <th className="py-3 px-4 text-right">Credit Total (₹)</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCreditNotes.map((cn) => (
                    <tr key={cn.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-amber-800 font-mono">
                        {cn.credit_note_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(cn.credit_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{cn.customer_name}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {cn.invoice_number || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{cn.reason}</td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        ₹{cn.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        ₹{cn.tax_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-800">
                        ₹{cn.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {cn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <FileCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No Credit Notes issued yet.</p>
            </div>
          )
        ) : filteredDebitNotes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Debit Note #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Orig Invoice Ref</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Taxable (₹)</th>
                  <th className="py-3 px-4 text-right">Tax (₹)</th>
                  <th className="py-3 px-4 text-right">Debit Total (₹)</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebitNotes.map((dn) => (
                  <tr key={dn.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-indigo-800 font-mono">
                      {dn.debit_note_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(dn.debit_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{dn.customer_name}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {dn.invoice_number || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{dn.reason}</td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{dn.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{dn.tax_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-800">
                      ₹{dn.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {dn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400">
            <FileCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No Debit Notes issued yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
