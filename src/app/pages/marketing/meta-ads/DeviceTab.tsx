// src/app/pages/marketing/meta-ads/DeviceTab.tsx
// Phase 27: Device Platform Breakdown (Mobile, Desktop, Tablet)

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
import { Smartphone, Monitor, Tablet, Info } from 'lucide-react';
import type { MetaBreakdownMetricRow } from '../../../../types/meta.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/metaMetrics.ts';

export interface DeviceTabProps {
  accountId?: string;
  startDate: string;
  endDate: string;
  currency: string;
}

export function DeviceTab({
  accountId,
  startDate,
  endDate,
  currency,
}: DeviceTabProps) {
  const [devices, setDevices] = useState<MetaBreakdownMetricRow[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    metaAnalyticsApi
      .getDevice({
        accountId,
        startDate,
        endDate,
      })
      .then((res) => {
        if (isMounted) {
          setDevices(res.devices);
          setIsAvailable(res.isAvailable);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [accountId, startDate, endDate]);

  const getDeviceIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('mobile') || l.includes('phone')) return <Smartphone className="w-4 h-4 text-blue-600" />;
    if (l.includes('desktop') || l.includes('computer')) return <Monitor className="w-4 h-4 text-indigo-600" />;
    return <Tablet className="w-4 h-4 text-teal-600" />;
  };

  const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Device Overview Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Device Platform Distribution
          </h2>
          <p className="text-xs text-slate-500">
            Ad spend and conversions grouped by user client hardware
          </p>
        </div>

        <div className="h-64 w-full">
          {devices.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={devices} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
                  {devices.map((_, index) => (
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
                  ? 'Loading device breakdown...'
                  : 'Device breakdown data is not available for the current date range.'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Device Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-900">
          Device Performance Metrics
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Device Type</th>
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
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No device statistics recorded.
                  </td>
                </tr>
              ) : (
                devices.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(r.label)}
                        <span>{r.label}</span>
                      </div>
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
