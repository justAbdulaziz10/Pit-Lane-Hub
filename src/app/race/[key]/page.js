import { STATUS_LABELS, meetingStatus, requestTime } from '@/app/schedule/status';
import LocalTime from '@/components/LocalTime';
import { getDriverNumbers, getWeekendResults, sessionDone } from '@/lib/f1/results';
import { getSeasonYear } from '@/lib/f1/year';
import { ICS_SESSIONS } from '@/lib/ics';
import { jsonLdScript } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { eventTitle, eventYear, loadEvent } from './event';
import RaceMap from './RaceMap';
import { ClassificationTable, Podium, QualifyingTable } from './ResultTables';
import Strategy from './Strategy';
import styles from './page.module.css';

export async function generateMetadata({ params }) {
    await connection();
    const { key } = await params;
    const resolved = await loadEvent(key);
    const title = eventTitle(resolved);
    const path = `/race/${key}`;
    let description;
    if (resolved.kind === 'race') {
        const { event } = resolved;
        description = `Round ${event.round} of the ${event.year} Formula 1 season at ${event.circuit.name}: session times, results, grid and tyre strategy.`;
    } else if (resolved.kind === 'testing') {
        description = `${title} at ${resolved.meeting.circuitShortName || resolved.meeting.country}: dates and circuit.`;
    } else {
        description = `The ${title} was cancelled and is not part of the ${eventYear(resolved)} championship.`;
    }
    const displayTitle = resolved.kind === 'cancelled' ? `${title} (cancelled)` : title;
    return {
        title: displayTitle,
        description,
        alternates: { canonical: path },
        openGraph: { title: displayTitle, description, url: path, type: 'website' },
    };
}

function sessionWindow(event, session, now) {
    const start = Date.parse(event.sessions[session.key]);
    const window = (event.sessionWindows || []).find((item) => Date.parse(item.start) === start);
    const end = Date.parse(window?.end || '') || start + session.minutes * 60000;
    if (now >= start && now <= end) return 'live';
    if (now > end) return 'completed';
    return 'upcoming';
}

function sportsEventJsonLd(resolved, title, path) {
    const base = {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: title,
        sport: 'Formula 1',
        url: `${SITE_URL}${path}`,
    };
    if (resolved.kind === 'race') {
        const { event } = resolved;
        const raceEnd = Date.parse(event.raceStart || '') + 2 * 3600000;
        return {
            ...base,
            startDate: event.sessions.firstPractice || event.raceStart,
            ...(Number.isFinite(raceEnd) ? { endDate: new Date(raceEnd).toISOString() } : {}),
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            location: {
                '@type': 'Place',
                name: event.circuit.name,
                address: {
                    '@type': 'PostalAddress',
                    addressLocality: event.circuit.locality,
                    addressCountry: event.circuit.country,
                },
            },
        };
    }
    const { meeting } = resolved;
    return {
        ...base,
        startDate: meeting.dateStart,
        endDate: meeting.dateEnd,
        eventStatus: resolved.kind === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
            '@type': 'Place',
            name: meeting.circuitShortName || meeting.country,
            address: { '@type': 'PostalAddress', addressCountry: meeting.country },
        },
    };
}

function StatusBadge({ status }) {
    return <span className={`${styles.status} ${styles[`status_${status}`] || ''}`}>{STATUS_LABELS[status]}</span>;
}

function MeetingPage({ resolved, title, now }) {
    const { meeting } = resolved;
    const status = resolved.kind === 'cancelled' ? 'cancelled' : meetingStatus(meeting, now);
    return (
        <>
            <header className={styles.hero}>
                <div className={styles.heroContent}>
                    <Link href="/schedule" className={styles.backLink}>Calendar</Link>
                    <div className={styles.heroMeta}>
                        <span className={styles.round}>{resolved.kind === 'testing' ? 'Testing' : 'Not held'}</span>
                        <StatusBadge status={status} />
                    </div>
                    <h1>{title}</h1>
                    <p className={styles.circuit}>{[meeting.circuitShortName, meeting.country].filter(Boolean).join(', ')}</p>
                    <p className={styles.date}>
                        <LocalTime iso={meeting.dateStart} format="date" />
                        {meeting.dateEnd ? <> to <LocalTime iso={meeting.dateEnd} format="date" /></> : null}
                    </p>
                </div>
            </header>
            <div className="container">
                {resolved.kind === 'cancelled' ? (
                    <section className={styles.block}>
                        <h2>Cancelled</h2>
                        <p className={styles.notice}>
                            This Grand Prix was cancelled and does not count as a round of the {eventYear(resolved)} championship.
                        </p>
                        <p><Link href="/schedule" className={styles.entity}>See the {eventYear(resolved)} calendar</Link></p>
                    </section>
                ) : (
                    <section className={styles.block}>
                        <h2>Pre-season testing</h2>
                        <p className={styles.notice}>No points or race classification.</p>
                        <p>
                            <Link href="/live" className={styles.entity}>Live timing</Link>
                            {' · '}
                            <Link href="/schedule" className={styles.entity}>{eventYear(resolved)} calendar</Link>
                        </p>
                    </section>
                )}
            </div>
        </>
    );
}

async function RaceWeekend({ resolved, title, now }) {
    const { event } = resolved;
    const isCurrentSeason = event.year === getSeasonYear();
    const [results, driverNumbers] = await Promise.all([
        getWeekendResults(event, now),
        getDriverNumbers(),
    ]);
    const links = { drivers: driverNumbers, teams: isCurrentSeason };
    const scheduled = ICS_SESSIONS.filter((session) => event.sessions?.[session.key]);
    const raceRun = sessionDone('race', event.raceStart, now);
    const highlights = `https://www.youtube.com/results?search_query=${encodeURIComponent(`F1 ${event.year} ${event.raceName} highlights`)}`;

    const resultSections = [
        { id: 'race', heading: 'Race result', data: results.race, table: 'race' },
        { id: 'sprint', heading: 'Sprint result', data: results.sprint, table: 'race' },
        { id: 'qualifying', heading: 'Qualifying', data: results.qualifying, table: 'qualifying' },
    ].filter((section) => section.data !== null);

    return (
        <>
            <header className={styles.hero}>
                <div className={styles.heroContent}>
                    <Link href="/schedule" className={styles.backLink}>Calendar</Link>
                    <div className={styles.heroMeta}>
                        <span className={styles.round}>Round {event.round}</span>
                        <StatusBadge status={event.status} />
                    </div>
                    <h1>{title}</h1>
                    <p className={styles.circuit}>{event.circuit.name}</p>
                    <p className={styles.location}>{[event.circuit.locality, event.circuit.country].filter(Boolean).join(', ')}</p>
                    <p className={styles.date}>
                        <span className={styles.dateLabel}>Race</span> <LocalTime iso={event.raceStart} format="datetime" />
                    </p>
                </div>
            </header>

            <div className="container">
                {results.race?.length > 0 && (
                    <section className={styles.block} aria-labelledby="podium-heading">
                        <h2 id="podium-heading">Podium</h2>
                        <Podium results={results.race} links={links} />
                    </section>
                )}

                <section className={styles.block} aria-labelledby="sessions-heading">
                    <h2 id="sessions-heading">Weekend schedule</h2>
                    {scheduled.length > 0 ? (
                        <ol className={styles.sessions}>
                            {scheduled.map((session) => {
                                const status = sessionWindow(event, session, now);
                                return (
                                    <li key={session.key} className={`${styles.session} ${status === 'live' ? styles.sessionLive : ''}`}>
                                        <span className={styles.sessionName}>{session.label}</span>
                                        <LocalTime iso={event.sessions[session.key]} format="datetime" className={styles.sessionTime} />
                                        <StatusBadge status={status} />
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <p className={styles.notice}>Session times have not been published yet.</p>
                    )}
                </section>

                {resultSections.map((section) => (
                    <section key={section.id} className={styles.block} aria-labelledby={`${section.id}-heading`}>
                        <h2 id={`${section.id}-heading`}>{section.heading}</h2>
                        {section.data.length === 0 ? (
                            <p className={styles.notice}>The classification has not been published yet.</p>
                        ) : section.table === 'qualifying' ? (
                            <QualifyingTable results={section.data} links={links} caption={`${title} qualifying`} />
                        ) : (
                            <ClassificationTable results={section.data} links={links} caption={`${title} ${section.heading.toLowerCase()}`} />
                        )}
                    </section>
                ))}

                {raceRun && event.meetingKey != null && (
                    <Suspense fallback={<p className={styles.notice}>Loading tyre strategy</p>}>
                        <Strategy
                            meetingKey={event.meetingKey}
                            finishingOrder={(results.race || []).map((row) => row.number)}
                        />
                    </Suspense>
                )}
            </div>

            <RaceMap circuitId={event.circuit.id} />

            {raceRun && (
                <div className="container">
                    <p className={styles.externalLinks}>
                        <a href={highlights} target="_blank" rel="noopener noreferrer" className={styles.entity}>
                            Highlights on YouTube<span className={styles.srOnly}> (opens in a new tab)</span>
                        </a>
                    </p>
                </div>
            )}
        </>
    );
}

export default async function RaceDetailPage({ params }) {
    await connection();
    const { key } = await params;
    const resolved = await loadEvent(key);
    const now = requestTime();
    const title = eventTitle(resolved);
    const path = `/race/${key}`;

    return (
        <div className={styles.raceDetail}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdScript(sportsEventJsonLd(resolved, title, path)) }}
            />
            {resolved.kind === 'race'
                ? <RaceWeekend resolved={resolved} title={title} now={now} />
                : <MeetingPage resolved={resolved} title={title} now={now} />}
        </div>
    );
}
