import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import CircuitPanel from '@/components/CircuitPanel';
import { CIRCUIT_FEATURE_IDS, getCircuitView } from '@/lib/f1/circuits';
import { getCalendar } from '@/lib/f1/season';
import { jsonLdScript } from '@/lib/jsonld';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import styles from '../page.module.css';

function loadCircuit(circuitId) {
    const id = String(circuitId || '').toLowerCase();
    if (!Object.hasOwn(CIRCUIT_FEATURE_IDS, id)) return null;
    return getCircuitView(id);
}

export async function generateMetadata({ params }) {
    const { circuitId } = await params;
    const circuit = loadCircuit(circuitId);
    if (!circuit) notFound();
    const description = [circuit.name, circuit.length && `${circuit.length} lap`].filter(Boolean).join(', ');
    return {
        // The /tracks layout sets a plain title, which stops the root template here.
        title: { absolute: `${circuit.name} | ${SITE_NAME}` },
        description: `${description}. Track layout, 3D view and Formula 1 race dates.`,
        alternates: { canonical: `/tracks/${circuit.circuitId}` },
        openGraph: { title: circuit.name, url: `/tracks/${circuit.circuitId}` },
    };
}

export default async function CircuitPage({ params }) {
    const { circuitId } = await params;
    const circuit = loadCircuit(circuitId);
    if (!circuit) notFound();
    await connection();
    const calendar = await getCalendar();
    const events = calendar.rounds.filter((event) => event.circuit?.id === circuit.circuitId);
    const place = events[0]?.circuit;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Place',
        name: circuit.name,
        url: `${SITE_URL}/tracks/${circuit.circuitId}`,
        geo: { '@type': 'GeoCoordinates', latitude: circuit.center.lat, longitude: circuit.center.lng },
        ...(place?.country && { address: { '@type': 'PostalAddress', addressLocality: place.locality, addressCountry: place.country } }),
    };

    return (
        <div className={styles.tracksPage}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
            <div className={`container ${styles.detail}`}>
                <header>
                    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
                        <Link href="/tracks">Circuits</Link>
                    </nav>
                    <h1 className={styles.title}>{circuit.name}</h1>
                    <dl className={styles.facts}>
                        {place && (
                            <div>
                                <dt>Location</dt>
                                <dd>{[place.locality, place.country].filter(Boolean).join(', ')}</dd>
                            </div>
                        )}
                        {circuit.length && (
                            <div>
                                <dt>Lap length</dt>
                                <dd>{circuit.length}</dd>
                            </div>
                        )}
                        {events.map((event) => (
                            <div key={event.round}>
                                <dt>{calendar.year} round {event.round}</dt>
                                <dd>
                                    {event.meetingKey
                                        ? <Link href={`/race/${event.meetingKey}`}>{event.raceName}</Link>
                                        : event.raceName}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </header>
                <CircuitPanel circuit={circuit} />
            </div>
        </div>
    );
}
