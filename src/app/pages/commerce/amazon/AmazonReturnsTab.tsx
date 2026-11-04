// src/app/pages/commerce/amazon/AmazonReturnsTab.tsx
// Phase 31: Amazon Customer Returns & RTO Logistics Monitoring

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  MapPin,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { amazonApi } from '../../../../services/amazonApi.ts';
import type { AmazonReturn } from '../../../../types/amazon.ts';

interface AmazonReturnsTabProps {
  selectedMarketplace: string;
}

export function AmazonReturnsTab({ selectedMarketplace }: AmazonReturnsTabProps) {
  const [returns, setReturns] = useState<AmazonReturn[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await amazonApi.getReturns({
        marketplaceId: selectedMarketplace,
        status: statusFilter,
        search,
      });
      setReturns(res.returns);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load Amazon returns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [selectedMarketplace, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReturns();
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search return ID, SKU, or return reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">All Return Statuses</option>
            <option value="COMPLETED">Completed / Reimbursed</option>
            <option value="AUTHORIZED">Authorized in Transit</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            onClick={fetchReturns}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Return ID & Date</th>
                <th className="py-3 px-4">Seller SKU / ASIN</th>
                <th className="py-3 px-4">Return Reason & Customer Remarks</th>
                <th className="py-3 px-4">Fulfillment Center</th>
                <th className="py-3 px-4 text-right">Refund Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Fetching Amazon returns & reimbursement reports...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No customer returns or RTO incidents found.
                  </td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 font-mono">{ret.external_return_id}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ret.return_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-semibold text-slate-900">{ret.seller_sku}</div>
                      <div className="text-[10px] text-amber-700">ASIN: {ret.asin || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-800">{ret.return_reason || 'Customer Return'}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {ret.return_reason_details || 'Standard return authorization'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1 text-slate-700 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ret.fulfillment_center_id || 'DEL4-Bhubaneswar FC'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-rose-700">
                        {formatCurrency(ret.refund_amount || 0, ret.currency)}
                      </div>
                      <div className="text-[10px] text-slate-400">Qty: {ret.quantity} unit(s)</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          ret.return_status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <CheckCircle className="w-3 h-3" />
                        {ret.return_status}
                      </span>
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
