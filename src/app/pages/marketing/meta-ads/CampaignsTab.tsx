// src/app/pages/marketing/meta-ads/CampaignsTab.tsx
// Phase 27: Campaigns Management & Performance Analytics Table

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  ArrowUpDown,
  ChevronRight,
  Layers,
  CheckCircle2,
  PauseCircle,
  Archive,
} from 'lucide-react';
import type { MetaCampaign } from '../../../../types/meta.ts';
import { metaAnalyticsApi } from '../../../../services/metaAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
  exportToCSV,
} from '../../../../utils/metaMetrics.ts';

export interface CampaignsTabProps {
  accountId?: string;
  startDate: string;
  endDate: string;
  currency: string;
  onSelectCampaign: (campaignId: string) => void;
}

export function CampaignsTab({
  accountId,
  startDate,
  endDate,
  currency,
  onSelectCampaign,
}: CampaignsTabProps) {
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'>('ALL');
  const [sortBy, setSortBy] = useState<string>('spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    metaAnalyticsApi
      .getCampaigns({
        accountId,
        startDate,
        endDate,
        status: statusFilter,
        search: search || undefined,
        sortBy,
        sortOrder,
        limit: 100,
      })
      .then((res) => {
        if (isMounted) {
          setCampaigns(res.campaigns);
          setTotal(res.total);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [accountId, startDate, endDate, statusFilter, search, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleExport = () => {
    const headers = [
      'Campaign Name',
      'Status',
      'Objective',
      'Spend',
      'Impressions',
      'Reach',
      'Clicks',
      'CTR (%)',
      'CPC',
      'CPM',
      'Conversions',
      'CPA',
      'Conversion Value',
      'ROAS',
    ];

    const rows = campaigns.map((c) => [
      c.name,
      c.status,
      c.objective || '',
      c.spend ?? 0,
      c.impressions ?? 0,
      c.reach ?? 0,
      c.clicks ?? 0,
      c.ctr ? Number(c.ctr.toFixed(2)) : 0,
      c.cpc ? Number(c.cpc.toFixed(2)) : 0,
      c.cpm ? Number(c.cpm.toFixed(2)) : 0,
      c.conversions ?? 0,
      c.cpa ? Number(c.cpa.toFixed(2)) : 0,
      c.conversion_value ?? 0,
      c.roas ? Number(c.roas.toFixed(2)) : 0,
    ]);

    exportToCSV(`meta_campaigns_${startDate}_${endDate}`, headers, rows);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4">
      {/* Table Filter Controls Header */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {(['ALL', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as const).map((st) => (
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

        {/* Right action button */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">
            Showing {campaigns.length} of {total}
          </span>
          <button
            onClick={handleExport}
            disabled={campaigns.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Campaign Name</th>
              <th className="py-3 px-3">Status</th>
              <th
                onClick={() => handleSort('spend')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <span className="inline-flex items-center gap-1">
                  Spend <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th
                onClick={() => handleSort('conversions')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <span className="inline-flex items-center gap-1">
                  Conv <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th
                onClick={() => handleSort('roas')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <span className="inline-flex items-center gap-1">
                  ROAS <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th
                onClick={() => handleSort('cpa')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <span className="inline-flex items-center gap-1">
                  CPA <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th
                onClick={() => handleSort('ctr')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <span className="inline-flex items-center gap-1">
                  CTR <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th
                onClick={() => handleSort('clicks')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <span className="inline-flex items-center gap-1">
                  Clicks <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th
                onClick={() => handleSort('impressions')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <span className="inline-flex items-center gap-1">
                  Impressions <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  Loading campaigns...
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  No campaigns match the selected filters.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCampaign(c.id)}
                  className="hover:bg-blue-50/50 transition cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                    <div>{c.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal font-mono">
                      {c.external_campaign_id} • {c.objective || 'OUTCOME_SALES'}
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : c.status === 'PAUSED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {c.status === 'ACTIVE' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : c.status === 'PAUSED' ? (
                        <PauseCircle className="w-3 h-3" />
                      ) : (
                        <Archive className="w-3 h-3" />
                      )}
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                    {formatCurrency(c.spend, currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold">
                    {formatCount(c.conversions)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-emerald-600">
                    {formatROAS(c.roas)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold">
                    {formatCurrency(c.cpa, currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold">
                    {formatPercentage(c.ctr)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-600">
                    {formatCount(c.clicks)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-600">
                    {formatCount(c.impressions)}
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
