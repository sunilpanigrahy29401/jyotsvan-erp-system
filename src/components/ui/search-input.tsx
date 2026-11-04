import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Search, X, Loader2 } from 'lucide-react';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  isLoading?: boolean;
  showShortcut?: boolean;
}

export function SearchInput({
  className,
  placeholder = 'Search...',
  value: controlledValue,
  defaultValue = '',
  onChange,
  onClear,
  debounceMs = 0,
  isLoading = false,
  showShortcut = false,
  id,
  ...props
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(
    controlledValue !== undefined ? controlledValue : defaultValue
  );

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  useEffect(() => {
    if (debounceMs <= 0 || onChange === undefined) return;

    const timer = setTimeout(() => {
      onChange(internalValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInternalValue(newVal);
    if (debounceMs <= 0 && onChange) {
      onChange(newVal);
    }
  };

  const handleClear = () => {
    setInternalValue('');
    if (onChange) onChange('');
    if (onClear) onClear();
  };

  const inputId = id || 'reusable-search-input';

  return (
    <div className={cn('relative flex items-center w-full max-w-md', className)}>
      <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </div>

      <input
        id={inputId}
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          'w-full h-9 rounded-md border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:border-slate-800 focus-visible:ring-1 focus-visible:ring-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50'
        )}
        {...props}
      />

      <div className="absolute right-2.5 flex items-center gap-1">
        {internalValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : showShortcut ? (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-[10px] font-mono text-slate-500 select-none">
            /
          </kbd>
        ) : null}
      </div>
    </div>
  );
}
