// src/app/pages/marketing/google-ads/ConversionsTab.tsx
// Phase 29: Google Ads Conversion Actions & Tag Performance View

import React, { useEffect, useState } from 'react';
import { Target, CheckCircle2, DollarSign, Sparkles, RefreshCw, AlertCircle, Info } from 'lucide-react';
import type { GoogleConversionAction, GoogleAnalyticsFilter } from '../../../../types/google-ads.ts';
import { googleAdsAnalyticsApi } from '../../../../services/googleAdsAnalyticsApi.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
} from '../../../../utils/googleAdsMetrics.ts';

interface ConversionsTabProps {
  filter: GoogleAnalyticsFilter;
  currency?: string;
}

export const ConversionsTab: React.FC<ConversionsTabProps> = ({ filter, currency = 'INR' }) => {
  const [conversions, setConversions] = useState<GoogleConversionAction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversions = () => {
    setLoading(true);
    googleAdsAnalyticsApi
      .getConversions(filter)
      .then((res) => {
        setConversions(res.conversions || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch conversions:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchConversions();
  }, [filter.accountId, filter.startDate, filter.endDate]);

  return (
    <div id="google-ads-conversions-tab" className="space-y-6">
      {/* Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong>Attribution Model & Tag Synchronizer:</strong> Tracked conversions represent Google Ads conversion goals (Purchase, Leads, Page Views) reported via Google tag (gtag.js) and enhanced conversions. These values reflect advertising attribution and are kept distinct from audited ERP accounting revenue.
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Synchronized Conversion Actions</h3>
          </div>
          <button
            type="button"
            onClick={fetchConversions}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Conversion Action</th>
                <th className="py-3 px-3 font-semibold">Category</th>
                <th className="py-3 px-3 font-semibold">Goal Status</th>
                <th className="py-3 px-3 font-semibold text-right">Total Conversions</th>
                <th className="py-3 px-3 font-semibold text-right">% of Total</th>
                <th className="py-3 px-3 font-semibold text-right">Conv. Value</th>
                <th className="py-3 px-3 font-semibold text-right">Cost / Conv. (CPA)</th>
                <th className="py-3 px-4 font-semibold text-right">Value / Conv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading conversion actions...
                  </td>
                </tr>
              ) : conversions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No conversion actions recorded
                  </td>
                </tr>
              ) : (
                conversions.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        ID: {c.external_conversion_id} • Type: {c.type}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {c.category}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {c.primary_for_goal ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Primary Goal
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Secondary
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCount(c.conversions)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {c.percentage_of_total}%
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(c.conversion_value, currency)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(c.cpa, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(c.value_per_conversion, currency)}
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
