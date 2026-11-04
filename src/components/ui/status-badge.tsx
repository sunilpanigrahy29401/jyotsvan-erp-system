import React from 'react';
import { cn } from '../../lib/utils';
import { formatStatusLabel } from '../../lib/format';
import type { SemanticStatus } from '../../types/common';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  RefreshCw,
  AlertTriangle,
  Truck,
  ShieldCheck,
  ShieldAlert,
  Archive,
  MinusCircle,
} from 'lucide-react';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: SemanticStatus | string;
  label?: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  showDot?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'default';
}

interface StatusDefinition {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_REGISTRY: Record<string, StatusDefinition> = {
  active: { label: 'Active', variant: 'success', icon: CheckCircle2 },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
  completed: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
  published: { label: 'Published', variant: 'success', icon: CheckCircle2 },
  quality_pass: { label: 'Quality Passed', variant: 'success', icon: ShieldCheck },

  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  processing: { label: 'Processing', variant: 'info', icon: RefreshCw },
  in_transit: { label: 'In Transit', variant: 'info', icon: Truck },

  draft: { label: 'Draft', variant: 'neutral', icon: FileText },
  inactive: { label: 'Inactive', variant: 'neutral', icon: MinusCircle },
  archived: { label: 'Archived', variant: 'neutral', icon: Archive },

  low_stock: { label: 'Low Stock', variant: 'warning', icon: AlertTriangle },
  quarantine: { label: 'Quarantined', variant: 'warning', icon: AlertTriangle },
  overdue: { label: 'Overdue', variant: 'error', icon: AlertCircle },

  rejected: { label: 'Rejected', variant: 'error', icon: XCircle },
  cancelled: { label: 'Cancelled', variant: 'error', icon: XCircle },
  quality_fail: { label: 'Quality Failed', variant: 'error', icon: ShieldAlert },
};

export function StatusBadge({
  status,
  label,
  variant: forcedVariant,
  showDot = false,
  showIcon = true,
  size = 'default',
  className,
  ...props
}: StatusBadgeProps) {
  const normalizedKey = status.toLowerCase().replace(/\s+/g, '_');
  const definition = STATUS_REGISTRY[normalizedKey] || {
    label: formatStatusLabel(status),
    variant: 'neutral',
    icon: MinusCircle,
  };

  const activeVariant = forcedVariant || definition.variant;
  const displayLabel = label || definition.label;
  const IconComponent = definition.icon;

  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    error: 'bg-red-50 text-red-800 border-red-200/80',
    info: 'bg-sky-50 text-sky-800 border-sky-200/80',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const dotStyles = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400',
  };

  const iconColorStyles = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
    info: 'text-sky-600',
    neutral: 'text-slate-500',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    default: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      role="status"
      aria-label={`Status: ${displayLabel}`}
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap leading-none transition-colors select-none',
        variantStyles[activeVariant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[activeVariant])} />
      )}
      {showIcon && (
        <IconComponent
          className={cn(
            'shrink-0',
            size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5',
            iconColorStyles[activeVariant]
          )}
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
