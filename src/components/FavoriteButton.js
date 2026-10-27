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
            <span aria-hidden="true">{active ? '★' : '☆'}</span>
        </button>
    );
}
