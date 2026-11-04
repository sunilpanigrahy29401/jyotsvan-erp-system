import React from 'react';
import { cn } from '../../../lib/utils';
import { Card } from '../card';
import { Skeleton } from '../skeleton';
import { EmptyState } from '../empty-state';
import { ErrorState } from '../error-state';
import { BarChart3 } from 'lucide-react';

export interface ChartContainerProps {
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  height?: number | string;
  className?: string;
}

export function ChartContainer({
  title,
  subtitle,
  action,
  children,
  isLoading = false,
  error = null,
  isEmpty = false,
  emptyTitle = 'No chart telemetry available',
  emptyDescription = 'There is insufficient data recorded for this time window.',
  onRetry,
  height = 320,
  className,
}: ChartContainerProps) {
  const containerHeightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <Card className={cn('p-5 rounded-lg border border-slate-200 bg-white shadow-xs flex flex-col', className)}>
      {(title || subtitle || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-2 border-b border-slate-100">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-slate-900 leading-snug">{title}</h3>
            )}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}

      <div style={{ height: containerHeightStyle }} className="w-full flex-1 min-h-[200px] relative">
        {isLoading && (
          <div className="w-full h-full flex flex-col justify-between p-4 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        )}

        {!isLoading && error && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <ErrorState message={error} onRetry={onRetry} />
          </div>
        )}

        {!isLoading && !error && isEmpty && (
          <div className="w-full h-full flex items-center justify-center">
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              icon={<BarChart3 className="w-6 h-6 text-slate-400" />}
              className="border-0 p-6"
            />
          </div>
        )}

        {!isLoading && !error && !isEmpty && children}
      </div>
    </Card>
  );
}
