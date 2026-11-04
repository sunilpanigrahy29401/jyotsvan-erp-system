import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';
import type { FilterOption } from '../../types/common';

export interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  options: FilterOption[];
  value?: string[];
  onChange?: (values: string[]) => void;
  className?: string;
  maxDisplayCount?: number;
}

export function MultiSelect({
  label,
  placeholder = 'Select options...',
  options,
  value = [],
  onChange,
  className,
  maxDisplayCount = 2,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleToggleOption = (optValue: string) => {
    const isSelected = value.includes(optValue);
    const newValues = isSelected
      ? value.filter((v) => v !== optValue)
      : [...value, optValue];

    if (onChange) onChange(newValues);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChange) onChange([]);
  };

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedLabels = options
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label);

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left w-full max-w-xs', className)}>
      {label && (
        <label className="block text-xs font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full h-9 px-3 rounded-md border text-xs font-medium transition-colors bg-white flex items-center justify-between gap-2',
          isOpen ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
        )}
      >
        <div className="flex items-center gap-1.5 truncate">
          {value.length === 0 ? (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 truncate">
              <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                {selectedLabels.slice(0, maxDisplayCount).join(', ')}
              </span>
              {value.length > maxDisplayCount && (
                <span className="text-[11px] text-slate-500 font-mono">
                  +{value.length - maxDisplayCount}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value.length > 0 && (
            <span
              onClick={handleClearAll}
              className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1.5 w-full min-w-[200px] rounded-lg border border-slate-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95 overflow-hidden">
          {options.length > 6 && (
            <div className="p-2 border-b border-slate-100">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter options..."
                className="w-full h-7 px-2 text-xs rounded border border-slate-200 focus:outline-none focus:border-slate-800"
              />
            </div>
          )}

          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggleOption(opt.value)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition-colors',
                      isSelected ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={cn(
                          'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                          isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 bg-white'
                        )}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </div>

                    {opt.count !== undefined && (
                      <span className="text-[10px] font-mono text-slate-400 ml-2">
                        {opt.count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
