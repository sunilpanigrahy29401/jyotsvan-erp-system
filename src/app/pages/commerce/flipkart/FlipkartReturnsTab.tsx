// src/app/pages/commerce/flipkart/FlipkartReturnsTab.tsx
// Phase 32: Flipkart Returns & RTO Management Tab

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Package,
  Calendar,
} from 'lucide-react';
import { flipkartApi } from '../../../../services/flipkartApi.ts';
import type { FlipkartReturn } from '../../../../types/flipkart.ts';

export function FlipkartReturnsTab() {
  const [returns, setReturns] = useState<FlipkartReturn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await flipkartApi.getReturns();
      setReturns(res.returns || []);
    } catch (err) {
      console.error('Error fetching Flipkart returns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Customer Returns & Courier RTO Tracking</h3>
          <p className="text-xs text-slate-500">
            Monitor return reason classification, inspection outcomes, refund settlements, and courier reverse pickups
          </p>
        </div>
        <button
          onClick={fetchReturns}
          className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition shadow-sm"
          title="Refresh returns"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Returns Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            Loading returns records...
          </div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <RotateCcw className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No active returns or RTOs</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Return ID / Date</th>
                  <th className="py-3 px-4">Flipkart SKU / FSN</th>
                  <th className="py-3 px-4">Reason Category</th>
                  <th className="py-3 px-4">Reason Details</th>
                  <th className="py-3 px-4">Return Status</th>
                  <th className="py-3 px-4 text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {returns.map((ret) => {
                  const isRto = ret.return_status.includes('RTO');

                  return (
                    <tr key={ret.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-900">{ret.external_return_id}</div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(ret.return_date).toLocaleDateString('en-IN')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-slate-800">{ret.seller_sku}</div>
                        <div className="text-[11px] text-slate-400">FSN: {ret.asin}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {ret.return_reason?.replace(/_/g, ' ') || 'CUSTOMER_RETURN'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {ret.return_reason_details || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isRto
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          <Truck className="w-3 h-3" />
                          <span>{ret.return_status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(ret.refund_amount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
