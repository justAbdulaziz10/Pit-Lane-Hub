import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isLocale, localePath } from "@/lib/i18n/config";
import { pick } from "@/lib/i18n/messages";
import errorMessages from "@/lib/i18n/messages/errors";
import { NextResponse } from "next/server";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const CREDENTIALS_WINDOW_MS = 15 * 60 * 1000;
const CREDENTIALS_IP_LIMIT = 10;
const CREDENTIALS_EMAIL_FAILURE_LIMIT = 10;
const DUMMY_PASSWORD_HASH = "$2b$10$CFQ8W3JJN2v6TZXERzjM1O3g/RvuvylIe5v/MpKNgUTtd2MYG5xX2";

function sha256Hex(value) {
    return createHash("sha256").update(value).digest("hex");
}

function requestLocale(request) {
    const value = new URL(request.url).searchParams.get("lang");
    return isLocale(value) ? value : "en";
}

/** Rejects cross-site form posts. A missing or opaque ("null") Origin is left to the token check. */
function isForeignOrigin(request) {
    const origin = request.headers.get("origin");
    if (!origin || origin === "null") return false;
    return origin !== new URL(request.url).origin;
}

/**
 * Links sent before verification became a POST point here. A GET never changes state: it only
 * forwards to the confirmation page, which posts the token back.
 */
export function GET(request) {
    const url = new URL(request.url);
    const lang = requestLocale(request);
    const token = url.searchParams.get("token");
    if (!token || !TOKEN_PATTERN.test(token)) {
        return NextResponse.redirect(new URL(localePath(lang, "/login?verification=invalid"), request.url));
    }
    const confirmUrl = new URL(localePath(lang, "/verify-email"), request.url);
    confirmUrl.searchParams.set("token", token);
    return NextResponse.redirect(confirmUrl);
}

/** Verifies the address for a token posted from /verify-email. */
export async function POST(request) {
    const urlLang = requestLocale(request);
    let lang = urlLang;
    const invalid = () => NextResponse.redirect(new URL(localePath(lang, "/login?verification=invalid"), request.url), 303);

    if (isForeignOrigin(request)) {
        const t = pick(errorMessages, lang);
        return NextResponse.json({ error: t.invalidRequestOrigin }, { status: 403 });
    }

    const form = await request.formData().catch(() => null);
    const formLang = form?.get("lang");
    if (isLocale(formLang)) lang = formLang;
    const t = pick(errorMessages, lang);
    const token = form?.get("token");
    if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) return invalid();

    try {
        const credentialsWindow = { windowMs: CREDENTIALS_WINDOW_MS };
        const credentialsIpLimit = await rateLimit(`auth:credentials:${getClientIp(request.headers)}`, {
            ...credentialsWindow,
            limit: CREDENTIALS_IP_LIMIT,
        });
        if (!credentialsIpLimit.success) {
            return NextResponse.json({ error: t.tooManyVerificationAttempts }, { status: 429 });
        }

        const limit = await rateLimit(`auth:verify:${getClientIp(request.headers)}`, {
            limit: 20,
            windowMs: 15 * 60 * 1000,
        });
        if (!limit.success) {
            return NextResponse.json({ error: t.tooManyVerificationAttempts }, { status: 429 });
        }

        const tokenHash = sha256Hex(token.toLowerCase());
        const user = await prisma.user.findFirst({
            where: {
                emailVerificationTokenHash: tokenHash,
                emailVerificationTokenExpires: { gt: new Date() },
            },
            select: { id: true, email: true, passwordHash: true, emailVerificationPasswordDigest: true },
        });

        const password = form?.get("password");
        const submittedPassword = typeof password === "string" ? password : "";
        const emailFailureKey = user?.email ? `auth:credentials-email-failures:${user.email}` : null;
        const emailFailureOptions = {
            limit: CREDENTIALS_EMAIL_FAILURE_LIMIT,
            windowMs: CREDENTIALS_WINDOW_MS,
        };

        if (emailFailureKey) {
            const emailLimit = await rateLimit(emailFailureKey, { ...emailFailureOptions, consume: false });
            if (!emailLimit.success) {
                return NextResponse.json({ error: t.tooManyVerificationAttempts }, { status: 429 });
            }
        }

        // Compare once even when a token is stale or unknown, and never skip bcrypt because a
        // password is missing. This matches credentials sign-in's dummy-hash timing path.
        const passwordValid = await bcrypt.compare(submittedPassword, user?.passwordHash || DUMMY_PASSWORD_HASH);

        if (
            !user?.passwordHash ||
            !user.emailVerificationPasswordDigest ||
            sha256Hex(user.passwordHash) !== user.emailVerificationPasswordDigest
        ) {
            return invalid();
        }

        if (!passwordValid) {
            await rateLimit(emailFailureKey, emailFailureOptions);
            const confirmationUrl = new URL(localePath(lang, "/verify-email"), request.url);
            confirmationUrl.searchParams.set("token", token);
            confirmationUrl.searchParams.set("verification", "password");
            return NextResponse.redirect(confirmationUrl, 303);
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
                // Legacy column: once cleared, a verified row still holding it was verified by the
                // previous deployment's magic link (see scripts/post-deploy-sync.sql).
                password: null,
                emailVerificationTokenHash: null,
                emailVerificationTokenExpires: null,
                emailVerificationPasswordDigest: null,
            },
        });
        if (result.count !== 1) return invalid();

        return NextResponse.redirect(new URL(localePath(lang, "/login?verified=true"), request.url), 303);
    } catch {
        return invalid();
    }
}
