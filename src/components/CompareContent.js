'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { compareDriversAction, searchDriversAction } from '@/app/actions/compare-actions';
import styles from '@/app/compare/page.module.css';

const COLOURS = ['#FF4D45', '#4FC3F7'];

const ERRORS = {
    invalid: 'Choose two different drivers.',
    'not-found': 'One of these drivers is not in the Formula 1 records.',
    'rate-limited': 'Too many comparisons in a short time. Wait a minute and try again.',
    unavailable: 'The results service did not respond. Try again.',
};

function DriverPicker({ index, label, selected, onSelect }) {
    const inputId = useId();
    const listId = useId();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [status, setStatus] = useState('idle');
    const latest = useRef(0);

    useEffect(() => {
        const trimmed = query.trim();
        const requestId = ++latest.current;
        if (trimmed.length < 2) return undefined;
        const timer = setTimeout(async () => {
            setStatus('loading');
            let response;
            try {
                response = await searchDriversAction(trimmed);
            } catch {
                response = { ok: false, error: 'unavailable' };
            }
            if (requestId !== latest.current) return;
            if (response.ok) {
                setResults(response.drivers);
                setStatus(response.drivers.length ? 'done' : 'empty');
            } else {
                setResults([]);
                setStatus(response.error);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    const open = query.trim().length >= 2;

    return (
        <div className={styles.picker} style={{ '--driver-color': COLOURS[index] }}>
            <label htmlFor={inputId} className={styles.pickerLabel}>{label}</label>
            <p className={styles.pickerSelected}>{selected?.fullName || selected?.driverId || 'None selected'}</p>
            <input
                id={inputId}
                type="search"
                className={styles.pickerInput}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search any driver since 1950"
                autoComplete="off"
                aria-controls={listId}
            />
            {open ? (
                <div id={listId} className={styles.pickerResults} aria-live="polite">
                    {status === 'loading' && results.length === 0 ? <p className={styles.pickerNote}>Searching…</p> : null}
                    {status === 'empty' ? <p className={styles.pickerNote}>No drivers found.</p> : null}
                    {ERRORS[status] ? <p className={styles.pickerNote}>{ERRORS[status]}</p> : null}
                    {results.length > 0 ? (
                        <ul>
                            {results.map((driver) => (
                                <li key={driver.driverId}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setQuery('');
                                            setResults([]);
                                            onSelect(driver);
                                        }}
                                    >
                                        <span>{driver.fullName}</span>
                                        <span className={styles.pickerMeta}>{[driver.code, driver.nationality].filter(Boolean).join(' · ')}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function rate(part, whole) {
    if (!whole) return '0.0%';
    return `${((part / whole) * 100).toFixed(1)}%`;
}

function formatPoints(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const FASTEST_LAP_DATA_FROM = 2004;

/** Jolpica has fastest-lap ranks from 2004 only, so older careers can't be compared on it. */
function fastestLapRow(a, b) {
    const missing = (driver) => driver.lastSeason && driver.lastSeason < FASTEST_LAP_DATA_FROM;
    const partial = [a, b].some((driver) => driver.firstSeason && driver.firstSeason < FASTEST_LAP_DATA_FROM);
    const label = partial ? `Fastest laps since ${FASTEST_LAP_DATA_FROM}` : 'Fastest laps';
    const valueA = missing(a) ? -1 : a.stats.fastestLaps;
    const valueB = missing(b) ? -1 : b.stats.fastestLaps;
    return [label, valueA, valueB, null, () => [missing(a) ? '—' : valueA, missing(b) ? '—' : valueB]];
}

function statRows([a, b]) {
    return [
        ['Championships', a.stats.championships, b.stats.championships],
        ['Starts', a.stats.starts, b.stats.starts],
        ['Wins', a.stats.wins, b.stats.wins],
        ['Podiums', a.stats.podiums, b.stats.podiums],
        ['Pole positions', a.stats.poles, b.stats.poles],
        fastestLapRow(a, b),
        ['Seasons', a.stats.seasons, b.stats.seasons],
        ['Points', a.points, b.points, formatPoints],
        ['Win rate', a.stats.wins / (a.stats.starts || 1), b.stats.wins / (b.stats.starts || 1), null, () => [rate(a.stats.wins, a.stats.starts), rate(b.stats.wins, b.stats.starts)]],
        ['Podium rate', a.stats.podiums / (a.stats.starts || 1), b.stats.podiums / (b.stats.starts || 1), null, () => [rate(a.stats.podiums, a.stats.starts), rate(b.stats.podiums, b.stats.starts)]],
    ];
}

function span(driver) {
    if (!driver.firstSeason) return null;
    return driver.firstSeason === driver.lastSeason ? String(driver.firstSeason) : `${driver.firstSeason}–${driver.lastSeason}`;
}

function Comparison({ comparison }) {
    const [a, b] = comparison.drivers;
    const h2h = comparison.headToHead;
    return (
        <div className={styles.comparison}>
            <div className={styles.driversRow}>
                {comparison.drivers.map((driver, index) => (
                    <div key={driver.driverId} className={styles.driverProfile} style={{ '--driver-color': COLOURS[index] }}>
                        <h2>
                            <Link href={`/driver/${driver.driverId}`}>{driver.fullName}</Link>
                        </h2>
                        <p className={styles.profileMeta}>
                            {[driver.nationality, span(driver)].filter(Boolean).join(' · ')}
                        </p>
                        {driver.teams.length > 0 ? <p className={styles.profileTeams}>{driver.teams.join(', ')}</p> : null}
                    </div>
                ))}
            </div>

            <section className={styles.h2h} aria-labelledby="h2h-heading">
                <h3 id="h2h-heading">Head-to-head</h3>
                {h2h.races > 0 ? (
                    <>
                        <p className={styles.h2hScore}>
                            <span style={{ color: COLOURS[0] }}>{h2h.aheadA}</span>
                            <span className={styles.h2hDash} aria-hidden="true">–</span>
                            <span style={{ color: COLOURS[1] }}>{h2h.aheadB}</span>
                        </p>
                        <p className={styles.h2hNote}>
                            Classified ahead in {h2h.races} {h2h.races === 1 ? 'race' : 'races'} together
                            {h2h.first && h2h.last ? ` (${h2h.first.season}–${h2h.last.season})` : ''}
                        </p>
                        {h2h.teammateRaces > 0 ? (
                            <p className={styles.h2hNote}>
                                As teammates: {a.lastName} {h2h.teammateAheadA}, {b.lastName} {h2h.teammateAheadB} in {h2h.teammateRaces} {h2h.teammateRaces === 1 ? 'race' : 'races'}
                            </p>
                        ) : null}
                    </>
                ) : (
                    <p className={styles.h2hNote}>{a.lastName} and {b.lastName} never started the same race.</p>
                )}
            </section>

            <section className={styles.statsSection} aria-labelledby="career-heading">
                <h3 id="career-heading">Career</h3>
                <table className={styles.statsTable}>
                    <thead>
                        <tr>
                            <th scope="col">Statistic</th>
                            <th scope="col" style={{ color: COLOURS[0] }}>{a.fullName}</th>
                            <th scope="col" style={{ color: COLOURS[1] }}>{b.fullName}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statRows(comparison.drivers).map(([label, valueA, valueB, format, display]) => {
                            const [textA, textB] = display ? display() : [format ? format(valueA) : valueA, format ? format(valueB) : valueB];
                            return (
                                <tr key={label}>
                                    <th scope="row">{label}</th>
                                    <td className={valueA > valueB ? styles.leader : undefined}>{textA}</td>
                                    <td className={valueB > valueA ? styles.leader : undefined}>{textB}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>
        </div>
    );
}

export default function CompareContent({ initialIds, initialComparison = null, initialError = null }) {
    const [selected, setSelected] = useState(() => initialIds.map((driverId, index) => {
        const known = initialComparison?.drivers?.[index];
        return driverId ? { driverId, fullName: known?.fullName || null } : null;
    }));
    const [comparison, setComparison] = useState(initialComparison);
    const [error, setError] = useState(initialError);
    const [loading, setLoading] = useState(false);
    const latest = useRef(0);

    const run = useCallback(async (pair) => {
        const requestId = ++latest.current;
        const [a, b] = pair.map((driver) => driver?.driverId || '');
        if (!a || !b) return;
        const url = `/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
        window.history.replaceState(window.history.state, '', url);
        if (a === b) {
            setError('invalid');
            setComparison(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        let response;
        try {
            response = await compareDriversAction(a, b);
        } catch {
            response = { ok: false, error: 'unavailable' };
        }
        // A newer selection was made while this request was in flight.
        if (requestId !== latest.current) return;
        setLoading(false);
        if (response.ok) setComparison(response.comparison);
        else {
            setComparison(null);
            setError(response.error);
        }
    }, []);

    const choose = (index, driver) => {
        const next = selected.map((item, position) => (position === index ? driver : item));
        setSelected(next);
        run(next);
    };

    return (
        <div className="container">
            <div className={styles.selectorGrid}>
                <DriverPicker index={0} label="Driver A" selected={selected[0]} onSelect={(driver) => choose(0, driver)} />
                <div className={styles.versus} aria-hidden="true">vs</div>
                <DriverPicker index={1} label="Driver B" selected={selected[1]} onSelect={(driver) => choose(1, driver)} />
            </div>

            <div aria-live="polite" aria-busy={loading}>
                {loading ? (
                    <div className={styles.loadingState} role="status">
                        <div className={styles.spinner} aria-hidden="true" />
                        <p>Loading career records…</p>
                    </div>
                ) : null}
                {!loading && error ? (
                    <div className={styles.errorState} role="alert">
                        <p>{ERRORS[error] || ERRORS.unavailable}</p>
                        {error === 'unavailable' ? (
                            <button type="button" className="btn btn-secondary" onClick={() => run(selected)}>Try again</button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {!error && comparison ? (
                <div className={loading ? styles.stale : undefined}>
                    <Comparison comparison={comparison} />
                </div>
            ) : null}
        </div>
    );
}
