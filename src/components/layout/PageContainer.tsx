import React from 'react';
import { cn } from '../../lib/utils';
import { PageHeader } from './PageHeader';

export interface PageContainerProps {
  title: string;
  description?: string;
  subtitle?: string; // alias for backward compatibility
  phaseBadge?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  description,
  subtitle,
  phaseBadge,
  actions,
  breadcrumbs,
  children,
  className,
}: PageContainerProps) {
  const displayDescription = description || subtitle;

  return (
    <div className={cn('w-full space-y-6', className)}>
      {(title || displayDescription || actions || phaseBadge || breadcrumbs) && (
        <PageHeader
          title={title}
          description={displayDescription}
          phaseBadge={phaseBadge}
          actions={actions}
          breadcrumbs={breadcrumbs}
        />
      )}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
