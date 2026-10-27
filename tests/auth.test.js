import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    const transaction = {
        user: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    };
    const adapter = {
        createUser: vi.fn(async user => user),
        getUserByEmail: vi.fn(),
        updateUser: vi.fn(async user => user),
    };
    return {
        adapter,
        transaction,
        prisma: {
            user: { findUnique: vi.fn() },
            $transaction: vi.fn(async callback => callback(transaction)),
        },
        nextAuth: vi.fn(() => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })),
    };
});

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: () => mocks.adapter }));
vi.mock('next-auth', () => ({ default: mocks.nextAuth }));
vi.mock('next-auth/providers/credentials', () => ({ default: () => ({ id: 'credentials' }) }));
vi.mock('next-auth/providers/resend', () => ({ default: () => ({ id: 'resend' }) }));
vi.mock('bcryptjs', () => ({ default: { compare: vi.fn() } }));
vi.mock('@/lib/rate-limit', () => ({
    getClientIp: () => '203.0.113.8',
    rateLimit: vi.fn(async () => ({ success: true })),
}));

import { authCallbacks } from '@/auth';

describe('NextAuth callbacks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ignores client-supplied Pro state and reloads subscription status on update', async () => {
        mocks.prisma.user.findUnique.mockResolvedValue({
            subscriptionStatus: 'active',
            currentPeriodEnd: new Date('2026-12-01T00:00:00.000Z'),
        });

        const token = await authCallbacks.jwt({
            token: { id: 'user_123', isPro: false },
            trigger: 'update',
            session: { isPro: true, subscriptionStatus: 'revoked' },
        });

        expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: 'user_123' },
            select: { subscriptionStatus: true, currentPeriodEnd: true },
        });
        expect(token.isPro).toBe(true);
        expect(token.subscriptionStatus).toBe('active');
    });

    it('does not query the database again within five minutes of the last check', async () => {
        const token = await authCallbacks.jwt({
            token: { id: 'user_123', isPro: true, subscriptionCheckedAt: Date.now() - 60_000 },
        });

        expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
        expect(token.isPro).toBe(true);
    });

    it('reloads Pro state once the five-minute window has passed', async () => {
        mocks.prisma.user.findUnique.mockResolvedValue({ subscriptionStatus: 'canceled', currentPeriodEnd: null });

        const token = await authCallbacks.jwt({
            token: { id: 'user_123', isPro: true, subscriptionCheckedAt: Date.now() - 6 * 60_000 },
        });

        expect(mocks.prisma.user.findUnique).toHaveBeenCalledOnce();
        expect(token.isPro).toBe(false);
    });

    it('clears the password hash when a magic-link verification verifies an unverified account', async () => {
        const verifiedAt = new Date('2026-10-27T00:00:00.000Z');
        mocks.transaction.user.findUnique.mockResolvedValue({ emailVerified: null });
        mocks.transaction.user.update.mockResolvedValue({ id: 'user_123', email: 'racer@example.com' });

        await mocks.adapter.updateUser({
            id: 'user_123',
            email: '  RACER@Example.com ',
            emailVerified: verifiedAt,
        });

        expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
        expect(mocks.transaction.user.update).toHaveBeenCalledWith({
            where: { id: 'user_123' },
            data: {
                email: 'racer@example.com',
                emailVerified: verifiedAt,
                passwordHash: null,
                emailVerificationTokenHash: null,
                emailVerificationTokenExpires: null,
            },
        });
    });
});
