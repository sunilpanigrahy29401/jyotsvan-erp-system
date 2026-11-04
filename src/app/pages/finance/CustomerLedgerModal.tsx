// src/app/pages/finance/CustomerLedgerModal.tsx
// Customer Statement of Accounts & Subledger Running Balance Viewer (Phase 19)

import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Building,
  Calendar,
  DollarSign,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { financeApi } from '../../../services/financeApi.ts';
import type { CustomerLedgerStatement, CustomerType } from '../../../types/finance.ts';

interface CustomerLedgerModalProps {
  customerId: string | null;
  customerType: CustomerType;
  customerName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  customerId,
  customerType,
  customerName,
  isOpen,
  onClose,
}) => {
  const [ledger, setLedger] = useState<CustomerLedgerStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Date filters (defaults to YTD)
  const [fromDate, setFromDate] = useState<string>(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const loadLedger = async () => {
    if (!customerId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await financeApi.getCustomerLedger({
        customerId,
        customerType,
        fromDate,
        toDate,
      });
      setLedger(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load customer statement of accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      loadLedger();
    }
  }, [isOpen, customerId, fromDate, toDate]);

  if (!isOpen || !customerId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Customer Statement of Accounts & Subledger
              </h2>
              <p className="text-xs text-slate-500">
                {ledger?.customer_name || customerName || 'Customer'} • Account Statement
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Print Statement"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Statement Period:</span>
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs"
            />
            <button
              onClick={loadLedger}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors"
            >
              Apply Filter
            </button>
          </div>

          {ledger && (
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-slate-400 block text-[11px]">Net Outstanding Balance:</span>
                <span className={`font-bold ${ledger.closing_balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  ₹{ledger.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40">
          {loading ? (
            <div className="py-24 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-sm">Fetching ledger transactions...</p>
            </div>
          ) : errorMessage || !ledger ? (
            <div className="py-16 text-center text-red-600">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-semibold">{errorMessage || 'Ledger statement not found'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 text-[11px] block">Opening Balance</span>
                  <span className="text-base font-bold text-slate-900 mt-1 block">
                    ₹{ledger.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 text-[11px] block flex items-center justify-between">
                    Total Invoiced (Debits)
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                  </span>
                  <span className="text-base font-bold text-indigo-700 mt-1 block">
                    ₹{ledger.total_debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 text-[11px] block flex items-center justify-between">
                    Total Receipts (Credits)
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                  <span className="text-base font-bold text-emerald-700 mt-1 block">
                    ₹{ledger.total_credits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 text-[11px] block">Closing Running Balance</span>
                  <span
                    className={`text-base font-bold mt-1 block ${
                      ledger.closing_balance > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    ₹{ledger.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Transaction History & Running Balance
                  </h3>
                  <span className="text-xs text-slate-500">
                    {ledger.transactions.length} Ledger Postings
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Transaction Type</th>
                        <th className="py-2.5 px-3">Doc Ref #</th>
                        <th className="py-2.5 px-3">Description / Narration</th>
                        <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                        <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                        <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Opening Balance Row */}
                      <tr className="bg-slate-50/70 font-semibold text-slate-600">
                        <td className="py-2.5 px-3">{new Date(fromDate).toLocaleDateString('en-IN')}</td>
                        <td className="py-2.5 px-3">OPENING_BALANCE</td>
                        <td className="py-2.5 px-3">-</td>
                        <td className="py-2.5 px-3">Brought Forward Balance</td>
                        <td className="py-2.5 px-3 text-right">-</td>
                        <td className="py-2.5 px-3 text-right">-</td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-bold">
                          ₹{ledger.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {ledger.transactions.length > 0 ? (
                        ledger.transactions.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-slate-600">
                              {new Date(e.transaction_date).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                                  e.transaction_type === 'INVOICE'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : e.transaction_type === 'PAYMENT'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : e.transaction_type === 'CREDIT_NOTE'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {e.transaction_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {e.reference_number || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                              {e.description || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-indigo-700">
                              {e.debit_amount > 0 ? `₹${e.debit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                              {e.credit_amount > 0 ? `₹${e.credit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              ₹{e.running_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                            No ledger postings found in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <span className="text-xs text-slate-500">
            Official financial ledger extract for audit & reconciliation purposes.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
          >
            Close Statement
          </button>
        </div>
      </div>
    </div>
  );
};
