const TEAM_NAME_ALIASES = new Map([
    ['red bull', 'Red Bull Racing'],
    ['red bull racing', 'Red Bull Racing'],
    ['oracle red bull racing', 'Red Bull Racing'],
    ['rb f1 team', 'Racing Bulls'],
    ['visa cash app rb', 'Racing Bulls'],
    ['racing bulls', 'Racing Bulls'],
    ['scuderia alphatauri', 'Racing Bulls'],
    ['alphatauri', 'Racing Bulls'],
    ['toro rosso', 'Racing Bulls'],
    ['scuderia ferrari', 'Ferrari'],
    ['ferrari', 'Ferrari'],
    ['mercedes', 'Mercedes'],
    ['mercedes amg petronas f1 team', 'Mercedes'],
    ['mclaren', 'McLaren'],
    ['mclaren formula 1 team', 'McLaren'],
    ['aston martin', 'Aston Martin'],
    ['aston martin aramco f1 team', 'Aston Martin'],
    ['alpine', 'Alpine'],
    ['alpine f1 team', 'Alpine'],
    ['williams', 'Williams'],
    ['williams racing', 'Williams'],
    ['haas', 'Haas'],
    ['haas f1 team', 'Haas'],
    ['audi', 'Audi'],
    ['stake f1 team kick sauber', 'Kick Sauber'],
    ['kick sauber', 'Kick Sauber'],
    ['sauber', 'Sauber'],
    ['cadillac', 'Cadillac'],
]);

const TEAM_NAMES_BY_CONSTRUCTOR_ID = Object.freeze({
    red_bull: 'Red Bull Racing',
    red_bull_racing: 'Red Bull Racing',
    rb: 'Racing Bulls',
    racing_bulls: 'Racing Bulls',
    alphatauri: 'Racing Bulls',
    toro_rosso: 'Racing Bulls',
    ferrari: 'Ferrari',
    mercedes: 'Mercedes',
    mclaren: 'McLaren',
    aston_martin: 'Aston Martin',
    alpine: 'Alpine',
    williams: 'Williams',
    haas: 'Haas',
    audi: 'Audi',
    kick_sauber: 'Kick Sauber',
    sauber: 'Sauber',
    cadillac: 'Cadillac',
});

function keyFor(name) {
    return String(name || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export function canonicalTeamName(name, constructorId = null) {
    const fromId = constructorId && TEAM_NAMES_BY_CONSTRUCTOR_ID[String(constructorId).toLowerCase()];
    if (fromId) return fromId;
    const key = keyFor(name);
    return TEAM_NAME_ALIASES.get(key) || String(name || '').trim() || 'Unknown team';
}

export function canonicalTeamNameForId(constructorId, fallbackName) {
    return canonicalTeamName(fallbackName, constructorId);
}

function channel(hex) {
    const value = Number.parseInt(hex, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
    const match = /^#?([\da-f]{6})$/i.exec(String(hex || ''));
    if (!match) return null;
    const value = match[1];
    return 0.2126 * channel(value.slice(0, 2))
        + 0.7152 * channel(value.slice(2, 4))
        + 0.0722 * channel(value.slice(4, 6));
}

export function teamColorContrastRatio(first, second) {
    const a = luminance(first);
    const b = luminance(second);
    if (a === null || b === null) return 1;
    const bright = Math.max(a, b);
    const dark = Math.min(a, b);
    return (bright + 0.05) / (dark + 0.05);
}

export function ensureTeamColorContrast(color, background = '#0D0D0D', minimum = 3) {
    let normalized = String(color || '').replace(/^#/, '');
    if (!/^[\da-f]{6}$/i.test(normalized)) normalized = 'FFFFFF';
    normalized = normalized.toUpperCase();
    if (teamColorContrastRatio(`#${normalized}`, background) >= minimum) return `#${normalized}`;

    const channels = [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
    for (let amount = 0.03; amount <= 1; amount += 0.03) {
        const lightened = channels.map((value) => Math.round(value + (255 - value) * amount));
        const candidate = `#${lightened.map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
        if (teamColorContrastRatio(candidate, background) >= minimum) return candidate;
    }
    return '#FFFFFF';
}
