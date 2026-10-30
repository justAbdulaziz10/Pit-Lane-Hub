const time = {
    en: {
        utc: 'UTC',
        localTime: 'local time',
        today: 'today',
        tomorrow: 'tomorrow',
        yesterday: 'yesterday',
        justNow: 'just now',
        toGo: 'to go',
        remaining: 'remaining',
        tbc: 'TBC',
        started: 'Started',
        day: { one: 'day', other: 'days' },
        hour: { one: 'hour', other: 'hours' },
        minute: { one: 'minute', other: 'minutes' },
        second: { one: 'second', other: 'seconds' },
        sessions: {
            fp1: 'Practice 1',
            fp2: 'Practice 2',
            fp3: 'Practice 3',
            sprintQualifying: 'Sprint Qualifying',
            sprint: 'Sprint',
            qualifying: 'Qualifying',
            race: 'Race',
        },
    },
};

const SESSION_ALIASES = new Map([
    ['firstpractice', 'fp1'], ['practice1', 'fp1'], ['fp1', 'fp1'], ['freepractice1', 'fp1'], ['firstpractice1', 'fp1'],
    ['secondpractice', 'fp2'], ['practice2', 'fp2'], ['fp2', 'fp2'], ['freepractice2', 'fp2'], ['secondpractice2', 'fp2'],
    ['thirdpractice', 'fp3'], ['practice3', 'fp3'], ['fp3', 'fp3'], ['freepractice3', 'fp3'], ['thirdpractice3', 'fp3'],
    ['sprintqualifying', 'sprintQualifying'], ['sprintshootout', 'sprintQualifying'], ['sprintshootoutqualifying', 'sprintQualifying'],
    ['sprint', 'sprint'], ['race', 'race'], ['grandprix', 'race'], ['qualifying', 'qualifying'], ['qualification', 'qualifying'],
]);

export function sessionLabel(value, locale = 'en') {
    const original = String(value ?? '');
    const key = original.toLowerCase().replace(/[^a-z0-9]/g, '');
    const session = SESSION_ALIASES.get(key);
    return session ? time[locale]?.sessions?.[session] || time.en.sessions[session] : original;
}

export default time;
