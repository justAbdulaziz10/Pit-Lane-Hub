import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPolar, getSiteOrigin, isPolarConfigured } from "@/lib/polar";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isProStatus } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function POST(req) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isPolarConfigured()) {
        return NextResponse.json(
            { error: "Checkout is temporarily unavailable because payments are not configured." },
            { status: 503 },
        );
    }

    try {
        const limit = await rateLimit(`polar:checkout:${session.user.id}:${getClientIp(req.headers)}`, {
            limit: 5,
            windowMs: 15 * 60 * 1000,
        });
        if (!limit.success) {
            return NextResponse.json({ error: "Too many checkout attempts. Try again later." }, { status: 429 });
        }

        // The session's Pro flag can be minutes old; the database is authoritative.
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true, subscriptionStatus: true },
        });
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (isProStatus(user.subscriptionStatus)) {
            return NextResponse.json(
                {
                    error: "You already have an active Pit Lane Pro subscription.",
                    portalUrl: "/api/polar/portal",
                },
                { status: 409 },
            );
        }

        const siteOrigin = getSiteOrigin(req);
        const checkout = await getPolar().checkouts.create({
            products: [process.env.POLAR_PRODUCT_ID],
            success_url: `${siteOrigin}/support?success=true`,
            return_url: `${siteOrigin}/support?canceled=true`,
            customer_email: user.email || null,
            external_customer_id: session.user.id,
            metadata: { userId: session.user.id },
        });

        return NextResponse.json({ url: checkout.url });
    } catch {
        return NextResponse.json({ error: "Unable to start checkout right now." }, { status: 503 });
    }
}
