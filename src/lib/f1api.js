// OpenF1 API wrapper - Free, no signup required
const BASE_URL = 'https://api.openf1.org/v1';

// Ergast API for historical F1 data (standings, results)
// Using Jolpica Mirror because main Ergast is deprecated/blocking Vercel
const ERGAST_URL = 'https://api.jolpi.ca/ergast/f1';

// Current year for API calls
const CURRENT_YEAR = 2026;

// Hardcoded nationalities for 2026 grid fallback
const DRIVER_NATIONALITIES = {
  '1': 'NED', '11': 'MEX', // Red Bull
  '4': 'GBR', '81': 'AUS', // McLaren
  '16': 'MON', '44': 'GBR', // Ferrari
  '63': 'GBR', '12': 'ITA', // Mercedes
  '14': 'ESP', '18': 'CAN', // Aston Martin
  '10': 'FRA', '7': 'AUS', // Alpine
  '23': 'THA', '55': 'ESP', // Williams
  '22': 'JPN', '30': 'NZL', // RB
  '31': 'FRA', '87': 'GBR', // Haas
  '27': 'GER', '5': 'BRA',  // Sauber
};

// Map driver numbers to Ergast IDs for career stats
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

/**
 * Fetch drivers for a session
 * @param {number} sessionKey - Optional session key
 */
export async function getDrivers(sessionKey = null) {
  try {
    let url = `${BASE_URL}/drivers`;
    if (sessionKey) {
      url += `?session_key=${sessionKey}`;
    } else {
      // Get latest session
      url += '?session_key=latest';
    }
    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error('Failed to fetch drivers');
    let drivers = await response.json();

    // Inject nationalities if missing
    drivers = drivers.map(d => ({
      ...d,
      country_code: d.country_code || DRIVER_NATIONALITIES[d.driver_number] || 'INT'
    }));

    return drivers;
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return [];
  }
}

/**
 * Fetch current session info
 */
export async function getCurrentSession() {
  try {
    const response = await fetch(`${BASE_URL}/sessions?session_key=latest`, {
      next: { revalidate: 60 }
    });
    if (!response.ok) throw new Error('Failed to fetch session');
    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

/**
 * Fetch all sessions for a year
 * @param {number} year 
 */
export async function getSessions(year = CURRENT_YEAR) {
  try {
    const response = await fetch(`${BASE_URL}/sessions?year=${year}`, {
      next: { revalidate: 3600 }
    });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return await response.json();
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

/**
 * Fetch meetings (race weekends) for a year
 * @param {number} year 
 */
export async function getMeetings(year = CURRENT_YEAR) {
  try {
    const response = await fetch(`${BASE_URL}/meetings?year=${year}`, {
      next: { revalidate: 3600 }
    });
    if (!response.ok) throw new Error('Failed to fetch meetings');
    return await response.json();
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return [];
  }
}

/**
 * Fetch position data for a session
 * @param {number} sessionKey 
 */
export async function getPositions(sessionKey = 'latest') {
  try {
    const response = await fetch(`${BASE_URL}/position?session_key=${sessionKey}`, {
      next: { revalidate: 10 }
    });
    if (!response.ok) throw new Error('Failed to fetch positions');
    return await response.json();
  } catch (error) {
    console.error('Error fetching positions:', error);
    return [];
  }
}

/**
 * Fetch lap times
 * @param {number} sessionKey 
 * @param {number} driverNumber 
 */
export async function getLapTimes(sessionKey = 'latest', driverNumber = null) {
  try {
    let url = `${BASE_URL}/laps?session_key=${sessionKey}`;
    if (driverNumber) {
      url += `&driver_number=${driverNumber}`;
    }
    const response = await fetch(url, { next: { revalidate: 10 } });
    if (!response.ok) throw new Error('Failed to fetch lap times');
    return await response.json();
  } catch (error) {
    console.error('Error fetching lap times:', error);
    return [];
  }
}

/**
 * Fetch weather data
 * @param {number} sessionKey 
 */
export async function getWeather(sessionKey = 'latest') {
  try {
    const response = await fetch(`${BASE_URL}/weather?session_key=${sessionKey}`, {
      next: { revalidate: 60 }
    });
    if (!response.ok) throw new Error('Failed to fetch weather');
    const data = await response.json();
    return data[data.length - 1] || null;
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

/**
 * Fetch stints data (tire strategies)
 * @param {number} sessionKey 
 */
export async function getStints(sessionKey = 'latest') {
  try {
    const response = await fetch(`${BASE_URL}/stints?session_key=${sessionKey}`, {
      next: { revalidate: 30 }
    });
    if (!response.ok) throw new Error('Failed to fetch stints');
    return await response.json();
  } catch (error) {
    console.error('Error fetching stints:', error);
    return [];
  }
}

/**
 * Fetch pit stop data
 * @param {number} sessionKey 
 */
export async function getPitStops(sessionKey = 'latest') {
  try {
    const response = await fetch(`${BASE_URL}/pit?session_key=${sessionKey}`, {
      next: { revalidate: 30 }
    });
    if (!response.ok) throw new Error('Failed to fetch pit stops');
    return await response.json();
  } catch (error) {
    console.error('Error fetching pit stops:', error);
    return [];
  }
}

// ============================================
// ERGAST API - Real Championship Standings
// ============================================

/**
 * Fetch driver standings from Ergast API
 * @param {number} year - Season year (max 2024 for Ergast)
 */
export async function getDriverStandings(year = null) {
  try {
    // Ergast only has data up to 2024, use current for latest
    const seasonYear = year || 'current';
    const response = await fetch(
      `${ERGAST_URL}/${seasonYear}/driverStandings.json`,
      { next: { revalidate: 300 } }
    );
    if (!response.ok) throw new Error('Failed to fetch driver standings');
    const data = await response.json();
    const standings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
    return standings.map(s => ({
      position: parseInt(s.position),
      points: parseFloat(s.points),
      wins: parseInt(s.wins),
      driver: {
        id: s.Driver.driverId,
        code: s.Driver.code,
        number: s.Driver.permanentNumber,
        firstName: s.Driver.givenName,
        lastName: s.Driver.familyName,
        nationality: s.Driver.nationality,
      },
      team: {
        id: s.Constructors?.[0]?.constructorId,
        name: s.Constructors?.[0]?.name,
        nationality: s.Constructors?.[0]?.nationality,
      }
    }));
  } catch (error) {
    console.error('Error fetching driver standings:', error);
    return [];
  }
}

/**
 * Fetch constructor standings from Ergast API
 * @param {number} year - Season year
 */
export async function getConstructorStandings(year = null) {
  try {
    const seasonYear = year || 'current';
    const response = await fetch(
      `${ERGAST_URL}/${seasonYear}/constructorStandings.json`,
      { next: { revalidate: 300 } }
    );
    if (!response.ok) throw new Error('Failed to fetch constructor standings');
    const data = await response.json();
    const standings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
    return standings.map(s => ({
      position: parseInt(s.position),
      points: parseFloat(s.points),
      wins: parseInt(s.wins),
      team: {
        id: s.Constructor.constructorId,
        name: s.Constructor.name,
        nationality: s.Constructor.nationality,
      }
    }));
  } catch (error) {
    console.error('Error fetching constructor standings:', error);
    return [];
  }
}

/**
 * Fetch race results from Ergast API
 * @param {number} year - Season year
 * @param {number} round - Race round number (optional)
 */
export async function getRaceResults(year = null, round = null) {
  try {
    const seasonYear = year || 'current';
    const roundPath = round ? `/${round}` : '/last';
    const response = await fetch(
      `${ERGAST_URL}/${seasonYear}${roundPath}/results.json`,
      { next: { revalidate: 300 } }
    );
    if (!response.ok) throw new Error('Failed to fetch race results');
    const data = await response.json();
    const race = data?.MRData?.RaceTable?.Races?.[0];
    if (!race) return null;

    return {
      season: race.season,
      round: parseInt(race.round),
      raceName: race.raceName,
      circuit: {
        id: race.Circuit.circuitId,
        name: race.Circuit.circuitName,
        location: race.Circuit.Location.locality,
        country: race.Circuit.Location.country,
      },
      date: race.date,
      results: race.Results.map(r => ({
        position: parseInt(r.position),
        number: r.Driver.permanentNumber,
        driver: {
          id: r.Driver.driverId,
          code: r.Driver.code,
          firstName: r.Driver.givenName,
          lastName: r.Driver.familyName,
        },
        team: r.Constructor.name,
        grid: parseInt(r.grid),
        laps: parseInt(r.laps),
        status: r.status,
        time: r.Time?.time || null,
        points: parseFloat(r.points),
        fastestLap: r.FastestLap ? {
          rank: parseInt(r.FastestLap.rank),
          lap: parseInt(r.FastestLap.lap),
          time: r.FastestLap.Time?.time,
          avgSpeed: r.FastestLap.AverageSpeed?.speed,
        } : null,
      }))
    };
  } catch (error) {
    console.error('Error fetching race results:', error);
    return null;
  }
}

// World Championships map (Manual update required)
export const DRIVER_TITLES = {
  'max_verstappen': 4, // 2021, 2022, 2023, 2024 (Assuming 2024 won based on dominance context)
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

/**
 * Fetch driver career stats from Ergast API
 * @param {string} driverId - Driver ID (e.g., 'verstappen', 'hamilton')
 */
export async function getDriverCareerStats(driverId) {
  try {
    // Get all results for driver
    const response = await fetch(
      `${ERGAST_URL}/drivers/${driverId}/results.json?limit=500`,
      { next: { revalidate: 86400 } }
    );
    if (!response.ok) throw new Error('Failed to fetch driver stats');
    const data = await response.json();
    const races = data?.MRData?.RaceTable?.Races || [];

    let wins = 0;
    let podiums = 0;
    let poles = 0;
    let fastestLaps = 0;
    let dnfs = 0;
    let careerPoints = 0;

    races.forEach(race => {
      const result = race.Results?.[0];
      if (result) {
        const pos = parseInt(result.position);
        if (pos === 1) wins++;
        if (pos <= 3) podiums++;
        if (parseInt(result.grid) === 1) poles++;
        if (result.FastestLap?.rank === '1') fastestLaps++;
        if (result.status && !result.status.includes('Lap') && result.status !== 'Finished') {
          dnfs++;
        }
        if (result.points) {
          careerPoints += parseFloat(result.points);
        }
      }
    });

    return {
      totalRaces: races.length,
      wins,
      podiums,
      poles,
      fastestLaps,
      dnfs,
      careerPoints,
      championships: DRIVER_TITLES[driverId] || 0,
    };
  } catch (error) {
    console.error('Error fetching driver career stats:', error);
    return null;
  }
}

/**
 * Get team color by team name
 * @param {string} teamName 
 */
export function getTeamColor(teamName) {
  const colors = {
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
    'Cadillac': '#1E3A5F',
  };

  for (const [team, color] of Object.entries(colors)) {
    if (teamName?.toLowerCase().includes(team.toLowerCase())) {
      return color;
    }
  }
  return '#FFFFFF';
}

/**
 * Get current year
 */
export function getCurrentYear() {
  return CURRENT_YEAR;
}
