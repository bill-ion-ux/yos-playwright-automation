# YOS-ARS-47 — Failure Analysis

File under test: `incoming-scripts/YOS-ARS-47.spec.ts`
Command: `npx playwright test incoming-scripts/YOS-ARS-47.spec.ts --project=incoming --headed`

This test is a recorded (`playwright codegen`) purchase journey for the
**Samsung Galaxy Z Fold 8** prepaid bundle, ending in an FPX mock payment.
It failed on several different lines across runs. Each distinct failure is
explained below in the order we hit them.

---

## Failure 1 — `line 5`: heading not visible

```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('heading', { name: 'Own the latest ... phones' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

```ts
await page.goto('https://yesmy-dev:YesMyDev123$@yesmy-dev.azurewebsites.net/devices/');
await expect(page.getByRole('heading', { name: 'Own the latest ... phones' })).toBeVisible();
```

### Why

On the **retry**, execution sailed past this same line and reached line 59.
So the heading *does* exist — line 5 didn't fail because the locator is
wrong, it failed on **timing**:

- `yesmy-dev.azurewebsites.net` is an Azure App Service that **cold-starts**.
- The first navigation of the run was slow (the browser network panel showed
  a request starting at ~32 s).
- The default `toBeVisible` assertion timeout is **5 s**, which expired
  before the page finished painting.

This is a flaky timing failure, not a real bug.

> Note: `getByRole` name matching is a **case-insensitive substring** match,
> and the literal `...` in `'Own the latest ... phones'` is three real
> characters, not a wildcard. If the recorded ellipsis was a truncation of
> the real heading text, the locator would never match regardless of timing —
> but the retry proved it does match here.

### Fixes

- Raise the assertion timeout for this environment:
  ```ts
  await expect(page.getByRole('heading', { name: 'Own the latest' }))
    .toBeVisible({ timeout: 15_000 });
  ```
- Or globally in `playwright.config.ts`:
  ```ts
  expect: { timeout: 15000 },
  use: { navigationTimeout: 60000 },
  ```
- We later removed this assertion entirely from the working reference test
  because it added no value over asserting a later, more specific element.

---

## Failure 2 — `line 59` (later `line 58`): `net::ERR_ABORTED; maybe frame was detached?`

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "https://api.razorpay.com/v1/gateway/mocksharp/payment?key_id=rzp_test_EqXEJ1dickPTPW", waiting until "load"
```

```ts
const page1Promise = page.waitForEvent('popup');
await page.getByRole('button', { name: 'Pay Now' }).click();
const page1 = await page1Promise;
await page1.locator('html').click();
await page1.goto('https://api.razorpay.com/v1/gateway/mocksharp/payment?key_id=rzp_test_EqXEJ1dickPTPW');
```

### Why

`page1` is the FPX / Razorpay **payment popup** opened by clicking **Pay Now**.
The script then tries to *manually navigate that popup* to an internal
gateway endpoint. That fails because:

1. `.../mocksharp/payment` is meant to receive a **POST** from the checkout
   form carrying a session id / key / signature. A bare `GET` to it (no form
   body, no gateway session) is rejected or immediately redirected, so
   Chromium **aborts** the navigation → `net::ERR_ABORTED`.
2. The "maybe frame was detached" hint means the popup may also have already
   navigated or closed underneath the `goto`.
3. The browser network tab confirmed it: that request showed
   **Status: canceled**.

### Root cause

Lines 58–65 are raw `playwright codegen` output. The recorder captured the
**gateway's own redirect URLs** (`api.razorpay.com/...` →
`iot-openapi.yes.my/.../paymentResponse` → `.../thankyou`) and wrote them
back as explicit `page.goto(...)` calls. Replaying redirect URLs as
navigations does not work — those endpoints only behave correctly when
reached *through* the real form submission with live session state.

### Fix direction

Do **not** `goto` the gateway URLs. Drive whatever the popup genuinely
loads, then let the app redirect itself:

```ts
const page1 = await page1Promise;
await page1.waitForLoadState('domcontentloaded');
await expect(page1.getByText('Welcome to Razorpay Curlec Bank'))
  .toBeVisible({ timeout: 30_000 });
await page1.getByRole('button', { name: 'Success' }).click();

await page.waitForURL(/thankyou/, { timeout: 60_000 });
await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
```

---

## Failure 3 — the popup **closes itself**: `Target page, context or browser has been closed`

After removing the manual `goto` and waiting on the popup content instead:

```
Error: expect(locator).toBeVisible() failed
Locator: getByText('Welcome to Razorpay Curlec Bank')
Expected: visible
Error: element(s) not found
Call log:
  - waiting for getByText('Welcome to Razorpay Curlec Bank')
  - Target page, context or browser has been closed
```

### Why

The captured **page snapshot** for this run showed an error box on the
**main page** (not the popup):

```
heading: "Unable to process request"
text:    "Sorry! There was a technical glitch. Please retry again."
button:  "OK"
```

So the payment never started. The `yesshop-dev` backend call that creates
the FPX / Razorpay session **failed**, so:

1. Clicking **Pay Now** opens a popup window (`page1`).
2. Because the backend errored, the app tears that popup down (or leaves it
   on `about:blank` and closes it) instead of loading the gateway.
3. `page1.waitForLoadState()` resolves instantly (`about:blank` is "loaded").
4. Any further action on `page1` throws
   `Target page, context or browser has been closed`.

It reproduces identically on the retry because it is a **server-side error**,
not a race.

> The page also carries the warning
> *"Please make sure to disable popup blocker before proceeding with payment."*
> — worth confirming the run isn't blocking the popup, though the snapshot
> shows a popup *did* open and then close.

### Fix applied — race the real outcomes

There is no automation change that makes a closed popup render content. The
test can only be made to **fail with a clear reason** instead of an opaque
"page has been closed":

```ts
const page1Promise = page.waitForEvent('popup');
await page.getByRole('button', { name: 'Pay Now' }).click();
const page1 = await page1Promise;

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

await page1.getByRole('button', { name: 'Success' }).click();
await page.waitForURL(/thankyou/, { timeout: 60_000 });
await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
await expect(page.getByText(/^Y5GA\d+$/)).toBeVisible();
```

A failure now reads:

```
Payment could not start (outcome: popup-closed). The FPX/Razorpay gateway session
was not created by yesshop-dev - this is a backend/environment issue, not a script bug.
```

### Important caveat

The original `YOS-ARS-47.spec.ts` still cannot go green until the dev
payment gateway actually opens the mock bank popup. When we later ran the
**same payment path** through `playwright-cli` (see
[`04-authoring-with-playwright-cli.md`](04-authoring-with-playwright-cli.md)),
the popup **did** load `https://api.razorpay.com/v1/gateway/mocksharp/payment`
and the `Success` button completed the order — so the backend is
intermittent, not permanently broken.

---

## Other fragile bits in the original recording

| Line | Problem | Better |
|---|---|---|
| `page.getByText('Y5GA2608282000042327').click()` | Hard-coded order number from the recording; changes every run | `await expect(page.getByText(/^Y5GA\d+$/)).toBeVisible()` |
| `page.goto('.../thankyou?product=...')` | Replays a redirect URL | `await page.waitForURL(/thankyou/)` |
| `page.goto('.../samsung-galaxy-z-fold-8-old-315/payment')` (line 51) | Jumps straight to a URL mid-flow instead of clicking through | Click the real **Next** buttons so cart state is built server-side |
| `page1.locator('html').click()` | Meaningless recorder artifact | delete |
