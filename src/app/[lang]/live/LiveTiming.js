'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Countdown } from '@/components/LocalTime';
import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { getCompound } from '@/lib/f1/tyres';
import { formatGap, formatLapTime, pollInterval, sessionPhase } from '@/lib/f1/live-format';
import { formatNumber, intlLocale } from '@/lib/i18n/format';
import liveMessages from '@/lib/i18n/messages/live';
import timeMessages, { sessionLabel } from '@/lib/i18n/messages/time';
import { fill, pick } from '@/lib/i18n/messages';
import styles from './page.module.css';

const subscribeNothing = () => () => {};

/** False during SSR and hydration, true afterwards: local times render only on the client. */
function useHydrated() {
    return useSyncExternalStore(subscribeNothing, () => true, () => false);
}

function ClockTime({ iso, withDate = false, locale, t, time }) {
    const hydrated = useHydrated();
    if (!iso) return null;
    const date = new Date(iso);
    const options = withDate
        ? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
        : { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const formatter = (zone) => new Intl.DateTimeFormat(intlLocale(locale), {
        ...options,
        ...(zone ? { timeZone: zone } : {}),
    });
    const text = hydrated
        ? formatter().format(date)
        : `${formatter('UTC').format(date)} ${time.utc}`;
    return <time dateTime={iso} aria-label={`${text}, ${hydrated ? t.localTime : time.utc}`}><bdi dir="auto">{text}</bdi></time>;
}

function flagLabel(message, t) {
    const flag = String(message.flag || '').toUpperCase();
    const category = String(message.category || '').toLowerCase();
    const body = String(message.message || '').toUpperCase();
    if (category.includes('track limit') || body.includes('TRACK LIMIT')) return t.flagTrackLimits;
    if (flag === 'DOUBLE YELLOW') return t.flagDoubleYellow;
    if (flag === 'YELLOW') return t.flagYellow;
    if (flag === 'RED') return t.flagRed;
    if (flag === 'GREEN' || flag === 'CLEAR') return t.flagGreen;
    if (flag === 'BLUE') return t.flagBlue;
    if (flag === 'CHEQUERED') return t.flagChequered;
    if (body.includes('VIRTUAL SAFETY CAR') || body.includes(' VSC')) return t.flagVsc;
    if (body.includes('SAFETY CAR') || body.includes(' SC ')) return t.flagSc;
    return null;
}

function tyreLabel(compound, t) {
    const keys = {
        SOFT: 'compoundSoft',
        MEDIUM: 'compoundMedium',
        HARD: 'compoundHard',
        INTERMEDIATE: 'compoundIntermediate',
        WET: 'compoundWet',
    };
    return t[keys[String(compound).toUpperCase()]] || t.compoundUnknown;
}

function LiveGap({ value, index, t }) {
    const text = formatGap(value, { leader: index === 0 });
    if (text === 'Leader') return t.leader;
    const lapped = text.match(/^\+?(\d+) LAP$/i);
    if (lapped) return <><bdi dir="ltr">+{lapped[1]}</bdi> {Number(lapped[1]) === 1 ? t.singleLap : t.multipleLaps}</>;
    return <bdi dir="ltr">{text}</bdi>;
}

function Tyre({ stint, locale, t }) {
    if (!stint?.compound) return <span className={styles.muted}>—</span>;
    const compound = getCompound(stint.compound);
    const label = tyreLabel(stint.compound, t);
    return (
        <span className={styles.tyre}>
            <span
                className={styles.tyreBadge}
                style={{ '--tyre': compound.color }}
                title={label}
                aria-label={label}
            >
                <bdi dir="ltr">{compound.short}</bdi>
            </span>
            {stint.age != null && <span className={styles.tyreAge}><bdi dir="ltr">{formatNumber(locale, stint.age)}</bdi></span>}
        </span>
    );
}

export default function LiveTiming({ initial, lang, labels, nextSession, grandPrixName, serverNow }) {
    const locale = useLocale();
    const t = locale === lang ? labels : pick(liveMessages, locale);
    const time = pick(timeMessages, locale);
    const [snapshot, setSnapshot] = useState(initial);
    const [failed, setFailed] = useState(false);
    const snapshotRef = useRef(initial);

    useEffect(() => {
        let timer;
        let controller;
        let cancelled = false;
        let retryAttempt = 0;

        const schedule = () => {
            clearTimeout(timer);
            const delay = pollInterval(snapshotRef.current, retryAttempt);
            if (delay != null) timer = setTimeout(refresh, delay);
        };

        async function refresh() {
            if (document.hidden) return schedule();
            controller?.abort();
            const requestController = new AbortController();
            controller = requestController;
            let didTimeout = false;
            const timeout = setTimeout(() => {
                didTimeout = true;
                requestController.abort();
            }, 12000);
            try {
                const response = await fetch('/api/live', { signal: requestController.signal, cache: 'no-store' });
                let next;
                if (response.ok) {
                    next = await response.json();
                } else if (response.status >= 500) {
                    throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status, retryable: true });
                } else {
                    next = { unavailable: response.status === 401 || response.status === 403 ? 'auth' : 'upstream' };
                }
                if (cancelled) return;
                snapshotRef.current = next;
                setSnapshot(next);
                setFailed(false);
                retryAttempt = 0;
            } catch (error) {
                if (cancelled || (error.name === 'AbortError' && !didTimeout)) return;
                if (didTimeout || error.retryable || error instanceof TypeError) {
                    retryAttempt += 1;
                    setFailed(true);
                } else {
                    const unavailable = error.status === 401 || error.status === 403 ? 'auth' : 'upstream';
                    const next = { unavailable };
                    snapshotRef.current = next;
                    setSnapshot(next);
                    setFailed(false);
                    retryAttempt = 0;
                }
            } finally {
                clearTimeout(timeout);
            }
            if (!cancelled) schedule();
        }

        const onVisible = () => {
            if (!document.hidden && (!snapshotRef.current.unavailable || snapshotRef.current.unavailable === 'no-session')) refresh();
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

    const { session, isLive, isRace, positions = [], weather, raceControl = [], fetchedAt } = snapshot;
    const phase = sessionPhase(session, isLive);
    const sessionName = session ? sessionLabel(session.name, locale) : '';
    const title = grandPrixName || session?.location || session?.circuit;
    const nextName = nextSession ? sessionLabel(nextSession.label, locale) : null;
    const authUnavailable = snapshot.unavailable === 'auth';
    const permanentUnavailable = snapshot.unavailable && snapshot.unavailable !== 'no-session';

    return (
        <div className={styles.live}>
            <header className={styles.header}>
                <div className="container">
                    <div className={styles.headerRow}>
                        <div>
                            <p className={styles.eyebrow}>
                                {phase === 'live' && <span className={styles.liveBadge}>{t.live}</span>}
                                {phase === 'finished' && t.finalClassification}
                                {phase === 'upcoming' && t.nextSession}
                                {phase === 'none' && t.liveTiming}
                            </p>
                            <h1>
                                {session ? (
                                    <>
                                        {title && <><bdi dir="auto">{title}</bdi>{sessionName && ' · '}</>}
                                        {sessionName}
                                    </>
                                ) : t.liveTiming}
                            </h1>
                            {session?.meetingKey && (
                                <Link href={`/race/${session.meetingKey}`} className={styles.weekendLink}>
                                    {t.raceWeekend}
                                </Link>
                            )}
                        </div>
                        {!permanentUnavailable && (
                            <p className={styles.updated} aria-live="polite">
                                {failed
                                    ? t.connectionLost
                                    : phase === 'finished'
                                        ? <>{t.lastSessionResults} <ClockTime iso={session.start} withDate locale={locale} t={t} time={time} /></>
                                        : <>{t.updated} <ClockTime iso={fetchedAt} locale={locale} t={t} time={time} /></>}
                            </p>
                        )}
                    </div>
                    {weather && (
                        <dl className={styles.weather}>
                            <div><dt>{t.air}</dt><dd><bdi dir="ltr">{weather.airTemperature == null ? '—' : `${formatNumber(locale, weather.airTemperature)}°C`}</bdi></dd></div>
                            <div><dt>{t.track}</dt><dd><bdi dir="ltr">{weather.trackTemperature == null ? '—' : `${formatNumber(locale, weather.trackTemperature)}°C`}</bdi></dd></div>
                            <div><dt>{t.humidity}</dt><dd><bdi dir="ltr">{weather.humidity == null ? '—' : `${formatNumber(locale, weather.humidity)}%`}</bdi></dd></div>
                            <div><dt>{t.wind}</dt><dd><bdi dir="ltr">{weather.windSpeed == null ? '—' : `${formatNumber(locale, weather.windSpeed)} m/s`}</bdi></dd></div>
                            <div><dt>{t.rain}</dt><dd>{weather.rainfall ? t.yes : t.no}</dd></div>
                        </dl>
                    )}
                </div>
            </header>

            {phase !== 'live' && (
                <section className={`container ${styles.stateBanner}`} aria-labelledby="state-heading">
                    <div className={styles.stateCopy}>
                        {/* Without timing access we cannot tell whether a session is running. */}
                        <h2 id="state-heading">{authUnavailable ? t.authUnavailable : t.noSessionRunning}</h2>
                        {authUnavailable && <p>{t.authUnavailableMessage}</p>}
                        {nextSession ? (
                            <p>
                                {t.nextSession}: <strong>{nextName}</strong>{' '}
                                <ClockTime iso={nextSession.start} withDate locale={locale} t={t} time={time} />
                            </p>
                        ) : <p>{t.noUpcomingSession}</p>}
                    </div>
                    {nextSession && (
                        <div className={styles.nextCountdown}>
                            <p>{fill(t.countdownTo, { session: nextName })}</p>
                            <Countdown
                                target={nextSession.start}
                                serverNow={serverNow}
                                className={styles.countdown}
                                unitClassName={styles.countdownUnit}
                                labelClassName={styles.countdownLabel}
                            />
                        </div>
                    )}
                </section>
            )}

            <div className={`container ${styles.layout}`}>
                <section aria-labelledby="timing-heading" className={styles.timing}>
                    <h2 id="timing-heading" className={styles.sectionTitle}>{t.timing}</h2>
                    {positions.length === 0 && (
                        <p className={styles.empty}>{t.noTimingData}</p>
                    )}
                    {positions.length > 0 && (
                        <div className={styles.tableWrap} tabIndex={0} role="region" aria-labelledby="timing-heading">
                            <table className={styles.table} aria-labelledby="timing-heading">
                                <thead>
                                    <tr>
                                        <th scope="col">{t.position}</th>
                                        <th scope="col">{t.driver}</th>
                                        {isRace ? (
                                            <>
                                                <th scope="col">{t.gap}</th>
                                                <th scope="col" className={styles.optional}>{t.interval}</th>
                                                <th scope="col">{t.lastLap}</th>
                                            </>
                                        ) : (
                                            <>
                                                <th scope="col">{t.bestLap}</th>
                                                <th scope="col">{t.gap}</th>
                                                <th scope="col" className={styles.optional}>{t.laps}</th>
                                            </>
                                        )}
                                        <th scope="col">{t.tyre}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((row, index) => (
                                        <tr key={row.driverNumber} className={row.status && !positions[index - 1]?.status ? styles.retiredDivider : undefined}>
                                            <td className={styles.pos}><bdi dir="ltr">{row.status || (row.position == null ? '—' : formatNumber(locale, row.position))}</bdi></td>
                                            <th scope="row">
                                                <div className={styles.driver}>
                                                    <span className={styles.teamBar} style={{ '--team': row.teamColor || 'var(--border)' }} />
                                                    <Link href={`/driver/${row.driverNumber}`} className={styles.driverLink}>
                                                        <span className={styles.code}><bdi dir="ltr">{row.code || row.driverNumber}</bdi></span>
                                                        <span className={styles.fullName}><bdi dir="ltr">{row.name}</bdi></span>
                                                    </Link>
                                                    <span className={styles.team}><bdi dir="ltr">{row.team}</bdi></span>
                                                </div>
                                            </th>
                                            {isRace ? (
                                                <>
                                                    <td className={styles.mono}><LiveGap value={row.gapToLeader} index={index} t={t} /></td>
                                                    <td className={`${styles.mono} ${styles.optional}`}><bdi dir="ltr">{index === 0 ? '—' : formatGap(row.interval)}</bdi></td>
                                                    <td className={styles.mono}><bdi dir="ltr">{formatLapTime(row.lastLap?.duration)}</bdi></td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={styles.mono}><bdi dir="ltr">{formatLapTime(row.bestLap?.duration)}</bdi></td>
                                                    <td className={styles.mono}><LiveGap value={row.gapToLeader} index={index} t={t} /></td>
                                                    <td className={`${styles.mono} ${styles.optional}`}><bdi dir="ltr">{row.lastLap?.lapNumber == null ? '—' : formatNumber(locale, row.lastLap.lapNumber)}</bdi></td>
                                                </>
                                            )}
                                            <td><Tyre stint={row.stint} locale={locale} t={t} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section aria-labelledby="rc-heading" className={styles.raceControl}>
                    <h2 id="rc-heading" className={styles.sectionTitle}>{t.raceControl}</h2>
                    {raceControl.length === 0 ? (
                        <p className={styles.empty}>{t.noMessages}</p>
                    ) : (
                        // Scrollable, so it must be reachable by keyboard.
                        <ol className={styles.messages} tabIndex={0} aria-labelledby="rc-heading">
                            {raceControl.map((message, index) => (
                                <li key={`${message.date}-${index}`} className={styles.message} data-flag={message.flag || undefined}>
                                    <span className={styles.messageMeta}>
                                        <ClockTime iso={message.date} locale={locale} t={t} time={time} />
                                        {message.lapNumber != null && <> · {t.lap} <bdi dir="ltr">{formatNumber(locale, message.lapNumber)}</bdi></>}
                                        {flagLabel(message, t) && <span className={styles.flagChip} data-flag={message.flag || undefined}>{flagLabel(message, t)}</span>}
                                    </span>
                                    <span><bdi lang="en">{message.message}</bdi></span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>
        </div>
    );
}
