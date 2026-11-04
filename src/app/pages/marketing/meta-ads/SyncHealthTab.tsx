// src/app/pages/marketing/meta-ads/SyncHealthTab.tsx
// Phase 27: Synchronization Health, Execution Logs & Audit Exceptions

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  Layers,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { metaApi } from '../../../../services/metaApi.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import type { IntegrationSyncJob } from '../../../../types/integrations.ts';
import type { MetaSyncAttentionItem } from '../../../../types/meta.ts';

export interface SyncHealthTabProps {
  onOpenSync: () => void;
  onOpenConfig: () => void;
}

export function SyncHealthTab({ onOpenSync, onOpenConfig }: SyncHealthTabProps) {
  const [syncJobs, setSyncJobs] = useState<IntegrationSyncJob[]>([]);
  const [exceptions, setExceptions] = useState<MetaSyncAttentionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      metaApi.getRecentJobs(),
      metaAnalyticsApi.getSyncAttention(),
    ])
      .then(([jobs, attRes]) => {
        setSyncJobs(jobs || []);
        setExceptions(attRes.items || []);
      })
      .catch((err) => console.error('Failed to load sync health:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">ETL Pipeline Status</span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-base font-bold text-slate-900">Synchronized</span>
            </div>
            <p className="text-[11px] text-slate-400">Scheduled hourly background sync</p>
          </div>
          <button
            onClick={onOpenSync}
            className="p-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition"
            title="Trigger Manual Sync"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Integration Security</span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-base font-bold text-slate-900">Encrypted Token Vault</span>
            </div>
            <p className="text-[11px] text-slate-400">AES-256 GCM Server Protection</p>
          </div>
          <button
            onClick={onOpenConfig}
            className="p-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition"
            title="Configure Credentials"
          >
            <Key className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Sync Attention Alerts</span>
            <div className="text-base font-bold text-slate-900">
              {exceptions.length} Attention Item{exceptions.length === 1 ? '' : 's'}
            </div>
            <p className="text-[11px] text-slate-400">
              {exceptions.length === 0 ? 'Zero active discrepancies' : 'Action recommended'}
            </p>
          </div>
          <div className={`p-2.5 rounded-xl ${exceptions.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sync Health & Architecture Checklist */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <span>Synchronized Pipeline Health & Architectural Guarantees</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Zero Direct Meta API Execution in Dashboard</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              All metrics and breakdowns are queried exclusively from Jyotsvan's local relational tables for sub-50ms analytics rendering.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Strict Attribution Separation</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Meta-reported conversion values and ROAS are clearly isolated from Jyotsvan's internal order and store revenues.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Full Audit Trail Logging</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every sync job, manual trigger, credential alteration, and reconciliation run is recorded in Phase 23 Audit Logs.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Automated Daily & Hourly Incremental Sync</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Campaigns, ad sets, ads, creatives, demographics, placements, and devices are kept fresh via the sync worker.
            </p>
          </div>
        </div>
      </div>

      {/* Sync Attention Items List */}
      {exceptions.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-amber-50/50 border-b border-amber-200 font-bold text-xs text-amber-900 flex items-center justify-between">
            <span>Discrepancy & Sync Exception Items</span>
            <span className="text-[11px] font-medium text-amber-700">Requires Review</span>
          </div>
          <div className="divide-y divide-amber-100">
            {exceptions.map((ex) => (
              <div key={ex.id} className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900">{ex.title}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{ex.description}</p>
                  {ex.actionSuggestion && (
                    <p className="text-[11px] text-amber-800 font-medium">{ex.actionSuggestion}</p>
                  )}
                </div>
                <button
                  onClick={onOpenSync}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition shrink-0"
                >
                  Resolve Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sync Jobs Log */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-900 flex items-center justify-between">
          <span>Recent Execution Runs</span>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-normal"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-3">Sync Type</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Records Synced</th>
                <th className="py-3 px-3">Started At</th>
                <th className="py-3 px-4">Completed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading sync history...
                  </td>
                </tr>
              ) : syncJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No sync jobs recorded yet.
                  </td>
                </tr>
              ) : (
                syncJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-900">
                      {job.id.slice(0, 12)}...
                    </td>
                    <td className="py-3 px-3 capitalize">{job.sync_type || 'full'}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : job.status === 'RUNNING'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                      {job.records_processed ?? 0}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {job.started_at ? new Date(job.started_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {job.completed_at ? new Date(job.completed_at).toLocaleString() : 'Running...'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
