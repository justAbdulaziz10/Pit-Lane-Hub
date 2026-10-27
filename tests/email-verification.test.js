import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

const mocks = vi.hoisted(() => ({
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    rateLimit: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: { user: { findFirst: mocks.findFirst, update: mocks.update, updateMany: mocks.updateMany } },
}));
vi.mock('@/lib/rate-limit', () => ({
    getClientIp: () => '203.0.113.5',
    rateLimit: mocks.rateLimit,
}));

import * as verifyRoute from '@/app/api/auth/verify/route';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const token = 'a'.repeat(64);

function postToken(value, headers = {}) {
    const body = new URLSearchParams({ token: value });
    return new Request('https://pitlane.test/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://pitlane.test', ...headers },
        body,
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SITE_URL;
    mocks.rateLimit.mockResolvedValue({ success: true });
    mocks.updateMany.mockResolvedValue({ count: 1 });
});

describe('email verification route', () => {
    it('GET never changes state; it forwards to the confirmation page', async () => {
        mocks.findFirst.mockResolvedValue({ id: 'user_123', passwordHash: 'hash', emailVerificationPasswordDigest: sha256('hash') });

        const response = await verifyRoute.GET(new Request(`https://pitlane.test/api/auth/verify?token=${token}`));

        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toBe(`https://pitlane.test/verify-email?token=${token}`);
        expect(mocks.findFirst).not.toHaveBeenCalled();
        expect(mocks.update).not.toHaveBeenCalled();
        expect(mocks.updateMany).not.toHaveBeenCalled();
    });

    it('POST verifies the account bound to the token and its current password', async () => {
        mocks.findFirst.mockResolvedValue({ id: 'user_123', passwordHash: 'hash', emailVerificationPasswordDigest: sha256('hash') });

        const response = await verifyRoute.POST(postToken(token));

        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe('https://pitlane.test/login?verified=true');
        expect(mocks.findFirst).toHaveBeenCalledWith({
            where: {
                emailVerificationTokenHash: sha256(token),
                emailVerificationTokenExpires: { gt: expect.any(Date) },
            },
            select: { id: true, passwordHash: true, emailVerificationPasswordDigest: true },
        });
        expect(mocks.updateMany).toHaveBeenCalledWith({
            where: { id: 'user_123', emailVerificationTokenHash: sha256(token), passwordHash: 'hash' },
            data: {
                emailVerified: expect.any(Date),
                emailVerificationTokenHash: null,
                emailVerificationTokenExpires: null,
                emailVerificationPasswordDigest: null,
            },
        });
    });

    it('POST refuses a token issued for a different password', async () => {
        mocks.findFirst.mockResolvedValue({
            id: 'user_123', passwordHash: 'attacker-hash', emailVerificationPasswordDigest: sha256('owner-hash'),
        });

        const response = await verifyRoute.POST(postToken(token));

        expect(response.headers.get('location')).toBe('https://pitlane.test/login?verification=invalid');
        expect(mocks.updateMany).not.toHaveBeenCalled();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('POST refuses when the password changed between the read and the write', async () => {
        mocks.findFirst.mockResolvedValue({ id: 'user_123', passwordHash: 'hash', emailVerificationPasswordDigest: sha256('hash') });
        mocks.updateMany.mockResolvedValue({ count: 0 });

        const response = await verifyRoute.POST(postToken(token));

        expect(response.headers.get('location')).toBe('https://pitlane.test/login?verification=invalid');
    });

    it('POST rejects a cross-site form submission', async () => {
        const response = await verifyRoute.POST(postToken(token, { origin: 'https://evil.example' }));

        expect(response.status).toBe(403);
        expect(mocks.findFirst).not.toHaveBeenCalled();
    });

    it('POST rejects a malformed token without a lookup', async () => {
        const response = await verifyRoute.POST(postToken('not-a-token'));

        expect(response.headers.get('location')).toBe('https://pitlane.test/login?verification=invalid');
        expect(mocks.findFirst).not.toHaveBeenCalled();
    });
});
