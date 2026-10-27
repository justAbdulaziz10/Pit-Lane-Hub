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
import { loadCurrentSeasonLookups, lookupsForSeason } from '../standings/_components/lookups';
import {
    ConstructorStandingsTable,
    DriverStandingsTable,
    standingsStyles,
    YearPicker,
} from '../standings/_components/StandingsTables';
import styles from './page.module.css';

const VIEWS = [
    ['races', 'Races'],
    ['drivers', 'Drivers'],
    ['constructors', 'Constructors'],
];
const DEFAULT_VIEW = 'races';

async function resolveParams(searchParams) {
    const params = await searchParams;
    const current = getSeasonYear();
    const year = parseSeasonYear(params.year, { current });
    if (year === null) notFound();
    const view = VIEWS.some(([key]) => key === params.view) ? params.view : DEFAULT_VIEW;
    return { year, current, view, explicitYear: params.year !== undefined };
}

export async function generateMetadata({ searchParams }) {
    await connection();
    const { year, explicitYear } = await resolveParams(searchParams);
    const title = explicitYear
        ? `${year} F1 Season: Race Winners and Standings`
        : 'F1 History: World Champions and Season Results';
    const description = explicitYear
        ? `Every ${year} Formula 1 race winner with the final drivers' and constructors' standings.`
        : `Every Formula 1 world champion since ${FIRST_DRIVERS_CHAMPIONSHIP_YEAR}, with race winners and standings for each season.`;
    const path = explicitYear ? `/history?year=${year}` : '/history';
    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: { title, description, url: path },
    };
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(`${date}T00:00:00Z`));
}

function viewHref(year, view) {
    const params = new URLSearchParams({ year: String(year) });
    if (view !== DEFAULT_VIEW) params.set('view', view);
    return `/history?${params.toString()}`;
}

function personName(person) {
    return (
        <>
            {person.firstName} <strong>{person.lastName}</strong>
        </>
    );
}

function MaybeLink({ href, children }) {
    return href ? <Link href={href}>{children}</Link> : children;
}

async function RacesView({ year, lookups }) {
    const [summary, dates] = await Promise.all([getSeasonSummary(year), getRaceDates(year)]);
    if (summary.races.length === 0) {
        return <div className={standingsStyles.empty}><h3>No {year} races published yet</h3></div>;
    }
    const teamNames = new Map();
    for (const row of summary.driverStandings) if (row.team?.id) teamNames.set(row.team.id, row.team.name);
    for (const row of summary.constructorStandings) if (row.team?.id) teamNames.set(row.team.id, row.team.name);

    return (
        <div className={standingsStyles.tableWrap}>
            <table className={standingsStyles.table}>
                <caption>{year} race winners</caption>
                <thead>
                    <tr>
                        <th scope="col">Rd</th>
                        <th scope="col">Grand Prix</th>
                        <th scope="col" className={standingsStyles.hideSmall}>Date</th>
                        <th scope="col">Winner</th>
                        <th scope="col" className={standingsStyles.hideSmall}>Team</th>
                    </tr>
                </thead>
                <tbody>
                    {summary.races.map((race) => {
                        const date = dates.get(race.round) || race.date?.slice(0, 10) || null;
                        const winner = race.winner;
                        const teamId = winner?.constructorId;
                        return (
                            <tr key={race.round}>
                                <td className={standingsStyles.pos}>{race.round}</td>
                                <th scope="row">{race.raceName}</th>
                                <td className={`${standingsStyles.muted} ${standingsStyles.hideSmall}`}>
                                    {date ? <time dateTime={date}>{formatDate(date)}</time> : null}
                                </td>
                                <td className={standingsStyles.driverName}>
                                    {winner
                                        ? <MaybeLink href={lookups.driverHrefById.get(winner.driverId)}>{personName(winner)}</MaybeLink>
                                        : <span className={standingsStyles.muted}>-</span>}
                                </td>
                                <td className={`${standingsStyles.muted} ${standingsStyles.hideSmall}`}>
                                    {teamId && (
                                        <Link href={`/team/${encodeURIComponent(teamId)}`}>
                                            {lookups.nameById.get(teamId) || teamNames.get(teamId) || teamId}
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

async function DriversView({ year, lookups }) {
    const { standings, round } = await getDriverStandings(year);
    if (standings.length === 0) {
        return <div className={standingsStyles.empty}><h3>No {year} standings yet</h3></div>;
    }
    return (
        <DriverStandingsTable
            standings={standings}
            caption={`${year} Drivers' Championship${round ? `, after round ${round}` : ''}`}
            lookups={lookups}
        />
    );
}

async function ConstructorsView({ year, lookups }) {
    if (!hasConstructorsChampionship(year)) {
        return (
            <div className={standingsStyles.empty}>
                <h3>Constructors&apos; Championship</h3>
                <p>
                    First awarded in{' '}
                    <Link href={viewHref(FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR, 'constructors')}>
                        {FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR}
                    </Link>
                </p>
            </div>
        );
    }
    const { standings, round } = await getConstructorStandings(year);
    if (standings.length === 0) {
        return <div className={standingsStyles.empty}><h3>No {year} standings yet</h3></div>;
    }
    return (
        <ConstructorStandingsTable
            standings={standings}
            caption={`${year} Constructors' Championship${round ? `, after round ${round}` : ''}`}
            lookups={lookups}
        />
    );
}

function ChampionsTable({ champions, lookups }) {
    const constructorsByYear = new Map(champions.constructors.map((item) => [Number(item.year), item]));
    const rows = [...champions.drivers].sort((a, b) => b.year - a.year);
    return (
        <div className={standingsStyles.tableWrap}>
            <table className={standingsStyles.table}>
                <caption>World Champions</caption>
                <thead>
                    <tr>
                        <th scope="col">Season</th>
                        <th scope="col">Drivers&apos; Champion</th>
                        <th scope="col">Constructors&apos; Champion</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((driver) => {
                        const constructor = constructorsByYear.get(Number(driver.year));
                        return (
                            <tr key={driver.year}>
                                <th scope="row" className={standingsStyles.pos}>
                                    <Link href={viewHref(driver.year, DEFAULT_VIEW)}>{driver.year}</Link>
                                </th>
                                <td className={standingsStyles.driverName}>
                                    <MaybeLink href={lookups.driverHrefById.get(driver.driverId)}>{personName(driver)}</MaybeLink>
                                </td>
                                <td>
                                    {constructor ? (
                                        <Link href={`/team/${encodeURIComponent(constructor.constructorId)}`}>{constructor.name}</Link>
                                    ) : (
                                        <span className={standingsStyles.muted}>Not awarded</span>
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

export default async function HistoryPage({ searchParams }) {
    await connection();
    const { year, current, view } = await resolveParams(searchParams);
    const [champions, allLookups] = await Promise.all([
        getChampions(),
        loadCurrentSeasonLookups(current),
    ]);
    const lookups = lookupsForSeason(allLookups, year, current);
    const SeasonView = view === 'drivers' ? DriversView : view === 'constructors' ? ConstructorsView : RacesView;

    return (
        <div className={styles.history}>
            <header className={styles.header}>
                <div className="container">
                    <h1>F1 History</h1>
                    <YearPicker
                        action="/history"
                        year={year}
                        min={FIRST_DRIVERS_CHAMPIONSHIP_YEAR}
                        max={current}
                        extraParams={view === DEFAULT_VIEW ? {} : { view }}
                    />
                </div>
            </header>

            <section className={styles.content} aria-labelledby="season-heading">
                <div className="container">
                    <h2 id="season-heading" className={styles.sectionTitle}>{year} season</h2>
                    <nav aria-label={`${year} season views`} className={styles.views}>
                        {VIEWS.map(([key, label]) => (
                            <Link
                                key={key}
                                href={viewHref(year, key)}
                                className={`${styles.viewLink} ${key === view ? styles.active : ''}`}
                                aria-current={key === view ? 'page' : undefined}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                    <SeasonView year={year} lookups={lookups} />
                </div>
            </section>

            <section className={styles.content} aria-label="World Champions">
                <div className="container">
                    <ChampionsTable champions={champions} lookups={allLookups} />
                </div>
            </section>
        </div>
    );
}
