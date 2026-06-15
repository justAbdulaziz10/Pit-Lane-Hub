'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

const KEY = 'plh:favoriteDrivers';
const EVENT = 'plh:favorites-changed';

/**
 * Pure toggle: add the value if absent, remove it if present.
 * @param {Array<number>} list
 * @param {number} value
 * @returns {Array<number>}
 */
export function toggleValue(list, value) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function subscribe(callback) {
    window.addEventListener(EVENT, callback);
    window.addEventListener('storage', callback);
    return () => {
        window.removeEventListener(EVENT, callback);
        window.removeEventListener('storage', callback);
    };
}

// Return the raw string so the snapshot identity is stable between renders
// (required by useSyncExternalStore to avoid render loops).
function getSnapshot() {
    try {
        return localStorage.getItem(KEY) || '[]';
    } catch {
        return '[]';
    }
}

function getServerSnapshot() {
    return '[]';
}

/**
 * Client hook for favorite driver numbers, persisted to localStorage and kept
 * in sync across components (and browser tabs) via an external store.
 */
export function useFavorites() {
    const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const favorites = useMemo(() => {
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }, [raw]);

    const toggle = useCallback((driverNumber) => {
        const next = toggleValue(getSnapshotArray(), driverNumber);
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            // ignore storage failures (private mode, quota)
        }
        window.dispatchEvent(new Event(EVENT));
    }, []);

    const isFavorite = useCallback((driverNumber) => favorites.includes(driverNumber), [favorites]);

    return { favorites, isFavorite, toggle };
}

function getSnapshotArray() {
    try {
        return JSON.parse(getSnapshot());
    } catch {
        return [];
    }
}
