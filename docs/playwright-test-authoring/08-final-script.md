# The Final Script — `YOS-ARS-47-Claude.spec.ts` (annotated)

Location: `incoming-scripts/YOS-ARS-47-Claude.spec.ts`
Run: `npx playwright test incoming-scripts/YOS-ARS-47-Claude.spec.ts --project=incoming`
Result: **1 passed (59.6s)**

---

## Full source

```ts
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
  await expect(addres
English 
￼
Mobile Plans 
Devices
Broadband
Promotions￼HOT
5g advanced￼NEW
Yes Gaming
Get Help
RM 38

MONTHLY PAYMENT
Infinite Basic
12 Months

RM 38 /mth

RM 38

DUE TODAY
￼NEXT
Back
 
 
 sNext).toBeEnabled();
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
```

---

## Why each non-obvious choice is there

| Line | Choice | Reason |
|---|---|---|
| `test.setTimeout(180_000)` | override the 60 s config default | the flow crosses ~6 cold-start Azure apps + a payment redirect chain; ~59 s when warm, more when cold |
| `DEVICES_URL` with inline `user:pass@` | basic auth in the URL | the dev site is behind HTTP basic auth; Chromium honours credentials in the URL |
| `locator('a[href$="/add-to-cart/315"]')` | href selector, not text/index | avoids the near-identical "Galaxy Z Fold 8 **Ultra**" card; `315` is the product id (confirmed by the later slug `samsung-galaxy-z-fold-8-old-315`) |
| `getByRole('heading', { name: 'yes 5g advanced prepaid' })` | role locator for the plan tile | `playwright-cli` generated `div:nth-child(3) > .layer-action-payment-plan-inner` — positional, would break on reorder |
| `page.locator('#page-main').getByRole('button', { name: 'Prepaid' })` | scoped to `#page-main` | there is also a **nav** "Prepaid" button; scoping disambiguates |
| `toHaveValue(MOCK.dob)` / State / City | assertions on auto-filled fields | the MyKad number populates DOB + gender; the postcode populates State + City — these assert the site's own logic |
| `getByText('By activating the Yes Service')` (not `getByRole('checkbox')`) | click the **label** | the real `<input type=checkbox>` is covered by `<div class="col-lg-6 form-sec-ch-pre-l">` which "intercepts pointer events" |
| `expect(...Next).toBeEnabled()` before each click | explicit gate | every page's Next starts `[disabled]` until the form is valid; this replaces arbitrary waits |
| `locator('label').filter({ hasText: 'Online Banking (FPX)' })` | label filter, not `getByText` | `getByText('Online Banking (FPX)')` is a **strict-mode violation** — matches both a `<label>` and an `<h4>`. This was the only failure of the first test run. |
| `selectOption('Maybank2U')` on `#select-bank` | value from the generated code | `playwright-cli` emitted `selectOption(['Maybank2U'])`; `#select-bank` id confirmed with `eval "el => el.id"` |
| `page.waitForEvent('popup')` **before** `payNow.click()` | register listener first | Pay Now opens a popup window via `window.open`; registering after the click races the popup |
| `.click().catch(() => {})` on **Success** | swallow the expected error | clicking Success makes the popup navigate/close → `Target page ... has been closed`; the click still lands |
| `page.waitForURL(/\/thankyou/)` after | sync on the main tab | the app redirects the **opener** tab to the thank-you page once payment succeeds |
| `getByText(/^Y5GA\d+$/)` | regex, not a literal id | the order number changes every run (recorded scripts hard-code it, which always rots) |

---

## Known limitations

- **Depends on a live, working dev environment.** If `yesshop-dev` fails to
  create the FPX session it shows *"Unable to process request"* and the popup
  closes — the test then fails at step 8. See
  [`01-yos-ars-47-failure-analysis.md`](01-yos-ars-47-failure-analysis.md)
  for a `Promise.race` guard that turns that into a clear message.
- **Not hermetic.** It places a real order in the dev system each run and
  relies on stock being available for product 315.
- **Popup blockers** must be off (the payment page itself warns about this).
- The `incoming` project has `retries: 1`; a cold-start first attempt may
  fail and pass on retry.

---

## How to adapt it

- **Different device:** change the `add-to-cart/<id>` number and the
  colour/storage/plan labels in step 3.
- **Different customer:** edit the `MOCK` object. If you change `idNumber`,
  update `dob` to whatever the site derives; if you change `postalCode`,
  update `state` / `city`.
- **Different bank:** any option in `#select-bank` works — it's a mock
  gateway. `Maybank2U` is just the one used here.
- **Fail the payment instead:** click `Failure` on the mock bank page and
  assert the error path rather than `/thankyou`.
