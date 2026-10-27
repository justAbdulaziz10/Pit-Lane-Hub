import { fastestLapOf, gapText } from '@/lib/f1/results';
import Link from 'next/link';
import styles from './page.module.css';

export function DriverName({ driver, links }) {
    const number = links?.drivers?.[driver.id];
    const name = (
        <>
            {driver.firstName} <strong>{driver.lastName}</strong>
        </>
    );
    return number != null ? <Link href={`/driver/${number}`} className={styles.entity}>{name}</Link> : <span>{name}</span>;
}

export function TeamName({ team, links }) {
    if (!team) return <span>—</span>;
    return links?.teams && team.id
        ? <Link href={`/team/${team.id}`} className={styles.entity}>{team.name}</Link>
        : <span>{team.name}</span>;
}

function gridText(grid) {
    if (grid === 0) return 'Pit lane';
    return Number.isFinite(grid) ? grid : '—';
}

export function Podium({ results, links }) {
    const podium = results.slice(0, 3);
    const fastest = fastestLapOf(results);
    return (
        <div className={styles.podiumWrap}>
            <ol className={styles.podium}>
                {podium.map((row) => (
                    <li key={row.driver.id} className={styles.podiumStep}>
                        <span className={styles.podiumPos}>P{row.position}</span>
                        <span className={styles.podiumDriver}><DriverName driver={row.driver} links={links} /></span>
                        <span className={styles.podiumTeam}><TeamName team={row.team} links={links} /></span>
                        <span className={styles.podiumTime}>{gapText(row, results[0]?.laps)}</span>
                    </li>
                ))}
            </ol>
            {fastest && (
                <p className={styles.fastestLap}>
                    Fastest lap: <DriverName driver={fastest.driver} links={links} />{' '}
                    {fastest.fastestLap.time}
                    {fastest.fastestLap.lap ? ` (lap ${fastest.fastestLap.lap})` : ''}
                </p>
            )}
        </div>
    );
}

export function ClassificationTable({ results, links, caption }) {
    const leaderLaps = results[0]?.laps;
    return (
        <div className={styles.tableScroll}>
            <table className={styles.table}>
                <caption className={styles.srOnly}>{caption}</caption>
                <thead>
                    <tr>
                        <th scope="col">Pos</th>
                        <th scope="col">Driver</th>
                        <th scope="col">Team</th>
                        <th scope="col" className={styles.num}>Grid</th>
                        <th scope="col" className={styles.num}>Laps</th>
                        <th scope="col">Time / Status</th>
                        <th scope="col" className={styles.num}>Pts</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((row) => (
                        <tr key={row.driver.id}>
                            <th scope="row" className={styles.pos}>{row.positionText}</th>
                            <td><DriverName driver={row.driver} links={links} /></td>
                            <td><TeamName team={row.team} links={links} /></td>
                            <td className={styles.num}>{gridText(row.grid)}</td>
                            <td className={styles.num}>{row.laps ?? '—'}</td>
                            <td className={styles.mono}>{gapText(row, leaderLaps)}</td>
                            <td className={`${styles.num} ${styles.points}`}>{row.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function QualifyingTable({ results, links, caption }) {
    return (
        <div className={styles.tableScroll}>
            <table className={styles.table}>
                <caption className={styles.srOnly}>{caption}</caption>
                <thead>
                    <tr>
                        <th scope="col">Pos</th>
                        <th scope="col">Driver</th>
                        <th scope="col">Team</th>
                        <th scope="col">Q1</th>
                        <th scope="col">Q2</th>
                        <th scope="col">Q3</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((row) => (
                        <tr key={row.driver.id}>
                            <th scope="row" className={styles.pos}>{row.position}</th>
                            <td><DriverName driver={row.driver} links={links} /></td>
                            <td><TeamName team={row.team} links={links} /></td>
                            <td className={styles.mono}>{row.q1 || '—'}</td>
                            <td className={styles.mono}>{row.q2 || '—'}</td>
                            <td className={styles.mono}>{row.q3 || '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
