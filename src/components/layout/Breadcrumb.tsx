import React from 'react';
import type { BreadcrumbItem } from '../../types/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate?: (path: string) => void;
  className?: string;
}

export function Breadcrumb({ items, onNavigate, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-1.5 text-xs text-slate-500', className)}>
      <button
        onClick={() => onNavigate?.('/command-center')}
        className="inline-flex items-center text-slate-400 hover:text-slate-700 transition-colors p-0.5"
        title="Command Center"
      >
        <Home className="w-3.5 h-3.5" />
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            {isLast || !item.href ? (
              <span className={cn('font-medium', isLast ? 'text-slate-900' : 'text-slate-500')}>
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => onNavigate && item.href && onNavigate(item.href)}
                className="hover:text-slate-900 transition-colors"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
