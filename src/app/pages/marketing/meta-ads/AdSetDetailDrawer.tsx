// src/app/pages/marketing/meta-ads/AdSetDetailDrawer.tsx
// Phase 27: Ad Set Detail Drawer

import React, { useEffect, useState } from 'react';
import { X, Layers, Target, DollarSign, Eye, MousePointer } from 'lucide-react';
import type { MetaAdSet, MetaAd } from '../../../../types/meta.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/metaMetrics.ts';

export interface AdSetDetailDrawerProps {
  adSetId: string | null;
  startDate: string;
  endDate: string;
  onClose: () => void;
  onSelectAd?: (adId: string) => void;
}

export function AdSetDetailDrawer({
  adSetId,
  startDate,
  endDate,
  onClose,
  onSelectAd,
}: AdSetDetailDrawerProps) {
  const [adSet, setAdSet] = useState<MetaAdSet | null>(null);
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!adSetId) {
      setAdSet(null);
      setAds([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.all([
      metaAnalyticsApi.getAdSets({ startDate, endDate }),
      metaAnalyticsApi.getAds({ adSetId, startDate, endDate }),
    ])
      .then(([adSetsRes, adsRes]) => {
        if (!isMounted) return;
        const found = adSetsRes.adSets.find((s) => s.id === adSetId || s.external_adset_id === adSetId);
        setAdSet(found || null);
        setAds(adsRes.ads);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [adSetId, startDate, endDate]);

  if (!adSetId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 truncate max-w-sm">
                  {adSet?.name || 'Ad Set Details'}
                </h2>
                {adSet?.status && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {adSet.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Ad Set ID: {adSet?.external_adset_id || adSetId}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-sm text-slate-500">Loading ad set...</div>
          ) : adSet ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Spend</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatCurrency(adSet.spend)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Conversions</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatCount(adSet.conversions)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">ROAS</div>
                  <div className="text-base font-bold text-emerald-600">
                    {formatROAS(adSet.roas)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">CPA</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatCurrency(adSet.cpa)}
                  </div>
                </div>
              </div>

              {/* Targeting & Configuration Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="font-bold text-slate-900">Delivery & Targeting Profile</div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400">Optimization Goal: </span>
                    <span className="font-medium text-slate-800">{adSet.optimization_goal || 'OFFSITE_CONVERSIONS'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Billing Event: </span>
                    <span className="font-medium text-slate-800">{adSet.billing_event || 'IMPRESSIONS'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Bid Strategy: </span>
                    <span className="font-medium text-slate-800">{adSet.bid_strategy || 'LOWEST_COST_WITHOUT_CAP'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Daily Budget: </span>
                    <span className="font-medium text-slate-800">
                      {adSet.daily_budget ? formatCurrency(adSet.daily_budget) : 'Dynamic CBO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Child Ads */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-900">
                  Ads in this Ad Set ({ads.length})
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {ads.map((ad) => (
                    <div
                      key={ad.id}
                      onClick={() => onSelectAd?.(ad.id)}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        {ad.creative?.image_url || ad.creative?.thumbnail_url ? (
                          <img
                            src={ad.creative.thumbnail_url || ad.creative.image_url}
                            alt=""
                            className="w-8 h-8 rounded object-cover border"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-100 text-[10px] flex items-center justify-center text-slate-400">
                            Ad
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{ad.name}</div>
                          <div className="text-[10px] text-slate-500">{ad.status}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">
                          {formatCurrency(ad.spend)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatCount(ad.conversions)} conv
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
