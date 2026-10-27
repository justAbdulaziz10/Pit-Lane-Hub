import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    create: vi.fn(),
    createPolar: vi.fn(),
    rateLimit: vi.fn(),
    findUnique: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
vi.mock('@polar-sh/sdk/2026-10', () => ({ createPolar: mocks.createPolar }));
vi.mock('@/lib/rate-limit', () => ({
    getClientIp: () => '203.0.113.5',
    rateLimit: mocks.rateLimit,
}));

import { POST } from '@/app/api/polar/checkout/route';

const request = () => new Request('https://pitlane.test/api/polar/checkout', { method: 'POST' });

describe('Polar checkout route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.POLAR_ACCESS_TOKEN = 'test-token';
        process.env.POLAR_PRODUCT_ID = 'product_test_123';
        process.env.POLAR_SERVER = 'sandbox';
        delete process.env.NEXT_PUBLIC_SITE_URL;
        mocks.createPolar.mockReturnValue({ checkouts: { create: mocks.create } });
        mocks.auth.mockResolvedValue({ user: { id: 'user_123', email: 'racer@example.com' } });
        mocks.create.mockResolvedValue({ url: 'https://checkout.polar.test/session_123' });
        mocks.rateLimit.mockResolvedValue({ success: true });
        mocks.findUnique.mockResolvedValue({ email: 'racer@example.com', subscriptionStatus: null });
    });

    it('calls checkouts.create with the product, user identity, and request-origin URLs', async () => {
        const response = await POST(request());

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ url: 'https://checkout.polar.test/session_123' });
        expect(mocks.createPolar).toHaveBeenCalledWith({ accessToken: 'test-token', environment: 'sandbox' });
        expect(mocks.create).toHaveBeenCalledOnce();
        expect(mocks.create).toHaveBeenCalledWith({
            products: ['product_test_123'],
            success_url: 'https://pitlane.test/support?success=true',
            return_url: 'https://pitlane.test/support?canceled=true',
            customer_email: 'racer@example.com',
            external_customer_id: 'user_123',
            metadata: { userId: 'user_123' },
        });
    });

    it('prefers NEXT_PUBLIC_SITE_URL for return URLs and never emits "undefined"', async () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'https://www.pitlanehub.example/';

        await POST(request());

        const args = mocks.create.mock.calls[0][0];
        expect(args.success_url).toBe('https://www.pitlanehub.example/support?success=true');
        expect(JSON.stringify(args)).not.toContain('undefined');
    });

    it('requires a signed-in user', async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await POST(request());

        expect(response.status).toBe(401);
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it('returns a clear 503 JSON response when Polar is not configured', async () => {
        delete process.env.POLAR_PRODUCT_ID;

        const response = await POST(request());

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            error: 'Checkout is temporarily unavailable because payments are not configured.',
        });
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it('returns 429 when the rate limit is exceeded', async () => {
        mocks.rateLimit.mockResolvedValue({ success: false });

        const response = await POST(request());

        expect(response.status).toBe(429);
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it.each(['active', 'trialing'])('refuses a second purchase with 409 when the stored subscription is %s', async (status) => {
        // The session claims free; the database says Pro.
        mocks.auth.mockResolvedValue({ user: { id: 'user_123', email: 'racer@example.com', isPro: false } });
        mocks.findUnique.mockResolvedValue({ email: 'racer@example.com', subscriptionStatus: status });

        const response = await POST(request());

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
            error: 'You already have an active Pit Lane Pro subscription.',
            portalUrl: '/api/polar/portal',
        });
        expect(mocks.findUnique).toHaveBeenCalledWith({
            where: { id: 'user_123' },
            select: { email: true, subscriptionStatus: true },
        });
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it('allows a new checkout after the previous subscription ended', async () => {
        mocks.findUnique.mockResolvedValue({ email: 'racer@example.com', subscriptionStatus: 'canceled' });

        const response = await POST(request());

        expect(response.status).toBe(200);
        expect(mocks.create).toHaveBeenCalledOnce();
    });
});
