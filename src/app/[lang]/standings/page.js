import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import {
    FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR,
    FIRST_DRIVERS_CHAMPIONSHIP_YEAR,
    getConstructorStandings,
    getDriverStandings,
    hasConstructorsChampionship,
    parseSeasonYear,
} from '@/lib/f1/standings';
import { getSeasonYear } from '@/lib/f1/year';
import {
    ConstructorStandingsTable,
    DriverStandingsTable,
    standingsStyles,
    YearPicker,
} from './_components/StandingsTables';
import { loadCurrentSeasonLookups, lookupsForSeason } from './_components/lookups';
import styles from './page.module.css';

async function resolveYear(searchParams) {
    const { year: raw } = await searchParams;
    const current = getSeasonYear();
    const year = parseSeasonYear(raw, { current });
    if (year === null) notFound();
    return { year, current };
}

export async function generateMetadata({ searchParams }) {
    await connection();
    const { year, current } = await resolveYear(searchParams);
    const path = year === current ? '/standings' : `/standings?year=${year}`;
    const title = hasConstructorsChampionship(year)
        ? `${year} F1 Driver and Constructor Standings`
        : `${year} F1 Drivers' Championship Standings`;
    const description = hasConstructorsChampionship(year)
        ? `Formula 1 ${year} drivers' and constructors' championship standings: positions, points and wins.`
        : `Formula 1 ${year} drivers' championship standings: positions, points and wins.`;
    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: { title, description, url: path },
    };
}

export default async function StandingsPage({ searchParams }) {
    await connection();
    const { year, current } = await resolveYear(searchParams);
    const showConstructors = hasConstructorsChampionship(year);

    const [drivers, constructors, lookups] = await Promise.all([
        getDriverStandings(year),
        showConstructors ? getConstructorStandings(year) : null,
        loadCurrentSeasonLookups(current),
    ]);
    const tableLookups = lookupsForSeason(lookups, year, current);
    const started = drivers.standings.length > 0;
    const previous = year - 1;

    return (
        <div className={styles.standings}>
            <header className={styles.header}>
                <div className="container">
                    <h1>{year} Standings</h1>
                    {started && drivers.round && <p>After round {drivers.round}</p>}
                    <YearPicker action="/standings" year={year} min={FIRST_DRIVERS_CHAMPIONSHIP_YEAR} max={current} />
                </div>
            </header>

            <div className={styles.content}>
                <div className="container">
                    {!started ? (
                        <section className={standingsStyles.empty} aria-labelledby="no-standings">
                            <h2 id="no-standings">No {year} standings yet</h2>
                            {previous >= FIRST_DRIVERS_CHAMPIONSHIP_YEAR && (
                                <Link href={`/standings?year=${previous}`}>{previous} final standings</Link>
                            )}
                        </section>
                    ) : (
                        <div className={styles.grid}>
                            <section aria-label="Drivers' championship">
                                <DriverStandingsTable
                                    standings={drivers.standings}
                                    caption={`${year} Drivers' Championship`}
                                    lookups={tableLookups}
                                />
                            </section>
                            <section aria-label="Constructors' championship">
                                {showConstructors ? (
                                    constructors.standings.length > 0 ? (
                                        <ConstructorStandingsTable
                                            standings={constructors.standings}
                                            caption={`${year} Constructors' Championship`}
                                            lookups={tableLookups}
                                        />
                                    ) : (
                                        <div className={standingsStyles.empty}>
                                            <h2>No {year} constructors&apos; standings yet</h2>
                                        </div>
                                    )
                                ) : (
                                    <div className={standingsStyles.empty}>
                                        <h2>Constructors&apos; Championship</h2>
                                        <p>
                                            First awarded in{' '}
                                            <Link href={`/standings?year=${FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR}`}>
                                                {FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR}
                                            </Link>
                                        </p>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
