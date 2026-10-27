import { prisma } from "@/lib/prisma";

const memoryWindows = new Map();
const POSTGRES_CLEANUP_CHANCE = 0.01;
const POSTGRES_RETENTION_MS = 24 * 60 * 60 * 1000;
const UNTRUSTED_CLIENT = "unknown";
let loggedBackendFailure = false;

const FIXED_WINDOW_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return {count, redis.call("PTTL", KEYS[1])}
`;

const PEEK_SCRIPT = `
local count = tonumber(redis.call("GET", KEYS[1]) or "0")
return {count, redis.call("PTTL", KEYS[1])}
`;

function proxyHeadersTrusted() {
    return Boolean(process.env.VERCEL) || process.env.TRUST_PROXY === "1";
}

/**
 * Client IP for rate-limit keys. Proxy headers are only trusted on Vercel (which overwrites
 * x-forwarded-for and sets x-real-ip) or when TRUST_PROXY=1 says a reverse proxy sets them.
 * Otherwise any caller could rotate the header to get a fresh bucket, so every request shares
 * one constant key per scope instead.
 */
export function getClientIp(headers) {
    if (!proxyHeadersTrusted()) return UNTRUSTED_CLIENT;

    const realIp = headers.get("x-real-ip")?.trim();
    const forwarded = (headers.get("x-forwarded-for") || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

    if (process.env.VERCEL) return forwarded[0] || realIp || UNTRUSTED_CLIENT;
    // A generic proxy appends the address it saw, so the last entry is the one it vouches for.
    return realIp || forwarded.at(-1) || UNTRUSTED_CLIENT;
}

/** Production deployments where a per-instance memory limiter is not an acceptable fallback. */
function requiresSharedBackend() {
    return process.env.NODE_ENV === "production" &&
        (Boolean(process.env.VERCEL) || process.env.RATE_LIMIT_REQUIRE_REDIS === "1");
}

function isAuthScope(key) {
    return key.startsWith("auth:");
}

function logBackendFailureOnce(reason) {
    if (loggedBackendFailure) return;
    loggedBackendFailure = true;
    console.error(`[rate-limit] No shared backend (Upstash or Postgres) available (${reason}); auth requests are refused until one recovers.`);
}

function getMemoryLimit(key, limit, windowMs, now, consume) {
    let window = memoryWindows.get(key);

    if (!window || window.resetAt <= now) {
        window = { count: 0, resetAt: now + windowMs };
    }

    if (!consume) {
        return {
            success: window.count < limit,
            limit,
            remaining: Math.max(0, limit - window.count),
            resetAt: window.resetAt,
        };
    }

    window.count += 1;
    memoryWindows.set(key, window);

    if (memoryWindows.size > 1000) {
        for (const [entryKey, entry] of memoryWindows) {
            if (entry.resetAt <= now) memoryWindows.delete(entryKey);
        }
        while (memoryWindows.size > 1000) {
            memoryWindows.delete(memoryWindows.keys().next().value);
        }
    }

    return {
        success: window.count <= limit,
        limit,
        remaining: Math.max(0, limit - window.count),
        resetAt: window.resetAt,
    };
}

async function getRedisLimit(key, limit, windowMs, now, consume) {
    const url = process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, "");
    const command = consume
        ? ["EVAL", FIXED_WINDOW_SCRIPT, "1", `ratelimit:${key}`, String(windowMs)]
        : ["EVAL", PEEK_SCRIPT, "1", `ratelimit:${key}`];
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
    });

    if (!response.ok) throw new Error("Rate limit backend unavailable");

    const payload = await response.json();
    const [count, ttl] = payload.result || [];
    if (!Number.isFinite(Number(count)) || !Number.isFinite(Number(ttl))) {
        throw new Error("Invalid rate limit backend response");
    }

    return {
        success: consume ? Number(count) <= limit : Number(count) < limit,
        limit,
        remaining: Math.max(0, limit - Number(count)),
        resetAt: now + (Number(ttl) > 0 ? Number(ttl) : windowMs),
    };
}

function windowResult({ count, windowStart }, limit, windowMs, now, consume) {
    const used = Number(count);
    if (!Number.isFinite(used)) throw new Error("Invalid rate limit row");
    const start = windowStart instanceof Date ? windowStart.getTime() : Date.parse(windowStart);
    return {
        success: consume ? used <= limit : used < limit,
        limit,
        remaining: Math.max(0, limit - used),
        resetAt: Number.isFinite(start) ? start + windowMs : now + windowMs,
    };
}

/**
 * Postgres fixed window in the "RateLimit" table: one atomic upsert per hit, so concurrent
 * serverless instances share the count. Times use the database clock (UTC) only.
 */
async function getPostgresLimit(key, limit, windowMs, now, consume) {
    if (!consume) {
        const rows = await prisma.$queryRaw`
            SELECT "count", "windowStart"
            FROM "RateLimit"
            WHERE "key" = ${key}
              AND "windowStart" > (now() AT TIME ZONE 'UTC') - (${windowMs}::double precision * interval '1 millisecond')`;
        return windowResult(rows[0] ?? { count: 0, windowStart: null }, limit, windowMs, now, false);
    }

    const rows = await prisma.$queryRaw`
        INSERT INTO "RateLimit" ("key", "count", "windowStart")
        VALUES (${key}, 1, now() AT TIME ZONE 'UTC')
        ON CONFLICT ("key") DO UPDATE SET
            "count" = CASE
                WHEN "RateLimit"."windowStart" <= (now() AT TIME ZONE 'UTC') - (${windowMs}::double precision * interval '1 millisecond')
                THEN 1
                ELSE "RateLimit"."count" + 1
            END,
            "windowStart" = CASE
                WHEN "RateLimit"."windowStart" <= (now() AT TIME ZONE 'UTC') - (${windowMs}::double precision * interval '1 millisecond')
                THEN now() AT TIME ZONE 'UTC'
                ELSE "RateLimit"."windowStart"
            END
        RETURNING "count", "windowStart"`;
    if (!rows?.[0]) throw new Error("Rate limit upsert returned no row");

    if (Math.random() < POSTGRES_CLEANUP_CHANCE) {
        // Opportunistic pruning of long-expired windows; failures here never affect the result.
        await prisma.$executeRaw`
            DELETE FROM "RateLimit"
            WHERE "windowStart" < (now() AT TIME ZONE 'UTC') - (${POSTGRES_RETENTION_MS}::double precision * interval '1 millisecond')`
            .catch(() => {});
    }
    return windowResult(rows[0], limit, windowMs, now, true);
}

/**
 * Fixed-window rate limiter.
 *
 * Backends, in order: Upstash Redis over REST when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set. Without Upstash, or when it errors, `auth:*` scopes use the
 * shared Postgres "RateLimit" table, because a per-instance memory window gives no real
 * protection against credential stuffing across serverless instances. Other scopes use a
 * per-process memory map.
 *
 * If an `auth:*` scope cannot reach Redis or Postgres: in production (NODE_ENV=production on
 * Vercel, or RATE_LIMIT_REQUIRE_REDIS=1) it fails closed and reports `success: false`; elsewhere
 * it falls back to memory.
 *
 * With `consume: false` the call only reports whether the next hit would still be allowed.
 * @returns {Promise<{ success: boolean, limit: number, remaining: number, resetAt: number }>}
 */
export async function rateLimit(key, { limit, windowMs, consume = true }) {
    if (!key || !Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
        throw new TypeError("rateLimit requires a key, a positive integer limit, and a positive windowMs");
    }

    const now = Date.now();

    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
            return await getRedisLimit(key, limit, windowMs, now, consume);
        } catch {
            // Fall through: auth scopes try Postgres next, others use the per-instance limiter.
        }
    }

    if (isAuthScope(key)) {
        try {
            return await getPostgresLimit(key, limit, windowMs, now, consume);
        } catch (error) {
            if (requiresSharedBackend()) {
                logBackendFailureOnce(error?.message || "Postgres rate limit failed");
                return { success: false, limit, remaining: 0, resetAt: now + windowMs, unavailable: true };
            }
        }
    }
    return getMemoryLimit(key, limit, windowMs, now, consume);
}
