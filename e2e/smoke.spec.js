import { expect, test } from '@playwright/test';

// Smoke tests check the page shell (header, footer, headings, status codes). Data pages depend on
// Jolpica and OpenF1; when those are down or rate-limited the route error page renders instead,
// so data assertions are skipped rather than failing the run.

async function open(page, path) {
    const response = await page.goto(path);
    const status = response?.status() ?? 0;
    await expect(page.getByRole('link', { name: 'Pit Lane Hub home' }).first()).toBeVisible();
    await expect(page.getByText(/Not affiliated with Formula 1/)).toBeVisible();
    return status;
}

function upstreamDown(status) {
    return status >= 500;
}

test('home page renders the shell and a single h1', async ({ page }) => {
    const status = await open(page, '/');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
    await expect(page.locator('h1')).toHaveCount(1);
    test.skip(upstreamDown(status), `upstream data unavailable (HTTP ${status})`);
    await expect(page.getByRole('heading', { name: /drivers$/ })).toBeVisible();
});

test('primary navigation works and marks the current page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page, '/support');
    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Standings' }).click();
    await expect(page).toHaveURL(/\/standings$/);
    await expect(
        page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Standings' }),
    ).toHaveAttribute('aria-current', 'page');
});

test('mobile menu opens, closes with Escape and returns focus', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await open(page, '/support');
    const button = page.getByRole('button', { name: 'Menu' });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: 'Main menu' }).getByRole('link', { name: 'Calendar' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();
});

test('no horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await open(page, '/support');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
});

test('calendar page renders', async ({ page }) => {
    const status = await open(page, '/schedule');
    test.skip(upstreamDown(status), `upstream data unavailable (HTTP ${status})`);
    await expect(page.getByRole('heading', { level: 1, name: /F1 Calendar/ })).toBeVisible();
});

test('standings page renders', async ({ page }) => {
    const status = await open(page, '/standings');
    test.skip(upstreamDown(status), `upstream data unavailable (HTTP ${status})`);
    await expect(page.getByRole('heading', { level: 1, name: /Standings/ })).toBeVisible();
});

test('unknown route shows the custom 404', async ({ page }) => {
    const status = await open(page, '/this-route-does-not-exist');
    expect(status).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
});

test('support page shows honest Pro and tip options', async ({ page }) => {
    const status = await open(page, '/support');
    expect(status).toBe(200);
    await expect(page.getByRole('heading', { name: 'Pit Lane Pro' })).toBeVisible();
    await expect(page.getByText('Supporter badge on your profile')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leave a one-time tip' })).toHaveAttribute('href', /buymeacoffee\.com/);
    await expect(page.getByText(/10K\+|24\/7/)).toHaveCount(0);
});

test('login page has one magic-link form and one password form', async ({ page }) => {
    const status = await open(page, '/login?redirect=https://evil.example/');
    expect(status).toBe(200);
    await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Sign in with password' })).toHaveCount(1);
    await expect(page.getByLabel('Password')).toHaveCount(1);
});
