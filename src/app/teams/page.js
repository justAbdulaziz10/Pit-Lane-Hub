import Link from 'next/link';
import { connection } from 'next/server';
import { getGrid } from '@/lib/f1/drivers';
import { currentGridDrivers, getConstructorStandings } from '@/lib/f1/standings';
import { getTeams } from '@/lib/f1/teams';
import { getSeasonYear } from '@/lib/f1/year';
import { getHighQualityPhoto } from '@/lib/photos';
import styles from './page.module.css';

// Metadata lives in ./layout.js.

function DriverRow({ driver }) {
    const photo = getHighQualityPhoto(driver.headshot);
    const number = driver.racingNumber ?? driver.number;
    const key = number ?? driver.driverId;
    const content = (
        <>
            {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={driver.fullName || driver.lastName} className={styles.driverPhoto} loading="lazy" />
            ) : (
                <span className={styles.driverPhotoPlaceholder} aria-hidden="true">{number ?? ''}</span>
            )}
            <span className={styles.driverDetails}>
                <span className={styles.driverName}>
                    {driver.firstName} <strong>{driver.lastName}</strong>
                </span>
                {number != null && <span className={styles.driverNumber}>#{number}</span>}
            </span>
        </>
    );
    if (key == null) return <li className={styles.driverRow}>{content}</li>;
    return (
        <li>
            <Link href={`/driver/${encodeURIComponent(key)}`} className={styles.driverRow}>{content}</Link>
        </li>
    );
}

export default async function TeamsPage() {
    await connection();
    const year = getSeasonYear();
    const [teams, constructorStandings, grid] = await Promise.all([
        getTeams(year),
        getConstructorStandings(year),
        getGrid(year),
    ]);
    const standingById = new Map(constructorStandings.standings.map((row) => [row.team.id, row]));
    const ordered = [...teams].sort((a, b) => {
        const posA = standingById.get(a.constructorId)?.position ?? Infinity;
        const posB = standingById.get(b.constructorId)?.position ?? Infinity;
        return posA - posB || a.name.localeCompare(b.name);
    });

    return (
        <div className={styles.teams}>
            <header className={styles.header}>
                <div className="container">
                    <h1>{year} Teams</h1>
                    {constructorStandings.round && <p>Constructors&apos; standings after round {constructorStandings.round}</p>}
                </div>
            </header>

            <div className={styles.content}>
                <div className="container">
                    {ordered.length === 0 ? (
                        <p className={styles.empty}>No {year} teams announced yet.</p>
                    ) : (
                        <ul className={styles.teamsGrid} role="list">
                            {ordered.map((team) => {
                                const standing = standingById.get(team.constructorId);
                                return (
                                    <li key={team.constructorId} className={styles.teamCard} style={{ '--team-color': team.color }}>
                                        <div className={styles.teamColorBar} aria-hidden="true"></div>
                                        {standing && (
                                            <div className={styles.teamHeader}>
                                                <span className={styles.teamPosition}>P{standing.position ?? standing.positionText}</span>
                                                <span className={styles.teamPoints}>
                                                    <span className={styles.pointsValue}>{standing.points}</span>
                                                    <span className={styles.pointsLabel}>Pts</span>
                                                </span>
                                            </div>
                                        )}
                                        <h2 className={styles.teamName}>
                                            <Link href={`/team/${encodeURIComponent(team.constructorId)}`}>{team.name}</Link>
                                        </h2>
                                        <ul className={styles.driversList} aria-label={`${team.name} drivers`}>
                                            {currentGridDrivers(team, grid).map((driver) => (
                                                <DriverRow key={driver.driverId || driver.racingNumber} driver={driver} />
                                            ))}
                                        </ul>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
