// Access-token (JWT, HS256) signing/verification and opaque refresh tokens.
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { authConfig } from './config.ts';

export interface AccessClaims {
  sub: string; // user id
  org: string; // organization (tenant) id
  sid: string; // session id
}

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ org: claims.org, sid: claims.sid })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(authConfig.issuer)
    .setAudience(authConfig.audience)
    .setIssuedAt()
    .setExpirationTime(`${authConfig.accessTtlSeconds}s`)
    .sign(authConfig.sessionSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, authConfig.sessionSecret, {
      algorithms: ['HS256'],
      issuer: authConfig.issuer,
      audience: authConfig.audience,
    });
    if (typeof payload.sub !== 'string' || typeof payload.org !== 'string' || typeof payload.sid !== 'string') {
      return null;
    }
    return { sub: payload.sub, org: payload.org, sid: payload.sid };
  } catch {
    return null;
  }
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashRefreshToken(token) };
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
