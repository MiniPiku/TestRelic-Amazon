// Swiggy (https://www.swiggy.com) public-website browser tests.
//
// IMPORTANT: `test` and `expect` are imported from
// '@testrelic/playwright-analytics/fixture' (NOT '@playwright/test'). That
// fixture wraps the `page` so TestRelic captures Network Requests, video sync,
// Console logs, and Test Navigation (Nav Logs). Combined with the
// `use: { video, screenshot, trace }` block in playwright.config.ts, every run
// populates all of the dashboard columns.
import { test, expect } from '@testrelic/playwright-analytics/fixture';
import type { Page } from '@playwright/test';

// baseURL ('https://www.swiggy.com') comes from playwright.config.ts, so tests
// navigate with relative paths.
test.setTimeout(60_000);

// Swiggy's bot challenge serves a blank page to a browser that advertises
// `navigator.webdriver`. Mask it before every navigation (paired with the
// realistic context in playwright.config.ts) so the real SPA renders.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
});

// The homepage's primary call-to-action: the delivery-location search box
// (`input[name="location"]`, placeholder "Enter your delivery location").
const locationBox = (page: Page) =>
  page.getByPlaceholder(/delivery location|location|area|city/i).first();

test('Homepage loads and renders the location search bar', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // The brand is in the title on every Swiggy page.
  await expect(page).toHaveTitle(/swiggy/i, { timeout: 30_000 });

  await expect(locationBox(page)).toBeVisible({ timeout: 30_000 });
});

test('User can search for a city or location', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const box = locationBox(page);
  await expect(box).toBeVisible({ timeout: 30_000 });

  // Typing a city triggers Swiggy's location-autocomplete API (a network call
  // TestRelic records), which returns matching cities as suggestions.
  await box.click();
  await box.fill('Bengaluru');

  await expect(
    page.getByText(/bengaluru|bangalore|karnataka/i).first(),
  ).toBeVisible({ timeout: 30_000 });
});

test('Restaurant listing page loads with results', async ({ page }) => {
  // Use a city-specific listing URL ("Dining Out Restaurants In Bangalore")
  // rather than the homepage grid: the homepage's restaurant cards are gated on
  // IP geolocation and are empty from non-India CI runners, whereas the /city/
  // listing renders results regardless of where the runner is.
  await page.goto('/city/bangalore', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/restaurant|bangalore|swiggy/i, { timeout: 30_000 });

  // The listing renders restaurant cards (links into /restaurants/...).
  const cards = page.locator('a[href*="/restaurants/"]');
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  expect(await cards.count()).toBeGreaterThan(0);
});

test('A restaurant page opens successfully', async ({ page }) => {
  await page.goto('/city/bangalore', { waitUntil: 'domcontentloaded' });

  // Pick a real restaurant card, not the generic "/restaurants//dineout"
  // category tile: a real card's href has a slug (with a hyphen) and a numeric
  // restaurant id.
  const card = page.locator('a[href*="/restaurants/"][href*="-"]').first();
  await expect(card).toBeVisible({ timeout: 30_000 });

  // Opening a restaurant navigates to its page — a navigation TestRelic records
  // in the Nav Logs column.
  await card.click();
  await page.waitForLoadState('domcontentloaded');

  // Restaurant pages have a restaurant-specific title (e.g. "Plan B In ..."),
  // so assert the restaurant URL (slug + numeric id) and that the page actually
  // rendered (a non-empty title) rather than expecting the brand name.
  await expect(page).toHaveURL(/\/restaurants\/.*\d{4,}/i, { timeout: 30_000 });
  await expect(page).toHaveTitle(/.+/, { timeout: 30_000 });
});

test('Cart interaction — user can open the cart', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // The Cart entry point is present site-wide and links to the checkout view.
  const cart = page.getByRole('link', { name: /cart/i }).first();
  await expect(cart).toBeVisible({ timeout: 30_000 });

  // A floating Swiggy banner overlaps the header cart link, so a normal (or even
  // forced) click lands on the overlay. Dispatching the click directly on the
  // anchor bypasses the overlay and triggers the SPA router's navigation.
  await cart.dispatchEvent('click');

  // We land on the secure checkout / cart view (empty cart is fine — the
  // interaction and the cart view are what we're verifying).
  await page.waitForURL(/checkout/i, { timeout: 30_000 });
  await expect(page).toHaveURL(/checkout/i, { timeout: 30_000 });
  await expect(
    page.getByText(/cart|checkout|empty/i).first(),
  ).toBeVisible({ timeout: 30_000 });
});

test('Order fails when restaurant is unavailable', async ({ page }) => {
  // INTENTIONAL FAILURE (required by the assignment): demonstrates how a real
  // failed user journey — placing an order at an unavailable restaurant —
  // surfaces in the TestRelic dashboard with its video, screenshot, and trace.
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Simulated outcome: the order is rejected, so the expected order count (1)
  // does not match the actual placed-order count (2).
  expect(1).toBe(2);
});
