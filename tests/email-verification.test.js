import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

const mocks = vi.hoisted(() => ({
    findFirst: vi.fn(),
    update: vi.fn(),
    rateLimit: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findFirst: mocks.findFirst, update: mocks.update } } }));
vi.mock('@/lib/rate-limit', () => ({
    getClientIp: () => '203.0.113.5',
    rateLimit: mocks.rateLimit,
}));

import { GET } from '@/app/api/auth/verify/route';

beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SITE_URL;
    mocks.rateLimit.mockResolvedValue({ success: true });
});

describe('email verification route', () => {
    it('hashes the raw token before lookup and verifies the matching account', async () => {
        const token = 'a'.repeat(64);
        mocks.findFirst.mockResolvedValue({ id: 'user_123' });
        mocks.update.mockResolvedValue({ id: 'user_123' });

        const response = await GET(new Request(`https://pitlane.test/api/auth/verify?token=${token}`));

        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toBe('https://pitlane.test/login?verified=true');
        expect(mocks.findFirst).toHaveBeenCalledWith({
            where: {
                emailVerificationTokenHash: createHash('sha256').update(token).digest('hex'),
                emailVerificationTokenExpires: { gt: expect.any(Date) },
            },
            select: { id: true },
        });
        expect(mocks.update).toHaveBeenCalledWith({
            where: { id: 'user_123' },
            data: {
                emailVerified: expect.any(Date),
                emailVerificationTokenHash: null,
                emailVerificationTokenExpires: null,
            },
        });
    });
});
