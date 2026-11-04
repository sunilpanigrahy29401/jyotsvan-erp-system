// src/app/pages/marketing/google-ads/CampaignDetailDrawer.tsx
// Phase 29: Campaign Detail Drawer with Metrics & Nested Ad Groups

import React, { useEffect, useState } from 'react';
import {
  X,
  Layers,
  Calendar,
  DollarSign,
  TrendingUp,
  Target,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
} from '../../../../utils/googleAdsMetrics.ts';

interface CampaignDetailDrawerProps {
  campaignId: string | null;
  onClose: () => void;
  currency?: string;
  startDate?: string;
  endDate?: string;
}

export const CampaignDetailDrawer: React.FC<CampaignDetailDrawerProps> = ({
  campaignId,
  onClose,
  currency = 'INR',
  startDate,
  endDate,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    googleAdsAnalyticsApi
      .getCampaignDetails(campaignId, { startDate, endDate })
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load campaign details');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [campaignId, startDate, endDate]);

  if (!campaignId) return null;

  const campaign = data?.campaign;
  const trends = data?.trends || [];
  const adGroups = data?.adGroups || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition ease-in-out duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 truncate max-w-md">
                {campaign?.name || 'Campaign Details'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>ID: {campaign?.external_campaign_id || campaignId}</span>
                <span>•</span>
                <span className="font-semibold text-blue-600">
                  {campaign?.advertising_channel_type || 'SEARCH'}
                </span>
                <span>•</span>
                <span
                  className={`font-semibold ${
                    campaign?.status === 'ENABLED' ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  {campaign?.status || 'ENABLED'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              Loading campaign intelligence...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          ) : (
            <>
              {/* Core KPI Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500">Spend</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCurrency(campaign?.spend, currency)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500">Impressions</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCount(campaign?.impressions)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500">Clicks (CTR)</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCount(campaign?.clicks)}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({formatPercentage(campaign?.ctr)})
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500">Avg. CPC</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCurrency(campaign?.cpc, currency)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500">Conversions</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCount(campaign?.conversions)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500">Cost / Conv. (CPA)</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCurrency(campaign?.cpa, currency)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500">Conv. Value</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCurrency(campaign?.conversion_value, currency)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500">ROAS</span>
                  <div className="text-base font-bold text-emerald-600 mt-0.5">
                    {formatROAS(campaign?.roas)}
                  </div>
                </div>
              </div>

              {/* Timeseries Trend */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-900 mb-2">Campaign Performance Trend</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trends.map((t: any) => ({ ...t, date: t.date.slice(5) }))}
                      margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '6px',
                          color: '#FFF',
                          fontSize: '11px',
                        }}
                      />
                      <Line type="monotone" dataKey="spend" stroke="#EF4444" strokeWidth={2} dot={false} />
                      <Line
                        type="monotone"
                        dataKey="conversion_value"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Nested Ad Groups */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-900 mb-3">
                  Ad Groups in this Campaign ({adGroups.length})
                </h3>
                <div className="divide-y divide-slate-100">
                  {adGroups.map((ag: any) => (
                    <div key={ag.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{ag.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Clicks: {formatCount(ag.clicks)} • CTR: {formatPercentage(ag.ctr)} • CPC:{' '}
                          {formatCurrency(ag.cpc, currency)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(ag.spend, currency)}</div>
                        <div className="text-[11px] font-semibold text-emerald-600">
                          {formatCount(ag.conversions)} conv • {formatROAS(ag.roas)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
