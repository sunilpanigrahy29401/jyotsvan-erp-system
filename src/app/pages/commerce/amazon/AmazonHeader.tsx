// src/app/pages/commerce/amazon/AmazonHeader.tsx
// Phase 31: Amazon SP-API Header & Marketplace Controls

import React from 'react';
import {
  ShoppingBag,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap,
} from 'lucide-react';
import type { AmazonMarketplace, AmazonOverviewResponse } from '../../../../types/amazon.ts';

interface AmazonHeaderProps {
  overview: AmazonOverviewResponse | null;
  selectedMarketplace: string;
  onMarketplaceChange: (mktId: string) => void;
  onOpenSyncModal: () => void;
  onOpenConfigModal: () => void;
  onTestConnection: () => void;
  isTesting: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function AmazonHeader({
  overview,
  selectedMarketplace,
  onMarketplaceChange,
  onOpenSyncModal,
  onOpenConfigModal,
  onTestConnection,
  isTesting,
  isRefreshing,
  onRefresh,
}: AmazonHeaderProps) {
  const isConnected = overview?.isConnected ?? true;
  const marketplaces = overview?.marketplaces || [];
  const currentMkt = marketplaces.find((m) => m.marketplace_id === selectedMarketplace) || marketplaces[0];

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Status */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Amazon Marketplace Hub</h1>
              <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SP-API Live</span>
              </div>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono border border-slate-200">
                v2026.1
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>Seller ID: <strong className="text-slate-700 font-mono">A2JYOTSVANORGANICS</strong></span>
              <span>•</span>
              <span>FBA & MFN Multi-Channel Bridge</span>
              <span>•</span>
              <a
                href="https://sellercentral.amazon.in"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium"
              >
                Seller Central <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Marketplace Selector */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
            <span className="text-xs text-slate-500 font-medium mr-2">Marketplace:</span>
            <select
              value={selectedMarketplace}
              onChange={(e) => onMarketplaceChange(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Marketplaces (Global)</option>
              {marketplaces.map((m) => (
                <option key={m.marketplace_id} value={m.marketplace_id}>
                  {m.name} ({m.country_code} - {m.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Test Connection Button */}
          <button
            onClick={onTestConnection}
            disabled={isTesting}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition disabled:opacity-50"
            title="Test Amazon SP-API Connectivity & Latency"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-500 ${isTesting ? 'animate-bounce' : ''}`} />
            <span>{isTesting ? 'Testing...' : 'Test Auth'}</span>
          </button>

          {/* Refresh Overview Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition disabled:opacity-50"
            title="Reload telemetry & metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Manual Sync Modal Button */}
          <button
            onClick={onOpenSyncModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Hub</span>
          </button>

          {/* Configuration Settings Button */}
          <button
            onClick={onOpenConfigModal}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
