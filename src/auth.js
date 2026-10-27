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
            data.emailVerificationTokenHash = null;
            data.emailVerificationTokenExpires = null;
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

const { handlers, auth, signIn, signOut } = NextAuth({
    adapter,
    providers: [
        Resend({
            apiKey: process.env.AUTH_RESEND_KEY,
            from: process.env.EMAIL_FROM || "onboarding@resend.dev",
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
            authorize: async (credentials, request) => {
                try {
                    const email = normalizeEmail(credentials?.email);
                    if (!isValidEmail(email) || !credentials?.password) return null;

                    const ip = getClientIp(request?.headers ?? new Headers());
                    const limitOptions = { limit: 10, windowMs: 15 * 60 * 1000 };
                    const [ipLimit, emailLimit] = await Promise.all([
                        rateLimit(`auth:credentials:${ip}`, limitOptions),
                        rateLimit(`auth:credentials-email:${email}`, limitOptions),
                    ]);
                    if (!ipLimit.success || !emailLimit.success) return null;

                    const user = await prisma.user.findUnique({ where: { email } });
                    if (!user?.passwordHash || !user.emailVerified) return null;

                    const passwordValid = await bcrypt.compare(credentials.password, user.passwordHash);
                    if (!passwordValid) return null;

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        image: user.image,
                    };
                } catch {
                    return null;
                }
            },
        }),
    ],
    session: { strategy: "jwt" },
    callbacks: authCallbacks,
    pages: { signIn: "/login" },
});

export { handlers, auth, signIn, signOut };
