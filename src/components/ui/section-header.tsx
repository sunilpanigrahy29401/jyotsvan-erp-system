import React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from './badge';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'info';
  icon?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  badge,
  badgeVariant = 'secondary',
  icon,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100', className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="text-slate-500 shrink-0">{icon}</span>}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 leading-snug">{title}</h3>
            {badge !== undefined && (
              <Badge variant={badgeVariant} className="text-[11px] px-2 py-0">
                {badge}
              </Badge>
            )}
          </div>
          {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
        </div>
      </div>

      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
