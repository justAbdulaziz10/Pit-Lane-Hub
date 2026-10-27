import { unstable_cache } from 'next/cache';

export const JOLPICA_BASE_URL = 'https://api.jolpi.ca/ergast/f1';
export const OPENF1_BASE_URL = 'https://api.openf1.org/v1';

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
    constructor(message, { source, url, status = null, cause = null } = {}) {
        super(message, { cause });
        this.name = 'UpstreamError';
        this.source = source || 'upstream';
        this.url = url;
        this.status = status;
    }
}

const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);
const delay = (ms) => new Promise((resolve) => nativeSetTimeout(resolve, ms));
let jolpicaQueue = Promise.resolve();
let lastJolpicaStart = 0;

async function waitForJolpicaSlot() {
    let release;
    const previous = jolpicaQueue;
    jolpicaQueue = new Promise((resolve) => { release = resolve; });
    await previous;
    const wait = Math.max(0, lastJolpicaStart + 260 - performance.now());
    if (wait > 0) await delay(wait);
    lastJolpicaStart = performance.now();
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

/** Fetch JSON with a timeout and bounded retries for throttling and server errors. */
export async function fetchJson(url, {
    source = 'upstream',
    timeoutMs = 10000,
    retries = 3,
    fetchOptions = {},
} = {}) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timeout = nativeSetTimeout(() => controller.abort(), timeoutMs);
        let response;
        try {
            response = await fetch(url, { ...fetchOptions, signal: controller.signal });
            if ((response.status === 429 || response.status >= 500) && attempt < retries) {
                await delay(retryDelay(response, attempt));
                continue;
            }
            if (!response.ok) {
                throw new UpstreamError(`${source} returned HTTP ${response.status}`, {
                    source,
                    url,
                    status: response.status,
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
    return waitForJolpicaSlot().then(() => fetchJson(url.toString(), {
        source: 'Jolpica',
        fetchOptions: { next: { revalidate, tags } },
    }));
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

export async function getOpenF1Token() {
    const username = process.env.OPENF1_USERNAME;
    const password = process.env.OPENF1_PASSWORD;
    if (!username || !password) return null;

    const body = new URLSearchParams({ username, password });
    const tokenPayload = await fetchJson('https://api.openf1.org/token', {
        source: 'OpenF1 authentication',
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
    return token;
}

export async function fetchOpenF1Json(path, { token, timeoutMs = 8000 } = {}) {
    const url = path.startsWith('http') ? path : `${OPENF1_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    try {
        return await fetchJson(url, {
            source: 'OpenF1',
            timeoutMs,
            fetchOptions: { headers, cache: 'no-store' },
        });
    } catch (error) {
        // OpenF1 answers 404 "No results found." for an empty query result.
        if (error instanceof UpstreamError && error.status === 404) return [];
        throw error;
    }
}
