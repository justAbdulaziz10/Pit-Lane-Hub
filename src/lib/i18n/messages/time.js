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
    ar: {
        utc: 'UTC',
        localTime: 'بالتوقيت المحلي',
        today: 'اليوم',
        tomorrow: 'غدًا',
        yesterday: 'أمس',
        justNow: 'الآن',
        toGo: 'متبقية',
        remaining: 'متبقية',
        tbc: 'لم يُحدد بعد',
        started: 'بدأ',
        day: { zero: 'أيام', one: 'يوم', two: 'يومان', few: 'أيام', many: 'يومًا', other: 'يوم' },
        hour: { zero: 'ساعات', one: 'ساعة', two: 'ساعتان', few: 'ساعات', many: 'ساعة', other: 'ساعة' },
        minute: { zero: 'دقائق', one: 'دقيقة', two: 'دقيقتان', few: 'دقائق', many: 'دقيقة', other: 'دقيقة' },
        second: { zero: 'ثوانٍ', one: 'ثانية', two: 'ثانيتان', few: 'ثوانٍ', many: 'ثانية', other: 'ثانية' },
        sessions: {
            fp1: 'التجارب الحرة 1',
            fp2: 'التجارب الحرة 2',
            fp3: 'التجارب الحرة 3',
            sprintQualifying: 'تصفيات السباق السريع',
            sprint: 'السباق السريع',
            qualifying: 'التصفيات',
            race: 'السباق',
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
