# Account and support pages (render only)

`/login` ("Welcome Back": magic link plus password), `/signup` ("Create Account"), `/support` ("Support Pit Lane Hub": coffee donation and Pit Lane Pro via Polar), and `/profile` ("My Garage", which redirects to `/login` when signed out). Source: `src/app/{login,signup,support,profile}/page.js`, `src/app/api/`.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive auth-pages`. The header "Log In" goes to `/login`, the three headings render, and signed-out `/profile` lands on `/login`.

## Not driven

Submitting any form needs Postgres (`POSTGRES_PRISMA_URL`), `AUTH_SECRET`, Resend, and Polar sandbox keys. The drive never clicks submit, donate, or subscribe.
