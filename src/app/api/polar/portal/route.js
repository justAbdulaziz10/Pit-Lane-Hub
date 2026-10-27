import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPolar, getSiteOrigin } from "@/lib/polar";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function GET(request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.redirect(new URL("/login?redirect=%2Fprofile", getSiteOrigin(request)));
    }

    if (!process.env.POLAR_ACCESS_TOKEN) {
        return NextResponse.json({ error: "Subscription management is temporarily unavailable." }, { status: 503 });
    }

    try {
        const limit = await rateLimit(`polar:portal:${session.user.id}:${getClientIp(request.headers)}`, {
            limit: 10,
            windowMs: 15 * 60 * 1000,
        });
        if (!limit.success) {
            return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { polarCustomerId: true, polarSubscriptionId: true },
        });
        if (!user?.polarCustomerId && !user?.polarSubscriptionId) {
            return NextResponse.json({ error: "No Polar subscription was found for this account." }, { status: 404 });
        }

        const returnUrl = `${getSiteOrigin(request)}/profile`;
        const customerSession = await getPolar().customerSessions.create(
            user.polarCustomerId
                ? { customer_id: user.polarCustomerId, return_url: returnUrl }
                : { external_customer_id: session.user.id, return_url: returnUrl },
        );

        if (!customerSession?.customer_portal_url) {
            return NextResponse.json({ error: "Subscription management is temporarily unavailable." }, { status: 503 });
        }
        return NextResponse.redirect(customerSession.customer_portal_url, 303);
    } catch {
        return NextResponse.json({ error: "Unable to open subscription management right now." }, { status: 503 });
    }
}
