// src/app/pages/marketing/meta-ads/MetaKPICardsGrid.tsx
// Phase 27: Executive 11-KPI Scorecard Grid with Comparison Differentials

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  Eye,
  Users,
  MousePointer,
  Percent,
  Coins,
  Target,
  ShoppingBag,
  Award,
  Zap,
} from 'lucide-react';
import type { MetaDashboardKPIs, MetaKPICardData } from '../../../../types/meta.ts';
import {
  formatCurrency,
  formatCount,
  formatPercentage,
  formatROAS,
  getDeltaBadgeStyle,
} from '../../../../utils/metaMetrics.ts';

export interface MetaKPICardsGridProps {
  kpis: MetaDashboardKPIs;
  currency: string;
  hasComparison: boolean;
}

export function MetaKPICardsGrid({ kpis, currency, hasComparison }: MetaKPICardsGridProps) {
  const getIcon = (key: string) => {
    switch (key) {
      case 'spend':
        return <DollarSign className="w-4 h-4 text-indigo-600" />;
      case 'impressions':
        return <Eye className="w-4 h-4 text-blue-600" />;
      case 'reach':
        return <Users className="w-4 h-4 text-cyan-600" />;
      case 'clicks':
        return <MousePointer className="w-4 h-4 text-sky-600" />;
      case 'ctr':
        return <Percent className="w-4 h-4 text-teal-600" />;
      case 'cpc':
        return <Coins className="w-4 h-4 text-amber-600" />;
      case 'cpm':
        return <Coins className="w-4 h-4 text-orange-600" />;
      case 'conversions':
        return <Target className="w-4 h-4 text-emerald-600" />;
      case 'cpa':
        return <Zap className="w-4 h-4 text-violet-600" />;
      case 'conversion_value':
        return <ShoppingBag className="w-4 h-4 text-purple-600" />;
      case 'roas':
        return <Award className="w-4 h-4 text-rose-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatValue = (kpi: MetaKPICardData, val: number | null) => {
    if (val == null) return 'N/A';
    if (kpi.key === 'roas') return formatROAS(val);
    if (kpi.key === 'ctr') return formatPercentage(val, 2);
    if (kpi.isCurrency) return formatCurrency(val, currency);
    return formatCount(val);
  };

  const cardsList: MetaKPICardData[] = [
    kpis.spend,
    kpis.impressions,
    kpis.reach,
    kpis.clicks,
    kpis.ctr,
    kpis.cpc,
    kpis.cpm,
    kpis.conversions,
    kpis.cpa,
    kpis.conversion_value,
    kpis.roas,
  ];

  return (
    <div className="space-y-3">
      {/* Disclaimer / Distinguish Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>
            <strong className="text-slate-700">Meta Conversion Value</strong> represents platform-reported pixel and CAPI attribution and is distinguished from finalized Jyotsvan ERP ledger revenue.
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 uppercase">Currency: {currency}</span>
      </div>

      {/* 11 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {cardsList.map((card) => {
          const badge = getDeltaBadgeStyle(card.direction, card.isPositiveGood);
          const hasDiff = hasComparison && card.percentageChange != null;

          return (
            <div
              key={card.key}
              className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-1.5 relative group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-medium text-slate-600">{card.label}</span>
                <div className="p-1 rounded-md bg-slate-50 border border-slate-100">
                  {getIcon(card.key)}
                </div>
              </div>

              {/* Main Metric Value */}
              <div className="text-lg font-bold text-slate-900 tracking-tight">
                {formatValue(card, card.currentValue)}
              </div>

              {/* Differential Comparison Strip */}
              {hasComparison ? (
                hasDiff ? (
                  <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold border text-[10px] ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {card.direction === 'up' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : card.direction === 'down' ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      {card.percentageChange != null ? `${card.percentageChange > 0 ? '+' : ''}${card.percentageChange.toFixed(1)}%` : '0%'}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">vs prev</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 pt-1">Comparison N/A</div>
                )
              ) : (
                <div className="text-[10px] text-slate-400 pt-1 truncate">{card.tooltipText?.slice(0, 30)}...</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
