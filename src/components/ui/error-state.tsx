import { cn } from '../../lib/utils';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'System Operation Notice',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-red-200 bg-red-50/60 p-6 text-left flex items-start gap-4',
        className
      )}
    >
      <div className="w-9 h-9 rounded-md bg-red-100 flex items-center justify-center text-red-600 shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-red-900">{title}</h4>
        <p className="text-xs text-red-700 mt-1 leading-relaxed">{message}</p>
        {onRetry && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="border-red-300 text-red-800 hover:bg-red-100/50 bg-white"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Retry Action
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
