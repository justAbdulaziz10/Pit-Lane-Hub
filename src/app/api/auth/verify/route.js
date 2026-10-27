import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

function sha256Hex(value) {
    return createHash("sha256").update(value).digest("hex");
}

function getSiteOrigin(request) {
    try {
        return new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin;
    } catch {
        return new URL(request.url).origin;
    }
}

/** Rejects cross-site form posts. A missing or opaque ("null") Origin is left to the token check. */
function isForeignOrigin(request) {
    const origin = request.headers.get("origin");
    if (!origin || origin === "null") return false;
    return origin !== new URL(request.url).origin && origin !== getSiteOrigin(request);
}

/**
 * Links sent before verification became a POST point here. A GET never changes state: it only
 * forwards to the confirmation page, which posts the token back.
 */
export function GET(request) {
    const siteOrigin = getSiteOrigin(request);
    const token = new URL(request.url).searchParams.get("token");
    if (!token || !TOKEN_PATTERN.test(token)) {
        return NextResponse.redirect(new URL("/login?verification=invalid", siteOrigin));
    }
    const confirmUrl = new URL("/verify-email", siteOrigin);
    confirmUrl.searchParams.set("token", token);
    return NextResponse.redirect(confirmUrl);
}

/** Verifies the address for a token posted from /verify-email. */
export async function POST(request) {
    const siteOrigin = getSiteOrigin(request);
    const invalid = () => NextResponse.redirect(new URL("/login?verification=invalid", siteOrigin), 303);

    if (isForeignOrigin(request)) {
        return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const form = await request.formData().catch(() => null);
    const token = form?.get("token");
    if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) return invalid();

    try {
        const limit = await rateLimit(`auth:verify:${getClientIp(request.headers)}`, {
            limit: 20,
            windowMs: 15 * 60 * 1000,
        });
        if (!limit.success) {
            return NextResponse.json({ error: "Too many verification attempts." }, { status: 429 });
        }

        const tokenHash = sha256Hex(token.toLowerCase());
        const user = await prisma.user.findFirst({
            where: {
                emailVerificationTokenHash: tokenHash,
                emailVerificationTokenExpires: { gt: new Date() },
            },
            select: { id: true, passwordHash: true, emailVerificationPasswordDigest: true },
        });

        // The token only verifies the password it was issued for.
        if (
            !user?.passwordHash ||
            !user.emailVerificationPasswordDigest ||
            sha256Hex(user.passwordHash) !== user.emailVerificationPasswordDigest
        ) {
            return invalid();
        }

        // Conditional write: if the token or password changed since the read, nothing is verified.
        const result = await prisma.user.updateMany({
            where: {
                id: user.id,
                emailVerificationTokenHash: tokenHash,
                passwordHash: user.passwordHash,
            },
            data: {
                emailVerified: new Date(),
                emailVerificationTokenHash: null,
                emailVerificationTokenExpires: null,
                emailVerificationPasswordDigest: null,
            },
        });
        if (result.count !== 1) return invalid();

        return NextResponse.redirect(new URL("/login?verified=true", siteOrigin), 303);
    } catch {
        return invalid();
    }
}
