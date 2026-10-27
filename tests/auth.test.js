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
        compare: vi.fn(),
        rateLimit: vi.fn(async () => ({ success: true })),
    };
});

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: () => mocks.adapter }));
vi.mock('next-auth', () => ({ default: mocks.nextAuth }));
vi.mock('next-auth/providers/credentials', () => ({ default: (config) => ({ id: 'credentials', ...config }) }));
vi.mock('next-auth/providers/resend', () => ({ default: () => ({ id: 'resend' }) }));
vi.mock('bcryptjs', () => ({ default: { compare: mocks.compare } }));
vi.mock('@/lib/rate-limit', () => ({
    getClientIp: () => '203.0.113.8',
    rateLimit: mocks.rateLimit,
}));

import { authCallbacks } from '@/auth';

// Read the authorize function from the config handed to NextAuth, as next-auth itself does.
const credentialsProvider = mocks.nextAuth.mock.calls[0][0].providers.find((provider) => provider.id === 'credentials');
const authorize = (credentials) => credentialsProvider.authorize(credentials, new Request('https://pitlane.test'));
const login = { email: 'Racer@Example.com', password: 'racecar123' };

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

    it('drops a JWT when its user no longer exists in the database', async () => {
        mocks.prisma.user.findUnique.mockResolvedValue(null);

        const token = await authCallbacks.jwt({
            token: { id: 'deleted_user', isPro: true, subscriptionCheckedAt: Date.now() - 6 * 60_000 },
        });

        expect(token).toBeNull();
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
                emailVerificationPasswordDigest: null,
            },
        });
    });
});

describe('credentials authorize', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.compare.mockResolvedValue(false);
        mocks.rateLimit.mockResolvedValue({ success: true });
    });

    it.each([
        ['no account', null],
        ['an account without a password', { id: 'u1', passwordHash: null, emailVerified: new Date() }],
        ['an unverified account', { id: 'u1', passwordHash: 'real-hash', emailVerified: null }],
    ])('runs exactly one bcrypt comparison against a dummy hash for %s', async (_label, user) => {
        mocks.prisma.user.findUnique.mockResolvedValue(user);
        mocks.compare.mockResolvedValue(true);

        expect(await authorize(login)).toBeNull();

        expect(mocks.compare).toHaveBeenCalledOnce();
        expect(mocks.compare.mock.calls[0][0]).toBe('racecar123');
        expect(mocks.compare.mock.calls[0][1]).toMatch(/^\$2[aby]\$10\$.{53}$/);
        expect(mocks.compare.mock.calls[0][1]).not.toBe('real-hash');
    });

    it('signs in a verified account without spending its per-email failure budget', async () => {
        mocks.prisma.user.findUnique.mockResolvedValue({
            id: 'u1', email: 'racer@example.com', name: 'Racer', image: null,
            passwordHash: 'real-hash', emailVerified: new Date(),
        });
        mocks.compare.mockResolvedValue(true);

        expect(await authorize(login)).toEqual({ id: 'u1', email: 'racer@example.com', name: 'Racer', image: null });

        expect(mocks.compare).toHaveBeenCalledWith('racecar123', 'real-hash');
        expect(mocks.rateLimit.mock.calls[0][0]).toBe('auth:credentials:203.0.113.8');
        const emailCalls = mocks.rateLimit.mock.calls.filter(([key]) => key.includes('racer@example.com'));
        expect(emailCalls.length).toBeGreaterThan(0);
        expect(emailCalls.every(([, options]) => options.consume === false)).toBe(true);
    });

    it('counts a wrong password against the per-email failure budget', async () => {
        mocks.prisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: 'real-hash', emailVerified: new Date() });

        expect(await authorize(login)).toBeNull();

        const emailCalls = mocks.rateLimit.mock.calls.filter(([key]) => key.includes('racer@example.com'));
        expect(emailCalls.some(([, options]) => options.consume !== false)).toBe(true);
    });

    it('refuses an address that already reached its failure limit, before any lookup', async () => {
        mocks.rateLimit.mockImplementation(async (key, options) => ({
            success: !(key.includes('racer@example.com') && options.consume === false),
        }));

        expect(await authorize(login)).toBeNull();
        expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('refuses when the per-IP limit is exhausted', async () => {
        mocks.rateLimit.mockImplementation(async (key) => ({ success: !key.startsWith('auth:credentials:') }));

        expect(await authorize(login)).toBeNull();
        expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    });
});
