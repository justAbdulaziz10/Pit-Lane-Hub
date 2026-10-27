'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getCompound } from '@/lib/f1/tyres';
import { formatGap, formatLapTime, pollInterval, sessionPhase } from '@/lib/f1/live-format';
import styles from './page.module.css';

const subscribeNothing = () => () => {};

/** False during SSR and hydration, true afterwards: local times render only on the client. */
function useHydrated() {
    return useSyncExternalStore(subscribeNothing, () => true, () => false);
}

function ClockTime({ iso, withDate = false }) {
    const hydrated = useHydrated();
    if (!iso) return null;
    const date = new Date(iso);
    const options = withDate
        ? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
        : { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const text = hydrated
        ? new Intl.DateTimeFormat(undefined, options).format(date)
        : `${new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(date)} UTC`;
    return <time dateTime={iso}>{text}</time>;
}

function Tyre({ stint }) {
    if (!stint?.compound) return <span className={styles.muted}>—</span>;
    const compound = getCompound(stint.compound);
    return (
        <span className={styles.tyre}>
            <span
                className={styles.tyreBadge}
                style={{ '--tyre': compound.color }}
                title={compound.label}
                aria-label={compound.label}
            >
                {compound.short}
            </span>
            {stint.age != null && <span className={styles.tyreAge}>{stint.age}</span>}
        </span>
    );
}

export default function LiveTiming({ initial }) {
    const [snapshot, setSnapshot] = useState(initial);
    const [failed, setFailed] = useState(false);
    const snapshotRef = useRef(initial);

    useEffect(() => {
        let timer;
        let controller;
        let cancelled = false;

        const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(refresh, pollInterval(snapshotRef.current));
        };

        async function refresh() {
            if (document.hidden) return schedule();
            controller?.abort();
            controller = new AbortController();
            try {
                const response = await fetch('/api/live', { signal: controller.signal, cache: 'no-store' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const next = await response.json();
                if (cancelled) return;
                snapshotRef.current = next;
                setSnapshot(next);
                setFailed(false);
            } catch (error) {
                if (cancelled || error.name === 'AbortError') return;
                setFailed(true);
            }
            if (!cancelled) schedule();
        }

        const onVisible = () => {
            if (!document.hidden) refresh();
        };
        schedule();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            clearTimeout(timer);
            controller?.abort();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    const { session, isLive, isRace, positions, weather, raceControl, fetchedAt } = snapshot;
    const phase = sessionPhase(session, isLive);
    const title = session
        ? [session.location || session.circuit, session.name].filter(Boolean).join(' · ')
        : 'Live Timing';

    return (
        <div className={styles.live}>
            <header className={styles.header}>
                <div className="container">
                    <div className={styles.headerRow}>
                        <div>
                            <p className={styles.eyebrow}>
                                {phase === 'live' && <span className={styles.liveBadge}>Live</span>}
                                {phase === 'finished' && 'Final classification'}
                                {phase === 'upcoming' && 'Next session'}
                                {phase === 'none' && 'Live timing'}
                            </p>
                            <h1>{title}</h1>
                            {session?.meetingKey && (
                                <Link href={`/race/${session.meetingKey}`} className={styles.weekendLink}>
                                    Race weekend
                                </Link>
                            )}
                        </div>
                        <p className={styles.updated} aria-live="polite">
                            {failed ? 'Connection lost, retrying' : <>Updated <ClockTime iso={fetchedAt} /></>}
                        </p>
                    </div>
                    {weather && (
                        <dl className={styles.weather}>
                            <div><dt>Air</dt><dd>{weather.airTemperature ?? '—'}°C</dd></div>
                            <div><dt>Track</dt><dd>{weather.trackTemperature ?? '—'}°C</dd></div>
                            <div><dt>Humidity</dt><dd>{weather.humidity ?? '—'}%</dd></div>
                            <div><dt>Wind</dt><dd>{weather.windSpeed ?? '—'} m/s</dd></div>
                            <div><dt>Rain</dt><dd>{weather.rainfall ? 'Yes' : 'No'}</dd></div>
                        </dl>
                    )}
                </div>
            </header>

            <div className={`container ${styles.layout}`}>
                <section aria-labelledby="timing-heading" className={styles.timing}>
                    <h2 id="timing-heading" className={styles.sectionTitle}>Timing</h2>
                    {phase === 'upcoming' && (
                        <p className={styles.empty}>
                            {session.name} starts <ClockTime iso={session.start} withDate />.
                        </p>
                    )}
                    {phase !== 'upcoming' && positions.length === 0 && (
                        <p className={styles.empty}>No timing data for this session yet.</p>
                    )}
                    {positions.length > 0 && (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th scope="col">Pos</th>
                                        <th scope="col">Driver</th>
                                        {isRace ? (
                                            <>
                                                <th scope="col">Gap</th>
                                                <th scope="col" className={styles.optional}>Interval</th>
                                                <th scope="col">Last lap</th>
                                            </>
                                        ) : (
                                            <>
                                                <th scope="col">Best lap</th>
                                                <th scope="col">Gap</th>
                                                <th scope="col" className={styles.optional}>Laps</th>
                                            </>
                                        )}
                                        <th scope="col">Tyre</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((row, index) => (
                                        <tr key={row.driverNumber}>
                                            <td className={styles.pos}>{row.position}</td>
                                            <th scope="row">
                                                <div className={styles.driver}>
                                                <span className={styles.teamBar} style={{ '--team': row.teamColor || 'var(--carbon-border)' }} />
                                                <Link href={`/driver/${row.driverNumber}`} className={styles.driverLink}>
                                                    <span className={styles.code}>{row.code || row.driverNumber}</span>
                                                    <span className={styles.fullName}>{row.name}</span>
                                                </Link>
                                                <span className={styles.team}>{row.team}</span>
                                                </div>
                                            </th>
                                            {isRace ? (
                                                <>
                                                    <td className={styles.mono}>{formatGap(row.gapToLeader, { leader: index === 0 })}</td>
                                                    <td className={`${styles.mono} ${styles.optional}`}>{index === 0 ? '—' : formatGap(row.interval)}</td>
                                                    <td className={styles.mono}>{formatLapTime(row.lastLap?.duration)}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={styles.mono}>{formatLapTime(row.bestLap?.duration)}</td>
                                                    <td className={styles.mono}>{index === 0 ? '—' : formatGap(row.gapToLeader)}</td>
                                                    <td className={`${styles.mono} ${styles.optional}`}>{row.lastLap?.lapNumber ?? '—'}</td>
                                                </>
                                            )}
                                            <td><Tyre stint={row.stint} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section aria-labelledby="rc-heading" className={styles.raceControl}>
                    <h2 id="rc-heading" className={styles.sectionTitle}>Race control</h2>
                    {raceControl.length === 0 ? (
                        <p className={styles.empty}>No messages.</p>
                    ) : (
                        <ol className={styles.messages}>
                            {raceControl.map((message, index) => (
                                <li key={`${message.date}-${index}`} className={styles.message} data-flag={message.flag || undefined}>
                                    <span className={styles.messageMeta}>
                                        <ClockTime iso={message.date} />
                                        {message.lapNumber != null && <> · Lap {message.lapNumber}</>}
                                    </span>
                                    <span>{message.message}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>
        </div>
    );
}
