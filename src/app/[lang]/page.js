import { requestTime } from '@/app/[lang]/schedule/status';
import LocalTime, { Countdown } from '@/components/LocalTime';
import { getSeasonSummary } from '@/lib/f1/history';
import { fastestLapOf, getDriverNumbers, getRaceResults } from '@/lib/f1/results';
import { getCalendar, getLastRace, getNextRace } from '@/lib/f1/season';
import { getTeams } from '@/lib/f1/teams';
import { canonicalTeamName } from '@/lib/f1/team-utils';
import { getSeasonYear } from '@/lib/f1/year';
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
            <section className={styles.card} aria-labelledby="next-heading">
                <h2 id="next-heading" className={styles.eyebrow}>{t.nextRace}</h2>
                <p className={styles.cardTitle}>{t.calendarNotPublished}</p>
                <Link href={localePath(lang, '/schedule')} className={styles.cardLink}>{t.calendar}</Link>
            </section>
        );
    }
    const href = localePath(lang, race.meetingKey != null ? `/race/${race.meetingKey}` : '/schedule');
    const sessions = getWeekendSessions(race);
    const nextSession = nextWeekendSession(race, now);
    const sessionText = nextSession ? sessionLabel(nextSession.label, lang) : null;
    const isLive = race.status === 'live';
    return (
        <section className={`${styles.card} ${styles.nextCard}`} aria-labelledby="next-heading">
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
    const dnfs = results.filter((row) => row.position == null
        && !/did not start|withdrew|disqualified/i.test(row.status || '')).length;
    const mover = results
        .filter((row) => row.position != null && row.grid != null && row.grid > row.position)
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
    const href = localePath(lang, race.meetingKey != null ? `/race/${race.meetingKey}` : '/schedule');
    const podium = (results || []).filter((row) => row.position != null).slice(0, 3);
    return (
        <section className={`${styles.card} ${styles.recapCard}`} aria-labelledby="last-heading">
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
        <section className={`${styles.card} ${styles.titleCard}`} aria-labelledby="title-fight-heading">
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
        <section className={styles.card} aria-labelledby={id}>
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
    const [nextRace, currentLastRace, summary, numbers, calendar] = await Promise.all([
        getNextRace(year, now),
        getLastRace(year, now),
        getSeasonSummary(year),
        getDriverNumbers(year),
        getCalendar(year, now),
    ]);
    const lastRace = currentLastRace || (year > 1950 ? await getLastRace(year - 1, now).catch(() => null) : null);
    const [lastResults, teamRows] = await Promise.all([
        lastRace
            ? getRaceResults(lastRace.year, lastRace.round, { raceStart: lastRace.raceStart, now })
            : Promise.resolve(null),
        getTeams(lastRace?.year || year),
    ]);
    const teamsById = new Map(teamRows.map((team) => [team.id, team]));
    const currentTeams = !lastRace || lastRace.year === year ? teamRows : await getTeams(year);
    for (const team of currentTeams) teamsById.set(team.id, team);
    const titleMath = calculateTitleMath({
        standings: summary.driverStandings,
        remainingRaces: countRemainingRaces(calendar.rounds, now),
        remainingSprints: countRemainingSprints(calendar.rounds, now),
    });
    const serverNow = Math.floor(now / 1000) * 1000;
    const yearText = String(summary.year);

    return (
        <div className={styles.home}>
            <h1 className={styles.srOnly}>{t.title}</h1>
            <div className="container">
                <div className={styles.top}>
                    <NextRace race={nextRace} serverNow={serverNow} now={now} t={t} lang={lang} />
                    <div className={styles.sideStack}>
                        <LastRace race={lastRace} results={lastResults} numbers={numbers} teamsById={teamsById} t={t} lang={lang} />
                        <TitleFight math={titleMath} numbers={numbers} t={t} lang={lang} />
                    </div>
                </div>

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
