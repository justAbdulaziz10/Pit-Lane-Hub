import { Polar } from "@polar-sh/sdk";

const accessToken = process.env.POLAR_ACCESS_TOKEN;

// Prevent build crash if env var is missing (e.g. during Vercel build before vars are set)
if (!accessToken) {
    console.warn("POLAR_ACCESS_TOKEN is missing. Polar SDK functionality will be disabled.");
}

export const polar = new Polar({
    accessToken: accessToken || "dummy_token_for_build",
    server: process.env.POLAR_ENV === 'sandbox' ? 'sandbox' : 'production',
});
