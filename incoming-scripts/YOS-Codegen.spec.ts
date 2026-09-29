import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://yesmy-dev:YesMyDev123$@yesmy-dev.azurewebsites.net/devices/');

  await page.getByRole('button', { name: 'Devices' }).click();
  await page.getByRole('link', { name: 'Explore Devices' }).click();
  await page.locator('div:nth-child(7) > .layer-planDevice > .bottom-section > .panel-btn > .btn').click();
  await expect(page.getByRole('heading', { name: 'SAMSUNG - Samsung Galaxy Z' })).toBeVisible();
  await page.locator('.listing-dcColorsSelect > li:nth-child(3)').click();
  await page.getByRole('button', { name: '16GB+1TB' }).click();
  await page.locator('div:nth-child(3) > .layer-action-payment-plan-inner > .image-section').click();
  await page.locator('#page-main').getByRole('button', { name: 'Prepaid' }).click();
  await page.getByRole('button', { name: 'Yes 5g advanced prepaid RM 0' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('ID Type *').selectOption('MYKAD');
  await page.getByRole('textbox', { name: 'ID Number' }).click();
  await page.getByRole('textbox', { name: 'ID Number' }).fill('050313030143');
  await page.getByRole('textbox', { name: 'Full Name *' }).click();
  await page.getByRole('textbox', { name: 'Full Name *' }).fill('NABIL IRFAN BIN MUHAMAD SAKOWi');
  await page.getByRole('spinbutton', { name: 'Phone Number' }).click();
  await page.getByRole('spinbutton', { name: 'Phone Number' }).fill('0169056557');
  await page.getByRole('textbox', { name: 'Email Address *' }).click();
  await page.getByRole('textbox', { name: 'Email Address *' }).fill('NABILIRFANSAKOWI@GMAIL.COm');
  await page.getByText('By activating the Yes Service').click();
  await page.getByText('I further give consent to').click();
  await page.getByRole('button', { name: 'Next' }).click();
  
  await expect(page.getByRole('heading', { name: 'Accessories' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('textbox', { name: 'Address *' }).click();
  await page.getByRole('textbox', { name: 'Address *' }).fill('JALAN PANTAI SENTRAL 3');
  await page.getByRole('textbox', { name: 'Postal Code *' }).click();
  await page.getByRole('textbox', { name: 'Postal Code *' }).fill('53000');
  await page.getByRole('button', { name: 'Next' }).click();
});