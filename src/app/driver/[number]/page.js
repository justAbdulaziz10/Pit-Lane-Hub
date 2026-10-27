import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { connection } from 'next/server';
import { careerSummary, FASTEST_LAP_DATA_FROM, fastestLapCoverage, getAllTimeDriver, getCareerStats, getDriverResults } from '@/lib/f1/compare';
import { getSeasonSummary } from '@/lib/f1/history';
import { getSeasonYear } from '@/lib/f1/year';
import { jsonLdScript } from '@/lib/jsonld';
import { getHighQualityPhoto } from '@/lib/photos';
import { SITE_URL } from '@/lib/site';
import { finishLabel, getDriverSeasonResults, resolveDriverRoute } from './driver-data';
import styles from './page.module.css';

const RECENT_RESULTS = 10;

function describe(driver) {
    if (driver.current) {
        const number = driver.racingNumber ? `#${driver.racingNumber} ` : '';
        return `${driver.fullName}, ${number}for ${driver.team}: Formula 1 career wins, podiums, poles, championships and ${getSeasonYear()} results.`;
    }
    const nationality = driver.nationality ? `${driver.nationality} ` : '';
    return `${driver.fullName}, ${nationality}Formula 1 driver: career starts, wins, podiums, poles, fastest laps and championships.`;
}

export async function generateMetadata({ params }) {
    const { number } = await params;
    const route = await resolveDriverRoute(number);
    if (!route) notFound();
    const { driver, path } = route;
    const description = describe(driver);
    return {
        title: driver.fullName,
        description,
        alternates: { canonical: path },
        openGraph: { title: driver.fullName, description, url: path, type: 'profile' },
    };
}

async function currentStanding(driverId, year) {
    const summary = await getSeasonSummary(year);
    return summary.driverStandings.find((item) => item.driver.id === driverId) || null;
}

async function recentResults(driver, careerResults) {
    if (!driver.current) {
        return {
            label: 'Final races',
            rows: [...careerResults].sort((a, b) => b.season - a.season || b.round - a.round).slice(0, RECENT_RESULTS),
            showSeason: true,
        };
    }
    const year = getSeasonYear();
    let rows = await getDriverSeasonResults(driver.driverId, year);
    let season = year;
    if (rows.length === 0) {
        season = year - 1;
        rows = await getDriverSeasonResults(driver.driverId, season);
    }
    return {
        label: `${season} results`,
        rows: [...rows].reverse().slice(0, RECENT_RESULTS),
        showSeason: false,
    };
}

function formatPoints(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default async function DriverPage({ params }) {
    await connection();
    const { number } = await params;
    const route = await resolveDriverRoute(number);
    if (!route) notFound();
    const { driver, path } = route;
    if (`/driver/${decodeURIComponent(String(number))}` !== path) permanentRedirect(path);

    const year = getSeasonYear();
    const driverId = driver.driverId;
    const [career, results, profile, standing] = driverId
        ? await Promise.all([
            getCareerStats(driverId),
            getDriverResults(driverId),
            driver.current ? getAllTimeDriver(driverId) : driver,
            driver.current ? currentStanding(driverId, year) : null,
        ])
        : [null, { results: [] }, null, null];
    const span = careerSummary(results.results);
    const recent = driverId ? await recentResults(driver, results.results) : { rows: [] };
    const photoUrl = getHighQualityPhoto(driver.headshot);

    const personJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: driver.fullName,
        givenName: driver.firstName || undefined,
        familyName: driver.lastName || undefined,
        nationality: driver.nationality || undefined,
        birthDate: profile?.dateOfBirth || undefined,
        jobTitle: 'Formula 1 driver',
        image: photoUrl || undefined,
        url: `${SITE_URL}${path}`,
        sameAs: profile?.url ? [profile.url] : undefined,
        memberOf: driver.current && driver.team ? { '@type': 'SportsTeam', name: driver.team, sport: 'Formula 1' } : undefined,
    };

    const lapCoverage = fastestLapCoverage(span.firstSeason, span.lastSeason);
    const careerStats = career ? [
        ['Championships', career.championships],
        ['Starts', career.starts],
        ['Wins', career.wins],
        ['Podiums', career.podiums],
        ['Poles', career.poles],
        [
            lapCoverage === 'partial' ? `Fastest laps since ${FASTEST_LAP_DATA_FROM}` : 'Fastest laps',
            lapCoverage === 'none' ? '—' : career.fastestLaps,
        ],
        ['Seasons', career.seasons],
    ] : [];

    return (
        <div className={styles.driverDetail} style={{ '--team-color': driver.colour }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdScript(personJsonLd) }}
            />
            <section className={styles.hero}>
                <div className={styles.heroBackground} />
                <div className={styles.heroContent}>
                    <Link href="/drivers" className={styles.backLink}>All drivers</Link>
                    <div className={styles.heroMain}>
                        <div className={styles.driverPhoto}>
                            {photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photoUrl} alt={driver.fullName} />
                            ) : (
                                <div className={styles.photoPlaceholder} aria-hidden="true">
                                    {driver.code || driver.lastName.slice(0, 3).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className={styles.driverInfo}>
                            {driver.racingNumber ? (
                                <span className={styles.driverNumber} aria-label={`Car number ${driver.racingNumber}`}>
                                    {driver.racingNumber}
                                </span>
                            ) : null}
                            <h1>
                                <span className={styles.firstName}>{driver.firstName}</span>
                                <span className={styles.lastName}>{driver.lastName}</span>
                            </h1>
                            {driver.team ? (
                                <div className={styles.teamBadge}>
                                    <span className={styles.teamDot} aria-hidden="true" />
                                    {driver.team}
                                </div>
                            ) : null}
                            <dl className={styles.facts}>
                                {driver.nationality ? (
                                    <div>
                                        <dt>Nationality</dt>
                                        <dd>
                                            {driver.flag ? <span aria-hidden="true">{driver.flag} </span> : null}
                                            {driver.nationality}
                                        </dd>
                                    </div>
                                ) : null}
                                {driver.code ? (
                                    <div>
                                        <dt>Code</dt>
                                        <dd>{driver.code}</dd>
                                    </div>
                                ) : null}
                                {span.firstSeason ? (
                                    <div>
                                        <dt>Seasons</dt>
                                        <dd>{span.firstSeason === span.lastSeason ? span.firstSeason : `${span.firstSeason}–${span.lastSeason}`}</dd>
                                    </div>
                                ) : null}
                            </dl>
                            {standing ? (
                                <dl className={styles.seasonStanding} aria-label={`${year} championship`}>
                                    <div>
                                        <dt>{year} position</dt>
                                        <dd>P{standing.position}</dd>
                                    </div>
                                    <div>
                                        <dt>Points</dt>
                                        <dd>{formatPoints(standing.points)}</dd>
                                    </div>
                                    <div>
                                        <dt>Wins</dt>
                                        <dd>{standing.wins}</dd>
                                    </div>
                                </dl>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>

            {career ? (
                <section className={styles.statsSection} aria-labelledby="career-heading">
                    <div className="container">
                        <h2 id="career-heading" className={styles.sectionTitle}>Career</h2>
                        <dl className={styles.statsGrid}>
                            {careerStats.map(([label, value]) => (
                                <div key={label} className={styles.statCard}>
                                    <dt className={styles.statLabel}>{label}</dt>
                                    <dd className={styles.statValue}>{value}</dd>
                                </div>
                            ))}
                        </dl>
                        {span.teams.length > 0 ? (
                            <p className={styles.teams}>
                                <span className={styles.teamsLabel}>Teams</span> {span.teams.join(', ')}
                            </p>
                        ) : null}
                    </div>
                </section>
            ) : null}

            {recent.rows.length > 0 ? (
                <section className={styles.sessionsSection} aria-labelledby="results-heading">
                    <div className="container">
                        <h2 id="results-heading" className={styles.sectionTitle}>{recent.label}</h2>
                        <div className={styles.tableWrap}>
                            <table className={styles.resultsTable}>
                                <thead>
                                    <tr>
                                        <th scope="col">{recent.showSeason ? 'Season' : 'Round'}</th>
                                        <th scope="col">Grand Prix</th>
                                        <th scope="col">Grid</th>
                                        <th scope="col">Finish</th>
                                        <th scope="col">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent.rows.map((row) => (
                                        <tr key={`${row.season}-${row.round}`}>
                                            <td className={styles.resultRound}>{recent.showSeason ? row.season : row.round}</td>
                                            <th scope="row" className={styles.resultRace}>{row.raceName}</th>
                                            <td>{row.grid ? row.grid : '—'}</td>
                                            <td className={styles.resultFinish}>{finishLabel(row)}</td>
                                            <td className={styles.resultPoints}>{formatPoints(row.points)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            ) : null}

            {driverId ? (
                <section className={styles.actionsSection}>
                    <div className="container">
                        <Link href={`/compare?a=${driverId}`} className={styles.compareBtn}>
                            Compare {driver.lastName} with another driver
                        </Link>
                    </div>
                </section>
            ) : null}
        </div>
    );
}
