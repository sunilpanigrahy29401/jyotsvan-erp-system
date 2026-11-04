import React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from './badge';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number | string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills' | 'segmented';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  size = 'default',
  className,
}: TabsProps) {
  const sizeStyles = {
    sm: 'text-xs py-1.5 px-3 gap-1.5',
    default: 'text-xs sm:text-sm py-2 px-3.5 gap-2',
    lg: 'text-sm py-2.5 px-4 gap-2.5',
  };

  if (variant === 'segmented') {
    return (
      <div
        role="tablist"
        className={cn(
          'inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80 select-none overflow-x-auto max-w-full',
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.id)}
              className={cn(
                'inline-flex items-center justify-center font-medium rounded-md transition-all whitespace-nowrap',
                sizeStyles[size],
                isActive
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50',
                tab.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className="ml-1 text-[10px] px-1.5 py-0 h-4"
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div
        role="tablist"
        className={cn('flex items-center gap-1.5 select-none overflow-x-auto max-w-full pb-1', className)}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.id)}
              className={cn(
                'inline-flex items-center justify-center font-medium rounded-full transition-colors whitespace-nowrap border',
                sizeStyles[size],
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50',
                tab.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold',
                    isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Underline variant (standard enterprise tab bar)
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-6 border-b border-slate-200 select-none overflow-x-auto max-w-full',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={cn(
              'inline-flex items-center font-medium transition-all whitespace-nowrap border-b-2 -mb-px pb-3 pt-1',
              sizeStyles[size],
              isActive
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300',
              tab.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <Badge
                variant={isActive ? 'default' : 'secondary'}
                className="ml-1 text-[10px] px-1.5 py-0 h-4"
              >
                {tab.count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
