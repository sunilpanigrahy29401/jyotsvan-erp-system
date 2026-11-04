import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Eye, Edit, Trash2, CheckCircle, MoreHorizontal, Download, ArrowUpRight } from 'lucide-react';
import { Button } from './button';

export interface TableActionItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'success';
  disabled?: boolean;
  hidden?: boolean;
}

export interface TableActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onExport?: () => void;
  customActions?: TableActionItem[];
  variant?: 'inline' | 'dropdown' | 'compact';
  className?: string;
}

export function TableActions({
  onView,
  onEdit,
  onDelete,
  onApprove,
  onExport,
  customActions = [],
  variant = 'compact',
  className,
}: TableActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const allActions: TableActionItem[] = [
    ...(onView
      ? [
          {
            key: 'view',
            label: 'View Details',
            icon: <Eye className="w-3.5 h-3.5 text-slate-500" />,
            onClick: onView,
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="w-3.5 h-3.5 text-slate-500" />,
            onClick: onEdit,
          },
        ]
      : []),
    ...(onApprove
      ? [
          {
            key: 'approve',
            label: 'Approve',
            icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
            onClick: onApprove,
            variant: 'success' as const,
          },
        ]
      : []),
    ...(onExport
      ? [
          {
            key: 'export',
            label: 'Export',
            icon: <Download className="w-3.5 h-3.5 text-slate-500" />,
            onClick: onExport,
          },
        ]
      : []),
    ...customActions.filter((a) => !a.hidden),
    ...(onDelete
      ? [
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="w-3.5 h-3.5 text-red-600" />,
            onClick: onDelete,
            variant: 'destructive' as const,
          },
        ]
      : []),
  ];

  if (allActions.length === 0) return null;

  // Inline mode: show simple icon buttons
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {allActions.map((action) => (
          <Button
            key={action.key}
            type="button"
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              'h-7 w-7 p-0',
              action.variant === 'destructive' && 'text-red-600 hover:text-red-700 hover:bg-red-50',
              action.variant === 'success' && 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
            )}
            title={action.label}
            aria-label={action.label}
          >
            {action.icon || <ArrowUpRight className="w-3.5 h-3.5" />}
          </Button>
        ))}
      </div>
    );
  }

  // Compact mode: show Primary action (e.g. View) + More dropdown if > 1 action
  if (variant === 'compact' && allActions.length > 2) {
    const primaryAction = allActions[0];
    const remainingActions = allActions.slice(1);

    return (
      <div className={cn('flex items-center gap-1 justify-end', className)}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={primaryAction.onClick}
          className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-100"
          title={primaryAction.label}
        >
          {primaryAction.icon}
          <span className="ml-1 text-[11px]">{primaryAction.label}</span>
        </Button>

        <div ref={dropdownRef} className="relative inline-block text-left">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-100"
            title="More actions"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>

          {isOpen && (
            <div className="absolute right-0 z-50 mt-1 w-44 rounded-md border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in-0 zoom-in-95">
              {remainingActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  disabled={action.disabled}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors',
                    action.variant === 'destructive'
                      ? 'text-red-700 hover:bg-red-50'
                      : action.variant === 'success'
                      ? 'text-emerald-700 hover:bg-emerald-50'
                      : 'text-slate-700 hover:bg-slate-100',
                    action.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard Dropdown mode
  return (
    <div ref={dropdownRef} className={cn('relative inline-block text-left', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        title="Row actions"
        aria-label="Row actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-md border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in-0 zoom-in-95">
          {allActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              disabled={action.disabled}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors',
                action.variant === 'destructive'
                  ? 'text-red-700 hover:bg-red-50'
                  : action.variant === 'success'
                  ? 'text-emerald-700 hover:bg-emerald-50'
                  : 'text-slate-700 hover:bg-slate-100',
                action.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
