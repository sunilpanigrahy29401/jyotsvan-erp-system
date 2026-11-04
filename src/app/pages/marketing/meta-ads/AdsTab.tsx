// src/app/pages/marketing/meta-ads/AdsTab.tsx
// Phase 27: Individual Ads Table with Creative Media & Telemetry

import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  PauseCircle,
  Eye,
} from 'lucide-react';
import type { MetaAd } from '../../../../types/meta.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
  exportToCSV,
} from '../../../../utils/metaMetrics.ts';

export interface AdsTabProps {
  accountId?: string;
  startDate: string;
  endDate: string;
  currency: string;
  onSelectAd: (adId: string) => void;
}

export function AdsTab({
  accountId,
  startDate,
  endDate,
  currency,
  onSelectAd,
}: AdsTabProps) {
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    metaAnalyticsApi
      .getAds({
        accountId,
        startDate,
        endDate,
        status: statusFilter,
        search: search || undefined,
        limit: 100,
      })
      .then((res) => {
        if (isMounted) {
          setAds(res.ads);
          setTotal(res.total);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [accountId, startDate, endDate, statusFilter, search]);

  const handleExport = () => {
    const headers = [
      'Ad Name',
      'Campaign',
      'Ad Set',
      'Status',
      'Spend',
      'Impressions',
      'Clicks',
      'CTR (%)',
      'Conversions',
      'CPA',
      'ROAS',
    ];

    const rows = ads.map((a) => [
      a.name,
      a.campaign_name || '',
      a.adset_name || '',
      a.status,
      a.spend ?? 0,
      a.impressions ?? 0,
      a.clicks ?? 0,
      a.ctr ? Number(a.ctr.toFixed(2)) : 0,
      a.conversions ?? 0,
      a.cpa ? Number(a.cpa.toFixed(2)) : 0,
      a.roas ? Number(a.roas.toFixed(2)) : 0,
    ]);

    exportToCSV(`meta_ads_${startDate}_${endDate}`, headers, rows);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4">
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {(['ALL', 'ACTIVE', 'PAUSED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md transition ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">
            Showing {ads.length} of {total}
          </span>
          <button
            onClick={handleExport}
            disabled={ads.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Ad / Creative Preview</th>
              <th className="py-3 px-3">Parent Campaign</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Spend</th>
              <th className="py-3 px-3 text-right">Conv</th>
              <th className="py-3 px-3 text-right">ROAS</th>
              <th className="py-3 px-3 text-right">CPA</th>
              <th className="py-3 px-3 text-right">CTR</th>
              <th className="py-3 px-3 text-right">Clicks</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  Loading ads...
                </td>
              </tr>
            ) : ads.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  No ads found.
                </td>
              </tr>
            ) : (
              ads.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => onSelectAd(a.id)}
                  className="hover:bg-blue-50/50 transition cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                    <div className="flex items-center gap-3">
                      {a.creative?.thumbnail_url || a.creative?.image_url ? (
                        <img
                          src={a.creative.thumbnail_url || a.creative.image_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] shrink-0">
                          Ad
                        </div>
                      )}
                      <div className="truncate">
                        <div className="truncate">{a.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate">
                          {a.creative?.title || a.external_ad_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 max-w-xs truncate text-slate-600">
                    {a.campaign_name || '—'}
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                    {formatCurrency(a.spend, currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold">
                    {formatCount(a.conversions)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-emerald-600">
                    {formatROAS(a.roas)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold">
                    {formatCurrency(a.cpa, currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold">
                    {formatPercentage(a.ctr)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-600">
                    {formatCount(a.clicks)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button className="p-1 text-slate-400 hover:text-blue-600 rounded">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
