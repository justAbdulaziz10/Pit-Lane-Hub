import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getChampions, getSeasonSummary } from '@/lib/f1/history';
import {
    FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR,
    FIRST_DRIVERS_CHAMPIONSHIP_YEAR,
    getConstructorStandings,
    getDriverStandings,
    getRaceDates,
    hasConstructorsChampionship,
    parseSeasonYear,
} from '@/lib/f1/standings';
import { getSeasonYear } from '@/lib/f1/year';
import { driverPath } from '@/app/[lang]/driver/[number]/driver-data';
import { fill, pick } from '@/lib/i18n/messages';
import historyMessages from '@/lib/i18n/messages/history';
import { formatDate, formatNumber } from '@/lib/i18n/format';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import { raceName } from '@/lib/i18n/f1-names';
import { loadCurrentSeasonLookups, lookupsForSeason } from '../standings/_components/lookups';
import YearPicker from '../standings/_components/YearPicker';
import { allTimeRecords, viewHref } from './history-utils';
import {
    ConstructorStandingsTable,
    DriverStandingsTable,
    standingsStyles,
} from '../standings/_components/StandingsTables';
import styles from './page.module.css';

const VIEWS = ['races', 'drivers', 'constructors'];
const DEFAULT_VIEW = 'races';
const EMPTY_LOOKUPS = { colorById: new Map(), nameById: new Map() };

async function resolveParams(searchParams) {
    const params = await searchParams;
    const current = getSeasonYear();
    const year = parseSeasonYear(params.year, { current });
    if (year === null) notFound();
    const view = VIEWS.includes(params.view) ? params.view : DEFAULT_VIEW;
    return { year, current, view, explicitYear: params.year !== undefined };
}

export async function generateMetadata({ params, searchParams }) {
    await connection();
    const { lang } = await params;
    const t = pick(historyMessages, lang);
    const { year, view, explicitYear } = await resolveParams(searchParams);
    const title = explicitYear
        ? fill(t.metadataSeasonTitle, { year: formatNumber(lang, year, { useGrouping: false }) })
        : t.metadataTitle;
    const description = explicitYear
        ? fill(t.metadataSeasonDescription, { year: formatNumber(lang, year, { useGrouping: false }) })
        : t.metadataDescription;
    const path = explicitYear ? viewHref(year, view, 'en') : '/history';
    return {
        title,
        description,
        alternates: localeAlternates(lang, path),
        openGraph: {
            title,
            description,
            url: localePath(lang, path),
            images: [localePath(lang, '/opengraph-image')],
            locale: lang === 'ar' ? 'ar_SA' : 'en_US',
        },
    };
}

function personName(person) {
    return (
        <>
            <bdi dir="ltr">{person.firstName} <strong>{person.lastName}</strong></bdi>
        </>
    );
}

function MaybeLink({ href, children, lang }) {
    return href ? <Link href={localePath(lang, href)}>{children}</Link> : children;
}

async function RacesView({ year, lookups, lang, t }) {
    const [summary, dates] = await Promise.all([getSeasonSummary(year), getRaceDates(year).catch(() => new Map())]);
    if (summary.races.length === 0) {
        return <div className={standingsStyles.empty}><h3>{fill(t.noRaces, { year: formatNumber(lang, year, { useGrouping: false }) })}</h3></div>;
    }
    const teamNames = new Map();
    for (const row of summary.driverStandings) if (row.team?.id) teamNames.set(row.team.id, row.team.name);
    for (const row of summary.constructorStandings) if (row.team?.id) teamNames.set(row.team.id, row.team.name);

    return (
        <div className={standingsStyles.tableWrap}>
            <table className={standingsStyles.table}>
                <caption>{fill(t.raceWinners, { year: formatNumber(lang, year, { useGrouping: false }) })}</caption>
                <thead>
                    <tr>
                        <th scope="col">{t.roundShort}</th>
                        <th scope="col">{t.grandPrix}</th>
                        <th scope="col" className={standingsStyles.hideSmall}>{t.date}</th>
                        <th scope="col">{t.winner}</th>
                        <th scope="col" className={standingsStyles.hideSmall}>{t.team}</th>
                    </tr>
                </thead>
                <tbody>
                    {summary.races.map((race) => {
                        const date = dates.get(race.round) || race.date?.slice(0, 10) || null;
                        const winner = race.winner;
                        const teamId = winner?.constructorId;
                        return (
                            <tr key={race.round}>
                                <td className={standingsStyles.pos}><bdi dir="ltr">{formatNumber(lang, race.round)}</bdi></td>
                                <th scope="row">{raceName(race.raceName, lang)}</th>
                                <td className={`${standingsStyles.muted} ${standingsStyles.hideSmall}`}>
                                    {date ? <time dateTime={date}>{formatDate(lang, date, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time> : null}
                                </td>
                                <td className={standingsStyles.driverName}>
                                    {winner
                                        ? <MaybeLink href={driverPath({ driverId: winner.driverId })} lang={lang}>{personName(winner)}</MaybeLink>
                                        : <span className={standingsStyles.muted}>-</span>}
                                </td>
                                <td className={`${standingsStyles.muted} ${standingsStyles.hideSmall}`}>
                                    {teamId && (
                                        <Link href={localePath(lang, `/team/${encodeURIComponent(teamId)}`)}>
                                            <bdi dir="auto">{lookups.nameById.get(teamId) || teamNames.get(teamId) || teamId}</bdi>
                                        </Link>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

async function DriversView({ year, lookups, lang, t }) {
    const { standings, round } = await getDriverStandings(year);
    if (standings.length === 0) {
        return <div className={standingsStyles.empty}><h3>{fill(t.noStandings, { year: formatNumber(lang, year, { useGrouping: false }) })}</h3></div>;
    }
    return (
        <DriverStandingsTable
            standings={standings}
            caption={fill(t.driversCaption, { year: formatNumber(lang, year, { useGrouping: false }), roundText: round ? fill(t.afterRound, { round: formatNumber(lang, round) }) : '' })}
            lookups={lookups}
            lang={lang}
        />
    );
}

async function ConstructorsView({ year, lookups, lang, t }) {
    if (!hasConstructorsChampionship(year)) {
        return (
            <div className={standingsStyles.empty}>
                <h3>{t.firstConstructorsTitle}</h3>
                <p>
                    {t.firstAwarded}{' '}
                    <Link href={viewHref(FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR, 'constructors', lang)}>
                        <bdi dir="ltr">{formatNumber(lang, FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR, { useGrouping: false })}</bdi>
                    </Link>
                </p>
            </div>
        );
    }
    const { standings, round } = await getConstructorStandings(year);
    if (standings.length === 0) {
        return <div className={standingsStyles.empty}><h3>{fill(t.noStandings, { year: formatNumber(lang, year, { useGrouping: false }) })}</h3></div>;
    }
    return (
        <ConstructorStandingsTable
            standings={standings}
            caption={fill(t.constructorsCaption, { year: formatNumber(lang, year, { useGrouping: false }), roundText: round ? fill(t.afterRound, { round: formatNumber(lang, round) }) : '' })}
            lookups={lookups}
            lang={lang}
        />
    );
}

function ChampionsTable({ champions, lang, t }) {
    const constructorsByYear = new Map(champions.constructors.map((item) => [Number(item.year), item]));
    const rows = [...champions.drivers].sort((a, b) => b.year - a.year);
    return (
        <div className={standingsStyles.tableWrap}>
            <table className={standingsStyles.table}>
                <caption>{t.worldChampions}</caption>
                <thead>
                    <tr>
                        <th scope="col">{t.season}</th>
                        <th scope="col">{t.driversChampion}</th>
                        <th scope="col">{t.constructorsChampion}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((driver) => {
                        const constructor = constructorsByYear.get(Number(driver.year));
                        return (
                            <tr key={driver.year}>
                                <th scope="row" className={standingsStyles.pos}>
                                    <Link href={viewHref(driver.year, DEFAULT_VIEW, lang)}><bdi dir="ltr">{formatNumber(lang, driver.year, { useGrouping: false })}</bdi></Link>
                                </th>
                                <td className={standingsStyles.driverName}>
                                    <MaybeLink href={driverPath({ driverId: driver.driverId })} lang={lang}>{personName(driver)}</MaybeLink>
                                </td>
                                <td>
                                    {constructor ? (
                                        <Link href={localePath(lang, `/team/${encodeURIComponent(constructor.constructorId)}`)}><bdi dir="auto">{constructor.name}</bdi></Link>
                                    ) : (
                                        <span className={standingsStyles.muted}>{t.notAwarded}</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function AllTimeRecords({ records, lang, t }) {
    return (
        <section className={styles.content} aria-labelledby="records-heading">
            <div className="container">
                <h2 id="records-heading" className={styles.sectionTitle}>{t.allTimeRecords}</h2>
                <dl className={styles.recordsGrid}>
                    {[
                        [t.mostDriverTitles, records.drivers],
                        [t.mostConstructorTitles, records.constructors],
                    ].map(([label, leaders]) => (
                        <div key={label} className={styles.recordGroup}>
                            <dt>{label}</dt>
                            {leaders.length ? leaders.map((record) => (
                                <dd key={record.id} className={styles.record}>
                                    <bdi dir="auto" className={styles.recordName}>{record.name}</bdi>
                                    <bdi dir="ltr" className={styles.recordValue}>{formatNumber(lang, record.titles)}</bdi>
                                </dd>
                            )) : <dd className={styles.record}>—</dd>}
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}

export default async function HistoryPage({ params, searchParams }) {
    await connection();
    const { lang } = await params;
    const t = pick(historyMessages, lang);
    const { year, current, view, explicitYear } = await resolveParams(searchParams);
    const [champions, allLookups] = await Promise.all([
        getChampions(),
        explicitYear ? loadCurrentSeasonLookups(current) : Promise.resolve(EMPTY_LOOKUPS),
    ]);
    const records = allTimeRecords(champions);
    const lookups = explicitYear ? lookupsForSeason(allLookups, year, current) : EMPTY_LOOKUPS;
    const SeasonView = view === 'drivers' ? DriversView : view === 'constructors' ? ConstructorsView : RacesView;

    return (
        <div className={styles.history}>
            <header className={styles.header}>
                <div className="container">
                    <h1>{t.pageTitle}</h1>
                    <YearPicker
                        action="/history"
                        year={year}
                        min={FIRST_DRIVERS_CHAMPIONSHIP_YEAR}
                        max={current}
                        extraParams={explicitYear && view !== DEFAULT_VIEW ? { view } : {}}
                        label={!explicitYear ? t.seasonBrowser : undefined}
                        lang={lang}
                    />
                </div>
            </header>

            {!explicitYear ? <AllTimeRecords records={records} lang={lang} t={t} /> : (
                <section className={styles.content} aria-labelledby="season-heading">
                    <div className="container">
                        <h2 id="season-heading" className={styles.sectionTitle}>{fill(t.yearSeason, { year: formatNumber(lang, year, { useGrouping: false }) })}</h2>
                        <nav aria-label={fill(t.seasonViews, { year: formatNumber(lang, year, { useGrouping: false }) })} className={styles.views}>
                            {VIEWS.map((key) => (
                                <Link
                                    key={key}
                                    href={viewHref(year, key, lang)}
                                    className={`${styles.viewLink} ${key === view ? styles.active : ''}`}
                                    aria-current={key === view ? 'page' : undefined}
                                >
                                    {t[key]}
                                </Link>
                            ))}
                        </nav>
                        <SeasonView year={year} lookups={lookups} lang={lang} t={t} />
                    </div>
                </section>
            )}

            <section className={styles.content} aria-label={t.worldChampions}>
                <div className="container">
                    <ChampionsTable champions={champions} lang={lang} t={t} />
                </div>
            </section>
        </div>
    );
}
