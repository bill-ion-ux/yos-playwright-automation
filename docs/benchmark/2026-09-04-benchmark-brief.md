# Weekly brief — 2026-09-01 → 2026-09-04

Author: Nabil Irfan
Scope: YOS QA automation — authoring harness, pilot gold specs, benchmark prep.

---

## What got done this week

### Harness / infrastructure
- **Shared fixture + seed + config.** `tests/fixtures.ts`, `tests/seed.spec.ts`,
  `playwright.config.ts` — `.env` load, `baseURL`, HTTP basic auth via
  `httpCredentials`, split `seed` / `restructured` / `incoming` projects,
  homepage `#YesxILMUchatModal` dismissal, 90s cold-start nav budget. Entry
  point standardised on the site root `/`, navigate onward by clicking.
- **`CLAUDE.md`** — short rules-of-thumb for spec authoring, distilled from
  `docs/playwright-test-authoring/`.
- **TypeScript setup** — first-ever `npm install`, `@types/node`,
  `tsconfig.json` (`module: preserve` / `moduleResolution: bundler`).
  `tsc --noEmit` clean across the repo. `docs/tsconfig-explained.md` written.
- **`tests/support/identity.ts`** — `makeMyKad()` / `makePassport()` /
  `makeCustomer()` data factories: fresh well-formed MyKad + unique email per
  run, to beat the `yesshop-dev` per-identity purchase cap (~5 prepaid /
  ~15 postpaid).
- **`tests/support/journey.ts`** — `journey(page, testInfo)` → `j.shot(name)`;
  per-test screenshot folders, wiped per run, `-retryN` suffix on retries.
- **`tests/support/ekyc.ts` + `stubEkyc` fixture option** — network stub of the
  VIDA identity check. **Pending dev + Sami approval.**

### Pilot gold specs
- **`tests/specs/YOS-ARS-47.spec.ts`** — device + plan prepaid purchase, ported
  onto the fixture, `makeCustomer()`, 8 `j.shot()` calls. Went green end-to-end
  once (device → cart → verification → accessories → delivery → payment → FPX
  mock → Thank you). Root-caused the earlier `/delivery-addresses` stall to the
  per-identity purchase cap, not env drift.
- **`tests/specs/YOS-ARS-43.spec.ts`** — broadband "Flexi" new-line purchase,
  authored live with `playwright-cli` + Claude on the fixture. Green twice
  (~48s) on 2026-09-02. New project memory `broadband-checkout-flow` captured
  (entry via `/yes-5g-broadband/`; `/shop/broadband/` path broken on dev;
  MyKad journey double-Next at eKYC).

### Benchmark preparation
- **`docs/benchmark/scenario.md`** — frozen the single scenario all methods must
  target step-for-step. End-state already had to retreat from `/thankyou` to
  `/delivery-addresses` because of the server-side eKYC wall that landed
  2026-09-03 (project memory `ekyc-prepaid-serverside-block`).
- Method scripts for the authoring comparison were started under
  `incoming-scripts/` — `YOS-Claude.spec.ts` (M2: Playwright + `playwright-cli`
  + Claude), `YOS-Codegen-Device.spec.ts` / `YOS-Codegen_device_v2.spec.ts`
  (M3: `playwright codegen` + hand-fix), plus the existing WDIO reference
  `legacy-scripts/YOS_Device_Plan.js` (M1).

---

## Benchmark status: **NOT COMPLETED — dev environment blocking**

The planned deliverable was `docs/benchmark/results.md`: a like-for-like
comparison of

- **M1** — WebdriverIO, hand-authored
- **M2** — Playwright + `playwright-cli` + Claude
- **M3** — Playwright `codegen` + hand-fix

on authoring cost, plus a Playwright-vs-WebdriverIO execution comparison, all
against the frozen device + plan **prepaid** purchase scenario ending at
`/delivery-addresses` with the State + City autofill assertion.

**This cannot be produced on the current `yesshop-dev` state.** Confirmed by
hand with `playwright-cli` and by running `incoming-scripts/YOS-Claude.spec.ts`
on 2026-09-04:

1. **The frozen scenario's end-state is unreachable.**
   - Reference device **Galaxy A57 5G** (`add-to-cart/302`, the device the WDIO
     source uses) now offers **only the `Infinite+` postpaid plan** on dev —
     there is no "yes 5g advanced prepaid" option on its cart, so it cannot run
     the *prepaid* scenario at all.
   - Fallback device **Galaxy Z Fold 8** (`add-to-cart/315`) drives fine through
     the cart and the `/verification` form (personal details fill + MyKad
     DOB/gender autofill assertions all pass), then **`Next` issues
     `GET /samsung-galaxy-z-fold-8-old-315/accessories` → HTTP 404 (nginx)**.
     `/delivery-addresses` for the same SKU returns "Device Not Found". The
     `get-accessories-list` API still returns 200 — it is the page route that is
     broken for this SKU (a deprecated `-old-` product; other products' route is
     fine). So the journey never reaches `/delivery-addresses`.

2. **Server-side eKYC still blocks the step-out of `verification` on every flow**
   (device prepaid, postpaid naked-plan, broadband) — documented 2026-09-03,
   re-confirmed this week by the `YOS-ARS-43` regression. Even if the route
   above is fixed, no unattended run passes `*/verification-cart-update`.

Because no method (M1/M2/M3) can drive the frozen scenario to a green
end-state, there is nothing to time or cost, and the comparison table has no
rows to fill. The authoring-method scripts and the execution comparison are
both blocked on the same environment issue.

### Unblock conditions
- Backend restores the `/accessories` → `/delivery-addresses` routes for a
  usable in-stock **prepaid**-capable device SKU, **and**
- Backend ships an eKYC dev bypass (flow flag off / seeded passed result /
  bypass endpoint), so the scenario can extend back toward `/payment` as
  phase 2.

Until then the benchmark is on hold. Everything else (fixture, identity/journey
helpers, the two pilot specs, the frozen scenario doc, the draft method
scripts) is in place and ready to run the moment the environment clears.

---

## RESULT

```
ERROR: benchmark comparison (M1 WDIO / M2 playwright-cli+Claude / M3 codegen) could not be completed
CAUSE: yesshop-dev blocks the frozen prepaid scenario before its end-state
       - Galaxy A57 5G: no prepaid plan offered on dev
       - Galaxy Z Fold 8 (SKU 315): GET /accessories -> 404, /delivery-addresses -> "Device Not Found"
       - server-side eKYC still bounces */verification-cart-update on all flows
DELIVERABLE: docs/benchmark/results.md NOT PRODUCED
STATUS: blocked, pending backend fix
```
