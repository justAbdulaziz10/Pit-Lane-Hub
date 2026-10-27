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

const DRIVES = {
    async home(page, steps, base) {
        await page.goto(base + '/');
        expectEq(steps, 'hero "Command Center" visible', await page.getByText('Command Center').first().isVisible(), true);
        expectEq(steps, 'heading "Explore the Paddock" visible',
            await page.getByRole('heading', { name: 'Explore the Paddock' }).isVisible(), true);
        expectEq(steps, 'skip link attached', await page.getByRole('link', { name: 'Skip to main content' }).count() > 0, true);
        await page.getByRole('link', { name: 'Standings' }).first().click();
        await page.waitForURL(/\/standings$/);
        expectEq(steps, 'nav "Standings" lands on /standings', new URL(page.url()).pathname, '/standings');
    },

    async 'drivers-favorites'(page, steps, base) {
        await page.goto(base + '/drivers');
        await page.evaluate(() => localStorage.removeItem('plh:favoriteDrivers'));
        await page.reload();
        const cards = page.locator('main a[href^="/driver/"]');
        await cards.first().waitFor();
        const count = await cards.count();
        steps.push({ info: 'driver cards', count });
        if (count < 2) throw new CheckError(`need >=2 driver cards to prove reordering, got ${count} (live data unavailable?)`);
        const last = cards.nth(count - 1);
        const href = await last.getAttribute('href');
        const number = Number(href.split('/').pop());
        const star = () => page.locator(`main a[href="${href}"]`).getByRole('button', { name: /favorites/ });
        const stored = async () => JSON.parse((await page.evaluate(() => localStorage.getItem('plh:favoriteDrivers'))) || '[]');
        // Retry the click until hydrated: a click before hydration is a no-op.
        await expectSoon(steps, 'star is pressed after click', async () => {
            if ((await star().getAttribute('aria-pressed')) !== 'true') await star().click();
            await page.waitForTimeout(250);
            return star().getAttribute('aria-pressed');
        }, 'true', 15000);
        expectEq(steps, 'URL unchanged (star does not follow card link)', new URL(page.url()).pathname, '/drivers');
        expectEq(steps, 'localStorage holds favorite', await stored(), [number]);
        await page.reload();
        await cards.first().waitFor();
        await expectSoon(steps, 'favorite pulled to front after reload', () => cards.first().getAttribute('href'), href);
        await expectSoon(steps, 'star still pressed after reload', () => star().getAttribute('aria-pressed'), 'true');
        await star().click();
        await expectSoon(steps, 'unfavorite clears storage', stored, []);
        await expectSoon(steps, 'star released after unfavorite', () => star().getAttribute('aria-pressed'), 'false');
    },

    async standings(page, steps, base) {
        await page.goto(base + '/standings');
        expectEq(steps, 'h1 "F1 Standings" visible', await page.getByRole('heading', { level: 1, name: 'F1 Standings' }).isVisible(), true);
        expectEq(steps, 'constructor standings heading visible',
            await page.getByRole('heading', { name: /Constructor Standings/ }).isVisible(), true);
    },

    async live(page, steps, base) {
        await page.goto(base + '/live');
        expectEq(steps, 'heading "Live Timing" visible', await page.getByRole('heading', { name: 'Live Timing' }).isVisible(), true);
        expectEq(steps, 'positions or honest entry list shown',
            await page.getByRole('heading', { name: /Live Positions|Entry List/ }).first().isVisible(), true);
    },

    async 'not-found'(page, steps, base) {
        const res = await page.goto(base + '/this-route-does-not-exist');
        expectEq(steps, 'HTTP 404', res.status(), 404);
        expectEq(steps, 'custom 404 copy visible', await page.getByText('Lost in the gravel trap').isVisible(), true);
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
