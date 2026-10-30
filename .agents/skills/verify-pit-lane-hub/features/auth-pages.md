# Account and support pages (render only)

`/login` (h1 "Sign in"), `/signup` (h1 "Create account"), `/support` (h1 "Support Pit Lane Hub"), and `/profile` (redirects to `/login` when signed out). The header has a "Sign in" link. Source: `src/app/[lang]/{login,signup,support,profile}/page.js`, `src/app/api/`.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive auth-pages`.

- Open `/` and click the header link "Sign in". Result: the path is `/login` and the h1 "Sign in" is visible.
- Open `/signup`. Result: the h1 "Create account" is visible.
- Open `/support`. Result: the h1 "Support Pit Lane Hub" is visible.
- Open `/profile`. Result: the path becomes `/login`.

## Gotchas

- "Sign in" is both the header link and the login h1. The link check is scoped to `header` and the heading check uses `level: 1`.
- The drive waits up to 20 s for the `/profile` redirect to reach `/login`.
- Start the dev server with `AUTH_SECRET` set. Without it Auth.js logs `MissingSecret` and client session fetches fail.

## Not driven

Submitting any form needs Postgres (`POSTGRES_PRISMA_URL`), Resend, and Polar sandbox keys. The drive never clicks submit, donate, or subscribe.
