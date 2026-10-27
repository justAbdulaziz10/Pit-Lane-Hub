import { createPolar } from "@polar-sh/sdk/2026-10";

let client;

export function isPolarConfigured() {
    return Boolean(process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_PRODUCT_ID);
}

/** Lazily creates the Polar client so builds without Polar env vars still succeed. */
export function getPolar() {
    if (!process.env.POLAR_ACCESS_TOKEN) throw new Error("POLAR_ACCESS_TOKEN is not configured");
    client ??= createPolar({
        accessToken: process.env.POLAR_ACCESS_TOKEN,
        environment: process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production",
    });
    return client;
}

/** Public origin for redirect URLs: NEXT_PUBLIC_SITE_URL when set, else the request origin. */
export function getSiteOrigin(request) {
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    if (configured) {
        try {
            return new URL(configured).origin;
        } catch {
            // Fall back to the request origin when the configured URL is malformed.
        }
    }
    return new URL(request.url).origin;
}
