import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPolar, getSiteOrigin } from "@/lib/polar";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/validation";
import { NextResponse } from "next/server";

/**
 * Finds the Polar customer for an account created before Polar ids were stored (legacy Pro),
 * matching on the account's email, and saves its id. Returns null when Polar has no such customer.
 */
async function findLegacyCustomerId(polar, user) {
    const email = normalizeEmail(user.email);
    if (!email) return null;

    const result = await polar.customers.list({ email, limit: 10 });
    const customer = (result?.items ?? []).find((item) => normalizeEmail(item?.email) === email);
    if (!customer?.id) return null;

    await prisma.user.update({ where: { id: user.id }, data: { polarCustomerId: customer.id } });
    return customer.id;
}

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
            select: { id: true, email: true, polarCustomerId: true, polarSubscriptionId: true },
        });
        if (!user) {
            return NextResponse.json({ error: "No Polar subscription was found for this account." }, { status: 404 });
        }

        const polar = getPolar();
        let customerId = user.polarCustomerId;
        if (!customerId) {
            try {
                customerId = await findLegacyCustomerId(polar, user);
            } catch (error) {
                if (error?.code !== "P2002") throw error;
                // That Polar customer already belongs to another account here; do not open it.
                console.error("[polar] Legacy customer lookup matched a customer linked to another user", user.id);
                return NextResponse.json({ error: "No Polar subscription was found for this account." }, { status: 404 });
            }
        }
        if (!customerId && !user.polarSubscriptionId) {
            return NextResponse.json({ error: "No Polar subscription was found for this account." }, { status: 404 });
        }

        const returnUrl = `${getSiteOrigin(request)}/profile`;
        const customerSession = await polar.customerSessions.create(
            customerId
                ? { customer_id: customerId, return_url: returnUrl }
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
