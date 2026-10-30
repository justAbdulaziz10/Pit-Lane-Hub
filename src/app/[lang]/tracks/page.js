import Link from 'next/link';
import { getCircuitView } from '@/lib/f1/circuits';
import { getCalendar } from '@/lib/f1/season';
import { countryName } from '@/lib/i18n/f1-names';
import { localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import tracksMessages from '@/lib/i18n/messages/tracks';
import { fill, pick } from '@/lib/i18n/messages';
import { circuitLength } from './length';
import styles from './page.module.css';

export const revalidate = 3600;

export default async function TracksPage({ params }) {
    const { lang } = await params;
    const t = pick(tracksMessages, lang);
    const calendar = await getCalendar();
    const seen = new Set();
    const circuits = calendar.rounds
        .filter((event) => event.circuit?.id && !seen.has(event.circuit.id) && seen.add(event.circuit.id))
        .map((event) => ({ event, view: getCircuitView(event.circuit.id) }))
        .filter(({ view }) => view);

    return (
        <div className={styles.tracksPage}>
            <header className={`page-hero ${styles.header}`}>
                <div className="page-hero__content">
                    <span className="page-hero__badge"><span aria-hidden="true">🏁</span>{t.heroBadge}</span>
                    <h1 className="page-hero__title">{fill(t.title, { year: String(calendar.year) })}</h1>
                    <p className="page-hero__subline">{t.heroSubline}</p>
                </div>
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
                            </span>
                            {view?.length && (
                                <span className={styles.length}>
                                    <bdi>{circuitLength(view.length, lang)}</bdi>
                                    <small>{t.lapLength}</small>
                                </span>
                            )}
                        </Link>
                    </li>
                ))}
            </ol>
        </div>
    );
}
