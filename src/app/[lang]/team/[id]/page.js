import { metadataOrNotFound } from '@/lib/i18n/metadata';
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
import { driverPath } from '@/app/[lang]/driver/[number]/driver-data';
import { getSeasonYear } from '@/lib/f1/year';
import { getHighQualityPhoto } from '@/lib/photos';
import { jsonLdScript } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';
import { DriverPortrait } from '@/components/DriverCard';
import { fill, pick } from '@/lib/i18n/messages';
import teamsMessages from '@/lib/i18n/messages/teams';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { nationalityName } from '@/lib/i18n/f1-names';
import { viewHref } from '@/app/[lang]/history/history-utils';
import styles from './page.module.css';

async function loadTeam(params) {
    const { id } = await params;
    const info = await getConstructor(id);
    if (!info) notFound();
    const year = getSeasonYear();
    const [currentTeams, currentGrid] = await Promise.all([
        getTeams(year).catch(() => null),
        getGrid(year).catch(() => null),
    ]);
    const team = currentTeams?.find((item) => item.constructorId === info.constructorId) || null;
    const current = team && currentGrid ? { ...team, drivers: currentGridDrivers(team, currentGrid) } : null;
    return { id: info.constructorId, info, year, current, name: current?.name || info.name };
}

export async function generateMetadata({ params }) {
    await connection();
    const { lang } = await params;
    return metadataOrNotFound(lang, async () => {
        const { id, name, current } = await loadTeam(params);
        const t = pick(teamsMessages, lang);
        const path = `/team/${encodeURIComponent(id)}`;
        const title = fill(t.metadataDetailTitle, { name });
        const description = fill(current ? t.currentTeamDescription : t.historicalTeamDescription, { name });
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
    });
}

export default async function TeamDetailPage({ params }) {
    await connection();
    const { lang } = await params;
    const t = pick(teamsMessages, lang);
    const { id, info, year, current, name } = await loadTeam(params);
    // Records degrade to a dash when the results service is throttled, instead of failing the page.
    const [record, champions, constructorStandings] = await Promise.all([
        getConstructorRecord(id).catch(() => null),
        getChampions().catch(() => null),
        getConstructorStandings(year).catch(() => ({ standings: [] })),
    ]);
    const titleYears = constructorChampionshipYears(champions, id);
    const standing = constructorStandings.standings.find((row) => row.team.id === id) || null;
    const stat = (value) => (Number.isFinite(value) ? formatNumber(lang, value) : '—');
    const position = standing
        ? (standing.position == null ? standing.positionText : formatNumber(lang, standing.position))
        : null;
    const drivers = current?.drivers || [];

    const teamJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SportsTeam',
        name,
        sport: 'Formula 1',
        inLanguage: lang,
        url: `${SITE_URL}${localePath(lang, `/team/${encodeURIComponent(id)}`)}`,
        ...(info.url ? { sameAs: [info.url] } : {}),
        ...(drivers.length > 0 ? {
            athlete: drivers.map((driver) => ({
                '@type': 'Person',
                name: driver.fullName || `${driver.firstName} ${driver.lastName}`.trim(),
                ...(driverPath(driver) ? { url: `${SITE_URL}${localePath(lang, driverPath(driver))}` } : {}),
            })),
        } : {}),
    };

    return (
        <div className={styles.teamDetail} style={current ? { '--team-color': current.color } : undefined}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(teamJsonLd) }} />

            <div className={styles.hero}>
                <div className={styles.heroBackground} aria-hidden="true"></div>
                <div className={styles.heroContent}>
                    <Link href={localePath(lang, '/teams')} className={styles.backLink}>{t.allTeams}</Link>
                    <span className={styles.colorStripe} aria-hidden="true"></span>
                    <h1><bdi dir="auto">{name}</bdi></h1>
                    {info.nationality && <p className={styles.nationality}>{nationalityName(info.nationality, lang)}</p>}
                </div>
            </div>

            {standing && (
                <section className={styles.statsSection} aria-labelledby="season-heading">
                    <div className="container">
                        <h2 id="season-heading" className={styles.sectionTitle}>
                            <Link href={localePath(lang, '/standings')}>{fill(t.season, { year: formatNumber(lang, year, { useGrouping: false }) })}</Link>
                        </h2>
                        <dl className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <dt className={styles.statLabel}>{t.position}</dt>
                                <dd className={styles.statValue}><bdi dir="ltr">P{position}</bdi></dd>
                            </div>
                            <div className={styles.statCard}>
                                <dt className={styles.statLabel}>{t.statPoints}</dt>
                                <dd className={styles.statValue}><bdi dir="ltr">{formatNumber(lang, standing.points)}</bdi></dd>
                            </div>
                            <div className={styles.statCard}>
                                <dt className={styles.statLabel}>{t.statWins}</dt>
                                <dd className={styles.statValue}><bdi dir="ltr">{formatNumber(lang, standing.wins)}</bdi></dd>
                            </div>
                        </dl>
                    </div>
                </section>
            )}

            {drivers.length > 0 && (
                <section className={styles.section} aria-labelledby="drivers-heading">
                    <div className="container">
                        <h2 id="drivers-heading" className={styles.sectionTitle}>{fill(t.seasonDrivers, { year: formatNumber(lang, year, { useGrouping: false }) })}</h2>
                        <ul className={styles.driversGrid}>
                            {drivers.map((driver) => {
                                const href = driverPath(driver);
                                const number = driver.racingNumber ?? driver.number;
                                const content = (
                                    <>
                                        <DriverPortrait
                                            src={getHighQualityPhoto(driver.headshot)}
                                            alt={driver.fullName || `${driver.firstName} ${driver.lastName}`.trim()}
                                            width={80}
                                            height={80}
                                            className={styles.driverPortrait}
                                            imgClassName={styles.driverImage}
                                            fallbackClassName={styles.driverFallback}
                                            loading="lazy"
                                        >
                                            <bdi dir="ltr">{(driver.code || `${driver.firstName?.[0] || ''}${driver.lastName?.[0] || ''}`).toUpperCase()}</bdi>
                                        </DriverPortrait>
                                        <span className={styles.driverNumber}><bdi dir="ltr">{number == null ? '' : formatNumber(lang, number)}</bdi></span>
                                        <bdi dir="ltr" className={styles.driverName}>
                                            {driver.firstName} <strong>{driver.lastName}</strong>
                                        </bdi>
                                    </>
                                );
                                return (
                                    <li key={driver.driverId || number}>
                                        {href
                                            ? <Link href={localePath(lang, href)} className={styles.driverCard}>{content}</Link>
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
                    <h2 id="history-heading" className={styles.sectionTitle}>{t.allTimeRecord}</h2>
                    <dl className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <dt className={styles.statLabel}>{t.constructorTitles}</dt>
                            <dd className={styles.statValue}><bdi dir="ltr">{stat(champions ? titleYears.length : null)}</bdi></dd>
                        </div>
                        <div className={styles.statCard}>
                            <dt className={styles.statLabel}>{t.raceWins}</dt>
                            <dd className={styles.statValue}><bdi dir="ltr">{stat(record?.wins)}</bdi></dd>
                        </div>
                        <div className={styles.statCard}>
                            <dt className={styles.statLabel}>{t.grandsPrix}</dt>
                            <dd className={styles.statValue}><bdi dir="ltr">{stat(record?.races)}</bdi></dd>
                        </div>
                        <div className={styles.statCard}>
                            <dt className={styles.statLabel}>{t.statSeasons}</dt>
                            <dd className={styles.statValue}><bdi dir="ltr">{stat(record?.seasons)}</bdi></dd>
                        </div>
                    </dl>
                    {titleYears.length > 0 && (
                        <>
                            <h3 className={styles.subTitle}>{t.championshipSeasons}</h3>
                            <ul className={styles.yearList}>
                                {titleYears.map((titleYear) => (
                                    <li key={titleYear}>
                                        <Link href={viewHref(titleYear, 'races', lang)}><bdi dir="ltr">{formatNumber(lang, titleYear, { useGrouping: false })}</bdi></Link>
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
