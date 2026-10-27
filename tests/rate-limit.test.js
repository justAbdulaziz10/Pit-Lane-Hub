import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

    it('uses the first forwarded address as the client IP', () => {
        expect(getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.2' }))).toBe('203.0.113.5');
        expect(getClientIp(new Headers({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9');
        expect(getClientIp(new Headers())).toBe('unknown');
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
