'use client';

import { usePathname } from 'next/navigation';
import { LOCALE_COOKIE, localePath, splitLocale } from '@/lib/i18n/config';
import { useLocale } from '@/lib/i18n/LocaleProvider';

/**
 * Same page in the other language. A full navigation (not next/link) so the
 * root layout re-renders with the new lang/dir; the cookie keeps the choice.
 */
export default function LanguageSwitch({ className, label, title }) {
    const locale = useLocale();
    const target = locale === 'ar' ? 'en' : 'ar';
    const { path } = splitLocale(usePathname() || '/');
    const href = localePath(target, path);

    return (
        <a
            href={href}
            hrefLang={target}
            lang={target}
            title={title}
            className={className}
            onClick={(event) => {
                document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
                // Keep the query (e.g. ?year=1976); the browser follows the updated href.
                event.currentTarget.href = `${href}${window.location.search}`;
            }}
        >
            {label}
        </a>
    );
}
