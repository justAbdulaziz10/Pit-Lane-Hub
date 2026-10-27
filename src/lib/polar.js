import { createPolar } from "@polar-sh/sdk/2026-10";

const POLAR_SERVERS = new Set(["production", "sandbox"]);

let client;
let warnedSandboxInProduction = false;

export function isPolarConfigured() {
    return Boolean(process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_PRODUCT_ID);
}

/**
 * Polar API environment from POLAR_SERVER (or the older POLAR_ENV name), default "production".
 * Throws on an unknown value or when both names are set to different values, so checkout and the
 * portal refuse to run against the wrong Polar environment instead of guessing.
 */
export function getPolarServer() {
    const server = process.env.POLAR_SERVER?.trim().toLowerCase() || undefined;
    const legacy = process.env.POLAR_ENV?.trim().toLowerCase() || undefined;

    if (server && legacy && server !== legacy) {
        throw new Error(`POLAR_SERVER="${server}" conflicts with POLAR_ENV="${legacy}"; remove POLAR_ENV`);
    }
    const resolved = server ?? legacy ?? "production";
    if (!POLAR_SERVERS.has(resolved)) {
        throw new Error(`POLAR_SERVER must be "production" or "sandbox", got "${resolved}"`);
    }

    // Polar access tokens carry no environment marker, so a sandbox/production token mismatch
    // cannot be detected locally (Polar answers 401). Flag the likeliest misconfiguration instead.
    if (resolved === "sandbox" && process.env.VERCEL_ENV === "production" && !warnedSandboxInProduction) {
        warnedSandboxInProduction = true;
        console.warn("[polar] POLAR_SERVER is \"sandbox\" on the production deployment; payments are not live.");
    }
    return resolved;
}

/** Lazily creates the Polar client so builds without Polar env vars still succeed. */
export function getPolar() {
    if (!process.env.POLAR_ACCESS_TOKEN) throw new Error("POLAR_ACCESS_TOKEN is not configured");
    const environment = getPolarServer();
    client ??= createPolar({
        accessToken: process.env.POLAR_ACCESS_TOKEN,
        environment,
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
