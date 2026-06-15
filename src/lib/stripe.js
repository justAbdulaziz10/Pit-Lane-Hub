import Stripe from "stripe"

let client = null

function getClient() {
    if (client) return client

    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
        // Fail loudly at call time instead of silently falling back to a dummy
        // key that would never actually charge anyone.
        throw new Error("STRIPE_SECRET_KEY is not set")
    }

    client = new Stripe(secretKey, {
        apiVersion: "2023-10-16",
        typescript: false,
    })
    return client
}

// Lazy proxy: the real client (and the missing-key error) is only created when
// a property is actually accessed at request time, so the build never crashes.
export const stripe = new Proxy(
    {},
    {
        get(_target, prop) {
            const value = getClient()[prop]
            return typeof value === "function" ? value.bind(getClient()) : value
        },
    }
)
