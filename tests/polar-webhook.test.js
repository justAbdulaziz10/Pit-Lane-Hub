import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';

const mocks = vi.hoisted(() => ({
    userUpdateMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: { user: { updateMany: mocks.userUpdateMany } },
}));

import { POST } from '@/app/api/polar/webhook/route';

const SECRET = 'whsec_dGVzdC13ZWJob29rLXNlY3JldA==';
const ORIGINAL_SECRET = process.env.POLAR_WEBHOOK_SECRET;

/** Builds a request signed exactly like Polar (Standard Webhooks, base64 key after whsec_). */
function signedRequest(payload, { secret = SECRET, timestamp = Math.floor(Date.now() / 1000) } = {}) {
    const body = JSON.stringify(payload);
    const id = 'msg_test_1';
    const key = Buffer.from(secret.slice('whsec_'.length), 'base64');
    const signature = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
    return new Request('https://pitlane.test/api/polar/webhook', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'webhook-id': id,
            'webhook-timestamp': String(timestamp),
            'webhook-signature': `v1,${signature}`,
        },
        body,
    });
}

function subscriptionEvent(type, overrides = {}) {
    return {
        type,
        timestamp: new Date().toISOString(),
        data: {
            id: 'sub_test_123',
            status: 'active',
            customer_id: 'cus_test_123',
            customer: { id: 'cus_test_123', external_id: 'user_123' },
            current_period_end: '2026-12-01T00:00:00.000Z',
            cancel_at_period_end: false,
            metadata: { userId: 'user_123' },
            ...overrides,
        },
    };
}

beforeEach(() => {
    process.env.POLAR_WEBHOOK_SECRET = SECRET;
    mocks.userUpdateMany.mockReset();
    mocks.userUpdateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.POLAR_WEBHOOK_SECRET;
    else process.env.POLAR_WEBHOOK_SECRET = ORIGINAL_SECRET;
});

describe('Polar webhook route', () => {
    it('fails closed when the webhook secret is missing', async () => {
        delete process.env.POLAR_WEBHOOK_SECRET;

        const response = await POST(signedRequest(subscriptionEvent('subscription.active')));

        expect(response.status).toBe(500);
        expect(mocks.userUpdateMany).not.toHaveBeenCalled();
    });

    it('rejects a request signed with the wrong secret', async () => {
        const response = await POST(signedRequest(subscriptionEvent('subscription.active'), {
            secret: 'whsec_d3Jvbmctc2VjcmV0',
        }));

        expect(response.status).toBe(403);
        expect(mocks.userUpdateMany).not.toHaveBeenCalled();
    });

    it('rejects a replayed (stale) signature', async () => {
        const response = await POST(signedRequest(subscriptionEvent('subscription.active'), {
            timestamp: Math.floor(Date.now() / 1000) - 3600,
        }));

        expect(response.status).toBe(403);
    });

    it.each([
        ['subscription.created', 'incomplete'],
        ['subscription.active', 'active'],
        ['subscription.updated', 'past_due'],
        ['subscription.canceled', 'active'],
        ['subscription.revoked', 'canceled'],
    ])('stores subscription fields on the user for %s', async (type, status) => {
        const response = await POST(signedRequest(subscriptionEvent(type, { status })));

        expect(response.status).toBe(200);
        expect(mocks.userUpdateMany).toHaveBeenCalledWith({
            where: { id: 'user_123' },
            data: {
                polarCustomerId: 'cus_test_123',
                polarSubscriptionId: 'sub_test_123',
                subscriptionStatus: status,
                currentPeriodEnd: new Date('2026-12-01T00:00:00.000Z'),
            },
        });
    });

    it('falls back to the Polar customer id when the external id does not match a user', async () => {
        mocks.userUpdateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });

        const response = await POST(signedRequest(subscriptionEvent('subscription.updated')));

        expect(response.status).toBe(200);
        expect(mocks.userUpdateMany).toHaveBeenLastCalledWith(expect.objectContaining({
            where: { polarCustomerId: 'cus_test_123' },
        }));
    });

    it('acknowledges unrelated events without touching users', async () => {
        const response = await POST(signedRequest({ type: 'order.paid', timestamp: new Date().toISOString(), data: {} }));

        expect(response.status).toBe(202);
        expect(mocks.userUpdateMany).not.toHaveBeenCalled();
    });
});
