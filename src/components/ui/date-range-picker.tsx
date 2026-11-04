import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { Button } from './button';
import { formatDate } from '../../lib/format';
import type { DateRange } from '../../types/common';

export interface DateRangePreset {
  id: string;
  label: string;
  getRange: () => DateRange;
}

const DEFAULT_PRESETS: DateRangePreset[] = [
  {
    id: 'today',
    label: 'Today',
    getRange: () => {
      const now = new Date();
      const d = now.toISOString().split('T')[0];
      return { startDate: d, endDate: d };
    },
  },
  {
    id: 'yesterday',
    label: 'Yesterday',
    getRange: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const str = d.toISOString().split('T')[0];
      return { startDate: str, endDate: str };
    },
  },
  {
    id: 'last_7_days',
    label: 'Last 7 Days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'last_30_days',
    label: 'Last 30 Days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'this_month',
    label: 'This Month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'last_month',
    label: 'Last Month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
];

export interface DateRangePickerProps {
  value?: DateRange | null;
  onChange?: (range: DateRange | null) => void;
  presets?: DateRangePreset[];
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  placeholder = 'Select date range',
  className,
  allowClear = true,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [tempStart, setTempStart] = useState<string>(value?.startDate || '');
  const [tempEnd, setTempEnd] = useState<string>(value?.endDate || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setTempStart(value.startDate);
      setTempEnd(value.endDate);
    } else {
      setTempStart('');
      setTempEnd('');
      setActivePreset(null);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleApplyPreset = (preset: DateRangePreset) => {
    const range = preset.getRange();
    setActivePreset(preset.id);
    setTempStart(range.startDate);
    setTempEnd(range.endDate);
    if (onChange) onChange(range);
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    if (tempStart && tempEnd) {
      setActivePreset(null);
      if (onChange) onChange({ startDate: tempStart, endDate: tempEnd });
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempStart('');
    setTempEnd('');
    setActivePreset(null);
    if (onChange) onChange(null);
  };

  const formattedDisplay = () => {
    if (!value?.startDate || !value?.endDate) return null;
    if (activePreset) {
      const match = presets.find((p) => p.id === activePreset);
      if (match) return `${match.label} (${formatDate(value.startDate)} - ${formatDate(value.endDate)})`;
    }
    return `${formatDate(value.startDate)} – ${formatDate(value.endDate)}`;
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center justify-between gap-2 h-9 px-3 rounded-md border text-xs font-medium transition-colors bg-white hover:bg-slate-50 min-w-[200px]',
          isOpen ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-300 text-slate-700'
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className={cn('truncate', !formattedDisplay() && 'text-slate-400 font-normal')}>
            {formattedDisplay() || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && allowClear && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Clear date filter"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-40 mt-1.5 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in-0 zoom-in-95">
          {/* Quick Preset Buttons */}
          <div className="mb-3.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Quick Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={cn(
                    'px-2.5 py-1.5 text-xs text-left rounded-md transition-colors font-medium',
                    activePreset === preset.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Custom Range
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="w-full h-8 px-2 rounded border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="w-full h-8 px-2 rounded border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTempStart('');
                  setTempEnd('');
                  setActivePreset(null);
                  if (onChange) onChange(null);
                  setIsOpen(false);
                }}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!tempStart || !tempEnd}
                onClick={handleApplyCustom}
              >
                Apply Range
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
