import React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

export interface PageHeaderProps {
  title: string;
  description?: string;
  phaseBadge?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  phaseBadge,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 pb-5 border-b border-slate-200', className)}>
      {breadcrumbs && <div className="mb-0.5">{breadcrumbs}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
            {phaseBadge && (
              <Badge variant="secondary" className="font-mono text-[10px] text-slate-700 bg-slate-100 border border-slate-200">
                {phaseBadge}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
