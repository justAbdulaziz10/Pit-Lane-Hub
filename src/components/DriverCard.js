'use client';

import { getTeamColor } from '@/lib/f1api';
import styles from './DriverCard.module.css';

export default function DriverCard({ driver }) {
    const teamColor = getTeamColor(driver.team_name);

    return (
        <div
            className={styles.card}
            style={{ '--team-color': teamColor }}
        >
            {/* Team Color Bar */}
            <div className={styles.colorBar}></div>

            {/* Driver Photo */}
            <div className={styles.photoContainer}>
                {driver.headshot_url ? (
                    <img
                        src={driver.headshot_url}
                        alt={`${driver.first_name} ${driver.last_name}`}
                        className={styles.photo}
                    />
                ) : (
                    <div className={styles.photoPlaceholder}>
                        <span className={styles.photoNumber}>{driver.driver_number}</span>
                    </div>
                )}
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
        </div>
    );
}
