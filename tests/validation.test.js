import { describe, expect, it } from 'vitest';
import { isProStatus, isValidEmail, normalizeEmail, validatePassword } from '@/lib/validation';

describe('normalizeEmail', () => {
    it('trims whitespace and lowercases', () => {
        expect(normalizeEmail('  RACER@Example.COM\n')).toBe('racer@example.com');
    });

    it('returns an empty string for non-string input', () => {
        expect(normalizeEmail(null)).toBe('');
    });
});

describe('isValidEmail', () => {
    it('accepts well-formed addresses', () => {
        expect(isValidEmail('user@example.com')).toBe(true);
        expect(isValidEmail('a.b-c@sub.domain.io')).toBe(true);
    });

    it('rejects malformed addresses', () => {
        expect(isValidEmail('not-an-email')).toBe(false);
        expect(isValidEmail('missing@tld')).toBe(false);
        expect(isValidEmail('@no-local.com')).toBe(false);
        expect(isValidEmail('')).toBe(false);
        expect(isValidEmail(null)).toBe(false);
    });
});

describe('validatePassword', () => {
    it('accepts a strong password', () => {
        expect(validatePassword('secret123').valid).toBe(true);
    });

    it('rejects short passwords', () => {
        const result = validatePassword('ab1');
        expect(result.valid).toBe(false);
        expect(result.message).toMatch(/8 characters/);
    });

    it('requires both a letter and a number', () => {
        expect(validatePassword('allletters').valid).toBe(false);
        expect(validatePassword('12345678').valid).toBe(false);
    });
});

describe('isProStatus', () => {
    it('grants Pro only for an active or trialing subscription', () => {
        expect(isProStatus('active')).toBe(true);
        expect(isProStatus('trialing')).toBe(true);
        expect(isProStatus('canceled')).toBe(false);
        expect(isProStatus('revoked')).toBe(false);
        expect(isProStatus(null)).toBe(false);
    });
});
