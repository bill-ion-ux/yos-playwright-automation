# Benchmark results — authoring & execution cost

First run: **2026-09-10**. Author: Nabil Irfan. Single author, same day.

Compares three ways to produce the frozen device+plan scenario
(`docs/benchmark/scenario.md`), plus Playwright vs WebdriverIO execution time.

## Partial — read this first

- **End-state is `/delivery-addresses`, not `/thankyou`.** The frozen scenario
  and all three scripts were built to stop there, because the eKYC wall was in
  force when they were authored. **2026-09-10: that wall lifted** — prepaid
  Z Fold 8 now runs end-to-end to `/payment` again (memory
  `ekyc-prepaid-serverside-block`). So phase 2 (extend through payment) is now
  a re-authoring task, not backend-blocked. These numbers still measure the
  `/delivery-addresses` end-state only.
- **Execution numbers are single runs**, not the planned N≥10, and assume a
  **warm** Azure dev instance (a cold start alone is ~30s and would dominate).
  Re-run N=10, `retries:0`, headless, trace/screenshot off, before quoting.
- **The three scripts are not equal fidelity** (see the fidelity column). M2 is
  the only one that matches `CLAUDE.md` / the `YOS-ARS-43` pattern
  (semantic locators, regex URLs, `toBeEnabled()` gates, `toHaveValue` autofill
  asserts). M1 and M3 as-measured are thinner.

## Results

| | M1 — WebdriverIO (FrothTestOps recorder + hand) | M2 — Playwright + `playwright-cli` + Claude Code | M3 — Playwright `codegen` + hand-fix |
| --- | --- | --- | --- |
| Draft / record | 2–3 min | — (Claude drives live site) | 2–3 min (incl. manually adding `expect(page).toHaveURL(...)` sync points) |
| Debug / harden to green | **~2 hours** (unstable recorder selectors) | included below | minimal beyond the URL asserts |
| **Total authoring** | **~2 h 3 min** | **~8 min** | **~3–5 min** |
| Token / $ cost | none | **~80k tokens** (≈ USD 0.25–0.70 at Sonnet rates, input/output split TBD) | none |
| **Execution (1 run, warm)** | **~60s** | **~25s** | **~30s** |
| Artifact fidelity vs frozen scenario | Partial — literal-URL asserts, no `toHaveValue` autofill asserts, positional XPath swapped ad-hoc during debug | **Full** — semantic locators, regex URLs, enabled-gates, autofill asserts | Minimal — codegen actions + URL asserts only; no enabled-gates, no autofill asserts, positional selectors as recorded |
| Script | `legacy-scripts/test.js` | `incoming-scripts/YOS-Claude.spec.ts` | `incoming-scripts/YOS-Codegen-Device.spec.ts` |

## Reading

- **Time to a first draft is similar for M1 and M3 (~3 min); M2 takes longer
  (~8 min)** because Claude explores the live site as it writes. The
  order-of-magnitude gap is in **time to green**: M1 spent ~2 hours on
  selector/wait hardening the recorder can't do (native `<select>` +
  `setValue`, positional device XPath + cold start, consent-label click
  intercepted by the price panel — full log in
  `todo/2026-09-10-Thursday.md`). M2 reached green in that same ~8 min because
  its locators and waits are correct on the first pass. M3 was quick only
  because little hardening was done — the script is below the scenario bar.
- **Cost shape differs.** M1 and M3 cost human debugging time; M2 costs ~80k
  tokens and almost no debugging. For a one-off that's a clear M2 win; across a
  large suite the token cost scales linearly while the M2 method's
  correctness-first output also lowers ongoing maintenance.
- **Execution: Playwright is ~2× faster** on this scenario (25–30s vs ~60s),
  before accounting for WebDriver's per-command HTTP round-trips vs
  Playwright's single connection. Confirm with N=10.

## Open

- [ ] Re-run all three to the **same** frozen end-state with `makeCustomer()`
      and equal fidelity (add the `toHaveValue` autofill asserts + enabled
      gates to M1 and M3), then re-measure.
- [ ] Execution: N=10, warm + cold instance both noted, same machine.
- [ ] Fill the exact USD figure for M2 from the logged input/output token
      split.
- [ ] Phase 2: extend the frozen scenario + all three scripts through
      `/payment` (+ `/thankyou`) now the eKYC wall has lifted (2026-09-10);
      re-run. Update `docs/benchmark/scenario.md` — its "Why the end-assertion
      is NOT /thankyou" section is now history, not a current constraint.
