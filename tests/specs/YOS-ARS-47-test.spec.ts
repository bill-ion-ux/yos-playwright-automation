import { test, expect } from '../fixtures';
import { DeliveryAddressPage } from '../pages/delivery-address.page';
import { makeCustomer } from '../support/identity';
import { journey } from '../support/journey';
import { PaymentPage } from '../pages/payment.page';

/**
 * YOS-ARS-47 (restructured)
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

// Fresh identity per run - yesshop-dev caps purchases per MyKad and keys
// accounts on email. See tests/support/identity.ts.
const MOCK = makeCustomer();

test('Buy Samsung Galaxy Z Fold 8 with successful FPX mock payment', async ({ page }, testInfo) => {
  // This journey crosses several cold-start Azure apps + a payment redirect chain.
  test.setTimeout(180_000);
  const j = journey(page, testInfo);

  // 1. All Devices listing (fixture already landed us on the site root)
  await page.getByRole('button', { name: 'Devices' }).click();
  await page.getByRole('link', { name: 'Explore Devices' }).click();

  // 2. Pick the Galaxy Z Fold 8 card (product 315), not the "Ultra" variant.
  await expect(page.getByRole('heading', { name: 'Galaxy Z Fold 8', exact: true }),).toBeVisible();
  await j.shot('devices listing');
  await page.locator('a[href$="/add-to-cart/315"]').click();

  // 3. Cart / configurator
  await expect(page).toHaveURL(/\/cart/, { timeout: 30_000 });
  await page.getByRole('tab', { name: 'Cream' }).click();
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

  // 5. Accessories - skip
  await expect(page).toHaveURL(/\/accessories/, { timeout: 30_000 });
  await j.shot('accessories');
  await page.getByRole('button', { name: 'Next' }).click();

  // 6. Delivery address
  await expect(page).toHaveURL(/\/delivery-addresses/, { timeout: 30_000 });
  const deliveryAddressPage = new DeliveryAddressPage(page);
  await deliveryAddressPage.fillDeliveryAdress(MOCK);
  await j.shot('delivery address');
  await deliveryAddressPage.clickNext();

  // 7. Payment - Online Banking (FPX), Maybank2U (mock)
  await expect(page).toHaveURL(/\/payment/, { timeout: 30_000 });
  const paymentPage = new PaymentPage(page);
  await paymentPage.selectOnlineBanking();
  await paymentPage.selectBank('Maybank2U');
  await j.shot('payment');
  const bankPage = await paymentPage.clickPayNow();

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
