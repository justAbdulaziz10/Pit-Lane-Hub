import ALL_TIME_SNAPSHOT from './data/drivers-all-time.json';
import {
    cacheF1Data,
    F1_CACHE_TAGS,
    fetchJolpicaPages,
} from './http';
import { getOpenF1GridData } from './openf1-data';
import { getLastRace } from './season';
import { canonicalTeamName } from './team-utils';
import { getSeasonYear } from './year';

const NATIONALITY_ISO = Object.freeze({
    American: ['USA', 'US'],
    Argentine: ['ARG', 'AR'],
    Australian: ['AUS', 'AU'],
    Austrian: ['AUT', 'AT'],
    Belgian: ['BEL', 'BE'],
    Brazilian: ['BRA', 'BR'],
    British: ['GBR', 'GB'],
    Canadian: ['CAN', 'CA'],
    Chinese: ['CHN', 'CN'],
    Colombian: ['COL', 'CO'],
    Czech: ['CZE', 'CZ'],
    Danish: ['DNK', 'DK'],
    Dutch: ['NLD', 'NL'],
    Finnish: ['FIN', 'FI'],
    French: ['FRA', 'FR'],
    German: ['DEU', 'DE'],
    Hungarian: ['HUN', 'HU'],
    Indian: ['IND', 'IN'],
    Indonesian: ['IDN', 'ID'],
    Irish: ['IRL', 'IE'],
    Italian: ['ITA', 'IT'],
    Japanese: ['JPN', 'JP'],
    Mexican: ['MEX', 'MX'],
    Monegasque: ['MCO', 'MC'],
    'New Zealander': ['NZL', 'NZ'],
    Polish: ['POL', 'PL'],
    Portuguese: ['PRT', 'PT'],
    Russian: ['RUS', 'RU'],
    'South African': ['ZAF', 'ZA'],
    Spanish: ['ESP', 'ES'],
    Swedish: ['SWE', 'SE'],
    Swiss: ['CHE', 'CH'],
    Thai: ['THA', 'TH'],
    Venezuelan: ['VEN', 'VE'],
    Uruguayan: ['URY', 'UY'],
});

function normalize(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export function nationalityInfo(nationality, openF1Code) {
    const entry = Object.entries(NATIONALITY_ISO)
        .find(([name]) => normalize(name) === normalize(nationality))?.[1];
    if (entry) {
        const [alpha3, alpha2] = entry;
        const flag = [...alpha2].map((letter) => String.fromCodePoint(127397 + letter.toUpperCase().charCodeAt(0))).join('');
        return { code: alpha3, flag };
    }
    const code = /^[A-Z]{3}$/.test(String(openF1Code || '')) ? openF1Code : null;
    return { code, flag: null };
}

function mapJolpicaDriver(driver) {
    return {
        id: driver.driverId,
        driverId: driver.driverId,
        code: driver.code || null,
        number: driver.permanentNumber ? Number(driver.permanentNumber) : null,
        firstName: driver.givenName || '',
        lastName: driver.familyName || '',
        fullName: [driver.givenName, driver.familyName].filter(Boolean).join(' '),
        nationality: driver.nationality || null,
        dateOfBirth: driver.dateOfBirth || null,
        url: driver.url || null,
    };
}

function findJolpicaDriver(openDriver, seasonDrivers) {
    const code = String(openDriver?.name_acronym || openDriver?.code || '').toUpperCase();
    if (code) {
        const byCode = seasonDrivers.find((driver) => String(driver.code || '').toUpperCase() === code);
        if (byCode) return byCode;
    }
    const openLastName = normalize(openDriver?.last_name || String(openDriver?.full_name || '').split(' ').at(-1));
    if (!openLastName) return null;
    return seasonDrivers.find((driver) => normalize(driver.lastName) === openLastName) || null;
}

async function loadSeasonDrivers(year) {
    const drivers = await fetchJolpicaPages(`${year}/drivers`, {
        select: (mrData) => mrData?.DriverTable?.Drivers || [],
        revalidate: 86400,
        tags: [F1_CACHE_TAGS.drivers, F1_CACHE_TAGS.grid],
    });
    return drivers.map(mapJolpicaDriver);
}

async function loadLatestRaceGridResults(year) {
    const latestRace = await getLastRace(year);
    if (!latestRace) return [];
    return fetchJolpicaPages(`${Number(year)}/${latestRace.round}/results`, {
        select: (mrData) => mrData?.RaceTable?.Races?.[0]?.Results || [],
        revalidate: 300,
        tags: [F1_CACHE_TAGS.grid],
    });
}

const cachedLatestRaceGridResults = cacheF1Data(
    loadLatestRaceGridResults,
    ['latest-race-grid-results'],
    300,
    [F1_CACHE_TAGS.grid],
);

const cachedSeasonDrivers = cacheF1Data(
    loadSeasonDrivers,
    ['season-drivers'],
    86400,
    [F1_CACHE_TAGS.drivers, F1_CACHE_TAGS.grid],
);

export function getSeasonDriverList(year = getSeasonYear()) {
    return cachedSeasonDrivers(Number(year));
}

async function loadGrid(year) {
    const [openResult, seasonResult] = await Promise.allSettled([
        getOpenF1GridData(year),
        getSeasonDriverList(year),
    ]);
    if (seasonResult.status === 'rejected') throw seasonResult.reason;
    let seasonDrivers = seasonResult.value;
    let openData = openResult.status === 'fulfilled' ? openResult.value : null;
    let gridYear = Number(year);

    // Before the first season entry list is published, use Jolpica's prior
    // season list. OpenF1 remains an optional annotation source.
    if (seasonDrivers.length === 0) {
        gridYear -= 1;
        seasonDrivers = await getSeasonDriverList(gridYear);
        openData = null;
    }

    let latestResults = [];
    try {
        latestResults = await cachedLatestRaceGridResults(gridYear);
    } catch (error) {
        console.warn(`Latest Jolpica race results unavailable: ${error?.status ? `HTTP ${error.status}` : error?.message || 'request failed'}`);
    }
    const resultByDriver = new Map(latestResults
        .filter((row) => row?.Driver?.driverId)
        .map((row) => [row.Driver.driverId, {
            number: row.number != null && row.number !== '' && Number.isFinite(Number(row.number))
                ? Number(row.number)
                : null,
            team: row.Constructor
                ? canonicalTeamName(row.Constructor.name, row.Constructor.constructorId)
                : null,
        }]));
    const openByDriver = new Map();
    const openOnlyDrivers = [];
    for (const openDriver of openData?.drivers || []) {
        const jolpica = findJolpicaDriver(openDriver, seasonDrivers);
        if (jolpica) openByDriver.set(jolpica.driverId, openDriver);
        else openOnlyDrivers.push(openDriver);
    }

    const grid = seasonDrivers.map((jolpica) => {
        const openDriver = openByDriver.get(jolpica.driverId);
        const result = resultByDriver.get(jolpica.driverId);
        const number = result?.number ?? jolpica.number;
        const iso = nationalityInfo(jolpica.nationality, null);
        return {
            driverId: jolpica.driverId,
            racingNumber: number,
            number,
            code: jolpica.code,
            firstName: jolpica.firstName,
            lastName: jolpica.lastName,
            fullName: jolpica.fullName || null,
            nationality: jolpica.nationality,
            nationalityCode: iso.code,
            countryCode: iso.code,
            flag: iso.flag,
            headshot: openDriver?.headshot_url || null,
            team: result?.team || (openDriver ? canonicalTeamName(openDriver.team_name) : null),
            teamColour: openDriver?.team_colour ? `#${String(openDriver.team_colour).replace(/^#/, '')}` : null,
            sessionKey: openData?.session?.session_key ?? null,
            inLatestSession: openData?.session
                ? Boolean(openByDriver.has(jolpica.driverId))
                : null,
        };
    });

    for (const openDriver of openOnlyDrivers) {
        const racingNumber = Number(openDriver.driver_number);
        const firstName = openDriver.first_name || '';
        const lastName = openDriver.last_name || '';
        const iso = nationalityInfo(null, openDriver.country_code);
        grid.push({
            driverId: null,
            racingNumber: Number.isFinite(racingNumber) ? racingNumber : null,
            number: Number.isFinite(racingNumber) ? racingNumber : null,
            code: openDriver.name_acronym || openDriver.code || null,
            firstName,
            lastName,
            fullName: [firstName, lastName].filter(Boolean).join(' ') || openDriver.full_name || null,
            nationality: null,
            nationalityCode: iso.code,
            countryCode: iso.code,
            flag: iso.flag,
            headshot: openDriver.headshot_url || null,
            team: canonicalTeamName(openDriver.team_name),
            teamColour: openDriver.team_colour ? `#${String(openDriver.team_colour).replace(/^#/, '')}` : null,
            sessionKey: openData?.session?.session_key ?? null,
            inLatestSession: true,
        });
    }

    return grid.sort((a, b) => (a.racingNumber ?? Infinity) - (b.racingNumber ?? Infinity));
}

const cachedGrid = cacheF1Data(loadGrid, ['grid'], 900, [F1_CACHE_TAGS.grid, F1_CACHE_TAGS.drivers]);

export function getGrid(year = getSeasonYear()) {
    return cachedGrid(Number(year));
}

export async function resolveDriver(numberOrIdOrCode, year = getSeasonYear()) {
    if (numberOrIdOrCode == null || String(numberOrIdOrCode).trim() === '') return null;
    const query = String(numberOrIdOrCode).trim();
    const grid = await getGrid(year);
    return grid.find((driver) => String(driver.racingNumber) === query)
        || grid.find((driver) => String(driver.driverId || '').toLowerCase() === query.toLowerCase())
        || grid.find((driver) => String(driver.code || '').toLowerCase() === query.toLowerCase())
        || null;
}

const SNAPSHOT_DRIVERS = ALL_TIME_SNAPSHOT.map(mapJolpicaDriver);

/**
 * Every driver since 1950. History comes from the bundled snapshot
 * (scripts/update-f1-snapshots.mjs); this season's entrants come from the
 * cached season list the grid already uses, so debutants appear without a
 * new snapshot and the lookup costs no extra Jolpica requests.
 */
export async function getAllTimeDrivers(year = getSeasonYear()) {
    let season = [];
    try {
        season = await getSeasonDriverList(year);
    } catch (error) {
        console.error('Season driver list unavailable; using the all-time snapshot only', error);
    }
    const known = new Set(SNAPSHOT_DRIVERS.map((driver) => driver.driverId));
    return [...SNAPSHOT_DRIVERS, ...season.filter((driver) => !known.has(driver.driverId))];
}

/** On this season's entry list (or last season's, before the new list is published). */
export async function isActiveDriver(driverId, year = getSeasonYear()) {
    try {
        let season = await getSeasonDriverList(year);
        if (season.length === 0) season = await getSeasonDriverList(Number(year) - 1);
        return season.some((driver) => driver.driverId === driverId);
    } catch (error) {
        console.error('Season driver list unavailable; treating driver as active', error);
        return true;
    }
}

/** Any driver since 1950 by Jolpica driverId; null when unknown. */
export async function findAllTimeDriver(driverId) {
    const drivers = await getAllTimeDrivers();
    return drivers.find((driver) => driver.driverId === driverId) || null;
}

export async function searchDrivers(query, limit = 50) {
    const needle = normalize(query);
    if (!needle) return [];
    const drivers = await getAllTimeDrivers();
    return drivers
        .filter((driver) => normalize(`${driver.firstName} ${driver.lastName} ${driver.code} ${driver.nationality}`).includes(needle))
        .slice(0, Math.max(1, Math.min(Number(limit) || 50, 100)));
}

