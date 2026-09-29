import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.yes.my/');
  await page.getByRole('button', { name: 'Devices' }).click();
  await page.getByRole('link', { name: 'Explore Devices' }).click();
  await expect(page.getByRole('heading', { name: 'Galaxy Z Fold 8', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Buy Now' }).nth(4).click();
  await page.getByRole('button', { name: '16GB+1TB' }).click();
  await page.locator('div:nth-child(3) > .layer-action-payment-plan-inner').click();
  await page.getByRole('button', { name: 'Prepaid' }).click();
  await page.getByRole('button', { name: 'yes 5g advanced prepaid RM 0' }).click();
  await page.getByRole('button', { name: 'eSIM' }).click();
  await page.locator('section').first().click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Verify Personal Details' })).toBeVisible();
  await page.getByLabel('ID Type *').selectOption('MYKAD');
  await page.getByRole('textbox', { name: 'ID Number' }).press('ArrowUp');
  await page.getByRole('textbox', { name: 'ID Number' }).press('ArrowUp');
  await page.getByRole('textbox', { name: 'ID Number' }).click();
  await page.getByRole('textbox', { name: 'ID Number' }).press('Insert');
  await page.getByRole('textbox', { name: 'ID Number' }).press('NumLock');
  await page.getByRole('textbox', { name: 'ID Number' }).fill('050313030143');
  await page.getByRole('textbox', { name: 'Full Name *' }).click();
  await page.getByRole('textbox', { name: 'Full Name *' }).fill('NABIL IRFAN BIN MUHAMAD SAKOWi');
  await page.getByRole('spinbutton', { name: 'Phone Number' }).click();
  await page.getByRole('spinbutton', { name: 'Phone Number' }).fill('0169056557');
  await page.getByRole('textbox', { name: 'Email Address *' }).click();
  await page.getByRole('textbox', { name: 'Email Address *' }).fill('USER@GMAIL.COm');
  await page.getByText('By activating the Yes Service').click();
  await page.getByText('I further give consent to').click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Accessories' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Delivery Address' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Address *' }).click();
  await page.getByRole('textbox', { name: 'Address *' }).fill('JALAN SENTRAl');
  await page.getByRole('textbox', { name: 'Postal Code *' }).click();
  await page.getByRole('textbox', { name: 'Postal Code *' }).fill('55000');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForURL(/\/payment/, { timeout: 30_000 });
});

// the scripts took around 2 minutes to completed using codegen
// the scripts took around 30s to run using playwright test
