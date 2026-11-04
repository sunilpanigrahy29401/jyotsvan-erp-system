import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function LoadingState({
  message = 'Loading data...',
  description,
  className,
  compact = false,
}: LoadingStateProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 text-slate-500 py-3 text-xs', className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-lg border border-slate-200 bg-white/50 min-h-[220px]',
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
      </div>
      <p className="text-sm font-semibold text-slate-800">{message}</p>
      {description && <p className="text-xs text-slate-500 max-w-sm mt-1">{description}</p>}
    </div>
  );
}
