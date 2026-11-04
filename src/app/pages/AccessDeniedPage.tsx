import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, RefreshCw, UserCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../context/AuthContext';

export interface AccessDeniedPageProps {
  requiredPermission?: string;
  attemptedPath?: string;
  onNavigate?: (path: string) => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  requiredPermission,
  attemptedPath,
  onNavigate,
}) => {
  const { user } = useAuth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 md:p-12 text-center">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
        {/* Visual Identity / Security Badge */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>403 Forbidden</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Access Restricted
            </h1>
          </div>
        </div>

        {/* Diagnostic Explanation */}
        <p className="text-sm text-slate-600 leading-relaxed">
          Your account does not possess the requisite security authority to access this enterprise module or route.
        </p>

        {/* Security Audit Detail Box */}
        <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3.5 text-left text-xs space-y-2 font-mono">
          {attemptedPath && (
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Target Path:</span>
              <span className="font-semibold text-slate-800">{attemptedPath}</span>
            </div>
          )}
          {requiredPermission && (
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Required Token:</span>
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[11px]">
                {requiredPermission}
              </Badge>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-600">
            <span className="text-slate-400">Current Role:</span>
            <span className="font-semibold text-slate-800">
              {user?.roles?.map((r) => r.name).join(', ') || 'Standard Operator'}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="text-slate-400">Signed In As:</span>
            <span className="truncate max-w-[160px] text-slate-700">{user?.email}</span>
          </div>
        </div>

        {/* Recovery Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <Button
            variant="outline"
            className="flex-1 justify-center gap-2 text-xs"
            onClick={() => onNavigate?.('/command-center')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Command Center
          </Button>
          <Button
            variant="default"
            className="flex-1 justify-center gap-2 text-xs"
            onClick={() => window.history.back()}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};
