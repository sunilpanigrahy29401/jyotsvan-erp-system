// src/app/pages/marketing/google-ads/GoogleEmptyConnectionState.tsx
// Phase 29: Google Ads Empty & Disconnected Account State

import React from 'react';
import { Search, ShieldAlert, ArrowRight, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';

interface GoogleEmptyConnectionStateProps {
  onOpenConfigModal: () => void;
  onSyncSampleData?: () => void;
  isSyncing?: boolean;
}

export const GoogleEmptyConnectionState: React.FC<GoogleEmptyConnectionStateProps> = ({
  onOpenConfigModal,
  onSyncSampleData,
  isSyncing,
}) => {
  return (
    <div id="google-ads-empty-state" className="p-8 max-w-3xl mx-auto text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
        <Search className="w-8 h-8" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
        Connect Your Google Ads Account
      </h2>
      <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
        No active Google Ads connection was detected for this organization. Synchronize campaigns, ad groups, keywords, quality scores, search terms, and conversion actions directly into Jyotsvan.
      </p>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8 text-left">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs mb-2">
            01
          </div>
          <h3 className="text-xs font-bold text-slate-900">Unified Multi-Channel</h3>
          <p className="text-xs text-slate-500 mt-1">
            Search, Performance Max, Shopping, and YouTube Ads unified with Jyotsvan ERP.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs mb-2">
            02
          </div>
          <h3 className="text-xs font-bold text-slate-900">Keyword & Query Intelligence</h3>
          <p className="text-xs text-slate-500 mt-1">
            Track Quality Scores (1–10), match types, and high-converting search term queries.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs mb-2">
            03
          </div>
          <h3 className="text-xs font-bold text-slate-900">Automated ETL & Audit</h3>
          <p className="text-xs text-slate-500 mt-1">
            Hourly automated background sync with rate-limit defense and full change auditing.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onOpenConfigModal}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2"
        >
          <span>Configure Google Ads Connection</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {onSyncSampleData && (
          <button
            type="button"
            onClick={onSyncSampleData}
            disabled={isSyncing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Load Enterprise Sample Data</span>
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-1 text-xs text-slate-400">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
        <span>Enterprise OAuth 2.0 & Google Ads REST API v17 compliant. Read-only permissions by default.</span>
      </div>
    </div>
  );
};
