import React, { useState, useEffect } from 'react';
import { Search, RotateCw, Lock, Unlock, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle, Plus, Layers } from 'lucide-react';
import { inventoryApi } from '../../../services/inventoryApi';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { LoadingState } from '../../../components/ui/loading-state';
import type { StockReservation } from '../../../types/inventory';

interface StockReservationsTabProps {
  onOpenNewReservation: () => void;
}

export function StockReservationsTab({ onOpenNewReservation }: StockReservationsTabProps) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [reservations, setReservations] = useState<StockReservation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  const [status, setStatus] = useState<string>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryApi.getReservations({
        status: status !== 'all' ? status : undefined,
        page,
        limit,
      });

      setReservations(data.reservations);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load stock reservations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [page, status]);

  const handleRelease = async (res: StockReservation) => {
    if (!confirm(`Release reservation ${res.reservation_number} (${res.quantity} units) back into available stock pool?`)) {
      return;
    }

    setActionLoadingId(res.id);
    try {
      await inventoryApi.releaseReservation(res.id, {
        organization_id: user?.organization_id || 'org-jyotsvan-corp',
        actor_id: user?.id,
        actor_email: user?.email,
        reason: 'Order cancelled / Hold released by operator',
      });

      addToast({
        type: 'success',
        title: 'Reservation Released',
        message: `${res.quantity} units unlocked and credited back to available inventory.`,
      });

      fetchReservations();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Release Reservation',
        message: err.message || 'Error occurred while releasing reservation',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConsume = async (res: StockReservation) => {
    if (!confirm(`Consume reservation ${res.reservation_number} (${res.quantity} units) for final order dispatch?`)) {
      return;
    }

    setActionLoadingId(res.id);
    try {
      await inventoryApi.consumeReservation(res.id, {
        organization_id: user?.organization_id || 'org-jyotsvan-corp',
        actor_id: user?.id,
        actor_email: user?.email,
        reason: 'Order packed and dispatched from facility',
      });

      addToast({
        type: 'success',
        title: 'Reservation Consumed',
        message: `${res.quantity} units finalized and permanently deducted from physical stock.`,
      });

      fetchReservations();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Consume Reservation',
        message: err.message || 'Error occurred while consuming reservation',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action and Filter Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-48">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="active">Active Holds Only</option>
              <option value="released">Released Holds</option>
              <option value="consumed">Consumed (Dispatched)</option>
              <option value="all">All Reservation History</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchReservations}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenNewReservation}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Stock Hold</span>
          </button>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingState message="Loading Stock Holds" description="Fetching active allocations and order locks..." />
          </div>
        ) : reservations.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-400 mb-3">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No reservations found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              There are currently no stock reservations matching the selected filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Reservation #</th>
                  <th className="py-3 px-3">Canonical SKU</th>
                  <th className="py-3 px-3">Warehouse / Depot</th>
                  <th className="py-3 px-3">Channel / Reference</th>
                  <th className="py-3 px-3 text-right">Hold Quantity</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Expires / Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.map((r) => {
                  const isActive = r.status === 'active';
                  const isReleased = r.status === 'released';
                  const isConsumed = r.status === 'consumed';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.reservation_number}</td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900">{r.sku_code}</div>
                        <div className="text-[11px] text-slate-500">{r.variant_name}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{r.warehouse_name}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200">
                          {r.reference_type}: {r.reference_id || 'N/A'}
                        </span>
                        {r.notes && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[160px]">{r.notes}</p>}
                      </td>

                      <td className="py-3 px-3 text-right font-black text-amber-700 text-sm">
                        {Number(r.quantity).toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Active Hold
                          </span>
                        ) : isReleased ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Released
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Dispatched
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        <div>Created: {new Date(r.created_at).toLocaleDateString()}</div>
                        {r.expires_at && <div className="text-amber-600">Exp: {new Date(r.expires_at).toLocaleDateString()}</div>}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isActive ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleRelease(r)}
                              disabled={actionLoadingId === r.id}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center space-x-1"
                              title="Release hold back to available stock"
                            >
                              <Unlock className="w-3 h-3 text-slate-500" />
                              <span>Release</span>
                            </button>
                            <button
                              onClick={() => handleConsume(r)}
                              disabled={actionLoadingId === r.id}
                              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center space-x-1"
                              title="Dispatch order and deduct physical balance"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Consume</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">Archived</span>
                        )}
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
            Showing <span className="font-semibold">{reservations.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-semibold">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold">{total}</span> reservations
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
