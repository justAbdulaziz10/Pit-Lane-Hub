import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    createSession: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    listCustomers: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: mocks.findUnique, update: mocks.update } } }));
vi.mock('@polar-sh/sdk/2026-10', () => ({
    createPolar: () => ({ customerSessions: { create: mocks.createSession }, customers: { list: mocks.listCustomers } }),
}));
vi.mock('@/lib/rate-limit', () => ({
    getClientIp: () => '203.0.113.5',
    rateLimit: async () => ({ success: true }),
}));

import { GET } from '@/app/api/polar/portal/route';

const request = () => new Request('https://pitlane.test/api/polar/portal');

describe('Polar customer portal route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.POLAR_ACCESS_TOKEN = 'test-token';
        delete process.env.NEXT_PUBLIC_SITE_URL;
        mocks.auth.mockResolvedValue({ user: { id: 'user_123' } });
        mocks.findUnique.mockResolvedValue({
            id: 'user_123', email: 'racer@example.com', polarCustomerId: 'cus_123', polarSubscriptionId: 'sub_123',
        });
        mocks.listCustomers.mockResolvedValue({ items: [], pagination: { total_count: 0, max_page: 1 } });
        mocks.update.mockResolvedValue({});
        mocks.createSession.mockResolvedValue({ customer_portal_url: 'https://polar.test/portal/abc' });
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
            id: 'user_123', email: 'racer@example.com', polarCustomerId: null, polarSubscriptionId: null,
        });

        const response = await GET(request());

        expect(response.status).toBe(404);
        expect(mocks.listCustomers).toHaveBeenCalledWith({ email: 'racer@example.com', limit: 10 });
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('finds a legacy Pro customer by email, stores its id, and opens the portal', async () => {
        mocks.findUnique.mockResolvedValue({
            id: 'user_123', email: 'racer@example.com', polarCustomerId: null, polarSubscriptionId: null,
        });
        mocks.listCustomers.mockResolvedValue({
            items: [{ id: 'cus_legacy', email: 'Racer@Example.com' }],
            pagination: { total_count: 1, max_page: 1 },
        });

        const response = await GET(request());

        expect(mocks.update).toHaveBeenCalledWith({ where: { id: 'user_123' }, data: { polarCustomerId: 'cus_legacy' } });
        expect(mocks.createSession).toHaveBeenCalledWith({
            customer_id: 'cus_legacy',
            return_url: 'https://pitlane.test/profile',
        });
        expect(response.status).toBe(303);
    });

    it('does not open a legacy customer that is already linked to another account', async () => {
        mocks.findUnique.mockResolvedValue({
            id: 'user_123', email: 'racer@example.com', polarCustomerId: null, polarSubscriptionId: null,
        });
        mocks.listCustomers.mockResolvedValue({ items: [{ id: 'cus_taken', email: 'racer@example.com' }] });
        mocks.update.mockRejectedValue(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await GET(request());

        expect(response.status).toBe(404);
        expect(mocks.createSession).not.toHaveBeenCalled();
    });
});
