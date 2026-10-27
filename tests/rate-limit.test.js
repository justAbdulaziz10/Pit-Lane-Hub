import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn(), executeRaw: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: mocks.queryRaw, $executeRaw: mocks.executeRaw } }));

import { getClientIp, rateLimit } from '@/lib/rate-limit';

describe('rateLimit memory backend', () => {
    beforeEach(() => {
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        vi.restoreAllMocks();
    });

    it('allows the configured count and rejects the next request in the fixed window', async () => {
        const key = `memory-test:${crypto.randomUUID()}`;
        const first = await rateLimit(key, { limit: 2, windowMs: 60_000 });
        const second = await rateLimit(key, { limit: 2, windowMs: 60_000 });
        const third = await rateLimit(key, { limit: 2, windowMs: 60_000 });

        expect(first.success).toBe(true);
        expect(second.success).toBe(true);
        expect(second.remaining).toBe(0);
        expect(third.success).toBe(false);
    });


    it('resets the count when a new window starts', async () => {
        const key = `memory-window:${crypto.randomUUID()}`;
        const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
        await rateLimit(key, { limit: 1, windowMs: 1000 });
        expect((await rateLimit(key, { limit: 1, windowMs: 1000 })).success).toBe(false);

        now.mockReturnValue(1_001_001);
        expect((await rateLimit(key, { limit: 1, windowMs: 1000 })).success).toBe(true);
    });
});

describe('rateLimit Upstash backend', () => {
    afterEach(() => {
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        vi.unstubAllGlobals();
    });

    it('runs an atomic fixed-window script over the REST API', async () => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example/';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
        const fetch = vi.fn(async () => Response.json({ result: [4, 30_000] }));
        vi.stubGlobal('fetch', fetch);

        const result = await rateLimit('auth:signup:203.0.113.5', { limit: 3, windowMs: 60_000 });

        expect(result.success).toBe(false);
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe('https://redis.example');
        expect(init.headers.Authorization).toBe('Bearer token');
        const command = JSON.parse(init.body);
        expect(command[0]).toBe('EVAL');
        expect(command.slice(2)).toEqual(['1', 'ratelimit:auth:signup:203.0.113.5', '60000']);
    });
});

describe('getClientIp', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('ignores spoofable proxy headers unless the deployment says a proxy sets them', () => {
        vi.stubEnv('VERCEL', '');
        vi.stubEnv('TRUST_PROXY', '');
        expect(getClientIp(new Headers({ 'x-forwarded-for': '198.51.100.1' }))).toBe('unknown');
        expect(getClientIp(new Headers({ 'x-real-ip': '198.51.100.2' }))).toBe('unknown');
        expect(getClientIp(new Headers())).toBe('unknown');
    });

    it('uses the first forwarded address on Vercel, which overwrites the header', () => {
        vi.stubEnv('VERCEL', '1');
        expect(getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.2' }))).toBe('203.0.113.5');
        expect(getClientIp(new Headers({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9');
    });

    it('uses x-real-ip or the proxy-appended last forwarded address with TRUST_PROXY=1', () => {
        vi.stubEnv('VERCEL', '');
        vi.stubEnv('TRUST_PROXY', '1');
        expect(getClientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }))).toBe('203.0.113.7');
        expect(getClientIp(new Headers({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '1.2.3.4' }))).toBe('203.0.113.9');
    });
});

describe('rateLimit shared backends for auth scopes', () => {
    beforeEach(() => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('VERCEL', '1');
        vi.spyOn(console, 'error').mockImplementation(() => {});
        mocks.queryRaw.mockReset();
        mocks.executeRaw.mockReset();
        mocks.executeRaw.mockResolvedValue(0);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });

    it('uses an atomic Postgres upsert for auth scopes when Upstash is not configured', async () => {
        const windowStart = new Date('2026-10-27T10:00:00.000Z');
        mocks.queryRaw.mockResolvedValue([{ count: 6, windowStart }]);

        const result = await rateLimit('auth:credentials:203.0.113.5', { limit: 5, windowMs: 60_000 });

        expect(result).toEqual({ success: false, limit: 5, remaining: 0, resetAt: windowStart.getTime() + 60_000 });
        const [strings, ...values] = mocks.queryRaw.mock.calls[0];
        const sql = strings.join('?');
        expect(sql).toMatch(/INSERT INTO "RateLimit"/);
        expect(sql).toMatch(/ON CONFLICT \("key"\) DO UPDATE/);
        expect(sql).toMatch(/RETURNING "count", "windowStart"/);
        expect(values).toContain('auth:credentials:203.0.113.5');
        expect(values).toContain(60_000);
    });

    it('allows the request while the Postgres count is within the limit', async () => {
        mocks.queryRaw.mockResolvedValue([{ count: 2, windowStart: new Date() }]);

        const result = await rateLimit('auth:signup:203.0.113.5', { limit: 5, windowMs: 60_000 });

        expect(result.success).toBe(true);
        expect(result.remaining).toBe(3);
    });

    it('falls back to Postgres when Upstash errors', async () => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
        vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
        mocks.queryRaw.mockResolvedValue([{ count: 1, windowStart: new Date() }]);

        const result = await rateLimit('auth:signup:203.0.113.5', { limit: 5, windowMs: 60_000 });

        expect(result.success).toBe(true);
        expect(mocks.queryRaw).toHaveBeenCalledOnce();
    });

    it('does not touch Postgres when Upstash answers', async () => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
        vi.stubGlobal('fetch', vi.fn(async () => Response.json({ result: [1, 60_000] })));

        await rateLimit('auth:signup:203.0.113.5', { limit: 5, windowMs: 60_000 });

        expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it('fails closed in production only when both Upstash and Postgres fail', async () => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
        vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
        mocks.queryRaw.mockRejectedValue(new Error('connection refused'));

        const result = await rateLimit(`auth:credentials:${crypto.randomUUID()}`, { limit: 5, windowMs: 60_000 });

        expect(result.success).toBe(false);
    });

    it('fails closed in production when Upstash is absent and Postgres fails', async () => {
        mocks.queryRaw.mockRejectedValue(new Error('connection refused'));

        const result = await rateLimit(`auth:verify:${crypto.randomUUID()}`, { limit: 5, windowMs: 60_000 });

        expect(result.success).toBe(false);
    });

    it('also fails closed off Vercel when RATE_LIMIT_REQUIRE_REDIS=1', async () => {
        vi.stubEnv('VERCEL', '');
        vi.stubEnv('RATE_LIMIT_REQUIRE_REDIS', '1');
        mocks.queryRaw.mockRejectedValue(new Error('connection refused'));

        const result = await rateLimit(`auth:verify:${crypto.randomUUID()}`, { limit: 5, windowMs: 60_000 });

        expect(result.success).toBe(false);
    });

    it('falls back to memory for auth scopes outside production when Postgres fails', async () => {
        vi.stubEnv('NODE_ENV', 'test');
        mocks.queryRaw.mockRejectedValue(new Error('connection refused'));

        const result = await rateLimit(`auth:credentials:${crypto.randomUUID()}`, { limit: 5, windowMs: 60_000 });

        expect(result.success).toBe(true);
    });

    it('keeps the memory limiter for non-auth scopes without querying Postgres', async () => {
        const result = await rateLimit(`polar:checkout:${crypto.randomUUID()}`, { limit: 5, windowMs: 60_000 });

        expect(result.success).toBe(true);
        expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it('peeks at a Postgres window without incrementing it', async () => {
        mocks.queryRaw.mockResolvedValue([{ count: 5, windowStart: new Date() }]);

        const result = await rateLimit('auth:credentials-email-failures:racer@example.com', {
            limit: 5, windowMs: 60_000, consume: false,
        });

        expect(result.success).toBe(false);
        const sql = mocks.queryRaw.mock.calls[0][0].join('?');
        expect(sql).toMatch(/^\s*SELECT/);
        expect(sql).not.toMatch(/INSERT/);
    });
});

describe('rateLimit peek (consume: false)', () => {
    beforeEach(() => {
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });

    it('reports the window state without counting the request', async () => {
        const key = `peek:${crypto.randomUUID()}`;
        const options = { limit: 2, windowMs: 60_000 };

        expect((await rateLimit(key, { ...options, consume: false })).success).toBe(true);
        expect((await rateLimit(key, { ...options, consume: false })).success).toBe(true);
        await rateLimit(key, options);
        expect((await rateLimit(key, { ...options, consume: false })).success).toBe(true);
        await rateLimit(key, options);
        expect((await rateLimit(key, { ...options, consume: false })).success).toBe(false);
    });
});
