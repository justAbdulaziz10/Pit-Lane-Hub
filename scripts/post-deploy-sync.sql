-- Run once, right after the deployment that reads "passwordHash" goes live:
--   psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 \
--     -v migrated_at='<finished_at of 20261027120000_polar_auth_security>' \
--     -v deployed_at='<time the new deployment went live>' \
--     -f scripts/post-deploy-sync.sql
-- Between the two times the previous deployment kept writing only the legacy columns. This
-- carries those writes across. Safe to re-run.
BEGIN;

-- Sign-ups by the previous deployment: carry the password over while the address is unverified.
UPDATE "User"
SET "passwordHash" = "password"
WHERE "passwordHash" IS NULL
  AND "password" IS NOT NULL
  AND "emailVerified" IS NULL
  AND "createdAt" >= :'migrated_at'::timestamptz;

-- The previous deployment verified addresses by magic link without dropping a password set
-- before verification. Drop it now, as the current deployment does on that path.
UPDATE "User"
SET "passwordHash" = NULL, "password" = NULL
WHERE "emailVerified" >= :'migrated_at'::timestamptz
  AND "emailVerified" < :'deployed_at'::timestamptz
  AND ("passwordHash" IS NOT NULL OR "password" IS NOT NULL);

-- Emails written by the previous deployment were not normalized.
UPDATE "User" AS u
SET "email" = lower(btrim(u."email"))
WHERE u."email" <> lower(btrim(u."email"))
  AND NOT EXISTS (
      SELECT 1 FROM "User" AS o
      WHERE o."id" <> u."id" AND lower(btrim(o."email")) = lower(btrim(u."email"))
  );

-- Pro granted through the legacy flag.
UPDATE "User"
SET "subscriptionStatus" = 'active'
WHERE "isPro" = true AND "subscriptionStatus" IS NULL;

COMMIT;

-- Addresses that still collide ignoring case; merge these by hand. No rows means none.
SELECT lower(btrim("email")) AS "normalizedEmail", array_agg("id" ORDER BY "createdAt") AS "ids"
FROM "User"
WHERE "email" IS NOT NULL
GROUP BY lower(btrim("email"))
HAVING count(*) > 1;
