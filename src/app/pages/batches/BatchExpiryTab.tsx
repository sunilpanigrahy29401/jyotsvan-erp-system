import React, { useState, useEffect } from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldAlert,
  RotateCw,
  Search,
  Lock,
} from 'lucide-react';
import { batchApi } from '../../../services/batchApi';
import type { Batch } from '../../../types/batches';

interface BatchExpiryTabProps {
  onInspectBatch: (batchId: string) => void;
  onPlaceHold: (batch: Batch) => void;
}

export function BatchExpiryTab({ onInspectBatch, onPlaceHold }: BatchExpiryTabProps) {
  const [criticalBatches, setCriticalBatches] = useState<Batch[]>([]);
  const [expiredBatches, setExpiredBatches] = useState<Batch[]>([]);
  const [nearExpiryBatches, setNearExpiryBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // FEFO Simulator State
  const [skus, setSkus] = useState<Array<{ id: string; sku: string; product_name: string }>>([]);
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [reqQty, setReqQty] = useState<number | ''>(100);
  const [fefoResult, setFefoResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      batchApi.getBatches({ expiryFilter: 'near_30', limit: 50 }),
      batchApi.getBatches({ expiryFilter: 'expired', limit: 50 }),
      batchApi.getBatches({ expiryFilter: 'near_90', limit: 50 }),
      fetch('/api/products/skus').then((r) => r.json()).catch(() => ({ skus: [] })),
    ])
      .then(([near30Data, expData, near90Data, skuData]) => {
        setCriticalBatches(near30Data.batches);
        setExpiredBatches(expData.batches);
        setNearExpiryBatches(near90Data.batches.filter((b) => (b.days_to_expiry || 0) > 30));
        const sList = skuData.skus || [];
        setSkus(sList);
        if (sList.length > 0) {
          setSelectedSkuId(sList[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load shelf-life data:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSimulateFefo = async () => {
    if (!selectedSkuId || reqQty === '' || Number(reqQty) <= 0) return;
    setIsSimulating(true);
    try {
      const data = await batchApi.getFefoAllocations(selectedSkuId, Number(reqQty));
      setFefoResult(data);
    } catch (err) {
      console.error('FEFO simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Expired Batches</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-700">{expiredBatches.length}</span>
            <span className="text-xs text-rose-600 font-medium">Require quarantine / disposal</span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Critical (&lt; 30 Days)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-700">{criticalBatches.length}</span>
            <span className="text-xs text-amber-600 font-medium">Priority for immediate dispatch/use</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">FEFO Monitor (&lt; 90 Days)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-700">{nearExpiryBatches.length}</span>
            <span className="text-xs text-emerald-600 font-medium">Within target consumption window</span>
          </div>
        </div>
      </div>

      {/* Interactive FEFO Allocation Simulator */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Interactive FEFO (First-Expiring-First-Out) Allocation Simulator</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test the algorithmic lot recommendation engine to ensure oldest approved inventory is dispatched or consumed first
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Target SKU</label>
            <select
              value={selectedSkuId}
              onChange={(e) => setSelectedSkuId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sku} — {s.product_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Required Quantity</label>
            <input
              type="number"
              min="1"
              value={reqQty}
              onChange={(e) => setReqQty(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 250"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSimulateFefo}
              disabled={isSimulating}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              {isSimulating ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
              <span>Compute FEFO Pick List</span>
            </button>
          </div>
        </div>

        {/* FEFO Pick Simulation Result Table */}
        {fefoResult && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">
                Recommended Batches to Pick ({fefoResult.allocations.length} lots identified)
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded-sm ${
                  fefoResult.isFullyAllocated ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {fefoResult.isFullyAllocated
                  ? `Fully Allocated (${fefoResult.totalAllocated} units)`
                  : `Partial: ${fefoResult.totalAllocated} allocated (${fefoResult.remainingUnfulfilled} unfulfilled)`}
              </span>
            </div>

            {fefoResult.allocations.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                No available released inventory found for this SKU.
              </p>
            ) : (
              <div className="space-y-2">
                {fefoResult.allocations.map((a: any, idx: number) => (
                  <div
                    key={a.batch_id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px]">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-mono font-bold text-slate-900 block">{a.batch_number}</span>
                        <span className="text-[11px] text-slate-500">
                          Facility: {a.warehouse_name} • Expiry: {a.expiry_date ? new Date(a.expiry_date).toLocaleDateString() : 'N/A'}{' '}
                          ({a.days_to_expiry ? `${a.days_to_expiry}d left` : 'Fresh'})
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700 text-sm block">Pick: {a.allocated_quantity} units</span>
                      <span className="text-[10px] text-slate-400">Total Lot Available: {a.available_quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Critical & Expired List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Critical Shelf-Life Risk Register (&lt; 30 Days or Expired)
          </h3>
          <span className="text-xs font-medium text-slate-500">{criticalBatches.length + expiredBatches.length} items flagged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Days Left</th>
                <th className="py-3 px-4 text-right">In Stock Qty</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {criticalBatches.concat(expiredBatches).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No batches currently at critical shelf-life risk.
                  </td>
                </tr>
              ) : (
                criticalBatches.concat(expiredBatches).map((b) => {
                  const isExp = (b.days_to_expiry || 0) < 0;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{b.batch_number}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{b.product_name}</td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${isExp ? 'text-rose-600' : 'text-amber-600'}`}>
                          {isExp ? `Expired (${Math.abs(b.days_to_expiry!)}d)` : `${b.days_to_expiry} days`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {b.current_quantity} {b.unit_short_code}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => onInspectBatch(b.id)}
                            className="px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => onPlaceHold(b)}
                            className="px-2.5 py-1 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                          >
                            Quarantine
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
