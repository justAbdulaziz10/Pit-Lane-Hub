import { Fragment } from 'react';
import { fastestLapOf, gapText } from '@/lib/f1/results';
import { localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import raceMessages from '@/lib/i18n/messages/race';
import { pick } from '@/lib/i18n/messages';
import Link from 'next/link';
import { gapToPoleSeconds, podiumColorToken, qualifyingCutlinePositions } from './presentation';
import styles from './page.module.css';

export function DriverName({ driver, links, lang }) {
    const number = links?.drivers?.[driver.id];
    const name = (
        <>
            <bdi dir="ltr">{driver.firstName} <strong>{driver.lastName}</strong></bdi>
        </>
    );
    return number != null ? <Link href={localePath(lang, `/driver/${number}`)} className={styles.entity}>{name}</Link> : <span>{name}</span>;
}

export function TeamName({ team, links, lang }) {
    if (!team) return <span>—</span>;
    return links?.teams && team.id
        ? <Link href={localePath(lang, `/team/${team.id}`)} className={styles.entity}><bdi dir="ltr">{team.name}</bdi></Link>
        : <span><bdi dir="ltr">{team.name}</bdi></span>;
}

function GridLabel({ grid, lang, t }) {
    if (grid === 0 || grid === '0') return t.pitLane;
    if (grid == null || grid === '') return '—';
    return Number.isFinite(Number(grid)) ? <bdi dir="ltr">{formatNumber(lang, Number(grid))}</bdi> : '—';
}

function GapLabel({ value, lang, t }) {
    const text = String(value ?? '—');
    const statuses = {
        Leader: t.leader,
        Retired: t.retired,
        Disqualified: t.disqualified,
        Excluded: t.excluded,
        'Did not start': t.didNotStart,
        'Did not qualify': t.didNotQualify,
        Finished: t.finished,
        'Pit lane': t.pitLane,
    };
    if (statuses[text]) return statuses[text];
    const lapped = text.match(/^\+?(\d+) Laps?$/i);
    if (lapped) {
        const count = Number(lapped[1]);
        return (
            <>
                <bdi dir="ltr">+{formatNumber(lang, count)}</bdi>{' '}
                {count === 1 ? t.singleLap : t.multipleLaps}
            </>
        );
    }
    return /^[+\d-]/.test(text) ? <bdi dir="ltr">{text}</bdi> : <bdi dir="auto">{text}</bdi>;
}

export function Podium({ results, links, lang }) {
    const t = pick(raceMessages, lang);
    const podium = results.slice(0, 3);
    const fastest = fastestLapOf(results);
    return (
        <div className={styles.podiumWrap}>
            <ol className={styles.podium}>
                {podium.map((row) => (
                    <li
                        key={row.driver.id}
                        className={styles.podiumStep}
                        style={{ '--podium-color': `var(${podiumColorToken(row.position)})` }}
                    >
                        <span className={styles.podiumPos}><bdi dir="ltr">P{row.position}</bdi></span>
                        <span className={styles.podiumDriver}><DriverName driver={row.driver} links={links} lang={lang} /></span>
                        <span className={styles.podiumTeam}><TeamName team={row.team} links={links} lang={lang} /></span>
                        <span className={styles.podiumTime}><GapLabel value={gapText(row, results[0]?.laps)} lang={lang} t={t} /></span>
                    </li>
                ))}
            </ol>
            {fastest && (
                <p className={styles.fastestLap}>
                    {t.fastestLap} <DriverName driver={fastest.driver} links={links} lang={lang} />{' '}
                    <bdi dir="ltr">{fastest.fastestLap.time}</bdi>
                    {fastest.fastestLap.lap ? <> ({t.lap} <bdi dir="ltr">{formatNumber(lang, fastest.fastestLap.lap)}</bdi>)</> : ''}
                </p>
            )}
        </div>
    );
}

export function ClassificationTable({ results, links, caption, lang }) {
    const t = pick(raceMessages, lang);
    const leaderLaps = results[0]?.laps;
    return (
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={caption}>
            <table className={styles.table}>
                <caption className={styles.srOnly}>{caption}</caption>
                <thead>
                    <tr>
                        <th scope="col">{t.position}</th>
                        <th scope="col">{t.driver}</th>
                        <th scope="col">{t.team}</th>
                        <th scope="col" className={styles.num}>{t.grid}</th>
                        <th scope="col" className={styles.num}>{t.laps}</th>
                        <th scope="col">{t.timeStatus}</th>
                        <th scope="col" className={styles.num}>{t.points}</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((row) => (
                        <tr key={row.driver.id} className={styles.teamRow} style={{ '--team-color': links?.teamColors?.[row.team?.name] || 'var(--text-3)' }}>
                            <th scope="row" className={styles.pos}><bdi dir="ltr">{row.positionText}</bdi></th>
                            <td><DriverName driver={row.driver} links={links} lang={lang} /></td>
                            <td><TeamName team={row.team} links={links} lang={lang} /></td>
                            <td className={styles.num}><GridLabel grid={row.grid} lang={lang} t={t} /></td>
                            <td className={styles.num}><bdi dir="ltr">{row.laps == null ? '—' : formatNumber(lang, row.laps)}</bdi></td>
                            <td className={styles.mono}><GapLabel value={gapText(row, leaderLaps)} lang={lang} t={t} /></td>
                            <td className={`${styles.num} ${styles.points}`}><bdi dir="ltr">{formatNumber(lang, row.points)}</bdi></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function QualifyingTable({ results, links, caption, lang }) {
    const t = pick(raceMessages, lang);
    const cutlines = qualifyingCutlinePositions(results);
    return (
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={caption}>
            <table className={styles.table}>
                <caption className={styles.srOnly}>{caption}</caption>
                <thead>
                    <tr>
                        <th scope="col">{t.position}</th>
                        <th scope="col">{t.driver}</th>
                        <th scope="col">{t.team}</th>
                        <th scope="col"><bdi dir="ltr">Q1</bdi></th>
                        <th scope="col"><bdi dir="ltr">Q2</bdi></th>
                        <th scope="col"><bdi dir="ltr">Q3</bdi></th>
                        <th scope="col">{t.gapToPole}</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((row) => {
                        const position = Number(row.position);
                        const cut = position === cutlines.q1 ? 'q1' : position === cutlines.q2 ? 'q2' : null;
                        const gap = gapToPoleSeconds(row, results);
                        return (
                            <Fragment key={row.driver.id}>
                                {cut && (
                                    <tr className={styles.cutLine}>
                                        <td colSpan={7}>
                                            <><bdi dir="ltr">{cut.toUpperCase()}</bdi> {t.cutline}</>
                                        </td>
                                    </tr>
                                )}
                                <tr className={styles.teamRow} style={{ '--team-color': links?.teamColors?.[row.team?.name] || 'var(--text-3)' }}>
                                    <th scope="row" className={styles.pos}><bdi dir="ltr">{formatNumber(lang, row.position)}</bdi></th>
                                    <td><DriverName driver={row.driver} links={links} lang={lang} /></td>
                                    <td><TeamName team={row.team} links={links} lang={lang} /></td>
                                    <td className={styles.mono}><bdi dir="ltr">{row.q1 || '—'}</bdi></td>
                                    <td className={styles.mono}><bdi dir="ltr">{row.q2 || '—'}</bdi></td>
                                    <td className={styles.mono}><bdi dir="ltr">{row.q3 || '—'}</bdi></td>
                                    <td className={styles.mono}>
                                        {position === 1 ? t.pole : gap === null ? '—' : <bdi dir="ltr">+{formatNumber(lang, gap, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</bdi>}
                                    </td>
                                </tr>
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
