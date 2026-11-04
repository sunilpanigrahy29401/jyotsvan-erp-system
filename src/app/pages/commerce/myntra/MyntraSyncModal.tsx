// src/app/pages/commerce/myntra/MyntraSyncModal.tsx
import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { myntraApi } from '../../../../services/myntraApi.ts';

interface MyntraSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynced: () => void;
}

export function MyntraSyncModal({ isOpen, onClose, onSynced }: MyntraSyncModalProps) {
  const [syncType, setSyncType] = useState<'incremental' | 'full'>('incremental');
  const [entities, setEntities] = useState<string[]>(['orders', 'inventory', 'listings', 'returns']);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const toggleEntity = (ent: string) => {
    if (entities.includes(ent)) {
      setEntities(entities.filter((e) => e !== ent));
    } else {
      setEntities([...entities, ent]);
    }
  };

  const handleExecute = async () => {
    if (entities.length === 0) {
      alert('Please select at least one entity to sync.');
      return;
    }
    try {
      setIsSyncing(true);
      const res = await myntraApi.executeSync({
        syncType,
        entities,
        windowDays: syncType === 'full' ? 60 : 7,
      });
      alert(`Sync completed successfully in ${res.durationMs}ms. Records processed: ${res.summary?.ordersProcessed || 0} orders.`);
      onSynced();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-pink-600" />
            <h3 className="text-sm font-bold text-slate-900">Synchronize Myntra Marketplace Data</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-2">Sync Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSyncType('incremental')}
                className={`p-2.5 rounded-lg border text-left transition-colors ${
                  syncType === 'incremental'
                    ? 'border-pink-500 bg-pink-50/50 text-pink-900 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div>Incremental Sync</div>
                <div className="text-[11px] text-slate-400 font-normal mt-0.5">Last 7 days mutations</div>
              </button>
              <button
                type="button"
                onClick={() => setSyncType('full')}
                className={`p-2.5 rounded-lg border text-left transition-colors ${
                  syncType === 'full'
                    ? 'border-pink-500 bg-pink-50/50 text-pink-900 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div>Full Historical Sync</div>
                <div className="text-[11px] text-slate-400 font-normal mt-0.5">Reconcile 60 days</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-2">Entities to Ingest</label>
            <div className="space-y-1.5">
              {[
                { id: 'orders', label: 'PPMP Orders & Dispatches' },
                { id: 'inventory', label: 'Inventory & Safety Buffers' },
                { id: 'listings', label: 'Catalog Style Articles' },
                { id: 'returns', label: 'Returns & Reverse Logistics' },
                { id: 'performance', label: 'SLA Performance Benchmarks' },
              ].map((ent) => (
                <label
                  key={ent.id}
                  className="flex items-center space-x-2.5 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={entities.includes(ent.id)}
                    onChange={() => toggleEntity(ent.id)}
                    className="rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="font-medium text-slate-700">{ent.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={isSyncing}
              className="inline-flex items-center px-4 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronizing...' : 'Run Sync Job'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
