import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://yesmy-dev:YesMyDev123$@yesmy-dev.azurewebsites.net/devices/');
  await page.getByRole('button', { name: 'Devices' }).click();
  await page.getByRole('listitem').nth(3).click();
  await page.getByRole('link', { name: 'Buy Now' }).nth(3).click();
  await page.getByRole('img', { name: 'yes 5g advanced prepaid' }).click();
  await page.locator('#page-main').getByRole('button', { name: 'Prepaid' }).click();
  await page.locator('.right_button').click();
});