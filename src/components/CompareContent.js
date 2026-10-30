'use client';

import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
import { compareDriversAction, searchDriversAction } from '@/app/actions/compare-actions';
import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { fill, pick } from '@/lib/i18n/messages';
import compareMessages from '@/lib/i18n/messages/compare';
import { formatNumber } from '@/lib/i18n/format';
import { nationalityName } from '@/lib/i18n/f1-names';
import { localePath } from '@/lib/i18n/config';
import { driverPath } from '@/app/[lang]/driver/[number]/driver-path';
import { DriverPortrait } from '@/components/DriverCard';
import { FULL_POLE_DATA_FROM, POLE_DATA_FROM } from '@/lib/f1/career';
import styles from '@/app/[lang]/compare/page.module.css';

const COLOURS = ['#FF4D45', '#4FC3F7'];

function errorMessage(error, t) {
    return ({
        invalid: t.chooseDifferentDrivers,
        'not-found': t.driverNotFound,
        'rate-limited': t.rateLimited,
        unavailable: t.serviceUnavailable,
    })[error] || t.serviceUnavailable;
}

function DriverPicker({ index, label, selected, onSelect, t, locale, embedded = false }) {
    const inputId = useId();
    const listId = useId();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [status, setStatus] = useState('idle');
    const [activeIndex, setActiveIndex] = useState(0);
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
                setActiveIndex(0);
                setStatus(response.drivers.length ? 'done' : 'empty');
            } else {
                setResults([]);
                setStatus(response.error);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    const open = query.trim().length >= 2;
    const activeOption = results[activeIndex];

    function selectDriver(driver) {
        setQuery('');
        setResults([]);
        setStatus('idle');
        onSelect(driver);
    }

    return (
        <div className={embedded ? styles.profilePicker : styles.picker} style={{ '--driver-color': COLOURS[index] }}>
            <label htmlFor={inputId} className={styles.pickerLabel}>{label}</label>
            {!embedded ? <p className={styles.pickerSelected}>{selected?.fullName || selected?.driverId
                ? <bdi dir="ltr">{selected.fullName || selected.driverId}</bdi>
                : t.noneSelected}</p> : null}
            <input
                id={inputId}
                type="search"
                role="combobox"
                className={styles.pickerInput}
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' && results.length) {
                        event.preventDefault();
                        setActiveIndex((value) => (value + 1) % results.length);
                    } else if (event.key === 'ArrowUp' && results.length) {
                        event.preventDefault();
                        setActiveIndex((value) => (value - 1 + results.length) % results.length);
                    } else if (event.key === 'Enter' && activeOption) {
                        event.preventDefault();
                        selectDriver(activeOption);
                    } else if (event.key === 'Escape') {
                        setQuery('');
                        setResults([]);
                    }
                }}
                placeholder={t.searchDriver}
                aria-label={t.searchDriver}
                autoComplete="off"
                aria-controls={listId}
                aria-expanded={open && results.length > 0}
                aria-autocomplete="list"
                aria-activedescendant={open && activeOption ? `${listId}-option-${activeOption.driverId}` : undefined}
            />
            {open && status === 'loading' && results.length === 0 ? <p className={styles.pickerNote} role="status">{t.searching}</p> : null}
            {open && status === 'empty' ? <p className={styles.pickerNote} role="status">{t.noDriversFound}</p> : null}
            {open && ['invalid', 'not-found', 'rate-limited', 'unavailable'].includes(status)
                ? <p className={styles.pickerNote} role="status">{errorMessage(status, t)}</p>
                : null}
            <div id={listId} className={styles.pickerResults} role="listbox" hidden={!open || results.length === 0}>
                {results.map((driver, optionIndex) => (
                    <button
                        key={driver.driverId}
                        id={`${listId}-option-${driver.driverId}`}
                        type="button"
                        role="option"
                        aria-selected={optionIndex === activeIndex}
                        className={optionIndex === activeIndex ? styles.activeOption : undefined}
                        onClick={() => selectDriver(driver)}
                    >
                        <bdi dir="ltr">{driver.fullName}</bdi>
                        <span className={styles.pickerMeta}>
                            {driver.code ? <bdi dir="ltr">{driver.code}</bdi> : null}
                            {driver.code && driver.nationality ? ' · ' : ''}
                            {nationalityName(driver.nationality, locale)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function rate(part, whole, locale) {
    const value = whole ? (part / whole) * 100 : 0;
    return `${formatNumber(locale, value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatPoints(value, locale) {
    return Number.isInteger(value)
        ? formatNumber(locale, value)
        : formatNumber(locale, value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

const FASTEST_LAP_DATA_FROM = 2004;

/** Jolpica has fastest-lap ranks from 2004 only, so older careers can't be compared on it. */
function fastestLapRow(a, b, t, locale) {
    const missing = (driver) => driver.lastSeason && driver.lastSeason < FASTEST_LAP_DATA_FROM;
    const partial = [a, b].some((driver) => driver.firstSeason && driver.firstSeason < FASTEST_LAP_DATA_FROM);
    const label = partial ? fill(t.fastestLapsSince, { year: formatNumber(locale, FASTEST_LAP_DATA_FROM, { useGrouping: false }) }) : t.statFastestLaps;
    const valueA = missing(a) ? -1 : a.stats.fastestLaps;
    const valueB = missing(b) ? -1 : b.stats.fastestLaps;
    return [label, valueA, valueB, null, () => [missing(a) ? '—' : valueA, missing(b) ? '—' : valueB]];
}

function coverageLabel(coverage, t, locale) {
    if (coverage === 'full') return t.statPolePositions;
    const template = coverage === 'none' ? t.poleCoverageNone : t.poleCoveragePartial;
    const [before, after = ''] = template.split('{year}');
    const year = coverage === 'none' ? POLE_DATA_FROM : FULL_POLE_DATA_FROM;
    return <>{before}<bdi dir="ltr">{formatNumber(locale, year, { useGrouping: false })}</bdi>{after}</>;
}

function statRows([a, b], t, locale) {
    const poleCoverage = [a.stats.poleCoverage, b.stats.poleCoverage].every((coverage) => coverage === 'none')
        ? 'none'
        : [a.stats.poleCoverage, b.stats.poleCoverage].some((coverage) => coverage !== 'full') ? 'partial' : 'full';
    const polesUnavailableA = a.stats.poleCoverage === 'none';
    const polesUnavailableB = b.stats.poleCoverage === 'none';
    return [
        [t.championships, a.stats.championships, b.stats.championships],
        [t.statEntries, a.stats.entries, b.stats.entries],
        [t.statWins, a.stats.wins, b.stats.wins],
        [t.statPodiums, a.stats.podiums, b.stats.podiums],
        [coverageLabel(poleCoverage, t, locale), polesUnavailableA ? -1 : a.stats.poles, polesUnavailableB ? -1 : b.stats.poles, null, () => [polesUnavailableA ? '—' : a.stats.poles, polesUnavailableB ? '—' : b.stats.poles]],
        fastestLapRow(a, b, t, locale),
        [t.statSeasons, a.stats.seasons, b.stats.seasons],
        [t.statPoints, a.points, b.points, (value) => formatPoints(value, locale)],
        [t.winRate, a.stats.wins / (a.stats.entries || 1), b.stats.wins / (b.stats.entries || 1), null, () => [rate(a.stats.wins, a.stats.entries, locale), rate(b.stats.wins, b.stats.entries, locale)]],
        [t.podiumRate, a.stats.podiums / (a.stats.entries || 1), b.stats.podiums / (b.stats.entries || 1), null, () => [rate(a.stats.podiums, a.stats.entries, locale), rate(b.stats.podiums, b.stats.entries, locale)]],
    ];
}

export function span(driver, locale) {
    if (!driver.firstSeason) return null;
    const first = formatNumber(locale, driver.firstSeason, { useGrouping: false });
    const last = formatNumber(locale, driver.lastSeason, { useGrouping: false });
    return driver.firstSeason === driver.lastSeason ? first : `${first}–${last}`;
}

function Comparison({ comparison, t, locale, selected, onChoose, driverProfiles }) {
    const [a, b] = comparison.drivers;
    const h2h = comparison.headToHead;
    const colorA = driverProfiles[a.driverId]?.color || COLOURS[0];
    const colorB = driverProfiles[b.driverId]?.color || COLOURS[1];
    return (
        <div className={styles.comparison} style={{ '--driver-a-color': colorA, '--driver-b-color': colorB }}>
            <div className={styles.driversRow}>
                {comparison.drivers.map((driver, index) => (
                    <Fragment key={driver.driverId}>
                        {index === 1 ? <span className={styles.profileVersus} aria-hidden="true">{t.versus}</span> : null}
                        <div className={`${styles.driverProfile} rich-card team-accent`} style={{ '--driver-color': index === 0 ? colorA : colorB }}>
                            <DriverPortrait
                                src={driverProfiles[driver.driverId]?.photo || driverProfiles[driver.driverId]?.headshot}
                                alt=""
                                width={168}
                                height={168}
                                className={styles.profilePortrait}
                                imgClassName={styles.profileImage}
                                fallbackClassName={styles.profileFallback}
                                loading="lazy"
                            >
                                <span aria-hidden="true">{(driver.code || `${driver.firstName?.[0] || ''}${driver.lastName?.slice(0, 2) || ''}`).toUpperCase()}</span>
                            </DriverPortrait>
                            <h2><Link href={driverPath(driver)}><bdi dir="ltr">{driver.fullName}</bdi></Link></h2>
                            <p className={styles.profileMeta}>
                                {nationalityName(driver.nationality, locale)}
                                {driver.firstSeason ? <> · <bdi dir="ltr">{span(driver, locale)}</bdi></> : null}
                            </p>
                            {driver.teams.length > 0 ? (
                                <div className={styles.profileTeams}>
                                    {driver.teams.map((team) => (
                                        <span className={styles.teamPill} key={team}><bdi dir="auto">{team}</bdi></span>
                                    ))}
                                </div>
                            ) : null}
                            <DriverPicker
                                index={index}
                                label={index === 0 ? t.driverA : t.driverB}
                                selected={selected[index]}
                                onSelect={(next) => onChoose(index, next)}
                                t={t}
                                locale={locale}
                                embedded
                            />
                        </div>
                    </Fragment>
                ))}
            </div>

            <section className={`${styles.h2h} rich-card`} aria-labelledby="h2h-heading">
                <h3 id="h2h-heading">{t.headToHead}</h3>
                {h2h.races > 0 ? (
                    <>
                        <p className={styles.h2hScore}>
                            <bdi dir="ltr" style={{ color: 'color-mix(in srgb, var(--driver-a-color) 62%, white)' }}>{formatNumber(locale, h2h.aheadA)}</bdi>
                            <span className={styles.h2hDash} aria-hidden="true">–</span>
                            <bdi dir="ltr" style={{ color: 'color-mix(in srgb, var(--driver-b-color) 62%, white)' }}>{formatNumber(locale, h2h.aheadB)}</bdi>
                        </p>
                        <p className={styles.h2hNote}>
                            <>{fill(t.classifiedAhead, { count: formatNumber(locale, h2h.races), raceWord: h2h.races === 1 ? t.race : t.races })}{h2h.first && h2h.last ? ` (${formatNumber(locale, h2h.first.season, { useGrouping: false })}–${formatNumber(locale, h2h.last.season, { useGrouping: false })})` : ''}</>
                        </p>
                        {h2h.teammateRaces > 0 ? (
                            <p className={styles.h2hNote}>
                                {fill(t.asTeammates, { aName: a.lastName, aCount: h2h.teammateAheadA, bName: b.lastName, bCount: h2h.teammateAheadB, count: h2h.teammateRaces, raceWord: h2h.teammateRaces === 1 ? t.race : t.races })}
                            </p>
                        ) : null}
                        {comparison.qualifyingHeadToHead?.races > 0 ? (
                            <p className={styles.h2hNote}>
                                {t.qualifyingHeadToHead}:{' '}
                                <bdi dir="ltr">{formatNumber(locale, comparison.qualifyingHeadToHead.aheadA)}–{formatNumber(locale, comparison.qualifyingHeadToHead.aheadB)}</bdi>
                            </p>
                        ) : null}
                    </>
                ) : (
                    <p className={styles.h2hNote}>{fill(t.neverSharedRace, { aName: a.lastName, bName: b.lastName })}</p>
                )}
            </section>

            <section className={`${styles.statsSection} rich-card`} aria-labelledby="career-heading">
                <h3 id="career-heading">{t.career}</h3>
                <div className={styles.statsTableWrap}>
                    <table className={styles.statsTable}>
                        <thead>
                            <tr>
                                <th scope="col">{t.statistic}</th>
                                <th scope="col"><bdi dir="ltr">{a.fullName}</bdi></th>
                                <th scope="col"><bdi dir="ltr">{b.fullName}</bdi></th>
                            </tr>
                        </thead>
                        <tbody>
                            {statRows(comparison.drivers, t, locale).map(([label, valueA, valueB, format, display], index) => {
                                const [textA, textB] = display ? display() : [format ? format(valueA) : formatNumber(locale, valueA), format ? format(valueB) : formatNumber(locale, valueB)];
                                return (
                                    <tr key={typeof label === 'string' ? label : `pole-coverage-${index}`}>
                                        <th scope="row">{label}</th>
                                        <td className={valueA > valueB ? styles.leader : undefined}><bdi dir="ltr">{textA}</bdi></td>
                                        <td className={valueB > valueA ? styles.leader : undefined}><bdi dir="ltr">{textB}</bdi></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default function CompareContent({ initialIds, initialComparison = null, initialError = null, driverProfiles = {} }) {
    const locale = useLocale();
    const t = pick(compareMessages, locale);
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
        const url = localePath(locale, `/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
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
    }, [locale]);

    const choose = (index, driver) => {
        const next = selected.map((item, position) => (position === index ? driver : item));
        setSelected(next);
        run(next);
    };

    return (
        <div className="container">
            {!comparison ? (
                <div className={styles.selectorGrid}>
                    <DriverPicker index={0} label={t.driverA} selected={selected[0]} onSelect={(driver) => choose(0, driver)} t={t} locale={locale} />
                    <div className={styles.versus} aria-hidden="true">{t.versus}</div>
                    <DriverPicker index={1} label={t.driverB} selected={selected[1]} onSelect={(driver) => choose(1, driver)} t={t} locale={locale} />
                </div>
            ) : null}

            <div aria-live="polite" aria-busy={loading}>
                {loading ? (
                    <div className={styles.loadingState} role="status">
                        <div className={styles.spinner} aria-hidden="true" />
                        <p>{t.loading}</p>
                    </div>
                ) : null}
                {!loading && error ? (
                    <div className={styles.errorState} role="alert">
                        <p>{errorMessage(error, t)}</p>
                        {error === 'unavailable' ? (
                            <button type="button" className="btn btn-secondary" onClick={() => run(selected)}>{t.tryAgain}</button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {!error && comparison ? (
                <div className={loading ? styles.stale : undefined}>
                    <Comparison comparison={comparison} t={t} locale={locale} selected={selected} onChoose={choose} driverProfiles={driverProfiles} />
                </div>
            ) : null}
        </div>
    );
}
