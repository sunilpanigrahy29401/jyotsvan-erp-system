import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Card } from './card';
import { Skeleton } from './skeleton';
import { Tooltip } from './tooltip';
import type { KPITrend } from '../../types/common';

export interface KPICardProps {
  label: string;
  value: React.ReactNode;
  change?: string | number;
  changePercentage?: string | number;
  trend?: KPITrend;
  trendLabel?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  tooltip?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  onClick?: () => void;
  className?: string;
  highlight?: boolean;
}

export function KPICard({
  label,
  value,
  change,
  changePercentage,
  trend,
  trendLabel = 'vs previous period',
  icon,
  subtitle,
  tooltip,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No data available',
  onClick,
  className,
  highlight = false,
}: KPICardProps) {
  if (isLoading) {
    return (
      <Card className={cn('p-5 rounded-lg space-y-3 bg-white border-slate-200', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-24" />
          {icon && <Skeleton variant="circular" className="w-7 h-7" />}
        </div>
        <Skeleton className="h-7 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
      </Card>
    );
  }

  const getTrendStyles = (t?: KPITrend) => {
    switch (t) {
      case 'up':
        return {
          textColor: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
          icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
        };
      case 'down':
        return {
          textColor: 'text-red-700 bg-red-50 border-red-200/80',
          icon: <TrendingDown className="w-3.5 h-3.5 text-red-600 shrink-0" />,
        };
      default:
        return {
          textColor: 'text-slate-600 bg-slate-100 border-slate-200',
          icon: <Minus className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
        };
    }
  };

  const trendData = trend ? getTrendStyles(trend) : null;
  const isInteractive = Boolean(onClick);

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-5 rounded-lg border transition-all duration-150 relative overflow-hidden',
        highlight ? 'border-slate-900 shadow-sm bg-slate-900/[0.01]' : 'border-slate-200 bg-white hover:border-slate-300',
        isInteractive && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      {/* Top row: Label + Tooltip + Icon */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-slate-600 truncate uppercase tracking-wider">
            {label}
          </span>
          {tooltip && (
            <Tooltip content={tooltip}>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-help"
                aria-label={`More info about ${label}`}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}
        </div>

        {icon && (
          <div className="w-8 h-8 rounded-md bg-slate-100/90 border border-slate-200/60 flex items-center justify-center text-slate-700 shrink-0">
            {icon}
          </div>
        )}
      </div>

      {/* Metric Main Value */}
      <div className="my-1.5">
        {isEmpty ? (
          <span className="text-sm font-medium text-slate-400 italic">{emptyMessage}</span>
        ) : (
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {value}
          </div>
        )}
      </div>

      {/* Bottom row: Trend badge & subtitle */}
      {!isEmpty && (trend || changePercentage || subtitle) && (
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          {(trend || changePercentage) && trendData && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-semibold tabular-nums leading-tight',
                trendData.textColor
              )}
            >
              {trendData.icon}
              {changePercentage ? (typeof changePercentage === 'number' ? `${changePercentage > 0 ? '+' : ''}${changePercentage}%` : changePercentage) : change}
            </span>
          )}

          {subtitle && (
            <span className="text-slate-500 text-xs truncate" title={subtitle}>
              {subtitle}
            </span>
          )}

          {!subtitle && trend && trendLabel && (
            <span className="text-slate-400 text-[11px] truncate">
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
