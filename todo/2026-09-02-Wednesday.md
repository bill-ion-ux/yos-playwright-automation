# To-Do — 2026-09-02 (Wednesday)

Continues `todo/2026-09-01-Tuesday.md`. Same overall plan: make the manual
authoring method repeatable (Track A), push the pilot to 3-4 gold specs
(Track B), prep the Restructuring Agent only (Track C) — build the agent
next session.

---

## Done so far (carried from 2026-09-01 + this morning)

- **Fixture + seed + config** — `tests/fixtures.ts`, `tests/seed.spec.ts`,
  `playwright.config.ts` (loads `.env`, `baseURL`, `httpCredentials`, split
  `seed` / `restructured` projects, dismisses homepage `#YesxILMUchatModal`).
  Entry point = site root `/`.
- **`CLAUDE.md`** — short rules-of-thumb, distilled from `docs/`.
- **TS setup** — first-ever `npm install`; added `@types/node` + `tsconfig.json`
  (`module: preserve` / `moduleResolution: bundler` — the non-deprecated pair).
  `tsc --noEmit` clean. `docs/tsconfig-explained.md` written (plain-language).
- **`tests/support/identity.ts`** — `makeMyKad` / `makePassport` /
  `makeCustomer` (fresh IC + unique email per run; beats the `yesshop-dev`
  per-identity purchase cap).
- **`tests/support/journey.ts`** — `journey(page, testInfo)` -> `j.shot(name)`;
  writes `screenshots/<test-title>/NN-state.png` (flat, wiped per run,
  `-retryN` on retries). `screenshots/` gitignored.
- **`tests/specs/YOS-ARS-47.spec.ts`** — ported onto the fixture, uses
  `makeCustomer()`, 8 `j.shot()` calls. Passed green once headed
  (`1 passed (1.3m)`). Pilot gold spec #1.
- **eKYC stub** (added to `tests/support/ekyc.ts` + `stubEkyc` option in
  `tests/fixtures.ts`) — network stub of the postpaid VIDA identity check so
  unattended postpaid runs can pass `/plan/verification`. Off by default;
  `test.use({ stubEkyc: true })` or `EKYC_STUB=1`. **PENDING APPROVAL** —
  raised with dev + Sami teams today.

---

## Today

### 1. eKYC finding — write up + hand off  (do first, time-sensitive)

- [ ] **1a. Save the bypass write-up** to `docs/ekyc-frontend-bypass.md`
  (storytelling form: how VIDA works -> the frontend-only enforcement flaw ->
  `handleEKYCDone({status:"Done"})` in console -> impact -> server-side fix).
  Tested on live yes.my; advanced past verification; **no order placed**.
- [ ] **1b. Chase eKYC-stub approval** (dev + Sami). Blocker for using
  `stubEkyc` in CI. If they enforce eKYC server-side (the recommended fix),
  the stub dies -> need a real dev bypass flag / mock VIDA / seeded verified
  identities instead. Record the decision in `tests/support/ekyc.ts` header.

### 2. Harden + confirm pilot gold spec #1

- [/] **2a. Fix the YOS-ARS-47 cart flake** — a later run timed out (180s) at
  `getByRole('heading', { name: 'yes 5g advanced prepaid' }).click()`. Click
  the plan **card container** (`generic [cursor=pointer]`), not the nested
  heading. Re-run headed to confirm green twice in a row.

### 3. Pilot gold spec #2 — YOS-ARS-43

- [/] **3a. Write `tests/specs/YOS-ARS-43.plan.md`** offline from
  `legacy-scripts/YOS_Device_Plan.js` + the 3 `incoming-scripts/YOS-ARS-43*`
  variants.
- [/] **3b. Author `tests/specs/YOS-ARS-43.spec.ts`** on the fixture:
  - `makePassport()` for the ID (it's a PASSPORT journey)
  - drop the broken `#device-list-section div:nth-child(15)` locator (doc 02)
    for `a[href$="/add-to-cart/<id>"]` + role locators
  - it's an A57 5G **postpaid** Infinite+ journey -> will hit
    `/plan/verification` -> needs `test.use({ stubEkyc: true })`
  - add `j.shot()` calls per state
  - `toBeEnabled()` before every Next, `toHaveURL` sync points (doc 08)
- [/] **3c. Run it green** (postpaid cap is 15, plenty of runway).

### 4. Repo cleanup

- [/] **4a.** rename `legacy-scripts/YOS_Fulfillment_YCMS_Warehouse.jsYOS_Fulfillment_YCMS_Warehouse.js`
  (doubled filename).

### 5. Unblock the rest of the corpus

- [/] **5a.** Confirm access to the `froth-webdriverio-framework` script repo
  so the other ~32 legacy scripts can be imported (blocks B2/B3 from
  yesterday). Until then only YOS-ARS-43 and -47 have real source.

### 6. If there's runway — prep the Restructuring Agent (don't build it)

- [ ] **6a. Stand up the real POM/COM layer** — `DevicesPage`, `CartPage`,
  `VerificationPage`, `DeliveryPage`, `PaymentPage` extracted from the 2 gold
  specs. The agent's output target must exist first.
- [] **6b. Implement `ClaudeClient.generate()` + `usage_stats()`**
  (`agents/llm_client/claude_client.py`) — the one agent piece with no
  blockers; both agents need it.
- [ ] **6c. Draft the Restructuring Agent prompt as a doc** — inputs = WDIO
  script + `CLAUDE.md` patterns + POM classes + `tests/support/*` helpers
  (identity, journey, ekyc); outputs = spec + `ConversionReport`. Few-shot
  examples = YOS-ARS-43 and -47. Explicit rule: never inline literal IDs /
  emails, always `makeCustomer()`; add `j.shot()` per state.

### 7. Project progress presentation

- [x] **7a. Presented project progress to supervisor** — walked through the
  authoring method, the two pilot gold specs (YOS-ARS-47 / -43), and the
  eKYC frontend-bypass finding.

---

## Notes

- Prepaid journeys need neither `stubEkyc` nor a real identity that passes
  eKYC — the site skips the VIDA gate for PREPAID. Postpaid always hits it.
- `restructured` project runs `specs/**/*.spec.ts` only; `seed` is its own
  project so CI (`--project=restructured`) never runs it.
- Follow-up from yesterday: ad d `passWithNoTests: true` if an empty
  `restructured` ever breaks CI (moot once >=1 spec is committed).
