const memoryWindows = new Map();

const FIXED_WINDOW_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return {count, redis.call("PTTL", KEYS[1])}
`;

/** Client IP from proxy headers (Vercel overwrites x-forwarded-for), or "unknown". */
export function getClientIp(headers) {
    const forwardedFor = headers.get("x-forwarded-for");
    const proxyIp = forwardedFor?.split(",")[0]?.trim();
    return proxyIp || headers.get("x-real-ip")?.trim() || "unknown";
}

function getMemoryLimit(key, limit, windowMs, now) {
    let window = memoryWindows.get(key);

    if (!window || window.resetAt <= now) {
        window = { count: 0, resetAt: now + windowMs };
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

async function getRedisLimit(key, limit, windowMs, now) {
    const url = process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, "");
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(["EVAL", FIXED_WINDOW_SCRIPT, "1", `ratelimit:${key}`, String(windowMs)]),
    });

    if (!response.ok) throw new Error("Rate limit backend unavailable");

    const payload = await response.json();
    const [count, ttl] = payload.result || [];
    if (!Number.isFinite(Number(count)) || !Number.isFinite(Number(ttl))) {
        throw new Error("Invalid rate limit backend response");
    }

    return {
        success: Number(count) <= limit,
        limit,
        remaining: Math.max(0, limit - Number(count)),
        resetAt: now + Math.max(0, Number(ttl)),
    };
}

/**
 * Fixed-window rate limiter. Uses Upstash Redis over REST when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set (shared across instances), else a per-process memory map.
 * @returns {Promise<{ success: boolean, limit: number, remaining: number, resetAt: number }>}
 */
export async function rateLimit(key, { limit, windowMs }) {
    if (!key || !Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
        throw new TypeError("rateLimit requires a key, a positive integer limit, and a positive windowMs");
    }

    const now = Date.now();
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
            return await getRedisLimit(key, limit, windowMs, now);
        } catch {
            // Degrade to the per-instance limiter rather than locking users out during a Redis outage.
        }
    }
    return getMemoryLimit(key, limit, windowMs, now);
}
