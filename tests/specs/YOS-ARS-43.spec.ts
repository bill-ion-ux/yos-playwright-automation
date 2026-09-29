import { test, expect } from '../fixtures';
import { makeRealCustomer } from '../support/identity';
import { clickEnabled, waitForManualEkyc } from '../support/ekyc';
import { journey } from '../support/journey';

/**
 * YOS-ARS-43 (restructured)
 *
 * End-to-end purchase of a Yes 5G Wireless Broadband plan ("Flexi", SIM-only,
 * no contract) as a NEW LINE, filling every form with mock data and completing
 * the FPX mock payment through to the "Thank you!" order confirmation.
 *
 * The fixture (tests/fixtures.ts) has already handled HTTP basic auth,
 * navigated to the YOS site root, waited out the Azure cold start and
 * dismissed the homepage pre-order modal - so this spec starts by opening the
 * Broadband menu, not by calling page.goto().
 *
 * Broadband is a POSTPAID journey: the /broadband/verification step gates on
 * the VIDA eKYC identity check (real doc scan + selfie), which no unattended
 * identity can pass and the backend now enforces server-side. So this spec is
 * HUMAN-ASSISTED: it fills the form with the tester's own MyKad details
 * (EKYC_* in .env), presses Next, then parks until the person completes
 * the eKYC (scan the QR with a phone / "Verify Now"; budget 5 min, EKYC_WAIT_MS to change) and resumes by itself
 * the moment the site accepts the result. Run it headed:
 *
 *   ./run.sh YOS-ARS-43.spec.ts --headed
 *
 * Click-path discovered live with playwright-cli:
 *   /  -> nav "Broadband" -> "WiFi" (-> /yes-5g-broadband/)
 *      -> "Get It Now" on the Flexi plan card (a[href$="/broadband/add-to-cart/44"])
 *      -> /broadband/cart        (New Line + No Contract, plan pre-selected)
 *      -> /broadband/verification (MyKad personal details + eKYC; Next pressed twice)
 *      -> /broadband/addons      (skip)
 *      -> /broadband/delivery-addresses
 *      -> /broadband/payment     (Online Banking (FPX) / Maybank2U -> Pay Now)
 *      -> Razorpay Curlec mock bank popup -> Success
 *      -> /broadband/thankyou    (order number matches /^YWF\d+$/)
 */

// Manual eKYC scans a real MyKad, so this journey always uses the tester's own
// identity (EKYC_* in .env). No retries - a retry would make them redo eKYC.
// Note the per-ID postpaid order cap on yesshop-dev (~15).
test.describe.configure({ retries: 0 });

const MOCK = makeRealCustomer();

// Declared here so afterEach can write the Word artifact even if the test fails midway.
let j: ReturnType<typeof journey> | undefined;
test.afterEach(async () => {
  await j?.writeArtifact();
});

test('Buy Yes 5G Wireless Broadband (Flexi) new line with successful FPX mock payment', async ({
  page,
}, testInfo) => {
  // This journey crosses several cold-start Azure apps + a payment redirect chain.
  // Budget includes the human eKYC wait (EKYC_WAIT_MS, default 5 min).
  test.setTimeout(15 * 60_000);
  j = journey(page, testInfo, {
    fields: { MyKad: MOCK.idNumber, Name: MOCK.fullName, Email: MOCK.email, Phone: MOCK.phone },
  });

  // 1 + 2. Navigate to Broadband (fixture already landed us on the site root).
  await page.getByRole('button', { name: 'Broadband' }).click();
  await page.getByRole('link', { name: 'WiFi', exact: true }).first().click();
  await expect(page).toHaveURL(/\/yes-5g-broadband\//, { timeout: 30_000 });

  // 3 + 4. Select the Broadband plan (Flexi - SIM only, no contract) and Buy Now.
  await expect(
    page.getByRole('heading', { name: 'Discover Our Broadband Plans' }),
  ).toBeVisible();
  await j.shot('broadband plans');
  await page.locator('a[href$="/broadband/add-to-cart/44"]').click();

  // Cart / configurator.
  await expect(page).toHaveURL(/\/broadband\/cart/, { timeout: 30_000 });
  await expect(
    page.getByRole('heading', { name: 'Yes 5G Wireless Broadband_Flexi' }).first(),
  ).toBeVisible({ timeout: 30_000 });

  // 5. New Line (the only "Choose An Action" option for this plan).
  await page.locator('.layer-action-inner').filter({ hasText: 'New Line' }).click();
  // Contract period - "No Contract" is the only option offered for Flexi.
  await page.getByRole('button', { name: 'No Contract' }).click();
  await j.shot('cart configured');

  const cartNext = page.getByRole('button', { name: 'Next' });
  await expect(cartNext).toBeEnabled();
  await cartNext.click();

  // 7 - 10. Verify Personal Details.
  await expect(page).toHaveURL(/\/broadband\/verification/, { timeout: 30_000 });
  await expect(
    page.getByRole('heading', { name: 'Verify Personal Details' }),
  ).toBeVisible();

  // 8. ID Type = MyKad.
  await page.getByLabel('ID Type *').selectOption('MyKad');
  // 9. MyKad number.
  await page.getByRole('textbox', { name: 'ID Number' }).fill(MOCK.idNumber);
  // 7. Full name, contact number, email address.
  await page.getByRole('textbox', { name: 'Full Name *' }).fill(MOCK.fullName);
  await page.getByRole('spinbutton', { name: 'Phone Number' }).fill(MOCK.phone);
  await page.getByRole('textbox', { name: 'Email ID *' }).fill(MOCK.email);

  // DOB + gender are auto-derived from the MyKad number.
  await expect(page.getByRole('textbox', { name: 'Date Of Birth *' })).toHaveValue(
    MOCK.dob,
  );

  // 10. The two consent checkboxes are covered by an overlay - click their labels.
  await page.getByText('By activating the Yes Service').click();
  await page.getByText('I further give consent to').click();
  await j.shot('verify personal details');

  // 11. Next -> the page shows the eKYC gate (QR / "Verify Now") and Next goes
  // disabled while the backend polls for the VIDA result.
  const verifyNext = page.getByRole('button', { name: 'Next' });
  await expect(verifyNext).toBeEnabled();
  await verifyNext.click();
  const advanceUrl = /\/broadband\/addons/;
  // The gate is either the desktop->mobile QR handoff ("Scan with your phone
  // camera...") or, on newer builds, a "Verify Now" link.
  const ekycGate = page
    .getByText('Scan with your phone camera')
    .or(page.getByRole('link', { name: 'Verify Now' }));
  await Promise.race([
    ekycGate.first().waitFor({ state: 'visible', timeout: 60_000 }),
    page.waitForURL(advanceUrl, { timeout: 60_000 }),
  ]);
  await j.shot('ekyc gate');

  // 12. Manual eKYC: wait (up to 5 min) until the site accepts it, then press
  // Next again unless the page already advanced.
  if (!advanceUrl.test(page.url())) {
    const result = await waitForManualEkyc(page, { advanceUrl, next: verifyNext });
    if (result === 'next-enabled') await clickEnabled(verifyNext);
  }

  // Add-ons - skip.
  await expect(page).toHaveURL(/\/broadband\/addons/, { timeout: 30_000 });
  await j.shot('add-ons');
  await page.getByRole('button', { name: 'Next' }).click();

  // 13. Delivery address.
  await expect(page).toHaveURL(/\/broadband\/delivery-addresses/, { timeout: 30_000 });
  await page.getByRole('textbox', { name: 'Address *' }).fill(MOCK.address);
  await page.getByRole('textbox', { name: 'Unit No.' }).fill(MOCK.unitNo);
  await page.getByRole('textbox', { name: 'Postal Code *' }).fill(MOCK.postalCode);

  // State + City are auto-filled from the postal code.
  await expect(page.getByRole('textbox', { name: 'State *' })).toHaveValue(MOCK.state);
  await expect(page.getByRole('textbox', { name: 'City *' })).toHaveValue(MOCK.city);
  await j.shot('delivery address');

  // 14. Next.
  const addressNext = page.getByRole('button', { name: 'Next' });
  await expect(addressNext).toBeEnabled();
  await addressNext.click();

  // 15. Payment - Online Banking (FPX), Maybank2U (mock) -> Pay Now.
  await expect(page).toHaveURL(/\/broadband\/payment/, { timeout: 30_000 });
  await page.locator('label').filter({ hasText: 'Online Banking (FPX)' }).click();
  await page.locator('#select-bank').selectOption('Maybank2U');
  await j.shot('payment');

  const payNow = page.getByRole('button', { name: 'Pay Now' });
  await expect(payNow).toBeEnabled();

  const popupPromise = page.waitForEvent('popup');
  await payNow.click();
  const bankPage = await popupPromise;

  // Mock bank page -> choose Success (the popup closes itself on click).
  await expect(
    bankPage.getByRole('heading', { name: 'Welcome to Razorpay Curlec Bank' }),
  ).toBeVisible({ timeout: 45_000 });
  await j.shot('mock bank page', bankPage);
  await bankPage
    .getByRole('button', { name: 'Success' })
    .click()
    .catch(() => {
      /* popup navigates/closes as a result of the click */
    });

  // 16. Thank you / order confirmation - observe the order number.
  await page.waitForURL(/\/broadband\/thankyou/, { timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  await expect(page.getByText('Tracking / Order Number')).toBeVisible();
  await expect(page.getByText(/^YWF\d+$/)).toBeVisible();
  await j.shot('thank you');
});
