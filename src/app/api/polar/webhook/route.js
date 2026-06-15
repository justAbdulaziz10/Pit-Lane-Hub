import { prisma } from "@/lib/prisma";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks.js";
import { NextResponse } from "next/server";

export async function POST(req) {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    // Fail closed: never process unverified payment events.
    if (!webhookSecret) {
        console.error("POLAR_WEBHOOK_SECRET is not set. Rejecting webhook.");
        return new NextResponse("Webhook secret not configured", { status: 500 });
    }

    const body = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    let event;
    try {
        // Verifies the Polar (standard-webhooks) signature and parses the payload.
        event = validateEvent(body, headers, webhookSecret);
    } catch (err) {
        if (err instanceof WebhookVerificationError) {
            return new NextResponse("Invalid signature", { status: 403 });
        }
        return new NextResponse("Invalid body", { status: 400 });
    }

    try {
        if (event.type.startsWith("subscription.")) {
            const subscription = event.data;
            const userId = subscription.metadata?.userId;

            if (userId) {
                // active subscription → Pro; anything else (canceled, revoked,
                // expired, past_due) → not Pro.
                const isActive =
                    event.type === "subscription.active" ||
                    subscription.status === "active";

                await prisma.user.update({
                    where: { id: userId },
                    data: { isPro: isActive },
                });
            }
        }

        return new NextResponse("Webhook received", { status: 200 });
    } catch (error) {
        console.error("Polar Webhook Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
