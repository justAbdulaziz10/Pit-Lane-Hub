import Link from 'next/link';
import { localePath } from '@/lib/i18n/config';
import { fill, pick } from '@/lib/i18n/messages';
import standingsMessages from '@/lib/i18n/messages/standings';
import { formatNumber } from '@/lib/i18n/format';
import styles from './standings.module.css';

const EMPTY_LOOKUPS = { colorById: new Map(), nameById: new Map(), driverHrefById: new Map() };

function formatPoints(points, lang) {
    return formatNumber(lang, points, { maximumFractionDigits: 2 });
}

function teamName(team, lookups) {
    return lookups.nameById.get(team.id) || team.name;
}

function DriverName({ driver, href, lang }) {
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
            <Link href={localePath(lang, `/team/${encodeURIComponent(team.id)}`)}>{teamName(team, lookups)}</Link>
        </span>
    ));
}

export function DriverStandingsTable({ standings, caption, lookups = EMPTY_LOOKUPS, lang = 'en' }) {
    const t = pick(standingsMessages, lang);
    return (
        <div className={styles.tableWrap}>
            <table className={styles.table}>
                <caption>{caption}</caption>
                <thead>
                    <tr>
                        <th scope="col">{t.positionShort}</th>
                        <th scope="col">{t.driver}</th>
                        <th scope="col" className={styles.hideSmall}>{t.team}</th>
                        <th scope="col" className={styles.num}>{t.statWins}</th>
                        <th scope="col" className={styles.num}>{t.statPoints}</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((row) => {
                        const color = row.teams[0] ? lookups.colorById.get(row.teams[0].id) : null;
                        return (
                            <tr key={row.driver.id} style={color ? { '--team-color': color } : undefined}>
                                <td className={styles.pos}><bdi dir="ltr">{row.position == null ? row.positionText || '-' : formatNumber(lang, row.position)}</bdi></td>
                                <th scope="row">
                                    {row.driver.code && <span className={styles.code}><bdi dir="ltr">{row.driver.code}</bdi></span>}
                                    <DriverName driver={row.driver} href={lookups.driverHrefById.get(row.driver.id)} lang={lang} />
                                </th>
                                <td className={`${styles.muted} ${styles.hideSmall}`}>
                                    <TeamLinks teams={row.teams} lookups={lookups} lang={lang} />
                                </td>
                                <td className={styles.num}><bdi dir="ltr">{formatNumber(lang, row.wins)}</bdi></td>
                                <td className={`${styles.num} ${styles.points}`}><bdi dir="ltr">{formatPoints(row.points, lang)}</bdi></td>
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
    return (
        <div className={styles.tableWrap}>
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
                                    <Link href={localePath(lang, `/team/${encodeURIComponent(row.team.id)}`)}>{teamName(row.team, lookups)}</Link>
                                </th>
                                <td className={styles.num}><bdi dir="ltr">{formatNumber(lang, row.wins)}</bdi></td>
                                <td className={`${styles.num} ${styles.points}`}><bdi dir="ltr">{formatPoints(row.points, lang)}</bdi></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/** Season selector that works without client JS: a GET form plus previous/next links. */
export function YearPicker({ action, year, min, max, extraParams = {}, lang = 'en' }) {
    const t = pick(standingsMessages, lang);
    const years = [];
    for (let value = max; value >= min; value -= 1) years.push(value);
    const hrefFor = (value) => {
        const params = new URLSearchParams({ ...extraParams, year: String(value) });
        return localePath(lang, `${action}?${params.toString()}`);
    };
    return (
        <form className={styles.picker} action={localePath(lang, action)} method="get">
            {year > min && (
                <Link className={styles.stepLink} href={hrefFor(year - 1)} aria-label={fill(t.previousSeason, { year: formatNumber(lang, year - 1, { useGrouping: false }) })}>
                    <bdi dir="ltr">{formatNumber(lang, year - 1, { useGrouping: false })}</bdi>
                </Link>
            )}
            <label htmlFor="season-year">{t.season}</label>
            <select id="season-year" name="year" defaultValue={String(year)}>
                {years.map((value) => <option key={value} value={value}>{formatNumber(lang, value, { useGrouping: false })}</option>)}
            </select>
            {Object.entries(extraParams).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button type="submit">{t.show}</button>
            {year < max && (
                <Link className={styles.stepLink} href={hrefFor(year + 1)} aria-label={fill(t.nextSeason, { year: formatNumber(lang, year + 1, { useGrouping: false }) })}>
                    <bdi dir="ltr">{formatNumber(lang, year + 1, { useGrouping: false })}</bdi>
                </Link>
            )}
        </form>
    );
}

export { styles as standingsStyles };
