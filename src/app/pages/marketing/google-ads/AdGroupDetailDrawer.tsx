// src/app/pages/marketing/google-ads/AdGroupDetailDrawer.tsx
// Phase 29: Ad Group Detail Drawer with Metrics & Keyword Attribution

import React from 'react';
import { X, Target, DollarSign, TrendingUp, Layers } from 'lucide-react';
import type { GoogleAdGroup } from '../../../../types/google-ads.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/googleAdsMetrics.ts';

interface AdGroupDetailDrawerProps {
  adGroup: GoogleAdGroup | null;
  onClose: () => void;
  currency?: string;
}

export const AdGroupDetailDrawer: React.FC<AdGroupDetailDrawerProps> = ({
  adGroup,
  onClose,
  currency = 'INR',
}) => {
  if (!adGroup) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col transform transition ease-in-out duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 truncate max-w-sm">
                {adGroup.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Campaign: {adGroup.campaign_name || 'N/A'}</span>
                <span>•</span>
                <span
                  className={`font-semibold ${
                    adGroup.status === 'ENABLED' ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  {adGroup.status}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500">Total Spend</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {formatCurrency(adGroup.spend, currency)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500">ROAS</span>
              <div className="text-lg font-bold text-emerald-600 mt-0.5">
                {formatROAS(adGroup.roas)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500">Conversions</span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {formatCount(adGroup.conversions)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500">Cost / Conv. (CPA)</span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {formatCurrency(adGroup.cpa, currency)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500">Clicks (CTR)</span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {formatCount(adGroup.clicks)}{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({formatPercentage(adGroup.ctr)})
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500">Avg. CPC</span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {formatCurrency(adGroup.cpc, currency)}
              </div>
            </div>
          </div>

          {/* Ad Group Config Overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <h3 className="font-bold text-slate-900">Ad Group Configuration</h3>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">External ID</span>
              <span className="font-mono text-slate-700">{adGroup.external_adgroup_id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Type</span>
              <span className="font-medium text-slate-700">{adGroup.type || 'SEARCH_STANDARD'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Max CPC Bid</span>
              <span className="font-medium text-slate-700">
                {adGroup.cpc_bid ? formatCurrency(adGroup.cpc_bid, currency) : 'Auto'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Last Synced</span>
              <span className="text-slate-700">
                {adGroup.last_synced_at ? new Date(adGroup.last_synced_at).toLocaleString() : 'Recently'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
