-- Additive only: order-safe Polar webhooks and password-bound email verification tokens.
ALTER TABLE "User"
    ADD COLUMN "polarSubscriptionUpdatedAt" TIMESTAMP(3),
    ADD COLUMN "emailVerificationPasswordDigest" TEXT;

-- Shared fixed-window counters for auth rate limits when Upstash Redis is not configured.
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
