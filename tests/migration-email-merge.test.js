import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const MIGRATIONS = new URL('../prisma/migrations/', import.meta.url);
const INIT = new URL('20260208135020_init/migration.sql', MIGRATIONS);
const POLAR_AUTH = new URL('20261027120000_polar_auth_security/migration.sql', MIGRATIONS);
const ADDITIVE = new URL('20261027130000_webhook_order_verification_binding/migration.sql', MIGRATIONS);

describe('20261027120000_polar_auth_security migration (static)', () => {
    const sql = readFileSync(POLAR_AUTH, 'utf8');

    it('only expands the schema, so the previous deployment keeps working during the rollout', () => {
        expect(sql).not.toMatch(/DROP COLUMN|RENAME COLUMN/);
        expect(sql).toMatch(/SET "passwordHash" = "password"/);
    });

    it('merges case-insensitive duplicate emails before lowercasing them, inside one transaction', () => {
        const begin = sql.indexOf('BEGIN;');
        const merge = sql.indexOf('DELETE FROM "User"');
        const lowercase = sql.indexOf('SET "email" = lower(btrim("email"))');
        const commit = sql.lastIndexOf('COMMIT;');

        expect(begin).toBeGreaterThanOrEqual(0);
        expect(merge).toBeGreaterThan(begin);
        expect(lowercase).toBeGreaterThan(merge);
        expect(commit).toBeGreaterThan(lowercase);
        expect(sql).toMatch(/UPDATE "Account"[\s\S]*SET "userId"/);
        expect(sql).toMatch(/UPDATE "Session"[\s\S]*SET "userId"/);
        expect(sql).toMatch(/ORDER BY \("emailVerified" IS NULL\), "createdAt", "id"/);
    });
});

// Runs against a real, disposable Postgres database when MIGRATION_TEST_DATABASE_URL is set,
// e.g. postgresql://postgres@localhost:55432/plh_migration_test. The database is reset first.
const databaseUrl = process.env.MIGRATION_TEST_DATABASE_URL;
const PSQL = process.env.PSQL_BIN || 'psql';

function psql(sql) {
    return execFileSync(PSQL, [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-qAt', '-F', '|', '-c', sql], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
}

function psqlFile(url) {
    execFileSync(PSQL, [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-q', '-f', url.pathname], {
        stdio: ['ignore', 'pipe', 'pipe'],
    });
}

describe.skipIf(!databaseUrl)('20261027120000_polar_auth_security migration (Postgres)', () => {
    it('merges seeded case-duplicate users deterministically and keeps their sign-ins', () => {
        psql('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        psqlFile(INIT);
        psql(`
            INSERT INTO "User" ("id", "email", "emailVerified", "password", "isPro", "name", "createdAt", "updatedAt") VALUES
              ('u_old_unverified', 'Racer@Example.com',   NULL,                  'hash-attacker', false, NULL,    '2024-01-01', now()),
              ('u_verified',       'racer@example.com',   '2024-03-01',          'hash-owner',    false, NULL,    '2024-02-01', now()),
              ('u_pro_dup',        ' RACER@example.COM ', NULL,                  NULL,            true,  'Racer', '2024-04-01', now()),
              ('u_a_old',          'Pilot@Example.com',   NULL,                  'hash-a',        false, NULL,    '2024-01-01', now()),
              ('u_a_new',          'pilot@example.com',   NULL,                  'hash-b',        false, NULL,    '2024-05-01', now()),
              ('u_single',         'Solo@Example.com',    NULL,                  NULL,            false, NULL,    '2024-01-01', now());
            INSERT INTO "Account" ("id", "userId", "type", "provider", "providerAccountId") VALUES
              ('acc_1', 'u_old_unverified', 'email', 'resend', 'racer-1'),
              ('acc_2', 'u_pro_dup',        'email', 'resend', 'racer-2'),
              ('acc_3', 'u_a_new',          'email', 'resend', 'pilot-1');
            INSERT INTO "Session" ("id", "sessionToken", "userId", "expires") VALUES
              ('ses_1', 'token-1', 'u_pro_dup', now() + interval '1 day');
        `);

        expect(() => psqlFile(POLAR_AUTH)).not.toThrow();
        psqlFile(ADDITIVE);

        expect(psql('SELECT "id", "email", "passwordHash", "subscriptionStatus", "name" FROM "User" ORDER BY "id"').split('\n')).toEqual([
            'u_a_old|pilot@example.com|hash-a||',
            'u_single|solo@example.com|||',
            'u_verified|racer@example.com|hash-owner|active|Racer',
        ]);
        expect(psql('SELECT "id", "userId" FROM "Account" ORDER BY "id"').split('\n')).toEqual([
            'acc_1|u_verified',
            'acc_2|u_verified',
            'acc_3|u_a_old',
        ]);
        expect(psql('SELECT "userId" FROM "Session"')).toBe('u_verified');
        // The previous deployment's columns still exist, so it keeps working until it is replaced.
        expect(psql(`INSERT INTO "User" ("id", "email", "password", "isPro", "updatedAt")
                     VALUES ('u_old_code', 'old@example.com', 'hash-old', false, now()) RETURNING "id"`)).toBe('u_old_code');
    });

    it('leaves the database untouched when a statement fails', () => {
        psql('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        psqlFile(INIT);
        // A pre-existing column with the name the migration adds makes it fail half-way.
        psql(`ALTER TABLE "User" ADD COLUMN "polarCustomerId" TEXT;
              INSERT INTO "User" ("id", "email", "createdAt", "updatedAt") VALUES
                ('a', 'Dup@Example.com', '2024-01-01', now()), ('b', 'dup@example.com', '2024-02-01', now());`);

        expect(() => psqlFile(POLAR_AUTH)).toThrow();

        expect(psql('SELECT "id", "email" FROM "User" ORDER BY "id"').split('\n')).toEqual([
            'a|Dup@Example.com',
            'b|dup@example.com',
        ]);
        expect(psql(`SELECT count(*) FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'password'`)).toBe('1');
    });
});
