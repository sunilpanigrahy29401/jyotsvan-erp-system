// Central, validated server configuration for authentication/session settings.
import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

function resolveSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret);
  if (isProd) {
    throw new Error('SESSION_SECRET (at least 32 characters) is required in production.');
  }
  console.warn('[Auth] SESSION_SECRET not set; using an ephemeral development secret. All sessions end on restart.');
  return new TextEncoder().encode(crypto.randomBytes(32).toString('hex'));
}

export const authConfig = {
  isProd,
  sessionSecret: resolveSessionSecret(),
  issuer: process.env.AUTH_ISSUER || 'jyotsvan-erp',
  audience: process.env.AUTH_AUDIENCE || 'jyotsvan-erp-api',
  accessTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 15 * 60),
  refreshTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 30 * 24 * 60 * 60),
  maxFailedLogins: Number(process.env.MAX_FAILED_LOGINS || 5),
  lockMinutes: Number(process.env.LOGIN_LOCK_MINUTES || 15),
  refreshCookieName: 'jy_refresh',
  /** Set COOKIE_SECURE=false only for plain-HTTP local development. */
  secureCookies: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE !== 'false' : isProd,
  minPasswordLength: 10,
};
