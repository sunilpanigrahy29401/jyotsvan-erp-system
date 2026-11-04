import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Plus,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { retailerApi } from '../../../services/retailerApi.ts';
import type { RetailerReturn } from '../../../types/retailers.ts';

interface RetailerReturnsViewProps {
  onCreateReturn: () => void;
}

export const RetailerReturnsView: React.FC<RetailerReturnsViewProps> = ({ onCreateReturn }) => {
  const [returns, setReturns] = useState<RetailerReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadReturns();
  }, [statusFilter]);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const res = await retailerApi.listReturns({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
      });
      setReturns(res.data);
    } catch (err) {
      console.error('Failed to load returns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (returnId: string) => {
    if (!confirm('Approve this retailer return claim?')) return;
    try {
      await retailerApi.approveReturn(returnId, 'Approved for replacement / credit note processing');
      loadReturns();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action and Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['all', 'requested', 'approved', 'received_at_distributor', 'completed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === s
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReturns}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onCreateReturn}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Return Claim
          </button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Return RMA #</th>
                <th className="py-3 px-4">Retailer Outlet</th>
                <th className="py-3 px-4">Product SKU & Batch</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Fulfilling Distributor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading return claims...</td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">No returns found matching filter.</td>
                </tr>
              ) : (
                returns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{r.return_number}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{r.retailer_name}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{r.sku_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Batch: {r.batch_number || 'N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-rose-600">{r.quantity} {r.uom}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 capitalize">
                        {r.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{r.distributor_name}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                          r.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : r.status === 'requested'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {r.status === 'requested' && (
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      )}
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
};
