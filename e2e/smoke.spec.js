import { expect, test } from '@playwright/test';

// Smoke tests assert on content that always renders regardless of the live F1
// APIs, so they stay stable even when external data is unavailable.

test('home page renders hero, explore grid and skip link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Command Center')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Explore the Paddock' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
});

test('primary navigation works', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Standings' }).first().click();
    await expect(page).toHaveURL(/\/standings$/);
});

test('live page renders without a fabricated grid', async ({ page }) => {
    await page.goto('/live');
    await expect(page.getByRole('heading', { name: 'Live Timing' })).toBeVisible();
    // Either real live positions or the honest "Entry List" fallback.
    await expect(page.getByRole('heading', { name: /Live Positions|Entry List/ })).toBeVisible();
});

test('schedule page renders', async ({ page }) => {
    await page.goto('/schedule');
    await expect(page.getByRole('heading', { name: /Schedule/ })).toBeVisible();
});

test('unknown route shows the custom 404', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText('Lost in the gravel trap')).toBeVisible();
});

test('support page shows honest Pro and tip options', async ({ page }) => {
    await page.goto('/support');
    await expect(page.getByRole('heading', { name: /Pit Lane Pro/ })).toBeVisible();
    await expect(page.getByText('Supporter badge on your profile')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leave a one-time tip' })).toHaveAttribute('href', /buymeacoffee\.com/);
    await expect(page.getByText(/10K\+|24\/7/)).toHaveCount(0);
});

test('login page has one magic-link form and one password form', async ({ page }) => {
    await page.goto('/login?redirect=https://evil.example/');
    await expect(page.getByRole('button', { name: /Send Link/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Sign In' })).toHaveCount(1);
});
