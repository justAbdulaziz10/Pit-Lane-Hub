import { metadataOrNotFound } from '@/lib/i18n/metadata';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CircuitPanel from '@/components/CircuitPanel';
import { CIRCUIT_FEATURE_IDS, getCircuitView } from '@/lib/f1/circuits';
import { getCalendar } from '@/lib/f1/season';
import { getCircuitHistory } from '@/lib/f1/race-extras';
import { jsonLdScript } from '@/lib/jsonld';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { countryName, raceName } from '@/lib/i18n/f1-names';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import tracksMessages from '@/lib/i18n/messages/tracks';
import { fill, pick } from '@/lib/i18n/messages';
import styles from '../page.module.css';
import { circuitLength } from '../length';

export const revalidate = 3600;

function loadCircuit(circuitId) {
    const id = String(circuitId || '').toLowerCase();
    if (!Object.hasOwn(CIRCUIT_FEATURE_IDS, id)) return null;
    return getCircuitView(id);
}

export async function generateMetadata({ params }) {
    const { circuitId, lang } = await params;
    return metadataOrNotFound(lang, async () => {
        const t = pick(tracksMessages, lang);
        const circuit = loadCircuit(circuitId);
        if (!circuit) notFound();
        const description = circuit.length
            ? fill(t.circuitDescription, { name: circuit.name, length: circuitLength(circuit.length, lang) })
            : fill(t.circuitDescriptionNoLength, { name: circuit.name });
        const path = `/tracks/${circuit.circuitId}`;
        const canonical = `${SITE_URL}${localePath(lang, path)}`;
        const image = `${SITE_URL}${localePath(lang, '/opengraph-image')}`;
        const title = fill(t.circuitPageTitle, { name: circuit.name });
        return {
            // The /tracks layout sets a plain title, which stops the root template here.
            title: { absolute: title || `${circuit.name} | ${SITE_NAME}` },
            description,
            alternates: localeAlternates(lang, path),
            openGraph: {
                title,
                description,
                url: canonical,
                images: [{ url: image, width: 1200, height: 630, alt: title }],
                locale: lang === 'ar' ? 'ar_SA' : 'en_US',
            },
            twitter: { card: 'summary_large_image', images: [image] },
        };
    });
}

export default async function CircuitPage({ params }) {
    const { circuitId, lang } = await params;
    const t = pick(tracksMessages, lang);
    const circuit = loadCircuit(circuitId);
    if (!circuit) notFound();
    const [calendar, history] = await Promise.all([
        getCalendar(),
        getCircuitHistory(circuit.circuitId),
    ]);
    const events = calendar.rounds.filter((event) => event.circuit?.id === circuit.circuitId);
    const place = events[0]?.circuit;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Place',
        name: circuit.name,
        url: `${SITE_URL}${localePath(lang, `/tracks/${circuit.circuitId}`)}`,
        inLanguage: lang,
        geo: { '@type': 'GeoCoordinates', latitude: circuit.center.lat, longitude: circuit.center.lng },
        ...(place?.country && { address: { '@type': 'PostalAddress', addressLocality: place.locality, addressCountry: place.country } }),
    };

    return (
        <div className={styles.tracksPage}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
            <div className={`container ${styles.detail}`}>
                <header>
                    <nav aria-label={t.breadcrumbLandmark} className={styles.breadcrumb}>
                        <Link href={localePath(lang, '/tracks')}>{t.breadcrumb}</Link>
                    </nav>
                    <h1 className={styles.title}>{circuit.name}</h1>
                    <dl className={styles.facts}>
                        {place && (
                            <div>
                                <dt>{t.location}</dt>
                                <dd>
                                    {place.locality && <bdi dir="ltr">{place.locality}</bdi>}
                                    {place.locality && place.country ? (lang === 'ar' ? '، ' : ', ') : ''}
                                    {countryName(place.country, lang)}
                                </dd>
                            </div>
                        )}
                        {circuit.length && (
                            <div>
                                <dt>{t.lapLength}</dt>
                                <dd><bdi>{circuitLength(circuit.length, lang)}</bdi></dd>
                            </div>
                        )}
                        {events.map((event) => (
                            <div key={event.round}>
                                <dt><bdi dir="auto">{fill(t.yearRound, { year: String(calendar.year), round: formatNumber(lang, event.round) })}</bdi></dt>
                                <dd>
                                    {event.routeKey
                                        ? <Link href={localePath(lang, `/race/${event.routeKey}`)}>{raceName(event.raceName, lang)}</Link>
                                        : raceName(event.raceName, lang)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    {history && (
                        <dl className={styles.facts}>
                            {history.firstGrandPrixYear != null && (
                                <div><dt>{t.firstGrandPrix}</dt><dd><bdi dir="ltr">{String(history.firstGrandPrixYear)}</bdi></dd></div>
                            )}
                            {history.winners.length > 0 && (
                                <div>
                                    <dt>{t.lastFiveWinners}</dt>
                                    <dd>
                                        <ol className={styles.winnerList}>
                                            {history.winners.map((winner) => (
                                                <li key={`${winner.year}-${winner.round}`}>
                                                    <span><bdi dir="ltr">{winner.year}</bdi> · <bdi dir="ltr">{winner.firstName} <strong>{winner.lastName}</strong></bdi></span>
                                                    {winner.teamName && <span className={styles.winnerTeam}><bdi dir="ltr">{winner.teamName}</bdi></span>}
                                                </li>
                                            ))}
                                        </ol>
                                    </dd>
                                </div>
                            )}
                        </dl>
                    )}
                </header>
                <CircuitPanel circuit={circuit} />
            </div>
        </div>
    );
}
