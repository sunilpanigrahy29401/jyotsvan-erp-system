// src/app/pages/marketing/google-ads/GoogleAdsSyncModal.tsx
// Phase 29: Google Ads Manual Synchronization Execution Modal

import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle2, Shield, Calendar } from 'lucide-react';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';

interface GoogleAdsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncCompleted: () => void;
}

export const GoogleAdsSyncModal: React.FC<GoogleAdsSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncCompleted,
}) => {
  const [syncType, setSyncType] = useState<'incremental' | 'historical'>('incremental');
  const [windowDays, setWindowDays] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; recordsProcessed?: number } | null>(null);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await googleAdsAnalyticsApi.triggerSync(syncType, windowDays);
      setResult({
        success: true,
        message: res.message,
        recordsProcessed: res.recordsProcessed,
      });
      setTimeout(() => {
        onSyncCompleted();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync execution failed';
      setResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Synchronize Google Ads</h3>
              <p className="text-xs text-slate-500">Run manual ETL pipeline job</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-2">Sync Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                onClick={() => setSyncType('incremental')}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  syncType === 'incremental'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">Incremental Sync</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Pulls recent delta changes and last 7-day conversions.
                </div>
              </label>

              <label
                onClick={() => setSyncType('historical')}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  syncType === 'historical'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">Historical Re-Sync</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Full 30-day lookback to capture conversion attribution lag.
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Lookback Window (Days)</label>
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="3">Last 3 Days</option>
              <option value="7">Last 7 Days (Recommended)</option>
              <option value="14">Last 14 Days</option>
              <option value="30">Last 30 Days (Full Month)</option>
            </select>
          </div>

          {result && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 ${
                result.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <X className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold">{result.message}</div>
                {result.recordsProcessed != null && (
                  <div className="text-[11px] mt-0.5 text-emerald-700">
                    {result.recordsProcessed} entities & daily performance records synchronized.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartSync}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Synchronizing...' : 'Start Sync Job'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
