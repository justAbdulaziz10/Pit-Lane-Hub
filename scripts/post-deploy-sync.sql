-- Run right after the deployment that reads "passwordHash" goes live, and again a few minutes
-- later to catch requests the previous deployment was still finishing:
--   psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f scripts/post-deploy-sync.sql
-- Between `prisma migrate deploy` and go-live the previous deployment kept writing only the
-- legacy columns. This carries those writes across. Safe to re-run at any time.
BEGIN;

-- Sign-ups by the previous deployment: carry the password over while the address is unverified.
-- The current deployment never writes "password", so only legacy rows match.
UPDATE "User"
SET "passwordHash" = "password"
WHERE "passwordHash" IS NULL
  AND "password" IS NOT NULL
  AND "emailVerified" IS NULL;

-- The previous deployment verified addresses by magic link without dropping a password set
-- before verification. The current deployment clears "password" on every verification path, so a
-- verified row that still has it was verified the old way: drop the pre-set password.
UPDATE "User"
SET "passwordHash" = NULL, "password" = NULL
WHERE "emailVerified" IS NOT NULL
  AND "password" IS NOT NULL;

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

-- Addresses that still collide ignoring case. Merge each by hand with the rules of the
-- "Merge accounts" block in prisma/migrations/20261027120000_polar_auth_security/migration.sql
-- (keep the verified row, then the oldest; never carry a password over). No rows means none.
SELECT lower(btrim("email")) AS "normalizedEmail", array_agg("id" ORDER BY "createdAt") AS "ids"
FROM "User"
WHERE "email" IS NOT NULL
GROUP BY lower(btrim("email"))
HAVING count(*) > 1;
