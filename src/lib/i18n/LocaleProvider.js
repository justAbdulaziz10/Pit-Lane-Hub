'use client';

import NextLink from 'next/link';
import { createContext, useContext } from 'react';
import { DEFAULT_LOCALE, localePath } from './config';

const LocaleContext = createContext(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }) {
    return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
    return useContext(LocaleContext);
}

/** next/link that keeps the visitor in their language: href is an app path ("/teams"). */
export function Link({ href, ...props }) {
    const locale = useLocale();
    const target = typeof href === 'string' && href.startsWith('/') ? localePath(locale, href) : href;
    return <NextLink href={target} {...props} />;
}
