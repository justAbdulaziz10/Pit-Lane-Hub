import { localePath } from '@/lib/i18n/config';

export function viewHref(year, view = 'races', lang = 'en') {
    const params = new URLSearchParams();
    if (year != null) params.set('year', String(year));
    if (view !== 'races') params.set('view', view);
    const query = params.toString();
    return localePath(lang, `/history${query ? `?${query}` : ''}`);
}

function topRecords(items, idKey, nameOf) {
    const counts = new Map();
    for (const item of items || []) {
        const id = item?.[idKey] || nameOf(item);
        if (!id) continue;
        const current = counts.get(id) || { id, name: nameOf(item), titles: 0 };
        current.titles += 1;
        counts.set(id, current);
    }
    const ranked = [...counts.values()].sort((a, b) => b.titles - a.titles || a.name.localeCompare(b.name));
    return ranked.length ? ranked.filter((record) => record.titles === ranked[0].titles) : [];
}

export function allTimeRecords(champions) {
    return {
        drivers: topRecords(champions?.drivers, 'driverId', (item) => `${item?.firstName || ''} ${item?.lastName || ''}`.trim()),
        constructors: topRecords(champions?.constructors, 'constructorId', (item) => item?.name || ''),
    };
}
