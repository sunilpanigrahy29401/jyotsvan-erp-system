// src/app/pages/marketing/meta-ads/AdDetailDrawer.tsx
// Phase 27: Ad Unit Detail Drawer with Creative Previews & Telemetry

import React, { useEffect, useState } from 'react';
import { X, Sparkles, ExternalLink, Eye, MousePointer, Target, DollarSign } from 'lucide-react';
import type { MetaAd } from '../../../../types/meta.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/metaMetrics.ts';

export interface AdDetailDrawerProps {
  adId: string | null;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

export function AdDetailDrawer({ adId, startDate, endDate, onClose }: AdDetailDrawerProps) {
  const [ad, setAd] = useState<MetaAd | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!adId) {
      setAd(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    metaAnalyticsApi
      .getAds({ startDate, endDate })
      .then((res) => {
        if (!isMounted) return;
        const found = res.ads.find((a) => a.id === adId || a.external_ad_id === adId);
        setAd(found || null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [adId, startDate, endDate]);

  if (!adId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 truncate max-w-sm">
                  {ad?.name || 'Ad Unit Details'}
                </h2>
                {ad?.status && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {ad.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Ad ID: {ad?.external_ad_id || adId}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-sm text-slate-500">Loading ad details...</div>
          ) : ad ? (
            <>
              {/* Creative Media Preview */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="text-xs font-bold text-slate-900">Creative Media Preview</div>
                <div className="flex items-start gap-4">
                  {ad.creative?.image_url || ad.creative?.thumbnail_url ? (
                    <img
                      src={ad.creative.image_url || ad.creative.thumbnail_url}
                      alt={ad.creative.title || ad.name}
                      className="w-32 h-32 rounded-xl object-cover border border-slate-300 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-slate-200 flex items-center justify-center text-xs text-slate-400">
                      No Media
                    </div>
                  )}
                  <div className="space-y-1.5 flex-1 text-xs">
                    <div className="font-bold text-slate-900 text-sm">
                      {ad.creative?.title || 'Untitled Headline'}
                    </div>
                    <p className="text-slate-600 line-clamp-3 leading-relaxed">
                      {ad.creative?.body || 'No primary text body configured for this creative.'}
                    </p>
                    {ad.creative?.call_to_action_type && (
                      <div className="pt-2">
                        <span className="px-2.5 py-1 bg-blue-600 text-white font-semibold rounded-md text-[10px]">
                          {ad.creative.call_to_action_type.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Spend</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatCurrency(ad.spend)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Conversions</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatCount(ad.conversions)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">ROAS</div>
                  <div className="text-base font-bold text-emerald-600">
                    {formatROAS(ad.roas)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">CPA</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatCurrency(ad.cpa)}
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">Impressions</div>
                  <div className="font-semibold text-slate-800">{formatCount(ad.impressions)}</div>
                </div>
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">Reach</div>
                  <div className="font-semibold text-slate-800">{formatCount(ad.reach)}</div>
                </div>
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">Clicks</div>
                  <div className="font-semibold text-slate-800">{formatCount(ad.clicks)}</div>
                </div>
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">CTR</div>
                  <div className="font-semibold text-slate-800">{formatPercentage(ad.ctr)}</div>
                </div>
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">CPC</div>
                  <div className="font-semibold text-slate-800">{formatCurrency(ad.cpc)}</div>
                </div>
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">CPM</div>
                  <div className="font-semibold text-slate-800">{formatCurrency(ad.cpm)}</div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
