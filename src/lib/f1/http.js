import { unstable_cache } from 'next/cache';
import { SITE_URL } from '../site';

export const JOLPICA_BASE_URL = 'https://api.jolpi.ca/ergast/f1';
export const OPENF1_BASE_URL = 'https://api.openf1.org/v1';
export const F1_USER_AGENT = `PitLaneHub/1.0 (+${SITE_URL})`;

export const F1_CACHE_TAGS = Object.freeze({
    calendar: 'f1-calendar',
    circuits: 'f1-circuits',
    drivers: 'f1-drivers',
    grid: 'f1-grid',
    teams: 'f1-teams',
    standings: 'f1-standings',
    results: 'f1-results',
    career: 'f1-career',
    champions: 'f1-champions',
});

export class UpstreamError extends Error {
    constructor(message, { source, url, status = null, cause = null, retryAfterMs } = {}) {
        super(message, { cause });
        this.name = 'UpstreamError';
        this.source = source || 'upstream';
        this.url = url;
        this.status = status;
        if (retryAfterMs != null) this.retryAfterMs = retryAfterMs;
    }
}

const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);
const delay = (ms) => new Promise((resolve) => nativeSetTimeout(resolve, ms));
// Next bundles each route separately, so module state is per bundle. Keep the
// pacing queue on globalThis so every route in the process shares one budget.
const jolpicaPacer = globalThis.__pitLaneJolpicaPacer
    ??= { queue: Promise.resolve(), lastStart: 0, blockedUntil: 0 };

async function waitForJolpicaSlot() {
    let release;
    const previous = jolpicaPacer.queue;
    jolpicaPacer.queue = new Promise((resolve) => { release = resolve; });
    await previous;
    const wait = Math.max(0, jolpicaPacer.lastStart + 260 - performance.now());
    if (wait > 0) await delay(wait);
    jolpicaPacer.lastStart = performance.now();
    release();
}

function retryDelay(response, attempt) {
    const retryAfter = response?.headers?.get?.('retry-after');
    if (retryAfter) {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds)) return Math.min(15000, Math.max(0, seconds * 1000));
        const date = Date.parse(retryAfter);
        if (Number.isFinite(date)) return Math.min(15000, Math.max(0, date - Date.now()));
    }
    // Rate limiting needs a longer pause than a transient server error.
    const base = response?.status === 429 ? 1000 : 250;
    return Math.min(base * (2 ** attempt), 8000);
}

// Jolpica's burst limit clears within a second; its hourly quota does not.
// Wait out at most one short throttle per request and fail fast otherwise, so a
// page falls back to its last cached data instead of hanging on retries.
const MAX_THROTTLE_WAIT_MS = 2000;

/** Fetch JSON with a timeout and bounded retries for throttling and server errors. */
export async function fetchJson(url, {
    source = 'upstream',
    timeoutMs = 10000,
    retries = 3,
    fetchOptions = {},
} = {}) {
    let throttled = false;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timeout = nativeSetTimeout(() => controller.abort(), timeoutMs);
        let response;
        try {
            const headers = {
                ...(fetchOptions.headers || {}),
                'User-Agent': F1_USER_AGENT,
            };
            response = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
            if (response.status === 429 && attempt < retries && !throttled) {
                const wait = retryDelay(response, 0);
                if (wait <= MAX_THROTTLE_WAIT_MS) {
                    throttled = true;
                    await delay(wait);
                    continue;
                }
            }
            if (response.status >= 500 && attempt < retries) {
                await delay(retryDelay(response, attempt));
                continue;
            }
            if (!response.ok) {
                throw new UpstreamError(`${source} returned HTTP ${response.status}`, {
                    source,
                    url,
                    status: response.status,
                    retryAfterMs: response.status === 429 ? retryDelay(response, 0) : undefined,
                });
            }
            try {
                return await response.json();
            } catch (cause) {
                throw new UpstreamError(`${source} returned invalid JSON`, { source, url, cause });
            }
        } catch (error) {
            if (error instanceof UpstreamError) throw error;
            if (attempt < retries && !(error?.name === 'AbortError')) {
                await delay(250 * (2 ** attempt));
                continue;
            }
            const message = error?.name === 'AbortError'
                ? `${source} request timed out after ${timeoutMs}ms`
                : `${source} request failed`;
            throw new UpstreamError(message, { source, url, cause: error });
        } finally {
            clearTimeout(timeout);
        }
    }
    throw new UpstreamError(`${source} request failed`, { source, url });
}

function normalizePath(path) {
    return String(path).replace(/^\/+/, '').replace(/\.json$/, '');
}

/** Fetch a single Jolpica response. Jolpica accepts at most 100 rows per page. */
export function fetchJolpicaPage(path, {
    offset = 0,
    limit = 100,
    revalidate = 300,
    tags = [],
} = {}) {
    const url = new URL(`${JOLPICA_BASE_URL}/${normalizePath(path)}.json`);
    url.searchParams.set('limit', String(Math.min(100, Math.max(1, limit))));
    url.searchParams.set('offset', String(offset));
    const key = url.toString();

    // Concurrent cold misses for the same page share one upstream request, so a burst of
    // visitors costs one slot of Jolpica's hourly quota instead of one per visitor.
    const pending = jolpicaInFlight.get(key);
    if (pending) return pending;

    const request = (async () => {
        if (Date.now() < jolpicaPacer.blockedUntil) throw jolpicaBlockedError(key);
        await waitForJolpicaSlot();
        try {
            return await fetchJson(key, {
                source: 'Jolpica',
                fetchOptions: { next: { revalidate, tags } },
            });
        } catch (error) {
            // A long throttle means the quota is spent; stop calling until it resets instead of
            // extending the block. Pages keep serving their last good cached data meanwhile.
            if (error instanceof UpstreamError && error.status === 429) {
                jolpicaPacer.blockedUntil = Date.now() + Math.max(10000, error.retryAfterMs ?? 0);
            }
            throw error;
        }
    })().finally(() => jolpicaInFlight.delete(key));
    jolpicaInFlight.set(key, request);
    return request;
}

const jolpicaInFlight = globalThis.__pitLaneJolpicaInFlight
    || (globalThis.__pitLaneJolpicaInFlight = new Map());

function jolpicaBlockedError(url) {
    const retryAfterMs = Math.max(0, jolpicaPacer.blockedUntil - Date.now());
    return new UpstreamError('Jolpica returned HTTP 429', { source: 'Jolpica', url, status: 429, retryAfterMs });
}

/** Page a Jolpica collection using MRData.total and offset, capped at 100 rows. */
export async function fetchJolpicaPages(path, {
    select,
    revalidate = 86400,
    tags = [],
} = {}) {
    const rows = [];
    const limit = 100;
    let total = null;
    let offset = 0;

    while (total === null || offset < total) {
        const payload = await fetchJolpicaPage(path, { offset, limit, revalidate, tags });
        const mrData = payload?.MRData;
        const pageTotal = Number(mrData?.total);
        const pageRows = select ? select(mrData) : mrData?.rows;
        if (!Number.isFinite(pageTotal) || !Array.isArray(pageRows)) {
            throw new UpstreamError('Jolpica returned an invalid paged response', {
                source: 'Jolpica',
                url: path,
            });
        }
        if (total === null) total = pageTotal;
        if (pageRows.length === 0 && offset < total) {
            throw new UpstreamError('Jolpica pagination ended before MRData.total', {
                source: 'Jolpica',
                url: path,
            });
        }
        rows.push(...pageRows);
        offset += limit;
    }
    return rows.slice(0, total);
}

/** Return a Next data-cache wrapper. Thrown refresh failures are not cached. */
export function cacheF1Data(fn, keyParts, revalidate, tags) {
    return unstable_cache(fn, ['pit-lane-hub-f1-v1', ...keyParts], { revalidate, tags });
}

const OPENF1_TOKEN_CACHE = '__pitLaneOpenF1TokenCache';

function openF1TokenState() {
    return globalThis[OPENF1_TOKEN_CACHE] ||= { token: null, expiresAt: 0, refreshAt: 0, inFlight: null };
}

export function logOpenF1Failure(error) {
    const reason = error?.status != null
        ? `HTTP ${error.status}`
        : error?.message || 'request failed';
    console.warn(`OpenF1 request failed: ${reason}`);
    if (error && typeof error === 'object') error.openF1WarningLogged = true;
}

export async function getOpenF1Token() {
    const username = process.env.OPENF1_USERNAME;
    const password = process.env.OPENF1_PASSWORD;
    if (!username || !password) return null;

    const state = openF1TokenState();
    if (state.token && Date.now() < state.refreshAt) return state.token;
    if (state.inFlight) return state.inFlight;

    const body = new URLSearchParams({ username, password });
    const request = (async () => {
        try {
            const tokenPayload = await fetchJson('https://api.openf1.org/token', {
                source: 'OpenF1 authentication',
                timeoutMs: 5000,
                fetchOptions: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body,
                    cache: 'no-store',
                },
            });
            const token = tokenPayload?.access_token || tokenPayload?.token;
            if (!token) {
                throw new UpstreamError('OpenF1 authentication response did not include a token', {
                    source: 'OpenF1 authentication',
                    url: 'https://api.openf1.org/token',
                });
            }
            const reportedExpiry = Number(tokenPayload?.expires_in);
            const expiresInSeconds = Number.isFinite(reportedExpiry) && reportedExpiry > 0
                ? reportedExpiry
                : 3600;
            state.token = token;
            state.expiresAt = Date.now() + expiresInSeconds * 1000;
            state.refreshAt = Math.max(Date.now(), state.expiresAt - 300000);
            return token;
        } catch (error) {
            logOpenF1Failure(error);
            throw error;
        }
    })();
    state.inFlight = request;
    try {
        return await request;
    } finally {
        if (state.inFlight === request) state.inFlight = null;
    }
}

export async function fetchOpenF1Json(path, { token, timeoutMs = 5000 } = {}) {
    const url = path.startsWith('http') ? path : `${OPENF1_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
    let requestToken;
    try {
        requestToken = token ?? await getOpenF1Token();
        const request = (authToken) => fetchJson(url, {
            source: 'OpenF1',
            timeoutMs,
            fetchOptions: {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                cache: 'no-store',
            },
        });
        try {
            return await request(requestToken);
        } catch (error) {
            if (error instanceof UpstreamError && error.status === 401 && requestToken
                && process.env.OPENF1_USERNAME && process.env.OPENF1_PASSWORD) {
                const state = openF1TokenState();
                if (state.token === requestToken) {
                    state.token = null;
                    state.expiresAt = 0;
                    state.refreshAt = 0;
                }
                requestToken = await getOpenF1Token();
                return await request(requestToken);
            }
            throw error;
        }
    } catch (error) {
        // OpenF1 answers 404 "No results found." for an empty query result.
        if (error instanceof UpstreamError && error.status === 404 && error.source === 'OpenF1') return [];
        if (!error?.openF1WarningLogged) logOpenF1Failure(error);
        throw error;
    }
}
