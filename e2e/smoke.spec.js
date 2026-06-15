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
