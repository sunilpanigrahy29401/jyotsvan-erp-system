// src/app/pages/marketing/meta-ads/OverviewTab.tsx
// Phase 27: Executive Overview Dashboard with Dual Trend Visualizations & Top Performers

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  BarChart2,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import type {
  MetaExecutiveOverviewData,
  MetaTopPerformer,
  MetaTrendPoint,
} from '../../../../types/meta.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/metaMetrics.ts';
import { MetaKPICardsGrid } from './MetaKPICardsGrid.tsx';

export interface OverviewTabProps {
  data?: MetaExecutiveOverviewData | null;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  comparisonEnabled?: boolean;
  compareStartDate?: string;
  compareEndDate?: string;
  comparisonType?: 'previous_period' | 'previous_year';
  currency?: string;
  hasComparison?: boolean;
  onSelectCampaign: (campaignId: string) => void;
  onSelectAd: (adId: string) => void;
  onNavigateTab?: (tabId: string) => void;
}

export function OverviewTab({
  data: initialData,
  accountId,
  startDate,
  endDate,
  comparisonEnabled = true,
  compareStartDate,
  compareEndDate,
  currency = 'INR',
  hasComparison = true,
  onSelectCampaign,
  onSelectAd,
  onNavigateTab,
}: OverviewTabProps) {
  const [fetchedData, setFetchedData] = useState<MetaExecutiveOverviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialData && (startDate || accountId)) {
      let isMounted = true;
      setLoading(true);
      import('../../../../services/metaAnalyticsApi.ts')
        .then((m) =>
          m.metaAnalyticsApi.getOverview({
            accountId,
            startDate,
            endDate,
            compareStartDate: comparisonEnabled ? compareStartDate : undefined,
            compareEndDate: comparisonEnabled ? compareEndDate : undefined,
          })
        )
        .then((res) => {
          if (isMounted) setFetchedData(res);
        })
        .catch((err) => console.error('OverviewTab load error:', err))
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [initialData, accountId, startDate, endDate, comparisonEnabled, compareStartDate, compareEndDate]);

  const activeData = initialData || fetchedData;

  const [primaryMetric, setPrimaryMetric] = useState<'spend' | 'impressions' | 'reach' | 'clicks' | 'conversions' | 'conversion_value'>('spend');
  const [efficiencyMetric, setEfficiencyMetric] = useState<'ctr' | 'cpc' | 'cpm' | 'cpa' | 'roas'>('roas');

  if (loading && !activeData) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-medium">Aggregating Meta Ads telemetry...</p>
      </div>
    );
  }

  if (!activeData) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
        <p className="text-xs text-slate-500">No analytics data available for the selected period.</p>
      </div>
    );
  }

  const data = activeData;

  const primaryMetricOptions: Array<{ key: typeof primaryMetric; label: string; isCurrency?: boolean }> = [
    { key: 'spend', label: 'Spend', isCurrency: true },
    { key: 'conversion_value', label: 'Conversion Value', isCurrency: true },
    { key: 'conversions', label: 'Conversions' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'reach', label: 'Reach' },
  ];

  const efficiencyMetricOptions: Array<{ key: typeof efficiencyMetric; label: string; isRate?: boolean; isCurrency?: boolean }> = [
    { key: 'roas', label: 'ROAS (Multiple)' },
    { key: 'cpa', label: 'CPA (Cost/Conv)', isCurrency: true },
    { key: 'cpc', label: 'CPC (Cost/Click)', isCurrency: true },
    { key: 'ctr', label: 'CTR (%)', isRate: true },
    { key: 'cpm', label: 'CPM', isCurrency: true },
  ];

  const formatTooltipValue = (value: number, metricKey: string) => {
    if (['spend', 'conversion_value', 'cpc', 'cpm', 'cpa'].includes(metricKey)) {
      return formatCurrency(value, currency);
    }
    if (metricKey === 'ctr') return formatPercentage(value);
    if (metricKey === 'roas') return formatROAS(value);
    return formatCount(value);
  };

  return (
    <div className="space-y-6">
      {/* 1. Scorecard Grid */}
      <MetaKPICardsGrid kpis={data.kpis} currency={currency} hasComparison={hasComparison} />

      {/* 2. Visual Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Volume & Spend Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                Performance Time-Series
              </h2>
              <p className="text-xs text-slate-500">Daily trajectory across active ad account</p>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {primaryMetricOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPrimaryMetric(opt.key)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    primaryMetric === opt.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            {data.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                      if (['spend', 'conversion_value'].includes(primaryMetric)) {
                        return formatCurrency(val, currency, true);
                      }
                      return formatCount(val, true);
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value as number;
                        return (
                          <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-lg space-y-1">
                            <div className="text-slate-400 font-mono text-[10px]">{label}</div>
                            <div className="font-bold flex items-center gap-1.5 text-blue-300">
                              <span>{primaryMetric.replace('_', ' ').toUpperCase()}:</span>
                              <span>{formatTooltipValue(val, primaryMetric)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={primaryMetric}
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#primaryAreaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No time-series data available for the selected range.
              </div>
            )}
          </div>
        </div>

        {/* Secondary Efficiency & Unit Economics Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Unit Economics & Efficiency
              </h2>
              <p className="text-xs text-slate-500">Cost per outcome & return dynamics</p>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {efficiencyMetricOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setEfficiencyMetric(opt.key)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                    efficiencyMetric === opt.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            {data.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                      if (['cpc', 'cpm', 'cpa'].includes(efficiencyMetric)) {
                        return formatCurrency(val, currency, true);
                      }
                      if (efficiencyMetric === 'ctr') return `${val.toFixed(1)}%`;
                      if (efficiencyMetric === 'roas') return `${val.toFixed(1)}x`;
                      return String(val);
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value as number;
                        return (
                          <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-lg space-y-1">
                            <div className="text-slate-400 font-mono text-[10px]">{label}</div>
                            <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                              <span>{efficiencyMetric.toUpperCase()}:</span>
                              <span>{formatTooltipValue(val, efficiencyMetric)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={efficiencyMetric}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No efficiency telemetry available for the selected range.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Top Performers (Campaigns & Ads) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Campaigns */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Top Performing Campaigns
              </h2>
              <p className="text-xs text-slate-500">Ranked by ad spend and scale</p>
            </div>
            <button
              onClick={() => onNavigateTab('campaigns')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>View All ({data.campaignsCount.total})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {data.topCampaigns.length > 0 ? (
              data.topCampaigns.map((cmp, idx) => (
                <div
                  key={cmp.id}
                  onClick={() => onSelectCampaign(cmp.id)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {cmp.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span
                          className={`px-1.5 py-0.2 rounded font-semibold text-[9px] ${
                            cmp.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cmp.status}
                        </span>
                        <span>{formatCount(cmp.conversions)} conv</span>
                        <span>•</span>
                        <span>CTR {formatPercentage(cmp.ctr)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-900">
                      {formatCurrency(cmp.spend, currency)}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600">
                      {formatROAS(cmp.roas)} ROAS
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No campaign data recorded in this period.
              </div>
            )}
          </div>
        </div>

        {/* Top Ads */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Top Performing Ads
              </h2>
              <p className="text-xs text-slate-500">Ranked by attributed conversions</p>
            </div>
            <button
              onClick={() => onNavigateTab('ads')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>View All ({data.adsCount.total})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {data.topAds.length > 0 ? (
              data.topAds.map((ad, idx) => (
                <div
                  key={ad.id}
                  onClick={() => onSelectAd(ad.id)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {ad.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span
                          className={`px-1.5 py-0.2 rounded font-semibold text-[9px] ${
                            ad.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ad.status}
                        </span>
                        <span>{formatCurrency(ad.cpa, currency)} CPA</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-900">
                      {formatCount(ad.conversions)} Conv
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600">
                      {formatROAS(ad.roas)} ROAS
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No ad unit performance recorded in this period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Attribution & Data Integrity Summary Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Synchronized Jyotsvan Core Engine:</strong> Metrics reflect 7-day click / 1-day view attribution window reported by Meta Graph API.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-medium">
          <button
            onClick={() => onNavigateTab('audience')}
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            Explore Audience & Placements →
          </button>
        </div>
      </div>
    </div>
  );
}
