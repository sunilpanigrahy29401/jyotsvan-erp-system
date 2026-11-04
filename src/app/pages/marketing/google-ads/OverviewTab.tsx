// src/app/pages/marketing/google-ads/OverviewTab.tsx
// Phase 29: Google Ads Executive Overview Dashboard View

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  ArrowRight,
  Layers,
  Search,
  CheckCircle2,
  ExternalLink,
  Target,
  Sparkles,
} from 'lucide-react';
import type {
  GoogleAdsExecutiveOverviewData,
  GoogleTopPerformer,
} from '../../../../types/google-ads.ts';
import { GoogleKPICardsGrid } from './GoogleKPICardsGrid.tsx';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/googleAdsMetrics.ts';

interface OverviewTabProps {
  overviewData: GoogleAdsExecutiveOverviewData;
  onNavigateTab: (tab: any) => void;
  onSelectCampaign: (campId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  overviewData,
  onNavigateTab,
  onSelectCampaign,
}) => {
  const {
    kpis,
    trends,
    topCampaigns,
    topKeywords,
    campaignsCount,
    adGroupsCount,
    keywordsCount,
    currency,
  } = overviewData;

  // Format trend data for Recharts
  const chartData = (trends || []).map((t) => ({
    date: t.date.slice(5), // MM-DD
    spend: t.spend,
    conversion_value: t.conversion_value,
    conversions: t.conversions,
    roas: t.roas,
    clicks: t.clicks,
    impressions: t.impressions,
  }));

  return (
    <div id="google-ads-overview-tab" className="space-y-6">
      {/* 9-Card KPI Grid */}
      <GoogleKPICardsGrid kpis={kpis} currency={currency} />

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dual Performance Trends Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Spend vs. Conversion Value Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily synchronized advertising expenditure vs. attributed revenue
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('trends')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>Explore Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      border: 'none',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                    formatter={(val: any, name: any) => {
                      if (name === 'Spend' || name === 'Conversion Value') {
                        return [formatCurrency(Number(val), currency), name];
                      }
                      return [val, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="spend"
                    name="Spend"
                    stroke="#EF4444"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="conversion_value"
                    name="Conversion Value"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="conversions"
                    name="Conversions"
                    stroke="#3B82F6"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No trend data available for current date filter
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Account Entity Status & Channel Summary */}
        <div className="space-y-4">
          {/* Entity Summary Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Synchronized Entities</h3>
            <div className="space-y-3">
              <div
                onClick={() => onNavigateTab('campaigns')}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-blue-100 text-blue-700">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Campaigns</h4>
                    <span className="text-[11px] text-slate-500">
                      {campaignsCount.active} Active / {campaignsCount.total} Total
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>

              <div
                onClick={() => onNavigateTab('adgroups')}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-indigo-100 text-indigo-700">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Ad Groups</h4>
                    <span className="text-[11px] text-slate-500">
                      {adGroupsCount.active} Active / {adGroupsCount.total} Total
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>

              <div
                onClick={() => onNavigateTab('keywords')}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-emerald-100 text-emerald-700">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Keywords & Queries</h4>
                    <span className="text-[11px] text-slate-500">
                      {keywordsCount.active} Active Keywords
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Quick Actions / Channel Allocation */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-300">Channels Tracked</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
                Google REST v17
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mb-2">Omnichannel Ad Engine</h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Search Text Ads, Performance Max, Smart Shopping, and YouTube Ads telemetry are integrated into Jyotsvan's reporting core.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2">
                <span className="text-slate-400 block text-[10px]">Primary Channel</span>
                <span className="font-semibold text-white">Search & PMax</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2">
                <span className="text-slate-400 block text-[10px]">Conversion Model</span>
                <span className="font-semibold text-emerald-400">Data-Driven</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Performing Campaigns & Top Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Campaigns */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Campaigns by Spend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Highest volume synchronized campaigns</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('campaigns')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All ({campaignsCount.total})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 pb-2">
                  <th className="font-semibold pb-2">Campaign</th>
                  <th className="font-semibold pb-2 text-right">Spend</th>
                  <th className="font-semibold pb-2 text-right">Conv.</th>
                  <th className="font-semibold pb-2 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(topCampaigns || []).map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCampaign(c.id)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="py-2.5 pr-2">
                      <div className="font-medium text-slate-900 truncate max-w-[200px]">{c.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {c.channelType || 'SEARCH'}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            c.status === 'ENABLED' ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-900">
                      {formatCurrency(c.spend, currency)}
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-900">
                      {formatCount(c.conversions)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="font-bold text-emerald-600">{formatROAS(c.roas)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Keywords */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Converting Keywords</h3>
              <p className="text-xs text-slate-500 mt-0.5">Highest conversion volume keywords</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('keywords')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All ({keywordsCount.total})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 pb-2">
                  <th className="font-semibold pb-2">Keyword</th>
                  <th className="font-semibold pb-2 text-center">Match</th>
                  <th className="font-semibold pb-2 text-right">Spend</th>
                  <th className="font-semibold pb-2 text-right">Conv.</th>
                  <th className="font-semibold pb-2 text-right">CPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(topKeywords || []).map((kw) => (
                  <tr key={kw.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 pr-2">
                      <div className="font-medium text-slate-900 truncate max-w-[180px]">{kw.name}</div>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {kw.channelType || 'EXACT'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-900">
                      {formatCurrency(kw.spend, currency)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      {formatCount(kw.conversions)}
                    </td>
                    <td className="py-2.5 text-right text-slate-700">
                      {formatCurrency(kw.cpa, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
