import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getChampions } from '@/lib/f1/history';
import { getGrid } from '@/lib/f1/drivers';
import {
    constructorChampionshipYears,
    currentGridDrivers,
    getConstructor,
    getConstructorRecord,
    getConstructorStandings,
} from '@/lib/f1/standings';
import { getTeams } from '@/lib/f1/teams';
import { getSeasonYear } from '@/lib/f1/year';
import { jsonLdScript } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';
import styles from './page.module.css';

async function loadTeam(params) {
    const { id } = await params;
    const info = await getConstructor(id);
    if (!info) notFound();
    const year = getSeasonYear();
    const [teams, grid] = await Promise.all([getTeams(year), getGrid(year)]);
    const team = teams.find((item) => item.constructorId === info.constructorId) || null;
    const current = team ? { ...team, drivers: currentGridDrivers(team, grid) } : null;
    return { id: info.constructorId, info, year, current, name: current?.name || info.name };
}

export async function generateMetadata({ params }) {
    await connection();
    const { id, info, name, current } = await loadTeam(params);
    const path = `/team/${encodeURIComponent(id)}`;
    const title = `${name}: F1 Team Drivers, Standings and History`;
    const description = current
        ? `${name} in Formula 1: current drivers, championship position, race wins and titles.`
        : `${name}${info.nationality ? ` (${info.nationality})` : ''} in Formula 1: race wins, championships and seasons entered.`;
    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: { title, description, url: path },
    };
}

function driverHref(driver) {
    const key = driver.racingNumber ?? driver.number ?? driver.driverId;
    return key == null ? null : `/driver/${encodeURIComponent(key)}`;
}

export default async function TeamDetailPage({ params }) {
    await connection();
    const { id, info, year, current, name } = await loadTeam(params);
    const [record, champions, constructorStandings] = await Promise.all([
        getConstructorRecord(id),
        getChampions(),
        getConstructorStandings(year),
    ]);
    const titleYears = constructorChampionshipYears(champions, id);
    const standing = constructorStandings.standings.find((row) => row.team.id === id) || null;
    const drivers = current?.drivers || [];

    const teamJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SportsTeam',
        name,
        sport: 'Formula 1',
        url: `${SITE_URL}/team/${encodeURIComponent(id)}`,
        ...(info.url ? { sameAs: [info.url] } : {}),
        ...(drivers.length > 0 ? {
            athlete: drivers.map((driver) => ({
                '@type': 'Person',
                name: driver.fullName || `${driver.firstName} ${driver.lastName}`.trim(),
                ...(driverHref(driver) ? { url: `${SITE_URL}${driverHref(driver)}` } : {}),
            })),
        } : {}),
    };

    return (
        <div className={styles.teamDetail} style={current ? { '--team-color': current.color } : undefined}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(teamJsonLd) }} />

            <div className={styles.hero}>
                <div className={styles.heroBackground} aria-hidden="true"></div>
                <div className={styles.heroContent}>
                    <Link href="/teams" className={styles.backLink}>All teams</Link>
                    <span className={styles.colorStripe} aria-hidden="true"></span>
                    <h1>{name}</h1>
                    {info.nationality && <p className={styles.nationality}>{info.nationality}</p>}
                </div>
            </div>

            {standing && (
                <section className={styles.statsSection} aria-labelledby="season-heading">
                    <div className="container">
                        <h2 id="season-heading" className={styles.sectionTitle}>
                            <Link href="/standings">{year} season</Link>
                        </h2>
                        <dl className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <dt className={styles.statLabel}>Position</dt>
                                <dd className={styles.statValue}>P{standing.position ?? standing.positionText}</dd>
                            </div>
                            <div className={styles.statCard}>
                                <dt className={styles.statLabel}>Points</dt>
                                <dd className={styles.statValue}>{standing.points}</dd>
                            </div>
                            <div className={styles.statCard}>
                                <dt className={styles.statLabel}>Wins</dt>
                                <dd className={styles.statValue}>{standing.wins}</dd>
                            </div>
                        </dl>
                    </div>
                </section>
            )}

            {drivers.length > 0 && (
                <section className={styles.section} aria-labelledby="drivers-heading">
                    <div className="container">
                        <h2 id="drivers-heading" className={styles.sectionTitle}>{year} drivers</h2>
                        <ul className={styles.driversGrid}>
                            {drivers.map((driver) => {
                                const href = driverHref(driver);
                                const number = driver.racingNumber ?? driver.number;
                                const content = (
                                    <>
                                        <span className={styles.driverNumber}>{number ?? ''}</span>
                                        <span className={styles.driverName}>
                                            {driver.firstName} <strong>{driver.lastName}</strong>
                                        </span>
                                    </>
                                );
                                return (
                                    <li key={driver.driverId || number}>
                                        {href
                                            ? <Link href={href} className={styles.driverCard}>{content}</Link>
                                            : <span className={styles.driverCard}>{content}</span>}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </section>
            )}

            <section className={styles.section} aria-labelledby="history-heading">
                <div className="container">
                    <h2 id="history-heading" className={styles.sectionTitle}>All-time record</h2>
                    <dl className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <dt className={styles.statLabel}>Constructors&apos; titles</dt>
                            <dd className={styles.statValue}>{titleYears.length}</dd>
                        </div>
                        <div className={styles.statCard}>
                            <dt className={styles.statLabel}>Race wins</dt>
                            <dd className={styles.statValue}>{record.wins}</dd>
                        </div>
                        <div className={styles.statCard}>
                            <dt className={styles.statLabel}>Grands Prix</dt>
                            <dd className={styles.statValue}>{record.races}</dd>
                        </div>
                        <div className={styles.statCard}>
                            <dt className={styles.statLabel}>Seasons</dt>
                            <dd className={styles.statValue}>{record.seasons}</dd>
                        </div>
                    </dl>
                    {titleYears.length > 0 && (
                        <>
                            <h3 className={styles.subTitle}>Championship seasons</h3>
                            <ul className={styles.yearList}>
                                {titleYears.map((titleYear) => (
                                    <li key={titleYear}>
                                        <Link href={`/history?year=${titleYear}`}>{titleYear}</Link>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
