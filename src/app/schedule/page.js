import { getCurrentYear, getMeetings } from '@/lib/f1api';
import styles from './page.module.css';

export const revalidate = 3600;

export default async function SchedulePage() {
    let meetings = [];
    let error = null;

    try {
        meetings = await getMeetings();
    } catch (e) {
        error = 'Failed to load schedule data';
        console.error(e);
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
                    <h1>{getCurrentYear()} Schedule</h1>
                    <p>All race weekends in the F1 calendar</p>
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
                                <div
                                    key={meeting.meeting_key || index}
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
                                </div>
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
                        {' '}— Free and open source
                    </p>
                </div>
            </div>
        </div>
    );
}
