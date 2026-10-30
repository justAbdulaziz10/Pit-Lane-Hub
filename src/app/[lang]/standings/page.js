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
import { fill, pick } from '@/lib/i18n/messages';
import standingsMessages from '@/lib/i18n/messages/standings';
import { formatNumber } from '@/lib/i18n/format';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import { driverPath } from '@/app/[lang]/driver/[number]/driver-data';
import {
    ConstructorStandingsTable,
    DriverStandingsTable,
    standingsStyles,
} from './_components/StandingsTables';
import YearPicker from './_components/YearPicker';
import { loadCurrentSeasonLookups, lookupsForSeason } from './_components/lookups';
import styles from './page.module.css';

async function resolveYear(searchParams) {
    const { year: raw } = await searchParams;
    const current = getSeasonYear();
    const year = parseSeasonYear(raw, { current });
    if (year === null) notFound();
    return { year, current, explicitYear: raw !== undefined };
}

export async function generateMetadata({ params, searchParams }) {
    await connection();
    const { lang } = await params;
    const t = pick(standingsMessages, lang);
    const { year, current, explicitYear } = await resolveYear(searchParams);
    const path = explicitYear ? `/standings?year=${year}` : '/standings';
    const title = hasConstructorsChampionship(year)
        ? fill(t.metadataTitleBoth, { year: formatNumber(lang, year, { useGrouping: false }) })
        : fill(t.metadataTitleDrivers, { year: formatNumber(lang, year, { useGrouping: false }) });
    const description = hasConstructorsChampionship(year)
        ? fill(t.metadataDescriptionBoth, { year: formatNumber(lang, year, { useGrouping: false }) })
        : fill(t.metadataDescriptionDrivers, { year: formatNumber(lang, year, { useGrouping: false }) });
    return {
        title,
        description,
        alternates: localeAlternates(lang, path),
        openGraph: {
            title,
            description,
            url: localePath(lang, path),
            images: [localePath(lang, '/opengraph-image')],
            locale: 'en_US',
        },
    };
}

export default async function StandingsPage({ params, searchParams }) {
    await connection();
    const { lang } = await params;
    const t = pick(standingsMessages, lang);
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
    const [titleBefore = '', titleAfter = ''] = t.pageTitle.split('{year}');

    return (
        <div className={styles.standings}>
            <header className={`page-hero ${styles.header}`}>
                <div className="page-hero__content container">
                    <p className="page-hero__badge"><span aria-hidden="true">🏆</span>{t.driversChampionship}</p>
                    <h1 className="page-hero__title">
                        {titleBefore ? <span className="page-hero__accent">{titleBefore}</span> : null}
                        <bdi dir="ltr">{formatNumber(lang, year, { useGrouping: false })}</bdi>
                        {titleAfter ? <span className="page-hero__accent">{titleAfter}</span> : null}
                    </h1>
                    {started && drivers.round && <p className="page-hero__subline">{fill(t.afterRound, { round: formatNumber(lang, drivers.round) })}</p>}
                    <YearPicker action="/standings" year={year} min={FIRST_DRIVERS_CHAMPIONSHIP_YEAR} max={current} lang={lang} />
                </div>
            </header>

            <div className={styles.content}>
                <div className="container">
                    {!started ? (
                        <section className={standingsStyles.empty} aria-labelledby="no-standings">
                            <h2 id="no-standings">{fill(t.noStandings, { year: formatNumber(lang, year, { useGrouping: false }) })}</h2>
                            {previous >= FIRST_DRIVERS_CHAMPIONSHIP_YEAR && (
                                <Link href={localePath(lang, `/standings?year=${previous}`)}>{fill(t.previousFinal, { year: formatNumber(lang, previous, { useGrouping: false }) })}</Link>
                            )}
                        </section>
                    ) : (
                        <>
                            <section className={styles.podium} aria-label={t.driversChampionship}>
                                {drivers.standings.slice(0, 3).map((row, index) => {
                                    const team = row.teams[0];
                                    const teamColor = team ? tableLookups.colorById.get(team.id) : null;
                                    const name = `${row.driver.firstName} ${row.driver.lastName}`.trim();
                                    const href = driverPath({ driverId: row.driver.id });
                                    const card = (
                                        <article
                                            key={row.driver.id}
                                            className={`${styles.podiumCard} ${styles[`podium${index + 1}`]} rich-card team-accent`}
                                            style={teamColor ? { '--team-color': teamColor } : undefined}
                                        >
                                            <span className={styles.podiumRank} aria-hidden="true">{['🥇', '🥈', '🥉'][index]}</span>
                                            {row.driver.code ? <bdi className={styles.podiumCode} dir="ltr">{row.driver.code}</bdi> : null}
                                            <h2>{href ? <Link href={localePath(lang, href)}><bdi dir="ltr">{name}</bdi></Link> : <bdi dir="ltr">{name}</bdi>}</h2>
                                            <p className={styles.podiumTeam}>{team ? tableLookups.nameById.get(team.id) || team.name : '—'}</p>
                                            <dl className={styles.podiumStats}>
                                                <div>
                                                    <dt className="stat-label">{t.statPoints}</dt>
                                                    <dd className="stat-number"><bdi dir="ltr">{formatNumber(lang, row.points)}</bdi></dd>
                                                </div>
                                                <div>
                                                    <dt className="stat-label">{t.statWins}</dt>
                                                    <dd className={styles.podiumWins}><bdi dir="ltr">{formatNumber(lang, row.wins)}</bdi></dd>
                                                </div>
                                            </dl>
                                        </article>
                                    );
                                    return card;
                                })}
                            </section>

                            <div className={styles.grid}>
                                <section aria-label={t.driversChampionship}>
                                    <DriverStandingsTable
                                        standings={drivers.standings}
                                        caption={fill(t.driversChampionshipCaption, { year: formatNumber(lang, year, { useGrouping: false }) })}
                                        lookups={tableLookups}
                                        lang={lang}
                                    />
                                </section>
                                <section aria-label={t.constructorsChampionship}>
                                    {showConstructors ? (
                                        constructors.standings.length > 0 ? (
                                            <ConstructorStandingsTable
                                                standings={constructors.standings}
                                                caption={fill(t.constructorsChampionshipCaption, { year: formatNumber(lang, year, { useGrouping: false }) })}
                                                lookups={tableLookups}
                                                lang={lang}
                                            />
                                        ) : (
                                            <div className={standingsStyles.empty}>
                                                <h2>{fill(t.constructorsStandingsMissing, { year: formatNumber(lang, year, { useGrouping: false }) })}</h2>
                                            </div>
                                        )
                                    ) : (
                                        <div className={standingsStyles.empty}>
                                            <h2>{t.constructorsChampionshipTitle}</h2>
                                            <p>
                                                {t.firstAwarded}{' '}
                                                <Link href={localePath(lang, `/standings?year=${FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR}`)}>
                                                    <bdi dir="ltr">{formatNumber(lang, FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR, { useGrouping: false })}</bdi>
                                                </Link>
                                            </p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
