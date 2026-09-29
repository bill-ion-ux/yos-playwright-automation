import { test, expect } from '@playwright/test';
import { makeCustomer } from '../tests/support/identity';

/**
 * YOS-Device-Purchase-Claude-v1 - Device purchase on the DEV site.
 * -------------------------------------------------------------------------
 * Buy a Samsung Galaxy Z Fold 8 on a *prepaid* line and walk the checkout
 * all the way to the payment page - then stop (no card / FPX details, no
 * "Pay Now").
 *
 * Authored live with `playwright-cli --headed` against
 * https://yesmy-dev.azurewebsites.net. The first `goto` carries HTTP basic
 * auth inline; the cross-origin hop to yesshop-dev.azurewebsites.net is
 * covered by `use.httpCredentials` in playwright.config.ts (fed from
 * DEV_SITE_USER / DEV_SITE_PASS), which Playwright applies to every origin.
 * Deliberately standalone - no repo fixtures / page objects.
 *
 * Flow (matches the 10 requested steps):
 *   1.  yesmy-dev/devices/
 *   2.  top-nav "Devices" flyout (the desktop <button>, not the mobile icon)
 *   3.  flyout "All Devices" group -> "Explore Devices" link -> /devices/
 *   4.  catalogue -> Galaxy Z Fold 8 tile "Buy Now"
 *       (a[href$="/add-to-cart/315"]; 316 is the Fold 8 Ultra)
 *       -> yesshop-dev.azurewebsites.net/samsung-galaxy-z-fold-8-old-315/cart
 *   5.  cart: 16GB+1TB storage, New Line, "yes 5g advanced prepaid" payment
 *       plan, Prepaid contract period, the prepaid plan tab, eSIM, Next
 *       -> /verification
 *   6.  verification: personal details from `makeCustomer()`. ID Number is
 *       disabled until an ID Type is picked; Date Of Birth + Gender are
 *       derived from the MyKad and rendered read-only -> asserted, not typed.
 *       Accept both consents, Next -> /accessories
 *   7.  accessories: Next (skip) -> /delivery-addresses
 *   8.  delivery: address + unit + postcode. Name / Contact / Email carry
 *       over from verification. State + City autofill from the postcode
 *       -> asserted.
 *   9.  Next
 *   10. -> /payment  <-- ends here (payment page visible, untouched).
 *
 * A prepaid device+line checkout does not trigger the VIDA eKYC identity
 * redirect the postpaid journey does, so this runs unattended: `/verification`
 * is a plain personal-details form and, once submitted, the app navigates on
 * to `/accessories` after a short server round-trip (hence `waitForURL`
 * rather than a `Promise.all` race on that step).
 *
 * The cart's "Next" is a sticky-footer button whose visible label toggles
 * "NEXT" / "OUT OF STOCK" via Alpine `x-show`; `getByRole('button',
 * { name: 'Next' })` targets it on every page of the checkout.
 */

const DEV_DEVICES_URL =
  'https://yesmy-dev:YesMyDev123$@yesmy-dev.azurewebsites.net/devices/';

const CART_URL = /yesshop-dev\.azurewebsites\.net\/samsung-galaxy-z-fold-8-old-315\/cart/;
const VERIFICATION_URL = /\/samsung-galaxy-z-fold-8-old-315\/verification\b/;
const ACCESSORIES_URL = /\/samsung-galaxy-z-fold-8-old-315\/accessories\b/;
const DELIVERY_URL = /\/samsung-galaxy-z-fold-8-old-315\/delivery-addresses\b/;
const PAYMENT_URL = /\/samsung-galaxy-z-fold-8-old-315\/payment\b/;

test('YOS-Device-Purchase-Claude-v1: Samsung Galaxy Z Fold 8 - prepaid line checkout up to the payment page', async ({
  page,
}) => {
  // Catalogue -> cart -> verification -> delivery chain across two origins on
  // a cold-start dev host; give the whole journey room beyond the default.
  test.setTimeout(180_000);

  const customer = makeCustomer();

  // --- 1. Navigate to the dev devices catalogue --------------------------
  await page.goto(DEV_DEVICES_URL, { waitUntil: 'domcontentloaded' });

  // --- 2. Top nav: open the "Devices" flyout ----------------------------
  // The desktop nav control is a plain <button> named "Devices" (the mobile
  // menu has an icon-only variant). Hydration can lag first paint - wait.
  const devicesNav = page.getByRole('button', { name: 'Devices' });
  await expect(devicesNav).toBeVisible({ timeout: 30_000 });
  await devicesNav.click();

  // --- 3. Flyout: "All Devices" group -> "Explore Devices" -------------
  // "All Devices" is the group label; its link is "Explore Devices" (-> /devices).
  const exploreDevices = page.getByRole('link', { name: 'Explore Devices' });
  await expect(exploreDevices).toBeVisible({ timeout: 15_000 });
  await exploreDevices.click();
  await expect(page).toHaveURL(/\/devices\/?$/);

  // --- 4. Catalogue: select "Samsung Galaxy Z Fold 8" ----------------
  // Semantic catalogue locator: the tile's "Buy Now" is an /add-to-cart/<id>
  // link; 315 is the Galaxy Z Fold 8 on the dev catalogue (316 is the Fold 8
  // Ultra). It navigates cross-origin to yesshop-dev.
  await expect(
    page.getByRole('heading', { name: 'Galaxy Z Fold 8', exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  const buyNow = page.locator('a[href$="/add-to-cart/315"]');
  await expect(buyNow).toHaveCount(1);
  await Promise.all([page.waitForURL(CART_URL, { timeout: 90_000 }), buyNow.click()]);
  await expect(
    page.getByRole('heading', { name: /Galaxy Z Fold ?8/i }).first(),
  ).toBeVisible({ timeout: 30_000 });

  // --- 5. Cart: prepaid new line, eSIM ------------------------------
  // Progressive form: each choice reveals the next section, so make the
  // selections in order and only reach for "Next" at the end.

  // "Select Storage" -> 16GB+1TB
  await page.getByRole('button', { name: '16GB+1TB' }).click();

  // "Choose An Action" -> New Line (the tile is `.layer-action-inner`; the
  // click handler is on that container, not the inner <h2>).
  await page.locator('.layer-action-inner', { hasText: 'New Line' }).first().click();

  // "Choose Preferred Payment Plan" -> the prepaid card.
  await page
    .locator('.layer-action-payment-plan-inner', { hasText: 'yes 5g advanced prepaid' })
    .first()
    .click();

  // "Choose Contract Period" -> Prepaid (scoped to <main>; the header nav
  // also carries a "Prepaid" button, and `exact` keeps this off the longer
  // prepaid-plan button that appears just below).
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Prepaid', exact: true })
    .click();

  // "Select A Prepaid Plan" -> the single prepaid plan tab (its accessible
  // name starts "Yes 5g advanced prepaid RM 0 /mth ...").
  await page.getByRole('button', { name: /Yes 5g advanced prepaid RM 0/i }).click();

  // "Choose SIM Type" -> eSIM (no physical SIM to ship).
  await page.getByRole('button', { name: 'eSIM', exact: true }).click();

  const cartNext = page.getByRole('button', { name: 'Next' });
  await expect(cartNext).toBeEnabled({ timeout: 30_000 });
  await Promise.all([page.waitForURL(VERIFICATION_URL, { timeout: 90_000 }), cartNext.click()]);

  // --- 6. Verification: personal details ---------------------------
  await expect(
    page.getByRole('heading', { name: /Verify Personal Details/i }),
  ).toBeVisible({ timeout: 60_000 });

  // ID Number is disabled until an ID Type is chosen.
  await page.locator('#select-securityType').selectOption('MYKAD');
  await page.locator('#input-security_id').fill(customer.idNumber);
  await page.locator('#input-name').fill(customer.fullName);

  // Date Of Birth + Gender are derived from the MyKad and rendered
  // read-only - assert them, don't type them.
  await expect(page.locator('#input-dob')).toHaveValue(customer.dob);
  await expect(page.locator('#input-dob')).toBeDisabled();
  await expect(page.locator('#gender1')).not.toHaveValue('');

  await page.locator('#input-contactno').fill(customer.phone);
  await page.locator('#input-email').fill(customer.email);

  // Both consent checkboxes sit under a click-intercepting overlay; toggle
  // them via their <label for=...> instead.
  await page.locator('label[for="input-subscribePlan"]').click();
  await page.locator('label[for="input-privacyPolicy"]').click();
  await expect(page.locator('#input-subscribePlan')).toBeChecked();
  await expect(page.locator('#input-privacyPolicy')).toBeChecked();

  const verifyNext = page.getByRole('button', { name: 'Next' });
  await expect(verifyNext).toBeEnabled({ timeout: 30_000 });
  // Submit does a server round-trip before the client navigates on, so wait
  // on the URL rather than racing the click.
  await verifyNext.click();
  await page.waitForURL(ACCESSORIES_URL, { timeout: 90_000 });

  // --- 7. Accessories: skip --------------------------------
  await Promise.all([
    page.waitForURL(DELIVERY_URL, { timeout: 90_000 }),
    page.getByRole('button', { name: 'Next' }).click(),
  ]);

  // --- 8. Delivery address --------------------------------
  // Name / Contact / Email are carried over from verification - only the
  // address fields need filling.
  await page.locator('#input-address').fill(customer.address);
  await page.locator('#input-unit_no').fill(customer.unitNo);
  await page.locator('#input-postcode').fill(customer.postalCode);

  // State + City are auto-filled from the postcode and read-only - assert.
  await expect(page.locator('#input-state')).toHaveValue(customer.state);
  await expect(page.locator('#input-city')).toHaveValue(customer.city);

  // --- 9. Next -> payment page ----------------------------
  const deliveryNext = page.getByRole('button', { name: 'Next' });
  await expect(deliveryNext).toBeEnabled({ timeout: 30_000 });
  await Promise.all([page.waitForURL(PAYMENT_URL, { timeout: 90_000 }), deliveryNext.click()]);

  // --- 10. Payment page reached, untouched ----------------
  await expect(page).toHaveURL(PAYMENT_URL);
  await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible({
    timeout: 30_000,
  });
  // "Pay Now" is present but disabled until a payment method is picked.
  await expect(page.getByRole('button', { name: 'Pay Now' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pay Now' })).toBeDisabled();
});

/*
 * Metrics (this authoring task, 2026-09-10)
 * ------------------------------------------------------------------
 * - Live navigation / exploration with `playwright-cli --headed`
 *     (browser open -> full flow driven to /payment, including one
 *      costly catalogue-wide `eval` detour and a self-inflicted
 *      DOM-hiding misstep): ~8 min 35 s of wall-clock.
 * - Writing this single test file (after ~15 s re-reading the two
 *     reference specs + fixtures/identity): ~2 min.
 * - Tokens consumed: ~65K of the context budget for the whole task
 *     (~28K of that is fixed system-prompt + skill-doc + memory
 *      overhead; the single biggest variable cost was one `eval`
 *      that dumped every /add-to-cart link on the catalogue page -
 *      scope such evals next time).
 */
