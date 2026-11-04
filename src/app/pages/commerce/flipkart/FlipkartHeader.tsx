// src/app/pages/commerce/flipkart/FlipkartHeader.tsx
// Phase 32: Flipkart Header & Actions Component

import React from 'react';
import {
  ShoppingBag,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap,
  Award,
} from 'lucide-react';
import type { FlipkartOverviewResponse } from '../../../../types/flipkart.ts';

interface FlipkartHeaderProps {
  overview: FlipkartOverviewResponse | null;
  onOpenSyncModal: () => void;
  onOpenConfigModal: () => void;
  onTestConnection: () => void;
  isTesting: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function FlipkartHeader({
  overview,
  onOpenSyncModal,
  onOpenConfigModal,
  onTestConnection,
  isTesting,
  isRefreshing,
  onRefresh,
}: FlipkartHeaderProps) {
  const isConnected = overview?.isConnected ?? true;
  const sellerTier = overview?.kpis.sellerTier || 'Gold Tier';

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Status */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shadow-sm">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Flipkart Seller Hub</h1>
              <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Seller API v3 Live</span>
              </div>
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                <Award className="w-3 h-3 text-amber-600" />
                <span>{sellerTier}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>Seller ID: <strong className="text-slate-700 font-mono">FK_SELLER_JYOTSVAN_ORG</strong></span>
              <span>•</span>
              <span>Flipkart Smart (FBF) & Direct Dispatch</span>
              <span>•</span>
              <a
                href="https://seller.flipkart.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-blue-600 hover:underline gap-0.5"
              >
                Seller Portal <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Test Connection Button */}
          <button
            onClick={onTestConnection}
            disabled={isTesting}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition shadow-sm disabled:opacity-50"
            title="Test Flipkart API credentials"
          >
            <Zap className={`w-3.5 h-3.5 text-blue-600 ${isTesting ? 'animate-bounce' : ''}`} />
            <span>{isTesting ? 'Testing...' : 'Test Auth'}</span>
          </button>

          {/* Refresh Overview */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            title="Reload telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Configure Modal Trigger */}
          <button
            onClick={onOpenConfigModal}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Configure Gateway</span>
          </button>

          {/* Sync Trigger Button */}
          <button
            onClick={onOpenSyncModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Flipkart</span>
          </button>
        </div>
      </div>
    </div>
  );
}
