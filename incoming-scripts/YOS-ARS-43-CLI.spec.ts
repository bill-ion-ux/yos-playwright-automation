import { test, expect } from '@playwright/test';

// Run this spec headed so the flow is visible in real time.
test.use({ headless: false });

test('YOS-ARS-43-CLI: device -> plan -> personal details -> delivery address', async ({ page }) => {
  // This is a long multi-page purchase flow; give it room beyond the default 60s.
  test.setTimeout(180_000);

  // 1. Navigate to the Devices page on the dev environment
  await page.goto('https://yesmy-dev:YesMyDev123$@yesmy-dev.azurewebsites.net/devices/');

  // --- Device Selection ---
  // 2. Click the "Devices" button
  await page.getByRole('button', { name: 'Devices' }).click();
  // 3. Click the "Explore Devices" link
  await page.getByRole('link', { name: 'Explore Devices' }).click();
  // 4. Verify the device list shows "Galaxy A57 5G"
  await expect(page.locator('#device-list-section')).toContainText('Galaxy A57 5G');
  // 5. Click the plan/device panel for that device (15th item in the list)
  await page.locator('#device-list-section div:nth-child(15) > .layer-planDevice > .bottom-section > .panel-btn > .btn').click();

  // --- Plan & Color Configuration ---
  // 6. Select the "Awesome Navy" color tab
  await page.getByRole('tab', { name: 'Awesome Ice Blue' }).click();
  // 7. Click the payment plan image section to proceed
  await page.locator('.layer-action-payment-plan-inner > .image-section').click();
  // 8. Select the "36 Months" contract term
  await page.getByRole('button', { name: '36 Months' }).click();
  // 9. Select the "Infinite+ Premium RM 118/mth" plan
  await page.getByRole('button', { name: 'Infinite+ Premium RM 118 /mth' }).click();
  // 10. Verify the "InfinitePlus Premium" heading appears
  await expect(page.getByRole('heading', { name: /InfinitePlus Premium/ })).toBeVisible();
  // 11. Select "eSIM" as the SIM type
  await page.getByRole('button', { name: 'eSIM' }).click();
  // 12. Click "Next"
  await page.getByRole('button', { name: 'Next' }).click();

  // --- Personal Details ---
  // 13. Verify the "Verify Personal Details" screen appears
  await expect(page.getByRole('heading', { name: 'Verify Personal Details' })).toBeVisible();
  // 14. Set ID Type to "PASSPORT"
  await page.getByLabel('ID Type *').selectOption('PASSPORT');
  // 15. Enter ID Number
  await page.getByRole('textbox', { name: 'ID Number' }).fill('P5833558');
  // 16. Enter Full Name
  await page.getByRole('textbox', { name: 'Full Name *' }).fill('TESTUSER');
  // 17. Select gender (option 1)
  await page.locator('#gender1').selectOption('1');
  // 18. Enter Date of Birth
  await page.getByRole('textbox', { name: 'Date Of Birth *' }).fill('06/02/1983');
  // 19. Enter Phone Number
  await page.getByRole('spinbutton', { name: 'Phone Number' }).fill('0149645779');
  // 20. Enter Email
  await page.getByRole('textbox', { name: 'Email Address *' }).fill('OBRMEMAIL@GMAIL.COM');
  // 21. Check the "By activating the Yes Service" consent box
  await page.getByText('By activating the Yes Service').click();
  // 22. Check the "I further give consent to" consent box
  await page.getByText('I further give consent to').click();
  // 23. Click "Next"
  await page.getByRole('button', { name: 'Next' }).click();
  // 24. Click "PROCEED" (confirmation dialog)
  await page.getByRole('button', { name: 'PROCEED' }).click();
  // 25. Click "Next" again
  await page.getByRole('button', { name: 'Next' }).click();

  // --- Delivery Address ---
  // 26. Verify the "Address" field is visible
  await expect(page.getByRole('textbox', { name: 'Address *' })).toBeVisible();
  // 27. Enter Address
  await page.getByRole('textbox', { name: 'Address *' }).fill('11,JLN PANTAI SENTRAL 3 PANTAI DALAM');
  // 28. Enter Unit No.
  await page.getByRole('textbox', { name: 'Unit No.' }).fill('19-23');
  // 29. Enter Postal Code
  await page.getByRole('textbox', { name: 'Postal Code *' }).fill('59200');
  // 30. Wait for the page to finish loading (network idle)
  await page.waitForLoadState('networkidle');
  // 31. Click "Next"
  await page.getByRole('button', { name: 'Next' }).click();

  // End state: lands on the payment page with the delivery estimate.
  await expect(page).toHaveURL(/payment/, { timeout: 30000 });
  await expect(page.locator('main')).toContainText(
    'Approximately 5-7 working days, subject to stock availability',
    { timeout: 30000 },
  );
});
