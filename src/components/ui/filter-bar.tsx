import React from 'react';
import { cn } from '../../lib/utils';
import { SearchInput } from './search-input';
import { DateRangePicker } from './date-range-picker';
import { Button } from './button';
import { RotateCcw, X } from 'lucide-react';
import type { DateRange } from '../../types/common';

export interface ActiveFilterTag {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export interface FilterBarProps {
  // Search slot
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  searchDebounceMs?: number;

  // Date Range slot
  dateRange?: DateRange | null;
  onDateRangeChange?: (range: DateRange | null) => void;
  showDateRange?: boolean;

  // Custom filters slot
  children?: React.ReactNode;

  // Action buttons slot (e.g. Export, View Mode toggles)
  actions?: React.ReactNode;

  // Active filter tags
  activeTags?: ActiveFilterTag[];
  onResetAll?: () => void;
  hasActiveFilters?: boolean;

  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  searchDebounceMs = 250,
  dateRange,
  onDateRangeChange,
  showDateRange = false,
  children,
  actions,
  activeTags = [],
  onResetAll,
  hasActiveFilters = false,
  className,
}: FilterBarProps) {
  const showReset = hasActiveFilters || activeTags.length > 0 || Boolean(searchValue) || Boolean(dateRange);

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Main Filter Controls Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        {/* Left Side: Search + Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {onSearchChange && (
            <SearchInput
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              debounceMs={searchDebounceMs}
              className="max-w-xs shrink-0"
            />
          )}

          {showDateRange && onDateRangeChange && (
            <DateRangePicker
              value={dateRange}
              onChange={onDateRangeChange}
              className="shrink-0"
            />
          )}

          {children}

          {showReset && onResetAll && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetAll}
              className="text-slate-500 hover:text-slate-900 text-xs gap-1.5 h-9 shrink-0"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Right Side: Additional Action Buttons */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            {actions}
          </div>
        )}
      </div>

      {/* Active Filter Tags Row */}
      {activeTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-1 text-xs">
          <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">
            Active Filters:
          </span>

          {activeTags.map((tag) => (
            <span
              key={`${tag.key}-${tag.value}`}
              className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200/80 px-2 py-0.5 rounded-full text-xs font-medium"
            >
              <span className="text-slate-500 font-normal">{tag.label}:</span>
              <span>{tag.value}</span>
              <button
                type="button"
                onClick={tag.onRemove}
                className="hover:text-red-600 rounded-full p-0.5 transition-colors"
                title={`Remove ${tag.label} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {onResetAll && (
            <button
              type="button"
              onClick={onResetAll}
              className="text-[11px] text-slate-500 hover:text-slate-900 underline transition-colors ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
