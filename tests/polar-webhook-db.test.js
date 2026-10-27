import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Runs the webhook against real Prisma + Postgres when WEBHOOK_TEST_DATABASE_URL points at a
// disposable database (it is reset first), proving Postgres and Prisma accept the ordering guard.
const databaseUrl = process.env.WEBHOOK_TEST_DATABASE_URL;
const PSQL = process.env.PSQL_BIN || 'psql';
const MIGRATIONS = new URL('../prisma/migrations/', import.meta.url);
const SECRET = 'whsec_dGVzdC13ZWJob29rLXNlY3JldA==';

function psql(args) {
    return execFileSync(PSQL, [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-qAt', ...args], { encoding: 'utf8' }).trim();
}

let counter = 0;
function signed(type, data) {
    const body = JSON.stringify({ type, timestamp: new Date().toISOString(), data });
    const id = `msg_db_${counter += 1}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const key = Buffer.from(SECRET.slice('whsec_'.length), 'base64');
    const signature = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
    return new Request('https://pitlane.test/api/polar/webhook', {
        method: 'POST',
        headers: { 'webhook-id': id, 'webhook-timestamp': String(timestamp), 'webhook-signature': `v1,${signature}` },
        body,
    });
}

const subscription = (overrides) => ({
    id: 'sub_1',
    status: 'active',
    created_at: '2026-10-01T00:00:00.000Z',
    modified_at: '2026-10-01T00:00:00.000Z',
    customer_id: 'cus_1',
    customer: { id: 'cus_1', external_id: 'user_1' },
    current_period_end: '2026-12-01T00:00:00.000Z',
    metadata: {},
    ...overrides,
});

describe.skipIf(!databaseUrl)('Polar webhook against Postgres', () => {
    let POST;
    let prisma;

    beforeAll(async () => {
        psql(['-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;']);
        for (const name of ['20260208135020_init', '20261027120000_polar_auth_security', '20261027130000_webhook_order_verification_binding']) {
            psql(['-f', new URL(`${name}/migration.sql`, MIGRATIONS).pathname]);
        }
        psql(['-c', `INSERT INTO "User" ("id", "email", "updatedAt") VALUES ('user_1', 'one@example.com', now()), ('user_2', 'two@example.com', now())`]);
        process.env.POSTGRES_PRISMA_URL = databaseUrl;
        process.env.POSTGRES_URL_NON_POOLING = databaseUrl;
        process.env.POLAR_WEBHOOK_SECRET = SECRET;
        ({ POST } = await import('@/app/api/polar/webhook/route'));
        ({ prisma } = await import('@/lib/prisma'));
    });

    afterAll(async () => {
        await prisma?.$disconnect();
    });

    const status = async (id = 'user_1') => prisma.user.findUnique({
        where: { id },
        select: { subscriptionStatus: true, polarSubscriptionId: true, polarSubscriptionUpdatedAt: true },
    });

    it('ignores a retried subscription.active after subscription.revoked', async () => {
        await POST(signed('subscription.active', subscription({ modified_at: '2026-10-01T00:00:00.000Z' })));
        await POST(signed('subscription.revoked', subscription({ status: 'canceled', modified_at: '2026-10-05T00:00:00.000Z' })));
        const retry = await POST(signed('subscription.active', subscription({ modified_at: '2026-10-01T00:00:00.000Z' })));

        expect(retry.status).toBe(200);
        expect(await status()).toEqual({
            subscriptionStatus: 'canceled',
            polarSubscriptionId: 'sub_1',
            polarSubscriptionUpdatedAt: new Date('2026-10-05T00:00:00.000Z'),
        });
    });

    it('lets a newer active subscription take over and keeps it when the old one is revoked again', async () => {
        await POST(signed('subscription.active', subscription({ id: 'sub_2', modified_at: '2026-10-06T00:00:00.000Z' })));
        await POST(signed('subscription.revoked', subscription({ status: 'canceled', modified_at: '2026-10-07T00:00:00.000Z' })));

        expect(await status()).toMatchObject({ subscriptionStatus: 'active', polarSubscriptionId: 'sub_2' });
    });

    it('acknowledges a customer id that already belongs to another user (P2002) with 200', async () => {
        const response = await POST(signed('subscription.active', subscription({
            id: 'sub_9',
            customer: { id: 'cus_1', external_id: 'user_2' },
            modified_at: '2026-10-08T00:00:00.000Z',
        })));

        expect(response.status).toBe(200);
        expect(await status('user_2')).toMatchObject({ subscriptionStatus: null });
    });
});
