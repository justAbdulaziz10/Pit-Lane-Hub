import { connection } from 'next/server';
import { driverPath } from '@/app/[lang]/driver/[number]/driver-data';
import DriversGrid from '@/components/DriversGrid';
import { getGrid } from '@/lib/f1/drivers';
import { getDriverStandings } from '@/lib/f1/standings';
import { getSeasonYear } from '@/lib/f1/year';
import { ensureTeamColorContrast } from '@/lib/f1/team-utils';
import { getHighQualityPhoto } from '@/lib/photos';
import { nationalityName } from '@/lib/i18n/f1-names';
import { pick } from '@/lib/i18n/messages';
import driverMessages from '@/lib/i18n/messages/drivers';
import styles from './page.module.css';

// Metadata (title, description, canonical /drivers) lives in ./layout.js.

function toCardData(driver, lang, standing) {
    const current = { ...driver, current: true };
    return {
        key: driver.driverId || `${driver.racingNumber}-${driver.code}`,
        driverId: driver.driverId,
        number: driver.racingNumber,
        code: driver.code,
        firstName: driver.firstName,
        lastName: driver.lastName,
        fullName: driver.fullName,
        nationality: nationalityName(driver.nationality, lang),
        flag: driver.flag,
        team: driver.team,
        position: standing?.position ?? null,
        points: standing?.points ?? null,
        colour: ensureTeamColorContrast(driver.teamColour || '#E10600'),
        headshot: driver.headshot,
        photo: getHighQualityPhoto(driver.headshot),
        href: driverPath(current) || '/drivers',
    };
}

export default async function DriversPage({ params, searchParams }) {
    await connection();
    const { lang } = await params;
    const t = pick(driverMessages, lang);
    const { q } = await searchParams;
    const [gridResult, standingsResult] = await Promise.allSettled([getGrid(), getDriverStandings(getSeasonYear())]);
    if (gridResult.status === 'rejected') throw gridResult.reason;
    const grid = gridResult.value;
    const standings = standingsResult.status === 'fulfilled' ? standingsResult.value : { standings: [] };
    const standingById = new Map(standings.standings.map((row) => [row.driver.id, row]));
    // Once the season has started, list the drivers who have raced in it; reserve and young
    // drivers who only ran in Friday practice stay reachable by URL but not in the line-up.
    const raceDrivers = standingById.size > 0
        ? grid.filter((driver) => standingById.has(driver.driverId))
        : grid;
    const gridOrder = new Map(raceDrivers.map((driver, index) => [driver.driverId, index]));
    const orderedGrid = [...raceDrivers].sort((a, b) => {
        const positionA = standingById.get(a.driverId)?.position ?? Infinity;
        const positionB = standingById.get(b.driverId)?.position ?? Infinity;
        return positionA - positionB || (gridOrder.get(a.driverId) ?? 0) - (gridOrder.get(b.driverId) ?? 0);
    });
    const drivers = orderedGrid.map((driver) => toCardData(driver, lang, standingById.get(driver.driverId)));
    const initialQuery = typeof q === 'string' ? q.slice(0, 40) : '';

    return (
        <div className={styles.drivers}>
            <div className={styles.header}>
                <div className="container">
                    <h1>{t.pageTitle}</h1>
                </div>
            </div>
            <div className={styles.content}>
                <div className="container">
                    {drivers.length > 0 ? (
                        <DriversGrid drivers={drivers} initialQuery={initialQuery} />
                    ) : (
                        <p className={styles.empty}>{t.seasonGridUnavailable}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
