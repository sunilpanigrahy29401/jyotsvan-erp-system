import { describe, expect, it } from 'vitest';
import { hashPassword, validatePasswordPolicy, verifyPassword } from '../../src/server/core/passwords.ts';

describe('password hashing', () => {
  it('verifies the right password and rejects the wrong one', async () => {
    const h = await hashPassword('Correct-Horse-9');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('Correct-Horse-9', h)).toBe(true);
    expect(await verifyPassword('Correct-Horse-8', h)).toBe(false);
  });

  it('never matches when there is no stored hash', async () => {
    expect(await verifyPassword('anything', null)).toBe(false);
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
  });

  it('salts every hash differently', async () => {
    expect(await hashPassword('Same-Pass-123')).not.toBe(await hashPassword('Same-Pass-123'));
  });
});

describe('password policy', () => {
  it('rejects short, simple and common passwords', () => {
    expect(validatePasswordPolicy('Ab1')).toMatch(/at least/);
    expect(validatePasswordPolicy('alllowercase123')).toMatch(/upper-case/);
    expect(validatePasswordPolicy('Password123')).toMatch(/common/);
  });
  it('rejects passwords that contain the email name', () => {
    expect(validatePasswordPolicy('Sunilpanigrahy9X', 'sunilpanigrahy@example.com')).toMatch(/email/);
  });
  it('accepts a strong password', () => {
    expect(validatePasswordPolicy('Tr1ckier-Passphrase', 'x@example.com')).toBeNull();
  });
});
