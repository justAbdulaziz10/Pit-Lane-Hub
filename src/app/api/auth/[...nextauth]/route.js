import { handlers } from "@/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/validation";
import { NextResponse } from "next/server";

export const GET = handlers.GET;

// next-auth/react's signIn() posts with X-Auth-Return-Redirect and navigates to the returned `url`,
// so the rejection carries a login URL the page can render as an error.
function rejectMagicLink(request, error, status) {
    const url = new URL(`/login?error=${error}`, request.url).toString();
    return NextResponse.json({ url, error }, { status });
}

export async function POST(request, context) {
    if (new URL(request.url).pathname.endsWith("/signin/resend")) {
        try {
            const limit = await rateLimit(`auth:magic-link:${getClientIp(request.headers)}`, {
                limit: 5,
                windowMs: 15 * 60 * 1000,
            });
            if (!limit.success) return rejectMagicLink(request, "TooManyRequests", 429);

            // Also cap per recipient so one inbox cannot be flooded from many IPs.
            const form = await request.clone().formData().catch(() => null);
            const email = normalizeEmail(form?.get("email"));
            if (email) {
                const emailLimit = await rateLimit(`auth:magic-link-email:${email}`, {
                    limit: 5,
                    windowMs: 60 * 60 * 1000,
                });
                if (!emailLimit.success) return rejectMagicLink(request, "TooManyRequests", 429);
            }
        } catch {
            return rejectMagicLink(request, "Configuration", 503);
        }
    }

    return handlers.POST(request, context);
}
