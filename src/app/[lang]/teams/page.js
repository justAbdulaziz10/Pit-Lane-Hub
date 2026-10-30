import Link from 'next/link';
import { connection } from 'next/server';
import { getGrid } from '@/lib/f1/drivers';
import { currentGridDrivers, getConstructorStandings } from '@/lib/f1/standings';
import { getTeams } from '@/lib/f1/teams';
import { getSeasonYear } from '@/lib/f1/year';
import { getHighQualityPhoto } from '@/lib/photos';
import { DriverPortrait } from '@/components/DriverCard';
import { driverPath } from '@/app/[lang]/driver/[number]/driver-data';
import { fill, pick } from '@/lib/i18n/messages';
import teamsMessages from '@/lib/i18n/messages/teams';
import { formatNumber } from '@/lib/i18n/format';
import { localePath } from '@/lib/i18n/config';
import styles from './page.module.css';

// Metadata lives in ./layout.js.

function DriverRow({ driver, lang }) {
    const photo = getHighQualityPhoto(driver.headshot);
    const number = driver.racingNumber ?? driver.number;
    const key = number ?? driver.driverId;
    const content = (
        <>
            <DriverPortrait
                src={photo || driver.headshot}
                alt=""
                width={80}
                height={80}
                className={styles.driverPhoto}
                imgClassName={styles.driverImage}
                fallbackClassName={styles.driverPhotoPlaceholder}
                loading="lazy"
            >
                <bdi dir="ltr" aria-hidden="true">
                    {(driver.code || `${driver.firstName?.[0] || ''}${driver.lastName?.[0] || ''}`).toUpperCase()}
                </bdi>
            </DriverPortrait>
            <span className={styles.driverDetails}>
                <bdi dir="ltr" className={styles.driverName}>
                    {driver.firstName} <strong>{driver.lastName}</strong>
                </bdi>
                {number != null && <span className={styles.driverNumber}><bdi dir="ltr">#{formatNumber(lang, number)}</bdi></span>}
            </span>
        </>
    );
    const href = driverPath(driver);
    if (!href || key == null) return <li className={styles.driverRow}>{content}</li>;
    return (
        <li>
            <Link href={localePath(lang, href)} className={styles.driverRow}>{content}</Link>
        </li>
    );
}

export default async function TeamsPage({ params }) {
    await connection();
    const { lang } = await params;
    const t = pick(teamsMessages, lang);
    const year = getSeasonYear();
    const [titleBefore = '', titleAfter = ''] = t.pageTitle.split('{year}');
    const [teams, constructorStandings, grid] = await Promise.all([
        getTeams(year),
        getConstructorStandings(year).catch(() => ({ standings: [], round: null })),
        getGrid(year).catch(() => []),
    ]);
    const standingById = new Map(constructorStandings.standings.map((row) => [row.team.id, row]));
    const ordered = [...teams].sort((a, b) => {
        const posA = standingById.get(a.constructorId)?.position ?? Infinity;
        const posB = standingById.get(b.constructorId)?.position ?? Infinity;
        return posA - posB || a.name.localeCompare(b.name);
    });

    return (
        <div className={styles.teams}>
            <header className={`page-hero ${styles.header}`}>
                <div className="page-hero__content container">
                    <h1 className="page-hero__title">
                        {titleBefore ? <span className="page-hero__accent">{titleBefore}</span> : null}
                        <bdi dir="ltr">{formatNumber(lang, year, { useGrouping: false })}</bdi>
                        {titleAfter ? <span className="page-hero__accent">{titleAfter}</span> : null}
                    </h1>
                    {constructorStandings.round && <p className="page-hero__subline">{fill(t.afterRound, { round: formatNumber(lang, constructorStandings.round) })}</p>}
                </div>
            </header>

            <div className={styles.content}>
                <div className="container">
                    {ordered.length === 0 ? (
                        <p className={styles.empty}>{fill(t.noTeams, { year: formatNumber(lang, year, { useGrouping: false }) })}</p>
                    ) : (
                        <ul className={styles.teamsGrid} role="list">
                            {ordered.map((team) => {
                                const standing = standingById.get(team.constructorId);
                                const position = standing
                                    ? (standing.position == null ? standing.positionText : formatNumber(lang, standing.position))
                                    : null;
                                return (
                                    <li key={team.constructorId} className={`${styles.teamCard} rich-card team-accent`} style={{ '--team-color': team.color }}>
                                        <div className={styles.teamColorBar} aria-hidden="true"></div>
                                        {standing && (
                                            <div className={styles.teamHeader}>
                                                <span className={styles.teamPosition}><bdi dir="ltr">P{position}</bdi></span>
                                                <span className={styles.teamPoints}>
                                                    <span className={`${styles.pointsValue} stat-number`}><bdi dir="ltr">{formatNumber(lang, standing.points)}</bdi></span>
                                                    <span className={`${styles.pointsLabel} stat-label`}><span aria-hidden="true">🏆</span>{t.statPoints}</span>
                                                </span>
                                            </div>
                                        )}
                                        <h2 className={styles.teamName}>
                                            <Link href={localePath(lang, `/team/${encodeURIComponent(team.constructorId)}`)}><bdi dir="auto">{team.name}</bdi></Link>
                                        </h2>
                                        <ul className={styles.driversList} aria-label={fill(t.teamDrivers, { team: team.name })}>
                                            {currentGridDrivers(team, grid).map((driver) => (
                                                <DriverRow key={driver.driverId || driver.racingNumber} driver={driver} lang={lang} />
                                            ))}
                                        </ul>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
