// src/app/pages/commerce/amazon/AmazonSettlementsTab.tsx
// Phase 31: Amazon Financial Settlements, Net Payouts & Fee Ledger

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Percent,
  Calendar,
  CreditCard,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import { amazonApi } from '../../../../services/amazonApi.ts';
import type { AmazonSettlement, AmazonFee } from '../../../../types/amazon.ts';

export function AmazonSettlementsTab() {
  const [settlements, setSettlements] = useState<AmazonSettlement[]>([]);
  const [fees, setFees] = useState<AmazonFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [feeTypeFilter, setFeeTypeFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settleRes, feesRes] = await Promise.all([
        amazonApi.getSettlements(),
        amazonApi.getFees({ feeType: feeTypeFilter }),
      ]);
      setSettlements(settleRes.settlements);
      setFees(feesRes.fees);
    } catch (err) {
      console.error('Failed to load Amazon financial settlements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [feeTypeFilter]);

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Settlements Statement Summary Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Amazon SP-API V2 Settlement Statements</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Fortnightly automated disbursements from Amazon Seller Central directly reconciled into the ERP ledger.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settlements.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      Settlement #{s.settlement_id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(s.settlement_start_date).toLocaleDateString()} - {new Date(s.settlement_end_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-medium">Net Disbursed</div>
                  <div className="text-lg font-extrabold text-teal-800">
                    {formatCurrency(s.total_amount, s.currency)}
                  </div>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Gross Sales</span>
                  <span className="font-bold text-slate-900">{formatCurrency(s.gross_sales_amount, s.currency)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Platform Fees</span>
                  <span className="font-bold text-orange-700">-{formatCurrency(s.fees_amount, s.currency)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Refunds</span>
                  <span className="font-bold text-rose-700">-{formatCurrency(s.refunds_amount, s.currency)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">GST / Taxes</span>
                  <span className="font-bold text-slate-700">-{formatCurrency(s.taxes_amount, s.currency)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Granular Fee Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Granular Item Fee Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditable itemized deductions including Referral Fees, FBA Weight Handling, Pick & Pack, and Closing Fees.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={feeTypeFilter}
              onChange={(e) => setFeeTypeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
            >
              <option value="ALL">All Fee Types</option>
              <option value="ReferralFee">Referral Fee (~15%)</option>
              <option value="FBAWeightHandling">FBA Weight Handling</option>
              <option value="ClosingFee">Fixed Closing Fee</option>
              <option value="PickAndPack">Pick & Pack Fee</option>
              <option value="StorageFee">FBA Storage Fee</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Order ID & Date</th>
                <th className="py-2.5 px-4">Seller SKU</th>
                <th className="py-2.5 px-4">Fee Category</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4 text-right">Deduction Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-amber-500" />
                    Loading fee ledger...
                  </td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    No fee records matching filter.
                  </td>
                </tr>
              ) : (
                fees.map((fee, idx) => (
                  <tr key={fee.id || idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900 font-mono">{fee.external_order_id || 'N/A'}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(fee.posted_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                      {fee.seller_sku || 'Account-Level'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
                        {fee.fee_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{fee.description || 'Amazon Service Charge'}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-orange-700">
                      -{formatCurrency(fee.fee_amount, fee.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
