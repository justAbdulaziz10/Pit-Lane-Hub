// Arabic names for F1 data that arrives in English from Jolpica and OpenF1.
// Driver, team and circuit names stay in their original Latin form, as Arabic
// F1 coverage writes them. Unknown values fall back to the English original.

// "<X> Grand Prix" → "جائزة <X> الكبرى", keyed by X as Jolpica writes it.
const GRAND_PRIX = Object.freeze({
    '70th Anniversary': 'الذكرى السبعين',
    'Abu Dhabi': 'أبوظبي',
    Argentine: 'الأرجنتين',
    Australian: 'أستراليا',
    Austrian: 'النمسا',
    Azerbaijan: 'أذربيجان',
    Bahrain: 'البحرين',
    Barcelona: 'برشلونة',
    'Barcelona-Catalunya': 'برشلونة-كتالونيا',
    Belgian: 'بلجيكا',
    Brazilian: 'البرازيل',
    British: 'بريطانيا',
    'Caesars Palace': 'سيزرز بالاس',
    Canadian: 'كندا',
    Chinese: 'الصين',
    Dallas: 'دالاس',
    Detroit: 'ديترويت',
    Dutch: 'هولندا',
    Eifel: 'آيفل',
    'Emilia Romagna': 'إميليا رومانيا',
    European: 'أوروبا',
    French: 'فرنسا',
    German: 'ألمانيا',
    Hungarian: 'المجر',
    Indian: 'الهند',
    Italian: 'إيطاليا',
    Japanese: 'اليابان',
    Korean: 'كوريا',
    'Las Vegas': 'لاس فيغاس',
    Luxembourg: 'لوكسمبورغ',
    Madrid: 'مدريد',
    Malaysian: 'ماليزيا',
    Mexican: 'المكسيك',
    'Mexico City': 'مكسيكو سيتي',
    Miami: 'ميامي',
    Monaco: 'موناكو',
    Moroccan: 'المغرب',
    Pacific: 'المحيط الهادئ',
    Pescara: 'بيسكارا',
    Portuguese: 'البرتغال',
    Qatar: 'قطر',
    Russian: 'روسيا',
    Sakhir: 'الصخير',
    'San Marino': 'سان مارينو',
    'Saudi Arabian': 'السعودية',
    Singapore: 'سنغافورة',
    'South African': 'جنوب أفريقيا',
    Spanish: 'إسبانيا',
    Styrian: 'ستيريا',
    Swedish: 'السويد',
    Swiss: 'سويسرا',
    'São Paulo': 'ساو باولو',
    Turkish: 'تركيا',
    Tuscan: 'توسكانا',
    'United States': 'الولايات المتحدة',
});

const SPECIAL_RACES = Object.freeze({
    'Indianapolis 500': 'إنديانابوليس 500',
    'United States Grand Prix West': 'جائزة الولايات المتحدة الغربية الكبرى',
    'Bahrain Grand Prix in Malaysia': 'جائزة البحرين الكبرى في ماليزيا',
});

const COUNTRIES = Object.freeze({
    Argentina: 'الأرجنتين',
    Australia: 'أستراليا',
    Austria: 'النمسا',
    Azerbaijan: 'أذربيجان',
    Bahrain: 'البحرين',
    Belgium: 'بلجيكا',
    Brazil: 'البرازيل',
    Canada: 'كندا',
    China: 'الصين',
    France: 'فرنسا',
    Germany: 'ألمانيا',
    'Great Britain': 'بريطانيا',
    Hungary: 'المجر',
    India: 'الهند',
    Italy: 'إيطاليا',
    Japan: 'اليابان',
    Korea: 'كوريا الجنوبية',
    Malaysia: 'ماليزيا',
    Mexico: 'المكسيك',
    Monaco: 'موناكو',
    Morocco: 'المغرب',
    Netherlands: 'هولندا',
    Portugal: 'البرتغال',
    Qatar: 'قطر',
    Russia: 'روسيا',
    'Saudi Arabia': 'السعودية',
    Singapore: 'سنغافورة',
    'South Africa': 'جنوب أفريقيا',
    Spain: 'إسبانيا',
    Sweden: 'السويد',
    Switzerland: 'سويسرا',
    Turkey: 'تركيا',
    UAE: 'الإمارات',
    'United Arab Emirates': 'الإمارات',
    UK: 'بريطانيا',
    'United Kingdom': 'بريطانيا',
    USA: 'الولايات المتحدة',
    'United States': 'الولايات المتحدة',
});

const NATIONALITIES = Object.freeze({
    American: 'أمريكي',
    Argentine: 'أرجنتيني',
    Australian: 'أسترالي',
    Austrian: 'نمساوي',
    Belgian: 'بلجيكي',
    Brazilian: 'برازيلي',
    British: 'بريطاني',
    Canadian: 'كندي',
    Chilean: 'تشيلي',
    Chinese: 'صيني',
    Colombian: 'كولومبي',
    Czech: 'تشيكي',
    Danish: 'دنماركي',
    Dutch: 'هولندي',
    'East German': 'ألماني شرقي',
    Finnish: 'فنلندي',
    French: 'فرنسي',
    German: 'ألماني',
    Hungarian: 'مجري',
    Indian: 'هندي',
    Indonesian: 'إندونيسي',
    Irish: 'أيرلندي',
    Italian: 'إيطالي',
    Japanese: 'ياباني',
    Liechtensteiner: 'ليختنشتايني',
    Malaysian: 'ماليزي',
    Mexican: 'مكسيكي',
    Monegasque: 'موناكي',
    'New Zealander': 'نيوزيلندي',
    Polish: 'بولندي',
    Portuguese: 'برتغالي',
    Rhodesian: 'روديسي',
    Russian: 'روسي',
    'South African': 'جنوب أفريقي',
    Spanish: 'إسباني',
    Swedish: 'سويدي',
    Swiss: 'سويسري',
    Thai: 'تايلاندي',
    Uruguayan: 'أوروغواياني',
    Venezuelan: 'فنزويلي',
});

/** A race name in the locale ("Bahrain Grand Prix" → "جائزة البحرين الكبرى"). */
export function raceName(name, locale) {
    if (locale !== 'ar' || !name) return name;
    if (SPECIAL_RACES[name]) return SPECIAL_RACES[name];
    const match = String(name).match(/^(.+) Grand Prix$/);
    const place = match && GRAND_PRIX[match[1]];
    return place ? `جائزة ${place} الكبرى` : name;
}

/** A country name in the locale (Jolpica and OpenF1 spellings). */
export function countryName(name, locale) {
    if (locale !== 'ar' || !name) return name;
    return COUNTRIES[name] || name;
}

/** A driver or team nationality in the locale. */
export function nationalityName(name, locale) {
    if (locale !== 'ar' || !name) return name;
    return NATIONALITIES[name] || name;
}
