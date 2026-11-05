import type { AuthSession, AuthUser, LoginCredentials } from '../types/auth';
import { applySession, getAccessToken, loginRequest, logoutRequest, refreshSession } from '../lib/session';

/**
 * Authentication client. All authentication, password checking, role and permission decisions happen on the server
 * (`/api/auth/*`). This class only transports credentials and holds the in-memory session; it never decides who a user is.
 */
class AuthService {
  /** Restores a session from the httpOnly refresh cookie (called once on app start). */
  public async restore(): Promise<{ user: AuthUser; session: AuthSession } | null> {
    const p = await refreshSession();
    return p ? { user: p.user, session: this.toSession(p.accessToken, p.expiresIn) } : null;
  }

  public async login(credentials: LoginCredentials): Promise<{ user: AuthUser; session: AuthSession }> {
    const email = credentials.email.trim().toLowerCase();
    if (!email) throw new Error('Please provide your email address.');
    if (!credentials.password) throw new Error('Please enter your password.');
    const p = await loginRequest(email, credentials.password);
    return { user: p.user, session: this.toSession(p.accessToken, p.expiresIn) };
  }

  public async logout(): Promise<void> {
    await logoutRequest();
  }

  /** Re-reads the current user (roles/permissions may have changed). */
  public async refreshUser(): Promise<AuthUser | null> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const { user } = (await res.json()) as { user: AuthUser };
    const token = getAccessToken();
    if (token) applySession({ accessToken: token, expiresIn: 15 * 60, user });
    return user;
  }

  public async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || 'Could not change password.');
  }

  private toSession(token: string, expiresIn: number): AuthSession {
    return { token, expiresAt: Math.floor(Date.now() / 1000) + expiresIn };
  }
}

export const authService = new AuthService();
