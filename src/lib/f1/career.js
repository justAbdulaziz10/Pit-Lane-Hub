import { getChampionshipCount } from './history';
import {
    cacheF1Data,
    F1_CACHE_TAGS,
    fetchJolpicaPage,
    UpstreamError,
} from './http';

function safeId(value) {
    return encodeURIComponent(String(value || '').trim());
}

async function totalFor(path) {
    const payload = await fetchJolpicaPage(path, {
        limit: 1,
        revalidate: 86400,
        tags: [F1_CACHE_TAGS.career],
    });
    const total = Number(payload?.MRData?.total);
    if (!Number.isFinite(total)) {
        throw new UpstreamError('Jolpica returned a response without MRData.total', { source: 'Jolpica', url: path });
    }
    return total;
}

async function loadCareerStats(driverId) {
    const id = safeId(driverId);
    const [starts, wins, secondPlaces, thirdPlaces, poles, fastestLaps, seasons, championships] = await Promise.all([
        totalFor(`drivers/${id}/results`),
        totalFor(`drivers/${id}/results/1`),
        totalFor(`drivers/${id}/results/2`),
        totalFor(`drivers/${id}/results/3`),
        totalFor(`drivers/${id}/grid/1/results`),
        totalFor(`drivers/${id}/fastest/1/results`),
        totalFor(`drivers/${id}/seasons`),
        getChampionshipCount(driverId),
    ]);
    return {
        driverId,
        starts,
        wins,
        podiums: wins + secondPlaces + thirdPlaces,
        poles,
        fastestLaps,
        championships,
        seasons,
    };
}

const cachedCareerStats = cacheF1Data(loadCareerStats, ['career-stats'], 86400, [F1_CACHE_TAGS.career]);

export const DRIVER_ID_PATTERN = /^[a-z0-9_]{2,40}$/;

export function getCareerStats(driverId) {
    if (!DRIVER_ID_PATTERN.test(String(driverId || ''))) throw new TypeError('A valid Jolpica driverId is required');
    return cachedCareerStats(String(driverId));
}

