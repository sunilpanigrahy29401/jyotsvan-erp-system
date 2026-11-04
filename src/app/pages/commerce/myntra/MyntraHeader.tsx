// src/app/pages/commerce/myntra/MyntraHeader.tsx
import React from 'react';
import {
  ShoppingBag,
  RefreshCw,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { MyntraOverviewResponse } from '../../../../types/myntra.ts';

interface MyntraHeaderProps {
  overview: MyntraOverviewResponse | null;
  onOpenSyncModal: () => void;
  onOpenConfigModal: () => void;
  onTestConnection: () => void;
  isTesting: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function MyntraHeader({
  overview,
  onOpenSyncModal,
  onOpenConfigModal,
  onTestConnection,
  isTesting,
  isRefreshing,
  onRefresh,
}: MyntraHeaderProps) {
  const isConnected = overview?.isConnected ?? false;
  const sellerTier = overview?.kpis?.sellerTier || 'Tier 1 Fashion Partner';

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title and Branding */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-0.5 shadow-sm">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-pink-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Myntra Partner Bridge
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
                PPMP / Omnichannel
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {sellerTier}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Myntra Pure Play Marketplace Partner integration, safety buffers, fashion catalog taxonomy, and RTO reversal.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 flex-wrap">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh Myntra operational telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={onTestConnection}
            disabled={isTesting}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-pink-600" />
            {isTesting ? 'Verifying...' : 'Test Connection'}
          </button>

          <button
            onClick={onOpenSyncModal}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Sync Now
          </button>

          <button
            onClick={onOpenConfigModal}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Settings
          </button>
        </div>
      </div>

      {/* Connectivity & Health Status Pill Bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="font-medium text-slate-700">
              {isConnected ? 'Bridge Active (PPMP Authorized)' : 'Simulation Mode'}
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            Seller Partner ID: <span className="font-mono text-slate-700">MYNTRA_PARTNER_JYOTSVAN</span>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            Dispatch Location: <span className="font-mono text-slate-700">STORE_BLR_01</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-slate-400">
          <span className="flex items-center text-emerald-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
            On-Time Dispatch SLA: 99.4%
          </span>
          <span>•</span>
          <span>Sync Cycle: Every 30m</span>
        </div>
      </div>
    </div>
  );
}
