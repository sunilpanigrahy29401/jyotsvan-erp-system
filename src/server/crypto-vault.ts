// src/server/crypto-vault.ts
// Secure AES-256-GCM Credential Encryption & Secret Redaction Engine

import crypto from 'crypto';

const MASTER_SECRET = process.env.ENCRYPTION_SECRET || 'jyotsvan-enterprise-master-encryption-key-2026-secure-salt';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Derive a fixed 32-byte key using scrypt
const DERIVED_KEY = crypto.scryptSync(MASTER_SECRET, 'jyotsvan-vault-salt', 32);

/**
 * Encrypts arbitrary credential objects or strings into a tamper-evident AES-256-GCM payload.
 * Output format: base64(iv:authTag:ciphertext)
 */
export function encryptCredentials(data: Record<string, unknown> | string): string {
  const plainText = typeof data === 'string' ? data : JSON.stringify(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, DERIVED_KEY, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  const combined = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  return Buffer.from(combined, 'utf8').toString('base64');
}

/**
 * Decrypts an AES-256-GCM encrypted payload back to the original object or string.
 */
export function decryptCredentials<T = Record<string, unknown>>(cipherBase64: string): T {
  try {
    const raw = Buffer.from(cipherBase64, 'base64').toString('utf8');
    const [ivHex, tagHex, encryptedHex] = raw.split(':');

    if (!ivHex || !tagHex || !encryptedHex) {
      throw new Error('Malformed encrypted credential token');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, DERIVED_KEY, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted) as T;
    } catch {
      return decrypted as unknown as T;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Decryption failed';
    throw new Error(`Credential decryption error: ${msg}`);
  }
}

/**
 * Masks a secret string for UI preview (e.g. 'shpat_••••••••••••1234')
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return '';
  if (secret.length <= 6) return '••••••••';
  const prefix = secret.slice(0, 3);
  const suffix = secret.slice(-3);
  return `${prefix}••••••••••••${suffix}`;
}

/**
 * Sanitizes a configuration/credential object to remove raw secret values before returning to frontend.
 */
export function sanitizeConfiguration(config: Record<string, unknown> = {}): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const secretKeyPatterns = [
    /secret/i,
    /key/i,
    /token/i,
    /password/i,
    /auth/i,
    /private/i,
    /credential/i,
    /hash/i,
    /cert/i,
  ];

  for (const [key, val] of Object.entries(config)) {
    if (typeof val === 'string' && secretKeyPatterns.some((pattern) => pattern.test(key))) {
      sanitized[key] = maskSecret(val);
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      sanitized[key] = sanitizeConfiguration(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * SSRF (Server-Side Request Forgery) protection validator for outbound HTTP requests.
 * Blocks private IP ranges, localhost, metadata IP (169.254.169.254), and non-standard schemes.
 */
export function validateSafeUrl(rawUrl: string): { valid: boolean; reason?: string; url?: URL } {
  try {
    const parsed = new URL(rawUrl);

    // 1. Enforce HTTP/HTTPS protocols only
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: `Disallowed protocol: ${parsed.protocol}. Only http and https are permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Block localhost and loopback domains
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      return { valid: false, reason: 'Outbound connections to localhost/loopback are restricted by enterprise security policy.' };
    }

    // 3. Block Cloud Metadata Services (AWS, GCP, Azure, OpenStack)
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return { valid: false, reason: 'Access to cloud instance metadata services is strictly forbidden.' };
    }

    // 4. Block Private IPv4 subnets (RFC 1918)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [_, o1, o2] = match.map(Number);
      // 10.0.0.0 - 10.255.255.255
      if (o1 === 10) {
        return { valid: false, reason: 'Connections to private network range 10.x.x.x are forbidden.' };
      }
      // 172.16.0.0 - 172.31.255.255
      if (o1 === 172 && o2 >= 16 && o2 <= 31) {
        return { valid: false, reason: 'Connections to private network range 172.16-31.x.x are forbidden.' };
      }
      // 192.168.0.0 - 192.168.255.255
      if (o1 === 192 && o2 === 168) {
        return { valid: false, reason: 'Connections to private network range 192.168.x.x are forbidden.' };
      }
      // 169.254.0.0 - 169.254.255.255 (Link-local)
      if (o1 === 169 && o2 === 254) {
        return { valid: false, reason: 'Connections to link-local address range 169.254.x.x are forbidden.' };
      }
    }

    return { valid: true, url: parsed };
  } catch (err: unknown) {
    return { valid: false, reason: 'Malformed target URL provided.' };
  }
}
