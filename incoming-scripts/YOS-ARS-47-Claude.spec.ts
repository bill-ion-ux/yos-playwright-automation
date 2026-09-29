import { test, expect } from '@playwright/test';

/**
 * YOS-ARS-47-Claude
 *
 * End-to-end purchase of the Samsung Galaxy Z Fold 8 (prepaid bundle) from the
 * Yes "All Devices" listing, filling every form with mock data and completing
 * the FPX mock payment through to the "Thank you!" confirmation.
 *
 * Built by driving the real site with playwright-cli; selectors are role-based
 * and verified against live snapshots.
 */

const DEVICES_URL =
  'https://yesmy-dev:YesMyDev123$@yesmy-dev.azurewebsites.net/devices/';

// Mock customer data
const MOCK = {
  // MyKad YYMMDD-PB-###G -> site derives DOB 15/02/1990 and gender from it
  idNumber: '900215085432',
  dob: '15/02/1990',
  fullName: 'SITI NURULHUDA BINTI AHMAD',
  phone: '0192345678',
  email: 'siti.nurulhuda.test@gmail.com',
  address: 'NO 8 JALAN BUKIT BINTANG',
  unitNo: '12-3',
  postalCode: '55100',
  state: 'WILAYAH PERSEKUTUAN KUALA LUMPUR',
  city: 'KUALA LUMPUR',
};

test('Buy Samsung Galaxy Z Fold 8 with successful FPX mock payment', async ({ page }) => {
  // This journey crosses several cold-start Azure apps + a payment redirect chain.
  test.setTimeout(180_000);

  // 1. All Devices listing
  await page.goto(DEVICES_URL);
  await page.getByRole('button', { name: 'Devices' }).click();
  await page.getByRole('link', { name: 'Explore Devices' }).click();

  // 2. Pick the Galaxy Z Fold 8 card (product 315), not the "Ultra" variant
  await expect(
    page.getByRole('heading', { name: 'Galaxy Z Fold 8', exact: true }),
  ).toBeVisible();
  await page.locator('a[href$="/add-to-cart/315"]').click();

  // 3. Cart / configurator
  await expect(page).toHaveURL(/\/cart/, { timeout: 30_000 });
  await page.getByRole('tab', { name: 'Graphite' }).click();
  await page.getByRole('button', { name: '12GB+512GB' }).click();
  await page.getByRole('heading', { name: 'yes 5g advanced prepaid' }).click();
  await page.locator('#page-main').getByRole('button', { name: 'Prepaid' }).click();
  await page.getByRole('button', { name: 'Yes 5g advanced prepaid RM 0' }).click();
  await page.getByRole('button', { name: 'SIM card' }).click();

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

  const verificationNext = page.getByRole('button', { name: 'Next' });
  await expect(verificationNext).toBeEnabled();
  await verificationNext.click();

  // 5. Accessories - skip
  await expect(page).toHaveURL(/\/accessories/, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Next' }).click();

  // 6. Delivery address
  await expect(page).toHaveURL(/\/delivery-addresses/, { timeout: 30_000 });
  await page.getByRole('textbox', { name: 'Address *' }).fill(MOCK.address);
  await page.getByRole('textbox', { name: 'Unit No.' }).fill(MOCK.unitNo);
  await page.getByRole('textbox', { name: 'Postal Code *' }).fill(MOCK.postalCode);

  // State + city are auto-filled from the postal code
  await expect(page.getByRole('textbox', { name: 'State *' })).toHaveValue(MOCK.state);
  await expect(page.getByRole('textbox', { name: 'City *' })).toHaveValue(MOCK.city);

  const addressNext = page.getByRole('button', { name: 'Next' });
  await expect(addressNext).toBeEnabled();
  await addressNext.click();

  // 7. Payment - Online Banking (FPX), Maybank2U (mock)
  await expect(page).toHaveURL(/\/payment/, { timeout: 30_000 });
  await page.locator('label').filter({ hasText: 'Online Banking (FPX)' }).click();
  await page.locator('#select-bank').selectOption('Maybank2U');

  const payNow = page.getByRole('button', { name: 'Pay Now' });
  await expect(payNow).toBeEnabled();

  const popupPromise = page.waitForEvent('popup');
  await payNow.click();
  const bankPage = await popupPromise;

  // 8. Mock bank page -> choose Success (popup closes itself on click)
  await expect(
    bankPage.getByRole('heading', { name: 'Welcome to Razorpay Curlec Bank' }),
  ).toBeVisible({ timeout: 45_000 });
  await bankPage.getByRole('button', { name: 'Success' }).click().catch(() => {
    /* popup navigates/closes as a result of the click */
  });

  // 9. Thank you / order confirmation
  await page.waitForURL(/\/thankyou/, { timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  await expect(page.getByText('Tracking / Order Number')).toBeVisible();
  await expect(page.getByText(/^Y5GA\d+$/)).toBeVisible();
});
