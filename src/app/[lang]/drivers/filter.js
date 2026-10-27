function fold(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

/** Match a driver by name, code, number, team or nationality, accent-insensitive. */
export function filterDrivers(drivers, { query = '', team = '' } = {}) {
    const needle = fold(query);
    return drivers.filter((driver) => {
        if (team && driver.team !== team) return false;
        if (!needle) return true;
        const haystack = fold([
            driver.fullName,
            driver.code,
            driver.number,
            driver.team,
            driver.nationality,
        ].filter((value) => value != null).join(' '));
        return haystack.includes(needle);
    });
}

/** Group by team (alphabetical), keeping each team's drivers in number order. */
export function groupByTeam(drivers) {
    const groups = new Map();
    for (const driver of drivers) {
        const key = driver.team || 'Unknown team';
        if (!groups.has(key)) groups.set(key, { team: key, colour: driver.colour, drivers: [] });
        groups.get(key).drivers.push(driver);
    }
    return [...groups.values()]
        .map((group) => ({ ...group, drivers: [...group.drivers].sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity)) }))
        .sort((a, b) => a.team.localeCompare(b.team));
}

/** Favourites first, then the incoming order (Array#sort is stable). */
export function favouritesFirst(drivers, favourites) {
    if (!favourites.length) return drivers;
    const set = new Set(favourites);
    return [...drivers].sort((a, b) => Number(set.has(b.number)) - Number(set.has(a.number)));
}
