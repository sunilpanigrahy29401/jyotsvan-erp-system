import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Lock } from 'lucide-react';

/** Shown instead of the app while the account still uses an administrator-issued temporary password. */
export function ForcePasswordChange() {
  const { user, logout, refreshUser } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next !== confirm) return setError('The new passwords do not match.');
    setBusy(true);
    try {
      await authService.changePassword(current, next);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            {user?.email}: your account uses a temporary password. Set your own to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input label="Temporary password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} leftIcon={<Lock className="w-4 h-4" />} autoComplete="current-password" required />
            <Input
              label="New password"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              hint="At least 10 characters with upper-case, lower-case and a number."
              autoComplete="new-password"
              required
            />
            <Input label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} leftIcon={<Lock className="w-4 h-4" />} autoComplete="new-password" required />
            {error && <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">{error}</div>}
            <Button type="submit" className="w-full" isLoading={busy}>
              Save new password
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => void logout()}>
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
