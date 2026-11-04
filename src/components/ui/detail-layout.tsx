import React from 'react';
import { cn } from '../../lib/utils';
import { ArrowLeft } from 'lucide-react';
import { Button } from './button';
import { StatusBadge } from './status-badge';
import type { SemanticStatus } from '../../types/common';

export interface DetailHighlightItem {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

export interface DetailLayoutProps {
  // Navigation & Header
  title: string;
  subtitle?: string;
  status?: SemanticStatus | string;
  statusLabel?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;

  // Highlights Bar
  highlights?: DetailHighlightItem[];

  // Navigation Tabs
  tabsSlot?: React.ReactNode;

  // Main Content & Sidebar
  children: React.ReactNode;
  sidebar?: React.ReactNode;

  className?: string;
}

export function DetailLayout({
  title,
  subtitle,
  status,
  statusLabel,
  onBack,
  backLabel = 'Back',
  actions,
  breadcrumbs,
  highlights = [],
  tabsSlot,
  children,
  sidebar,
  className,
}: DetailLayoutProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Top Navigation & Actions */}
      <div className="space-y-3">
        {breadcrumbs && <div>{breadcrumbs}</div>}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBack}
                className="h-8 px-2.5 text-xs text-slate-600 shrink-0"
                title={backLabel}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                {backLabel}
              </Button>
            )}

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                  {title}
                </h1>
                {status && (
                  <StatusBadge
                    status={status}
                    label={statusLabel}
                    className="shrink-0"
                  />
                )}
              </div>
              {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
            </div>
          </div>

          {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
        </div>
      </div>

      {/* Highlights Bar */}
      {highlights.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          {highlights.map((item, idx) => (
            <div key={idx} className="space-y-1 border-r border-slate-100 last:border-0 pr-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                {item.icon && <span className="text-slate-400 shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </div>
              <div className="text-sm sm:text-base font-semibold text-slate-900 truncate tabular-nums">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs Slot */}
      {tabsSlot && <div>{tabsSlot}</div>}

      {/* Body Area: Main Content + Sidebar */}
      <div className={cn('grid gap-6', sidebar ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1')}>
        <div className={cn(sidebar ? 'lg:col-span-2 space-y-6' : 'space-y-6')}>{children}</div>
        {sidebar && <div className="space-y-6">{sidebar}</div>}
      </div>
    </div>
  );
}
