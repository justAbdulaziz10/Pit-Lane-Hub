import { prisma } from "@/lib/prisma";
import { webhooks } from "@polar-sh/sdk/2026-10";
import { NextResponse } from "next/server";

const SUBSCRIPTION_EVENTS = new Set([
    "subscription.created",
    "subscription.active",
    "subscription.updated",
    "subscription.canceled",
    "subscription.revoked",
]);

/** Maps a verified Polar subscription payload onto the User columns we store. */
export function subscriptionUpdateFromEvent(event) {
    const subscription = event.data;
    // `subscription.status` is authoritative: a "canceled" event for cancel-at-period-end
    // keeps status "active" until the period ends, and "revoked" arrives with status "canceled".
    const fallbackStatus = event.type === "subscription.revoked" ? "canceled" : null;
    const data = { subscriptionStatus: subscription.status || fallbackStatus };

    if (subscription.customer_id) data.polarCustomerId = subscription.customer_id;
    if (subscription.id) data.polarSubscriptionId = subscription.id;
    if (Object.hasOwn(subscription, "current_period_end")) {
        data.currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
    }

    const metadataUserId = typeof subscription.metadata?.userId === "string" ? subscription.metadata.userId : null;
    const userId = subscription.customer?.external_id || metadataUserId;
    return { userId, customerId: subscription.customer_id || null, data };
}

export async function POST(req) {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    // Fail closed: never process unverified payment events.
    if (!webhookSecret) {
        return new NextResponse("Webhook secret not configured", { status: 500 });
    }

    const body = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    let event;
    try {
        event = await webhooks.validateEvent(body, headers, webhookSecret);
    } catch (err) {
        if (err instanceof webhooks.PolarWebhookVerificationError) {
            return new NextResponse("Invalid signature", { status: 403 });
        }
        if (err instanceof webhooks.PolarWebhookUnknownTypeError) {
            // Signed but not an event type this API version models; acknowledge so Polar stops retrying.
            return new NextResponse("Ignored", { status: 202 });
        }
        return new NextResponse("Invalid body", { status: 400 });
    }

    if (!SUBSCRIPTION_EVENTS.has(event.type)) {
        return new NextResponse("Ignored", { status: 202 });
    }

    try {
        const { userId, customerId, data } = subscriptionUpdateFromEvent(event);
        let result = { count: 0 };

        if (userId) {
            result = await prisma.user.updateMany({ where: { id: userId }, data });
        }
        if (result.count === 0 && customerId) {
            result = await prisma.user.updateMany({ where: { polarCustomerId: customerId }, data });
        }

        return new NextResponse(result.count > 0 ? "Webhook received" : "No matching user", { status: 200 });
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
