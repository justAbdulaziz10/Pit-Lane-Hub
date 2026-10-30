import Link from 'next/link';
import { localePath } from '@/lib/i18n/config';
import { pick } from '@/lib/i18n/messages';
import standingsMessages from '@/lib/i18n/messages/standings';
import { formatNumber } from '@/lib/i18n/format';
import { driverPath } from '@/app/[lang]/driver/[number]/driver-data';
import styles from './standings.module.css';

const EMPTY_LOOKUPS = { colorById: new Map(), nameById: new Map() };

function formatPoints(points, lang) {
    return formatNumber(lang, points, { maximumFractionDigits: 2 });
}

function teamName(team, lookups) {
    return lookups.nameById.get(team.id) || team.name;
}

function DriverName({ driver, lang }) {
    const href = driverPath({ driverId: driver.id });
    const name = (
            <bdi dir="ltr" className={styles.driverName}>
            {driver.firstName} <strong>{driver.lastName}</strong>
            </bdi>
    );
    return href ? <Link href={localePath(lang, href)}>{name}</Link> : name;
}

function TeamLinks({ teams, lookups, lang }) {
    return teams.map((team, index) => (
        <span key={team.id}>
            {index > 0 && ' / '}
            <Link href={localePath(lang, `/team/${encodeURIComponent(team.id)}`)}><bdi dir="auto">{teamName(team, lookups)}</bdi></Link>
        </span>
    ));
}

export function DriverStandingsTable({ standings, caption, lookups = EMPTY_LOOKUPS, lang = 'en' }) {
    const t = pick(standingsMessages, lang);
    const leaderPoints = standings[0]?.points ?? null;
    return (
        <div className={`${styles.tableWrap} rich-card`}>
            <table className={styles.table}>
                <caption>{caption}</caption>
                <thead>
                    <tr>
                        <th scope="col">{t.positionShort}</th>
                        <th scope="col">{t.driver}</th>
                        <th scope="col" className={styles.hideSmall}>{t.team}</th>
                        <th scope="col" className={`${styles.num} ${styles.hideMobile}`}>{t.statWins}</th>
                        <th scope="col" className={styles.num}>{t.statPoints}</th>
                        <th scope="col" className={styles.num}>{t.gapToLeader}</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((row) => {
                        const color = row.teams[0] ? lookups.colorById.get(row.teams[0].id) : null;
                        return (
                            <tr key={row.driver.id} style={color ? { '--team-color': color } : undefined}>
                                <td className={styles.pos}><bdi dir="ltr">{row.position == null ? row.positionText || '-' : formatNumber(lang, row.position)}</bdi></td>
                                <th scope="row">
                                    {row.driver.code && <span className={`${styles.code} ${styles.hideSmall}`}><bdi dir="ltr">{row.driver.code}</bdi></span>}
                                    <DriverName driver={row.driver} lang={lang} />
                                </th>
                                <td className={`${styles.muted} ${styles.hideSmall}`}>
                                    <TeamLinks teams={row.teams} lookups={lookups} lang={lang} />
                                </td>
                                <td className={`${styles.num} ${styles.hideMobile}`}><bdi dir="ltr">{formatNumber(lang, row.wins)}</bdi></td>
                                <td className={`${styles.num} ${styles.points}`}><bdi dir="ltr">{formatPoints(row.points, lang)}</bdi></td>
                                <td className={`${styles.num} ${styles.gap}`}>
                                    <bdi dir="ltr">{leaderPoints === null ? '—' : row.points === leaderPoints ? formatPoints(0, lang) : `−${formatPoints(leaderPoints - row.points, lang)}`}</bdi>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function ConstructorStandingsTable({ standings, caption, lookups = EMPTY_LOOKUPS, lang = 'en' }) {
    const t = pick(standingsMessages, lang);
    const tiedPoints = new Set(standings
        .filter((row, index) => standings.some((other, otherIndex) => otherIndex !== index && other.points === row.points))
        .map((row) => row.team.id));
    return (
        <div className={`${styles.tableWrap} rich-card`}>
            <table className={styles.table}>
                <caption>{caption}</caption>
                <thead>
                    <tr>
                        <th scope="col">{t.positionShort}</th>
                        <th scope="col">{t.team}</th>
                        <th scope="col" className={styles.num}>{t.statWins}</th>
                        <th scope="col" className={styles.num}>{t.statPoints}</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((row) => {
                        const color = lookups.colorById.get(row.team.id);
                        return (
                            <tr key={row.team.id} style={color ? { '--team-color': color } : undefined}>
                                <td className={styles.pos}><bdi dir="ltr">{row.position == null ? row.positionText || '-' : formatNumber(lang, row.position)}</bdi></td>
                                <th scope="row">
                                    <Link href={localePath(lang, `/team/${encodeURIComponent(row.team.id)}`)}><bdi dir="auto">{teamName(row.team, lookups)}</bdi></Link>
                                </th>
                                <td className={styles.num}><bdi dir="ltr">{formatNumber(lang, row.wins)}</bdi></td>
                                <td className={`${styles.num} ${styles.points}`}>
                                    <bdi dir="ltr">{formatPoints(row.points, lang)}</bdi>
                                    {tiedPoints.has(row.team.id) ? <abbr className={styles.tieMark} title={t.tiedOnPoints} aria-label={t.tiedOnPoints}>†</abbr> : null}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export { styles as standingsStyles };
