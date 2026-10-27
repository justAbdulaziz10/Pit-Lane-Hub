'use client';

import { useFavorites } from '@/lib/useFavorites';
import styles from './FavoriteButton.module.css';

export default function FavoriteButton({ driverNumber, driverName = 'driver', className = '' }) {
    const { isFavorite, toggle } = useFavorites();
    const active = isFavorite(driverNumber);

    return (
        <button
            type="button"
            className={`${styles.fav} ${active ? styles.active : ''} ${className}`}
            aria-pressed={active}
            aria-label={`Favourite ${driverName}`}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(driverNumber);
            }}
        >
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path
                    d="M10 2.5l2.32 4.7 5.18.75-3.75 3.66.88 5.16L10 14.33l-4.63 2.44.88-5.16L2.5 7.95l5.18-.75z"
                    fill={active ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
            </svg>
        </button>
    );
}
