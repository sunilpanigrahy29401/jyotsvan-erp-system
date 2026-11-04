// src/app/pages/marketing/google-ads/TrendsTab.tsx
// Phase 29: Google Ads Dedicated Time-Series Trend & Metric Correlation Engine

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, BarChart3, RefreshCw, Calendar } from 'lucide-react';
import type { GoogleTrendPoint, GoogleAnalyticsFilter } from '../../../../types/google-ads.ts';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/googleAdsMetrics.ts';

interface TrendsTabProps {
  filter: GoogleAnalyticsFilter;
  currency?: string;
}

export const TrendsTab: React.FC<TrendsTabProps> = ({ filter, currency = 'INR' }) => {
  const [trends, setTrends] = useState<GoogleTrendPoint[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [primaryMetric, setPrimaryMetric] = useState<keyof GoogleTrendPoint>('spend');
  const [secondaryMetric, setSecondaryMetric] = useState<keyof GoogleTrendPoint>('conversion_value');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const fetchTrends = () => {
    setLoading(true);
    googleAdsAnalyticsApi
      .getTrends(filter)
      .then((res) => {
        setTrends(res.trends || []);
        setSummary(res.summary || {});
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch trends:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTrends();
  }, [filter.accountId, filter.startDate, filter.endDate]);

  const metricOptions: { key: keyof GoogleTrendPoint; label: string; isCurrency?: boolean; isPercent?: boolean }[] = [
    { key: 'spend', label: 'Spend', isCurrency: true },
    { key: 'conversion_value', label: 'Conversion Value', isCurrency: true },
    { key: 'conversions', label: 'Conversions' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'ctr', label: 'CTR', isPercent: true },
    { key: 'cpc', label: 'Avg. CPC', isCurrency: true },
    { key: 'cpa', label: 'CPA', isCurrency: true },
    { key: 'roas', label: 'ROAS' },
  ];

  const formatMetricVal = (key: keyof GoogleTrendPoint, val: any) => {
    if (val == null) return '—';
    const num = Number(val);
    const opt = metricOptions.find((m) => m.key === key);
    if (opt?.isCurrency) return formatCurrency(num, currency);
    if (opt?.isPercent) return formatPercentage(num);
    if (key === 'roas') return formatROAS(num);
    return formatCount(num);
  };

  const chartData = trends.map((t) => ({
    date: t.date.slice(5),
    fullDate: t.date,
    [primaryMetric]: t[primaryMetric],
    [secondaryMetric]: t[secondaryMetric],
  }));

  return (
    <div id="google-ads-trends-tab" className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Primary Metric */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Primary Metric (Left Axis)</label>
            <select
              value={primaryMetric}
              onChange={(e) => setPrimaryMetric(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {metricOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Secondary Metric */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Secondary Metric (Right Axis)</label>
            <select
              value={secondaryMetric}
              onChange={(e) => setSecondaryMetric(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {metricOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Chart Type Toggle */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Chart Format</label>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  chartType === 'line' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Line Trend
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  chartType === 'bar' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Bar Chart
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchTrends}
          className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition self-start lg:self-center"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            {metricOptions.find((m) => m.key === primaryMetric)?.label} vs.{' '}
            {metricOptions.find((m) => m.key === secondaryMetric)?.label}
          </h3>
          <span className="text-xs text-slate-500">{trends.length} daily telemetry data points</span>
        </div>

        <div className="h-80 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                    formatter={(val: any, name: any) => {
                      const opt = metricOptions.find((m) => m.label === name || m.key === name);
                      return [formatMetricVal((opt?.key || primaryMetric) as any, val), name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={primaryMetric}
                    name={metricOptions.find((m) => m.key === primaryMetric)?.label}
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={secondaryMetric}
                    name={metricOptions.find((m) => m.key === secondaryMetric)?.label}
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                    formatter={(val: any, name: any) => {
                      const opt = metricOptions.find((m) => m.label === name || m.key === name);
                      return [formatMetricVal((opt?.key || primaryMetric) as any, val), name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar
                    yAxisId="left"
                    dataKey={primaryMetric}
                    name={metricOptions.find((m) => m.key === primaryMetric)?.label}
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey={secondaryMetric}
                    name={metricOptions.find((m) => m.key === secondaryMetric)?.label}
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No trend telemetry available
            </div>
          )}
        </div>
      </div>

      {/* Daily Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Daily Telemetry Records</h3>
          <span className="text-xs text-slate-500">Sorted chronologically (Newest first)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-3 font-semibold text-right">Spend</th>
                <th className="py-3 px-3 font-semibold text-right">Impressions</th>
                <th className="py-3 px-3 font-semibold text-right">Clicks</th>
                <th className="py-3 px-3 font-semibold text-right">CTR</th>
                <th className="py-3 px-3 font-semibold text-right">Avg CPC</th>
                <th className="py-3 px-3 font-semibold text-right">Conversions</th>
                <th className="py-3 px-3 font-semibold text-right">CPA</th>
                <th className="py-3 px-3 font-semibold text-right">Conv. Value</th>
                <th className="py-3 px-4 font-semibold text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trends.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No data available
                  </td>
                </tr>
              ) : (
                [...trends].reverse().map((t) => (
                  <tr key={t.date} className="hover:bg-slate-50 transition font-mono">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 font-sans">{t.date}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900 font-sans">
                      {formatCurrency(t.spend, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{formatCount(t.impressions)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{formatCount(t.clicks)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{formatPercentage(t.ctr)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-sans">
                      {formatCurrency(t.cpc, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatCount(t.conversions)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-sans">
                      {formatCurrency(t.cpa, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600 font-sans">
                      {formatCurrency(t.conversion_value, currency)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                      {formatROAS(t.roas)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
