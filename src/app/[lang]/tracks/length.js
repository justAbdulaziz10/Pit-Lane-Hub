import { formatNumber } from '@/lib/i18n/format';
import { pick } from '@/lib/i18n/messages';
import tracksMessages from '@/lib/i18n/messages/tracks';

/** "5.419 km" → localized number and unit ("5.419 كم"); unknown formats pass through. */
export function circuitLength(length, lang) {
    const kilometres = Number.parseFloat(length);
    if (!Number.isFinite(kilometres)) return length;
    const number = formatNumber(lang, kilometres, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return `${number} ${pick(tracksMessages, lang).km}`;
}
