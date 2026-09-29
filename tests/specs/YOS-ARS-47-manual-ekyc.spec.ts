import { test, expect } from '../fixtures';
import { makeRealCustomer } from '../support/identity';
import { clickEnabled, waitForManualEkyc } from '../support/ekyc';
import { journey } from '../support/journey';

/**
 * YOS-ARS-47 (manual eKYC variant)
 *
 * Copy of YOS-ARS-47 that expects the VIDA eKYC gate on /verification and
 * parks for a person to pass it (real doc scan + selfie) instead of trying to
 * stub it. Uses the tester's own identity (EKYC_* in .env) because the check
 * scans a real MyKad. Run headed:
 *
 *   ./run.sh YOS-ARS-47-manual-ekyc.spec.ts --headed
 *
 * The prepaid device flow has not always shown the gate (see memory notes), so
 * the pause only kicks in if a "Verify Now" link actually appears after Next;
 * otherwise the journey just continues to /accessories.
 *
 * Original YOS-ARS-47 (restructured)
 *
 * Port of incoming-scripts/YOS-ARS-47-Claude.spec.ts onto the shared
 * fixture. The fixture (tests/fixtures.ts) has already handled HTTP basic
 * auth, navigated to the YOS site root, and waited out the Azure cold
 * start - so this spec starts by opening the Devices menu, not by calling
 * page.goto().
 *
 * End-to-end purchase of the Samsung Galaxy Z Fold 8 (prepaid bundle),
 * filling every form with mock data and completing the FPX mock payment
 * through to the "Thank you!" confirmation.
 *
 * source: legacy-scripts/YOS_Device_Plan.js, incoming-scripts/YOS-ARS-47-Claude.spec.ts
 */

// Manual eKYC scans a real MyKad, so this journey always uses the tester's
// own identity from .env (EKYC_*). Run it headed. No retries - a retry would
// make them redo eKYC. Note the per-ID order cap on yesshop-dev (~5 prepaid).
test.describe.configure({ retries: 0 });

const MOCK = makeRealCustomer();

test('Buy Samsung Galaxy Z Fold 8 (manual eKYC) with successful FPX mock payment', async ({ page }, testInfo) => {
  // This journey crosses several cold-start Azure apps + a payment redirect chain.
  // Budget includes the human eKYC wait (EKYC_WAIT_MS, default 5 min).
  test.setTimeout(15 * 60_000);
  const j = journey(page, testInfo);

  // 1. All Devices listing (fixture already landed us on the site root)
  await page.getByRole('button', { name: 'Devices' }).click();
  await page.getByRole('link', { name: 'Explore Devices' }).click();

  // 2. Pick the Galaxy Z Fold 8 card (product 315), not the "Ultra" variant.
  await expect(
    page.getByRole('heading', { name: 'Galaxy Z Fold 8', exact: true }),
  ).toBeVisible();
  await j.shot('devices listing');
  await page.locator('a[href$="/add-to-cart/315"]').click();

  // 3. Cart / configurator
  await expect(page).toHaveURL(/\/cart/, { timeout: 30_000 });
  await page.getByRole('tab', { name: 'Graphite' }).click();
  await page.getByRole('button', { name: '16GB+1TB' }).click();
  await page.getByRole('heading', { name: 'yes 5g advanced prepaid' }).click();
  await page.locator('#page-main').getByRole('button', { name: 'Prepaid' }).click();
  await page.getByRole('button', { name: 'Yes 5g advanced prepaid RM 0' }).click();
  await page.getByRole('button', { name: 'SIM card' }).click();
  await j.shot('cart configured');

  const cartNext = page.getByRole('button', { name: 'Next' });
  await expect(cartNext).toBeEnabled();
  await cartNext.click();

  // 4. Verify Personal Details
  await expect(page).toHaveURL(/\/verification/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Verify Personal Details' })).toBeVisible();

  await page.getByLabel('ID Type *').selectOption('MyKad');
  await page.getByRole('textbox', { name: 'ID Number' }).fill(MOCK.idNumber);
  await page.getByRole('textbox', { name: 'Full Name *' }).fill(MOCK.fullName);
  await page.getByRole('spinbutton', { name: 'Phone Number' }).fill(MOCK.phone);
  await page.getByRole('textbox', { name: 'Email Address *' }).fill(MOCK.email);

  // DOB + gender are auto-derived from the MyKad number
  await expect(page.getByRole('textbox', { name: 'Date Of Birth *' })).toHaveValue(MOCK.dob);

  // The real checkboxes are covered by an overlay - click their labels instead
  await page.getByText('By activating the Yes Service').click();
  await page.getByText('I further give consent to').click();
  await j.shot('verify personal details');

  const verificationNext = page.getByRole('button', { name: 'Next' });
  await expect(verificationNext).toBeEnabled();
  await verificationNext.click();

  // 4b. Manual eKYC. Next either advances to /accessories (no gate on this
  // flow) or the page re-renders with a "Verify Now" link. In the latter case
  // park for the person to pass the real check, then press Next again if the
  // page didn't advance on its own.
  const verifyNow = page.getByRole('link', { name: 'Verify Now' });
  const outcome = await Promise.race([
    page.waitForURL(/\/accessories/, { timeout: 60_000 }).then(() => 'advanced' as const),
    verifyNow.waitFor({ state: 'visible', timeout: 60_000 }).then(() => 'ekyc' as const),
  ]);
  if (outcome === 'ekyc') {
    await j.shot('ekyc gate');
    const result = await waitForManualEkyc(page, {
      advanceUrl: /\/accessories/,
      next: verificationNext,
    });
    if (result === 'next-enabled') await clickEnabled(verificationNext);
  }

  // 5. Accessories - skip
  await expect(page).toHaveURL(/\/accessories/, { timeout: 30_000 });
  await j.shot('accessories');
  await page.getByRole('button', { name: 'Next' }).click();

  // 6. Delivery address
  await expect(page).toHaveURL(/\/delivery-addresses/, { timeout: 30_000 });
  await page.getByRole('textbox', { name: 'Address *' }).fill(MOCK.address);
  await page.getByRole('textbox', { name: 'Unit No.' }).fill(MOCK.unitNo);
  await page.getByRole('textbox', { name: 'Postal Code *' }).fill(MOCK.postalCode);
  await expect(page.getByRole('textbox', { name: 'State *' })).toHaveValue(MOCK.state);
  await expect(page.getByRole('textbox', { name: 'City *' })).toHaveValue(MOCK.city);
  await j.shot('delivery address');
  const addressNext = page.getByRole('button', { name: 'Next' });
  await expect(addressNext).toBeEnabled();
  await addressNext.click();

  // 7. Payment - Online Banking (FPX), Maybank2U (mock)
  await page.locator('label').filter({ hasText: 'Online Banking (FPX)' }).click();
  await page.locator('#select-bank').selectOption('Maybank2U');
  await j.shot('payment');
  const payNow = page.getByRole('button', { name: 'Pay Now' });
  await expect(payNow).toBeEnabled();
  const popupPromise = page.waitForEvent('popup');
  await payNow.click();
  const bankPage = await popupPromise;

  // 8. Mock bank page -> choose Success (popup closes itself on click)
  await expect(
    bankPage.getByRole('heading', { name: 'Welcome to Razorpay Curlec Bank' }),
  ).toBeVisible({ timeout: 45_000 });
  await j.shot('mock bank page', bankPage);
  await bankPage.getByRole('button', { name: 'Success' }).click().catch(() => {
    /* popup navigates/closes as a result of the click */
  });

  // 9. Thank you / order confirmation
  await page.waitForURL(/\/thankyou/, { timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  await expect(page.getByText('Tracking / Order Number')).toBeVisible();
  await expect(page.getByText(/^Y5GA\d+$/)).toBeVisible();
  await j.shot('thank you');
});
