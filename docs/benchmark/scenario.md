# Benchmark scenario (frozen)

The single scenario all four scripts (M1 WDIO hand-authored, M2 Playwright +
playwright-cli + Claude, M3 Playwright codegen; plus the execution comparison)
must target **step-for-step**. Freeze this before touching a browser.

## Why the end-assertion is NOT `/thankyou`

As of 2026-09-03, `yesshop-dev` enforces VIDA eKYC **server-side** on every
checkout flow. The step-out of the verification step fires
`POST .../verification-cart-update`, which 302-redirects back to
`.../verification?ekyc_error=1` whenever no real eKYC result is on file. There
is no client-reachable field to satisfy it (the old `stubEkyc` VIDA-poll route
clears the on-page QR modal but the server still bounces), and no unattended
identity can pass the live doc-scan + liveness capture. Confirmed by hand
(playwright-cli) and by re-running `YOS-ARS-43`, which now fails at exactly this
redirect. See project memory `ekyc-prepaid-serverside-block`.

Consequence: **no unattended run can reach `/payment` or `/thankyou`** until the
backend ships a dev bypass (flow flag off / seeded pass / bypass endpoint). So
the benchmark freezes its end-state at the **last deterministic checkpoint
before the eKYC wall** — which is also where the WDIO reference script
(`legacy-scripts/YOS_Device_Plan.js`) already stops (its final commented target
is `/delivery-addresses`, never `/thankyou`). This keeps the comparison
apples-to-apples and unblocks it today; when the backend bypass lands, extend
the frozen scenario through payment as a second phase.

## Scenario: device + plan purchase, up to delivery

The only flow with both a WDIO source and a Playwright source, so the only one
usable for the framework comparison.

- **Start state:** site root `https://yesmy-dev.azurewebsites.net/` (through
  HTTP basic auth, past Azure cold start, homepage modal dismissed). Navigate
  onward by clicking, not `goto` — as the shared fixture does.
- **Product (LOCK BEFORE RUN):** one agreed **in-stock** device + one plan.
  Note: YOS-ARS-47's current device (Galaxy Z Fold 8, id 315) is **OUT OF
  STOCK** as of 2026-09-03 and cannot be used; the WDIO source uses Galaxy A57
  5G. Pick a device confirmed in stock on freeze day and align all four scripts
  to it (same colour/storage, same plan, same New/Existing line, same
  SIM/eSIM, same contract term).
- **Mock data:** a fresh identity per run from `tests/support/identity.ts`
  (`makeCustomer()` — MyKad, unique email); never hard-coded literals
  (`yesshop-dev` caps orders per identity). WDIO M1 uses the same data shape.
- **Steps (identical across all scripts):**
  1. Site root → Devices → Explore Devices → select the frozen device card.
  2. Cart/configurator: colour, storage, line type, plan, contract, SIM type;
     assert `Next` enabled, click it.
  3. `/…/verification`: select ID Type MyKad; fill ID number, full name, phone,
     email; **assert** DOB + gender auto-derived from the MyKad number
     (`toHaveValue`, don't fill); tick both consent labels.
  4. Advance through the pre-eKYC steps that are reachable (accessories/add-ons
     skip → delivery) up to the delivery-address form.
  5. `/…/delivery-addresses`: fill address, unit, postal code; **assert** State
     + City auto-fill from the postal code (`toHaveValue`).
- **End assertion (frozen):** landed on `/…/delivery-addresses` with the
  delivery form populated and State + City autofill asserted — i.e. the last
  step immediately **before** the eKYC-gated `verification-cart-update` bounce.
  Do **not** click the Next that transitions toward `/payment`.

## What each method must count (unchanged from the plan)

- Stopwatch "begin" → "passes green twice in a row, `retries: 0`, headless".
- M2: Claude token count + rough \$; M3: split record time vs. hand-fix time
  (codegen emits no assertions / sync points / fixture — that hand-fix is the
  real cost).
- Same author, same day. M1's author knows the flow; M2/M3 rediscover it —
  note the bias or use a fresh author for M1.

## Execution comparison

Same finished scenario, headless, same machine, Playwright vs WDIO wall-clock.
Both now end at the delivery checkpoint, so both are runnable today.
