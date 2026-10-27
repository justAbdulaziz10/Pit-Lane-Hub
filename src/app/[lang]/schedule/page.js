import LocalTime from '@/components/LocalTime';
import { countryName, raceName } from '@/lib/i18n/f1-names';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import scheduleMessages from '@/lib/i18n/messages/schedule';
import { fill, pick } from '@/lib/i18n/messages';
import { getCalendar } from '@/lib/f1/season';
import { getSeasonYear } from '@/lib/f1/year';
import { SITE_URL } from '@/lib/site';
import Link from 'next/link';
import { connection } from 'next/server';
import styles from './page.module.css';
import { meetingStatus, nextRound, requestTime, statusLabel, webcalUrl } from './status';

export async function generateMetadata({ params }) {
    await connection();
    const { lang } = await params;
    const t = pick(scheduleMessages, lang);
    const year = getSeasonYear();
    const yearText = String(year);
    const title = fill(t.title, { year: yearText });
    const description = fill(t.description, { year: yearText });
    return {
        title,
        description,
        alternates: localeAlternates(lang, '/schedule'),
        openGraph: {
            title: fill(t.openGraphTitle, { year: yearText }),
            description: fill(t.openGraphDescription, { year: yearText }),
            url: localePath(lang, '/schedule'),
            locale: lang === 'ar' ? 'ar_SA' : 'en_US',
        },
    };
}

function StatusBadge({ status, lang }) {
    return <span className={`${styles.status} ${styles[`status_${status}`] || ''}`}>{statusLabel(status, lang)}</span>;
}

function RoundCard({ event, isNext, t, lang }) {
    const content = (
        <>
            <div className={styles.cardTop}>
                <span className={styles.round}><bdi dir="auto">{fill(t.round, { round: formatNumber(lang, event.round) })}</bdi></span>
                <StatusBadge status={event.status} lang={lang} />
            </div>
            <h3 className={styles.raceName}>{raceName(event.raceName, lang)}</h3>
            <p className={styles.circuit}><bdi dir="ltr">{event.circuit.name}</bdi></p>
            <p className={styles.country}>
                {event.circuit.locality && <bdi dir="ltr">{event.circuit.locality}</bdi>}
                {event.circuit.locality && event.circuit.country ? (lang === 'ar' ? '، ' : ', ') : ''}
                {countryName(event.circuit.country, lang)}
            </p>
            <p className={styles.dates}>
                <span className={styles.dateLabel}>{t.race}</span>
                <LocalTime iso={event.raceStart} format="datetime" />
            </p>
        </>
    );
    const className = `${styles.raceCard} ${isNext ? styles.next : ''} ${event.status === 'completed' ? styles.past : ''}`;
    return (
        <li>
            {event.meetingKey != null ? (
                <Link
                    href={localePath(lang, `/race/${event.meetingKey}`)}
                    className={className}
                    aria-current={isNext ? 'true' : undefined}
                >
                    {content}
                </Link>
            ) : (
                <div className={className}>{content}</div>
            )}
        </li>
    );
}

function MeetingRow({ meeting, status, t, lang }) {
    const yearName = meeting.name.match(/^(\d{4})\s+(.+)$/);
    const name = lang !== 'ar'
        ? meeting.name
        : meeting.is_testing
            ? <>{t.preSeasonTesting} · <bdi dir="ltr">{meeting.circuitShortName || countryName(meeting.country, lang)}</bdi></>
            : yearName
                ? <><bdi dir="ltr">{String(Number(yearName[1]))}</bdi> {raceName(yearName[2], lang)}</>
                : <bdi dir="ltr">{meeting.name}</bdi>;
    return (
        <li className={styles.meetingRow}>
            <div>
                {meeting.meetingKey != null ? (
                    <Link href={localePath(lang, `/race/${meeting.meetingKey}`)} className={styles.meetingName}>{name}</Link>
                ) : (
                    <span className={styles.meetingName}>{name}</span>
                )}
                <p className={styles.circuit}>
                    {meeting.circuitShortName && <bdi dir="ltr">{meeting.circuitShortName}</bdi>}
                    {meeting.circuitShortName && meeting.country ? (lang === 'ar' ? '، ' : ', ') : ''}
                    {countryName(meeting.country, lang)}
                </p>
            </div>
            <p className={styles.meetingDates}>
                <LocalTime iso={meeting.dateStart} format="dayMonth" />
                {meeting.dateEnd ? (
                    <>
                        {` ${t.dateRangeTo} `}
                        <LocalTime iso={meeting.dateEnd} format="dayMonth" />
                    </>
                ) : null}
            </p>
            <StatusBadge status={status} lang={lang} />
        </li>
    );
}

export default async function SchedulePage({ params }) {
    const { lang } = await params;
    const t = pick(scheduleMessages, lang);
    await connection();
    const now = requestTime();
    const calendar = await getCalendar(getSeasonYear(), now);
    const { year, rounds } = calendar;
    const next = nextRound(rounds);
    const testing = calendar.testing.filter((meeting) => !meeting.is_cancelled);
    const cancelled = calendar.cancelled;
    const completedCount = rounds.filter((event) => event.status === 'completed').length;

    return (
        <div className={styles.schedule}>
            <header className={styles.header}>
                <div className="container">
                    <h1>{fill(t.title, { year: String(year) })}</h1>
                    {rounds.length > 0 && (
                        <p className={styles.summary}>
                            <bdi dir="auto">{fill(t.summary, {
                                rounds: formatNumber(lang, rounds.length),
                                completed: formatNumber(lang, completedCount),
                            })}</bdi>
                        </p>
                    )}
                    <div className={styles.actions}>
                        <a href={webcalUrl(SITE_URL)} className="btn btn-primary">{t.subscribe}</a>
                        <a href="/calendar.ics" download={`f1-${year}.ics`} className="btn btn-secondary">{t.downloadIcs}</a>
                    </div>
                </div>
            </header>

            <div className={styles.content}>
                <div className="container">
                    <section aria-labelledby="rounds-heading">
                        <h2 id="rounds-heading" className={styles.sectionTitle}>{t.grandsPrix}</h2>
                        {rounds.length > 0 ? (
                            <ol className={styles.grid}>
                                {rounds.map((event) => (
                                    <RoundCard key={event.round} event={event} isNext={event === next} t={t} lang={lang} />
                                ))}
                            </ol>
                        ) : (
                            <p className={styles.empty}>{fill(t.calendarNotPublished, { year: String(year) })}</p>
                        )}
                    </section>

                    {testing.length > 0 && (
                        <section aria-labelledby="testing-heading" className={styles.section}>
                            <h2 id="testing-heading" className={styles.sectionTitle}>{t.preSeasonTesting}</h2>
                            <ul className={styles.meetingList}>
                                {testing.map((meeting) => (
                                    <MeetingRow
                                        key={meeting.meetingKey ?? meeting.dateStart}
                                        meeting={meeting}
                                        status={meetingStatus(meeting, now)}
                                        t={t}
                                        lang={lang}
                                    />
                                ))}
                            </ul>
                        </section>
                    )}

                    {cancelled.length > 0 && (
                        <section aria-labelledby="cancelled-heading" className={styles.section}>
                            <h2 id="cancelled-heading" className={styles.sectionTitle}>{t.cancelled}</h2>
                            <ul className={styles.meetingList}>
                                {cancelled.map((meeting) => (
                                    <MeetingRow
                                        key={meeting.meetingKey ?? meeting.dateStart}
                                        meeting={meeting}
                                        status="cancelled"
                                        t={t}
                                        lang={lang}
                                    />
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
