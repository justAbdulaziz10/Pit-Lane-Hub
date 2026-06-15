// Tyre compound presentation helpers (official F1 colour coding).

const COMPOUNDS = {
    SOFT: { label: 'Soft', short: 'S', color: '#DA291C' },
    MEDIUM: { label: 'Medium', short: 'M', color: '#FFD12E' },
    HARD: { label: 'Hard', short: 'H', color: '#F0F0F0' },
    INTERMEDIATE: { label: 'Intermediate', short: 'I', color: '#43B02A' },
    WET: { label: 'Wet', short: 'W', color: '#0067AD' },
};

const UNKNOWN = { label: 'Unknown', short: '?', color: '#888888' };

/**
 * Look up presentation info for a tyre compound name (case-insensitive).
 * @param {string} compound
 * @returns {{label: string, short: string, color: string}}
 */
export function getCompound(compound) {
    if (!compound) return UNKNOWN;
    return COMPOUNDS[compound.toUpperCase()] || UNKNOWN;
}

/**
 * Group a flat list of OpenF1 stints by driver number, each sorted by stint
 * number, with a computed lap count per stint.
 * @param {Array<{driver_number:number, stint_number?:number, lap_start?:number, lap_end?:number, compound?:string}>} stints
 * @returns {Map<number, Array<object>>}
 */
export function stintsByDriver(stints = []) {
    const byDriver = new Map();
    for (const s of stints) {
        if (s?.driver_number == null) continue;
        if (!byDriver.has(s.driver_number)) byDriver.set(s.driver_number, []);
        const laps =
            Number.isFinite(s.lap_end) && Number.isFinite(s.lap_start)
                ? Math.max(1, s.lap_end - s.lap_start + 1)
                : 1;
        byDriver.get(s.driver_number).push({ ...s, laps });
    }
    for (const list of byDriver.values()) {
        list.sort((a, b) => (a.stint_number || 0) - (b.stint_number || 0));
    }
    return byDriver;
}
