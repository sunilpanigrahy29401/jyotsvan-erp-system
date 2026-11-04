// src/app/pages/sales-orders/SalesReturnsView.tsx
// Sales Returns (RMA), QC Quarantine & Reverse Logistics Desk (Phase 18)

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Calendar,
  ShieldAlert,
  Boxes,
} from 'lucide-react';
import { salesOrderApi } from '../../../services/salesOrderApi.ts';
import type { SalesReturn, ReturnStatus, ReturnReason } from '../../../types/sales-orders.ts';

interface SalesReturnsViewProps {
  onSelectOrder: (orderId: string) => void;
  refreshKey: number;
}

export const SalesReturnsView: React.FC<SalesReturnsViewProps> = ({
  onSelectOrder,
  refreshKey,
}) => {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await salesOrderApi.listReturns();
      setReturns(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load sales returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const handleApprove = async (returnId: string) => {
    setActionLoading(true);
    try {
      await salesOrderApi.approveReturn(returnId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async (returnId: string) => {
    setActionLoading(true);
    try {
      await salesOrderApi.receiveReturn(returnId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Receiving failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between text-xs text-amber-950">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Sales Returns (RMA) & Reverse Logistics</h3>
            <p className="text-slate-600 text-[11px]">
              Authorize customer returns, route damaged/near-expiry stock into QC quarantine, and adjust ledgers.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-amber-600" />
            <p className="text-xs">Loading sales returns...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700 bg-rose-50 text-xs">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-600" />
            <p className="font-bold">{error}</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <RotateCcw className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No sales return requests</p>
            <p className="text-xs text-slate-400">All customer shipments are in good order with zero active RMA claims.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">RMA Number</th>
                <th className="py-3 px-4">Return Reason</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4 text-center">QC Quarantine</th>
                <th className="py-3 px-4 text-right">Refund Value (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.map((ret) => (
                <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{ret.return_number}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 capitalize">
                    {ret.reason.replace('_', ' ')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 capitalize">{ret.condition.replace('_', ' ')}</td>
                  <td className="py-3.5 px-4 text-center">
                    {ret.qc_required ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                        QC Required
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Direct Restock</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    ₹{(ret.total_refund_amount ?? ret.grand_total ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ret.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : ret.status === 'received'
                          ? 'bg-blue-100 text-blue-800'
                          : ret.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ret.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center space-x-1.5">
                    {(ret.status === 'submitted' || ret.status === 'draft') && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleApprove(ret.id)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded border border-emerald-200"
                      >
                        Approve RMA
                      </button>
                    )}
                    {ret.status === 'approved' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleReceive(ret.id)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded border border-blue-200"
                      >
                        Receive Stock
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectOrder(ret.sales_order_id)}
                      className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded font-medium"
                    >
                      View SO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
