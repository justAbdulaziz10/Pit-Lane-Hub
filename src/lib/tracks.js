export const TRACK_COORDS = {
    bahrain: { lat: 26.0325, lng: 50.5106, country: 'Bahrain', title: 'Bahrain International Circuit' },
    jeddah: { lat: 21.6319, lng: 39.1044, country: 'Saudi Arabia', title: 'Jeddah Corniche Circuit' },
    melbourne: { lat: -37.8497, lng: 144.968, country: 'Australia', title: 'Albert Park Circuit' },
    suzuka: { lat: 34.8432, lng: 136.5409, country: 'Japan', title: 'Suzuka Circuit' },
    shanghai: { lat: 31.3389, lng: 121.2197, country: 'China', title: 'Shanghai International Circuit' },
    miami: { lat: 25.9581, lng: -80.2389, country: 'USA', title: 'Miami International Autodrome' },
    imola: { lat: 44.3439, lng: 11.7133, country: 'Italy', title: 'Autodromo Enzo e Dino Ferrari' },
    monaco: { lat: 43.7347, lng: 7.4206, country: 'Monaco', title: 'Circuit de Monaco' },
    montreal: { lat: 45.5048, lng: -73.5262, country: 'Canada', title: 'Circuit Gilles Villeneuve' },
    barcelona: { lat: 41.57, lng: 2.2611, country: 'Spain', title: 'Circuit de Barcelona-Catalunya' },
    madrid: { lat: 40.47246, lng: -3.618664, country: 'Spain', title: 'Circuito de Madring' },
    spielberg: { lat: 47.2197, lng: 14.7647, country: 'Austria', title: 'Red Bull Ring' },
    silverstone: { lat: 52.0733, lng: -1.0147, country: 'UK', title: 'Silverstone Circuit' },
    budapest: { lat: 47.5789, lng: 19.2486, country: 'Hungary', title: 'Hungaroring' },
    spa: { lat: 50.4372, lng: 5.9714, country: 'Belgium', title: 'Circuit de Spa-Francorchamps' },
    zandvoort: { lat: 52.3888, lng: 4.5409, country: 'Netherlands', title: 'Circuit Zandvoort' },
    monza: { lat: 45.6156, lng: 9.2811, country: 'Italy', title: 'Autodromo Nazionale Monza' },
    baku: { lat: 40.3725, lng: 49.8533, country: 'Azerbaijan', title: 'Baku City Circuit' },
    singapore: { lat: 1.2914, lng: 103.8644, country: 'Singapore', title: 'Marina Bay Street Circuit' },
    austin: { lat: 30.1328, lng: -97.6411, country: 'USA', title: 'Circuit of the Americas' },
    mexico: { lat: 19.4042, lng: -99.0907, country: 'Mexico', title: 'Autódromo Hermanos Rodríguez' },
    'sao paulo': { lat: -23.7036, lng: -46.6997, country: 'Brazil', title: 'Interlagos Circuit' },
    'las vegas': { lat: 36.1147, lng: -115.173, country: 'USA', title: 'Las Vegas Strip Circuit' },
    lusail: { lat: 25.49, lng: 51.4542, country: 'Qatar', title: 'Lusail International Circuit' },
    'yas marina': { lat: 24.4672, lng: 54.6031, country: 'UAE', title: 'Yas Marina Circuit' },
    sepang: { lat: 2.7608, lng: 101.7382, country: 'Malaysia', title: 'Sepang International Circuit' },
};

// Track key → Jolpica circuitId, so callers can fetch geometry for the same circuit.
const TRACK_KEY_TO_CIRCUIT_ID = Object.freeze({
    bahrain: 'bahrain',
    jeddah: 'jeddah',
    melbourne: 'albert_park',
    suzuka: 'suzuka',
    shanghai: 'shanghai',
    miami: 'miami',
    imola: 'imola',
    monaco: 'monaco',
    montreal: 'villeneuve',
    barcelona: 'catalunya',
    madrid: 'madring',
    spielberg: 'red_bull_ring',
    silverstone: 'silverstone',
    budapest: 'hungaroring',
    spa: 'spa',
    zandvoort: 'zandvoort',
    monza: 'monza',
    baku: 'baku',
    singapore: 'marina_bay',
    austin: 'americas',
    mexico: 'rodriguez',
    'sao paulo': 'interlagos',
    'las vegas': 'vegas',
    lusail: 'losail',
    'yas marina': 'yas_marina',
    sepang: 'sepang',
});

const CIRCUIT_ID_TO_TRACK_KEY = Object.freeze({
    bahrain: 'bahrain',
    jeddah: 'jeddah',
    albert_park: 'melbourne',
    suzuka: 'suzuka',
    shanghai: 'shanghai',
    miami: 'miami',
    imola: 'imola',
    monaco: 'monaco',
    gilles_villeneuve: 'montreal',
    villeneuve: 'montreal',
    catalunya: 'barcelona',
    barcelona: 'barcelona',
    madring: 'madrid',
    red_bull_ring: 'spielberg',
    silverstone: 'silverstone',
    hungaroring: 'budapest',
    spa: 'spa',
    zandvoort: 'zandvoort',
    monza: 'monza',
    baku: 'baku',
    marina_bay: 'singapore',
    americas: 'austin',
    rodriguez: 'mexico',
    interlagos: 'sao paulo',
    vegas: 'las vegas',
    las_vegas: 'las vegas',
    losail: 'lusail',
    yas_marina: 'yas marina',
    sepang: 'sepang',
});

const OPENF1_CIRCUIT_SHORT_NAME_TO_TRACK_KEY = Object.freeze({
    bahrain: 'bahrain',
    sakhir: 'bahrain',
    jeddah: 'jeddah',
    melbourne: 'melbourne',
    suzuka: 'suzuka',
    shanghai: 'shanghai',
    miami: 'miami',
    imola: 'imola',
    monaco: 'monaco',
    montreal: 'montreal',
    'gilles villeneuve': 'montreal',
    barcelona: 'barcelona',
    madrid: 'madrid',
    madring: 'madrid',
    spielberg: 'spielberg',
    'red bull ring': 'spielberg',
    silverstone: 'silverstone',
    budapest: 'budapest',
    'spa francorchamps': 'spa',
    spa: 'spa',
    zandvoort: 'zandvoort',
    monza: 'monza',
    baku: 'baku',
    singapore: 'singapore',
    austin: 'austin',
    'circuit of the americas': 'austin',
    'mexico city': 'mexico',
    'sao paulo': 'sao paulo',
    interlagos: 'sao paulo',
    'las vegas': 'las vegas',
    lusail: 'lusail',
    'yas marina': 'yas marina',
    sepang: 'sepang',
    'kuala lumpur': 'sepang',
});

function exactKey(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}
export function getTrackInfo(raceName, circuitKey) {
    const circuitId = String(circuitKey || '').toLowerCase();
    const shortName = exactKey(circuitKey);
    const openF1Name = exactKey(raceName);
    const trackKey = CIRCUIT_ID_TO_TRACK_KEY[circuitId]
        || OPENF1_CIRCUIT_SHORT_NAME_TO_TRACK_KEY[shortName]
        || OPENF1_CIRCUIT_SHORT_NAME_TO_TRACK_KEY[openF1Name];
    if (!trackKey || !TRACK_COORDS[trackKey]) return null;
    return { ...TRACK_COORDS[trackKey], circuitId: TRACK_KEY_TO_CIRCUIT_ID[trackKey] };
}
