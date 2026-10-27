import { NextResponse } from 'next/server';
import { LOCALE_COOKIE } from '@/lib/i18n/config';
import { resolveLocaleRoute } from '@/lib/i18n/routing';

/** English at unprefixed URLs (rewritten to /en internally), Arabic under /ar. */
export function proxy(request) {
    const { pathname, search } = request.nextUrl;
    const decision = resolveLocaleRoute({
        pathname,
        search,
        cookieLocale: request.cookies.get(LOCALE_COOKIE)?.value,
        userAgent: request.headers.get('user-agent') || '',
        isDocument: request.headers.get('sec-fetch-dest') === 'document',
    });
    if (decision.action === 'redirect') {
        return NextResponse.redirect(new URL(decision.url, request.url), decision.temporary ? 307 : 308);
    }
    if (decision.action === 'rewrite') {
        return NextResponse.rewrite(new URL(decision.url, request.url));
    }
    return NextResponse.next();
}

export const config = {
    // Pages only: not API routes, Next internals, root metadata routes or files with an extension.
    matcher: ['/((?!api|_next|icon|apple-icon|calendar\\.ics|.*\\.[\\w]+$).*)'],
};
