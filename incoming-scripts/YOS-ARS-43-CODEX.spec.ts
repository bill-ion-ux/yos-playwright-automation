import { expect, test } from '@playwright/test';

// Keep this scenario headed so the complete purchase journey is visible when it runs.
test.use({ headless: false });

test('YOS-ARS-43-CODEX: purchase a device and enter delivery details', async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto('c');

  // Device selection
  await page.getByRole('button', { name: 'Devices' }).click();
  await page
    .getByRole('link', { name: /All devices|Explore Devices/i })
    .first()
    .click();

  const deviceList = page.locator('#device-list-section');
  await expect(deviceList).toContainText('Galaxy A57 5G');
  const device = page
    .locator('.layer-planDevice')
    .filter({ hasText: 'Galaxy A57 5G' })
    .first();
  await device.locator('.panel-btn .btn').click();

  // Device variant, storage, plan, and SIM
  await page.getByRole('tab', { name: /^Black$/i }).click();

  // Storage values differ by device. Select the first available storage option.
  const storageOptions = page
    .getByRole('button')
    .filter({ hasText: /^\s*\d+\s*(GB|TB)\s*$/i });
  await expect(storageOptions.first()).toBeVisible();
  await storageOptions.first().click();

  await page.locator('.layer-action-payment-plan-inner > .image-section').click();
  await page.getByRole('button', { name: /36 Months/i }).click();

  const plan = page
    .getByRole('button')
    .filter({ hasText: /RM\s*[\d,.]+\s*\/?mth/i })
    .first();
  await expect(plan).toBeVisible();
  await plan.click();

  await expect(page.locator('body')).toContainText(/RM\s*[\d,.]+\s*\/?mth/i);
  await expect(page.locator('body')).toContainText(/36\s*Months/i);
  await expect(page.getByRole('heading').filter({ hasText: /Infinite|Plan/i }).first()).toBeVisible();

  await page.getByRole('button', { name: /eSIM|Physical SIM|SIM/i }).first().click();
  await page.getByRole('button', { name: /Add to cart/i }).click();

  // Verification / personal details
  await expect(page.getByRole('heading', { name: /Verify Personal Details/i })).toBeVisible();
  await page.getByLabel('ID Type *').selectOption('PASSPORT');
  await page.getByRole('textbox', { name: 'ID Number' }).fill('P5833558');
  await page.getByRole('textbox', { name: 'Full Name *' }).fill('TESTUSER');
  await page.locator('#gender1').selectOption('1');
  await page.getByRole('textbox', { name: 'Date Of Birth *' }).fill('06/02/1983');
  await page.getByRole('spinbutton', { name: 'Phone Number' }).fill('0149645779');
  await page.getByRole('textbox', { name: 'Email Address *' }).fill('OBRMEMAIL@GMAIL.COM');
  await page.getByText('By activating the Yes Service').click();
  await page.getByText('I further give consent to').click();

  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'PROCEED' }).click();

  // The order summary must include the device price for _U plans.
  await expect(page.locator('body')).toContainText(/_U/);
  await expect(page.locator('body')).toContainText(/device\s*price/i);
  await expect(page.locator('body')).toContainText(/RM\s*[\d,.]+/i);

  await page.getByRole('button', { name: 'Next' }).click();

  // Accessories
  await expect(page.getByRole('heading').filter({ hasText: /Accessories/i }).first()).toBeVisible();
  const accessory = page.locator('input[type="checkbox"]:visible').first();
  if (await accessory.count()) {
    await accessory.check();
  } else {
    await page.getByText(/Add accessory|Select accessory/i).first().click();
  }

  // Delivery address
  await page.getByRole('textbox', { name: 'Address *' }).fill('11, JLN PANTAI SENTRAL 3 PANTAI DALAM');
  await page.getByRole('textbox', { name: 'Unit No.' }).fill('19-23');
  await page.getByRole('textbox', { name: 'Postal Code *' }).fill('59200');
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page).toHaveURL(/payment/, { timeout: 30_000 });
});
