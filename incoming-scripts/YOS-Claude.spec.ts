import { test, expect } from '../tests/fixtures';
import { makeCustomer } from '../tests/support/identity';
import { journey } from '../tests/support/journey';

/**
 * YOS-Claude - Devices + Prepaid plan checkout (Samsung Galaxy Z Fold 8)
 * -------------------------------------------------------------------------
 * Flow (authored live with `playwright-cli` against yesshop-dev):
 *   1. Access the dev site  -> /devices/
 *   2. Select "Samsung Galaxy Z Fold 8"  (catalogue tile -> add-to-cart/315)
 *   3. On the cart: New Line + "yes 5g advanced prepaid" payment plan +
 *      Prepaid contract period + the "Yes 5g advanced prepaid" plan, Next
 *      -> /verification
 *   4. Verify Personal Details from `makeCustomer()` (DOB + Gender are
 *      auto-derived from the MyKad, so they are asserted with `toHaveValue`,
 *      not typed), accept both consents, Next
 *   5. Accessories step -> /delivery-addresses
 *   6. Fill the delivery address + postcode and click Next.  <-- ends here.
 *
 * KNOWN DEV BREAKAGE (2026-09-04): on yesshop-dev the prepaid device journey
 * for SKU 315 currently dead-ends after step 4 - clicking Next on
 * /verification issues `GET /samsung-galaxy-z-fold-8-old-315/accessories`
 * which returns HTTP 404 (nginx), and /delivery-addresses returns
 * "Device Not Found". This lines up with the recorded eKYC server-side block
 * on prepaid device+plan checkouts. Steps 5-6 therefore use the selectors
 * proven by `legacy-scripts/test_delivery_address.js` (last known-good run of
 * this exact page) and will start passing again once the route is restored.
 */

const CART_URL = /yesshop-dev\.azurewebsites\.net\/[^/]+\/cart/;
const VERIFICATION_URL = /\/verification\b/;
const ACCESSORIES_URL = /\/accessories\b/;
const DELIVERY_URL = /\/delivery-addresses\b/;

test('YOS-Claude: Samsung Galaxy Z Fold 8 - prepaid plan checkout up to delivery address', async ({
  page,
}, testInfo) => {
  // Full cart -> verification -> delivery chain across a cold-starting Azure
  // backend; give it well beyond the per-spec default.
  test.setTimeout(180_000);

  const j = journey(page, testInfo);
  const customer = makeCustomer();

  // --- 1. Access the dev site: the devices catalogue -------------------------
  await page.goto('/devices/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Galaxy Z Fold 8', exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await j.shot('devices catalogue');

  // --- 2. Select "Samsung Galaxy Z Fold 8" ---------------------------------
  // Semantic catalogue locator: the tile's "Buy Now" -> /add-to-cart/<id>.
  // (315 == Galaxy Z Fold 8; the tile navigates cross-origin to yesshop-dev.)
  await Promise.all([
    page.waitForURL(CART_URL, { timeout: 90_000 }),
    page.locator('a[href$="/add-to-cart/315"]').click(),
  ]);
  await expect(
    page.getByRole('heading', { name: /Samsung Galaxy Z Fold ?8/i }),
  ).toBeVisible({ timeout: 60_000 });
  await j.shot('cart - z fold 8');

  // --- 3. Cart: choose a New Line on the prepaid plan ----------------------
  // "Choose An Action"
  await page.locator('.layer-action-inner', { hasText: 'New Line' }).click();

  // "Choose Preferred Payment Plan" -> the prepaid card
  await page
    .locator('.layer-action-payment-plan-inner', { hasText: 'yes 5g advanced prepaid' })
    .click();

  // "Choose Contract Period" -> Prepaid (scoped to the form; the top nav also
  // has a "Prepaid" button)
  await page
    .locator('#page-main')
    .getByRole('button', { name: 'Prepaid', exact: true })
    .click();

  // "Select A Prepaid Plan" -> the single prepaid plan tab
  await page
    .getByRole('button', { name: /Yes 5g advanced prepaid RM 0/i })
    .click();

  await dismissStockErrorModal(page);

  const cartNext = page.getByRole('button', { name: 'Next' });
  await expect(cartNext).toBeEnabled({ timeout: 30_000 });
  await j.shot('cart - prepaid plan selected');
  await Promise.all([page.waitForURL(VERIFICATION_URL, { timeout: 90_000 }), cartNext.click()]);

  // --- 4. Verify Personal Details (from the fixture identity) --------------
  await expect(page.getByRole('heading', { name: 'Verify Personal Details' })).toBeVisible({
    timeout: 60_000,
  });

  await page.locator('#select-securityType').selectOption('MYKAD');
  await page.locator('#input-security_id').fill(customer.idNumber);
  await page.locator('#input-name').fill(customer.fullName);

  // Date Of Birth + Gender are derived from the MyKad and rendered read-only -
  // assert them, don't type them.
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
  await j.shot('verification - filled');

  const verifyNext = page.getByRole('button', { name: 'Next' });
  await expect(verifyNext).toBeEnabled({ timeout: 30_000 });
  await Promise.all([
    page.waitForURL(new RegExp(`${ACCESSORIES_URL.source}|${DELIVERY_URL.source}`), {
      timeout: 90_000,
    }),
    verifyNext.click(),
  ]);

  // --- 5. Accessories step -> delivery addresses --------------------------
  if (ACCESSORIES_URL.test(page.url())) {
    // yesshop-dev currently serves a hard 404 here for the prepaid Z Fold 8
    // (SKU 315) journey - see the file header. Fail loudly and unambiguously
    // so the report points at the environment, not the script. Steps 5-6
    // below are complete and resume working once the route is restored.
    await expect(
      page,
      'BLOCKED by dev env: GET /accessories returned 404 for the prepaid ' +
        'Z Fold 8 (SKU 315) checkout, so /delivery-addresses is unreachable.',
    ).not.toHaveTitle(/404/i);

    await page.locator('#btn-add-to-cart').click();
    await page.waitForURL(DELIVERY_URL, { timeout: 90_000 });
  }
  await expect(page).toHaveURL(DELIVERY_URL);
  await j.shot('delivery addresses - empty');

  // --- 6. Fill the delivery address and click Next -----------------------
  // Selectors from legacy-scripts/test_delivery_address.js (last known-good).
  await page.locator('#input-address').fill(`${customer.unitNo}, ${customer.address}`);
  await page.locator('#input-postcode').fill(customer.postalCode);
  await j.shot('delivery addresses - filled');

  const deliveryNext = page.locator('#btn-add-to-cart');
  await expect(deliveryNext).toBeEnabled({ timeout: 30_000 });
  await deliveryNext.click();

  // End of scenario: the address was submitted (a confirmation modal opens, or
  // the flow advances past /delivery-addresses).
  await expect
    .poll(async () => (await page.locator('#modalOKButton').isVisible()) || !DELIVERY_URL.test(page.url()), {
      timeout: 30_000,
    })
    .toBeTruthy();
  await j.shot('delivery addresses - submitted');
});

/**
 * The cart occasionally throws a "Failed to fetch stock details" Bootstrap
 * modal (#staticBackdrop) on a cold backend; its backdrop then eats the next
 * click and resets the form. Clear it if it showed up.
 */
async function dismissStockErrorModal(page: import('@playwright/test').Page): Promise<void> {
  const ok = page.locator('#staticBackdrop button.btn-primary');
  try {
    if (await ok.isVisible({ timeout: 2_000 })) {
      await ok.click();
      await page.locator('#staticBackdrop').waitFor({ state: 'hidden', timeout: 10_000 });
    }
  } catch {
    /* modal not present this run - fine */
  }
}
