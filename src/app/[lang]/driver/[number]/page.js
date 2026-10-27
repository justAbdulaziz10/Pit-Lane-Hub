import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { connection } from 'next/server';
import {
    careerSummary,
    FASTEST_LAP_DATA_FROM,
    fastestLapCoverage,
    getAllTimeDriver,
    getCareerStats,
    getDriverQualifyingResults,
    getDriverResults,
    headToHead,
    qualifyingHeadToHead,
} from '@/lib/f1/compare';
import { FULL_POLE_DATA_FROM, POLE_DATA_FROM } from '@/lib/f1/career';
import { getSeasonSummary } from '@/lib/f1/history';
import { getGrid } from '@/lib/f1/drivers';
import { currentGridDrivers } from '@/lib/f1/standings';
import { getTeams } from '@/lib/f1/teams';
import { getSeasonYear } from '@/lib/f1/year';
import { jsonLdScript } from '@/lib/jsonld';
import { getHighQualityPhoto } from '@/lib/photos';
import { DriverPortrait } from '@/components/DriverCard';
import { SITE_URL } from '@/lib/site';
import { fill, pick } from '@/lib/i18n/messages';
import driverMessages from '@/lib/i18n/messages/drivers';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { nationalityName, raceName } from '@/lib/i18n/f1-names';
import { finishLabel, getDriverSeasonResults, gridFinishDelta, resolveDriverRoute } from './driver-data';
import styles from './page.module.css';

const RECENT_RESULTS = 10;

function describe(driver, lang) {
    if (driver.current) {
        if (lang !== 'ar') {
            const number = driver.racingNumber ? `#${driver.racingNumber} ` : '';
            return `${driver.fullName}, ${number}for ${driver.team}: Formula 1 career wins, podiums, poles, championships and ${getSeasonYear()} results.`;
        }
        return fill(pick(driverMessages, lang).metadataCurrentDescription, { name: driver.fullName });
    }
    if (lang !== 'ar') {
        const nationality = driver.nationality ? `${driver.nationality} ` : '';
        return `${driver.fullName}, ${nationality}Formula 1 driver: career entries, wins, podiums, poles, fastest laps and championships.`;
    }
    return fill(pick(driverMessages, lang).metadataPastDescriptionEntries, { name: driver.fullName });
}

export async function generateMetadata({ params }) {
    const { number, lang } = await params;
    const route = await resolveDriverRoute(number);
    if (!route) notFound();
    const { driver, path } = route;
    const description = describe(driver, lang);
    return {
        title: driver.fullName,
        description,
        alternates: localeAlternates(lang, path),
        openGraph: {
            title: driver.fullName,
            description,
            url: localePath(lang, path),
            images: [localePath(lang, `${path}/opengraph-image`)],
            locale: lang === 'ar' ? 'ar_SA' : 'en_US',
            type: 'profile',
        },
    };
}

async function currentStanding(driverId, year) {
    const summary = await getSeasonSummary(year);
    return summary.driverStandings.find((item) => item.driver.id === driverId) || null;
}

async function recentResults(driver, careerResults, lang, t) {
    if (!driver.current) {
        return {
            label: t.finalRaces,
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
        label: fill(t.seasonResults, { year: formatNumber(lang, season, { useGrouping: false }) }),
        rows: [...rows].reverse(),
        showSeason: false,
    };
}

async function teammateHeadToHead(driver, year, raceResults, qualifyingResults) {
    if (!driver.current || !driver.driverId) return null;
    try {
        const [teams, grid] = await Promise.all([getTeams(year), getGrid(year)]);
        const team = teams.find((item) => item.drivers.some((member) => member.driverId === driver.driverId))
            || teams.find((item) => item.name === driver.team);
        if (!team) return null;
        const teammate = currentGridDrivers(team, grid).find((member) => member.driverId !== driver.driverId);
        if (!teammate?.driverId) return null;
        const [teammateRaceResults, teammateQualifying] = await Promise.all([
            getDriverResults(teammate.driverId),
            getDriverQualifyingResults(teammate.driverId),
        ]);
        const inSeason = (rows) => rows.filter((row) => row.season === year);
        return {
            name: teammate.fullName || `${teammate.firstName} ${teammate.lastName}`.trim(),
            races: headToHead(inSeason(raceResults), inSeason(teammateRaceResults.results)),
            qualifying: qualifyingHeadToHead(inSeason(qualifyingResults), inSeason(teammateQualifying)),
        };
    } catch {
        return null;
    }
}

function coverageNote(template, year, lang) {
    const [before, after = ''] = template.split('{year}');
    return <>{before}<bdi dir="ltr">{formatNumber(lang, year, { useGrouping: false })}</bdi>{after}</>;
}

function formatPoints(value, lang) {
    return Number.isInteger(value)
        ? formatNumber(lang, value)
        : formatNumber(lang, value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export default async function DriverPage({ params }) {
    await connection();
    const { number, lang } = await params;
    const t = pick(driverMessages, lang);
    const route = await resolveDriverRoute(number);
    if (!route) notFound();
    const { driver, path } = route;
    if (`/driver/${decodeURIComponent(String(number))}` !== path) permanentRedirect(localePath(lang, path));

    const year = getSeasonYear();
    const driverId = driver.driverId;
    const [career, results, profile, standing, qualifying] = driverId
        ? await Promise.all([
            getCareerStats(driverId),
            getDriverResults(driverId),
            driver.current ? getAllTimeDriver(driverId) : driver,
            driver.current ? currentStanding(driverId, year) : null,
            getDriverQualifyingResults(driverId),
        ])
        : [null, { results: [] }, null, null, []];
    const span = careerSummary(results.results);
    const recent = driverId ? await recentResults(driver, results.results, lang, t) : { rows: [] };
    const teammate = await teammateHeadToHead(driver, year, results.results, qualifying);
    const photoUrl = getHighQualityPhoto(driver.headshot);

    const personJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        inLanguage: lang,
        name: driver.fullName,
        givenName: driver.firstName || undefined,
        familyName: driver.lastName || undefined,
        nationality: nationalityName(driver.nationality, lang) || undefined,
        birthDate: profile?.dateOfBirth || undefined,
        jobTitle: 'Formula 1 driver',
        image: photoUrl || undefined,
        url: `${SITE_URL}${localePath(lang, path)}`,
        sameAs: profile?.url ? [profile.url] : undefined,
        memberOf: driver.current && driver.team ? { '@type': 'SportsTeam', name: driver.team, sport: 'Formula 1' } : undefined,
    };

    const lapCoverage = fastestLapCoverage(span.firstSeason, span.lastSeason);
    const careerStats = career ? [
        [t.championships, career.championships],
        [t.statEntries, career.entries],
        [t.statWins, career.wins],
        [t.statPodiums, career.podiums],
        [
            lapCoverage === 'partial' ? fill(t.fastestLapsSince, { year: formatNumber(lang, FASTEST_LAP_DATA_FROM, { useGrouping: false }) }) : t.statFastestLaps,
            lapCoverage === 'none' ? '—' : career.fastestLaps,
        ],
        [t.statPoles, career.poleCoverage === 'none' ? '—' : career.poles],
        [t.statSeasons, career.seasons],
    ] : [];
    const poleCoverage = career?.poleCoverage;
    const poleCoverageNote = poleCoverage === 'none'
        ? coverageNote(t.poleCoverageNone, POLE_DATA_FROM, lang)
        : poleCoverage === 'partial'
            ? coverageNote(t.poleCoveragePartial, FULL_POLE_DATA_FROM, lang)
            : null;

    return (
        <div className={styles.driverDetail} style={{ '--team-color': driver.colour }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdScript(personJsonLd) }}
            />
            <section className={styles.hero}>
                <div className={styles.heroBackground} />
                <div className={styles.heroContent}>
                    <Link href={localePath(lang, '/drivers')} className={styles.backLink}>{t.backToDrivers}</Link>
                    <div className={styles.heroMain}>
                        <div className={styles.driverPhoto}>
                            <DriverPortrait
                                src={photoUrl}
                                alt={driver.fullName}
                                width={250}
                                height={250}
                                className={styles.portraitFrame}
                                imgClassName={styles.portraitImage}
                                fallbackClassName={styles.photoPlaceholder}
                                loading="eager"
                                fetchPriority="high"
                            >
                                {driver.code || `${driver.firstName?.[0] || ''}${driver.lastName?.slice(0, 2) || ''}`.toUpperCase()}
                            </DriverPortrait>
                        </div>
                        <div className={styles.driverInfo}>
                            {driver.racingNumber ? (
                                <span className={styles.driverNumber} aria-label={fill(t.carNumber, { number: formatNumber(lang, driver.racingNumber) })}>
                                    <bdi dir="ltr">{formatNumber(lang, driver.racingNumber)}</bdi>
                                </span>
                            ) : null}
                            <h1>
                                <span className={styles.firstName} dir="ltr">{driver.firstName}</span>
                                <span className={styles.lastName} dir="ltr">{driver.lastName}</span>
                            </h1>
                            {driver.team ? (
                                <div className={styles.teamBadge}>
                                    <span className={styles.teamDot} aria-hidden="true" />
                                <bdi dir="auto">{driver.team}</bdi>
                                </div>
                            ) : null}
                            <dl className={styles.facts}>
                                {driver.nationality ? (
                                    <div>
                                        <dt>{t.nationality}</dt>
                                        <dd>
                                            {driver.flag ? <span aria-hidden="true">{driver.flag} </span> : null}
                                            {nationalityName(driver.nationality, lang)}
                                        </dd>
                                    </div>
                                ) : null}
                                {driver.code ? (
                                    <div>
                                        <dt>{t.code}</dt>
                                        <dd><bdi dir="ltr">{driver.code}</bdi></dd>
                                    </div>
                                ) : null}
                                {span.firstSeason ? (
                                    <div>
                                        <dt>{t.statSeasons}</dt>
                                        <dd><bdi dir="ltr">{formatNumber(lang, span.firstSeason, { useGrouping: false })}{span.firstSeason === span.lastSeason ? '' : `–${formatNumber(lang, span.lastSeason, { useGrouping: false })}`}</bdi></dd>
                                    </div>
                                ) : null}
                            </dl>
                            {standing ? (
                                <dl className={styles.seasonStanding} aria-label={fill(t.championship, { year: formatNumber(lang, year, { useGrouping: false }) })}>
                                    <div>
                                        <dt>{fill(t.seasonPosition, { year: formatNumber(lang, year, { useGrouping: false }) })}</dt>
                                        <dd><bdi dir="ltr">P{standing.position == null ? standing.positionText || '-' : formatNumber(lang, standing.position)}</bdi></dd>
                                    </div>
                                    <div>
                                        <dt>{t.statPoints}</dt>
                                        <dd><bdi dir="ltr">{formatPoints(standing.points, lang)}</bdi></dd>
                                    </div>
                                    <div>
                                        <dt>{t.statWins}</dt>
                                        <dd><bdi dir="ltr">{formatNumber(lang, standing.wins)}</bdi></dd>
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
                        <h2 id="career-heading" className={styles.sectionTitle}>{t.career}</h2>
                        <dl className={styles.statsGrid}>
                            {careerStats.map(([label, value]) => (
                                <div key={label} className={styles.statCard}>
                                    <dt className={styles.statLabel}>{label}</dt>
                                <dd className={styles.statValue}><bdi dir="ltr">{typeof value === 'number' ? formatNumber(lang, value) : value}</bdi></dd>
                                </div>
                            ))}
                        </dl>
                        {poleCoverageNote ? <p className={styles.coverageNote}>{poleCoverageNote}</p> : null}
                        {span.teams.length > 0 ? (
                            <p className={styles.teams}>
                                <span className={styles.teamsLabel}>{t.teams}</span> {span.teams.join(', ')}
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
                                        <th scope="col">{recent.showSeason ? t.season : t.round}</th>
                                        <th scope="col">{t.grandPrix}</th>
                                        <th scope="col">{t.grid}</th>
                                        <th scope="col">{t.finish}</th>
                                        <th scope="col">{t.gridFinishDelta}</th>
                                        <th scope="col">{t.statPoints}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent.rows.map((row) => (
                                        <tr key={`${row.season}-${row.round}`}>
                                            <td className={styles.resultRound}><bdi dir="ltr">{recent.showSeason ? formatNumber(lang, row.season, { useGrouping: false }) : formatNumber(lang, row.round)}</bdi></td>
                                            <th scope="row" className={styles.resultRace}>{raceName(row.raceName, lang)}</th>
                                            <td><bdi dir="ltr">{row.grid ? formatNumber(lang, row.grid) : '—'}</bdi></td>
                                            <td className={styles.resultFinish}><bdi dir="ltr">{finishLabel(row, lang)}</bdi></td>
                                            <td><bdi dir="ltr">{gridFinishDelta(row) == null ? '—' : `${gridFinishDelta(row) > 0 ? '+' : gridFinishDelta(row) < 0 ? '−' : ''}${formatNumber(lang, Math.abs(gridFinishDelta(row)))}`}</bdi></td>
                                            <td className={styles.resultPoints}><bdi dir="ltr">{formatPoints(row.points, lang)}</bdi></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            ) : null}

            {teammate ? (
                <section className={styles.teammateSection} aria-labelledby="teammate-heading">
                    <div className="container">
                        <h2 id="teammate-heading" className={styles.sectionTitle}>
                            {(() => {
                                const [before, after = ''] = t.teammateHeadToHead.split('{name}');
                                return <>{before}<bdi dir="ltr">{teammate.name}</bdi>{after}</>;
                            })()}
                        </h2>
                        <dl className={styles.teammateStats}>
                            {[
                                [t.raceHeadToHead, teammate.races],
                                [t.qualifyingHeadToHead, teammate.qualifying],
                            ].map(([label, h2h]) => (
                                <div key={label}>
                                    <dt>{label}</dt>
                                    <dd><bdi dir="ltr">{formatNumber(lang, h2h.aheadA)}–{formatNumber(lang, h2h.aheadB)}</bdi></dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>
            ) : null}

            {driverId ? (
                <section className={styles.actionsSection}>
                    <div className="container">
                        <Link href={localePath(lang, `/compare?a=${driverId}`)} className={styles.compareBtn}>
                            {fill(t.compareDriver, { name: driver.lastName })}
                        </Link>
                    </div>
                </section>
            ) : null}
        </div>
    );
}
