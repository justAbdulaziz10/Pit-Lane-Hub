'use client';

import DriverCard from '@/components/DriverCard';
import { useFavorites } from '@/lib/useFavorites';
import { useMemo } from 'react';

/**
 * Renders driver cards with favorited drivers pulled to the front (stable sort
 * preserves the original order within each group).
 */
export default function DriversGrid({ drivers, className }) {
    const { favorites } = useFavorites();

    const ordered = useMemo(() => {
        if (favorites.length === 0) return drivers;
        const fav = new Set(favorites);
        return [...drivers].sort(
            (a, b) => (fav.has(b.driver_number) ? 1 : 0) - (fav.has(a.driver_number) ? 1 : 0)
        );
    }, [drivers, favorites]);

    return (
        <div className={className}>
            {ordered.map((driver) => (
                <DriverCard key={driver.driver_number} driver={driver} />
            ))}
        </div>
    );
}
