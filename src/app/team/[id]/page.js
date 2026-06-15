import {
    getConstructorDrivers,
    getConstructorInfo,
    getConstructorSeasonResults,
    getConstructorStandings,
    getTeamColor,
} from '@/lib/f1api';
import Link from 'next/link';
import styles from './page.module.css';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
    const { id } = await params;
    const info = await getConstructorInfo(id);
    if (!info) return { title: 'Team Not Found · Pit Lane Hub' };
    return {
        title: `${info.name} · Pit Lane Hub`,
        description: `${info.name} (${info.nationality}) — current Formula 1 standing, drivers and season results.`,
    };
}

export default async function TeamDetailPage({ params }) {
    const { id } = await params;

    const [info, standings, drivers, seasonResults] = await Promise.all([
        getConstructorInfo(id),
        getConstructorStandings(),
        getConstructorDrivers(id),
        getConstructorSeasonResults(id),
    ]);

    if (!info) {
        return (
            <div className={styles.teamDetail}>
                <div className={styles.notFound}>
                    <h1>Team Not Found</h1>
                    <Link href="/teams" className={styles.backBtn}>← Back to Teams</Link>
                </div>
            </div>
        );
    }

    const teamColor = getTeamColor(info.name);
    const standing = standings.find((s) => s.team.id === id) || null;
    const recentResults = [...seasonResults].reverse().slice(0, 8);

    const teamJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SportsTeam',
        name: info.name,
        sport: 'Formula 1',
        url: info.url,
    };

    return (
        <div className={styles.teamDetail} style={{ '--team-color': teamColor }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }}
            />

            {/* Hero */}
            <div className={styles.hero}>
                <div className={styles.heroBackground}></div>
                <div className={styles.heroContent}>
                    <Link href="/teams" className={styles.backLink}>← Back to Teams</Link>
                    <span className={styles.colorStripe}></span>
                    <h1>{info.name}</h1>
                    <p className={styles.nationality}>🏳️ {info.nationality}</p>
                </div>
            </div>

            {/* Standing stats */}
            {standing && (
                <div className={styles.statsSection}>
                    <div className="container">
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>P{standing.position}</span>
                                <span className={styles.statLabel}>Championship</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>{standing.points}</span>
                                <span className={styles.statLabel}>Points</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>{standing.wins}</span>
                                <span className={styles.statLabel}>Wins</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Drivers */}
            {drivers.length > 0 && (
                <div className={styles.section}>
                    <div className="container">
                        <h2 className={styles.sectionTitle}>Drivers</h2>
                        <div className={styles.driversGrid}>
                            {drivers.map((d) => {
                                const content = (
                                    <>
                                        <span className={styles.driverNumber}>{d.number ?? '—'}</span>
                                        <span className={styles.driverName}>
                                            {d.firstName} <strong>{d.lastName}</strong>
                                        </span>
                                    </>
                                );
                                return d.number ? (
                                    <Link key={d.id} href={`/driver/${d.number}`} className={styles.driverCard}>
                                        {content}
                                    </Link>
                                ) : (
                                    <div key={d.id} className={styles.driverCard}>{content}</div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent results */}
            {recentResults.length > 0 && (
                <div className={styles.section}>
                    <div className="container">
                        <h2 className={styles.sectionTitle}>Recent Results</h2>
                        <div className={styles.resultsTable}>
                            <div className={`${styles.resultRow} ${styles.resultHead}`}>
                                <span>Round</span>
                                <span>Grand Prix</span>
                                <span>Finishes</span>
                                <span>Pts</span>
                            </div>
                            {recentResults.map((r) => (
                                <div key={r.round} className={styles.resultRow}>
                                    <span className={styles.resultRound}>{r.round}</span>
                                    <span className={styles.resultRace}>{r.raceName}</span>
                                    <span className={styles.resultFinishes}>
                                        {r.cars
                                            .map((c) => `${c.code} ${c.position ? `P${c.position}` : 'DNF'}`)
                                            .join(' · ')}
                                    </span>
                                    <span className={styles.resultPts}>{r.points}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
