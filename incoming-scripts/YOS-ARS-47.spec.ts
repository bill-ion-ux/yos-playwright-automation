import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://yesmy-dev:YesMyDev123$@yesmy-dev.azurewebsites.net/devices/');
  await page.getByRole('button', { name: 'Devices' }).click();
  await page.getByRole('link', { name: 'Explore Devices' }).click();
  await expect(page.getByText('5G Advanced-compatible Samsung Galaxy Z Fold 8 RRP RM 8,099 COMES WITH FREE')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Buy Now' }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Buy Now' }).first().click();
  await expect(page.locator('section').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Graphite' }).click();
  await page.getByRole('heading', { name: 'yes 5g advanced prepaid' }).click();
  await page.getByText('yes 5g advanced prepaid Postpaid: Cashback up to RM4,320Prepaid: Free 3 months').click();
  await page.locator('#page-main').getByRole('button', { name: 'Prepaid' }).click();
  await page.getByRole('button', { name: 'Yes 5g advanced prepaid RM 0' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('ID Type *').selectOption('MYKAD');
  await page.getByRole('textbox', { name: 'ID Number' }).fill('0203140301532');
  await page.getByRole('textbox', { name: 'Full Name *' }).click();
  await page.getByRole('textbox', { name: 'Full Name *' }).click();
  await page.getByRole('textbox', { name: 'Full Name *' }).fill('USERTEST');
  await page.getByRole('spinbutton', { name: 'Phone Number' }).click();
  await expect(page.locator('#gender1')).toHaveValue('0');
  await page.getByRole('button', { name: 'HOT', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Date Of Birth *' })).toHaveValue('14/03/2002');
  await page.getByRole('spinbutton', { name: 'Phone Number' }).click();
  await page.getByRole('spinbutton', { name: 'Phone Number' }).fill('01293902937');
  await page.getByRole('textbox', { name: 'Email Address *' }).click();
  await page.getByRole('textbox', { name: 'Email Address *' }).fill('USER@GMAIL.COm');
  await page.getByText('By activating the Yes Service').click();
  await page.getByText('I further give consent to').click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.layer-accessoriesSlider')).toBeVisible();
  await page.locator('.layer-accessoriesSlider').click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('textbox', { name: 'Address *' }).click();;
  await page.getByRole('textbox', { name: 'Address *' }).fill('JALAN PEKELILING1');
  await page.getByRole('textbox', { name: 'Unit No.' }).click();
  await page.getByRole('textbox', { name: 'Unit No.' }).fill('19');
  await page.getByRole('textbox', { name: 'Postal Code *' }).click();
  await page.getByRole('textbox', { name: 'Postal Code *' }).fill('51000');
  await expect(page.getByRole('textbox', { name: 'State *' })).toHaveValue('WILAYAH PERSEKUTUAN KUALA LUMPUR');
  await expect(page.getByRole('textbox', { name: 'City *' })).toHaveValue('KUALA LUMPUR');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.goto('https://yesshop-dev.azurewebsites.net/samsung-galaxy-z-fold-8-old-315/payment');
  await expect(page.getByRole('paragraph').filter({ hasText: 'Approximately 5-7 working' })).toBeVisible();
  await page.locator('label').filter({ hasText: 'Online Banking (FPX)' }).click();
  await page.locator('#select-bank').selectOption('MB2U');
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Pay Now' }).click();
  const page1 = await page1Promise;

  // In this dev environment the FPX popup often closes immediately because the
  // gateway session is never created (main page then shows "Unable to process
  // request"). Race the three possible outcomes so the test fails with a clear
  // reason instead of "Target page ... has been closed".
  const bankPage = page1.getByText('Welcome to Razorpay Curlec Bank');
  const backendError = page.getByRole('heading', { name: 'Unable to process request' });

  const outcome = await Promise.race([
    bankPage.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'gateway' as const),
    page1.waitForEvent('close', { timeout: 30000 }).then(() => 'popup-closed' as const),
    backendError.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'backend-error' as const),
  ]).catch(() => 'timeout' as const);

  expect(
    outcome,
    `Payment could not start (outcome: ${outcome}). The FPX/Razorpay gateway session ` +
      `was not created by yesshop-dev - this is a backend/environment issue, not a script bug.`,
  ).toBe('gateway');

  // Gateway page is up - complete the mock payment
  await page1.getByRole('button', { name: 'Success' }).click();

  // Let the app redirect itself back to the thank-you page
  await page.waitForURL(/thankyou/, { timeout: 60000 });
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  await expect(page.getByText(/^Y5GA\d+$/)).toBeVisible();
});