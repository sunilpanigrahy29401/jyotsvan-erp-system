import React from 'react';
import { cn } from '../../lib/utils';
import { Minus, Plus } from 'lucide-react';

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  value?: number | string;
  defaultValue?: number;
  onChange?: (val: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  error?: string;
  hint?: string;
  showStepper?: boolean;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      label,
      value,
      defaultValue,
      onChange,
      min,
      max,
      step = 1,
      prefix,
      suffix,
      error,
      hint,
      showStepper = false,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `num-input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '') {
        if (onChange) onChange(null);
        return;
      }
      const num = parseFloat(raw);
      if (!isNaN(num) && onChange) {
        onChange(num);
      }
    };

    const handleStep = (delta: number) => {
      if (disabled) return;
      const current = typeof value === 'number' ? value : parseFloat(String(value || '0')) || 0;
      let next = current + delta;
      if (min !== undefined && next < min) next = min;
      if (max !== undefined && next > max) next = max;
      if (onChange) onChange(next);
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 flex items-center pointer-events-none text-xs font-medium text-slate-500">
              {prefix}
            </span>
          )}

          <input
            id={inputId}
            type="number"
            ref={ref}
            value={value !== undefined ? value : defaultValue}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={cn(
              'w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 tabular-nums placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:border-slate-800 focus-visible:ring-1 focus-visible:ring-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
              prefix && 'pl-8',
              suffix && 'pr-12',
              showStepper && 'pr-16',
              error && 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500',
              className
            )}
            {...props}
          />

          {suffix && !showStepper && (
            <span className="absolute right-3 flex items-center pointer-events-none text-xs text-slate-500 font-medium">
              {suffix}
            </span>
          )}

          {showStepper && (
            <div className="absolute right-1 flex items-center gap-0.5 border-l border-slate-200 pl-1">
              <button
                type="button"
                onClick={() => handleStep(-step)}
                disabled={disabled || (min !== undefined && Number(value) <= min)}
                className="h-7 w-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40"
                aria-label="Decrease value"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleStep(step)}
                disabled={disabled || (max !== undefined && Number(value) >= max)}
                className="h-7 w-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40"
                aria-label="Increase value"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-600 leading-tight">{error}</p>}
        {!error && hint && <p className="text-xs text-slate-500 leading-tight">{hint}</p>}
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
