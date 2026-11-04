import React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function Checkbox({
  id,
  checked,
  defaultChecked = false,
  onChange,
  label,
  description,
  disabled = false,
  error,
  className,
}: CheckboxProps) {
  const [internalChecked, setInternalChecked] = React.useState(
    checked !== undefined ? checked : defaultChecked
  );

  React.useEffect(() => {
    if (checked !== undefined) {
      setInternalChecked(checked);
    }
  }, [checked]);

  const handleToggle = () => {
    if (disabled) return;
    const next = !internalChecked;
    setInternalChecked(next);
    if (onChange) onChange(next);
  };

  const checkboxId = id || (typeof label === 'string' ? `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={cn('flex items-start gap-2.5 select-none', className)}>
      <button
        id={checkboxId}
        type="button"
        role="checkbox"
        aria-checked={internalChecked}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'h-4 w-4 shrink-0 rounded border transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-0.5',
          internalChecked
            ? 'bg-slate-900 border-slate-900 text-white'
            : 'border-slate-300 bg-white hover:border-slate-400',
          error && 'border-red-500'
        )}
      >
        {internalChecked && <Check className="w-3 h-3 stroke-[3]" />}
      </button>

      {(label || description) && (
        <div className="cursor-pointer" onClick={handleToggle}>
          {label && (
            <label htmlFor={checkboxId} className="block text-xs font-medium text-slate-800 cursor-pointer">
              {label}
            </label>
          )}
          {description && <p className="text-xs text-slate-500 leading-normal mt-0.5">{description}</p>}
          {error && <p className="text-xs text-red-600 leading-tight mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}
