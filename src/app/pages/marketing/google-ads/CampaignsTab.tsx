// src/app/pages/marketing/google-ads/CampaignsTab.tsx
// Phase 29: Google Ads Campaigns Management Table with Live Metrics

import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  ArrowUpDown,
  ExternalLink,
  Target,
  RefreshCw,
} from 'lucide-react';
import type { GoogleCampaign, GoogleAnalyticsFilter } from '../../../../types/google-ads.ts';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/googleAdsMetrics.ts';
import { CampaignDetailDrawer } from './CampaignDetailDrawer.tsx';

interface CampaignsTabProps {
  filter: GoogleAnalyticsFilter;
  currency?: string;
  selectedCampaignId?: string | null;
  onSelectCampaign?: (id: string | null) => void;
}

export const CampaignsTab: React.FC<CampaignsTabProps> = ({
  filter,
  currency = 'INR',
  selectedCampaignId,
  onSelectCampaign,
}) => {
  const [campaigns, setCampaigns] = useState<GoogleCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [sortField, setSortField] = useState<keyof GoogleCampaign>('spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeDrawerId, setActiveDrawerId] = useState<string | null>(selectedCampaignId || null);

  useEffect(() => {
    if (selectedCampaignId) {
      setActiveDrawerId(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  const fetchCampaigns = () => {
    setLoading(true);
    googleAdsAnalyticsApi
      .getCampaigns({
        ...filter,
        search: searchTerm,
        status: statusFilter,
        campaignType: channelFilter,
      })
      .then((res) => {
        setCampaigns(res.campaigns || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load campaigns:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCampaigns();
  }, [filter.accountId, filter.startDate, filter.endDate, statusFilter, channelFilter]);

  const handleSort = (field: keyof GoogleCampaign) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredCampaigns = useMemo(() => {
    return [...campaigns]
      .filter((c) => {
        if (!searchTerm) return true;
        return c.name.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const valA = (a[sortField] as any) ?? 0;
        const valB = (b[sortField] as any) ?? 0;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [campaigns, searchTerm, sortField, sortOrder]);

  return (
    <div id="google-ads-campaigns-tab" className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search campaigns by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ENABLED">Enabled</option>
            <option value="PAUSED">Paused</option>
            <option value="REMOVED">Removed</option>
          </select>

          {/* Channel Type Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Channel Types</option>
            <option value="SEARCH">Search</option>
            <option value="PERFORMANCE_MAX">Performance Max</option>
            <option value="SHOPPING">Shopping</option>
            <option value="VIDEO">YouTube Video</option>
          </select>

          <button
            type="button"
            onClick={fetchCampaigns}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition"
            title="Refresh Campaigns"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
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
                    <span>Campaign Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Channel</th>
                <th
                  onClick={() => handleSort('spend')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Spend</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('impressions')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <span>Impr.</span>
                </th>
                <th
                  onClick={() => handleSort('clicks')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <span>Clicks</span>
                </th>
                <th
                  onClick={() => handleSort('ctr')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <span>CTR</span>
                </th>
                <th
                  onClick={() => handleSort('cpc')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <span>Avg CPC</span>
                </th>
                <th
                  onClick={() => handleSort('conversions')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <span>Conv.</span>
                </th>
                <th
                  onClick={() => handleSort('cpa')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <span>CPA</span>
                </th>
                <th
                  onClick={() => handleSort('conversion_value')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                >
                  <span>Conv. Value</span>
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
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Loading campaigns...
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No campaigns found matching criteria
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => {
                      setActiveDrawerId(c.id);
                      if (onSelectCampaign) onSelectCampaign(c.id);
                    }}
                    className="hover:bg-blue-50/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 hover:text-blue-600 transition flex items-center gap-1.5">
                        <span className="truncate max-w-xs">{c.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ID: {c.external_campaign_id} • Budget: {formatCurrency(c.daily_budget, currency)}/day
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status === 'ENABLED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {c.advertising_channel_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {formatCurrency(c.spend, currency)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(c.impressions)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCount(c.clicks)}</td>
                    <td className="py-3 px-3 text-right text-slate-700 font-medium">
                      {formatPercentage(c.ctr)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(c.cpc, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCount(c.conversions)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(c.cpa, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-900">
                      {formatCurrency(c.conversion_value, currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                        {formatROAS(c.roas)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Detail Drawer */}
      <CampaignDetailDrawer
        campaignId={activeDrawerId}
        onClose={() => {
          setActiveDrawerId(null);
          if (onSelectCampaign) onSelectCampaign(null);
        }}
        currency={currency}
        startDate={filter.startDate}
        endDate={filter.endDate}
      />
    </div>
  );
};
