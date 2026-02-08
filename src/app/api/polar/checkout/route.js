import { auth } from "@/auth";
import { polar } from "@/lib/polar";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const successUrl = `${process.env.AUTH_URL}/support?success=true`;

        // Create a checkout session using the official SDK
        // Documentation: https://docs.polar.sh/api-reference/checkouts/custom/create
        const result = await polar.checkouts.custom.create({
            productId: process.env.POLAR_PRODUCT_ID,
            successUrl: successUrl,
            customerEmail: session.user.email,
            customerName: session.user.name,
            metadata: {
                userId: session.user.id,
            },
        });

        return NextResponse.json({ url: result.url });
    } catch (error) {
        console.error("Polar Checkout Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
