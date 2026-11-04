import React from 'react';
import { cn } from '../../lib/utils';
import { CheckSquare, X } from 'lucide-react';
import { Button } from './button';

export interface BulkActionBarProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  children,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 text-white rounded-lg shadow-lg animate-in fade-in-0 slide-in-from-top-2',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold tabular-nums">
            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
          </span>
        </div>

        {totalCount && totalCount > selectedCount && onSelectAll && (
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[11px] text-slate-300 hover:text-white underline transition-colors"
          >
            Select all {totalCount}
          </button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-6 px-2 text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] gap-1"
        >
          <X className="w-3 h-3" />
          Deselect
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}
