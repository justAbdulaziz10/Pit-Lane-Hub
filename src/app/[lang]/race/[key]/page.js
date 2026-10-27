import { meetingStatus, requestTime, statusLabel } from '@/app/[lang]/schedule/status';
import LocalTime from '@/components/LocalTime';
import { getDriverNumbers, getWeekendResults, sessionDone } from '@/lib/f1/results';
import { getSeasonYear } from '@/lib/f1/year';
import { ICS_SESSIONS } from '@/lib/ics';
import { jsonLdScript } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';
import { countryName } from '@/lib/i18n/f1-names';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import raceMessages from '@/lib/i18n/messages/race';
import { fill, pick } from '@/lib/i18n/messages';
import { sessionLabel } from '@/lib/i18n/messages/time';
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
    const { key, lang } = await params;
    const t = pick(raceMessages, lang);
    const resolved = await loadEvent(key);
    const title = eventTitle(resolved, lang);
    const path = `/race/${key}`;
    let description;
    if (resolved.kind === 'race') {
        const { event } = resolved;
        description = fill(t.roundDescription, {
            round: formatNumber(lang, event.round),
            year: String(event.year),
            circuit: event.circuit.name,
        });
    } else if (resolved.kind === 'testing') {
        description = fill(t.testingDescription, {
            title,
            place: resolved.meeting.circuitShortName || countryName(resolved.meeting.country, lang),
        });
    } else {
        description = fill(t.cancelledDescription, { title, year: String(eventYear(resolved)) });
    }
    const displayTitle = resolved.kind === 'cancelled' ? `${title}${t.cancelledSuffix}` : title;
    return {
        title: displayTitle,
        description,
        alternates: localeAlternates(lang, path),
        openGraph: {
            title: displayTitle,
            description,
            url: localePath(lang, path),
            type: 'website',
            locale: lang === 'ar' ? 'ar_SA' : 'en_US',
        },
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

function sportsEventJsonLd(resolved, path, lang) {
    const base = {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: resolved.kind === 'race' ? resolved.event.raceName : resolved.meeting.name,
        sport: 'Formula 1',
        url: `${SITE_URL}${localePath(lang, path)}`,
        inLanguage: lang,
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

function StatusBadge({ status, lang }) {
    return <span className={`${styles.status} ${styles[`status_${status}`] || ''}`}>{statusLabel(status, lang)}</span>;
}

function MeetingPage({ resolved, title, now, lang }) {
    const t = pick(raceMessages, lang);
    const { meeting } = resolved;
    const status = resolved.kind === 'cancelled' ? 'cancelled' : meetingStatus(meeting, now);
    return (
        <>
            <header className={styles.hero}>
                <div className={styles.heroContent}>
                    <Link href={localePath(lang, '/schedule')} className={styles.backLink}>{t.backToCalendar}</Link>
                    <div className={styles.heroMeta}>
                        <span className={styles.round}>{resolved.kind === 'testing' ? t.testing : t.notHeld}</span>
                        <StatusBadge status={status} lang={lang} />
                    </div>
                    <h1>{title}</h1>
                    <p className={styles.circuit}>
                        {meeting.circuitShortName && <bdi dir="ltr">{meeting.circuitShortName}</bdi>}
                        {meeting.circuitShortName && meeting.country ? (lang === 'ar' ? '، ' : ', ') : ''}
                        {countryName(meeting.country, lang)}
                    </p>
                    <p className={styles.date}>
                        <LocalTime iso={meeting.dateStart} format="date" />
                        {meeting.dateEnd ? <> {t.dateRangeTo} <LocalTime iso={meeting.dateEnd} format="date" /></> : null}
                    </p>
                </div>
            </header>
            <div className="container">
                {resolved.kind === 'cancelled' ? (
                    <section className={styles.block}>
                        <h2>{t.cancelled}</h2>
                        <p className={styles.notice}>
                            {fill(t.cancelledNotice, { year: String(eventYear(resolved)) })}
                        </p>
                        <p><Link href={localePath(lang, '/schedule')} className={styles.entity}>{fill(t.seeCalendar, { year: String(eventYear(resolved)) })}</Link></p>
                    </section>
                ) : (
                    <section className={styles.block}>
                        <h2>{t.preSeasonTesting}</h2>
                        <p className={styles.notice}>{t.noPointsOrClassification}</p>
                        <p>
                            <Link href={localePath(lang, '/live')} className={styles.entity}>{t.liveTiming}</Link>
                            {' · '}
                            <Link href={localePath(lang, '/schedule')} className={styles.entity}>{fill(t.yearCalendar, { year: String(eventYear(resolved)) })}</Link>
                        </p>
                    </section>
                )}
            </div>
        </>
    );
}

async function RaceWeekend({ resolved, title, now, lang }) {
    const t = pick(raceMessages, lang);
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
        { id: 'race', heading: t.raceResult, data: results.race, table: 'race' },
        { id: 'sprint', heading: t.sprintResult, data: results.sprint, table: 'race' },
        { id: 'qualifying', heading: t.qualifying, data: results.qualifying, table: 'qualifying' },
    ].filter((section) => section.data !== null);

    return (
        <>
            <header className={styles.hero}>
                <div className={styles.heroContent}>
                    <Link href={localePath(lang, '/schedule')} className={styles.backLink}>{t.backToCalendar}</Link>
                    <div className={styles.heroMeta}>
                        <span className={styles.round}><bdi dir="auto">{fill(t.round, { round: formatNumber(lang, event.round) })}</bdi></span>
                        <StatusBadge status={event.status} lang={lang} />
                    </div>
                    <h1>{title}</h1>
                    <p className={styles.circuit}><bdi dir="ltr">{event.circuit.name}</bdi></p>
                    <p className={styles.location}>
                        {event.circuit.locality && <bdi dir="ltr">{event.circuit.locality}</bdi>}
                        {event.circuit.locality && event.circuit.country ? (lang === 'ar' ? '، ' : ', ') : ''}
                        {countryName(event.circuit.country, lang)}
                    </p>
                    <p className={styles.date}>
                        <span className={styles.dateLabel}>{t.raceStart}</span> <LocalTime iso={event.raceStart} format="datetime" />
                    </p>
                </div>
            </header>

            <div className="container">
                {results.race?.length > 0 && (
                    <section className={styles.block} aria-labelledby="podium-heading">
                        <h2 id="podium-heading">{t.podium}</h2>
                        <Podium results={results.race} links={links} lang={lang} />
                    </section>
                )}

                <section className={styles.block} aria-labelledby="sessions-heading">
                    <h2 id="sessions-heading">{t.weekendSchedule}</h2>
                    {scheduled.length > 0 ? (
                        <ol className={styles.sessions}>
                            {scheduled.map((session) => {
                                const status = sessionWindow(event, session, now);
                                return (
                                    <li key={session.key} className={`${styles.session} ${status === 'live' ? styles.sessionLive : ''}`}>
                                        <span className={styles.sessionName}>{sessionLabel(session.key, lang)}</span>
                                        <LocalTime iso={event.sessions[session.key]} format="datetime" className={styles.sessionTime} />
                                        <StatusBadge status={status} lang={lang} />
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <p className={styles.notice}>{t.sessionTimesUnpublished}</p>
                    )}
                </section>

                {resultSections.map((section) => (
                    <section key={section.id} className={styles.block} aria-labelledby={`${section.id}-heading`}>
                        <h2 id={`${section.id}-heading`}>{section.heading}</h2>
                        {section.data.length === 0 ? (
                            <p className={styles.notice}>{t.classificationUnpublished}</p>
                        ) : section.table === 'qualifying' ? (
                            <QualifyingTable results={section.data} links={links} caption={`${title} ${t.qualifying}`} lang={lang} />
                        ) : (
                            <ClassificationTable results={section.data} links={links} caption={`${title} ${section.heading}`} lang={lang} />
                        )}
                    </section>
                ))}

                {raceRun && event.meetingKey != null && (
                    <Suspense fallback={<p className={styles.notice}>{t.loadingTyreStrategy}</p>}>
                        <Strategy
                            meetingKey={event.meetingKey}
                            finishingOrder={(results.race || []).map((row) => row.number)}
                            lang={lang}
                        />
                    </Suspense>
                )}
            </div>

            <RaceMap circuitId={event.circuit.id} lang={lang} />

            {raceRun && (
                <div className="container">
                    <p className={styles.externalLinks}>
                        <a href={highlights} target="_blank" rel="noopener noreferrer" className={styles.entity}>
                            {t.highlightsOnYoutube}<span className={styles.srOnly}> {t.opensNewTab}</span>
                        </a>
                    </p>
                </div>
            )}
        </>
    );
}

export default async function RaceDetailPage({ params }) {
    await connection();
    const { key, lang } = await params;
    const resolved = await loadEvent(key);
    const now = requestTime();
    const title = eventTitle(resolved, lang);
    const path = `/race/${key}`;

    return (
        <div className={styles.raceDetail}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdScript(sportsEventJsonLd(resolved, path, lang)) }}
            />
            {resolved.kind === 'race'
                ? <RaceWeekend resolved={resolved} title={title} now={now} lang={lang} />
                : <MeetingPage resolved={resolved} title={title} now={now} lang={lang} />}
        </div>
    );
}
