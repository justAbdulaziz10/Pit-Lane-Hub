'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import scheduleMessages from '@/lib/i18n/messages/schedule';
import { pick } from '@/lib/i18n/messages';

export default function LoadingLabel() {
    const locale = useLocale();
    const t = pick(scheduleMessages, locale);
    return (
        <>
            <h1>{t.loadingTitle}</h1>
            <p>{t.loadingMessage}</p>
        </>
    );
}
