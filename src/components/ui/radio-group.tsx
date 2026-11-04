import React from 'react';
import { cn } from '../../lib/utils';

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name?: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export function RadioGroup({
  name = 'radio-group',
  options,
  value,
  defaultValue,
  onChange,
  orientation = 'vertical',
  className,
}: RadioGroupProps) {
  const [internalVal, setInternalVal] = React.useState(value !== undefined ? value : defaultValue);

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalVal(value);
    }
  }, [value]);

  const handleSelect = (val: string) => {
    setInternalVal(val);
    if (onChange) onChange(val);
  };

  return (
    <div
      role="radiogroup"
      className={cn(
        'gap-3',
        orientation === 'horizontal' ? 'flex flex-wrap items-center' : 'flex flex-col',
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = internalVal === opt.value;
        const optId = `radio-${name}-${opt.value}`;

        return (
          <div
            key={opt.value}
            onClick={() => !opt.disabled && handleSelect(opt.value)}
            className={cn(
              'flex items-start gap-2.5 cursor-pointer select-none',
              opt.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              id={optId}
              role="radio"
              aria-checked={isSelected}
              className={cn(
                'h-4 w-4 rounded-full border flex items-center justify-center transition-colors mt-0.5 shrink-0',
                isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white hover:border-slate-400'
              )}
            >
              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>

            <div>
              <label htmlFor={optId} className="block text-xs font-medium text-slate-800 cursor-pointer">
                {opt.label}
              </label>
              {opt.description && (
                <p className="text-xs text-slate-500 leading-normal mt-0.5">{opt.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
