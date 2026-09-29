# Yes website — checkout site map

Curated, hand-maintained map of the purchase journeys this repo automates. The
point is to stop the Playwright agent re-discovering the **stable skeleton** of
each flow (entry URL, page sequence, sync points, known gotchas) every session.

**Read this first, then still verify with `playwright-cli`.** Plan names, prices,
product ids and promo layout change often — anything under
[Volatile facts](#volatile-facts-verify-live-every-time) is a hint, not a
source of truth. The flow skeletons and gotchas below change slowly; the volatile
section changes weekly.

> Maintenance rule: when live exploration contradicts this file, fix this file in
> the same session — same discipline as the `memory/` notes. A stale map is worse
> than no map.

Related: `CLAUDE.md` (authoring rules, `playwright-cli` invocation),
`docs/playwright-test-authoring/` (the worked example + failure analyses),
`memory/MEMORY.md` (dated env-breakage log).

---

## Navigation tree

```
top nav (every page): Mobile Plans · Devices · Broadband · Promotions · 5g advanced · Yes Gaming · Get Help
                       (Devices / Broadband / Prepaid are flyout BUTTONS, not links)

Devices ─ "Explore Devices" ─▶ /devices/  (catalogue)
   └─ device tile  a[href$="/add-to-cart/<id>"]  ─▶ cross-origin to the checkout app
        └─ DEVICE + PLAN flow   → /cart /verification /accessories /delivery-addresses /payment /thankyou
             ├─ prepaid   (bundle, e.g. "yes 5g advanced prepaid")
             └─ postpaid  (contract plan)                              ⚠ postpaid path not re-verified recently

Mobile Plans ─▶ SIM-only / "naked plan" flow   → /plan/add-to-cart/<id> → /plan/verification → …   ⚠ page sequence past /plan/verification unverified
   ├─ Postpaid
   │    ├─ Plans only        e.g. Yes Power 35  (/plan/add-to-cart/39, "New Line" / "No Contract")   ⚠ id + names volatile
   │    └─ Plan + device     (routes through the DEVICE + PLAN flow above)
   └─ Prepaid                                                          ⚠ standalone prepaid-SIM flow not mapped

Broadband ─ "WiFi" link ─▶ /yes-5g-broadband/  (marketing page — NOT the /shop/broadband/ path, that's broken on dev)
   └─ plan card "Get It Now"  a[href$="/broadband/add-to-cart/<id>"]
        └─ BROADBAND flow  → /broadband/cart /broadband/verification /broadband/addons
                              /broadband/delivery-addresses /broadband/payment /broadband/thankyou
```

`⚠` = inferred / not confirmed against the live site in a recent session. Confirm
before relying on it, and upgrade the marker when you do.

---

## Environments

| Host | Role | Auth | Notes |
|---|---|---|---|
| `yesmy-dev.azurewebsites.net` | dev front-end / marketing | HTTP basic (`DEV_SITE_USER`/`PASS`, or inline `user:pass@`) | `baseURL` for the `restructured` + `seed` projects. Azure App Service — **cold-starts ~30 s** on first hit. |
| `yesshop-dev.azurewebsites.net` | dev checkout app (cart → thankyou) | inherits the session | Shared **stateful** backend. Caps orders per identity (≈5 prepaid / ≈15 postpaid per MyKad, also keys on email). |
| `store.yes.my` | **prod** checkout app | none | Same checkout codebase as `yesshop-dev` (same `#select-securityType`, `#input-dob`, `.layer-action-inner`, … selectors). URLs are `/<product-slug>/cart` etc., not bare `/cart`. |
| `www.yes.my` | **prod** front-end | none | Standalone specs only; repo fixtures/POMs are pinned to the dev host. |

Projects (`playwright.config.ts`): `incoming` (`incoming-scripts/`), `restructured`
(`tests/specs/**`), `seed` (`tests/seed.spec.ts`, authoring only).
Author from the seed: `npx playwright test --project=seed --debug=cli`.

---

## Flow: Device + plan checkout

Reference specs: `tests/specs/YOS-ARS-47.spec.ts` (dev, prepaid, skips at eKYC),
`incoming-scripts/YOS-ZFOLD8-Prepaid-Payment.spec.ts` (**prod, runs green to
`/payment` in ~27 s**), `docs/playwright-test-authoring/08-final-script.md`
(annotated).

| # | Page / URL | What happens | Selector notes |
|---|---|---|---|
| 1 | root → `Devices` nav button → `Explore Devices` | open catalogue | `getByRole('button', { name: 'Devices' })` then `getByRole('link', { name: 'Explore Devices' })` |
| 2 | `/devices/` | pick a device | `a[href$="/add-to-cart/<id>"]` — **never** `nth-child`; two near-identical cards exist (Z Fold 8 vs "…Ultra"). Assert the exact heading first. Navigates cross-origin. |
| 3 | `/cart` (`/<slug>/cart` on prod) | configurator | colour `getByRole('tab', …)` · storage `getByRole('button', { name: '16GB+1TB' })` · payment plan `.layer-action-payment-plan-inner` (or its heading) · contract period `getByRole('main'|'#page-main').getByRole('button', { name: 'Prepaid', exact: true })` — scope it, the nav also has a "Prepaid" button · plan price tab `getByRole('button', { name: /yes 5g advanced prepaid RM 0/i })` · SIM type `eSIM` / `SIM card` (`exact: true`) |
| 4 | `/verification` | personal details + consents | see [Verification form](#the-verification-form) |
| 5 | `/accessories` | skip | just click `Next` |
| 6 | `/delivery-addresses` | address | fill Address / Unit No. / Postal Code; **assert** State + City (autofilled) |
| 7 | `/payment` | pay | see [Payment](#the-payment-page-fpx--razorpay-curlec-mock) |
| 8 | `/thankyou` | confirm | `heading "Thank you!"`, `text "Tracking / Order Number"`, order no. **`/^Y5GA\d+$/`** (regex — it changes every run) |

**eKYC blocks this flow unattended on `yesshop-dev`** (since ~2026-09-03). The
prepaid variant walks steps 4→6 fine, then `Next` on `/delivery-addresses` POSTs
`/verification-cart-update` → `302 …?ekyc_error=1`, no recovery UI. `YOS-ARS-47`
`test.skip()`s there. **Prod (`store.yes.my`) does not trigger this** — the prod
spec runs end to end. See `memory/ekyc-prepaid-serverside-block.md`.

---

## Flow: Broadband

Reference spec: `tests/specs/YOS-ARS-43.spec.ts`. Memory:
`memory/broadband-checkout-flow.md`.

Deltas from the device flow:

- **Entry:** `Broadband` nav → first `WiFi` link → `/yes-5g-broadband/` →
  `Get It Now` on a plan card. Do **not** route through
  `/shop/broadband/home-broadband` — broken on dev (Yes ZOOM `add-to-cart/45`
  throws an Alpine error; `/broadband/cart` renders empty).
- **URLs are namespaced `/broadband/*`** and there's an extra `/broadband/addons`
  step (skip it) where the device flow has `/accessories`.
- **Cart has a "Choose An Action" step:** `.layer-action-inner` filtered to
  `New Line`.
- Verification email label is **`Email ID *`** (device flow: `Email Address *`).
- Postpaid → **eKYC gate on `/broadband/verification`**; MyKad journey presses
  **`Next` twice** (once to start the VIDA poll, once after it goes terminal).
  Needs `test.use({ stubEkyc: true })` — and even then, server-side enforcement
  currently 302s to `…verification?ekyc_error=1` (regressed 2026-09-03).
- **Order number prefix `YWF`** (`/^YWF\d+$/`), not `Y5GA`.

---

## Flow: SIM-only / "naked plan" (Mobile Plans)

Reference: `memory/ekyc-prepaid-serverside-block.md` (hand-driven only, no green
spec). Verified: entry `/plan/add-to-cart/39` (Yes Power 35, SIM-only, "New Line"
/ "No Contract") → `/plan/verification`. Page sequence **after** verification is
not mapped — discover it live.

- eKYC here still uses the **old client-side** QR desktop→mobile handoff
  (`POST /vida/handoff` + `GET /vida/handoff/<ref>/poll` behind a "Scan with your
  phone camera" modal), unlike the device-prepaid flow's VIDA web SDK.
- The legacy `stubEkyc` poll route clears the modal, **but** `Next` still 302s to
  `/plan/verification?ekyc_error=1` — server enforcement is identical. Not
  client-bypassable.

---

## Cross-cutting details

### The verification form

Two selector vocabularies are in use across specs — both live-verified, pick one:

| Field | Role-based | Id-based |
|---|---|---|
| ID type | `getByLabel('ID Type *').selectOption('MyKad')` | `#select-securityType` → value `MYKAD` |
| ID number | `getByRole('textbox', { name: 'ID Number' })` | `#input-security_id` |
| Full name | `getByRole('textbox', { name: 'Full Name *' })` | `#input-name` |
| DOB | `getByRole('textbox', { name: 'Date Of Birth *' })` | `#input-dob` |
| Gender | — | `#gender1` |
| Phone | `getByRole('spinbutton', { name: 'Phone Number' })` | `#input-contactno` (type=number) |
| Email | `getByRole('textbox', { name: 'Email Address *' })` ·  `'Email ID *'` on broadband | `#input-email` |
| Consent ×2 | click the label **text**: `getByText('By activating the Yes Service')`, `getByText('I further give consent to')` | `label[for="input-subscribePlan"]`, `label[for="input-privacyPolicy"]` |

- **DOB + Gender are derived from the MyKad number and rendered read-only** —
  `toHaveValue(customer.dob)` / `toBeDisabled()` / `not.toHaveValue('')`, never
  `.fill()` them.
- The real consent `<input type=checkbox>`es are **covered by an overlay** that
  intercepts pointer events — click the label, not the checkbox.
- Identities come from `tests/support/identity.ts` `makeCustomer()`, never
  literals (per-identity order cap). `makeMyKad()` gives a well-formed number +
  the DOB the site will show.

### Auto-filled fields (assert, don't fill)

| Trigger | Fields populated | Fixed test value |
|---|---|---|
| MyKad number | Date Of Birth, Gender | derived by `makeMyKad()` |
| Postal Code `55100` | State, City | `WILAYAH PERSEKUTUAN KUALA LUMPUR` / `KUALA LUMPUR` |

### `Next` buttons

Every page's `Next` starts `[disabled]` and enables only when the form validates.
`await expect(next).toBeEnabled()` before **every** click — this replaces
arbitrary `waitForTimeout`s. `playwright-cli find` shows `[disabled]`/`[enabled]`
in its output.

### The payment page (FPX / Razorpay Curlec mock)

1. Choose method: `page.locator('label').filter({ hasText: 'Online Banking (FPX)' })`
   — **not** `getByText(...)` (strict-mode: matches a `<label>` **and** an `<h4>`).
2. Pick a bank: `#select-bank` → `Maybank2U` (any option works — it's a mock).
3. **Register the popup listener before clicking Pay Now:**
   ```ts
   const popupPromise = page.waitForEvent('popup');
   await payNow.click();
   const bankPage = await popupPromise;
   ```
4. Mock bank: `heading "Welcome to Razorpay Curlec Bank"`, then click `Success`.
   The click closes the popup → wrap it `.click().catch(() => {})`.
5. Sync on the **opener** tab: `await page.waitForURL(/thankyou/)`.

**Never `page.goto()` a gateway URL** (`api.razorpay.com/...`,
`iot-openapi.yes.my/...`). Those are redirect targets that only work with live
POST session state; replaying them → `net::ERR_ABORTED`. Drive what the popup
actually renders.

If the dev backend fails to create the FPX session it shows
`heading "Unable to process request"` on the main page and closes the popup.
Race the outcomes so the failure message names the environment, not the script
(see `docs/playwright-test-authoring/03-payment-popup-and-waitForEvent.md`).
The dev gateway is **intermittent**, not permanently broken.

### Modals / overlays that eat the first click

| Modal | Where | Handling |
|---|---|---|
| `#YesxILMUchatModal` (pre-order / ILMU chat) | homepage only, ~1 s after load | fixture `dismissHomepageModal` clicks its `Close`. Absent on deep links like `/devices/`. |
| `#staticBackdrop` "Failed to fetch stock details" | cart, cold backend | `#staticBackdrop button.btn-primary`; see `dismissStockErrorModal` in `YOS-Claude.spec.ts` |
| `#modalOKButton` | delivery-addresses confirm (id-based flow) | from `legacy-scripts/test_delivery_address.js` |

### Order-number prefixes

| Flow | Regex |
|---|---|
| Device + plan | `/^Y5GA\d+$/` |
| Broadband | `/^YWF\d+$/` |
| Naked plan | unknown — capture it next run |

---

## Volatile facts (verify live every time)

Everything here changes without notice. Dates are last-confirmed.

### Product / add-to-cart ids

| id | Product | Host | Status (last seen) |
|---|---|---|---|
| `315` | Samsung Galaxy Z Fold 8 (slug `samsung-galaxy-z-fold-8-old-315`) | yesshop-dev | 2026-09-04: `-old-` SKU, `GET /<slug>/accessories` **404s**, `/delivery-addresses` = "Device Not Found" |
| `312` | Samsung Galaxy Z Flip 8 | yesshop-dev | 2026-09-04: verification `Next` bounces straight back to `/cart` |
| `321` | Samsung Galaxy Z Fold 8 | prod (`store.yes.my/galaxy-z-fold-8/cart`) | 2026-09-08: green end-to-end to `/payment` |
| `322` | Samsung Galaxy Z Fold 8 **Ultra** | prod | — |
| `44` | Broadband "Flexi" plan-only (RM58, No Contract) | dev `/broadband/add-to-cart/44` | 2026-09-02: works (eKYC aside) |
| `45` | Yes ZOOM broadband | dev | broken — Alpine `nakedPlanInfo.all_images[0]` error |
| `39` | Yes Power 35 (SIM-only naked plan) | dev `/plan/add-to-cart/39` | 2026-09-03: reaches `/plan/verification` |

### Plan tiers (names + prices — **do not hard-code**)

Seen in passing, unverified: Postpaid "Plans only" — `Yes Power 35`,
`Infinite Basic` (RM 38/mth, 12 months). Treat as examples of the *shape*, not a
catalogue. Enumerate live with `playwright-cli` when a spec needs a specific tier.

### eKYC enforcement status

As of **2026-09-04**, server-side VIDA eKYC (`*/verification-cart-update` POST)
blocks the step-out of verification on **every dev flow tested** — device
prepaid, naked plan postpaid, broadband — so no unattended run reaches
`/payment` or `/thankyou` on `yesshop-dev`. Prod is unaffected for prepaid.
`VidaKycConfig.flows` = `{device, nakedplan, broadband, sns}` all `true`.
Re-check `memory/ekyc-prepaid-serverside-block.md` before assuming this still
holds — it's the fastest-moving fact in this repo.
</content>
</invoke>
