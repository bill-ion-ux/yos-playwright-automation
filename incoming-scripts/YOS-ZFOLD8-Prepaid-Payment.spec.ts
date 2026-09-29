import { test, expect } from '@playwright/test';
import { makeCustomer } from '../tests/support/identity';

/**
 * YOS-ZFOLD8-Prepaid-Payment - Device purchase on the LIVE site (yes.my).
 * -------------------------------------------------------------------------
 * Buy a Samsung Galaxy Z Fold 8 on a *prepaid* plan and walk the checkout
 * all the way to the payment page - then stop (no card / FPX details, no
 * "Pay Now").
 *
 * A prepaid device+plan checkout never triggers the VIDA eKYC identity
 * redirect that the postpaid journey does, so this runs unattended: the
 * `/verification` step is a plain personal-details form.
 *
 * Authored live with `playwright-cli` against production, deliberately
 * standalone (no repo fixtures / page objects - those are pinned to the dev
 * host). Flow:
 *   www.yes.my  -> header "Devices" flyout -> "Explore Devices"
 *               -> /devices/ catalogue -> Galaxy Z Fold 8 "Buy Now"
 *               -> store.yes.my/galaxy-z-fold-8/cart
 *   cart        -> 16GB+1TB, New Line, "yes 5g advanced prepaid" payment
 *                  plan, Prepaid contract period, the prepaid plan, eSIM,
 *                  Next -> /verification
 *   verification-> personal details (DOB + Gender are derived from the
 *                  MyKad and read-only -> asserted, not typed), both
 *                  consents, Next -> /accessories
 *   accessories -> Next (skip) -> /delivery-addresses
 *   delivery    -> address + postcode (State + City autofill from the
 *                  postcode -> asserted), Next -> /payment   <-- ends here.
 */

const CART_URL = /store\.yes\.my\/galaxy-z-fold-8\/cart/;
const VERIFICATION_URL = /\/galaxy-z-fold-8\/verification\b/;
const ACCESSORIES_URL = /\/galaxy-z-fold-8\/accessories\b/;
const DELIVERY_URL = /\/galaxy-z-fold-8\/delivery-addresses\b/;
const PAYMENT_URL = /\/galaxy-z-fold-8\/payment\b/;

test('YOS-ZFOLD8: Samsung Galaxy Z Fold 8 - prepaid checkout up to the payment page', async ({
  page,
}) => {
  // Full catalogue -> cart -> verification -> delivery chain across two
  // origins; give the whole journey room well beyond the per-test default.
  test.setTimeout(180_000);

  const customer = makeCustomer();

  // --- 1. Live site -> devices catalogue ---------------------------------
  await page.goto('https://www.yes.my/', { waitUntil: 'domcontentloaded' });

  // Header "Devices" is a flyout trigger (button), not a link.
  await page.getByRole('button', { name: 'Devices' }).click();
  await page.getByRole('link', { name: 'Explore Devices' }).click();
  await expect(page).toHaveURL(/\/devices\/?$/);
  await expect(
    page.getByRole('heading', { name: 'Galaxy Z Fold 8', exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  // --- 2. Select "Samsung Galaxy Z Fold 8" ------------------------------
  // Semantic catalogue locator: the tile's "Buy Now" is an /add-to-cart/<id>
  // link; 321 is the Galaxy Z Fold 8 (322 is the Ultra). It navigates
  // cross-origin to store.yes.my.
  const buyNow = page.locator('a[href$="/add-to-cart/321"]');
  await expect(buyNow).toHaveCount(1);
  await Promise.all([page.waitForURL(CART_URL, { timeout: 90_000 }), buyNow.click()]);
  await expect(
    page.getByRole('heading', { name: /Galaxy Z Fold ?8/i }),
  ).toBeVisible({ timeout: 30_000 });

  // --- 3. Cart: prepaid new line, eSIM --------------------------------
  await page.getByRole('button', { name: '16GB+1TB' }).click();

  // "Choose An Action" -> New Line
  await page.locator('.layer-action-inner', { hasText: 'New Line' }).first().click();

  // "Choose Preferred Payment Plan" -> the prepaid card
  await page
    .locator('.layer-action-payment-plan-inner', { hasText: 'yes 5g advanced prepaid' })
    .first()
    .click();

  // "Choose Contract Period" -> Prepaid (scoped to the form; exact so it
  // can't catch the longer prepaid-plan button below it)
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Prepaid', exact: true })
    .click();

  // "Select A Prepaid Plan" -> the single prepaid plan tab
  await page.getByRole('button', { name: /yes 5g advanced prepaid RM 0/i }).click();

  // "Choose SIM Type" -> eSIM (no physical SIM to ship)
  await page.getByRole('button', { name: 'eSIM', exact: true }).click();

  const cartNext = page.getByRole('button', { name: 'Next' });
  await expect(cartNext).toBeEnabled({ timeout: 30_000 });
  await Promise.all([page.waitForURL(VERIFICATION_URL, { timeout: 90_000 }), cartNext.click()]);

  // --- 4. Verification: personal details ------------------------------
  await page.locator('#select-securityType').selectOption('MYKAD');
  await page.getByRole('textbox', { name: 'ID Number' }).fill(customer.idNumber);
  await page.getByRole('textbox', { name: 'Full Name *' }).fill(customer.fullName);

  // Date Of Birth + Gender are derived from the MyKad and rendered
  // read-only - assert them, don't type them.
  await expect(page.getByRole('textbox', { name: 'Date Of Birth *' })).toHaveValue(customer.dob);
  await expect(page.getByRole('textbox', { name: 'Date Of Birth *' })).toBeDisabled();
  await expect(page.locator('#gender1')).not.toHaveValue('');

  await page.getByRole('spinbutton', { name: 'Phone Number' }).fill(customer.phone);
  await page.getByRole('textbox', { name: 'Email Address *' }).fill(customer.email);

  // Both consent checkboxes sit under a click-intercepting overlay; toggle
  // them via their <label for=...> instead.
  await page.locator('label[for="input-subscribePlan"]').click();
  await page.locator('label[for="input-privacyPolicy"]').click();
  await expect(page.locator('#input-subscribePlan')).toBeChecked();
  await expect(page.locator('#input-privacyPolicy')).toBeChecked();

  const verifyNext = page.getByRole('button', { name: 'Next' });
  await expect(verifyNext).toBeEnabled({ timeout: 30_000 });
  await Promise.all([page.waitForURL(ACCESSORIES_URL, { timeout: 90_000 }), verifyNext.click()]);

  // --- 5. Accessories: skip -----------------------------------------
  await Promise.all([
    page.waitForURL(DELIVERY_URL, { timeout: 90_000 }),
    page.getByRole('button', { name: 'Next' }).click(),
  ]);

  // --- 6. Delivery address ----------------------------------------
  await page.getByRole('textbox', { name: 'Address *' }).fill(customer.address);
  await page.getByRole('textbox', { name: 'Unit No.' }).fill(customer.unitNo);
  await page.getByRole('textbox', { name: 'Postal Code *' }).fill(customer.postalCode);

  // State + City are auto-filled from the postcode and read-only - assert.
  await expect(page.getByRole('textbox', { name: 'State *' })).toHaveValue(customer.state);
  await expect(page.getByRole('textbox', { name: 'City *' })).toHaveValue(customer.city);

  const deliveryNext = page.getByRole('button', { name: 'Next' });
  await expect(deliveryNext).toBeEnabled({ timeout: 30_000 });
  await Promise.all([page.waitForURL(PAYMENT_URL, { timeout: 90_000 }), deliveryNext.click()]);

  // --- End of scenario: the payment page, untouched --------------------
  await expect(page).toHaveURL(PAYMENT_URL);
  await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('button', { name: 'Pay Now' })).toBeVisible();
});
