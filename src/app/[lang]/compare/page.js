import { headers } from 'next/headers';
import { connection } from 'next/server';
import CompareContent from '@/components/CompareContent';
import { compareDrivers, isValidDriverId } from '@/lib/f1/compare';
import { getGrid } from '@/lib/f1/drivers';
import { getSeasonSummary } from '@/lib/f1/history';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import styles from './page.module.css';

export const metadata = {
    title: 'Compare Drivers',
    description: 'Compare any two Formula 1 drivers since 1950: championships, wins, podiums, poles, fastest laps, starts and head-to-head record.',
    alternates: { canonical: '/compare' },
    openGraph: {
        title: 'Compare Drivers',
        description: 'Compare any two Formula 1 drivers since 1950, with career totals and head-to-head record.',
        url: '/compare',
    },
};

function param(value) {
    const raw = Array.isArray(value) ? value[0] : value;
    return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/** Current championship leaders, or the grid before the first race. */
async function defaultIds() {
    const summary = await getSeasonSummary();
    const fromStandings = summary.driverStandings.map((item) => item.driver.id).filter(Boolean);
    if (fromStandings.length >= 2) return fromStandings;
    const grid = await getGrid();
    return grid.map((driver) => driver.driverId).filter(Boolean);
}

async function initialPair(a, b) {
    if (a && b) return [a, b];
    const candidates = await defaultIds();
    if (a) return [a, candidates.find((id) => id !== a) || ''];
    if (b) return [candidates.find((id) => id !== b) || '', b];
    return [candidates[0] || '', candidates[1] || ''];
}

export default async function ComparePage({ searchParams }) {
    await connection();
    const query = await searchParams;
    let [a, b] = [param(query.a), param(query.b)];
    let comparison = null;
    let error = null;
    try {
        [a, b] = await initialPair(a, b);
        if (!isValidDriverId(a) || !isValidDriverId(b) || a === b) {
            error = a && b ? 'invalid' : null;
        } else {
            const ip = getClientIp(await headers());
            const limit = await rateLimit(`compare-page:${ip}`, { limit: 20, windowMs: 60_000 });
            if (!limit.success) error = 'rate-limited';
            else {
                comparison = await compareDrivers(a, b);
                if (!comparison) error = 'not-found';
            }
        }
    } catch (failure) {
        // Keep the pickers usable; the client shows the error with a retry.
        console.error('[compare page]', failure);
        error = 'unavailable';
    }

    return (
        <div className={styles.compare}>
            <div className={styles.header}>
                <div className="container">
                    <h1>Compare drivers</h1>
                </div>
            </div>
            <CompareContent
                key={`${a}:${b}`}
                initialIds={[isValidDriverId(a) ? a : '', isValidDriverId(b) ? b : '']}
                initialComparison={comparison}
                initialError={error}
            />
        </div>
    );
}
