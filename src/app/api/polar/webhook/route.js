import { prisma } from "@/lib/prisma";
import { isProStatus } from "@/lib/validation";
import { webhooks } from "@polar-sh/sdk/2026-10";
import { NextResponse } from "next/server";

const SUBSCRIPTION_EVENTS = new Set([
    "subscription.created",
    "subscription.active",
    "subscription.updated",
    "subscription.canceled",
    "subscription.revoked",
]);

const PRO_STATUSES = ["active", "trialing"];

function toDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
}

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

    // When the subscription reached this state: Polar's modified_at (null until the first change),
    // else created_at, else the delivery's own timestamp. Retries resend the same payload, so a
    // retried old event keeps its old time.
    const updatedAt = toDate(subscription.modified_at) ?? toDate(subscription.created_at) ?? toDate(event.timestamp);
    if (updatedAt) data.polarSubscriptionUpdatedAt = updatedAt;

    const metadataUserId = typeof subscription.metadata?.userId === "string" ? subscription.metadata.userId : null;
    const userId = subscription.customer?.external_id || metadataUserId;
    return {
        userId,
        customerId: subscription.customer_id || null,
        subscriptionId: subscription.id || null,
        updatedAt,
        data,
    };
}

/**
 * Conditions a user row must meet for this event to be applied, so deliveries may arrive in any
 * order or be retried without resurrecting an old state:
 * - the event must be newer than the state already stored (equal times are treated as duplicates);
 * - an event for a different subscription than the stored one may only take over if it is
 *   active/trialing, or the stored subscription is no longer active.
 */
export function orderingGuard({ subscriptionId, updatedAt, data }) {
    const newer = updatedAt
        ? { OR: [{ polarSubscriptionUpdatedAt: null }, { polarSubscriptionUpdatedAt: { lt: updatedAt } }] }
        : { polarSubscriptionUpdatedAt: null };
    // An active/trialing subscription may replace whatever is stored, as long as it is newer.
    if (!subscriptionId || isProStatus(data.subscriptionStatus)) return newer;

    return {
        AND: [
            newer,
            {
                OR: [
                    { polarSubscriptionId: null },
                    { polarSubscriptionId: subscriptionId },
                    // A different, inactive subscription must not end a Pro period granted by another one.
                    { subscriptionStatus: null },
                    { subscriptionStatus: { notIn: PRO_STATUSES } },
                ],
            },
        ],
    };
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

    const update = subscriptionUpdateFromEvent(event);
    const { userId, customerId, data } = update;
    const guard = orderingGuard(update);

    try {
        let result = { count: 0 };
        let matchedUser = false;

        if (userId) {
            result = await prisma.user.updateMany({ where: { AND: [{ id: userId }, guard] }, data });
            matchedUser = result.count > 0 || (await prisma.user.count({ where: { id: userId } })) > 0;
        }
        if (!matchedUser && customerId) {
            result = await prisma.user.updateMany({ where: { AND: [{ polarCustomerId: customerId }, guard] }, data });
        }

        // 200 either way: a stale or unmatched event must not be retried forever.
        return new NextResponse(result.count > 0 ? "Webhook received" : "Not applied (stale or no matching user)", {
            status: 200,
        });
    } catch (error) {
        if (error?.code === "P2002") {
            // The Polar customer/subscription id is already linked to a different user. Retrying
            // cannot fix that, so acknowledge and leave it for manual review.
            console.error("[polar] Webhook ids already belong to another user", {
                type: event.type,
                userId,
                customerId,
                subscriptionId: update.subscriptionId,
                target: error.meta?.target,
            });
            return new NextResponse("Conflict logged", { status: 200 });
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}
