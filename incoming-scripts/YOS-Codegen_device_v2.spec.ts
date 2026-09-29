import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://yesmy-dev:YesMyDev123$@yesmy-dev.azurewebsites.net/devices/');
  await page.getByRole('button', { name: 'Devices' }).click();
  await page.getByRole('link', { name: 'Explore Devices' }).click();
  await page.getByRole('link', { name: 'Buy Now' }).nth(3).click();
  await page.getByRole('button', { name: '16GB+1TB' }).click();
  await page.locator('.layer-action-payment-plan-inner.selected').click();
  await page.locator('#page-main').getByRole('button', { name: 'Prepaid' }).click();
  await page.getByRole('button', { name: 'Yes 5g advanced prepaid RM 0' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/\/verification/, { timeout: 30_000 });
  await page.getByLabel('ID Type *').selectOption('MYKAD');
  await page.getByRole('textbox', { name: 'ID Number' }).click();
  await page.getByRole('textbox', { name: 'ID Number' }).fill('050707080098');
  await page.getByRole('textbox', { name: 'Full Name *' }).click();
  await page.getByRole('textbox', { name: 'Full Name *' }).fill('RABIATUL NABILA BINTI TAJUDIn');
  await page.getByRole('spinbutton', { name: 'Phone Number' }).click();
  await page.getByRole('spinbutton', { name: 'Phone Number' }).fill('0168898888');
  await page.getByRole('textbox', { name: 'Email Address *' }).click();
  await page.getByRole('textbox', { name: 'Email Address *' }).fill('USER@GMAIL.COm');
  await page.getByText('By activating the Yes Service').click();
  await page.getByText('I further give consent to').click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/\/accessories/, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/\/delivery-addresses/, { timeout: 30_000 });

  await page.getByRole('textbox', { name: 'Address *' }).click();
  await page.getByRole('textbox', { name: 'Address *' }).fill('JALAN PANTAI SENTRAl');
  await page.getByRole('textbox', { name: 'Postal Code *' }).click();
  await page.getByRole('textbox', { name: 'Postal Code *' }).fill('55000');
  await expect(page.getByRole('textbox', { name: 'State *' })).toHaveValue('WILAYAH PERSEKUTUAN KUALA LUMPUR');
  await page.getByRole('button', { name: 'Next' }).click();
});