import React from 'react';
import {
  FileText,
  Clock,
  ShoppingCart,
  Truck,
  CheckCircle2,
  PackageCheck,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import type { ProcurementSummary } from '../../../types/procurement';

interface ProcurementMetricsHeaderProps {
  metrics: ProcurementSummary | null;
  loading?: boolean;
  onRefresh?: () => void;
  onFilterTab?: (tab: 'requests' | 'orders' | 'receipts') => void;
}

export const ProcurementMetricsHeader: React.FC<ProcurementMetricsHeaderProps> = ({
  metrics,
  onFilterTab,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const cards = [
    {
      id: 'spend',
      title: 'Total Procurement Spend',
      value: formatCurrency(metrics?.total_procurement_value || 0),
      subtitle: `${metrics?.open_purchase_orders || 0} active PO commitments`,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-100',
      action: () => onFilterTab?.('orders'),
    },
    {
      id: 'pr_pending',
      title: 'Pending PR Approvals',
      value: metrics?.pending_requests_approval || 0,
      subtitle: `Out of ${metrics?.total_purchase_requests || 0} total requests`,
      icon: Clock,
      color: (metrics?.pending_requests_approval || 0) > 0 ? 'text-amber-600' : 'text-slate-600',
      bgColor: (metrics?.pending_requests_approval || 0) > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100',
      badge: (metrics?.pending_requests_approval || 0) > 0 ? 'Action Required' : 'Up to Date',
      badgeColor: (metrics?.pending_requests_approval || 0) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700',
      action: () => onFilterTab?.('requests'),
    },
    {
      id: 'po_awaiting',
      title: 'Orders Awaiting Inward',
      value: (metrics?.orders_awaiting_receipt || 0) + (metrics?.partially_received_orders || 0),
      subtitle: `${metrics?.partially_received_orders || 0} partially received`,
      icon: Truck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-100',
      badge: 'In-Transit',
      badgeColor: 'bg-blue-100 text-blue-800',
      action: () => onFilterTab?.('orders'),
    },
    {
      id: 'grn_completed',
      title: 'Goods Receipts (GRN)',
      value: metrics?.total_grns_created || 0,
      subtitle: `${metrics?.pending_qc_grns || 0} awaiting QC clearance`,
      icon: PackageCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-100',
      action: () => onFilterTab?.('receipts'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={`metric-card-${card.id}`}
            onClick={card.action}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-slate-300"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  {card.title}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {card.value}
                </h3>
              </div>
              <div className={`p-2.5 rounded-lg border ${card.bgColor} group-hover:scale-105 transition-transform`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">{card.subtitle}</span>
              {card.badge && (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                  {card.badge}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
