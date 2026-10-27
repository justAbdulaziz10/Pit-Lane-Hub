import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Exercises the Postgres limiter SQL against a disposable database (reset first) when
// RATE_LIMIT_TEST_DATABASE_URL is set.
const databaseUrl = process.env.RATE_LIMIT_TEST_DATABASE_URL;
const PSQL = process.env.PSQL_BIN || 'psql';
const MIGRATIONS = new URL('../prisma/migrations/', import.meta.url);

function psql(args) {
    return execFileSync(PSQL, [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-qAt', ...args], { encoding: 'utf8' }).trim();
}

describe.skipIf(!databaseUrl)('Postgres rate limiter', () => {
    let rateLimit;
    let prisma;

    beforeAll(async () => {
        psql(['-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;']);
        for (const name of ['20260208135020_init', '20261027120000_polar_auth_security', '20261027130000_webhook_order_verification_binding']) {
            psql(['-f', new URL(`${name}/migration.sql`, MIGRATIONS).pathname]);
        }
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        process.env.POSTGRES_PRISMA_URL = databaseUrl;
        process.env.POSTGRES_URL_NON_POOLING = databaseUrl;
        ({ rateLimit } = await import('@/lib/rate-limit'));
        ({ prisma } = await import('@/lib/prisma'));
    });

    afterAll(async () => {
        vi.unstubAllEnvs();
        await prisma?.$disconnect();
    });

    it('counts hits atomically across concurrent callers and refuses past the limit', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('VERCEL', '1');
        const options = { limit: 5, windowMs: 60_000 };

        const results = await Promise.all(
            Array.from({ length: 8 }, () => rateLimit('auth:credentials:198.51.100.1', options)),
        );

        expect(results.filter((result) => result.success)).toHaveLength(5);
        expect(results.some((result) => result.unavailable)).toBe(false);
        expect(psql(['-c', `SELECT "count" FROM "RateLimit" WHERE "key" = 'auth:credentials:198.51.100.1'`])).toBe('8');
    });

    it('peeks without incrementing', async () => {
        const options = { limit: 2, windowMs: 60_000 };
        await rateLimit('auth:peek:a', options);

        expect((await rateLimit('auth:peek:a', { ...options, consume: false })).success).toBe(true);
        expect((await rateLimit('auth:peek:a', { ...options, consume: false })).success).toBe(true);
        expect(psql(['-c', `SELECT "count" FROM "RateLimit" WHERE "key" = 'auth:peek:a'`])).toBe('1');
        await rateLimit('auth:peek:a', options);
        expect((await rateLimit('auth:peek:a', { ...options, consume: false })).success).toBe(false);
    });

    it('starts a new window once the old one has expired', async () => {
        psql(['-c', `INSERT INTO "RateLimit" ("key", "count", "windowStart") VALUES ('auth:old', 99, (now() AT TIME ZONE 'UTC') - interval '2 minutes')`]);

        expect((await rateLimit('auth:old', { limit: 1, windowMs: 1_000, consume: false })).success).toBe(true);
        const result = await rateLimit('auth:old', { limit: 1, windowMs: 1_000 });

        expect(result.success).toBe(true);
        expect(psql(['-c', `SELECT "count" FROM "RateLimit" WHERE "key" = 'auth:old'`])).toBe('1');
        expect(result.resetAt).toBeGreaterThan(Date.now() - 5_000);
        expect(result.resetAt).toBeLessThan(Date.now() + 5_000);
    });
});
