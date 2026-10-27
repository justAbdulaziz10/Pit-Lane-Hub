'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './DriverCard.module.css';
import FavoriteButton from './FavoriteButton';

/**
 * One grid driver. Everything it shows, including the readable team colour,
 * arrives in the `driver` prop prepared on the server.
 */
export default function DriverCard({ driver }) {
    const sources = [driver.photo, driver.headshot].filter(Boolean);
    const [sourceIndex, setSourceIndex] = useState(0);
    const photoUrl = sources[sourceIndex] || null;

    return (
        <article className={styles.card} style={{ '--team-color': driver.colour }}>
            <div className={styles.colorBar} aria-hidden="true" />
            {driver.number != null ? (
                <FavoriteButton driverNumber={driver.number} driverName={driver.fullName} />
            ) : null}

            <div className={styles.photoContainer}>
                {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={photoUrl}
                        alt=""
                        className={styles.photo}
                        loading="lazy"
                        decoding="async"
                        onError={() => setSourceIndex((index) => index + 1)}
                    />
                ) : (
                    <div className={styles.photoPlaceholder} aria-hidden="true">
                        <span className={styles.photoCode}>{driver.code || driver.lastName.slice(0, 3).toUpperCase()}</span>
                    </div>
                )}
            </div>

            <div className={styles.info}>
                {driver.number != null ? <div className={styles.number}>{driver.number}</div> : null}
                <h3 className={styles.name}>
                    <Link href={driver.href} className={styles.cardLink}>
                        <span className={styles.firstName}>{driver.firstName}</span>
                        <span className={styles.lastName}>{driver.lastName}</span>
                    </Link>
                </h3>
                <div className={styles.team}>{driver.team}</div>
                {driver.nationality ? (
                    <div className={styles.country}>
                        {driver.flag ? <span aria-hidden="true">{driver.flag}</span> : null}
                        <span className={styles.countryCode}>{driver.nationality}</span>
                    </div>
                ) : null}
            </div>
        </article>
    );
}
