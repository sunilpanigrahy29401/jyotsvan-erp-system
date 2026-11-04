import React, { useEffect, useState } from 'react';
import { X, Package, Warehouse, History, Lock, AlertTriangle, CheckCircle, TrendingUp, SlidersHorizontal, ArrowRightLeft } from 'lucide-react';
import { inventoryApi } from '../../../services/inventoryApi';
import { LoadingState } from '../../../components/ui/loading-state';
import type { Sku360Profile } from '../../../types/inventory';

interface SkuDetailsDrawerModalProps {
  skuId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAdjustment?: (skuId: string) => void;
  onOpenTransfer?: (skuId: string) => void;
}

export function SkuDetailsDrawerModal({
  skuId,
  isOpen,
  onClose,
  onOpenAdjustment,
  onOpenTransfer,
}: SkuDetailsDrawerModalProps) {
  const [profile, setProfile] = useState<Sku360Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !skuId) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await inventoryApi.getSku360(skuId);
        setProfile(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load SKU stock profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isOpen, skuId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/75 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {profile?.sku ? profile.sku.sku : 'SKU Stock Profile'}
                </h2>
                {profile?.sku && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {profile.sku.variant_name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {profile?.sku ? `${profile.sku.product_name} • Category: ${profile.sku.category_name || 'General'}` : 'Loading SKU telemetry...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading && (
            <div className="py-12">
              <LoadingState message="Aggregating SKU 360 Telemetry" description="Querying multi-warehouse balances, reservations, and movement ledger..." />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {profile && !isLoading && (
            <>
              {/* Top KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Stock</span>
                  <div className="mt-1 text-2xl font-bold text-emerald-600">
                    {Number(profile.totals.total_available).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400">Ready for order fulfillment</span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reserved Stock</span>
                  <div className="mt-1 text-2xl font-bold text-amber-600">
                    {Number(profile.totals.total_reserved).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400">Locked in active orders</span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Damaged / Quarantine</span>
                  <div className="mt-1 text-2xl font-bold text-rose-600">
                    {(Number(profile.totals.total_damaged) + Number(profile.totals.total_quarantine)).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {Number(profile.totals.total_damaged)} dmg • {Number(profile.totals.total_quarantine)} quar
                  </span>
                </div>

                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Stock Valuation</span>
                  <div className="mt-1 text-2xl font-bold text-indigo-900">
                    ₹{Number(profile.totals.estimated_valuation || 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-indigo-600">
                    {Number(profile.totals.total_physical).toLocaleString()} total units @ ₹{profile.sku.unit_price_cents ? (profile.sku.unit_price_cents / 100).toFixed(2) : 0}
                  </span>
                </div>
              </div>

              {/* Warehouse Depot Distribution */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Warehouse className="w-4 h-4 text-slate-500" />
                    <span>Depot & Warehouse Breakdown</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    {onOpenAdjustment && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenAdjustment(profile.sku.id);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors flex items-center space-x-1"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Adjust Stock</span>
                      </button>
                    )}
                    {onOpenTransfer && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenTransfer(profile.sku.id);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center space-x-1"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Transfer Stock</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Warehouse / Depot</th>
                        <th className="py-2.5 px-3">Location / Bay</th>
                        <th className="py-2.5 px-3 text-right text-emerald-700">Available</th>
                        <th className="py-2.5 px-3 text-right text-amber-700">Reserved</th>
                        <th className="py-2.5 px-3 text-right text-rose-700">Damaged / Quar</th>
                        <th className="py-2.5 px-3 text-right font-bold">Total Physical</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profile.balances.map((bal) => (
                        <tr key={bal.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {bal.warehouse_name} ({bal.warehouse_code})
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {bal.location_name ? `${bal.location_name} (${bal.location_code})` : 'Default Bay'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            {Number(bal.available_quantity).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-amber-600">
                            {Number(bal.reserved_quantity).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-600">
                            {(Number(bal.damaged_quantity) + Number(bal.quarantine_quantity)).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {Number(bal.total_quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Reservations */}
              {profile.activeReservations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>Active Stock Holds & Order Allocations ({profile.activeReservations.length})</span>
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Reservation #</th>
                          <th className="py-2 px-3">Warehouse</th>
                          <th className="py-2 px-3">Reference / Order #</th>
                          <th className="py-2 px-3 text-right">Quantity</th>
                          <th className="py-2 px-3">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profile.activeReservations.map((res) => (
                          <tr key={res.id} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">
                              {res.reservation_number}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{res.warehouse_name}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-50 text-amber-800 border border-amber-200">
                                {res.reference_type}: {res.reference_id || 'N/A'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-amber-700">
                              {Number(res.quantity).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {new Date(res.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent Movement Ledger Stream */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Recent Stock Movements Ledger</span>
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Warehouse</th>
                        <th className="py-2 px-3 text-right">Qty</th>
                        <th className="py-2 px-3 text-right">Before → After</th>
                        <th className="py-2 px-3">Actor / Reason</th>
                        <th className="py-2 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profile.recentMovements.slice(0, 8).map((m) => {
                        const isPos = m.movement_type.includes('increase') || m.movement_type.includes('intake') || m.movement_type.includes('transfer_in') || m.movement_type.includes('opening');
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-semibold capitalize text-slate-800">
                              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${isPos ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              {m.movement_type.replace(/_/g, ' ')}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{m.warehouse_name}</td>
                            <td className={`py-2 px-3 text-right font-bold ${isPos ? 'text-emerald-700' : 'text-slate-800'}`}>
                              {isPos ? '+' : '-'}{Number(m.quantity).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500">
                              {Number(m.before_quantity)} → {Number(m.after_quantity)}
                            </td>
                            <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate" title={m.reason || ''}>
                              {m.reason || 'General Ledger Entry'}
                            </td>
                            <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                              {new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
