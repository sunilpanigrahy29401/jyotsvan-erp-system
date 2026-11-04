// src/app/pages/commerce/myntra/MyntraReturnsTab.tsx
import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { myntraApi } from '../../../../services/myntraApi.ts';

export function MyntraReturnsTab() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const data = await myntraApi.getReturns();
      setReturns(data);
    } catch (err) {
      console.error('Failed to load Myntra returns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  return (
    <div className="p-6 space-y-5">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Returns & Reverse Logistics (RTO)</h2>
          <p className="text-xs text-slate-500">
            Track customer returns, undelivered RTO reversals, and warehouse QC inspection outcomes.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded bg-pink-50 text-pink-700 font-semibold border border-pink-200">
          RTO Rate: 4.8% (Target &lt; 7.0%)
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading returns...</div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No return records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Return ID</th>
                  <th className="py-3 px-4 font-semibold">Product Title & SKU</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Reason</th>
                  <th className="py-3 px-4 font-semibold">QC Verdict</th>
                  <th className="py-3 px-4 font-semibold text-right">Refund Amount</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {ret.external_return_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{ret.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono">SKU: {ret.seller_sku}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${ret.return_type === 'RTO' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {ret.return_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">{ret.return_reason}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${ret.qc_verdict === 'RESTOCKABLE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'}`}>
                        {ret.qc_verdict}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{ret.refund_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${ret.return_status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                        {ret.return_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
