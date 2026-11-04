// src/app/pages/marketing/google-ads/AdGroupsTab.tsx
// Phase 29: Google Ads Ad Groups Table Component

import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Target,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import type { GoogleAdGroup, GoogleAnalyticsFilter } from '../../../../types/google-ads.ts';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/googleAdsMetrics.ts';
import { AdGroupDetailDrawer } from './AdGroupDetailDrawer.tsx';

interface AdGroupsTabProps {
  filter: GoogleAnalyticsFilter;
  currency?: string;
}

export const AdGroupsTab: React.FC<AdGroupsTabProps> = ({ filter, currency = 'INR' }) => {
  const [adGroups, setAdGroups] = useState<GoogleAdGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<keyof GoogleAdGroup>('spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedAdGroup, setSelectedAdGroup] = useState<GoogleAdGroup | null>(null);

  const fetchAdGroups = () => {
    setLoading(true);
    googleAdsAnalyticsApi
      .getAdGroups({
        ...filter,
        search: searchTerm,
        status: statusFilter,
      })
      .then((res) => {
        setAdGroups(res.adGroups || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch ad groups:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAdGroups();
  }, [filter.accountId, filter.startDate, filter.endDate, filter.campaignId, statusFilter]);

  const handleSort = (field: keyof GoogleAdGroup) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAdGroups = useMemo(() => {
    return [...adGroups]
      .filter((ag) => {
        if (!searchTerm) return true;
        return (
          ag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (ag.campaign_name && ag.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      })
      .sort((a, b) => {
        const valA = (a[sortField] as any) ?? 0;
        const valB = (b[sortField] as any) ?? 0;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [adGroups, searchTerm, sortField, sortOrder]);

  return (
    <div id="google-ads-adgroups-tab" className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search ad groups or campaign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
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
            onClick={fetchAdGroups}
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
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Ad Group Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold">Campaign</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th
                  onClick={() => handleSort('spend')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Spend</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold text-right">Impr.</th>
                <th className="py-3 px-3 font-semibold text-right">Clicks</th>
                <th className="py-3 px-3 font-semibold text-right">CTR</th>
                <th className="py-3 px-3 font-semibold text-right">Avg CPC</th>
                <th className="py-3 px-3 font-semibold text-right">Conv.</th>
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
                    Loading ad groups...
                  </td>
                </tr>
              ) : filteredAdGroups.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No ad groups found
                  </td>
                </tr>
              ) : (
                filteredAdGroups.map((ag) => (
                  <tr
                    key={ag.id}
                    onClick={() => setSelectedAdGroup(ag)}
                    className="hover:bg-indigo-50/30 cursor-pointer transition"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 hover:text-indigo-600 transition truncate max-w-xs">
                        {ag.name}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-600 truncate max-w-[160px] block">
                        {ag.campaign_name || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          ag.status === 'ENABLED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ag.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {formatCurrency(ag.spend, currency)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(ag.impressions)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(ag.clicks)}</td>
                    <td className="py-3 px-3 text-right text-slate-700 font-medium">
                      {formatPercentage(ag.ctr)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(ag.cpc, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCount(ag.conversions)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(ag.cpa, currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                        {formatROAS(ag.roas)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ad Group Detail Drawer */}
      <AdGroupDetailDrawer
        adGroup={selectedAdGroup}
        onClose={() => setSelectedAdGroup(null)}
        currency={currency}
      />
    </div>
  );
};
