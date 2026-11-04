import React from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  id,
  checked,
  defaultChecked = false,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: SwitchProps) {
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

  const switchId = id || (typeof label === 'string' ? `switch-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={cn('flex items-start gap-3 select-none', className)}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={internalChecked}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-0.5',
          internalChecked ? 'bg-slate-900' : 'bg-slate-300'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            internalChecked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>

      {(label || description) && (
        <div className="cursor-pointer" onClick={handleToggle}>
          {label && (
            <label htmlFor={switchId} className="block text-xs font-semibold text-slate-800 cursor-pointer">
              {label}
            </label>
          )}
          {description && <p className="text-xs text-slate-500 mt-0.5 leading-normal">{description}</p>}
        </div>
      )}
    </div>
  );
}
