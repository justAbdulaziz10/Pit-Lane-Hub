// Shared F1 constants and lookups used across the OpenF1 and Ergast data layers.

// Current season year, derived at runtime so it never goes stale.
export const CURRENT_YEAR = new Date().getFullYear();

export function getCurrentYear() {
    return CURRENT_YEAR;
}

// Hardcoded nationalities for the current grid as a fallback when OpenF1 omits
// the country code.
export const DRIVER_NATIONALITIES = {
    '1': 'NED', '11': 'MEX', // Red Bull
    '4': 'GBR', '81': 'AUS', // McLaren
    '16': 'MON', '44': 'GBR', // Ferrari
    '63': 'GBR', '12': 'ITA', // Mercedes
    '14': 'ESP', '18': 'CAN', // Aston Martin
    '10': 'FRA', '7': 'AUS', // Alpine
    '23': 'THA', '55': 'ESP', // Williams
    '22': 'JPN', '30': 'NZL', // RB
    '31': 'FRA', '87': 'GBR', // Haas
    '27': 'GER', '5': 'BRA',  // Sauber/Audi
    '98': 'USA', '99': 'USA', // Cadillac (placeholder numbers)
};

// Map driver numbers to Ergast IDs for career stats.
export const DRIVER_ERGAST_IDS = {
    1: 'max_verstappen', 11: 'perez',
    44: 'hamilton', 63: 'russell',
    16: 'leclerc', 55: 'sainz',
    4: 'norris', 81: 'piastri',
    14: 'alonso', 18: 'stroll',
    10: 'gasly', 31: 'ocon',
    23: 'albon', 2: 'sargeant',
    22: 'tsunoda', 3: 'ricciardo',
    77: 'bottas', 24: 'zhou',
    27: 'hulkenberg', 20: 'kevin_magnussen',
    // 2025/2026 updates
    12: 'antonelli', 87: 'bearman',
    30: 'lawson', 7: 'doohan',
    5: 'bortoleto',
};

// World Championships map (manual update required for newly-crowned champions).
export const DRIVER_TITLES = {
    'max_verstappen': 4,
    'hamilton': 7,
    'michael_schumacher': 7,
    'fangio': 5,
    'prost': 4,
    'vettel': 4,
    'senna': 3,
    'piquet': 3,
    'lauda': 3,
    'stewart': 3,
    'brabham': 3,
    'alonso': 2,
    'clark': 2,
    'hakkinen': 2,
    'fittipaldi': 2,
    'ascari': 2,
    'raikkonen': 1,
    'button': 1,
    'rosberg': 1,
    'villeneuve': 1,
    'hill': 1,
    'mansell': 1,
    'hunt': 1,
    'andretti': 1,
    'scheckter': 1,
    'jones': 1,
    'rindt': 1,
    'surtees': 1,
    'hulme': 1,
    'hawthorn': 1,
    'farina': 1,
};

// Team brand colours keyed by (substring of) team name.
const TEAM_COLORS = {
    'Red Bull Racing': '#3671C6',
    'Red Bull': '#3671C6',
    'Ferrari': '#E8002D',
    'Mercedes': '#27F4D2',
    'McLaren': '#FF8000',
    'Aston Martin': '#229971',
    'Alpine': '#FF87BC',
    'Williams': '#64C4FF',
    'AlphaTauri': '#5E8FAA',
    'RB': '#6692FF',
    'Alfa Romeo': '#C92D4B',
    'Haas F1 Team': '#B6BABD',
    'Haas': '#B6BABD',
    'Kick Sauber': '#52E252',
    'Sauber': '#52E252',
    'Audi': '#1E1E1E',
    'Cadillac': '#FFD700',
    'General Motors': '#1E3A5F',
};

/**
 * Get a team's brand colour by (partial) team name.
 * @param {string} teamName
 * @returns {string} hex colour, defaults to white when unknown
 */
export function getTeamColor(teamName) {
    for (const [team, color] of Object.entries(TEAM_COLORS)) {
        if (teamName?.toLowerCase().includes(team.toLowerCase())) {
            return color;
        }
    }
    return '#FFFFFF';
}
