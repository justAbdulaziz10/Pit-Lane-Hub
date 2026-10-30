import { NextResponse } from 'next/server';
import { resolveLocaleRoute } from '@/lib/i18n/routing';

/** English at unprefixed URLs, rewritten internally to /en. */
export function proxy(request) {
    const { pathname, search } = request.nextUrl;
    const decision = resolveLocaleRoute({ pathname, search });
    if (decision.action === 'redirect') {
        return NextResponse.redirect(new URL(decision.url, request.url), 308);
    }
    if (decision.action === 'rewrite') {
        return NextResponse.rewrite(new URL(decision.url, request.url));
    }
    return NextResponse.next();
}

export const config = {
    // Also match paths with extensions under the legacy locale so they redirect too.
    matcher: ['/ar/:path*', '/((?!api|_next|icon|apple-icon|calendar\\.ics|.*\\.[\\w]+$).*)'],
};
