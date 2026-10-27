import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

const mocks = vi.hoisted(() => ({
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    hash: vi.fn(async () => 'bcrypt-hash'),
    rateLimit: vi.fn(async () => ({ success: true })),
    headers: vi.fn(async () => new Headers({ host: 'pitlane.test' })),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: { user: { findUnique: mocks.findUnique, create: mocks.create, update: mocks.update } },
}));
vi.mock('bcryptjs', () => ({ default: { hash: mocks.hash } }));
vi.mock('@/lib/rate-limit', () => ({
    getClientIp: () => '203.0.113.8',
    rateLimit: mocks.rateLimit,
}));
vi.mock('next/headers', () => ({ headers: mocks.headers }));

import { registerUser, resendVerificationEmail } from '@/app/actions/auth';

function makeFormData(lang = 'en', overrides = {}) {
    return new Map(Object.entries({
        name: 'Racer',
        email: '  RACER@Example.com ',
        password: 'racecar123',
        lang,
        ...overrides,
    }));
}

beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_RESEND_KEY = 'test-resend-key';
    process.env.EMAIL_FROM = 'Pit Lane Hub <noreply@example.com>';
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.AUTH_URL;
    mocks.hash.mockResolvedValue('bcrypt-hash');
    mocks.rateLimit.mockResolvedValue({ success: true });
    mocks.headers.mockResolvedValue(new Headers({ host: 'pitlane.test' }));
    mocks.create.mockResolvedValue({ id: 'new_user', email: 'racer@example.com', name: 'Racer', passwordHash: 'bcrypt-hash' });
    mocks.update.mockResolvedValue({ id: 'new_user' });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('registerUser', () => {
    it('returns the same generic response for a new address and an existing account', async () => {
        const fetch = vi.fn(async () => new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetch);
        mocks.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 'existing_user', email: 'racer@example.com', emailVerified: new Date() });

        const newAddressResponse = await registerUser(makeFormData());
        const existingAddressResponse = await registerUser(makeFormData());

        expect(newAddressResponse).toEqual(existingAddressResponse);
        expect(newAddressResponse).toEqual({
            success: true,
            message: 'If you can create an account with this address, check your inbox for the next step.',
        });
        expect(mocks.create).toHaveBeenCalledWith({
            data: {
                name: 'Racer',
                email: 'racer@example.com',
                passwordHash: 'bcrypt-hash',
                emailVerified: null,
            },
        });
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(JSON.parse(fetch.mock.calls[1][1].body).text).toContain('You already have an account.');
    });

    it('stores only a SHA-256 hash of the emailed verification token with a 24h expiry', async () => {
        const fetch = vi.fn(async () => new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetch);
        process.env.NEXT_PUBLIC_SITE_URL = 'https://pitlane.example';
        mocks.findUnique.mockResolvedValueOnce(null);

        const before = Date.now();
        await registerUser(makeFormData('ar'));

        const text = JSON.parse(fetch.mock.calls[0][1].body).text;
        const link = new URL(text.match(/https:\/\/\S+/)[0]);
        expect(link.origin + link.pathname).toBe('https://pitlane.example/ar/verify-email');
        expect(JSON.parse(fetch.mock.calls[0][1].body).subject).toBe('أكّد حسابك في Pit Lane Hub');
        expect(text).toContain('أكّد عنوان بريدك الإلكتروني خلال 24 ساعة:');
        const rawToken = link.searchParams.get('token');
        expect(rawToken).toMatch(/^[a-f0-9]{64}$/);

        const { data } = mocks.update.mock.calls[0][0];
        expect(data.emailVerificationTokenHash).toBe(createHash('sha256').update(rawToken).digest('hex'));
        expect(data.emailVerificationTokenHash).not.toBe(rawToken);
        // The token is bound to the password hash it verifies.
        expect(data.emailVerificationPasswordDigest).toBe(createHash('sha256').update('bcrypt-hash').digest('hex'));
        const ttl = data.emailVerificationTokenExpires.getTime() - before;
        expect(ttl).toBeGreaterThan(24 * 60 * 60 * 1000 - 5000);
        expect(ttl).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000);
    });

    it('ignores an attacker-supplied password and resends a link bound to the pending account password', async () => {
        const fetch = vi.fn(async () => new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetch);
        const pending = { id: 'pending_user', email: 'racer@example.com', name: 'Owner', emailVerified: null, passwordHash: 'owner-hash' };
        mocks.findUnique.mockResolvedValueOnce(pending);
        const attackerPassword = 'attacker999';

        const response = await registerUser(makeFormData('en', { password: attackerPassword }));

        expect(response).toEqual({
            success: true,
            message: 'If you can create an account with this address, check your inbox for the next step.',
        });
        expect(mocks.hash).toHaveBeenCalledWith(attackerPassword, 10);
        expect(mocks.create).not.toHaveBeenCalled();
        for (const [args] of mocks.update.mock.calls) {
            expect(args.data).not.toHaveProperty('passwordHash');
            expect(args.data).not.toHaveProperty('name');
        }
        expect(mocks.update).toHaveBeenCalledWith({
            where: { id: 'pending_user' },
            data: expect.objectContaining({
                emailVerificationPasswordDigest: createHash('sha256').update('owner-hash').digest('hex'),
            }),
        });
        expect(mocks.rateLimit).toHaveBeenCalledWith('auth:verify-resend-email:racer@example.com', expect.any(Object));
        expect(JSON.parse(fetch.mock.calls[0][1].body).text).toContain('/verify-email?token=');
    });

    it('does not resend to an unverified account once its per-address cap is reached', async () => {
        const fetch = vi.fn(async () => new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetch);
        mocks.findUnique.mockResolvedValueOnce({
            id: 'pending_user', email: 'racer@example.com', emailVerified: null, passwordHash: 'owner-hash',
        });
        mocks.rateLimit.mockImplementation(async (key) => ({ success: !key.startsWith('auth:verify-resend-email:') }));

        const response = await registerUser(makeFormData());

        expect(response.success).toBe(true);
        expect(mocks.update).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects when the signup rate limit is exceeded without touching the database', async () => {
        mocks.rateLimit.mockResolvedValueOnce({ success: false });

        const response = await registerUser(makeFormData());

        expect(response.error).toMatch(/Too many attempts/);
        expect(mocks.findUnique).not.toHaveBeenCalled();
    });

    it('returns Arabic validation messages for invalid signup input', async () => {
        const invalidEmail = await registerUser(makeFormData('ar', { email: 'not-an-email' }));
        expect(invalidEmail).toEqual({ error: 'أدخل عنوان بريد إلكتروني صالحًا.' });

        const weakPassword = await registerUser(makeFormData('ar', { password: 'abc' }));
        expect(weakPassword).toEqual({ error: 'يجب أن تتكوّن كلمة المرور من 8 أحرف على الأقل.' });
        expect(mocks.findUnique).not.toHaveBeenCalled();
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it('localizes generic resend responses and defaults invalid locale values to English', async () => {
        const arabicResponse = await resendVerificationEmail(makeFormData('ar', { email: 'invalid' }));
        expect(arabicResponse).toEqual({
            success: true,
            message: 'إذا كان هذا العنوان مرتبطًا بحساب لم يتم التحقق منه، فسيتم إرسال رابط تحقق جديد.',
        });

        const fallbackResponse = await registerUser(makeFormData('fr', { email: 'invalid' }));
        expect(fallbackResponse).toEqual({ error: 'Please enter a valid email address' });
    });
});
