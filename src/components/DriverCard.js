import { getTeamColor } from '@/lib/f1api';
import styles from './DriverCard.module.css';

export default function DriverCard({ driver }) {
    const teamColor = getTeamColor(driver.team_name);

    return (
        <div
            className={styles.card}
            style={{ '--team-color': teamColor }}
        >
            {/* Number */}
            <div className={styles.number}>
                {driver.driver_number}
            </div>

            {/* Avatar Placeholder */}
            <div className={styles.avatar}>
                <span className={styles.avatarInitials}>
                    {driver.name_acronym || driver.first_name?.[0]}
                </span>
            </div>

            {/* Content */}
            <div className={styles.content}>
                <h3 className={styles.name}>
                    <span className={styles.firstName}>{driver.first_name}</span>
                    <span className={styles.lastName}>{driver.last_name}</span>
                </h3>
                <div className={styles.team} style={{ color: teamColor }}>
                    {driver.team_name}
                </div>
            </div>

            {/* Country Flag Placeholder */}
            <div className={styles.country}>
                {driver.country_code}
            </div>

            {/* Team Color Bar */}
            <div
                className={styles.colorBar}
                style={{ background: teamColor }}
            />
        </div>
    );
}
