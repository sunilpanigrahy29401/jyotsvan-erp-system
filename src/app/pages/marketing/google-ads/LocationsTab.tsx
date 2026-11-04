// src/app/pages/marketing/google-ads/LocationsTab.tsx
// Phase 29: Google Ads Geographic / Location Performance Breakdown

import React, { useEffect, useState } from 'react';
import { MapPin, Globe, ArrowUpDown, RefreshCw, BarChart2 } from 'lucide-react';
import type { GoogleLocationMetric, GoogleAnalyticsFilter } from '../../../../types/google-ads.ts';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/googleAdsMetrics.ts';

interface LocationsTabProps {
  filter: GoogleAnalyticsFilter;
  currency?: string;
}

export const LocationsTab: React.FC<LocationsTabProps> = ({ filter, currency = 'INR' }) => {
  const [locations, setLocations] = useState<GoogleLocationMetric[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLocations = () => {
    setLoading(true);
    googleAdsAnalyticsApi
      .getLocations(filter)
      .then((res) => {
        setLocations(res.locations || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch locations:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLocations();
  }, [filter.accountId, filter.startDate, filter.endDate]);

  return (
    <div id="google-ads-locations-tab" className="space-y-4">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Geographic Performance Breakdown</h3>
            <p className="text-xs text-slate-500">
              State and regional telemetry synchronized from targeted Google Ads locations
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLocations}
          className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Location / Region</th>
                <th className="py-3 px-3 font-semibold">Country</th>
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
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Loading geographic distribution...
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No location metrics recorded
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>{loc.location_name}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{loc.country_code}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {formatCurrency(loc.spend, currency)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, loc.shareOfSpendPercent || 0)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-600">
                          {loc.shareOfSpendPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(loc.impressions)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(loc.clicks)}</td>
                    <td className="py-3 px-3 text-right text-slate-700 font-medium">
                      {formatPercentage(loc.ctr)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(loc.cpc, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCount(loc.conversions)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(loc.cpa, currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                        {formatROAS(loc.roas)}
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
