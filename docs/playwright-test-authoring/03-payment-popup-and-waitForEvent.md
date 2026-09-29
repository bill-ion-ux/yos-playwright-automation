# The Payment Popup and `page.waitForEvent('popup')`

```ts
const page1Promise = page.waitForEvent('popup');
await page.getByRole('button', { name: 'Pay Now' }).click();
const page1 = await page1Promise;
```

## What these lines are for

This is the standard Playwright pattern for **catching a new browser
tab/window that a click opens**.

### `page.waitForEvent('popup')`

- Returns a **Promise** that resolves when the browser context opens a popup
  — a `window.open(...)` call or a `target="_blank"` navigation whose opener
  is `page`.
- Calling it **does not wait by itself**. It just starts listening and hands
  you a promise.

### Why the listener is registered *before* the click

You must start listening **before** the action that triggers the popup:

```ts
const page1Promise = page.waitForEvent('popup');   // 1. start listening
await page.getByRole('button', { name: 'Pay Now' }).click();   // 2. this opens the popup
const page1 = await page1Promise;                   // 3. now grab it
```

If you clicked first and then called `waitForEvent`, you would have a race:
the popup could open before the listener exists, and you'd either miss it or
hang until timeout.

### `const page1 = await page1Promise`

Resolves to a full **`Page`** object for the new window. From then on you
drive it independently of the main `page`:

```ts
await page1.getByRole('button', { name: 'Success' }).click();
```

---

## The FPX / Razorpay mock flow on `yesshop-dev`

1. On `.../payment`, choose **Online Banking (FPX)** and pick a bank
   (`#select-bank`, e.g. `Maybank2U`). `Pay Now` becomes enabled.
2. Clicking **Pay Now** opens a popup. It starts at `about:blank`, then the
   app POSTs the checkout form and the popup is redirected through:
   - `iot-openapi.yes.my/xpay/paymentRouting.do?...`
   - `api.razorpay.com/v1/payments/<id>/authenticate`
   - `api.razorpay.com/v1/gateway/mocksharp/payment?key_id=rzp_test_...`
3. The final page is titled **"Razorpay Bank"** and shows:
   ```
   Welcome to Razorpay Curlec Bank
   This is just a demo bank page. You can choose whether to make this payment successful or not:
   [ Success ]  [ Failure ]
   ```
4. Clicking **Success** completes the payment. The popup closes itself and
   the **main tab** lands on
   `.../thankyou?product=samsung-galaxy-z-fold8-12512gb-prepaid-bundle`.

### Observed quirk

Clicking **Success** often throws
`Target page, context or browser has been closed` on the popup — because the
click causes the popup to navigate/close. The click still takes effect. The
robust pattern is:

```ts
await page1.getByRole('button', { name: 'Success' }).click().catch(() => {});
await page.waitForURL(/\/thankyou/, { timeout: 60_000 });
```

---

## Why you must NOT `page.goto()` the gateway URLs

The original `YOS-ARS-47.spec.ts` did this:

```ts
await page1.goto('https://api.razorpay.com/v1/gateway/mocksharp/payment?key_id=rzp_test_EqXEJ1dickPTPW');
await page1.goto('https://iot-openapi.yes.my/yos/mobile/ws/v1/json/paymentResponse');
```

Those are **redirect URLs the recorder captured**, not user actions:

- `.../mocksharp/payment` expects a **POST** with session/key/signature from
  the checkout form. A bare `GET` is rejected or redirected → Chromium
  aborts it → `net::ERR_ABORTED; maybe frame was detached?`
- `.../paymentResponse` is a **JSON API endpoint**, not a page.
- Navigating a popup that is mid-redirect or already closing gives the same
  `ERR_ABORTED` / "frame was detached".

**Rule:** interact with what the popup *renders*; never replay the gateway's
internal navigation chain.

---

## When the popup never really opens

If the backend fails to create the payment session, the app shows
**"Unable to process request — Sorry! There was a technical glitch."** on the
main page and the popup is closed immediately. Guard for it so the test
fails with a clear message rather than "page has been closed":

```ts
const outcome = await Promise.race([
  page1.getByText('Welcome to Razorpay Curlec Bank')
    .waitFor({ state: 'visible', timeout: 30000 }).then(() => 'gateway' as const),
  page1.waitForEvent('close', { timeout: 30000 }).then(() => 'popup-closed' as const),
  page.getByRole('heading', { name: 'Unable to process request' })
    .waitFor({ state: 'visible', timeout: 30000 }).then(() => 'backend-error' as const),
]).catch(() => 'timeout' as const);

expect(outcome, `Payment could not start (outcome: ${outcome})`).toBe('gateway');
```
