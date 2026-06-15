'use client';

import { getTeamColor } from '@/lib/f1api';
import { getHighQualityPhoto } from '@/lib/photos';
import Link from 'next/link';
import styles from './DriverCard.module.css';
import FavoriteButton from './FavoriteButton';

export default function DriverCard({ driver }) {
    const teamColor = getTeamColor(driver.team_name);

    const photoUrl = getHighQualityPhoto(driver.headshot_url);

    const handleImageError = (e) => {
        // Fallback to original URL if high-quality fails
        if (driver.headshot_url && e.target.src !== driver.headshot_url) {
            e.target.src = driver.headshot_url;
        } else {
            // Hide broken image and show placeholder
            e.target.style.display = 'none';
            const placeholder = e.target.parentNode.querySelector('[data-placeholder]');
            if (placeholder) {
                placeholder.style.display = 'flex';
            }
        }
    };

    return (
        <Link href={`/driver/${driver.driver_number}`} className={styles.cardLink}>
            <div
                className={styles.card}
                style={{ '--team-color': teamColor }}
            >
                {/* Team Color Bar */}
                <div className={styles.colorBar}></div>

                <FavoriteButton driverNumber={driver.driver_number} />

                {/* Driver Photo */}
                <div className={styles.photoContainer}>
                    {photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={photoUrl}
                            alt={`${driver.first_name} ${driver.last_name}`}
                            className={styles.photo}
                            loading="lazy"
                            onError={handleImageError}
                        />
                    )}
                    <div
                        className={styles.photoPlaceholder}
                        data-placeholder
                        style={{ display: photoUrl ? 'none' : 'flex' }}
                    >
                        <span className={styles.photoNumber}>{driver.driver_number}</span>
                    </div>
                </div>

                {/* Driver Info */}
                <div className={styles.info}>
                    <div className={styles.number}>{driver.driver_number}</div>
                    <div className={styles.name}>
                        <span className={styles.firstName}>{driver.first_name}</span>
                        <span className={styles.lastName}>{driver.last_name}</span>
                    </div>
                    <div className={styles.team}>{driver.team_name}</div>
                    <div className={styles.country}>
                        <span className={styles.countryCode}>{driver.country_code}</span>
                    </div>
                </div>

                {/* View Profile Hint */}
                <div className={styles.viewHint}>
                    View Profile →
                </div>
            </div>
        </Link>
    );
}
