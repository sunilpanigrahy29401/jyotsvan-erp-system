import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Check, RotateCcw } from 'lucide-react';

export interface FormActionsProps {
  onSave?: () => void;
  onCancel?: () => void;
  onReset?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  resetLabel?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  secondaryActions?: React.ReactNode;
  align?: 'left' | 'right' | 'between';
  className?: string;
}

export function FormActions({
  onSave,
  onCancel,
  onReset,
  saveLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  resetLabel = 'Reset',
  isSubmitting = false,
  disabled = false,
  secondaryActions,
  align = 'right',
  className,
}: FormActionsProps) {
  const alignClasses = {
    left: 'justify-start',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 pt-4 border-t border-slate-200 bg-white select-none',
        alignClasses[align],
        className
      )}
    >
      {secondaryActions && <div className="flex items-center gap-2">{secondaryActions}</div>}

      <div className="flex items-center gap-2.5">
        {onReset && (
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={onReset}
            disabled={disabled || isSubmitting}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            {resetLabel}
          </Button>
        )}

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
        )}

        {onSave && (
          <Button
            type="submit"
            variant="primary"
            size="default"
            onClick={onSave}
            isLoading={isSubmitting}
            disabled={disabled}
            leftIcon={<Check className="w-3.5 h-3.5" />}
          >
            {saveLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
