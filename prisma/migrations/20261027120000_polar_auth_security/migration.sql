-- Runs as one transaction: any failure leaves the database exactly as it was.
-- Before deploying, run scripts/check-email-duplicates.sql (read-only) to see which accounts
-- the case-insensitive merge below will combine.
BEGIN;

-- Expand only: the legacy "password", "isPro" and "stripeCustomerId" columns stay, so the
-- previous deployment keeps working while this runs. scripts/post-deploy-sync.sql carries over
-- what it writes before the new deployment is live. A later migration drops them.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

UPDATE "User"
SET "passwordHash" = "password"
WHERE "password" IS NOT NULL;

-- Merge accounts whose emails differ only by case or surrounding whitespace, so lowercasing
-- cannot violate "User_email_key". Per address the kept row is, in order: the one with
-- "emailVerified" set, the oldest "createdAt", the smallest "id". Passwords are never copied from
-- a merged row (it may be an unverified, attacker-registered duplicate).
CREATE TEMP TABLE "_EmailMerge" ("duplicateId" TEXT PRIMARY KEY, "keepId" TEXT NOT NULL);

INSERT INTO "_EmailMerge" ("duplicateId", "keepId")
SELECT ranked."id", ranked."keepId"
FROM (
    SELECT
        "id",
        first_value("id") OVER (
            PARTITION BY lower(btrim("email"))
            ORDER BY ("emailVerified" IS NULL), "createdAt", "id"
        ) AS "keepId"
    FROM "User"
    WHERE "email" IS NOT NULL
) AS ranked
WHERE ranked."id" <> ranked."keepId";

UPDATE "User" AS kept
SET
    "isPro" = kept."isPro" OR merged."anyPro",
    "name" = COALESCE(kept."name", merged."name"),
    "image" = COALESCE(kept."image", merged."image")
FROM (
    SELECT
        m."keepId",
        bool_or(d."isPro") AS "anyPro",
        (array_agg(d."name" ORDER BY d."createdAt", d."id") FILTER (WHERE d."name" IS NOT NULL))[1] AS "name",
        (array_agg(d."image" ORDER BY d."createdAt", d."id") FILTER (WHERE d."image" IS NOT NULL))[1] AS "image"
    FROM "_EmailMerge" AS m
    JOIN "User" AS d ON d."id" = m."duplicateId"
    GROUP BY m."keepId"
) AS merged
WHERE kept."id" = merged."keepId";

UPDATE "Account" AS a
SET "userId" = m."keepId"
FROM "_EmailMerge" AS m
WHERE a."userId" = m."duplicateId";

UPDATE "Session" AS s
SET "userId" = m."keepId"
FROM "_EmailMerge" AS m
WHERE s."userId" = m."duplicateId";

DELETE FROM "User" AS u
USING "_EmailMerge" AS m
WHERE u."id" = m."duplicateId";

DROP TABLE "_EmailMerge";

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

CREATE UNIQUE INDEX "User_polarCustomerId_key" ON "User"("polarCustomerId");
CREATE UNIQUE INDEX "User_polarSubscriptionId_key" ON "User"("polarSubscriptionId");
CREATE UNIQUE INDEX "User_emailVerificationTokenHash_key" ON "User"("emailVerificationTokenHash");

COMMIT;
