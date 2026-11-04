// src/app/pages/marketing/meta-ads/CampaignDetailDrawer.tsx
// Phase 27: Campaign Drilldown Detail Drawer with Child AdSets & Ads

import React, { useEffect, useState } from 'react';
import {
  X,
  Layers,
  Calendar,
  DollarSign,
  TrendingUp,
  Target,
  MousePointer,
  Eye,
  Award,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { MetaCampaign, MetaAdSet, MetaAd, MetaTrendPoint } from '../../../../types/meta.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/metaMetrics.ts';

export interface CampaignDetailDrawerProps {
  campaignId: string | null;
  startDate: string;
  endDate: string;
  currency?: string;
  onClose: () => void;
  onSelectAdSet?: (adSetId: string) => void;
  onSelectAd?: (adId: string) => void;
}

export function CampaignDetailDrawer({
  campaignId,
  startDate,
  endDate,
  currency = 'INR',
  onClose,
  onSelectAdSet,
  onSelectAd,
}: CampaignDetailDrawerProps) {
  const [data, setData] = useState<{
    campaign: MetaCampaign;
    trends: MetaTrendPoint[];
    adSets: MetaAdSet[];
    ads: MetaAd[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'adsets' | 'ads'>('adsets');

  useEffect(() => {
    if (!campaignId) {
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    metaAnalyticsApi
      .getCampaignDetail(campaignId, { startDate, endDate })
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load campaign detail');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [campaignId, startDate, endDate]);

  if (!campaignId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 truncate max-w-md">
                  {data?.campaign.name || 'Campaign Overview'}
                </h2>
                {data?.campaign.status && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      data.campaign.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {data.campaign.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                ID: {data?.campaign.external_campaign_id || campaignId} • Objective: {data?.campaign.objective || 'OUTCOME_SALES'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-sm text-slate-500 animate-pulse">
              Loading campaign analytics...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Campaign Key Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Spend</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCurrency(data.campaign.spend, currency)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Conversions</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCount(data.campaign.conversions)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">ROAS</div>
                  <div className="text-base font-bold text-emerald-600 mt-0.5">
                    {formatROAS(data.campaign.roas)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">CPA</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCurrency(data.campaign.cpa, currency)}
                  </div>
                </div>
              </div>

              {/* Secondary Metrics Bar */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">Impressions</div>
                  <div className="font-semibold text-slate-800">{formatCount(data.campaign.impressions)}</div>
                </div>
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">Reach</div>
                  <div className="font-semibold text-slate-800">{formatCount(data.campaign.reach)}</div>
                </div>
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">Clicks</div>
                  <div className="font-semibold text-slate-800">{formatCount(data.campaign.clicks)}</div>
                </div>
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">CTR</div>
                  <div className="font-semibold text-slate-800">{formatPercentage(data.campaign.ctr)}</div>
                </div>
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">CPC</div>
                  <div className="font-semibold text-slate-800">{formatCurrency(data.campaign.cpc, currency)}</div>
                </div>
                <div className="p-2 border border-slate-100 rounded-lg">
                  <div className="text-[10px] text-slate-400">CPM</div>
                  <div className="font-semibold text-slate-800">{formatCurrency(data.campaign.cpm, currency)}</div>
                </div>
              </div>

              {/* Trend Chart */}
              {data.trends.length > 0 && (
                <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-900">Campaign Daily Trajectory</div>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.trends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(val: number) => formatCurrency(val, data.campaign.currency || 'INR')}
                        />
                        <Area type="monotone" dataKey="spend" stroke="#2563eb" fill="#dbeafe" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Hierarchy Child Tabs: Ad Sets & Ads */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab('adsets')}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
                      activeTab === 'adsets'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Child Ad Sets ({data.adSets.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('ads')}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
                      activeTab === 'ads'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Child Ads ({data.ads.length})
                  </button>
                </div>

                {activeTab === 'adsets' ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {data.adSets.length > 0 ? (
                      data.adSets.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => onSelectAdSet?.(s.id)}
                          className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-900">{s.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {s.optimization_goal || 'CONVERSIONS'} • {s.billing_event || 'IMPRESSIONS'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-900">
                              {formatCurrency(s.spend, currency)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {formatCount(s.conversions)} conv • {formatROAS(s.roas)} ROAS
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No ad sets linked to this campaign.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {data.ads.length > 0 ? (
                      data.ads.map((ad) => (
                        <div
                          key={ad.id}
                          onClick={() => onSelectAd?.(ad.id)}
                          className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {ad.creative?.image_url || ad.creative?.thumbnail_url ? (
                              <img
                                src={ad.creative.thumbnail_url || ad.creative.image_url}
                                alt={ad.name}
                                className="w-9 h-9 rounded object-cover border border-slate-200"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                                Ad
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-semibold text-slate-900">{ad.name}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {ad.status} • {formatPercentage(ad.ctr)} CTR
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-900">
                              {formatCurrency(ad.spend, currency)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {formatCount(ad.conversions)} conv
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No ads linked to this campaign.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
