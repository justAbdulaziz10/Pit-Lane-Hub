import { connection } from 'next/server';
import { driverPath } from '@/app/[lang]/driver/[number]/driver-data';
import DriversGrid from '@/components/DriversGrid';
import { getGrid } from '@/lib/f1/drivers';
import { ensureTeamColorContrast } from '@/lib/f1/team-utils';
import { getHighQualityPhoto } from '@/lib/photos';
import { nationalityName } from '@/lib/i18n/f1-names';
import { pick } from '@/lib/i18n/messages';
import driverMessages from '@/lib/i18n/messages/drivers';
import styles from './page.module.css';

// Metadata (title, description, canonical /drivers) lives in ./layout.js.

function toCardData(driver, lang) {
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
        colour: ensureTeamColorContrast(driver.teamColour || '#E10600'),
        headshot: driver.headshot,
        photo: getHighQualityPhoto(driver.headshot),
        href: driver.driverId || driver.racingNumber != null ? driverPath(current) : '/drivers',
    };
}

export default async function DriversPage({ params, searchParams }) {
    await connection();
    const { lang } = await params;
    const t = pick(driverMessages, lang);
    const { q } = await searchParams;
    const grid = await getGrid();
    const drivers = grid.map((driver) => toCardData(driver, lang));
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
