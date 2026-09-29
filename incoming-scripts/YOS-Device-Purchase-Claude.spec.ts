import { test, expect } from '@playwright/test';
import { makeCustomer } from '../tests/support/identity';

/**
 * YOS-Device-Purchase-Claude - Device purchase on the LIVE site (yes.my).
 * -------------------------------------------------------------------------
 * Buy a Samsung Galaxy Z Fold 8 on a *prepaid* line and walk the checkout
 * all the way to the payment page - then stop (no card / FPX details, no
 * "Pay Now").
 *
 * Flow (authored live with `playwright-cli` against production, deliberately
 * standalone - no repo fixtures / page objects, those are pinned to the dev
 * host):
 *   1. www.yes.my
 *   2. header "Devices" flyout (top nav)
 *   3. "Explore Devices" - the link under the flyout's "All Devices" section
 *      -> /devices/ catalogue
 *   4. Galaxy Z Fold 8 tile "Buy Now" (a[href$="/add-to-cart/321"]; 322 is
 *      the Ultra) -> store.yes.my/galaxy-z-fold-8/cart
 *   5. cart: 16GB+1TB, New Line, "yes 5g advanced prepaid" payment plan,
 *      Prepaid contract period, the prepaid plan tab, eSIM, Next
 *      -> /verification
 *   6. verification: personal details from `makeCustomer()`. Date Of Birth +
 *      Gender are derived from the MyKad and rendered read-only -> asserted,
 *      not typed. Accept both consents, Next -> /accessories
 *   7. accessories: Next (skip) -> /delivery-addresses
 *   8. delivery: address + unit + postcode. State + City autofill from the
 *      postcode -> asserted. Next
 *   9. -> /payment  <-- ends here (payment page visible, untouched).
 *
 * A prepaid device+line checkout never triggers the VIDA eKYC identity
 * redirect the postpaid journey does, so this runs unattended: the
 * `/verification` step is a plain personal-details form.
 *
 * Every navigation step's "Next" is the same sticky footer button,
 * `#btn-add-to-cart` (its label span toggles between "Next" and
 * "OUT OF STOCK" via Alpine `x-show`; the button is only enabled when the
 * selected capacity is in stock).
 */

const CART_URL = /store\.yes\.my\/galaxy-z-fold-8\/cart\b/;
const VERIFICATION_URL = /\/galaxy-z-fold-8\/verification\b/;
const ACCESSORIES_URL = /\/galaxy-z-fold-8\/accessories\b/;
const DELIVERY_URL = /\/galaxy-z-fold-8\/delivery-addresses\b/;
const PAYMENT_URL = /\/galaxy-z-fold-8\/payment\b/;

test('YOS-Device-Purchase-Claude: Samsung Galaxy Z Fold 8 - prepaid line checkout up to the payment page', async ({
  page,
}) => {
  // Catalogue -> cart -> verification -> delivery chain across two origins;
  // give the whole journey room well beyond the per-test default.
  test.setTimeout(180_000);

  const customer = makeCustomer();

  // --- 1. Navigate to the live site -----------------------------------
  await page.goto('https://www.yes.my/', { waitUntil: 'domcontentloaded' });

  // --- 2. Top nav: open the "Devices" flyout -------------------------
  // It is an <a role="button"> Bootstrap dropdown toggle, not a link;
  // hydration can lag the first paint, so wait for it.
  const devicesNav = page.getByRole('button', { name: 'Devices', exact: true });
  await expect(devicesNav).toBeVisible({ timeout: 30_000 });
  await devicesNav.click();

  // --- 3. Flyout: "All Devices" section -> "Explore Devices" --------
  const exploreDevices = page.getByRole('link', { name: 'Explore Devices' });
  await expect(exploreDevices).toBeVisible({ timeout: 15_000 });
  await exploreDevices.click();
  await expect(page).toHaveURL(/\/devices\/?$/);

  // --- 4. Catalogue: select "Samsung Galaxy Z Fold 8" --------------
  // Semantic catalogue locator: the tile's "Buy Now" is an /add-to-cart/<id>
  // link; 321 is the Galaxy Z Fold 8 (322 is the Ultra). It navigates
  // cross-origin to store.yes.my.
  await expect(
    page.getByRole('heading', { name: 'Galaxy Z Fold 8', exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  const buyNow = page.locator('a[href$="/add-to-cart/321"]');
  await expect(buyNow).toHaveCount(1);
  await Promise.all([page.waitForURL(CART_URL, { timeout: 90_000 }), buyNow.click()]);
  await expect(
    page.getByRole('heading', { name: /Galaxy Z Fold ?8/i }),
  ).toBeVisible({ timeout: 30_000 });

  // --- 5. Cart: prepaid new line, eSIM ----------------------------
  await page.getByRole('button', { name: '16GB+1TB' }).click();

  // "Choose An Action" -> New Line
  await page.locator('.layer-action-inner', { hasText: 'New Line' }).first().click();

  // "Choose Preferred Payment Plan" -> the prepaid card
  await page
    .locator('.layer-action-payment-plan-inner', { hasText: 'yes 5g advanced prepaid' })
    .first()
    .click();

  // "Choose Contract Period" -> Prepaid (scoped to the form; exact so it
  // can't catch the longer prepaid-plan tab below it)
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Prepaid', exact: true })
    .click();

  // "Select A Prepaid Plan" -> the single prepaid plan tab
  await page.getByRole('button', { name: /yes 5g advanced prepaid RM 0/i }).click();

  // "Choose SIM Type" -> eSIM (no physical SIM to ship)
  await page.getByRole('button', { name: 'eSIM', exact: true }).click();

  const cartNext = page.locator('#btn-add-to-cart');
  await expect(cartNext).toBeEnabled({ timeout: 30_000 });
  await Promise.all([page.waitForURL(VERIFICATION_URL, { timeout: 90_000 }), cartNext.click()]);

  // --- 6. Verification: personal details ------------------------
  await expect(
    page.getByRole('heading', { name: 'Verify Personal Details' }),
  ).toBeVisible({ timeout: 60_000 });

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

  const verifyNext = page.locator('#btn-add-to-cart');
  await expect(verifyNext).toBeEnabled({ timeout: 30_000 });
  await Promise.all([page.waitForURL(ACCESSORIES_URL, { timeout: 90_000 }), verifyNext.click()]);

  // --- 7. Accessories: skip ---------------------------------
  await Promise.all([
    page.waitForURL(DELIVERY_URL, { timeout: 90_000 }),
    page.locator('#btn-add-to-cart').click(),
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

  // --- 9. Next -> payment page --------------------------------
  const deliveryNext = page.locator('#btn-add-to-cart');
  await expect(deliveryNext).toBeEnabled({ timeout: 30_000 });
  await Promise.all([page.waitForURL(PAYMENT_URL, { timeout: 90_000 }), deliveryNext.click()]);

  // --- End of scenario: the payment page, untouched -----------------
  await expect(page).toHaveURL(PAYMENT_URL);
  await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('button', { name: 'Pay Now' })).toBeVisible();
});

/**
 * 
 * Metrics (this task)

- Live navigation / exploration: ~6 min 9 s (09:24:48 → 09:30:57 UTC) — homepage load, driving all 6 pages, discovering selectors
- Writing the single test: ~40 s to author the file + tsc typecheck (on top of ~15 s reading two reference specs + fixtures first)
- Total wall-clock: ~7 min 43 s (09:24:35 → 09:32:18 UTC)
- Tokens consumed: ~103K of context budget for the whole task (repo recon + live drive + authoring + memory update)

 */