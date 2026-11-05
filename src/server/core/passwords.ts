// Password hashing (scrypt) and password policy. No external dependency.
import crypto from 'crypto';
import { promisify } from 'util';
import { authConfig } from './config.ts';

const scrypt = promisify(crypto.scrypt) as (
  pw: string,
  salt: Buffer,
  len: number,
  opts: crypto.ScryptOptions
) => Promise<Buffer>;

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  // Always do comparable work so a missing user/hash is not distinguishable by timing.
  const parts = (stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    await scrypt(password, Buffer.alloc(16), KEYLEN, { N, r: R, p: P });
    return false;
  }
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

const COMMON = new Set([
  'password', 'password1', 'password123', 'qwerty123', '1234567890', 'admin12345', 'welcome123', 'letmein123',
]);

/** Returns an error message, or null when the password meets the policy. */
export function validatePasswordPolicy(password: string, email?: string): string | null {
  if (typeof password !== 'string' || password.length < authConfig.minPasswordLength) {
    return `Password must be at least ${authConfig.minPasswordLength} characters.`;
  }
  if (password.length > 200) return 'Password is too long.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain upper-case and lower-case letters and a number.';
  }
  if (COMMON.has(password.toLowerCase())) return 'Password is too common.';
  const local = email ? email.split('@')[0].toLowerCase() : '';
  if (local.length >= 4 && password.toLowerCase().includes(local)) {
    return 'Password must not contain your email name.';
  }
  return null;
}
