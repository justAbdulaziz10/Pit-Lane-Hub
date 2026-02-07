import CompareContent from '@/components/CompareContent';
import { getDrivers } from '@/lib/f1api';

export const metadata = {
    title: 'Compare Drivers | Pit Lane Hub',
    description: 'Compare career statistics between F1 drivers side-by-side. Analyze wins, poles, podiums, and championship points.',
};

export default async function ComparePage() {
    let drivers = [];
    try {
        drivers = await getDrivers();
        // Remove duplicates
        const seen = new Set();
        drivers = drivers.filter((driver) => {
            if (seen.has(driver.driver_number)) return false;
            seen.add(driver.driver_number);
            return true;
        });
    } catch (e) {
        console.error('Failed to fetch drivers for compare page:', e);
    }

    return <CompareContent initialDrivers={drivers} />;
}
