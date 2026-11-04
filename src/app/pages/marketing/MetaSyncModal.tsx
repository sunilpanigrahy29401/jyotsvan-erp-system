// src/app/pages/marketing/MetaSyncModal.tsx
// Phase 26: Meta Marketing On-Demand Synchronization Trigger Modal

import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  Layers,
  Calendar,
  Sparkles,
  Database,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { metaApi } from '../../../services/metaApi.ts';
import type { MetaSyncScope } from '../../../types/meta.ts';
import { useAuth } from '../../../context/AuthContext.tsx';

export interface MetaSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MetaSyncModal({ isOpen, onClose, onSuccess }: MetaSyncModalProps) {
  const { user } = useAuth();
  const [scope, setScope] = useState<MetaSyncScope>('all');
  const [days, setDays] = useState(7);
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTriggerSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    setError(null);
    setResult(null);

    try {
      const res = await metaApi.triggerSync(
        {
          scope,
          days,
        },
        user
      );
      setResult(res);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync execution failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncOptions: { id: MetaSyncScope; title: string; desc: string; icon: any }[] = [
    {
      id: 'all',
      title: 'Full Omni-Sync (Recommended)',
      desc: 'Synchronizes campaigns, ad sets, ads, creatives, and daily performance metrics.',
      icon: RefreshCw,
    },
    {
      id: 'campaigns',
      title: 'Campaigns & Budgets',
      desc: 'Pulls latest campaign statuses, lifetime/daily budgets, and objectives.',
      icon: Layers,
    },
    {
      id: 'adsets',
      title: 'Ad Sets & Optimization',
      desc: 'Refreshes targeting rules, bid strategies, and attribution windows.',
      icon: Sliders,
    },
    {
      id: 'creatives',
      title: 'Ad Creatives & Copy Assets',
      desc: 'Pulls visual thumbnail assets, body copy, headlines, and preview links.',
      icon: Sparkles,
    },
    {
      id: 'insights',
      title: 'Daily Telemetry & Metrics',
      desc: 'Fetches spend, impressions, clicks, purchases, CPA, and ROAS across the selected window.',
      icon: Database,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Synchronize Meta Marketing Data</h2>
              <p className="text-xs text-slate-500">
                Execute live Graph API v21.0 sync pipeline for your active ad account.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleTriggerSync} className="p-6 space-y-5">
          {/* Sync Scope Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Select Synchronization Scope</label>
            <div className="space-y-2">
              {syncOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = scope === opt.id;
                return (
                  <label
                    key={opt.id}
                    onClick={() => setScope(opt.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-300 text-blue-950'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="syncScope"
                      checked={isSelected}
                      onChange={() => setScope(opt.id)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                        <Icon className="w-3.5 h-3.5 text-blue-600" />
                        {opt.title}
                      </div>
                      <p className="text-[11px] text-slate-500">{opt.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Lookback Window */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Insights Lookback Window
            </label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value={1}>Today Only (Fastest)</option>
              <option value={3}>Last 3 Days</option>
              <option value={7}>Last 7 Days (Recommended)</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days (Full Month)</option>
              <option value={90}>Last 90 Days (Quarterly Telemetry)</option>
            </select>
          </div>

          {/* Feedback */}
          {result && (
            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold">Sync Completed: </span>
                {result.records_processed ?? 0} records processed across campaigns, ad sets, and insights.
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-semibold">Sync Failed: </span>
                {error}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSyncing}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronizing with Meta...' : 'Start Synchronization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
