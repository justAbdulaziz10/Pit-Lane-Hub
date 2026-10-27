#!/usr/bin/env node
// Regenerate the bundled Jolpica snapshots in src/lib/f1/data/.
// The app adds newer seasons live, so this only needs running occasionally:
//   node scripts/update-f1-snapshots.mjs drivers     (~10 requests)
//   node scripts/update-f1-snapshots.mjs champions   (~145 requests; Jolpica allows ~500/hour)
import { writeFile } from 'node:fs/promises';

const BASE = 'https://api.jolpi.ca/ergast/f1';
const DATA_DIR = new URL('../src/lib/f1/data/', import.meta.url);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(path, attempt = 0) {
    const response = await fetch(`${BASE}/${path}`);
    if ((response.status === 429 || response.status >= 500) && attempt < 5) {
        await sleep(2000 * (attempt + 1));
        return get(path, attempt + 1);
    }
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    await sleep(300);
    return (await response.json()).MRData;
}

async function snapshotDrivers() {
    const drivers = [];
    let total = Infinity;
    while (drivers.length < total) {
        const data = await get(`drivers.json?limit=100&offset=${drivers.length}`);
        total = Number(data.total);
        const page = data.DriverTable.Drivers;
        if (page.length === 0) break;
        drivers.push(...page.map(({ driverId, permanentNumber, code, url, givenName, familyName, dateOfBirth, nationality }) => ({
            driverId, permanentNumber, code, url, givenName, familyName, dateOfBirth, nationality,
        })));
    }
    await writeFile(new URL('drivers-all-time.json', DATA_DIR), `${JSON.stringify(drivers)}\n`);
    console.log(`drivers: ${drivers.length}`);
}

async function snapshotChampions() {
    const lastSeason = new Date().getUTCFullYear() - 1;
    const out = { drivers: [], constructors: [] };
    for (let year = 1950; year <= lastSeason; year += 1) {
        const driverList = (await get(`${year}/driverstandings/1.json`)).StandingsTable.StandingsLists[0];
        const driver = driverList?.DriverStandings?.[0]?.Driver;
        if (driver) {
            out.drivers.push({
                year,
                driverId: driver.driverId,
                code: driver.code ?? null,
                firstName: driver.givenName,
                lastName: driver.familyName,
                nationality: driver.nationality ?? null,
            });
        }
        if (year < 1958) continue;
        const constructorList = (await get(`${year}/constructorstandings/1.json`)).StandingsTable.StandingsLists[0];
        const constructor = constructorList?.ConstructorStandings?.[0]?.Constructor;
        if (constructor) {
            out.constructors.push({
                year,
                constructorId: constructor.constructorId,
                name: constructor.name,
                nationality: constructor.nationality ?? null,
            });
        }
    }
    await writeFile(new URL('champions-history.json', DATA_DIR), `${JSON.stringify(out, null, 1)}\n`);
    console.log(`champions: ${out.drivers.length} drivers, ${out.constructors.length} constructors`);
}

const targets = process.argv.slice(2);
if (targets.length === 0 || targets.includes('drivers')) await snapshotDrivers();
if (targets.length === 0 || targets.includes('champions')) await snapshotChampions();
