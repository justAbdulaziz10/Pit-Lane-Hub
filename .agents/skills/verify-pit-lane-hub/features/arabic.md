# Arabic (RTL) site

English has no URL prefix. Arabic lives under `/ar`. The header "العربية" link switches language. The document gets `dir="rtl"` and `lang="ar"`. Routing is in `src/proxy.js` and `src/lib/i18n/`. Pages live under `src/app/[lang]/`. Switcher: `src/components/LanguageSwitch.js`.

## How to get to it (user POV)

- Click "العربية" in the header, or open `/ar`.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline.

- Open `/` → `drive arabic`. Click the header link "العربية". Result: the path is `/ar`.
- Result: `html` has `dir="rtl"` and `lang="ar"`.
- Result: an h2 starting with "السباق القادم" (the "Next race" card) is visible.
- Result: `main` has no `a[href^="/driver/"]` link. Internal links stay under `/ar`.

## Gotchas

- Scope the click to `header`. The link text is Arabic, so match it exactly.
- The locale proxy reads a cookie and the user agent. Each drive uses a fresh context, so there is no cookie. A reused browser with a locale cookie can redirect `/`.
- The no-`/driver/` check passes vacuously if the card links are missing. The visible h2 check guards the page itself.
