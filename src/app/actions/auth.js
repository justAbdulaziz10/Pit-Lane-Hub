'use server'

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isLocale, localePath } from "@/lib/i18n/config";
import { fill, pick } from "@/lib/i18n/messages";
import authMessages from "@/lib/i18n/messages/auth";
import { isValidEmail, normalizeEmail, validatePassword } from "@/lib/validation";

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

function formLocale(formData) {
    const value = formData.get("lang");
    return isLocale(value) ? value : "en";
}

async function checkRequestLimit(scope, limit) {
    const requestHeaders = await headers();
    return rateLimit(`${scope}:${getClientIp(requestHeaders)}`, {
        limit,
        windowMs: 15 * 60 * 1000,
    });
}

/** Caps verification emails per recipient, so one inbox cannot be flooded from many IPs. */
async function allowVerificationResend(email) {
    const limit = await rateLimit(`auth:verify-resend-email:${email}`, {
        limit: 3,
        windowMs: 60 * 60 * 1000,
    });
    return limit.success;
}

async function sendResendEmail({ to, subject, text }) {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) throw new Error("Email service is not configured");

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: process.env.EMAIL_FROM || process.env.AUTH_EMAIL_FROM || "onboarding@resend.dev",
            to: [to],
            subject,
            text,
        }),
    });

    if (!response.ok) throw new Error("Email could not be sent");
}

// Links in emails never use the request Host header, which a caller could forge.
function getPublicOrigin() {
    const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    return new URL(
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.AUTH_URL ||
        (productionHost ? `https://${productionHost}` : "http://localhost:3000"),
    ).origin;
}

function sha256Hex(value) {
    return createHash("sha256").update(value).digest("hex");
}

/**
 * Emails a verification link for a password account. The stored token is bound to the account's
 * current passwordHash (via its SHA-256 digest), so the link stops working if the password changes.
 */
async function sendVerificationEmail(user, lang) {
    if (!user.passwordHash) throw new Error("Verification links are only issued for password accounts");
    const t = pick(authMessages, lang);

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_LIFETIME_MS);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerificationTokenHash: sha256Hex(token),
            emailVerificationTokenExpires: expires,
            emailVerificationPasswordDigest: sha256Hex(user.passwordHash),
        },
    });

    // The link opens a confirmation page; only its POST verifies, so mail scanners that prefetch
    // links cannot verify an address on their own.
    const verificationUrl = new URL(localePath(lang, "/verify-email"), getPublicOrigin());
    verificationUrl.searchParams.set("token", token);

    await sendResendEmail({
        to: user.email,
        subject: t.verificationEmailSubject,
        text: fill(t.verificationEmailText, { url: verificationUrl.toString() }),
    });
}

async function sendExistingAccountEmail(email, lang) {
    const t = pick(authMessages, lang);
    const loginUrl = new URL(localePath(lang, "/login"), getPublicOrigin());
    await sendResendEmail({
        to: email,
        subject: t.existingAccountEmailSubject,
        text: fill(t.existingAccountEmailText, { url: loginUrl.toString() }),
    });
}

export async function registerUser(formData) {
    const lang = formLocale(formData);
    const t = pick(authMessages, lang);
    const name = String(formData.get("name") || "").trim();
    const email = normalizeEmail(formData.get("email"));
    const password = formData.get("password");

    if (!email || !password) {
        return { error: t.missingFields }
    }

    if (!isValidEmail(email)) {
        return { error: t.invalidEmail }
    }

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
        return {
            error: passwordCheck.message === "Password must be at least 8 characters long"
                ? t.passwordTooShort
                : t.passwordNeedsLetterAndNumber,
        }
    }

    try {
        const limit = await checkRequestLimit("auth:signup", 5);
        if (!limit.success) return { error: t.tooManyAttempts };

        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        const hashedPassword = await bcrypt.hash(password, 10)

        if (existingUser?.emailVerified || (existingUser && !existingUser.passwordHash)) {
            try {
                await sendExistingAccountEmail(email, lang);
            } catch {
                // The public response must not reveal whether the address is registered.
            }
            return { success: true, message: t.genericSignupMessage };
        }

        if (existingUser) {
            // Unverified password account: never replace the stored password, or anyone could
            // re-register a pending address with their own password and wait for the owner to
            // click the link. Resend a link for the existing password instead (rate-limited).
            try {
                if (await allowVerificationResend(email)) await sendVerificationEmail(existingUser, lang);
            } catch {
                // Keep the same response for every case.
            }
            return { success: true, message: t.genericSignupMessage };
        }

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash: hashedPassword,
                emailVerified: null,
            }
        })

        try {
            await sendVerificationEmail(user, lang);
        } catch {
            // Keep the same response for new and existing addresses.
        }
        return { success: true, message: t.genericSignupMessage };
    } catch {
        return { error: t.somethingWentWrong }
    }
}

export async function resendVerificationEmail(formData) {
    const lang = formLocale(formData);
    const t = pick(authMessages, lang);
    const email = normalizeEmail(formData.get("email"));
    if (!isValidEmail(email)) return { success: true, message: t.genericResendMessage };

    try {
        const limit = await checkRequestLimit("auth:verify-resend", 3);
        if (!limit.success) return { success: true, message: t.genericResendMessage };

        if (!(await allowVerificationResend(email))) return { success: true, message: t.genericResendMessage };

        const user = await prisma.user.findUnique({ where: { email } });
        if (user && !user.emailVerified && user.passwordHash) {
            try {
                await sendVerificationEmail(user, lang);
            } catch {
                // Keep address existence and delivery failures out of the response.
            }
        }
    } catch {
        // The response remains generic if the limiter or mail service is unavailable.
    }

    return { success: true, message: t.genericResendMessage };
}
