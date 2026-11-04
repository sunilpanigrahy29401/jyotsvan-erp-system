// src/app/pages/marketing/meta-ads/TrendsTab.tsx
// Phase 27: Multi-Interval Historical Trends & Performance Modeling

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
import { Calendar, Download, TrendingUp, Layers } from 'lucide-react';
import type { MetaTrendPoint } from '../../../../types/meta.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
  exportToCSV,
} from '../../../../utils/metaMetrics.ts';

export interface TrendsTabProps {
  accountId?: string;
  startDate: string;
  endDate: string;
  currency: string;
}

export function TrendsTab({
  accountId,
  startDate,
  endDate,
  currency,
}: TrendsTabProps) {
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [metric, setMetric] = useState<keyof MetaTrendPoint>('spend');
  const [trends, setTrends] = useState<MetaTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    metaAnalyticsApi
      .getTrends(
        {
          accountId,
          startDate,
          endDate,
        },
        interval
      )
      .then((res) => {
        if (isMounted) setTrends(res.trends);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [accountId, startDate, endDate, interval]);

  const metricOptions: Array<{ key: keyof MetaTrendPoint; label: string; isCurrency?: boolean; isRate?: boolean }> = [
    { key: 'spend', label: 'Spend', isCurrency: true },
    { key: 'conversion_value', label: 'Conversion Value', isCurrency: true },
    { key: 'conversions', label: 'Conversions' },
    { key: 'roas', label: 'ROAS' },
    { key: 'cpa', label: 'CPA', isCurrency: true },
    { key: 'clicks', label: 'Clicks' },
    { key: 'ctr', label: 'CTR (%)', isRate: true },
    { key: 'cpc', label: 'CPC', isCurrency: true },
    { key: 'impressions', label: 'Impressions' },
    { key: 'cpm', label: 'CPM', isCurrency: true },
    { key: 'reach', label: 'Reach' },
  ];

  const handleExport = () => {
    const headers = [
      'Date / Period',
      'Spend',
      'Impressions',
      'Reach',
      'Clicks',
      'CTR (%)',
      'CPC',
      'CPM',
      'Conversions',
      'CPA',
      'Conversion Value',
      'ROAS',
    ];

    const rows = trends.map((t) => [
      t.date,
      t.spend,
      t.impressions,
      t.reach,
      t.clicks,
      t.ctr ? Number(t.ctr.toFixed(2)) : 0,
      t.cpc ? Number(t.cpc.toFixed(2)) : 0,
      t.cpm ? Number(t.cpm.toFixed(2)) : 0,
      t.conversions,
      t.cpa ? Number(t.cpa.toFixed(2)) : 0,
      t.conversion_value,
      t.roas ? Number(t.roas.toFixed(2)) : 0,
    ]);

    exportToCSV(`meta_trends_${interval}_${startDate}_${endDate}`, headers, rows);
  };

  const selectedOpt = metricOptions.find((m) => m.key === metric);

  return (
    <div className="space-y-6">
      {/* Interval & Metric Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Interval Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium">Granularity:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {(['daily', 'weekly', 'monthly'] as const).map((inv) => (
              <button
                key={inv}
                onClick={() => setInterval(inv)}
                className={`px-3 py-1.5 rounded-md uppercase tracking-wider text-[11px] transition ${
                  interval === inv
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {inv}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Selector */}
        <div className="flex flex-wrap items-center gap-1">
          {metricOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMetric(opt.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                metric === opt.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={trends.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Trends</span>
        </button>
      </div>

      {/* Visual Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            {selectedOpt?.label} Trajectory ({interval.toUpperCase()})
          </h2>
          <p className="text-xs text-slate-500">
            Historical progression and performance pattern
          </p>
        </div>

        <div className="h-72 w-full">
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (selectedOpt?.isCurrency) return formatCurrency(val, currency, true);
                    if (metric === 'ctr') return `${val.toFixed(1)}%`;
                    if (metric === 'roas') return `${val.toFixed(1)}x`;
                    return formatCount(val, true);
                  }}
                />
                <Tooltip
                  formatter={(val: number) => {
                    if (selectedOpt?.isCurrency) return formatCurrency(val, currency);
                    if (metric === 'ctr') return formatPercentage(val);
                    if (metric === 'roas') return formatROAS(val);
                    return formatCount(val);
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#trendGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              {loading ? 'Loading trend telemetry...' : 'No historical data recorded.'}
            </div>
          )}
        </div>
      </div>

      {/* Historical Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-900 flex items-center justify-between">
          <span>Aggregated Historical Timeline</span>
          <span className="text-slate-400 font-normal">{trends.length} Intervals Recorded</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-3 text-right">Spend</th>
                <th className="py-3 px-3 text-right">Impressions</th>
                <th className="py-3 px-3 text-right">Clicks</th>
                <th className="py-3 px-3 text-right">CTR</th>
                <th className="py-3 px-3 text-right">CPC</th>
                <th className="py-3 px-3 text-right">Conv</th>
                <th className="py-3 px-3 text-right">CPA</th>
                <th className="py-3 px-3 text-right">Conv Value</th>
                <th className="py-3 px-4 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {trends.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No time-series data available.
                  </td>
                </tr>
              ) : (
                trends.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.date}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(t.spend, currency)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(t.impressions)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(t.clicks)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatPercentage(t.ctr)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(t.cpc, currency)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">{formatCount(t.conversions)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(t.cpa, currency)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(t.conversion_value, currency)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatROAS(t.roas)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
