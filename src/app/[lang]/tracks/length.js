import { formatNumber } from '@/lib/i18n/format';
import { pick } from '@/lib/i18n/messages';
import tracksMessages from '@/lib/i18n/messages/tracks';

/** Format a circuit length with English number formatting; unknown formats pass through. */
export function circuitLength(length, lang) {
    const kilometres = Number.parseFloat(length);
    if (!Number.isFinite(kilometres)) return length;
    const number = formatNumber(lang, kilometres, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return `${number} ${pick(tracksMessages, lang).km}`;
}
