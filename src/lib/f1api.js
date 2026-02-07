// OpenF1 API wrapper - Free, no signup required
const BASE_URL = 'https://api.openf1.org/v1';

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
    return await response.json();
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
export async function getSessions(year = new Date().getFullYear()) {
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
export async function getMeetings(year = new Date().getFullYear()) {
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
 * Get team color by team name
 * @param {string} teamName 
 */
export function getTeamColor(teamName) {
  const colors = {
    'Red Bull Racing': '#3671C6',
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
    'Kick Sauber': '#52E252',
    'Sauber': '#52E252',
  };
  
  for (const [team, color] of Object.entries(colors)) {
    if (teamName?.toLowerCase().includes(team.toLowerCase())) {
      return color;
    }
  }
  return '#FFFFFF';
}
