import Link from 'next/link';
import { connection } from 'next/server';
import { getCircuitView } from '@/lib/f1/circuits';
import { getCalendar } from '@/lib/f1/season';
import styles from './page.module.css';

export default async function TracksPage() {
    await connection();
    const calendar = await getCalendar();
    const seen = new Set();
    const circuits = calendar.rounds
        .filter((event) => event.circuit?.id && !seen.has(event.circuit.id) && seen.add(event.circuit.id))
        .map((event) => ({ event, view: getCircuitView(event.circuit.id) }));

    return (
        <div className={styles.tracksPage}>
            <header className="container">
                <h1 className={styles.title}>{calendar.year} circuits</h1>
            </header>
            <ol className={`container ${styles.grid}`}>
                {circuits.map(({ event, view }) => (
                    <li key={event.circuit.id}>
                        <Link href={`/tracks/${event.circuit.id}`} className={styles.card}>
                            <span className={styles.round}>Round {event.round}</span>
                            {view ? (
                                <svg viewBox={view.outline.viewBox} className={styles.outline} aria-hidden="true">
                                    <path d={`${view.outline.d} Z`} />
                                </svg>
                            ) : (
                                <span className={styles.outline} aria-hidden="true" />
                            )}
                            <span className={styles.name}>{event.circuit.name}</span>
                            <span className={styles.meta}>
                                {[event.circuit.locality, event.circuit.country].filter(Boolean).join(', ')}
                                {view?.length && ` · ${view.length}`}
                            </span>
                        </Link>
                    </li>
                ))}
            </ol>
        </div>
    );
}
