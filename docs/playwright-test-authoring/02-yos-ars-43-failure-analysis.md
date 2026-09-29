# YOS-ARS-43 — Failure Analysis

File under test: `incoming-scripts/YOS-ARS-43.spec.ts`
Command: `npx playwright test incoming-scripts/YOS-ARS-43.spec.ts --project=incoming --headed`

```
Test timeout of 60000ms exceeded.
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('tab', { name: 'Awesome Ice Blue' })
```

```ts
 7 |  await expect(page.locator('#device-list-section')).toContainText('Galaxy A57 5G');
 8 |  await page.locator('div:nth-child(15) > .layer-planDevice > .bottom-section > .panel-btn > .btn').click();
 9 |  await page.getByRole('tab', { name: 'Awesome Ice Blue' }).click();   // <-- times out here
```

Identical failure on the retry → **deterministic**, not a flake.

---

## What failed

The click on line 9 never happened. Playwright waited the entire 60 s test
budget for a `tab` element named **"Awesome Ice Blue"** and it never appeared
(or never matched).

> `test-results/` for ARS-43 had already been wiped by a later ARS-47 run
> when we went looking, so the exact screenshot/`error-context.md` could not
> be inspected. The analysis below is from the code and error text.

---

## Why the tab isn't there — the step before it is the weak link

```ts
await page.locator('div:nth-child(15) > .layer-planDevice > .bottom-section > .panel-btn > .btn').click();
```

This clicks the select button of **whatever card happens to be the 15th
child** in the device grid. Line 7 only asserts that `#device-list-section`
*contains the text* "Galaxy A57 5G" **somewhere** — not that it is card #15.

The device catalogue is **dynamic** (order, count, promos, stock). So
`div:nth-child(15)`:

- may now point at a **different phone** whose configurator has no
  "Awesome Ice Blue" colour, or
- may point at something **not clickable / off-screen**, so the configurator
  panel never opens at all.

Either way, line 9's colour tab is absent and the click times out against the
whole-test deadline.

### Secondary possibilities for line 9 itself

- The colour for the A57 changed, or the label has different
  whitespace / casing than the literal `'Awesome Ice Blue'`.
- The colour selector is **not exposed with ARIA `role="tab"`** — it could be
  a `button` or `radio`. If the markup changed, `getByRole('tab', …)` cannot
  match it even when it is visually present.

---

## Why the 60 s number appears

The message is `Test timeout of 60000ms exceeded`, not an action timeout.
`playwright.config.ts` sets `timeout: 60000` for the whole test and no
explicit per-action timeout, so a single stuck `click` is allowed to consume
the entire test budget before failing.

---

## Fix direction

Anchor to the **device name**, not a positional index, and confirm the
configurator actually opened before touching the colour control:

```ts
const a57 = page.locator('.layer-planDevice', { hasText: 'Galaxy A57 5G' });
await expect(a57).toBeVisible();
await a57.getByRole('link', { name: /Buy Now|Select/i }).click();   // use the real button text

// make sure the configurator panel is open
await expect(page.locator('.layer-action-payment-plan-inner')).toBeVisible();

// verify the real colour label AND role in the DOM before asserting on it
await page.getByRole('tab', { name: 'Awesome Ice Blue' }).click();
```

General rule: **never select a card by `nth-child`** on a list whose contents
the server controls. Filter by a stable, visible attribute of the item you
actually want (`hasText`, an `href`, a `data-*`).

---

## Related: how the Z Fold 8 card was picked safely in `YOS-ARS-47-Claude`

Same class of problem (two similar cards: "Galaxy Z Fold 8" **and**
"Galaxy Z Fold 8 Ultra"), solved without positional indexing:

```ts
await expect(page.getByRole('heading', { name: 'Galaxy Z Fold 8', exact: true })).toBeVisible();
await page.locator('a[href$="/add-to-cart/315"]').click();
```

`315` is the product id — confirmed because the subsequent URL slug is
`samsung-galaxy-z-fold-8-old-315`. The `href$=` selector is unique and cannot
accidentally hit the "Ultra" card.
