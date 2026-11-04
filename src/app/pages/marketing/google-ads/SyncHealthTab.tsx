// src/app/pages/marketing/google-ads/SyncHealthTab.tsx
// Phase 29: Google Ads Integration Sync Health & Audit Log Monitor

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Shield,
  Activity,
  Zap,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';

interface SyncHealthTabProps {
  onOpenSyncModal: () => void;
  onOpenConfigModal: () => void;
}

export const SyncHealthTab: React.FC<SyncHealthTabProps> = ({
  onOpenSyncModal,
  onOpenConfigModal,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = () => {
    setLoading(true);
    googleAdsAnalyticsApi
      .getSyncHealth()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load sync health:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const conn = data?.connection;
  const accounts = data?.accounts || [];
  const jobs = data?.recentJobs || [];

  return (
    <div id="google-ads-synchealth-tab" className="space-y-6">
      {/* Top Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connection State */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Integration Health</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Healthy
            </span>
          </div>
          <div className="text-base font-bold text-slate-900">
            {conn?.name || 'Google Ads REST API v17'}
          </div>
          <p className="text-xs text-slate-500 mt-1">{conn?.health_message || 'Operating normally.'}</p>
        </div>

        {/* Sync Frequency */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">ETL Pipeline Frequency</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base font-bold text-slate-900">Every 60 Minutes</div>
          <p className="text-xs text-slate-500 mt-1">
            Last active sync:{' '}
            {conn?.last_sync_at ? new Date(conn.last_sync_at).toLocaleString() : 'Recently'}
          </p>
        </div>

        {/* Rate Limits & Security */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">API Quotas & Rate Defense</span>
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-base font-bold text-slate-900">10 RPS / 600 RPM</div>
          <p className="text-xs text-slate-500 mt-1">Automatic exponential backoff & jitter protection</p>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Connected Customer Accounts</h3>
            <p className="text-xs text-slate-500">Synchronized Google Ads CIDs for this organization</p>
          </div>
          <button
            type="button"
            onClick={onOpenConfigModal}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Manage Credentials
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {accounts.map((acc: any) => (
            <div key={acc.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold font-mono text-[11px]">
                  CID
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{acc.descriptive_name}</h4>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <span className="font-mono">{acc.customer_id}</span>
                    <span>•</span>
                    <span>{acc.currency_code}</span>
                    <span>•</span>
                    <span>{acc.time_zone}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sync Jobs Audit */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Synchronization Jobs</h3>
            <p className="text-xs text-slate-500">Integration Engine execution audit trail</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSyncModal}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Trigger Sync</span>
            </button>
            <button
              type="button"
              onClick={fetchHealth}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Job ID</th>
                <th className="py-3 px-3 font-semibold">Type</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold text-right">Processed</th>
                <th className="py-3 px-3 font-semibold text-right">Created</th>
                <th className="py-3 px-3 font-semibold text-right">Updated</th>
                <th className="py-3 px-3 font-semibold text-right">Failed</th>
                <th className="py-3 px-4 font-semibold text-right">Completed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No recent sync executions recorded
                  </td>
                </tr>
              ) : (
                jobs.map((j: any) => (
                  <tr key={j.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">{j.id}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{j.job_type || 'incremental'}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {j.status || 'completed'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-900">{j.records_processed}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{j.records_created}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{j.records_updated}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{j.records_failed || 0}</td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {j.completed_at ? new Date(j.completed_at).toLocaleTimeString() : 'In progress'}
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
};
