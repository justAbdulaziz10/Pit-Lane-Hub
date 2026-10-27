import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';

/**
 * In-memory stand-in for prisma.user that evaluates the `where` operators the webhook uses
 * (AND, OR, NOT, equality, null, lt, notIn) and enforces the unique Polar id columns, so tests
 * exercise the actual ordering rules rather than the shape of one query.
 */
const store = vi.hoisted(() => {
    const users = new Map();
    const UNIQUE = ['polarCustomerId', 'polarSubscriptionId'];

    function matchesField(value, condition) {
        if (condition === null) return value === null || value === undefined;
        if (condition instanceof Date) return value instanceof Date && value.getTime() === condition.getTime();
        if (typeof condition === 'object') {
            if ('lt' in condition) return value instanceof Date && value.getTime() < condition.lt.getTime();
            if ('notIn' in condition) return value !== null && value !== undefined && !condition.notIn.includes(value);
            throw new Error(`Unsupported condition ${JSON.stringify(condition)}`);
        }
        return value === condition;
    }

    function matches(row, where) {
        return Object.entries(where).every(([key, condition]) => {
            if (key === 'AND') return condition.every((part) => matches(row, part));
            if (key === 'OR') return condition.some((part) => matches(row, part));
            if (key === 'NOT') return !matches(row, condition);
            return matchesField(row[key], condition);
        });
    }

    const user = {
        updateMany: async ({ where, data }) => {
            const targets = [...users.values()].filter((row) => matches(row, where));
            for (const row of targets) {
                for (const column of UNIQUE) {
                    if (data[column] == null) continue;
                    const clash = [...users.values()].find((other) => other !== row && other[column] === data[column]);
                    if (clash) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: [column] } });
                }
            }
            for (const row of targets) Object.assign(row, data);
            return { count: targets.length };
        },
        count: async ({ where }) => [...users.values()].filter((row) => matches(row, where)).length,
    };

    return {
        users,
        user,
        reset(rows = []) {
            users.clear();
            for (const row of rows) {
                users.set(row.id, {
                    polarCustomerId: null,
                    polarSubscriptionId: null,
                    polarSubscriptionUpdatedAt: null,
                    subscriptionStatus: null,
                    currentPeriodEnd: null,
                    ...row,
                });
            }
        },
    };
});

vi.mock('@/lib/prisma', () => ({ prisma: { user: store.user } }));

import { POST } from '@/app/api/polar/webhook/route';

const SECRET = 'whsec_dGVzdC13ZWJob29rLXNlY3JldA==';
const ORIGINAL_SECRET = process.env.POLAR_WEBHOOK_SECRET;
const ORIGINAL_PRODUCT_ID = process.env.POLAR_PRODUCT_ID;
let messageCounter = 0;

/** Builds a request signed exactly like Polar (Standard Webhooks, base64 key after whsec_). */
function signedRequest(payload, { secret = SECRET, timestamp = Math.floor(Date.now() / 1000) } = {}) {
    const body = JSON.stringify(payload);
    const id = `msg_test_${messageCounter += 1}`;
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
            created_at: '2026-10-01T00:00:00.000Z',
            modified_at: '2026-10-01T00:00:00.000Z',
            customer_id: 'cus_test_123',
            product_id: 'prod_pit_lane_pro',
            customer: { id: 'cus_test_123', external_id: 'user_123' },
            current_period_end: '2026-12-01T00:00:00.000Z',
            cancel_at_period_end: false,
            metadata: { userId: 'user_123' },
            ...overrides,
        },
    };
}

const deliver = (type, overrides) => POST(signedRequest(subscriptionEvent(type, overrides)));
const stored = (id = 'user_123') => store.users.get(id);

beforeEach(() => {
    process.env.POLAR_WEBHOOK_SECRET = SECRET;
    process.env.POLAR_PRODUCT_ID = 'prod_pit_lane_pro';
    store.reset([{ id: 'user_123' }]);
});

afterEach(() => {
    vi.restoreAllMocks();
    if (ORIGINAL_SECRET === undefined) delete process.env.POLAR_WEBHOOK_SECRET;
    else process.env.POLAR_WEBHOOK_SECRET = ORIGINAL_SECRET;
    if (ORIGINAL_PRODUCT_ID === undefined) delete process.env.POLAR_PRODUCT_ID;
    else process.env.POLAR_PRODUCT_ID = ORIGINAL_PRODUCT_ID;
});

describe('Polar webhook route', () => {
    it('fails closed when the webhook secret is missing', async () => {
        delete process.env.POLAR_WEBHOOK_SECRET;

        const response = await deliver('subscription.active');

        expect(response.status).toBe(503);
        expect(stored().subscriptionStatus).toBeNull();
    });

    it('rejects a request signed with the wrong secret', async () => {
        const response = await POST(signedRequest(subscriptionEvent('subscription.active'), {
            secret: 'whsec_d3Jvbmctc2VjcmV0',
        }));

        expect(response.status).toBe(403);
        expect(stored().subscriptionStatus).toBeNull();
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
        const response = await deliver(type, { status });

        expect(response.status).toBe(200);
        expect(stored()).toMatchObject({
            polarCustomerId: 'cus_test_123',
            polarSubscriptionId: 'sub_test_123',
            subscriptionStatus: status,
            currentPeriodEnd: new Date('2026-12-01T00:00:00.000Z'),
            polarSubscriptionUpdatedAt: new Date('2026-10-01T00:00:00.000Z'),
        });
    });

    it('falls back to the Polar customer id when the external id does not match a user', async () => {
        store.reset([{ id: 'other_user', polarCustomerId: 'cus_test_123' }]);

        const response = await deliver('subscription.updated');

        expect(response.status).toBe(200);
        expect(stored('other_user').subscriptionStatus).toBe('active');
    });

    it('prefers our checkout metadata user id over the shared Polar external id', async () => {
        store.reset([{ id: 'user_123' }, { id: 'other_site_user' }]);

        const response = await deliver('subscription.active', {
            customer: { id: 'cus_test_123', external_id: 'other_site_user' },
            metadata: { userId: 'user_123' },
        });

        expect(response.status).toBe(200);
        expect(stored().subscriptionStatus).toBe('active');
        expect(stored('other_site_user').subscriptionStatus).toBeNull();
    });

    it('tries the Polar external id after checkout metadata does not identify a user', async () => {
        store.reset([{ id: 'external_user' }]);

        const response = await deliver('subscription.active', {
            customer: { id: 'cus_test_123', external_id: 'external_user' },
            metadata: { userId: 'missing_metadata_user' },
        });

        expect(response.status).toBe(200);
        expect(stored('external_user').subscriptionStatus).toBe('active');
    });

    it('logs verified Pro events that match no user using only identifiers', async () => {
        store.reset([]);
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await deliver('subscription.active', {
            customer: { id: 'cus_test_123', external_id: 'external_elsewhere' },
            metadata: { userId: 'metadata_elsewhere' },
        });

        expect(response.status).toBe(200);
        expect(log).toHaveBeenCalledWith('[polar] Verified Pro subscription event matched no user', {
            eventType: 'subscription.active',
            userId: 'metadata_elsewhere',
            customerId: 'cus_test_123',
            subscriptionId: 'sub_test_123',
        });
    });

    it('ignores subscriptions to other products in the same Polar organization', async () => {
        const response = await deliver('subscription.active', { product_id: 'prod_other_site' });

        expect(response.status).toBe(202);
        expect(stored().subscriptionStatus).toBeNull();
    });

    it('fails closed when the Pro product id is not configured', async () => {
        delete process.env.POLAR_PRODUCT_ID;

        const response = await deliver('subscription.active');

        expect(response.status).toBe(503);
        expect(stored().subscriptionStatus).toBeNull();
    });

    it('acknowledges unrelated events without touching users', async () => {
        const response = await POST(signedRequest({ type: 'order.paid', timestamp: new Date().toISOString(), data: {} }));

        expect(response.status).toBe(202);
        expect(stored().subscriptionStatus).toBeNull();
    });
});

describe('Polar webhook ordering', () => {
    it('cancels a stored subscription switched to another product only when the event is newer', async () => {
        store.reset([{
            id: 'user_123',
            polarSubscriptionId: 'sub_switched',
            subscriptionStatus: 'active',
            polarSubscriptionUpdatedAt: new Date('2026-10-05T00:00:00.000Z'),
        }, {
            id: 'other_user',
            polarSubscriptionId: 'sub_other',
            subscriptionStatus: 'active',
            polarSubscriptionUpdatedAt: new Date('2026-10-05T00:00:00.000Z'),
        }]);

        await deliver('subscription.updated', {
            id: 'sub_switched', product_id: 'prod_other_site', modified_at: '2026-10-04T00:00:00.000Z',
        });
        expect(stored().subscriptionStatus).toBe('active');

        const response = await deliver('subscription.updated', {
            id: 'sub_switched', product_id: 'prod_other_site', modified_at: '2026-10-06T00:00:00.000Z',
        });

        expect(response.status).toBe(200);
        expect(stored()).toMatchObject({
            polarSubscriptionId: 'sub_switched',
            subscriptionStatus: 'canceled',
            polarSubscriptionUpdatedAt: new Date('2026-10-06T00:00:00.000Z'),
        });
        expect(stored('other_user').subscriptionStatus).toBe('active');
    });

    it('does not re-grant Pro when an older subscription.active is retried after subscription.revoked', async () => {
        await deliver('subscription.active', { modified_at: '2026-10-01T00:00:00.000Z' });
        await deliver('subscription.revoked', { status: 'canceled', modified_at: '2026-10-05T00:00:00.000Z' });

        const retry = await deliver('subscription.active', { modified_at: '2026-10-01T00:00:00.000Z' });

        expect(retry.status).toBe(200);
        expect(stored().subscriptionStatus).toBe('canceled');
        expect(stored().polarSubscriptionUpdatedAt).toEqual(new Date('2026-10-05T00:00:00.000Z'));
    });

    it('applies events that arrive out of order only when they are newer', async () => {
        await deliver('subscription.revoked', { status: 'canceled', modified_at: '2026-10-05T00:00:00.000Z' });
        await deliver('subscription.created', { status: 'incomplete', modified_at: null, created_at: '2026-09-30T00:00:00.000Z' });

        expect(stored().subscriptionStatus).toBe('canceled');
    });

    it('lets a newer, active second subscription take over', async () => {
        await deliver('subscription.revoked', { status: 'canceled', modified_at: '2026-10-05T00:00:00.000Z' });
        await deliver('subscription.active', { id: 'sub_new', modified_at: '2026-10-06T00:00:00.000Z' });

        expect(stored()).toMatchObject({ polarSubscriptionId: 'sub_new', subscriptionStatus: 'active' });
    });

    it('does not let another subscription ending remove Pro granted by the stored active one', async () => {
        await deliver('subscription.active', { id: 'sub_current', modified_at: '2026-10-06T00:00:00.000Z' });

        await deliver('subscription.revoked', { id: 'sub_old', status: 'canceled', modified_at: '2026-10-07T00:00:00.000Z' });

        expect(stored()).toMatchObject({ polarSubscriptionId: 'sub_current', subscriptionStatus: 'active' });
    });

    it('does not let a retried old event for a replaced subscription take over again', async () => {
        await deliver('subscription.active', { id: 'sub_a', modified_at: '2026-10-01T00:00:00.000Z' });
        await deliver('subscription.revoked', { id: 'sub_a', status: 'canceled', modified_at: '2026-10-02T00:00:00.000Z' });
        await deliver('subscription.active', { id: 'sub_b', modified_at: '2026-10-03T00:00:00.000Z' });
        await deliver('subscription.active', { id: 'sub_a', modified_at: '2026-10-01T00:00:00.000Z' });
        await deliver('subscription.revoked', { id: 'sub_b', status: 'canceled', modified_at: '2026-10-04T00:00:00.000Z' });

        expect(stored()).toMatchObject({ polarSubscriptionId: 'sub_b', subscriptionStatus: 'canceled' });
    });

    it('does not fall back to another user by customer id when the event is stale for the matched user', async () => {
        store.reset([
            { id: 'user_123', polarSubscriptionId: 'sub_test_123', subscriptionStatus: 'canceled', polarSubscriptionUpdatedAt: new Date('2026-10-05T00:00:00.000Z') },
            { id: 'someone_else', polarCustomerId: 'cus_test_123' },
        ]);

        const response = await deliver('subscription.active', { modified_at: '2026-10-01T00:00:00.000Z' });

        expect(response.status).toBe(200);
        expect(stored('someone_else').subscriptionStatus).toBeNull();
        expect(stored().subscriptionStatus).toBe('canceled');
    });
});

describe('Polar webhook id conflicts', () => {
    it('acknowledges with 200 and logs when the customer id already belongs to another user', async () => {
        store.reset([{ id: 'user_123' }, { id: 'someone_else', polarCustomerId: 'cus_test_123' }]);
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await deliver('subscription.active');

        expect(response.status).toBe(200);
        expect(log).toHaveBeenCalledOnce();
        expect(stored().subscriptionStatus).toBeNull();
    });
});
