import { connection } from 'next/server';
import { driverPath } from '@/app/driver/[number]/driver-data';
import DriversGrid from '@/components/DriversGrid';
import { getGrid } from '@/lib/f1/drivers';
import { ensureTeamColorContrast } from '@/lib/f1/team-utils';
import { getHighQualityPhoto } from '@/lib/photos';
import styles from './page.module.css';

// Metadata (title, description, canonical /drivers) lives in ./layout.js.

function toCardData(driver) {
    const current = { ...driver, current: true };
    return {
        key: driver.driverId || `${driver.racingNumber}-${driver.code}`,
        driverId: driver.driverId,
        number: driver.racingNumber,
        code: driver.code,
        firstName: driver.firstName,
        lastName: driver.lastName,
        fullName: driver.fullName,
        nationality: driver.nationality,
        flag: driver.flag,
        team: driver.team,
        colour: ensureTeamColorContrast(driver.teamColour || '#E10600'),
        headshot: driver.headshot,
        photo: getHighQualityPhoto(driver.headshot),
        href: driver.driverId || driver.racingNumber != null ? driverPath(current) : '/drivers',
    };
}

export default async function DriversPage({ searchParams }) {
    await connection();
    const { q } = await searchParams;
    const grid = await getGrid();
    const drivers = grid.map(toCardData);
    const initialQuery = typeof q === 'string' ? q.slice(0, 40) : '';

    return (
        <div className={styles.drivers}>
            <div className={styles.header}>
                <div className="container">
                    <h1>Drivers</h1>
                </div>
            </div>
            <div className={styles.content}>
                <div className="container">
                    {drivers.length > 0 ? (
                        <DriversGrid drivers={drivers} initialQuery={initialQuery} />
                    ) : (
                        <p className={styles.empty}>The grid for this season has not been announced yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
