import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isProStatus, isValidEmail, normalizeEmail } from "@/lib/validation";

const adapter = PrismaAdapter(prisma);
const originalCreateUser = adapter.createUser;
const originalGetUserByEmail = adapter.getUserByEmail;
const originalUpdateUser = adapter.updateUser;

adapter.createUser = (user) => originalCreateUser({
    ...user,
    email: user.email ? normalizeEmail(user.email) : user.email,
});
adapter.getUserByEmail = (email) => originalGetUserByEmail(normalizeEmail(email));
adapter.updateUser = async (user) => {
    const normalizedUser = {
        ...user,
        email: user.email ? normalizeEmail(user.email) : user.email,
    };

    if (!user.id || !user.emailVerified) return originalUpdateUser(normalizedUser);

    return prisma.$transaction(async (transaction) => {
        const previous = await transaction.user.findUnique({
            where: { id: user.id },
            select: { emailVerified: true },
        });
        const { id, ...data } = normalizedUser;
        if (previous && !previous.emailVerified) {
            // A magic link proves inbox ownership; drop any password set before the address was
            // verified so a pre-registered (possibly attacker-chosen) password cannot be used.
            data.passwordHash = null;
            data.password = null;
            data.emailVerificationTokenHash = null;
            data.emailVerificationTokenExpires = null;
            data.emailVerificationPasswordDigest = null;
        }
        return transaction.user.update({ where: { id }, data });
    });
};

export const authCallbacks = {
    async jwt({ token, user, trigger }) {
        if (user?.id) token.id = user.id;

        const now = Date.now();
        const needsRefresh = token.id && (
            user ||
            trigger === "update" ||
            !Number.isFinite(token.subscriptionCheckedAt) ||
            now - token.subscriptionCheckedAt >= 5 * 60 * 1000
        );

        // Pro state always comes from the database; client-supplied `session` data on update is ignored.
        if (needsRefresh) {
            try {
                const currentUser = await prisma.user.findUnique({
                    where: { id: token.id },
                    select: { subscriptionStatus: true, currentPeriodEnd: true },
                });
                if (!currentUser) return null;
                token.subscriptionStatus = currentUser?.subscriptionStatus ?? null;
                token.currentPeriodEnd = currentUser?.currentPeriodEnd?.toISOString() ?? null;
                token.isPro = isProStatus(currentUser?.subscriptionStatus);
            } catch {
                // Keep the last known state if the database is briefly unavailable.
                token.isPro = Boolean(token.isPro);
            }
            token.subscriptionCheckedAt = now;
        }

        return token;
    },
    async session({ session, token }) {
        if (token && session.user) {
            session.user.id = token.id;
            session.user.isPro = Boolean(token.isPro);
            session.user.subscriptionStatus = token.subscriptionStatus ?? null;
            session.user.currentPeriodEnd = token.currentPeriodEnd ?? null;
        }
        return session;
    },
};

// Compared against when no usable password hash exists, so every rejected sign-in costs one
// bcrypt comparison and response time does not reveal whether an account exists or is verified.
const DUMMY_PASSWORD_HASH = "$2b$10$CFQ8W3JJN2v6TZXERzjM1O3g/RvuvylIe5v/MpKNgUTtd2MYG5xX2";
const CREDENTIALS_WINDOW_MS = 15 * 60 * 1000;
const CREDENTIALS_IP_LIMIT = 10;
const CREDENTIALS_EMAIL_FAILURE_LIMIT = 10;

/**
 * Credentials sign-in.
 *
 * Rate limits: the per-IP limit is primary and counts every attempt. The per-email limit only
 * counts failed attempts and is checked without consuming, so the account owner signing in
 * successfully never uses it up. Tradeoff: someone who knows an address can still lock its
 * password sign-in for one window by failing ten times from several IPs; that is accepted to stop
 * distributed guessing against one account, and the email magic link keeps working meanwhile.
 */
export async function authorizeCredentials(credentials, request) {
    try {
        const email = normalizeEmail(credentials?.email);
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!isValidEmail(email) || !password) return null;

        const ip = getClientIp(request?.headers ?? new Headers());
        const failureKey = `auth:credentials-email-failures:${email}`;
        const failureOptions = { limit: CREDENTIALS_EMAIL_FAILURE_LIMIT, windowMs: CREDENTIALS_WINDOW_MS };

        const ipLimit = await rateLimit(`auth:credentials:${ip}`, {
            limit: CREDENTIALS_IP_LIMIT,
            windowMs: CREDENTIALS_WINDOW_MS,
        });
        if (!ipLimit.success) return null;

        const emailLimit = await rateLimit(failureKey, { ...failureOptions, consume: false });
        if (!emailLimit.success) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        const usableHash = user?.passwordHash && user.emailVerified ? user.passwordHash : null;
        const passwordValid = await bcrypt.compare(password, usableHash ?? DUMMY_PASSWORD_HASH);

        if (!usableHash || !passwordValid) {
            await rateLimit(failureKey, failureOptions);
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
        };
    } catch {
        return null;
    }
}

const { handlers, auth, signIn, signOut } = NextAuth({
    adapter,
    providers: [
        Resend({
            apiKey: process.env.AUTH_RESEND_KEY,
            from: process.env.EMAIL_FROM || process.env.AUTH_EMAIL_FROM || "onboarding@resend.dev",
            normalizeIdentifier(identifier) {
                const email = normalizeEmail(identifier);
                if (!isValidEmail(email) || (email.match(/@/g) || []).length !== 1) {
                    throw new Error("Invalid email address");
                }
                return email;
            },
        }),
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: authorizeCredentials,
        }),
    ],
    session: { strategy: "jwt" },
    callbacks: authCallbacks,
    pages: { signIn: "/login" },
});

export { handlers, auth, signIn, signOut };
