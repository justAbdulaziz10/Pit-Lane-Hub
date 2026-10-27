import LocalTime from '@/components/LocalTime';
import { getCalendar } from '@/lib/f1/season';
import { getSeasonYear } from '@/lib/f1/year';
import { SITE_URL } from '@/lib/site';
import Link from 'next/link';
import { connection } from 'next/server';
import styles from './page.module.css';
import { meetingStatus, nextRound, requestTime, STATUS_LABELS, webcalUrl } from './status';

export async function generateMetadata() {
    await connection();
    const year = getSeasonYear();
    return {
        title: `${year} F1 Calendar and Race Times`,
        description: `Every round of the ${year} Formula 1 season with circuits and session times in your timezone. Subscribe to the calendar.`,
        alternates: { canonical: '/schedule' },
        openGraph: {
            title: `${year} F1 Calendar`,
            description: `Every round of the ${year} Formula 1 season with session times in your timezone.`,
            url: '/schedule',
        },
    };
}

function StatusBadge({ status }) {
    return <span className={`${styles.status} ${styles[`status_${status}`] || ''}`}>{STATUS_LABELS[status]}</span>;
}

function RoundCard({ event, isNext }) {
    const content = (
        <>
            <div className={styles.cardTop}>
                <span className={styles.round}>Round {event.round}</span>
                <StatusBadge status={event.status} />
            </div>
            <h3 className={styles.raceName}>{event.raceName}</h3>
            <p className={styles.circuit}>{event.circuit.name}</p>
            <p className={styles.country}>
                {[event.circuit.locality, event.circuit.country].filter(Boolean).join(', ')}
            </p>
            <p className={styles.dates}>
                <span className={styles.dateLabel}>Race</span>
                <LocalTime iso={event.raceStart} format="datetime" />
            </p>
        </>
    );
    const className = `${styles.raceCard} ${isNext ? styles.next : ''} ${event.status === 'completed' ? styles.past : ''}`;
    return (
        <li>
            {event.meetingKey != null ? (
                <Link
                    href={`/race/${event.meetingKey}`}
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

function MeetingRow({ meeting, status }) {
    const name = meeting.name;
    return (
        <li className={styles.meetingRow}>
            <div>
                {meeting.meetingKey != null ? (
                    <Link href={`/race/${meeting.meetingKey}`} className={styles.meetingName}>{name}</Link>
                ) : (
                    <span className={styles.meetingName}>{name}</span>
                )}
                <p className={styles.circuit}>
                    {[meeting.circuitShortName, meeting.country].filter(Boolean).join(', ')}
                </p>
            </div>
            <p className={styles.meetingDates}>
                <LocalTime iso={meeting.dateStart} format="dayMonth" />
                {meeting.dateEnd ? (
                    <>
                        {' to '}
                        <LocalTime iso={meeting.dateEnd} format="dayMonth" />
                    </>
                ) : null}
            </p>
            <StatusBadge status={status} />
        </li>
    );
}

export default async function SchedulePage() {
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
                    <h1>{year} F1 Calendar</h1>
                    {rounds.length > 0 && (
                        <p className={styles.summary}>
                            {rounds.length} rounds, {completedCount} completed
                        </p>
                    )}
                    <div className={styles.actions}>
                        <a href={webcalUrl(SITE_URL)} className="btn btn-primary">Subscribe to calendar</a>
                        <a href="/calendar.ics" download={`f1-${year}.ics`} className="btn btn-secondary">Download .ics</a>
                    </div>
                </div>
            </header>

            <div className={styles.content}>
                <div className="container">
                    <section aria-labelledby="rounds-heading">
                        <h2 id="rounds-heading" className={styles.sectionTitle}>Grands Prix</h2>
                        {rounds.length > 0 ? (
                            <ol className={styles.grid}>
                                {rounds.map((event) => (
                                    <RoundCard key={event.round} event={event} isNext={event === next} />
                                ))}
                            </ol>
                        ) : (
                            <p className={styles.empty}>The {year} calendar has not been published yet.</p>
                        )}
                    </section>

                    {testing.length > 0 && (
                        <section aria-labelledby="testing-heading" className={styles.section}>
                            <h2 id="testing-heading" className={styles.sectionTitle}>Pre-season testing</h2>
                            <ul className={styles.meetingList}>
                                {testing.map((meeting) => (
                                    <MeetingRow
                                        key={meeting.meetingKey ?? meeting.dateStart}
                                        meeting={meeting}
                                        status={meetingStatus(meeting, now)}
                                    />
                                ))}
                            </ul>
                        </section>
                    )}

                    {cancelled.length > 0 && (
                        <section aria-labelledby="cancelled-heading" className={styles.section}>
                            <h2 id="cancelled-heading" className={styles.sectionTitle}>Cancelled</h2>
                            <ul className={styles.meetingList}>
                                {cancelled.map((meeting) => (
                                    <MeetingRow
                                        key={meeting.meetingKey ?? meeting.dateStart}
                                        meeting={meeting}
                                        status="cancelled"
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
