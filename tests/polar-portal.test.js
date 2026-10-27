import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    createSession: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    listCustomers: vi.fn(),
    listSubscriptions: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: mocks.findUnique, update: mocks.update } } }));
vi.mock('@polar-sh/sdk/2026-10', () => ({
    createPolar: () => ({
        customerSessions: { create: mocks.createSession },
        customers: { list: mocks.listCustomers },
        subscriptions: { list: mocks.listSubscriptions },
    }),
}));
vi.mock('@/lib/rate-limit', () => ({
    getClientIp: () => '203.0.113.5',
    rateLimit: async () => ({ success: true }),
}));

import { GET } from '@/app/api/polar/portal/route';

const request = () => new Request('https://pitlane.test/api/polar/portal');
const ORIGINAL_PRODUCT_ID = process.env.POLAR_PRODUCT_ID;

describe('Polar customer portal route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.POLAR_ACCESS_TOKEN = 'test-token';
        process.env.POLAR_PRODUCT_ID = 'prod_pit_lane_pro';
        delete process.env.NEXT_PUBLIC_SITE_URL;
        mocks.auth.mockResolvedValue({ user: { id: 'user_123' } });
        mocks.findUnique.mockResolvedValue({
            id: 'user_123', email: 'racer@example.com', emailVerified: new Date(), polarCustomerId: 'cus_123', polarSubscriptionId: 'sub_123',
        });
        mocks.listCustomers.mockResolvedValue({ items: [], pagination: { total_count: 0, max_page: 1 } });
        mocks.listSubscriptions.mockResolvedValue({ items: [] });
        mocks.update.mockResolvedValue({});
        mocks.createSession.mockResolvedValue({ customer_portal_url: 'https://polar.test/portal/abc' });
    });

    afterEach(() => {
        if (ORIGINAL_PRODUCT_ID === undefined) delete process.env.POLAR_PRODUCT_ID;
        else process.env.POLAR_PRODUCT_ID = ORIGINAL_PRODUCT_ID;
    });

    it('creates a customer session server-side and redirects to its portal URL', async () => {
        const response = await GET(request());

        expect(mocks.createSession).toHaveBeenCalledWith({
            customer_id: 'cus_123',
            return_url: 'https://pitlane.test/profile',
        });
        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe('https://polar.test/portal/abc');
    });

    it('sends signed-out visitors to login', async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await GET(request());

        expect(response.headers.get('location')).toBe('https://pitlane.test/login?redirect=%2Fprofile');
        expect(mocks.createSession).not.toHaveBeenCalled();
    });

    it('returns 404 when the account has no Polar subscription and Polar has no customer for its email', async () => {
        mocks.findUnique.mockResolvedValue({
            id: 'user_123', email: 'racer@example.com', emailVerified: new Date(), polarCustomerId: null, polarSubscriptionId: null,
        });

        const response = await GET(request());

        expect(response.status).toBe(404);
        expect(mocks.listCustomers).toHaveBeenCalledWith({ email: 'racer@example.com', limit: 10 });
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('finds a legacy Pro customer by email, stores its id, and opens the portal', async () => {
        mocks.findUnique.mockResolvedValue({
            id: 'user_123', email: 'racer@example.com', emailVerified: new Date(), polarCustomerId: null, polarSubscriptionId: null,
        });
        mocks.listCustomers.mockResolvedValue({
            items: [{ id: 'cus_legacy', email: 'Racer@Example.com' }],
            pagination: { total_count: 1, max_page: 1 },
        });
        mocks.listSubscriptions.mockResolvedValue({
            items: [{ id: 'sub_legacy', customer_id: 'cus_legacy', product_id: 'prod_pit_lane_pro' }],
        });

        const response = await GET(request());

        expect(mocks.update).toHaveBeenCalledWith({ where: { id: 'user_123' }, data: { polarCustomerId: 'cus_legacy' } });
        expect(mocks.listSubscriptions).toHaveBeenCalledWith({ customer_id: 'cus_legacy', product_id: 'prod_pit_lane_pro', limit: 1 });
        expect(mocks.createSession).toHaveBeenCalledWith({
            customer_id: 'cus_legacy',
            return_url: 'https://pitlane.test/profile',
        });
        expect(response.status).toBe(303);
    });

    it('does not use an unverified email to recover a legacy Polar customer', async () => {
        mocks.findUnique.mockResolvedValue({
            id: 'user_123', email: 'racer@example.com', emailVerified: null, polarCustomerId: null, polarSubscriptionId: null,
        });
        mocks.listCustomers.mockResolvedValue({ items: [{ id: 'cus_legacy', email: 'racer@example.com' }] });

        const response = await GET(request());

        expect(response.status).toBe(403);
        expect(mocks.listCustomers).not.toHaveBeenCalled();
        expect(mocks.update).not.toHaveBeenCalled();
        expect(mocks.createSession).not.toHaveBeenCalled();
    });

    it('does not link a legacy Polar customer without a Pit Lane Pro subscription', async () => {
        mocks.findUnique.mockResolvedValue({
            id: 'user_123', email: 'racer@example.com', emailVerified: new Date(), polarCustomerId: null, polarSubscriptionId: null,
        });
        mocks.listCustomers.mockResolvedValue({ items: [{ id: 'cus_legacy', email: 'racer@example.com' }] });
        mocks.listSubscriptions.mockResolvedValue({
            items: [{ id: 'sub_other', customer_id: 'cus_legacy', product_id: 'prod_other_site' }],
        });

        const response = await GET(request());

        expect(response.status).toBe(404);
        expect(mocks.listSubscriptions).toHaveBeenCalledWith({ customer_id: 'cus_legacy', product_id: 'prod_pit_lane_pro', limit: 1 });
        expect(mocks.update).not.toHaveBeenCalled();
        expect(mocks.createSession).not.toHaveBeenCalled();
    });

    it('does not open a legacy customer that is already linked to another account', async () => {
        mocks.findUnique.mockResolvedValue({
            id: 'user_123', email: 'racer@example.com', emailVerified: new Date(), polarCustomerId: null, polarSubscriptionId: null,
        });
        mocks.listCustomers.mockResolvedValue({ items: [{ id: 'cus_taken', email: 'racer@example.com' }] });
        mocks.listSubscriptions.mockResolvedValue({
            items: [{ id: 'sub_taken', customer_id: 'cus_taken', product_id: 'prod_pit_lane_pro' }],
        });
        mocks.update.mockRejectedValue(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await GET(request());

        expect(response.status).toBe(404);
        expect(mocks.createSession).not.toHaveBeenCalled();
    });
});
