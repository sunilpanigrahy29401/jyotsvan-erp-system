// src/app/pages/field-sales/components/FieldSalesMetricsHeader.tsx
import React from 'react';
import {
  CalendarCheck,
  TrendingUp,
  CreditCard,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import type { FieldSalesDashboardMetrics } from '../../../../types/field-sales';

interface FieldSalesMetricsHeaderProps {
  metrics: FieldSalesDashboardMetrics | null;
  loading?: boolean;
}

export const FieldSalesMetricsHeader: React.FC<FieldSalesMetricsHeaderProps> = ({ metrics, loading }) => {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="mb-6 space-y-3">
      {/* Top Mobile-Friendly Quick Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Today's Visits Completed */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Today's Visits</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{metrics.today_completed_visits}</span>
            <span className="text-xs text-slate-500 font-medium">/ {metrics.today_planned_visits} planned</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${
                  metrics.today_planned_visits > 0
                    ? Math.min(100, (metrics.today_completed_visits / metrics.today_planned_visits) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* In-Progress / Active */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>In-Progress</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-amber-600">{metrics.today_in_progress_visits}</span>
            <span className="text-xs text-slate-500">active now</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">
            {metrics.today_pending_visits} pending on today's beat
          </p>
        </div>

        {/* Orders Booked Today */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Today's Orders</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-900">{formatCurrency(metrics.today_orders_value)}</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-2">
            {metrics.today_orders_count} orders created
          </p>
        </div>

        {/* Collections Collected Today */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Collections</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-900">
              {formatCurrency(metrics.today_collections_value)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">On-site receipts</p>
        </div>

        {/* Monthly Target Pace */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Monthly Target</span>
            <Target className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{metrics.monthly_target_achievement_pct}%</span>
            <span className="text-xs text-slate-500 font-medium">achieved</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.monthly_target_achievement_pct)}%` }}
            />
          </div>
        </div>

        {/* Pending Follow-ups */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Open Tasks</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{metrics.pending_tasks_count}</span>
            {metrics.overdue_tasks_count > 0 ? (
              <span className="text-xs text-rose-600 font-medium">{metrics.overdue_tasks_count} overdue</span>
            ) : (
              <span className="text-xs text-emerald-600 font-medium">all current</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">Action items</p>
        </div>
      </div>
    </div>
  );
};
