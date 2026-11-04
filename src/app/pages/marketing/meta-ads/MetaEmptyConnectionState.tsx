// src/app/pages/marketing/meta-ads/MetaEmptyConnectionState.tsx
// Phase 27: Enterprise Empty State when no Meta Ads account is connected

import React from 'react';
import { Layers, ArrowRight, ShieldCheck, BarChart3, Database } from 'lucide-react';

export interface MetaEmptyConnectionStateProps {
  onConnect: () => void;
  onTriggerSampleSync?: () => void;
  onOpenSync?: () => void;
}

export function MetaEmptyConnectionState({ onConnect }: MetaEmptyConnectionStateProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-2xl mx-auto my-12 shadow-sm space-y-6">
      <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto text-blue-600 shadow-xs">
        <Layers className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          No Meta Ads Account Connected
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Connect your Meta Business Manager or Ads Account to unlock live analytics, spend tracking, campaign optimization, and audience demographics.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-lg mx-auto py-2">
        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Secure Token
          </div>
          <p className="text-[11px] text-slate-500">
            Encrypted OAuth2 token storage in Jyotsvan Core.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Database className="w-4 h-4 text-blue-600" /> Zero Direct API
          </div>
          <p className="text-[11px] text-slate-500">
            High-speed queries from local synchronized tables.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <BarChart3 className="w-4 h-4 text-purple-600" /> Full Telemetry
          </div>
          <p className="text-[11px] text-slate-500">
            Audience, age/gender, placements, and ROAS.
          </p>
        </div>
      </div>

      <div>
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm"
        >
          <span>Connect Meta Ads Account</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
