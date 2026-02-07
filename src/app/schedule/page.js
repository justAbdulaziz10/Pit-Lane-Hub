import { getMeetings } from '@/lib/f1api';
import { SCHEDULE_2026 } from '@/lib/schedule2026';
import Link from 'next/link';
import styles from './page.module.css';

export const revalidate = 3600; // Revalidate every hour

export const metadata = {
    title: 'F1 Schedule 2026 | Race Calendar',
    description: 'Full Formula 1 2026 race calendar, dates, times, and circuit information. Don\'t miss a race.',
};

export default async function SchedulePage() {
    let meetings = [];
    let error = null;
    let year = 2026;

    try {
        meetings = await getMeetings(year);
        if (meetings.length === 0) {
            // Fallback to hardcoded 2026 schedule if API is empty
            meetings = SCHEDULE_2026;
        }
    } catch (e) {
        error = 'Failed to load schedule data';
        console.error(e);
        // Fallback on error too
        meetings = SCHEDULE_2026;
        error = null; // Clear error since we have fallback
    }

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDateRange = (start, end) => {
        const startDate = formatDate(start);
        const endDate = formatDate(end);
        if (startDate === endDate) return startDate;
        return `${startDate} - ${endDate}`;
    };

    const isPast = (dateString) => {
        if (!dateString) return false;
        return new Date(dateString) < new Date();
    };

    const isUpcoming = (dateString) => {
        if (!dateString) return false;
        const raceDate = new Date(dateString);
        const now = new Date();
        const diff = raceDate - now;
        return diff > 0 && diff < 14 * 24 * 60 * 60 * 1000;
    };

    return (
        <div className={styles.schedule}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>📅 RACE CALENDAR</span>
                    <h1>{year} Schedule</h1>
                    <p>Click any race for details, videos & track map</p>
                </div>
            </div>

            {/* Schedule Grid */}
            <div className={styles.content}>
                <div className="container">
                    {error ? (
                        <div className={styles.error}>
                            <span className={styles.errorIcon}>⚠️</span>
                            <h3>Unable to load schedule</h3>
                            <p>{error}</p>
                        </div>
                    ) : meetings.length > 0 ? (
                        <div className={styles.grid}>
                            {meetings.map((meeting, index) => (
                                <Link
                                    key={meeting.meeting_key || index}
                                    href={`/race/${meeting.meeting_key}`}
                                    className={`${styles.raceCard} ${isPast(meeting.date_start) ? styles.past : ''} ${isUpcoming(meeting.date_start) ? styles.upcoming : ''}`}
                                >
                                    {isUpcoming(meeting.date_start) && (
                                        <span className={styles.upcomingBadge}>UPCOMING</span>
                                    )}
                                    <div className={styles.round}>
                                        Round {index + 1}
                                    </div>
                                    <h3 className={styles.raceName}>
                                        {meeting.meeting_name || meeting.meeting_official_name}
                                    </h3>
                                    <div className={styles.location}>
                                        <span className={styles.country}>{meeting.country_name}</span>
                                        <span className={styles.circuit}>{meeting.circuit_short_name}</span>
                                    </div>
                                    <div className={styles.dates}>
                                        {formatDateRange(meeting.date_start, meeting.date_end)}
                                    </div>
                                    {isPast(meeting.date_start) && (
                                        <div className={styles.completed}>✓ Completed</div>
                                    )}
                                    <div className={styles.viewDetails}>View Details →</div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Loading schedule...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* API Credit */}
            <div className={styles.credit}>
                <div className="container">
                    <p>
                        Data provided by{' '}
                        <a href="https://openf1.org" target="_blank" rel="noopener noreferrer">
                            OpenF1 API
                        </a>
                        {' '}— Updates automatically every hour
                    </p>
                </div>
            </div>
        </div>
    );
}
