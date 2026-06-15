import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Avoid pulling in a real database client.
vi.mock('@/lib/prisma', () => ({ prisma: { user: { update: vi.fn() } } }));

import { POST } from '@/app/api/polar/webhook/route';

function makeRequest(body, headers = {}) {
    return new Request('http://localhost/api/polar/webhook', {
        method: 'POST',
        headers,
        body,
    });
}

const ORIGINAL_SECRET = process.env.POLAR_WEBHOOK_SECRET;

beforeEach(() => {
    process.env.POLAR_WEBHOOK_SECRET = 'whsec_dGVzdHNlY3JldHRlc3RzZWNyZXQ=';
});

afterEach(() => {
    process.env.POLAR_WEBHOOK_SECRET = ORIGINAL_SECRET;
});

describe('Polar webhook route', () => {
    it('returns 500 when the webhook secret is not configured (fail closed)', async () => {
        delete process.env.POLAR_WEBHOOK_SECRET;
        const res = await POST(makeRequest('{}'));
        expect(res.status).toBe(500);
    });

    it('rejects payloads with an invalid signature', async () => {
        const res = await POST(
            makeRequest(JSON.stringify({ type: 'subscription.active', data: {} }), {
                'webhook-id': 'msg_123',
                'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
                'webhook-signature': 'v1,bm90LWEtdmFsaWQtc2lnbmF0dXJl',
            })
        );
        expect(res.status).toBe(403);
    });
});
