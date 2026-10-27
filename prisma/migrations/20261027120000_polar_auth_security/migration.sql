-- Rename the existing credential hash column and retain existing Pro status.
ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";

-- Normalize existing adapter identifiers to match the canonical auth format.
UPDATE "User"
SET "email" = lower(btrim("email"))
WHERE "email" IS NOT NULL;

UPDATE "VerificationToken"
SET "identifier" = lower(btrim("identifier"));

ALTER TABLE "User"
    ADD COLUMN "polarCustomerId" TEXT,
    ADD COLUMN "polarSubscriptionId" TEXT,
    ADD COLUMN "subscriptionStatus" TEXT,
    ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
    ADD COLUMN "emailVerificationTokenHash" TEXT,
    ADD COLUMN "emailVerificationTokenExpires" TIMESTAMP(3);

UPDATE "User"
SET "subscriptionStatus" = 'active'
WHERE "isPro" = true;

ALTER TABLE "User"
    DROP COLUMN "stripeCustomerId",
    DROP COLUMN "isPro";

CREATE UNIQUE INDEX "User_polarCustomerId_key" ON "User"("polarCustomerId");
CREATE UNIQUE INDEX "User_polarSubscriptionId_key" ON "User"("polarSubscriptionId");
CREATE UNIQUE INDEX "User_emailVerificationTokenHash_key" ON "User"("emailVerificationTokenHash");
