import React from 'react';
import { cn } from '../../lib/utils';

export interface FormFieldProps {
  id?: string;
  label?: React.ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  layout?: 'vertical' | 'horizontal';
}

export function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  children,
  className,
  layout = 'vertical',
}: FormFieldProps) {
  if (layout === 'horizontal') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start', className)}>
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-slate-800 pt-2">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="sm:col-span-2 space-y-1">
          {children}
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          {!error && hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-800">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div>{children}</div>
      {error && <p className="text-xs text-red-600 font-medium leading-tight">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-500 leading-tight">{hint}</p>}
    </div>
  );
}
