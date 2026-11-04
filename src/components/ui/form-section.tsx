import React from 'react';
import { cn } from '../../lib/utils';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  collapsible?: boolean;
}

export function FormSection({
  title,
  description,
  children,
  columns = 2,
  className,
}: FormSectionProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('space-y-4 pt-4 border-t border-slate-200/80 first:pt-0 first:border-0', className)}>
      <div>
        <h4 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h4>
        {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>

      <div className={cn('grid gap-4', colClasses[columns])}>{children}</div>
    </div>
  );
}
