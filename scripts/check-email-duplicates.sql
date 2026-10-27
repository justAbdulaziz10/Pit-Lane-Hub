-- Read-only. Run before `prisma migrate deploy` applies 20261027120000_polar_auth_security:
--   psql "$POSTGRES_URL_NON_POOLING" -f scripts/check-email-duplicates.sql
-- Lists every address that exists more than once ignoring case/whitespace. The migration keeps
-- the row marked "keep" (verified first, then oldest, then smallest id), moves its Accounts and
-- Sessions to it, carries over Pro status, and deletes the others. No rows means nothing merges.
SELECT
    lower(btrim("email")) AS "normalizedEmail",
    "id",
    "email",
    "emailVerified",
    "createdAt",
    (SELECT count(*) FROM "Account" a WHERE a."userId" = u."id") AS "accounts",
    (SELECT count(*) FROM "Session" s WHERE s."userId" = u."id") AS "sessions",
    CASE
        WHEN row_number() OVER w = 1 THEN 'keep'
        ELSE 'merge into kept row'
    END AS "action"
FROM "User" AS u
WHERE "email" IS NOT NULL
  AND lower(btrim("email")) IN (
      SELECT lower(btrim("email"))
      FROM "User"
      WHERE "email" IS NOT NULL
      GROUP BY lower(btrim("email"))
      HAVING count(*) > 1
  )
WINDOW w AS (PARTITION BY lower(btrim("email")) ORDER BY ("emailVerified" IS NULL), "createdAt", "id")
ORDER BY "normalizedEmail", row_number() OVER w;
