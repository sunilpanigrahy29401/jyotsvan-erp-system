// src/app/pages/commerce/flipkart/FlipkartSyncModal.tsx
// Phase 32: Flipkart Trigger Synchronization Modal

import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Package, Layers, Archive, RotateCcw, TrendingUp } from 'lucide-react';
import { flipkartApi } from '../../../../services/flipkartApi.ts';

interface FlipkartSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FlipkartSyncModal({ isOpen, onClose, onSuccess }: FlipkartSyncModalProps) {
  const [syncEntities, setSyncEntities] = useState<string[]>([
    'orders',
    'listings',
    'inventory',
    'fulfillment',
    'returns',
    'performance',
  ]);
  const [fullRefresh, setFullRefresh] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const entityOptions = [
    { id: 'orders', label: 'Customer Orders & Line Items', icon: Package },
    { id: 'listings', label: 'Catalog Listings & Prices (FSN)', icon: Layers },
    { id: 'inventory', label: 'Multi-Location Stock (Smart/Direct)', icon: Archive },
    { id: 'fulfillment', label: 'Ekart Dispatches & Tracking SLAs', icon: Package },
    { id: 'returns', label: 'Customer Returns & Courier RTOs', icon: RotateCcw },
    { id: 'performance', label: 'Seller Performance Metrics & Tier', icon: TrendingUp },
  ];

  const toggleEntity = (id: string) => {
    if (syncEntities.includes(id)) {
      setSyncEntities(syncEntities.filter((e) => e !== id));
    } else {
      setSyncEntities([...syncEntities, id]);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await flipkartApi.triggerSync({
        entityType: 'all',
        syncType: fullRefresh ? 'full' : 'incremental',
        entities: syncEntities,
      });
      setResult(res);
      onSuccess();
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sync Flipkart Marketplace</h3>
              <p className="text-xs text-slate-500">Trigger manual bi-directional synchronization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Entities to Synchronize
            </label>
            <div className="space-y-2">
              {entityOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = syncEntities.includes(opt.id);

                return (
                  <label
                    key={opt.id}
                    className={`flex items-center space-x-3 p-2.5 rounded-lg border cursor-pointer transition text-xs ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 text-blue-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEntity(opt.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={fullRefresh}
                onChange={(e) => setFullRefresh(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Full Historical Re-Sync (Ignore incremental checkpoints)</span>
            </label>
          </div>

          {result && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start space-x-2 border ${
                result.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{result.success ? 'Sync Completed' : 'Sync Failed'}</p>
                <p className="mt-0.5">
                  {result.success
                    ? `Job ${result.jobId} processed ${
                        result.summary?.ordersProcessed +
                        result.summary?.listingsProcessed +
                        result.summary?.inventoryProcessed
                      } records in ${result.durationMs}ms.`
                    : result.error}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition"
            >
              Close
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || syncEntities.length === 0}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Executing Sync...' : 'Execute Sync'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
