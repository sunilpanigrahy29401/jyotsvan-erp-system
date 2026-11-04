// src/app/pages/marketing/meta-ads/PlacementTab.tsx
// Phase 27: Placement & Publisher Platform Breakdown

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
import { Smartphone, LayoutGrid, Share2 } from 'lucide-react';
import type { MetaBreakdownMetricRow } from '../../../../types/meta.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/metaMetrics.ts';

export interface PlacementTabProps {
  accountId?: string;
  startDate: string;
  endDate: string;
  currency: string;
}

export function PlacementTab({
  accountId,
  startDate,
  endDate,
  currency,
}: PlacementTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'placements' | 'platforms'>('placements');
  const [placements, setPlacements] = useState<MetaBreakdownMetricRow[]>([]);
  const [platforms, setPlatforms] = useState<MetaBreakdownMetricRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    metaAnalyticsApi
      .getPlacement({
        accountId,
        startDate,
        endDate,
      })
      .then((res) => {
        if (isMounted) {
          setPlacements(res.placements);
          setPlatforms(res.platforms);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [accountId, startDate, endDate]);

  const currentRows = activeSubTab === 'placements' ? placements : platforms;
  const BAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2'];

  return (
    <div className="space-y-6">
      {/* Subtabs */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('placements')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'placements'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Ad Placements (Feeds, Stories, Reels)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('platforms')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'platforms'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Publisher Platforms (FB, IG, Audience Net)</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono px-3">
          Surface Analytics
        </div>
      </div>

      {/* Visual Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Spend & Return by {activeSubTab === 'placements' ? 'Placement Surface' : 'Publisher Platform'}
          </h2>
          <p className="text-xs text-slate-500">
            Efficiency breakdown across Meta ecosystem surfaces
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
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              {loading ? 'Loading placement telemetry...' : 'No placement telemetry recorded.'}
            </div>
          )}
        </div>
      </div>

      {/* Placement Performance Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-900">
          Placement Performance Table
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Placement / Surface</th>
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
                    No placement data recorded for this period.
                  </td>
                </tr>
              ) : (
                currentRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {r.label}
                    </td>
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
