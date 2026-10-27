'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import LocalTime, { Countdown } from '@/components/LocalTime';
import { countryName, raceName } from '@/lib/i18n/f1-names';
import { localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import scheduleMessages from '@/lib/i18n/messages/schedule';
import { fill, pick } from '@/lib/i18n/messages';
import { calendarRoundRows, initialCalendarRoundRows, meetingStatus, nextSessionTime, statusLabel, testingLabel } from './status';
import styles from './page.module.css';

function StatusBadge({ status, lang }) {
    return <span className={`${styles.status} ${styles[`status_${status}`] || ''}`}>{statusLabel(status, lang)}</span>;
}

function RoundCard({ event, status, t, lang, now }) {
    const sessionTimes = [
        ['qualifying', t.qualifying],
        ['sprintQualifying', t.sprintQualifying],
        ['sprint', t.sprint],
    ].filter(([key]) => event.sessions?.[key]);
    const isSprint = Boolean(event.sessions?.sprint);

    return (
        <li>
            <Link
                href={localePath(lang, `/race/${event.routeKey}`)}
                className={`${styles.raceCard} ${status === 'next' ? styles.next : ''}`}
                aria-current={status === 'next' ? 'true' : undefined}
            >
                <div className={styles.cardTop}>
                    <span className={styles.round}><bdi dir="auto">{fill(t.round, { round: formatNumber(lang, event.round) })}</bdi></span>
                    <span className={styles.cardTags}>
                        {isSprint && <span className={styles.sprintTag}>{t.sprintTag}</span>}
                        {(status === 'next' || status === 'live') && <StatusBadge status={status} lang={lang} />}
                    </span>
                </div>
                <h3 className={styles.raceName}>{raceName(event.raceName, lang)}</h3>
                <p className={styles.circuit}><bdi dir="ltr">{event.circuit.name}</bdi></p>
                <p className={styles.country}>
                    {event.circuit.locality && <bdi dir="ltr">{event.circuit.locality}</bdi>}
                    {event.circuit.locality && event.circuit.country ? (lang === 'ar' ? '، ' : ', ') : ''}
                    {countryName(event.circuit.country, lang)}
                </p>
                <div className={styles.cardTimes}>
                    <p className={styles.dates}>
                        <span className={styles.dateLabel}>{t.race}</span>
                        <LocalTime iso={event.raceStart} format="datetime" />
                    </p>
                    {status === 'next' && now != null && (
                        <Countdown target={nextSessionTime(event, now)} serverNow={now} className={styles.countdown} unitClassName={styles.countdownUnit} valueClassName={styles.countdownValue} labelClassName={styles.countdownLabel} />
                    )}
                    {sessionTimes.length > 0 && (
                        <ul className={styles.sessionTimes}>
                            {sessionTimes.map(([key, label]) => (
                                <li key={key}>
                                    <span>{label}</span>
                                    <LocalTime iso={event.sessions[key]} format="datetime" />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Link>
        </li>
    );
}

function CompletedRound({ event, winner, t, lang }) {
    const winnerName = winner ? [winner.firstName, winner.lastName].filter(Boolean).join(' ') : null;
    return (
        <li>
            <Link
                href={localePath(lang, `/race/${event.routeKey}`)}
                className={styles.completedRow}
                style={{ '--winner-color': winner?.color || 'transparent' }}
            >
                <span className={styles.completedRound}><bdi dir="auto">{fill(t.round, { round: formatNumber(lang, event.round) })}</bdi></span>
                <span className={styles.completedRace}>{raceName(event.raceName, lang)}</span>
                <span className={styles.completedWinner}>
                    {winnerName ? (
                        <>
                            <span className={styles.winnerLabel}>{t.winner}</span>
                            <bdi dir="ltr">{winnerName}</bdi>
                            {winner.teamName && <span className={styles.winnerTeam}><bdi dir="ltr">{winner.teamName}</bdi></span>}
                        </>
                    ) : (
                        <span className={styles.winnerLabel}>{t.winnerUnavailable}</span>
                    )}
                </span>
            </Link>
        </li>
    );
}

function MeetingRow({ meeting, status, index, t, lang }) {
    const name = meeting.is_testing ? testingLabel(index, lang) : meeting.name;
    const contents = (
        <>
            <div>
                <span className={styles.meetingName}>{name}</span>
                <p className={styles.circuit}>
                    {meeting.circuitShortName && <bdi dir="ltr">{meeting.circuitShortName}</bdi>}
                    {meeting.circuitShortName && meeting.country ? (lang === 'ar' ? '، ' : ', ') : ''}
                    {countryName(meeting.country, lang)}
                </p>
            </div>
            <p className={styles.meetingDates}>
                <LocalTime iso={meeting.dateStart} format="dayMonth" />
                {meeting.dateEnd ? <> {t.dateRangeTo} <LocalTime iso={meeting.dateEnd} format="dayMonth" /></> : null}
            </p>
            <StatusBadge status={status} lang={lang} />
        </>
    );
    const row = meeting.meetingKey != null
        ? <Link href={localePath(lang, `/race/${meeting.meetingKey}`)} className={styles.meetingRow}>{contents}</Link>
        : <li className={styles.meetingRow}>{contents}</li>;
    return meeting.meetingKey != null ? <li>{row}</li> : row;
}

export default function CalendarRounds({ rounds, testing, cancelled, winners, lang }) {
    const [now, setNow] = useState(null);
    const t = pick(scheduleMessages, lang);
    const groups = now == null ? initialCalendarRoundRows(rounds) : calendarRoundRows(rounds, now);

    useEffect(() => {
        const update = () => setNow(Date.now());
        update();
        const timer = setInterval(update, 60_000);
        return () => clearInterval(timer);
    }, []);

    return (
        <>
            <section aria-labelledby="upcoming-heading">
                <h2 id="upcoming-heading" className={styles.sectionTitle}>{t.upcoming}</h2>
                {groups.upcoming.length > 0 ? (
                    <ol className={styles.grid}>
                        {groups.upcoming.map(({ event, status }) => (
                            <RoundCard key={event.round} event={event} status={status} t={t} lang={lang} now={now} />
                        ))}
                    </ol>
                ) : <p className={styles.empty}>{t.noUpcomingRounds}</p>}
            </section>

            {groups.completed.length > 0 && (
                <section aria-labelledby="completed-heading" className={styles.section}>
                    <h2 id="completed-heading" className={styles.sectionTitle}>{t.completedRounds}</h2>
                    <ol className={styles.completedList}>
                        {groups.completed.map(({ event }) => (
                            <CompletedRound key={event.round} event={event} winner={winners[event.round]} t={t} lang={lang} />
                        ))}
                    </ol>
                </section>
            )}

            {testing.length > 0 && (
                <section aria-labelledby="testing-heading" className={styles.section}>
                    <h2 id="testing-heading" className={styles.sectionTitle}>{t.preSeasonTesting}</h2>
                    <ul className={styles.meetingList}>
                        {testing.map((meeting, index) => (
                            <MeetingRow key={meeting.meetingKey ?? meeting.dateStart} meeting={meeting} index={index} status={meetingStatus(meeting, now)} t={t} lang={lang} />
                        ))}
                    </ul>
                </section>
            )}

            {cancelled.length > 0 && (
                <section aria-labelledby="cancelled-heading" className={styles.section}>
                    <h2 id="cancelled-heading" className={styles.sectionTitle}>{t.cancelled}</h2>
                    <ul className={styles.meetingList}>
                        {cancelled.map((meeting) => (
                            <MeetingRow key={meeting.meetingKey ?? meeting.dateStart} meeting={meeting} status="cancelled" t={t} lang={lang} />
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}
