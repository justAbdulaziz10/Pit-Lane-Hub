import Link from 'next/link';
import styles from './standings.module.css';

const EMPTY_LOOKUPS = { colorById: new Map(), nameById: new Map(), driverHrefById: new Map() };

function formatPoints(points) {
    return Number.isInteger(points) ? String(points) : points.toFixed(2).replace(/0+$/, '');
}

function teamName(team, lookups) {
    return lookups.nameById.get(team.id) || team.name;
}

function DriverName({ driver, href }) {
    const name = (
        <span className={styles.driverName}>
            {driver.firstName} <strong>{driver.lastName}</strong>
        </span>
    );
    return href ? <Link href={href}>{name}</Link> : name;
}

function TeamLinks({ teams, lookups }) {
    return teams.map((team, index) => (
        <span key={team.id}>
            {index > 0 && ' / '}
            <Link href={`/team/${encodeURIComponent(team.id)}`}>{teamName(team, lookups)}</Link>
        </span>
    ));
}

export function DriverStandingsTable({ standings, caption, lookups = EMPTY_LOOKUPS }) {
    return (
        <div className={styles.tableWrap}>
            <table className={styles.table}>
                <caption>{caption}</caption>
                <thead>
                    <tr>
                        <th scope="col">Pos</th>
                        <th scope="col">Driver</th>
                        <th scope="col" className={styles.hideSmall}>Team</th>
                        <th scope="col" className={styles.num}>Wins</th>
                        <th scope="col" className={styles.num}>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((row) => {
                        const color = row.teams[0] ? lookups.colorById.get(row.teams[0].id) : null;
                        return (
                            <tr key={row.driver.id} style={color ? { '--team-color': color } : undefined}>
                                <td className={styles.pos}>{row.position ?? row.positionText ?? '-'}</td>
                                <th scope="row">
                                    {row.driver.code && <span className={styles.code}>{row.driver.code}</span>}
                                    <DriverName driver={row.driver} href={lookups.driverHrefById.get(row.driver.id)} />
                                </th>
                                <td className={`${styles.muted} ${styles.hideSmall}`}>
                                    <TeamLinks teams={row.teams} lookups={lookups} />
                                </td>
                                <td className={styles.num}>{row.wins}</td>
                                <td className={`${styles.num} ${styles.points}`}>{formatPoints(row.points)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function ConstructorStandingsTable({ standings, caption, lookups = EMPTY_LOOKUPS }) {
    return (
        <div className={styles.tableWrap}>
            <table className={styles.table}>
                <caption>{caption}</caption>
                <thead>
                    <tr>
                        <th scope="col">Pos</th>
                        <th scope="col">Team</th>
                        <th scope="col" className={styles.num}>Wins</th>
                        <th scope="col" className={styles.num}>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((row) => {
                        const color = lookups.colorById.get(row.team.id);
                        return (
                            <tr key={row.team.id} style={color ? { '--team-color': color } : undefined}>
                                <td className={styles.pos}>{row.position ?? row.positionText ?? '-'}</td>
                                <th scope="row">
                                    <Link href={`/team/${encodeURIComponent(row.team.id)}`}>{teamName(row.team, lookups)}</Link>
                                </th>
                                <td className={styles.num}>{row.wins}</td>
                                <td className={`${styles.num} ${styles.points}`}>{formatPoints(row.points)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/** Season selector that works without client JS: a GET form plus previous/next links. */
export function YearPicker({ action, year, min, max, extraParams = {} }) {
    const years = [];
    for (let value = max; value >= min; value -= 1) years.push(value);
    const hrefFor = (value) => {
        const params = new URLSearchParams({ ...extraParams, year: String(value) });
        return `${action}?${params.toString()}`;
    };
    return (
        <form className={styles.picker} action={action} method="get">
            {year > min && (
                <Link className={styles.stepLink} href={hrefFor(year - 1)} aria-label={`${year - 1} season`}>
                    {year - 1}
                </Link>
            )}
            <label htmlFor="season-year">Season</label>
            <select id="season-year" name="year" defaultValue={String(year)}>
                {years.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            {Object.entries(extraParams).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button type="submit">Show</button>
            {year < max && (
                <Link className={styles.stepLink} href={hrefFor(year + 1)} aria-label={`${year + 1} season`}>
                    {year + 1}
                </Link>
            )}
        </form>
    );
}

export { styles as standingsStyles };
