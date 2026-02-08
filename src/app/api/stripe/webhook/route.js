import { stripe } from "@/lib/stripe"
import { PrismaClient } from "@prisma/client"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function POST(req) {
    const body = await req.text()
    const signature = headers().get("Stripe-Signature")

    let event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        )
    } catch (err) {
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
    }

    const session = event.data.object

    if (event.type === "checkout.session.completed") {
        // Retrieve the subscription details
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription
        )

        if (!session?.metadata?.userId) {
            return new NextResponse("User ID missing in metadata", { status: 400 })
        }

        await prisma.user.update({
            where: {
                id: session.metadata.userId,
            },
            data: {
                stripeCustomerId: session.customer,
                isPro: true,
            },
        })
    }

    if (event.type === "customer.subscription.deleted") {
        // Handle cancellation
        const user = await prisma.user.findUnique({
            where: { stripeCustomerId: session.customer }
        })

        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { isPro: false }
            })
        }
    }

    return new NextResponse(null, { status: 200 })
}
