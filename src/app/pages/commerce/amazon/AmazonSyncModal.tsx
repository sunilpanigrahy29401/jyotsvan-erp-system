// src/app/pages/commerce/amazon/AmazonSyncModal.tsx
// Phase 31: Amazon Manual Sync Execution Modal

import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Package,
  Boxes,
  RotateCcw,
  DollarSign,
  Percent,
} from 'lucide-react';
import { amazonApi } from '../../../../services/amazonApi.ts';

interface AmazonSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

export function AmazonSyncModal({ isOpen, onClose, onSyncComplete }: AmazonSyncModalProps) {
  const [syncEntities, setSyncEntities] = useState<string[]>([
    'orders',
    'products',
    'inventory',
    'returns',
    'settlements',
    'fees',
  ]);
  const [fullRefresh, setFullRefresh] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; recordsProcessed: number; details: any } | null>(null);

  if (!isOpen) return null;

  const toggleEntity = (entity: string) => {
    if (syncEntities.includes(entity)) {
      setSyncEntities(syncEntities.filter((e) => e !== entity));
    } else {
      setSyncEntities([...syncEntities, entity]);
    }
  };

  const handleStartSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (syncEntities.length === 0) return;

    setIsSyncing(true);
    setResult(null);
    try {
      const res = await amazonApi.triggerSync({
        entityType: 'all',
        syncType: fullRefresh ? 'full' : 'incremental',
        entities: syncEntities,
      });
      setResult(res);
      setTimeout(() => {
        onSyncComplete();
      }, 1200);
    } catch (err) {
      console.error('Manual Amazon sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const entityOptions = [
    { id: 'orders', name: 'Orders & Line Items', icon: <Package className="w-4 h-4 text-blue-600" /> },
    { id: 'products', name: 'Catalog Listings & ASINs', icon: <Package className="w-4 h-4 text-emerald-600" /> },
    { id: 'inventory', name: 'FBA & MFN Inventory Balances', icon: <Boxes className="w-4 h-4 text-purple-600" /> },
    { id: 'returns', name: 'Customer Returns & RTOs', icon: <RotateCcw className="w-4 h-4 text-rose-600" /> },
    { id: 'settlements', name: 'Financial Settlements & Payouts', icon: <DollarSign className="w-4 h-4 text-teal-600" /> },
    { id: 'fees', name: 'Referral & FBA Fee Ledger', icon: <Percent className="w-4 h-4 text-orange-600" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Amazon SP-API Data Synchronization</h3>
              <p className="text-xs text-slate-500">
                Poll Amazon endpoints and reconcile records into Jyotsvan ERP.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {result && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Sync Completed Successfully: </span>
              <span>Processed {result.recordsProcessed} entity records across Amazon SP-API channels.</span>
            </div>
          </div>
        )}

        <form onSubmit={handleStartSync} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Select Entities to Synchronize:
            </label>
            <div className="space-y-2">
              {entityOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                    syncEntities.includes(opt.id)
                      ? 'border-amber-400 bg-amber-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {opt.icon}
                    <span className="font-semibold text-slate-800">{opt.name}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={syncEntities.includes(opt.id)}
                    onChange={() => toggleEntity(opt.id)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fullRefresh}
                onChange={(e) => setFullRefresh(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="text-xs font-semibold text-slate-800">
                Perform Full Historical Refresh (Reset sync checkpoint)
              </span>
            </label>
            <p className="text-[11px] text-slate-500 mt-1 pl-6">
              When unchecked, only records updated since the last sync checkpoint will be retrieved.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSyncing || syncEntities.length === 0}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing with Amazon...' : 'Trigger Sync Now'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
