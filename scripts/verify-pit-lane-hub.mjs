#!/usr/bin/env node
// Control CLI for the verify-pit-lane-hub skill: launch the real Next.js app,
// drive it in Chromium the way a user does, and capture evidence.
// Every command prints one JSON object; failures set "ok": false and exit 1.

import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = path.join(ROOT, 'artifacts', 'verify');
const STATE = path.join(ART, 'state.json');
const DEFAULT_PORT = 3117;

const HELP = `Usage: scripts/verify-pit-lane-hub.mjs <command> [options]

Commands:
  launch [--port N]      Start "next dev" on N (default ${DEFAULT_PORT}) and wait for HTTP 200 on /
  doctor                 Read-only: our server PID alive, port owned by it, / answers 200
  drive <feature|all>    Drive a feature in headless Chromium, self-check, save evidence
  stop [--dry-run]       Stop only the server this tool launched (by process group)
  features               List drivable features

Features: ${'home, drivers-favorites, standings, live, not-found'}
Evidence: artifacts/verify/<feature>/<timestamp>/ (screenshot + result.json)`;

function out(obj, code = obj.ok ? 0 : 1) {
    process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
    process.exit(code);
}

function fail(command, reason, extra = {}) {
    out({ ok: false, command, reason, ...extra });
}

function readState() {
    try {
        return JSON.parse(fs.readFileSync(STATE, 'utf8'));
    } catch {
        return null;
    }
}

function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

function listeners(port) {
    try {
        return execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' })
            .split('\n').filter(Boolean).map(Number);
    } catch {
        return [];
    }
}

function pgidOf(pid) {
    try {
        return Number(execFileSync('ps', ['-o', 'pgid=', '-p', String(pid)], { encoding: 'utf8' }).trim());
    } catch {
        return null;
    }
}

async function httpStatus(url) {
    try {
        const res = await fetch(url, { redirect: 'manual' });
        return res.status;
    } catch {
        return 0;
    }
}

function arg(name, fallback) {
    const i = process.argv.indexOf(name);
    return i > -1 ? process.argv[i + 1] : fallback;
}

async function launch() {
    const existing = readState();
    if (existing && alive(existing.pid)) {
        return fail('launch', `already running (pid ${existing.pid}, port ${existing.port}); run "stop" first`);
    }
    const port = Number(arg('--port', DEFAULT_PORT));
    if (listeners(port).length) {
        return fail('launch', `port ${port} is in use by another process; pick --port N`);
    }
    fs.mkdirSync(ART, { recursive: true });
    const log = path.join(ART, 'server.log');
    const fd = fs.openSync(log, 'w');
    const child = spawn('npx', ['next', 'dev', '-p', String(port)], {
        cwd: ROOT,
        detached: true, // own process group so "stop" can kill exactly this tree
        stdio: ['ignore', fd, fd],
        env: { ...process.env, PORT: String(port) },
    });
    child.unref();
    fs.writeFileSync(STATE, JSON.stringify({ pid: child.pid, port, log, startedAt: new Date().toISOString() }));
    const base = `http://localhost:${port}`;
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
        if (!alive(child.pid)) return fail('launch', 'server exited during startup', { log });
        if ((await httpStatus(base + '/')) === 200) {
            return out({ ok: true, command: 'launch', pid: child.pid, port, baseURL: base, log });
        }
        await new Promise((r) => setTimeout(r, 1000));
    }
    return fail('launch', 'timed out waiting for HTTP 200 on / (180s)', { log });
}

async function doctor(quiet = false) {
    const s = readState();
    const checks = {};
    if (!s) return fail('doctor', 'no state file; run "launch" first');
    checks.pidAlive = alive(s.pid);
    const owners = listeners(s.port);
    checks.portOwnedByUs = owners.length > 0 && owners.every((p) => pgidOf(p) === s.pid);
    checks.homeStatus = await httpStatus(`http://localhost:${s.port}/`);
    const ok = checks.pidAlive && checks.portOwnedByUs && checks.homeStatus === 200;
    const result = { ok, command: 'doctor', pid: s.pid, port: s.port, listeners: owners, checks };
    if (!ok) result.reason = 'instance is not ours or not healthy; do not drive it';
    if (quiet) return result;
    return out(result);
}

// ---- drives -------------------------------------------------------------

class CheckError extends Error {}
function expectEq(steps, label, actual, expected) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    steps.push({ check: label, expected, actual, pass });
    if (!pass) throw new CheckError(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// Poll until the observed value matches (client components hydrate after SSR),
// then record the final observation; fail with the last value seen.
async function expectSoon(steps, label, read, expected, timeout = 8000) {
    const end = Date.now() + timeout;
    let actual;
    do {
        actual = await read();
        if (JSON.stringify(actual) === JSON.stringify(expected)) break;
        await new Promise((r) => setTimeout(r, 200));
    } while (Date.now() < end);
    expectEq(steps, label, actual, expected);
}

// Detail routes stream behind a loading.js boundary while live APIs answer;
// wait for the real content instead of checking the spinner.
const visibleSoon = (locator, timeout = 40_000) =>
    locator.waitFor({ state: 'visible', timeout }).then(() => true, () => false);

const DRIVES = {
    async home(page, steps, base) {
        const res = await page.goto(base + '/');
        expectEq(steps, 'HTTP 200', res.status(), 200);
        expectEq(steps, 'one page h1', await page.getByRole('heading', { level: 1 }).count(), 1);
        for (const name of ['Next race', 'Last race']) {
            expectEq(steps, `card "${name}" visible`, await page.getByRole('heading', { level: 2, name: new RegExp(`^${name}`) }).first().isVisible(), true);
        }
        expectEq(steps, 'drivers standings card visible',
            await page.getByRole('heading', { level: 2, name: /^\d{4} drivers$/ }).isVisible(), true);
        expectEq(steps, 'skip link attached', await page.getByRole('link', { name: /Skip to/ }).count() > 0, true);
        await page.locator('header').getByRole('link', { name: 'Standings', exact: true }).first().click();
        await page.waitForURL(/\/standings$/);
        expectEq(steps, 'nav "Standings" lands on /standings', new URL(page.url()).pathname, '/standings');
    },

    async 'drivers-favorites'(page, steps, base) {
        await page.goto(base + '/drivers');
        await page.evaluate(() => localStorage.removeItem('plh:favoriteDrivers'));
        await page.reload();
        const stars = page.locator('main button[aria-pressed][aria-label^="Favourite"]');
        // Favourites lead only the "By number" view; championship order is never reshuffled.
        const byNumber = async () => {
            await stars.first().waitFor();
            await expectSoon(steps, '"By number" view selected', async () => {
                const button = page.getByRole('button', { name: 'By number', exact: true });
                if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
                await page.waitForTimeout(250);
                return button.getAttribute('aria-pressed');
            }, 'true', 15000);
        };
        await byNumber();
        const count = await stars.count();
        steps.push({ info: 'favourite buttons', count });
        if (count < 2) throw new CheckError(`need >=2 drivers to prove reordering, got ${count} (live data unavailable?)`);
        const label = await stars.nth(count - 1).getAttribute('aria-label');
        const star = () => page.getByRole('button', { name: label, exact: true });
        const stored = async () => JSON.parse((await page.evaluate(() => localStorage.getItem('plh:favoriteDrivers'))) || '[]');
        // Retry the click until hydrated: a click before hydration is a no-op.
        await expectSoon(steps, 'star is pressed after click', async () => {
            if ((await star().getAttribute('aria-pressed')) !== 'true') await star().click();
            await page.waitForTimeout(250);
            return star().getAttribute('aria-pressed');
        }, 'true', 15000);
        expectEq(steps, 'URL unchanged (star does not follow card link)', new URL(page.url()).pathname, '/drivers');
        expectEq(steps, 'localStorage holds one favourite', (await stored()).length, 1);
        await page.reload();
        await byNumber();
        await expectSoon(steps, 'favourite pulled to front after reload', () => stars.first().getAttribute('aria-label'), label);
        await expectSoon(steps, 'star still pressed after reload', () => star().getAttribute('aria-pressed'), 'true');
        await star().click();
        await expectSoon(steps, 'unfavourite clears storage', stored, []);
        await expectSoon(steps, 'star released after unfavourite', () => star().getAttribute('aria-pressed'), 'false');
    },

    async standings(page, steps, base) {
        await page.goto(base + '/standings');
        expectEq(steps, 'h1 "<year> Standings" visible', await page.getByRole('heading', { level: 1, name: /^\d{4} Standings$/ }).isVisible(), true);
        expectEq(steps, 'standings table has driver links', await page.locator('main a[href^="/driver/"]').count() > 0, true);
        expectEq(steps, 'standings table has team links', await page.locator('main a[href^="/team/"]').count() > 0, true);
    },

    async live(page, steps, base) {
        const res = await page.goto(base + '/live');
        expectEq(steps, 'HTTP 200', res.status(), 200);
        expectEq(steps, 'h1 "Live timing" visible', await page.getByRole('heading', { level: 1, name: 'Live timing' }).isVisible(), true);
        // Without OpenF1 credentials or a session the page states why instead of showing empty panels.
        expectEq(steps, 'positions or an honest status shown',
            await visibleSoon(page.locator('main').getByRole('heading', { level: 2 }).or(page.locator('main table')).first(), 20_000), true);
    },

    async 'driver-detail'(page, steps, base) {
        await page.goto(base + '/drivers');
        const card = page.locator('main a[href^="/driver/"]').first();
        const href = await card.getAttribute('href');
        await card.click();
        await page.waitForURL((u) => u.pathname === href, { timeout: 40_000 });
        expectEq(steps, 'card click lands on driver page', new URL(page.url()).pathname, href);
        expectEq(steps, 'driver name h1 visible', await visibleSoon(page.getByRole('heading', { level: 1 }).first()), true);
        expectEq(steps, '"Career" section visible', await visibleSoon(page.getByRole('heading', { level: 2, name: 'Career' })), true);
        await page.goto(base + '/driver/44');
        expectEq(steps, 'legacy number URL redirects to driverId URL', new URL(page.url()).pathname, '/driver/hamilton');
        const missing = await page.goto(base + '/driver/999');
        expectEq(steps, 'unknown driver is HTTP 404', missing.status(), 404);
        expectEq(steps, 'unknown driver shows "Page not found"', await visibleSoon(page.getByRole('heading', { name: 'Page not found' })), true);
    },

    async 'teams-detail'(page, steps, base) {
        await page.goto(base + '/teams');
        expectEq(steps, 'h1 "<year> Teams" visible', await page.getByRole('heading', { level: 1, name: /^\d{4} Teams$/ }).isVisible(), true);
        const team = page.locator('main a[href^="/team/"]').first();
        await team.waitFor();
        const href = await team.getAttribute('href');
        await team.click();
        await page.waitForURL((u) => u.pathname === href, { timeout: 40_000 });
        expectEq(steps, 'team card lands on team page', new URL(page.url()).pathname, href);
        expectEq(steps, '"<year> drivers" section visible', await visibleSoon(page.getByRole('heading', { level: 2, name: /^\d{4} drivers$/ })), true);
        const driver = page.locator('main a[href^="/driver/"]').first();
        const dHref = await driver.getAttribute('href');
        await driver.click();
        await page.waitForURL((u) => u.pathname === dHref, { timeout: 40_000 });
        expectEq(steps, 'team driver link lands on driver page', new URL(page.url()).pathname, dHref);
        const missing = await page.goto(base + '/team/not-a-team');
        expectEq(steps, 'unknown team is HTTP 404', missing.status(), 404);
    },

    async 'calendar-race'(page, steps, base) {
        await page.goto(base + '/schedule');
        expectEq(steps, 'h1 "<year> F1 Calendar" visible', await visibleSoon(page.getByRole('heading', { level: 1, name: /F1 Calendar/ })), true);
        // The loading skeleton shares the h1, so wait for the streamed calendar itself.
        expectEq(steps, 'calendar subscribe link offered', await visibleSoon(page.locator('main a[href^="webcal://"]').first()), true);
        const race = page.locator('main a[href^="/race/"]').first();
        await race.waitFor();
        const href = await race.getAttribute('href');
        expectEq(steps, 'race link uses year-round key', /^\/race\/\d{4}-\d{1,2}$/.test(href), true);
        await race.click();
        await page.waitForURL((u) => u.pathname === href, { timeout: 40_000 });
        expectEq(steps, 'race card lands on race page', new URL(page.url()).pathname, href);
        expectEq(steps, 'race h1 visible', await visibleSoon(page.getByRole('heading', { level: 1 }).first()), true);
        expectEq(steps, '"Weekend schedule" section visible', await visibleSoon(page.getByRole('heading', { level: 2, name: 'Weekend schedule' })), true);
        const missing = await page.goto(base + '/race/1949-1');
        expectEq(steps, 'pre-1950 race key is HTTP 404', missing.status(), 404);
    },

    async compare(page, steps, base) {
        await page.goto(base + '/compare');
        expectEq(steps, 'h1 "Compare drivers" visible', await page.getByRole('heading', { level: 1, name: 'Compare drivers' }).isVisible(), true);
        const second = page.getByRole('combobox', { name: 'Search any driver since 1950' }).nth(1);
        const option = page.getByRole('option', { name: /Ayrton Senna/ }).first();
        // Retry until hydrated: typing before hydration is reverted by React.
        await expectSoon(steps, 'search lists Ayrton Senna', async () => {
            if (!(await option.isVisible())) {
                await second.fill('');
                await second.pressSequentially('Senna', { delay: 30 });
            }
            await page.waitForTimeout(500);
            return option.isVisible();
        }, true, 30000);
        await option.click();
        await expectSoon(steps, 'profile heading shows Ayrton Senna',
            () => page.getByRole('heading', { level: 2, name: 'Ayrton Senna' }).isVisible(), true, 30000);
    },

    async history(page, steps, base) {
        await page.goto(base + '/history');
        expectEq(steps, 'h1 "F1 History" visible', await page.getByRole('heading', { level: 1, name: 'F1 History' }).isVisible(), true);
        const select = page.locator('main select[name="year"]');
        await expectSoon(steps, 'picking 1988 opens that season', async () => {
            if (!new URL(page.url()).search.includes('year=1988')) await select.selectOption('1988');
            await page.waitForTimeout(500);
            return page.getByRole('heading', { level: 2, name: '1988 season' }).isVisible();
        }, true, 30000);
        await page.locator('main').getByRole('link', { name: 'Drivers', exact: true }).click();
        await expectSoon(steps, 'drivers view is current', () => page.locator('main a[aria-current="page"]').first().textContent().then((text) => text.trim()), 'Drivers', 30000);
        expectEq(steps, 'drivers view links drivers', await page.locator('main a[href^="/driver/"]').count() > 0, true);
    },

    async tracks(page, steps, base) {
        await page.goto(base + '/tracks');
        expectEq(steps, 'h1 "<year> circuits" visible', await page.getByRole('heading', { level: 1, name: /circuits$/ }).isVisible(), true);
        const circuit = page.locator('main a[href^="/tracks/"]').first();
        const href = await circuit.getAttribute('href');
        await circuit.click();
        await page.waitForURL((u) => u.pathname === href, { timeout: 40_000 });
        expectEq(steps, 'circuit card lands on circuit page', new URL(page.url()).pathname, href);
        expectEq(steps, 'circuit h1 visible', await visibleSoon(page.getByRole('heading', { level: 1 })), true);
        const tab = (name) => page.getByRole('tab', { name, exact: true }).first();
        expectEq(steps, '"Layout" tab selected by default', await visibleSoon(tab('Layout'), 20_000) && await tab('Layout').getAttribute('aria-selected'), 'true');
        expectEq(steps, 'layout outline drawn', await page.getByRole('tabpanel').getByRole('img').first().isVisible(), true);
        // Retry until hydrated: a click before hydration is a no-op.
        await expectSoon(steps, '"Map" tab selected after click', async () => {
            if ((await tab('Map').getAttribute('aria-selected')) !== 'true') await tab('Map').click();
            await page.waitForTimeout(250);
            return tab('Map').getAttribute('aria-selected');
        }, 'true', 15000);
    },

    async junior(page, steps, base) {
        // F2/F3 coverage was removed; old links must land somewhere useful, not 404.
        const res = await page.goto(base + '/junior');
        expectEq(steps, 'HTTP 200 after redirect', res.status(), 200);
        expectEq(steps, '/junior redirects to /standings', new URL(page.url()).pathname, '/standings');
    },

    async arabic(page, steps, base) {
        await page.goto(base + '/');
        await page.locator('header').getByRole('link', { name: 'العربية' }).first().click();
        await page.waitForURL(/\/ar$/);
        expectEq(steps, 'language switch lands on /ar', new URL(page.url()).pathname, '/ar');
        expectEq(steps, 'document is rtl', await page.locator('html').getAttribute('dir'), 'rtl');
        expectEq(steps, 'document lang is ar', await page.locator('html').getAttribute('lang'), 'ar');
        expectEq(steps, 'Arabic "Next race" card visible',
            await page.getByRole('heading', { level: 2, name: /^السباق القادم/ }).isVisible(), true);
        expectEq(steps, 'internal links stay in Arabic', await page.locator('main a[href^="/driver/"]').count(), 0);
    },

    // Render-only: submitting needs Postgres, Resend, and Polar (see SKILL.md Unproven).
    async 'auth-pages'(page, steps, base) {
        await page.goto(base + '/');
        await page.locator('header').getByRole('link', { name: 'Log in' }).first().click();
        await page.waitForURL(/\/login$/);
        expectEq(steps, 'header "Log in" lands on /login', new URL(page.url()).pathname, '/login');
        expectEq(steps, 'h1 "Sign in" visible', await page.getByRole('heading', { level: 1, name: 'Sign in' }).isVisible(), true);
        await page.goto(base + '/signup');
        expectEq(steps, 'h1 "Create account" visible', await page.getByRole('heading', { level: 1, name: 'Create account' }).isVisible(), true);
        await page.goto(base + '/support');
        expectEq(steps, 'h1 "Support Pit Lane Hub" visible', await page.getByRole('heading', { level: 1, name: 'Support Pit Lane Hub' }).isVisible(), true);
        await page.goto(base + '/profile');
        await page.waitForURL(/\/login(\?|$)/, { timeout: 20_000 }).catch(() => {});
        expectEq(steps, 'signed-out /profile redirects to /login', new URL(page.url()).pathname, '/login');
    },

    async 'not-found'(page, steps, base) {
        const res = await page.goto(base + '/this-route-does-not-exist');
        expectEq(steps, 'HTTP 404', res.status(), 404);
        expectEq(steps, '404 heading visible', await page.getByRole('heading', { level: 1, name: 'Page not found' }).isVisible(), true);
    },
};

async function drive(feature) {
    if (!feature) return fail('drive', 'missing feature; see "features"');
    const names = feature === 'all' ? Object.keys(DRIVES) : [feature];
    for (const n of names) if (!DRIVES[n]) return fail('drive', `unknown feature "${n}"`, { features: Object.keys(DRIVES) });
    const health = await doctor(true);
    if (!health.ok) return fail('drive', 'doctor failed; refusing to drive an instance we did not start', { doctor: health });
    const base = `http://localhost:${health.port}`;
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    const results = [];
    try {
        for (const name of names) {
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            const dir = path.join(ART, name, ts);
            fs.mkdirSync(dir, { recursive: true });
            const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
            const page = await context.newPage();
            page.setDefaultTimeout(20_000);
            const consoleErrors = [];
            page.on('pageerror', (e) => consoleErrors.push(String(e)));
            const steps = [];
            let ok = true;
            let reason;
            try {
                await DRIVES[name](page, steps, base);
            } catch (e) {
                ok = false;
                reason = e instanceof CheckError ? e.message : `drive error: ${e.message.split('\n')[0]}`;
            }
            const screenshot = path.join(dir, 'final.png');
            await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
            const r = { feature: name, ok, reason, url: page.url(), steps, pageErrors: consoleErrors, evidence: dir };
            fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(r, null, 2));
            results.push(r);
            await context.close();
        }
    } finally {
        await browser.close();
    }
    const ok = results.every((r) => r.ok);
    const summary = { ok, command: 'drive', results };
    if (!ok) summary.reason = results.filter((r) => !r.ok).map((r) => `${r.feature}: ${r.reason}`).join('; ');
    return out(summary);
}

async function stop() {
    const s = readState();
    if (!s) return out({ ok: true, command: 'stop', note: 'nothing launched by this tool' });
    const dry = process.argv.includes('--dry-run');
    if (dry) return out({ ok: true, command: 'stop', dryRun: true, wouldKillProcessGroup: s.pid, port: s.port });
    try {
        process.kill(-s.pid, 'SIGTERM');
    } catch {
        // already gone
    }
    for (let i = 0; i < 20 && listeners(s.port).some((p) => pgidOf(p) === s.pid); i++) {
        await new Promise((r) => setTimeout(r, 250));
    }
    try {
        process.kill(-s.pid, 'SIGKILL');
    } catch {
        // already gone
    }
    fs.rmSync(STATE, { force: true });
    const stillListening = listeners(s.port);
    return out({ ok: stillListening.length === 0, command: 'stop', killedProcessGroup: s.pid, port: s.port, stillListening,
        ...(stillListening.length ? { reason: 'port still in use after stop' } : {}) });
}

const [cmd, a1] = process.argv.slice(2);
const commands = {
    launch,
    doctor: () => doctor(),
    drive: () => drive(a1),
    stop,
    features: () => out({ ok: true, command: 'features', features: Object.keys(DRIVES) }),
};
if (!cmd || cmd === '--help' || cmd === '-h' || !commands[cmd]) {
    process.stdout.write(HELP + '\n');
    process.exit(cmd && !['--help', '-h'].includes(cmd) ? 1 : 0);
}
commands[cmd]().catch((e) => fail(cmd, e.message.split('\n')[0]));
