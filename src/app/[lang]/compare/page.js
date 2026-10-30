import { headers } from 'next/headers';
import { connection } from 'next/server';
import CompareContent from '@/components/CompareContent';
import { compareDrivers, isValidDriverId } from '@/lib/f1/compare';
import { getGrid } from '@/lib/f1/drivers';
import { getSeasonSummary } from '@/lib/f1/history';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import { getHighQualityPhoto } from '@/lib/photos';
import { pick } from '@/lib/i18n/messages';
import compareMessages from '@/lib/i18n/messages/compare';
import styles from './page.module.css';

export async function generateMetadata({ params, searchParams }) {
    const { lang } = await params;
    const t = pick(compareMessages, lang);
    const query = await searchParams;
    const pair = new URLSearchParams();
    const a = param(query?.a);
    const b = param(query?.b);
    if (a) pair.set('a', a);
    if (b) pair.set('b', b);
    const path = pair.size ? `/compare?${pair.toString()}` : '/compare';
    return {
        title: t.metadataTitle,
        description: t.metadataDescriptionEntries,
        alternates: localeAlternates(lang, path),
        openGraph: {
            title: t.metadataTitle,
            description: t.metadataOgDescription,
            url: localePath(lang, path),
            images: [localePath(lang, '/opengraph-image')],
            locale: 'en_US',
        },
    };
}

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

export default async function ComparePage({ params, searchParams }) {
    await connection();
    const { lang } = await params;
    const t = pick(compareMessages, lang);
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

    const currentGrid = await getGrid().catch(() => []);
    const driverProfiles = Object.fromEntries(currentGrid
        .filter((driver) => driver.driverId)
        .map((driver) => [driver.driverId, {
            photo: getHighQualityPhoto(driver.headshot),
            headshot: driver.headshot || null,
            color: driver.teamColour || null,
        }]));

    return (
        <div className={styles.compare}>
            <header className={`page-hero ${styles.header}`}>
                <div className="page-hero__content container">
                    <p className="page-hero__badge"><span aria-hidden="true">🏁</span>{t.headToHead}</p>
                    <h1 className="page-hero__title">{t.pageTitle}</h1>
                </div>
            </header>
            <CompareContent
                key={`${a}:${b}`}
                initialIds={[isValidDriverId(a) ? a : '', isValidDriverId(b) ? b : '']}
                initialComparison={comparison}
                initialError={error}
                driverProfiles={driverProfiles}
            />
        </div>
    );
}
