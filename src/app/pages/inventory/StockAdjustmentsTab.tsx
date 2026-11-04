import React, { useState, useEffect } from 'react';
import { Search, RotateCw, Download, SlidersHorizontal, ChevronLeft, ChevronRight, Plus, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { inventoryApi } from '../../../services/inventoryApi';
import { LoadingState } from '../../../components/ui/loading-state';
import type { StockAdjustment } from '../../../types/inventory';

interface StockAdjustmentsTabProps {
  onOpenNewAdjustment: () => void;
}

export function StockAdjustmentsTab({ onOpenNewAdjustment }: StockAdjustmentsTabProps) {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdjustments = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryApi.getAdjustments({
        page,
        limit,
      });

      setAdjustments(data.adjustments);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load adjustments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, [page]);

  return (
    <div className="space-y-4">
      {/* Actions and Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Physical Stock Count Adjustments & Variance Journal</h3>
          <p className="text-xs text-slate-500">Full audit log of manual cycle tally adjustments and stock calibrations</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAdjustments}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenNewAdjustment}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingState message="Loading Adjustments Journal" description="Querying cycle count variance and adjustment records..." />
          </div>
        ) : adjustments.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-400 mb-3">
              <SlidersHorizontal className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No adjustments logged</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              Click "New Stock Adjustment" to record physical cycle count changes or scrap write-offs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Adjustment #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Canonical SKU</th>
                  <th className="py-3 px-3">Warehouse / Bay</th>
                  <th className="py-3 px-3">Stock Sub-Pool</th>
                  <th className="py-3 px-3 text-right">Adjustment Qty</th>
                  <th className="py-3 px-3">Variance Reason</th>
                  <th className="py-3 px-4">Actor & Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.map((a) => {
                  const isInc = a.direction === 'increase';
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{a.adjustment_number}</td>

                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900">{a.sku_code}</div>
                        <div className="text-[11px] text-slate-500">{a.variant_name}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{a.warehouse_name}</div>
                        <div className="text-[11px] text-slate-400">{a.location_name || 'Default Bay'}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize bg-slate-100 text-slate-700 border border-slate-200">
                          {a.stock_type}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className={`inline-flex items-center font-bold text-sm ${isInc ? 'text-emerald-700' : 'text-amber-800'}`}>
                          {isInc ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                          {isInc ? '+' : '-'}{Number(a.quantity).toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800">{a.reason}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-600 truncate max-w-[200px]" title={a.notes || ''}>
                          {a.notes || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{a.performed_by_email || 'operator'}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold">{adjustments.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-semibold">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold">{total}</span> records
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
