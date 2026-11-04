import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Mail, Lock, ShieldCheck, Database } from 'lucide-react';
import { ENV } from '../../config/env';

export function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('admin@jyotsvan.enterprise');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!email.trim()) {
      setValidationError('Please enter an enterprise email.');
      return;
    }

    try {
      await login({ email, password });
      showToast('Authentication Successful', {
        description: 'Welcome to Jyotsvan Enterprise Platform foundation.',
        variant: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setValidationError(msg);
    }
  };

  const handleQuickSunilLogin = async () => {
    setEmail('sunilpanigrahy29401@gmail.com');
    try {
      await login({ email: 'sunilpanigrahy29401@gmail.com' });
      showToast('Admin Session Initialized', {
        description: 'Logged in as Sunil Panigrahy (Super Admin) synced with InsForge PostgreSQL.',
        variant: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setValidationError(msg);
    }
  };

  const handleQuickArchitectLogin = async () => {
    setEmail('admin@jyotsvan.enterprise');
    try {
      await login({ email: 'admin@jyotsvan.enterprise' });
      showToast('Architect Session Initialized', {
        description: 'Logged in as Lead System Architect with Super Admin privileges.',
        variant: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setValidationError(msg);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-xl shadow-md">
            J
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Jyotsvan</h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Enterprise Management, Manufacturing, Inventory & Intelligence Platform
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-md border-slate-200">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Operator Sign In</CardTitle>
              <Badge variant="secondary" className="font-mono text-[10px]">
                Phase 1 Foundation
              </Badge>
            </div>
            <CardDescription>
              Access the secure enterprise application shell.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-0 space-y-4">
            {/* System Status Banner */}
            <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  Backend Platform
                </span>
                <span className="font-mono text-[11px] text-slate-600">InsForge</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Connection Status</span>
                <span className={ENV.isInsforgeConfigured ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                  {ENV.isInsforgeConfigured ? 'InsForge Live Connected' : 'Local Foundation Mode'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Enterprise Email"
                id="login-email-input"
                type="email"
                placeholder="name@company.enterprise"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                id="login-password-input"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                hint={ENV.isInsforgeConfigured ? 'Required for InsForge Auth' : 'Optional in Foundation Dev Mode'}
                autoComplete="current-password"
              />

              {(validationError || error) && (
                <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 leading-snug">
                  {validationError || error}
                </div>
              )}

              <Button
                id="login-submit-button"
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                Sign In to Jyotsvan
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-mono text-[10px]">
                  Evaluation Session
                </span>
              </div>
            </div>

            {/* Quick Login for System Verification */}
            <div className="space-y-2">
              <Button
                id="quick-sunil-login-btn"
                variant="outline"
                type="button"
                className="w-full text-xs border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-900"
                onClick={handleQuickSunilLogin}
                leftIcon={<ShieldCheck className="w-4 h-4 text-emerald-700" />}
              >
                Sign In as Sunil Panigrahy (Super Admin)
              </Button>

              <Button
                id="quick-architect-login-btn"
                variant="outline"
                type="button"
                className="w-full text-xs"
                onClick={handleQuickArchitectLogin}
                leftIcon={<ShieldCheck className="w-4 h-4 text-slate-700" />}
              >
                Sign In as Lead System Architect
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Architecture Note */}
        <p className="text-center text-[11px] text-slate-400 font-mono">
          Strict Security Boundary • Unauthorized access logged
        </p>
      </div>
    </div>
  );
}
