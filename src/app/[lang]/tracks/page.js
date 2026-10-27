import Link from 'next/link';
import { connection } from 'next/server';
import { getCircuitView } from '@/lib/f1/circuits';
import { getCalendar } from '@/lib/f1/season';
import { countryName } from '@/lib/i18n/f1-names';
import { localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import tracksMessages from '@/lib/i18n/messages/tracks';
import { fill, pick } from '@/lib/i18n/messages';
import { circuitLength } from './length';
import styles from './page.module.css';

export default async function TracksPage({ params }) {
    const { lang } = await params;
    const t = pick(tracksMessages, lang);
    await connection();
    const calendar = await getCalendar();
    const seen = new Set();
    const circuits = calendar.rounds
        .filter((event) => event.circuit?.id && !seen.has(event.circuit.id) && seen.add(event.circuit.id))
        .map((event) => ({ event, view: getCircuitView(event.circuit.id) }));

    return (
        <div className={styles.tracksPage}>
            <header className="container">
                <h1 className={styles.title}>{fill(t.title, { year: String(calendar.year) })}</h1>
            </header>
            <ol className={`container ${styles.grid}`}>
                {circuits.map(({ event, view }) => (
                    <li key={event.circuit.id}>
                        <Link href={localePath(lang, `/tracks/${event.circuit.id}`)} className={styles.card}>
                            <span className={styles.round}><bdi dir="auto">{fill(t.round, { round: formatNumber(lang, event.round) })}</bdi></span>
                            {view ? (
                                <svg viewBox={view.outline.viewBox} className={styles.outline} aria-hidden="true">
                                    <path d={`${view.outline.d} Z`} />
                                </svg>
                            ) : (
                                <span className={styles.outline} aria-hidden="true" />
                            )}
                            <span className={styles.name}><bdi dir="ltr">{event.circuit.name}</bdi></span>
                            <span className={styles.meta}>
                                {event.circuit.locality && <bdi dir="ltr">{event.circuit.locality}</bdi>}
                                {event.circuit.locality && event.circuit.country ? (lang === 'ar' ? '، ' : ', ') : ''}
                                {countryName(event.circuit.country, lang)}
                                {view?.length && <> · <bdi>{circuitLength(view.length, lang)}</bdi></>}
                            </span>
                        </Link>
                    </li>
                ))}
            </ol>
        </div>
    );
}
