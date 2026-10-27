import { circuitOutline, formatCircuitLength } from './circuit-svg';
import circuitData from '../f1-circuits.json';

if (typeof window !== 'undefined') throw new Error('Circuit geometry is available only on the server.');

// Jolpica circuit IDs are stable and intentionally mapped exactly. Never infer
// a circuit from a Grand Prix name: Madrid's Spanish GP is not Spa.
export const CIRCUIT_FEATURE_IDS = Object.freeze({
    albert_park: 'au-1953',
    bahrain: 'bh-2002',
    shanghai: 'cn-2004',
    catalunya: 'es-1991',
    barcelona: 'es-1991',
    monaco: 'mc-1929',
    gilles_villeneuve: 'ca-1978',
    villeneuve: 'ca-1978',
    paul_ricard: 'fr-1969',
    red_bull_ring: 'at-1969',
    silverstone: 'gb-1948',
    hockenheimring: 'de-1932',
    hungaroring: 'hu-1986',
    spa: 'be-1925',
    zandvoort: 'nl-1948',
    monza: 'it-1922',
    marina_bay: 'sg-2008',
    sochi: 'ru-2014',
    suzuka: 'jp-1962',
    americas: 'us-2012',
    rodriguez: 'mx-1962',
    interlagos: 'br-1940',
    yas_marina: 'ae-2009',
    imola: 'it-1953',
    nurburgring: 'de-1927',
    algarve: 'pt-2008',
    mugello: 'it-1914',
    sepang: 'my-1999',
    istanbul: 'tr-2005',
    jeddah: 'sa-2021',
    miami: 'us-2022',
    losail: 'qa-2004',
    madring: 'es-2026',
    baku: 'az-2016',
    vegas: 'us-2023',
    las_vegas: 'us-2023',
    indianapolis: 'us-1909',
    buenos_aires: 'ar-1952',
    kyalami: 'za-1961',
    watkins_glen: 'us-1956',
});

const FEATURES_BY_ID = new Map((circuitData.features || [])
    .map((feature) => [feature.properties?.id, feature]));

export function getCircuitGeometry(circuitId) {
    const featureId = CIRCUIT_FEATURE_IDS[String(circuitId || '').toLowerCase()];
    const feature = featureId ? FEATURES_BY_ID.get(featureId) : null;
    if (!feature) return null;
    return {
        coordinates: feature.geometry?.coordinates || [],
        name: feature.properties?.Name || null,
        length: feature.properties?.length || null,
    };
}


/** Everything a circuit view needs, already projected on the server. */
export function getCircuitView(circuitId) {
    const geometry = getCircuitGeometry(circuitId);
    const outline = geometry ? circuitOutline(geometry.coordinates) : null;
    if (!outline) return null;
    return {
        circuitId: String(circuitId).toLowerCase(),
        name: geometry.name,
        length: formatCircuitLength(geometry.length),
        outline: { d: outline.d, viewBox: outline.viewBox, start: outline.start },
        center: outline.center,
        coordinates: geometry.coordinates,
    };
}
