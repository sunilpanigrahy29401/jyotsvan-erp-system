import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ToastMessage, AlertVariant } from '../types/common';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastOptions = {
  description?: string;
  variant?: AlertVariant;
  duration?: number;
};

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (title: string, optionsOrVariant?: ToastOptions | AlertVariant) => void;
  addToast: (toast: { type?: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, optionsOrVariant?: ToastOptions | AlertVariant) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      let description: string | undefined;
      let variant: AlertVariant = 'info';
      let duration = 4000;

      if (typeof optionsOrVariant === 'string') {
        variant = optionsOrVariant === 'error' ? 'destructive' : optionsOrVariant;
      } else if (optionsOrVariant) {
        description = optionsOrVariant.description;
        variant = optionsOrVariant.variant === 'error' ? 'destructive' : (optionsOrVariant.variant || 'info');
        duration = optionsOrVariant.duration || 4000;
      }

      const newToast: ToastMessage = {
        id,
        title,
        description,
        variant,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }
    },
    [removeToast]
  );

  const addToast = useCallback(
    (toast: { type?: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }) => {
      const variant: AlertVariant = toast.type === 'error' ? 'destructive' : (toast.type || 'info');
      showToast(toast.title, { description: toast.message, variant });
    },
    [showToast]
  );

  const getVariantStyles = (variant?: AlertVariant) => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-white border-emerald-200 text-slate-800 shadow-sm',
          icon: <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />,
        };
      case 'warning':
        return {
          bg: 'bg-white border-amber-200 text-slate-800 shadow-sm',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
        };
      case 'destructive':
      case 'error':
        return {
          bg: 'bg-white border-red-200 text-slate-800 shadow-sm',
          icon: <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-white border-slate-200 text-slate-800 shadow-sm',
          icon: <Info className="w-4 h-4 text-sky-600 shrink-0" />,
        };
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, addToast, removeToast }}>
      {children}
      {/* Toast Render Portal */}
      <div id="toast-portal-container" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const style = getVariantStyles(toast.variant);
          return (
            <div
              key={toast.id}
              id={`toast-item-${toast.id}`}
              className={`pointer-events-auto border rounded-lg p-3.5 flex items-start gap-3 transition-all duration-200 ${style.bg}`}
            >
              {style.icon}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 leading-snug">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.description}</p>
                )}
              </div>
              <button
                id={`toast-close-${toast.id}`}
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
