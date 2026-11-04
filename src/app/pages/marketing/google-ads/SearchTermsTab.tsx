// src/app/pages/marketing/google-ads/SearchTermsTab.tsx
// Phase 29: Google Ads Real Search Terms & Query Analytics

import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  HelpCircle,
} from 'lucide-react';
import type { GoogleSearchTerm, GoogleAnalyticsFilter } from '../../../../types/google-ads.ts';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/googleAdsMetrics.ts';

interface SearchTermsTabProps {
  filter: GoogleAnalyticsFilter;
  currency?: string;
}

export const SearchTermsTab: React.FC<SearchTermsTabProps> = ({ filter, currency = 'INR' }) => {
  const [searchTerms, setSearchTerms] = useState<GoogleSearchTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<keyof GoogleSearchTerm>('clicks');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchSearchTerms = () => {
    setLoading(true);
    googleAdsAnalyticsApi
      .getSearchTerms({
        ...filter,
        search: searchQuery,
      })
      .then((res) => {
        setSearchTerms(res.searchTerms || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch search terms:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSearchTerms();
  }, [filter.accountId, filter.startDate, filter.endDate]);

  const handleSort = (field: keyof GoogleSearchTerm) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filtered = useMemo(() => {
    return [...searchTerms]
      .filter((st) => {
        if (statusFilter !== 'ALL' && st.status !== statusFilter) return false;
        if (!searchQuery) return true;
        return st.query_text.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        const valA = (a[sortField] as any) ?? 0;
        const valB = (b[sortField] as any) ?? 0;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [searchTerms, searchQuery, statusFilter, sortField, sortOrder]);

  return (
    <div id="google-ads-searchterms-tab" className="space-y-4">
      {/* Search & Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search actual user search queries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Query Statuses</option>
            <option value="ADDED">Added as Keyword</option>
            <option value="EXCLUDED">Negative / Excluded</option>
            <option value="NONE">Unmanaged</option>
          </select>

          <button
            type="button"
            onClick={fetchSearchTerms}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
              <tr>
                <th
                  onClick={() => handleSort('query_text')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Search Term (Query)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold">Match</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Campaign / Ad Group</th>
                <th
                  onClick={() => handleSort('spend')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <span>Spend</span>
                </th>
                <th
                  onClick={() => handleSort('clicks')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Clicks</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold text-right">CTR</th>
                <th className="py-3 px-3 font-semibold text-right">Avg CPC</th>
                <th
                  onClick={() => handleSort('conversions')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <span>Conv.</span>
                </th>
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
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Loading search queries...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No search terms found
                  </td>
                </tr>
              ) : (
                filtered.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-sm truncate">
                      "{st.query_text}"
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {st.match_type || 'BROAD'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {st.status === 'ADDED' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <PlusCircle className="w-3 h-3" /> Added
                        </span>
                      ) : st.status === 'EXCLUDED' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <MinusCircle className="w-3 h-3" /> Excluded
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-800 truncate max-w-[160px]">{st.campaign_name}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                        {st.ad_group_name}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {formatCurrency(st.spend, currency)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(st.clicks)}</td>
                    <td className="py-3 px-3 text-right text-slate-700 font-medium">
                      {formatPercentage(st.ctr)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(st.cpc, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCount(st.conversions)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                        {formatROAS(st.roas)}
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
