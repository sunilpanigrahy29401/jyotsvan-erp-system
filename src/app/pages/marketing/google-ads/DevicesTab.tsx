// src/app/pages/marketing/google-ads/DevicesTab.tsx
// Phase 29: Google Ads Device Performance Breakdown & Visual Distribution

import React, { useEffect, useState } from 'react';
import { Smartphone, Monitor, Tablet, Tv, RefreshCw } from 'lucide-react';
import type { GoogleDeviceMetric, GoogleAnalyticsFilter } from '../../../../types/google-ads.ts';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/googleAdsMetrics.ts';

interface DevicesTabProps {
  filter: GoogleAnalyticsFilter;
  currency?: string;
}

export const DevicesTab: React.FC<DevicesTabProps> = ({ filter, currency = 'INR' }) => {
  const [devices, setDevices] = useState<GoogleDeviceMetric[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDevices = () => {
    setLoading(true);
    googleAdsAnalyticsApi
      .getDevices(filter)
      .then((res) => {
        setDevices(res.devices || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch devices:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDevices();
  }, [filter.accountId, filter.startDate, filter.endDate]);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'MOBILE':
        return <Smartphone className="w-5 h-5 text-blue-600" />;
      case 'DESKTOP':
        return <Monitor className="w-5 h-5 text-indigo-600" />;
      case 'TABLET':
        return <Tablet className="w-5 h-5 text-purple-600" />;
      case 'CONNECTED_TV':
        return <Tv className="w-5 h-5 text-amber-600" />;
      default:
        return <Smartphone className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div id="google-ads-devices-tab" className="space-y-6">
      {/* Device Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {devices.map((dev) => (
          <div key={dev.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  {getDeviceIcon(dev.device_type)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{dev.device_label}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">{dev.device_type}</span>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {dev.shareOfSpendPercent}% spend
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Spend</span>
                <span className="font-semibold text-slate-900">{formatCurrency(dev.spend, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Clicks (CTR)</span>
                <span className="text-slate-700">
                  {formatCount(dev.clicks)} ({formatPercentage(dev.ctr)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Conversions</span>
                <span className="font-bold text-slate-900">{formatCount(dev.conversions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ROAS</span>
                <span className="font-bold text-emerald-600">{formatROAS(dev.roas)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Device Segmentation Data</h3>
          <button
            type="button"
            onClick={fetchDevices}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Device Type</th>
                <th className="py-3 px-3 font-semibold text-right">Spend</th>
                <th className="py-3 px-3 font-semibold text-right">Share of Spend</th>
                <th className="py-3 px-3 font-semibold text-right">Impr.</th>
                <th className="py-3 px-3 font-semibold text-right">Clicks</th>
                <th className="py-3 px-3 font-semibold text-right">CTR</th>
                <th className="py-3 px-3 font-semibold text-right">Avg CPC</th>
                <th className="py-3 px-3 font-semibold text-right">Conv.</th>
                <th className="py-3 px-3 font-semibold text-right">CPA</th>
                <th className="py-3 px-4 font-semibold text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Loading device analytics...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No device data found
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      {getDeviceIcon(d.device_type)}
                      <span>{d.device_label}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {formatCurrency(d.spend, currency)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, d.shareOfSpendPercent || 0)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-600">
                          {d.shareOfSpendPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(d.impressions)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(d.clicks)}</td>
                    <td className="py-3 px-3 text-right text-slate-700 font-medium">
                      {formatPercentage(d.ctr)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(d.cpc, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCount(d.conversions)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(d.cpa, currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                        {formatROAS(d.roas)}
                      </span>
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
