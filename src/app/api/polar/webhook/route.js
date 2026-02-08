import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req) {
    const signature = req.headers.get("polar-webhook-signature");
    const body = await req.text();

    if (!signature) {
        return new NextResponse("Missing signature", { status: 400 });
    }

    // Verify the webhook signature
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.warn("POLAR_WEBHOOK_SECRET is not set. Skipping signature verification.");
    }

    // Documentation: https://docs.polar.sh/api-reference/webhooks
    // TODO: Use SDK or standard HMAC to verify `signature` using `webhookSecret`.

    let event;
    try {
        event = JSON.parse(body);
    } catch (err) {
        return new NextResponse("Invalid body", { status: 400 });
    }

    try {
        if (event.type === "subscription.created" || event.type === "subscription.updated") {
            const subscription = event.data;
            const userId = subscription.metadata?.userId;

            if (userId && subscription.status === "active") {
                await prisma.user.update({
                    where: { id: userId },
                    data: { isPro: true },
                });
            } else if (userId && (subscription.status === "canceled" || subscription.status === "incomplete_expired")) {
                await prisma.user.update({
                    where: { id: userId },
                    data: { isPro: false },
                });
            }
        }

        return new NextResponse("Webhook received", { status: 200 });
    } catch (error) {
        console.error("Polar Webhook Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
