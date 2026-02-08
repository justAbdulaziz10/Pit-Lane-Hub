import { auth } from "@/auth"
import { stripe } from "@/lib/stripe"
import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function POST(req) {
    try {
        const session = await auth()

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const priceId = process.env.STRIPE_PRICE_ID
        if (!priceId) {
            return new NextResponse("Stripe Price ID missing", { status: 500 })
        }

        // Check if user already has a stripeCustomerId
        let user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        // If no stripeCustomerId, create one
        if (!user.stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
            })

            user = await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: customer.id }
            })
        }

        const checkoutSession = await stripe.checkout.sessions.create({
            customer: user.stripeCustomerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            success_url: `${process.env.AUTH_URL}/support?success=true`,
            cancel_url: `${process.env.AUTH_URL}/support?canceled=true`,
            metadata: {
                userId: user.id,
            },
        })

        return NextResponse.json({ url: checkoutSession.url })
    } catch (error) {
        console.error("Stripe Checkout Error:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
