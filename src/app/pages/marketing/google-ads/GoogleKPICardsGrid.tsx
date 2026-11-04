// src/app/pages/marketing/google-ads/GoogleKPICardsGrid.tsx
// Phase 29: 9-Card Google Ads KPI Grid with Delta Comparison & ERP Revenue Guardrails

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  DollarSign,
  Eye,
  MousePointer,
  Percent,
  Coins,
  CheckCircle2,
  Target,
  Sparkles,
  BarChart3,
  Info,
} from 'lucide-react';
import type { GoogleDashboardKPIs, GoogleKPICardData } from '../../../../types/google-ads.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
  getDeltaBadgeStyle,
} from '../../../../utils/googleAdsMetrics.ts';

interface GoogleKPICardsGridProps {
  kpis: GoogleDashboardKPIs;
  currency?: string;
}

export const GoogleKPICardsGrid: React.FC<GoogleKPICardsGridProps> = ({
  kpis,
  currency = 'INR',
}) => {
  const cardList: {
    kpi: GoogleKPICardData;
    icon: React.ReactNode;
    color: string;
    formatter: (val: number | null | undefined) => string;
  }[] = [
    {
      kpi: kpis.spend,
      icon: <Coins className="w-4 h-4 text-rose-600" />,
      color: 'bg-rose-50 text-rose-700 border-rose-100',
      formatter: (v) => formatCurrency(v, currency),
    },
    {
      kpi: kpis.impressions,
      icon: <Eye className="w-4 h-4 text-blue-600" />,
      color: 'bg-blue-50 text-blue-700 border-blue-100',
      formatter: (v) => formatCount(v),
    },
    {
      kpi: kpis.clicks,
      icon: <MousePointer className="w-4 h-4 text-indigo-600" />,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      formatter: (v) => formatCount(v),
    },
    {
      kpi: kpis.ctr,
      icon: <Percent className="w-4 h-4 text-violet-600" />,
      color: 'bg-violet-50 text-violet-700 border-violet-100',
      formatter: (v) => formatPercentage(v),
    },
    {
      kpi: kpis.cpc,
      icon: <DollarSign className="w-4 h-4 text-amber-600" />,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
      formatter: (v) => formatCurrency(v, currency),
    },
    {
      kpi: kpis.conversions,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      formatter: (v) => formatCount(v),
    },
    {
      kpi: kpis.cpa,
      icon: <Target className="w-4 h-4 text-cyan-600" />,
      color: 'bg-cyan-50 text-cyan-700 border-cyan-100',
      formatter: (v) => formatCurrency(v, currency),
    },
    {
      kpi: kpis.conversion_value,
      icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      formatter: (v) => formatCurrency(v, currency),
    },
    {
      kpi: kpis.roas,
      icon: <BarChart3 className="w-4 h-4 text-purple-600" />,
      color: 'bg-purple-50 text-purple-700 border-purple-100',
      formatter: (v) => formatROAS(v),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 9 Cards Grid */}
      <div id="google-ads-kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-3">
        {cardList.map(({ kpi, icon, color, formatter }, index) => {
          const deltaStyle = getDeltaBadgeStyle(kpi.direction, kpi.isPositiveGood);

          return (
            <div
              key={kpi.key}
              id={`kpi-card-${kpi.key}`}
              className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              {/* Top Row: Icon & Label */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className={`p-1.5 rounded-lg border ${color}`}>{icon}</div>
                  <span className="text-xs font-semibold text-slate-600 truncate">{kpi.label}</span>
                </div>
                {kpi.tooltipText && (
                  <div className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                    <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[11px] leading-tight rounded-md shadow-lg z-30 pointer-events-none">
                      {kpi.tooltipText}
                    </div>
                  </div>
                )}
              </div>

              {/* Middle Row: Main Metric Value */}
              <div className="my-1">
                <span className="text-xl font-bold text-slate-900 tracking-tight">
                  {formatter(kpi.currentValue)}
                </span>
              </div>

              {/* Bottom Row: Delta Pill & Comparison */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                {kpi.previousValue != null && kpi.percentageChange != null ? (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${deltaStyle.bg} ${deltaStyle.text} ${deltaStyle.border}`}
                  >
                    {kpi.direction === 'up' && <TrendingUp className="w-2.5 h-2.5" />}
                    {kpi.direction === 'down' && <TrendingDown className="w-2.5 h-2.5" />}
                    {kpi.direction === 'neutral' && <Minus className="w-2.5 h-2.5" />}
                    <span>{Math.abs(kpi.percentageChange)}%</span>
                  </span>
                ) : (
                  <span className="text-slate-400 text-[10px]">No baseline</span>
                )}

                <span className="text-slate-400 text-[10px] truncate">
                  {kpi.previousValue != null ? `Prev: ${formatter(kpi.previousValue)}` : 'Current'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Distinction Banner: Google Ads Tracked Conversion Value vs. Jyotsvan ERP Ledger Revenue */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Attribution Notice:</strong> <em>Conversion Value</em> reflects Google Ads pixel & tag-attributed value under the configured attribution model (Last Click / Data-Driven). Finalized business revenue is reconciled in Jyotsvan ERP & Shopify Ledgers.
          </span>
        </div>
      </div>
    </div>
  );
};
