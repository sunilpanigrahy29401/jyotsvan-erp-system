import React, { useState, useEffect } from 'react';
import { Search, Package, Warehouse, History, Lock, SlidersHorizontal, ArrowRightLeft } from 'lucide-react';
import { inventoryApi } from '../../../services/inventoryApi';
import { LoadingState } from '../../../components/ui/loading-state';
import type { Sku360Profile } from '../../../types/inventory';

interface Sku360ProfileTabProps {
  selectedSkuId?: string | null;
  onOpenAdjustment: (skuId: string) => void;
  onOpenTransfer: (skuId: string) => void;
}

export function Sku360ProfileTab({
  selectedSkuId,
  onOpenAdjustment,
  onOpenTransfer,
}: Sku360ProfileTabProps) {
  const [skus, setSkus] = useState<Array<{ id: string; sku: string; variant_name: string; product_name: string }>>([]);
  const [currentSkuId, setCurrentSkuId] = useState<string>(selectedSkuId || '');
  const [profile, setProfile] = useState<Sku360Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load SKU options
  useEffect(() => {
    fetch('/api/skus?limit=100')
      .then((r) => r.json())
      .then((data) => {
        if (data.skus) {
          setSkus(data.skus);
          if (!currentSkuId && data.skus.length > 0) {
            setCurrentSkuId(data.skus[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Update when prop changes
  useEffect(() => {
    if (selectedSkuId) {
      setCurrentSkuId(selectedSkuId);
    }
  }, [selectedSkuId]);

  // Fetch profile
  useEffect(() => {
    if (!currentSkuId) return;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const data = await inventoryApi.getSku360(currentSkuId);
        setProfile(data);
      } catch (err) {
        console.error('Failed to load SKU profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [currentSkuId]);

  return (
    <div className="space-y-6">
      {/* Top Selector Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 flex-shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Canonical SKU 360-Degree Inspector</h3>
            <p className="text-xs text-slate-500">Live multi-depot inventory visibility, safety stock, and consumption ledger</p>
          </div>
        </div>

        <div className="w-full sm:w-80">
          <select
            value={currentSkuId}
            onChange={(e) => setCurrentSkuId(e.target.value)}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          >
            {skus.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sku} — {s.product_name} ({s.variant_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="py-16 bg-white rounded-xl border border-slate-200">
          <LoadingState message="Aggregating SKU 360 Profile" description="Querying live balances and movement ledgers across all storage nodes..." />
        </div>
      )}

      {profile && !isLoading && (
        <div className="space-y-6">
          {/* Executive SKU Summary Header */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xl font-bold text-slate-900">{profile.sku.sku}</span>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {profile.sku.variant_name}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    {profile.sku.category_name || 'Personal Care'}
                  </span>
                </div>
                <h2 className="text-base font-medium text-slate-700 mt-1">{profile.sku.product_name}</h2>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => onOpenAdjustment(profile.sku.id)}
                  className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Adjust Stock</span>
                </button>
                <button
                  onClick={() => onOpenTransfer(profile.sku.id)}
                  className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Transfer Stock</span>
                </button>
              </div>
            </div>

            {/* Metrics Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available For Sale</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {Number(profile.totals.total_available).toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400">Unrestricted pool</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Reservations</span>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {Number(profile.totals.total_reserved).toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400">Locked in {profile.activeReservations.length} orders</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Physical Stock</span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {Number(profile.totals.total_physical).toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400">Across {profile.balances.length} storage bays</span>
              </div>

              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Inventory Valuation</span>
                <div className="text-2xl font-black text-indigo-900 mt-1">
                  ₹{Number(profile.totals.estimated_valuation || 0).toLocaleString()}
                </div>
                <span className="text-[11px] text-indigo-600">
                  @ ₹{profile.sku.unit_price_cents ? (profile.sku.unit_price_cents / 100).toFixed(2) : 0} per unit
                </span>
              </div>
            </div>
          </div>

          {/* Depot & Warehouse Distribution Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Warehouse className="w-4 h-4 text-slate-500" />
                <span>Depot & Warehouse Distribution ({profile.balances.length} nodes)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Warehouse Facility</th>
                    <th className="py-2.5 px-4">Storage Bay / Location</th>
                    <th className="py-2.5 px-4 text-right text-emerald-700">Available</th>
                    <th className="py-2.5 px-4 text-right text-amber-700">Reserved</th>
                    <th className="py-2.5 px-4 text-right text-rose-700">Damaged</th>
                    <th className="py-2.5 px-4 text-right text-purple-700">Quarantine</th>
                    <th className="py-2.5 px-4 text-right font-bold text-slate-900">Total Physical</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profile.balances.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {b.warehouse_name} ({b.warehouse_code})
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {b.location_name ? `${b.location_name} (${b.location_code})` : 'Default Bay'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 text-sm">
                        {Number(b.available_quantity).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-600">
                        {Number(b.reserved_quantity).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 font-medium">
                        {Number(b.damaged_quantity).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-purple-600 font-medium">
                        {Number(b.quarantine_quantity).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                        {Number(b.total_quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Reservations & Recent Movements Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Reservations */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Active Reservations ({profile.activeReservations.length})</span>
                </h3>
              </div>

              {profile.activeReservations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No active stock reservations or holds for this SKU.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Reservation #</th>
                        <th className="py-2 px-3">Depot</th>
                        <th className="py-2 px-3">Channel / Order</th>
                        <th className="py-2 px-3 text-right">Reserved Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profile.activeReservations.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{r.reservation_number}</td>
                          <td className="py-2.5 px-3 text-slate-600">{r.warehouse_name}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-800 border border-amber-200">
                              {r.reference_type}: {r.reference_id || 'N/A'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                            {Number(r.quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Movement Timeline */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Recent Ledger Movements ({profile.recentMovements.length})</span>
                </h3>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {profile.recentMovements.slice(0, 10).map((m) => {
                  const isPos = m.movement_type.includes('increase') || m.movement_type.includes('intake') || m.movement_type.includes('transfer_in') || m.movement_type.includes('opening');
                  return (
                    <div key={m.id} className="p-3.5 hover:bg-slate-50 flex items-start justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize ${isPos ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                            {m.movement_type.replace(/_/g, ' ')}
                          </span>
                          <span className="font-semibold text-slate-700">{m.warehouse_name}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-1">{m.reason || 'Ledger event'}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Balance: {Number(m.before_quantity)} → {Number(m.after_quantity)}
                        </span>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className={`font-mono font-bold text-sm ${isPos ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {isPos ? '+' : '-'}{Number(m.quantity).toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
