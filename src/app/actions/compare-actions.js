'use server';

import { headers } from 'next/headers';
import { compareDrivers, isValidDriverId } from '@/lib/f1/compare';
import { searchDrivers } from '@/lib/f1/drivers';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

const WINDOW_MS = 60_000;
const COMPARE_LIMIT = 20;
const SEARCH_LIMIT = 60;
const MAX_QUERY_LENGTH = 40;
const MAX_SEARCH_RESULTS = 12;

async function allowed(scope, limit) {
    const ip = getClientIp(await headers());
    const result = await rateLimit(`${scope}:${ip}`, { limit, windowMs: WINDOW_MS });
    return result.success;
}

/** Search every driver since 1950 by name, code or nationality. */
export async function searchDriversAction(query) {
    if (typeof query !== 'string') return { ok: false, error: 'invalid' };
    const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
    if (trimmed.length < 2) return { ok: true, drivers: [] };
    if (!(await allowed('driver-search', SEARCH_LIMIT))) return { ok: false, error: 'rate-limited' };
    try {
        const drivers = await searchDrivers(trimmed, MAX_SEARCH_RESULTS);
        return {
            ok: true,
            drivers: drivers.map((driver) => ({
                driverId: driver.driverId,
                fullName: driver.fullName,
                code: driver.code,
                nationality: driver.nationality,
            })),
        };
    } catch (error) {
        console.error('[searchDriversAction]', error);
        return { ok: false, error: 'unavailable' };
    }
}

/** Career totals and head-to-head for two drivers from any era. */
export async function compareDriversAction(idA, idB) {
    if (!isValidDriverId(idA) || !isValidDriverId(idB) || idA === idB) {
        return { ok: false, error: 'invalid' };
    }
    if (!(await allowed('compare', COMPARE_LIMIT))) return { ok: false, error: 'rate-limited' };
    try {
        const comparison = await compareDrivers(idA, idB);
        if (!comparison) return { ok: false, error: 'not-found' };
        return { ok: true, comparison };
    } catch (error) {
        console.error('[compareDriversAction]', error);
        return { ok: false, error: 'unavailable' };
    }
}
