import { requestTime } from '@/app/[lang]/schedule/status';
import { DriverPortrait } from '@/components/DriverCard';
import LocalTime, { Countdown } from '@/components/LocalTime';
import { getGrid } from '@/lib/f1/drivers';
import { getSeasonSummary } from '@/lib/f1/history';
import { fastestLapOf, getDriverNumbers, getRaceResults } from '@/lib/f1/results';
import { getCalendar, getLastRace, getNextRace } from '@/lib/f1/season';
import { getDriverStandings } from '@/lib/f1/standings';
import { getTeams } from '@/lib/f1/teams';
import { canonicalTeamName, ensureTeamColorContrast } from '@/lib/f1/team-utils';
import { getSeasonYear } from '@/lib/f1/year';
import { getHighQualityPhoto } from '@/lib/photos';
import { countryName, raceName } from '@/lib/i18n/f1-names';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import homeMessages from '@/lib/i18n/messages/home';
import { sessionLabel } from '@/lib/i18n/messages/time';
import { fill, pick } from '@/lib/i18n/messages';
import { calculateTitleMath } from './_home/title-math';
import { countRemainingRaces, countRemainingSprints, getWeekendSessions, nextWeekendSession } from './_home/weekend';
import { SITE_URL } from '@/lib/site';
import { webcalUrl } from './schedule/status';
import Link from 'next/link';
import { connection } from 'next/server';
import styles from './page.module.css';

export async function generateMetadata({ params }) {
    const { lang } = await params;
    const t = pick(homeMessages, lang);
    const description = t.description;
    return {
        title: t.title,
        description,
        alternates: localeAlternates(lang, '/'),
        openGraph: {
            title: t.title,
            description,
            url: localePath(lang, '/'),
            locale: lang === 'ar' ? 'ar_SA' : 'en_US',
        },
    };
}

const STANDINGS_ROWS = 5;

const PADDOCK_FEATURES = [
    { href: '/live', title: 'featureLiveTitle', description: 'featureLiveDescription', icon: '⏱️', live: true },
    { href: '/standings', title: 'featureStandingsTitle', description: 'featureStandingsDescription', icon: '🏆' },
    { href: '/schedule', title: 'featureCalendarTitle', description: 'featureCalendarDescription', icon: '📅' },
    { href: '/compare', title: 'featureCompareTitle', description: 'featureCompareDescription', icon: '📊' },
    { href: '/tracks', title: 'featureCircuitsTitle', description: 'featureCircuitsDescription', icon: '🗺️' },
    { href: '/history', title: 'featureHistoryTitle', description: 'featureHistoryDescription', icon: '🏁' },
];

function DriverLink({ driver, numbers, lang }) {
    const number = numbers[driver.id ?? driver.driverId];
    const name = <bdi dir="ltr">{driver.firstName} <strong>{driver.lastName}</strong></bdi>;
    return number != null ? <Link href={localePath(lang, `/driver/${number}`)}>{name}</Link> : <span>{name}</span>;
}

function TeamBar({ team, teamsById }) {
    const color = teamsById.get(team?.id)?.color;
    return <span className={styles.teamBar} style={{ '--team': color || 'var(--border-strong)' }} aria-hidden="true" />;
}

function NextRace({ race, serverNow, now, t, lang }) {
    if (!race) {
        return (
            <section className={`${styles.card} rich-card`} aria-labelledby="next-heading">
                <h2 id="next-heading" className={styles.eyebrow}>{t.nextRace}</h2>
                <p className={styles.cardTitle}>{t.calendarNotPublished}</p>
                <Link href={localePath(lang, '/schedule')} className={styles.cardLink}>{t.calendar}</Link>
            </section>
        );
    }
    const href = localePath(lang, race.routeKey != null ? `/race/${race.routeKey}` : '/schedule');
    const sessions = getWeekendSessions(race);
    const nextSession = nextWeekendSession(race, now);
    const sessionText = nextSession ? sessionLabel(nextSession.label, lang) : null;
    const isLive = race.status === 'live';
    return (
        <section className={`${styles.card} ${styles.nextCard} rich-card`} aria-labelledby="next-heading">
            <h2 id="next-heading" className={styles.eyebrow}>
                {isLive ? t.liveNow : race.status === 'weekend' ? t.raceWeekend : t.nextRace}
                <span className={styles.round}><bdi dir="auto">{fill(t.round, { round: formatNumber(lang, race.round) })}</bdi></span>
            </h2>
            <p className={styles.cardTitle}>
                <Link href={href}>{raceName(race.raceName, lang)}</Link>
            </p>
            <p className={styles.meta}>
                <bdi dir="ltr">{race.circuit.name}</bdi>
                {race.circuit.country ? <>{lang === 'ar' ? '، ' : ', '}{countryName(race.circuit.country, lang)}</> : null}
            </p>
            {sessions.length > 0 && (
                <ol className={styles.sessions} aria-label={t.weekendSessions}>
                    {sessions.map((session) => {
                        const isNext = session.key === nextSession?.key && session.start === nextSession?.start;
                        return (
                            <li key={`${session.key}-${session.start}`} className={isNext ? styles.nextSession : undefined}>
                                <span className={styles.sessionName}>
                                    {sessionLabel(session.label, lang)}
                                    {session.key === 'sprint' && <span className={styles.sprintTag}>{t.sprintTag}</span>}
                                </span>
                                <LocalTime iso={session.start} format="datetime" className={styles.sessionTime} />
                            </li>
                        );
                    })}
                </ol>
            )}
            <div className={styles.nextActions}>
                {isLive && <Link href={localePath(lang, '/live')} className="btn btn-primary">{t.liveTiming}</Link>}
                {nextSession && (
                    <div className={styles.countdownBlock}>
                        <p className={styles.startLabel}>{fill(t.countdownTo, { session: sessionText })}</p>
                        <Countdown
                            target={nextSession.start}
                            serverNow={serverNow}
                            className={styles.countdown}
                            unitClassName={styles.unit}
                            valueClassName={styles.unitValue}
                            labelClassName={styles.unitLabel}
                            doneLabel={t.sessionStarted}
                        />
                    </div>
                )}
                {!nextSession && !isLive && <p className={styles.startLabel}>{t.raceUnderway}</p>}
                <a href={webcalUrl(SITE_URL)} className={styles.subscribeLink}>{t.subscribe}</a>
            </div>
        </section>
    );
}

function recapFacts(results, numbers, t, lang) {
    if (!results?.length) return null;
    const fastest = fastestLapOf(results);
    const dnfs = results.filter((row) => {
        const positionText = String(row.positionText ?? '').trim().toUpperCase();
        if (!['R', 'N'].includes(positionText)) return false;
        return !/did not start|\bDNS\b|withdrew|withdrawn|disqualified|\bDSQ\b/i.test(row.status || '');
    }).length;
    const mover = results
        .filter((row) => /^\d+$/.test(String(row.positionText ?? '').trim())
            && row.position != null && row.grid != null && row.grid > row.position)
        .sort((a, b) => (b.grid - b.position) - (a.grid - a.position))[0];
    return (
        <dl className={styles.recapFacts}>
            {fastest && (
                <div>
                    <dt>{t.fastestLap}</dt>
                    <dd>
                        <DriverLink driver={fastest.driver} numbers={numbers} lang={lang} />
                        <bdi dir="ltr">{fastest.fastestLap.time}</bdi>
                    </dd>
                </div>
            )}
            {dnfs > 0 && <div><dt>{t.dnfs}</dt><dd><bdi dir="ltr">{formatNumber(lang, dnfs)}</bdi></dd></div>}
            {mover && (
                <div>
                    <dt>{t.biggestMover}</dt>
                    <dd>
                        <DriverLink driver={mover.driver} numbers={numbers} lang={lang} />
                        <bdi dir="ltr">+{formatNumber(lang, mover.grid - mover.position)} {t.placesGained}</bdi>
                    </dd>
                </div>
            )}
        </dl>
    );
}

function LastRace({ race, results, numbers, teamsById, t, lang }) {
    if (!race) return null;
    const href = localePath(lang, race.routeKey != null ? `/race/${race.routeKey}` : '/schedule');
    const podium = (results || []).filter((row) => row.position != null).slice(0, 3);
    return (
        <section className={`${styles.card} rich-card`} aria-labelledby="last-heading">
            <h2 id="last-heading" className={styles.eyebrow}>{t.lastRace}</h2>
            <p className={styles.sectionHeading}><Link href={href}>{raceName(race.raceName, lang)}</Link></p>
            {podium.length > 0 ? (
                <ol className={styles.podium}>
                    {podium.map((row) => (
                        <li key={row.driver.id}>
                            <TeamBar team={row.team} teamsById={teamsById} />
                            <span className={styles.podiumPos}><bdi dir="ltr">P{row.position}</bdi></span>
                            <span className={styles.podiumName}><DriverLink driver={row.driver} numbers={numbers} lang={lang} /></span>
                            <span className={styles.podiumTeam}><bdi dir="ltr">{row.team?.name}</bdi></span>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className={styles.meta}>{t.resultsNotPublished}</p>
            )}
            {recapFacts(results, numbers, t, lang)}
            <Link href={href} className={styles.cardLink}>{t.fullResult}</Link>
        </section>
    );
}

function TitleFight({ math, numbers, t, lang }) {
    if (!math.leader) return null;
    return (
        <section className={`${styles.card} ${styles.titleCard} rich-card`} aria-labelledby="title-fight-heading">
            <h2 id="title-fight-heading" className={styles.sectionHeading}>{t.titleFight}</h2>
            <p className={styles.titleLeader}>
                <span className={styles.startLabel}>{t.leader}</span>
                <DriverLink driver={math.leader.driver} numbers={numbers} lang={lang} />
            </p>
            <dl className={styles.titleGaps}>
                {math.second && (
                    <div><dt>{t.gapToP2}</dt><dd><bdi dir="ltr">{formatNumber(lang, math.gapToSecond)}</bdi></dd></div>
                )}
                {math.third && (
                    <div><dt>{t.gapToP3}</dt><dd><bdi dir="ltr">{formatNumber(lang, math.gapToThird)}</bdi></dd></div>
                )}
                <div><dt>{t.pointsAvailable}</dt><dd><bdi dir="ltr">{formatNumber(lang, math.pointsRemaining)}</bdi></dd></div>
            </dl>
            <p className={styles.titleStatus}>{math.mathematicallyDecided ? t.titleDecided : t.titleOpen}</p>
        </section>
    );
}

function StandingsTable({ id, title, rows, renderName, teamsById, t, lang }) {
    return (
        <section className={`${styles.card} rich-card`} aria-labelledby={id}>
            <h2 id={id} className={styles.eyebrow}>{title}</h2>
            {rows.length > 0 ? (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th scope="col" className={styles.num}>{t.position}</th>
                            <th scope="col">{id === 'drivers-heading' ? t.driver : t.team}</th>
                            <th scope="col" className={styles.num}>{t.points}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.position}>
                                <th scope="row" className={styles.num}><bdi dir="ltr">{formatNumber(lang, Number(row.position))}</bdi></th>
                                <td>
                                    <span className={styles.tableEntity}>
                                        <TeamBar team={row.team} teamsById={teamsById} />
                                        {renderName(row)}
                                    </span>
                                </td>
                                <td className={styles.num}><bdi dir="ltr">{formatNumber(lang, Number(row.points))}</bdi></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className={styles.meta}>{t.noRacesCompleted}</p>
            )}
            <Link href={localePath(lang, '/standings')} className={styles.cardLink}>{t.fullStandings}</Link>
        </section>
    );
}

export default async function Home({ params }) {
    const { lang } = await params;
    const t = pick(homeMessages, lang);
    await connection();
    const now = requestTime();
    const year = getSeasonYear();
    // Each card degrades on its own: one throttled upstream must not take the home page down.
    const [nextRace, currentLastRace, seasonSummary, numbers, calendar, driverStandings, grid] = await Promise.all([
        getNextRace(year, now).catch(() => null),
        getLastRace(year, now).catch(() => null),
        getSeasonSummary(year).catch(() => null),
        getDriverNumbers(year).catch(() => ({})),
        getCalendar(year, now).catch(() => null),
        // Only the settled round is needed; without it every scheduled round counts as remaining.
        getDriverStandings(year).catch(() => null),
        // Featured portraits and the hero count are optional; the race data above stands on its own.
        getGrid(year).catch(() => []),
    ]);
    const summary = seasonSummary || { year, driverStandings: [], constructorStandings: [] };
    const lastRace = currentLastRace || (year > 1950 ? await getLastRace(year - 1, now).catch(() => null) : null);
    const [lastResults, teamRows] = await Promise.all([
        lastRace
            ? getRaceResults(lastRace.year, lastRace.round, { raceStart: lastRace.raceStart, now }).catch(() => null)
            : Promise.resolve(null),
        getTeams(lastRace?.year || year).catch(() => []),
    ]);
    const teamsById = new Map(teamRows.map((team) => [team.id, team]));
    const currentTeams = !lastRace || lastRace.year === year ? teamRows : await getTeams(year).catch(() => []);
    for (const team of currentTeams) teamsById.set(team.id, team);
    // Without the calendar the remaining count would read 0 and crown the leader early.
    const titleMath = calculateTitleMath({
        standings: calendar ? summary.driverStandings : [],
        remainingRaces: countRemainingRaces(calendar?.rounds, driverStandings?.round),
        remainingSprints: countRemainingSprints(calendar?.rounds, driverStandings?.round),
    });
    const serverNow = Math.floor(now / 1000) * 1000;
    const yearText = String(summary.year);
    const settledDriverIds = new Set(summary.driverStandings.map((row) => row.driver.id));
    const currentGrid = settledDriverIds.size > 0
        ? grid.filter((driver) => settledDriverIds.has(driver.driverId))
        : grid;
    // Championship order first (two full rows of four), so the leaders are the faces on the page.
    const standingRank = new Map(summary.driverStandings.map((row) => [row.driver.id, row.position]));
    const featuredDrivers = currentGrid
        .filter((driver) => driver.racingNumber != null && (driver.firstName || driver.lastName))
        .sort((a, b) => (standingRank.get(a.driverId) ?? Infinity) - (standingRank.get(b.driverId) ?? Infinity))
        .slice(0, 8);
    const heroStats = [
        { icon: '🏎️', label: t.statDrivers, value: currentGrid.length },
        { icon: '🏆', label: t.statTeams, value: currentTeams.length },
        { icon: '📅', label: t.statRaces, value: calendar?.rounds?.length },
    ].filter((stat) => Number.isFinite(stat.value) && stat.value > 0);

    return (
        <div className={styles.home}>
            <section className={`page-hero ${styles.hero}`} aria-labelledby="home-hero-title">
                <div className="page-hero__content">
                    <p className="page-hero__badge"><span aria-hidden="true">🏎️</span>{t.heroBadge}</p>
                    <h1 id="home-hero-title" className="page-hero__title">
                        <span>{t.heroLead}</span>{' '}
                        <span className="page-hero__accent">{t.heroAccent}</span>
                    </h1>
                    <p className="page-hero__subline">{t.heroDescription}</p>
                    <div className={styles.heroActions}>
                        <Link href={localePath(lang, '/live')} className="btn btn-primary">
                            <span aria-hidden="true">⏱️</span>{t.liveTiming}
                        </Link>
                        <Link href={localePath(lang, '/drivers')} className="btn btn-outline">
                            {t.heroDriversCta}
                        </Link>
                    </div>
                    {heroStats.length > 0 && (
                        <dl className={styles.heroStats}>
                            {heroStats.map((stat) => (
                                <div key={stat.label}>
                                    <dt className="stat-label"><span aria-hidden="true">{stat.icon}</span>{stat.label}</dt>
                                    <dd className="stat-number">{formatNumber(lang, stat.value)}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>
            </section>

            <div className="container">
                <div className={styles.top}>
                    <NextRace race={nextRace} serverNow={serverNow} now={now} t={t} lang={lang} />
                    <div className={styles.sideStack}>
                        <LastRace race={lastRace} results={lastResults} numbers={numbers} teamsById={teamsById} t={t} lang={lang} />
                        <TitleFight math={titleMath} numbers={numbers} t={t} lang={lang} />
                    </div>
                </div>
            </div>

            <section className={styles.explore} aria-labelledby="explore-heading">
                <div className="container">
                    <div className={styles.sectionHeader}>
                        <h2 id="explore-heading" className={styles.sectionTitle}>{t.explorePaddock}</h2>
                    </div>
                    <div className={styles.featureGrid}>
                        {PADDOCK_FEATURES.map((feature) => (
                            <Link
                                key={feature.href}
                                href={localePath(lang, feature.href)}
                                className={`${styles.featureCard} ${feature.live ? styles.featureLive : ''}`}
                            >
                                {feature.live && <span className={styles.featureLiveTag}><span aria-hidden="true" />{t.liveMarker}</span>}
                                <span className={styles.featureIcon} aria-hidden="true">{feature.icon}</span>
                                <h3>{t[feature.title]}</h3>
                                <p>{t[feature.description]}</p>
                                <span className={styles.featureArrow} aria-hidden="true">↗</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {featuredDrivers.length > 0 && (
                <section className={styles.featuredDrivers} aria-labelledby="featured-heading">
                    <div className="container">
                        <div className={styles.sectionHeader}>
                            <h2 id="featured-heading" className={styles.sectionTitle}>{t.featuredDrivers}</h2>
                            <Link href={localePath(lang, '/drivers')} className={styles.viewAll}>
                                {t.viewAllDrivers}<span aria-hidden="true">↗</span>
                            </Link>
                        </div>
                        <div className={styles.featuredGrid}>
                            {featuredDrivers.map((driver) => {
                                const number = driver.racingNumber;
                                return (
                                    <Link
                                        key={driver.driverId || `${number}-${driver.code}`}
                                        href={localePath(lang, `/driver/${number}`)}
                                        className={styles.featuredCard}
                                        style={{ '--team-color': ensureTeamColorContrast(driver.teamColour || '#E10600') }}
                                    >
                                        <span className={styles.featuredNumber}><bdi dir="ltr">{formatNumber(lang, number)}</bdi></span>
                                        <DriverPortrait
                                            src={getHighQualityPhoto(driver.headshot)}
                                            alt=""
                                            width={360}
                                            height={260}
                                            className={styles.featuredPortrait}
                                            imgClassName={styles.featuredPhoto}
                                            fallbackClassName={styles.featuredPhotoFallback}
                                            loading="lazy"
                                        >
                                            <span aria-hidden="true">{driver.code || driver.lastName?.slice(0, 3)?.toUpperCase()}</span>
                                        </DriverPortrait>
                                        <div className={styles.featuredInfo}>
                                            <bdi dir="ltr" className={styles.featuredName}>
                                                <span>{driver.firstName}</span>
                                                <strong>{driver.lastName}</strong>
                                            </bdi>
                                            <span className={styles.featuredTeam}><bdi dir="auto">{driver.team}</bdi></span>
                                            {(driver.flag || driver.nationalityCode) && (
                                                <span className={styles.featuredNation}>
                                                    {driver.flag && <span aria-hidden="true">{driver.flag}</span>}
                                                    {driver.nationalityCode && <bdi dir="ltr">{driver.nationalityCode}</bdi>}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            <div className="container">
                <div className={styles.standings}>
                    <StandingsTable
                        id="drivers-heading"
                        title={fill(t.drivers, { year: yearText })}
                        rows={summary.driverStandings.slice(0, STANDINGS_ROWS)}
                        renderName={(row) => <DriverLink driver={row.driver} numbers={numbers} lang={lang} />}
                        teamsById={teamsById}
                        t={t}
                        lang={lang}
                    />
                    <StandingsTable
                        id="teams-heading"
                        title={fill(t.constructors, { year: yearText })}
                        rows={summary.constructorStandings.slice(0, STANDINGS_ROWS)}
                        renderName={(row) => <Link href={localePath(lang, `/team/${row.team.id}`)}><bdi dir="ltr">{canonicalTeamName(row.team.name, row.team.id)}</bdi></Link>}
                        teamsById={teamsById}
                        t={t}
                        lang={lang}
                    />
                </div>
            </div>
        </div>
    );
}
