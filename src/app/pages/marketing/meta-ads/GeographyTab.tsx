// src/app/pages/marketing/meta-ads/GeographyTab.tsx
// Phase 27: Geographic Breakdown (Countries & Regions)

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Globe, MapPin, Info } from 'lucide-react';
import type { MetaBreakdownMetricRow } from '../../../../types/meta.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/metaMetrics.ts';

export interface GeographyTabProps {
  accountId?: string;
  startDate: string;
  endDate: string;
  currency: string;
}

export function GeographyTab({
  accountId,
  startDate,
  endDate,
  currency,
}: GeographyTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'country' | 'region'>('country');
  const [countries, setCountries] = useState<MetaBreakdownMetricRow[]>([]);
  const [regions, setRegions] = useState<MetaBreakdownMetricRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    metaAnalyticsApi
      .getGeography({
        accountId,
        startDate,
        endDate,
      })
      .then((res) => {
        if (isMounted) {
          setCountries(res.countries);
          setRegions(res.regions);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [accountId, startDate, endDate]);

  const currentRows = activeSubTab === 'country' ? countries : regions;
  const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Subtabs */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('country')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'country'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Countries</span>
          </button>
          <button
            onClick={() => setActiveSubTab('region')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'region'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Regions / States</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono px-3">
          Geographic Insights
        </div>
      </div>

      {/* Visual Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Geographic Spend & Outcome Density
          </h2>
          <p className="text-xs text-slate-500">
            Performance distributed by {activeSubTab === 'country' ? 'target country' : 'state/province'}
          </p>
        </div>

        <div className="h-64 w-full">
          {currentRows.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentRows} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => formatCurrency(val, currency, true)}
                />
                <Tooltip
                  formatter={(val: number) => formatCurrency(val, currency)}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const row = payload[0].payload as MetaBreakdownMetricRow;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-lg space-y-1">
                          <div className="font-bold text-slate-200">{label}</div>
                          <div className="text-blue-300">Spend: {formatCurrency(row.spend, currency)}</div>
                          <div className="text-emerald-300">Conversions: {formatCount(row.conversions)}</div>
                          <div className="text-amber-300">ROAS: {formatROAS(row.roas)}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="spend" radius={[6, 6, 0, 0]}>
                  {currentRows.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
              <Info className="w-5 h-5 text-slate-300" />
              <span>
                {loading
                  ? 'Loading geographic metrics...'
                  : 'No geographic breakdown data available for this date range.'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Geography Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-900">
          Geographic Performance Table
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Territory / Location</th>
                <th className="py-3 px-3 text-right">Spend</th>
                <th className="py-3 px-3 text-right">Impressions</th>
                <th className="py-3 px-3 text-right">Clicks</th>
                <th className="py-3 px-3 text-right">CTR</th>
                <th className="py-3 px-3 text-right">CPC</th>
                <th className="py-3 px-3 text-right">Conv</th>
                <th className="py-3 px-3 text-right">CPA</th>
                <th className="py-3 px-4 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No geographic records found.
                  </td>
                </tr>
              ) : (
                currentRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.label}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(r.spend, currency)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(r.impressions)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(r.clicks)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatPercentage(r.ctr)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(r.cpc, currency)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">{formatCount(r.conversions)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(r.cpa, currency)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatROAS(r.roas)}</td>
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
