import {
    cacheF1Data,
    F1_CACHE_TAGS,
    fetchJolpicaPages,
} from './http';
import { getOpenF1GridData } from './openf1-data';
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
    let [openData, seasonDrivers] = await Promise.all([
        getOpenF1GridData(year),
        getSeasonDriverList(year),
    ]);
    // Before the first session of a season neither source has the new year yet:
    // fall back to the previous season so the grid is never empty.
    if (openData.drivers.length === 0) openData = await getOpenF1GridData(Number(year) - 1);
    if (seasonDrivers.length === 0) seasonDrivers = await getSeasonDriverList(Number(year) - 1);
    return openData.drivers
        .map((openDriver) => {
            // A debutant may reach OpenF1 before Jolpica; keep them with OpenF1 data only.
            const jolpica = findJolpicaDriver(openDriver, seasonDrivers);
            const nationality = jolpica?.nationality || null;
            const iso = nationalityInfo(nationality, openDriver.country_code);
            const racingNumber = Number(openDriver.driver_number);
            const firstName = jolpica?.firstName || openDriver.first_name || '';
            const lastName = jolpica?.lastName || openDriver.last_name || '';
            return {
                driverId: jolpica?.driverId || null,
                racingNumber: Number.isFinite(racingNumber) ? racingNumber : null,
                number: Number.isFinite(racingNumber) ? racingNumber : null,
                code: jolpica?.code || openDriver.name_acronym || openDriver.code || null,
                firstName,
                lastName,
                fullName: [firstName, lastName].filter(Boolean).join(' ') || openDriver.full_name || null,
                nationality,
                nationalityCode: iso.code,
                countryCode: iso.code,
                flag: iso.flag,
                headshot: openDriver.headshot_url || null,
                team: canonicalTeamName(openDriver.team_name),
                teamColour: openDriver.team_colour ? `#${String(openDriver.team_colour).replace(/^#/, '')}` : null,
                sessionKey: openData.session?.session_key ?? null,
            };
        })
        .sort((a, b) => (a.racingNumber ?? Infinity) - (b.racingNumber ?? Infinity));
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

async function loadAllDrivers() {
    const drivers = await fetchJolpicaPages('drivers', {
        select: (mrData) => mrData?.DriverTable?.Drivers || [],
        revalidate: 604800,
        tags: [F1_CACHE_TAGS.drivers],
    });
    return drivers.map(mapJolpicaDriver);
}

const cachedAllDrivers = cacheF1Data(loadAllDrivers, ['all-drivers'], 604800, [F1_CACHE_TAGS.drivers]);

export async function searchDrivers(query, limit = 50) {
    const needle = normalize(query);
    if (!needle) return [];
    const drivers = await cachedAllDrivers();
    return drivers
        .filter((driver) => normalize(`${driver.firstName} ${driver.lastName} ${driver.code} ${driver.nationality}`).includes(needle))
        .slice(0, Math.max(1, Math.min(Number(limit) || 50, 100)));
}

