'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import scheduleMessages from '@/lib/i18n/messages/schedule';
import { fill, pick } from '@/lib/i18n/messages';
import { getSeasonYear } from '@/lib/f1/year';

export default function LoadingLabel() {
    const locale = useLocale();
    const t = pick(scheduleMessages, locale);
    return (
        <>
            <span className="page-hero__badge"><span aria-hidden="true">📅</span>{t.heroBadge}</span>
            <h1 className="page-hero__title">{fill(t.loadingTitle, { year: String(getSeasonYear()) })}</h1>
            <p className="page-hero__subline">{t.loadingMessage}</p>
        </>
    );
}
