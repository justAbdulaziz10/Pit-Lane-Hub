import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function GET(request) {
    const siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin;
    const verificationToken = new URL(request.url).searchParams.get("token");
    const loginUrl = new URL("/login?verification=invalid", siteOrigin);

    if (!verificationToken || !/^[a-f0-9]{64}$/i.test(verificationToken)) {
        return NextResponse.redirect(loginUrl);
    }

    try {
        const limit = await rateLimit(`auth:verify:${getClientIp(request.headers)}`, {
            limit: 20,
            windowMs: 15 * 60 * 1000,
        });
        if (!limit.success) {
            return NextResponse.json({ error: "Too many verification attempts." }, { status: 429 });
        }

        const tokenHash = createHash("sha256").update(verificationToken).digest("hex");
        const user = await prisma.user.findFirst({
            where: {
                emailVerificationTokenHash: tokenHash,
                emailVerificationTokenExpires: { gt: new Date() },
            },
            select: { id: true },
        });

        if (!user) return NextResponse.redirect(loginUrl);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: new Date(),
                emailVerificationTokenHash: null,
                emailVerificationTokenExpires: null,
            },
        });

        return NextResponse.redirect(new URL("/login?verified=true", siteOrigin));
    } catch {
        return NextResponse.redirect(loginUrl);
    }
}
