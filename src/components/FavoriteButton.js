'use client';

import { useFavorites } from '@/lib/useFavorites';
import styles from './FavoriteButton.module.css';

export default function FavoriteButton({ driverNumber, className = '' }) {
    const { isFavorite, toggle } = useFavorites();
    const active = isFavorite(driverNumber);

    return (
        <button
            type="button"
            className={`${styles.fav} ${active ? styles.active : ''} ${className}`}
            aria-pressed={active}
            aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => {
                // Prevent the surrounding card link from navigating.
                e.preventDefault();
                e.stopPropagation();
                toggle(driverNumber);
            }}
        >
            {active ? '★' : '☆'}
        </button>
    );
}
