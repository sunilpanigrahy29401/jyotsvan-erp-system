// src/app/pages/marketing/google-ads/KeywordsTab.tsx
// Phase 29: Google Ads Keywords & Quality Score Management View

import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  Filter,
} from 'lucide-react';
import type { GoogleKeyword, GoogleAnalyticsFilter } from '../../../../types/google-ads.ts';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/googleAdsMetrics.ts';

interface KeywordsTabProps {
  filter: GoogleAnalyticsFilter;
  currency?: string;
}

export const KeywordsTab: React.FC<KeywordsTabProps> = ({ filter, currency = 'INR' }) => {
  const [keywords, setKeywords] = useState<GoogleKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchTypeFilter, setMatchTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<keyof GoogleKeyword>('conversions');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchKeywords = () => {
    setLoading(true);
    googleAdsAnalyticsApi
      .getKeywords({
        ...filter,
        search: searchTerm,
        matchType: matchTypeFilter,
        status: statusFilter,
      })
      .then((res) => {
        setKeywords(res.keywords || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch keywords:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchKeywords();
  }, [filter.accountId, filter.startDate, filter.endDate, matchTypeFilter, statusFilter]);

  const handleSort = (field: keyof GoogleKeyword) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredKeywords = useMemo(() => {
    return [...keywords]
      .filter((k) => {
        if (!searchTerm) return true;
        return (
          k.keyword_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (k.campaign_name && k.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      })
      .sort((a, b) => {
        const valA = (a[sortField] as any) ?? 0;
        const valB = (b[sortField] as any) ?? 0;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [keywords, searchTerm, sortField, sortOrder]);

  return (
    <div id="google-ads-keywords-tab" className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search keywords or campaign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Match Type */}
          <select
            value={matchTypeFilter}
            onChange={(e) => setMatchTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Match Types</option>
            <option value="EXACT">Exact Match [keyword]</option>
            <option value="PHRASE">Phrase Match "keyword"</option>
            <option value="BROAD">Broad Match keyword</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ENABLED">Enabled</option>
            <option value="PAUSED">Paused</option>
          </select>

          <button
            type="button"
            onClick={fetchKeywords}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Keywords Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
              <tr>
                <th
                  onClick={() => handleSort('keyword_text')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Keyword</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold">Match</th>
                <th className="py-3 px-3 font-semibold">Quality Score</th>
                <th className="py-3 px-3 font-semibold">Campaign / Ad Group</th>
                <th
                  onClick={() => handleSort('spend')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Spend</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold text-right">Clicks</th>
                <th className="py-3 px-3 font-semibold text-right">CTR</th>
                <th className="py-3 px-3 font-semibold text-right">Avg CPC</th>
                <th
                  onClick={() => handleSort('conversions')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Conv.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold text-right">CPA</th>
                <th
                  onClick={() => handleSort('roas')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ROAS</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Loading keyword telemetry...
                  </td>
                </tr>
              ) : filteredKeywords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No keywords found
                  </td>
                </tr>
              ) : (
                filteredKeywords.map((kw) => {
                  const qs = kw.quality_score;
                  let qsBadgeClass = 'bg-slate-100 text-slate-600';
                  if (qs && qs >= 9) qsBadgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                  else if (qs && qs >= 7) qsBadgeClass = 'bg-blue-50 text-blue-700 border border-blue-200';
                  else if (qs && qs >= 5) qsBadgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';
                  else if (qs) qsBadgeClass = 'bg-rose-50 text-rose-700 border border-rose-200';

                  return (
                    <tr key={kw.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                        {kw.keyword_text}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                          {kw.match_type}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {qs ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${qsBadgeClass}`}
                          >
                            {qs}/10
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-800 truncate max-w-[160px]">{kw.campaign_name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {kw.ad_group_name}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900">
                        {formatCurrency(kw.spend, currency)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">{formatCount(kw.clicks)}</td>
                      <td className="py-3 px-3 text-right text-slate-700 font-medium">
                        {formatPercentage(kw.ctr)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {formatCurrency(kw.cpc, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatCount(kw.conversions)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {formatCurrency(kw.cpa, currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                          {formatROAS(kw.roas)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
