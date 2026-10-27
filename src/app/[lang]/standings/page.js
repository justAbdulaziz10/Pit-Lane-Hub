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

export async function generateMetadata({ params, searchParams }) {
    await connection();
    const { lang } = await params;
    const t = pick(standingsMessages, lang);
    const { year, current } = await resolveYear(searchParams);
    const path = year === current ? '/standings' : `/standings?year=${year}`;
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
        openGraph: { title, description, url: localePath(lang, path), locale: lang === 'ar' ? 'ar_SA' : 'en_US' },
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

    return (
        <div className={styles.standings}>
            <header className={styles.header}>
                <div className="container">
                    <h1>{fill(t.pageTitle, { year: formatNumber(lang, year, { useGrouping: false }) })}</h1>
                    {started && drivers.round && <p>{fill(t.afterRound, { round: formatNumber(lang, drivers.round) })}</p>}
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
                    )}
                </div>
            </div>
        </div>
    );
}
