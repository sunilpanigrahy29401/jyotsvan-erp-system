import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { formatDateTime, formatRelativeTime } from '../../lib/format';
import { StatusBadge } from './status-badge';
import { User, ChevronDown, ChevronUp } from 'lucide-react';
import type { ActivityTimelineItem, SemanticStatus } from '../../types/common';

export interface ActivityTimelineProps {
  items: ActivityTimelineItem[];
  emptyMessage?: string;
  showRelativeTime?: boolean;
  className?: string;
}

export function ActivityTimeline({
  items,
  emptyMessage = 'No activity recorded yet.',
  showRelativeTime = true,
  className,
}: ActivityTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 italic bg-white rounded-lg border border-dashed border-slate-200">
        {emptyMessage}
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={cn('relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200', className)}>
      {items.map((item) => {
        const isExpanded = Boolean(expandedItems[item.id]);
        const hasMetadata = item.metadata && Object.keys(item.metadata).length > 0;

        return (
          <div key={item.id} className="relative group">
            {/* Timeline Dot */}
            <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-slate-900 shadow-xs ring-2 ring-slate-100 flex items-center justify-center shrink-0" />

            {/* Content Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
              {/* Header: User & Timestamp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-semibold shrink-0">
                    {item.user.name ? item.user.name.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                  </div>
                  <span className="text-xs font-semibold text-slate-900">
                    {item.user.name}
                  </span>
                  {item.user.role && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200">
                      {item.user.role}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 font-normal">
                    {item.action}
                  </span>
                  {item.target && (
                    <span className="text-xs font-semibold text-slate-800">
                      {item.target}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400">
                  <span title={formatDateTime(item.timestamp)}>
                    {showRelativeTime ? formatRelativeTime(item.timestamp) : formatDateTime(item.timestamp)}
                  </span>
                  {item.status && (
                    <StatusBadge
                      status={item.status as SemanticStatus}
                      size="sm"
                      className="ml-1"
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {item.description}
                </p>
              )}

              {/* Metadata accordion */}
              {hasMetadata && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 font-medium transition-colors"
                  >
                    <span>{isExpanded ? 'Hide details' : 'View audit metadata'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 overflow-x-auto">
                      <pre className="text-[11px] leading-snug">{JSON.stringify(item.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
