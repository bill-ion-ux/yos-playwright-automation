import { test, expect } from '@playwright/test';

/**
 * YOS-ZFOLD8 - Select the Samsung Galaxy Z Fold 8 from the "All Devices" menu.
 *
 * Authored fresh against the live dev site with playwright-cli, deliberately
 * WITHOUT reusing this repo's fixtures / page objects, so it can be compared
 * head-to-head with a WebdriverIO-recorder-authored version of the same flow.
 *
 * Flow:
 *   home -> header "Devices" flyout -> "All Devices" > "Explore Devices"
 *        -> /devices/ catalogue -> Galaxy Z Fold 8 card "Buy Now"
 *        -> yesshop cart page for the device.
 */

const YOS_HOST = process.env.YOS_HOST ?? 'https://yesmy-dev.azurewebsites.net';

test.use({
  baseURL: YOS_HOST,
  httpCredentials: {
    username: process.env.DEV_SITE_USER ?? 'yesmy-dev',
    password: process.env.DEV_SITE_PASS ?? 'YesMyDev123$',
  },
});

test('select Samsung Galaxy Z Fold 8 from All Devices', async ({ page }) => {
  // Azure App Service cold start - give the whole journey room.
  test.setTimeout(120_000);

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Homepage occasionally throws up the "#YesxILMUchatModal" pre-order modal
  // whose backdrop eats the first click. Dismiss it if it shows; ignore it
  // if it doesn't.
  const preOrderModal = page.locator('#YesxILMUchatModal');
  try {
    await preOrderModal.getByRole('button', { name: 'Close' }).click({ timeout: 5_000 });
    await preOrderModal.waitFor({ state: 'hidden', timeout: 5_000 });
  } catch {
    /* modal absent this run */
  }

  // Header "Devices" is a button that opens a flyout, not a link.
  await page.getByRole('button', { name: 'Devices' }).click();

  const exploreDevices = page.getByRole('link', { name: 'Explore Devices' });
  await expect(exploreDevices).toBeVisible();
  await exploreDevices.click();

  await expect(page).toHaveURL(/\/devices\/?$/);

  // Catalogue card for the Z Fold 8.
  await expect(
    page.getByRole('heading', { name: 'Galaxy Z Fold 8', exact: true }),
  ).toBeVisible();

  // Each catalogue item's CTA is an `/add-to-cart/<id>` link; 315 is the
  // Z Fold 8. This is the one selecting action of the flow.
  const buyNow = page.locator('a[href$="/add-to-cart/315"]');
  await expect(buyNow).toHaveCount(1);
  await buyNow.click();

  // Lands on the yesshop cart page dedicated to this device.
  await expect(page).toHaveURL(/\/samsung-galaxy-z-fold-8-old-315\/cart\/?$/);
  await expect(
    page.getByRole('heading', { name: /Samsung Galaxy Z Fold 8/i }),
  ).toBeVisible();
});
