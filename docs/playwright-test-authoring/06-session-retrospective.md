# Session Retrospective — Time, Shell Commands, Tokens

Scope: building `incoming-scripts/YOS-ARS-47-Claude.spec.ts` from the
`/playwright-cli` request through to a passing test.

> **On the token numbers:** the API does not expose per-call token counts
> during a session. Every figure below is an **estimate** from the byte size
> of each command's output (`chars ÷ 4`) plus generated text. Order of
> magnitude, not measured.

---

## 1. Time

| Phase | Wall-clock (approx) | Evidence |
|---|---|---|
| Tool discovery (how to invoke `playwright-cli`) | ~2 min | trial-and-error + one hung process |
| Live browser exploration of the full flow | **~5 min** | snapshot timestamps `08:45:47Z` → order placed `08:50:44Z` |
| Writing the spec file | ~1 min | one `Write` |
| First test run (failed at FPX locator) + retry | ~2 min | `58.9s` + `35s` retry |
| One-line fix + second run (green) | ~1.5 min | `59.6s` |
| **Total** | **~12–13 min** | |

---

## 2. Every shell command, in order (~42 `Bash` calls)

`~tok` = estimated output tokens returned into context.

### Phase A — tool discovery

| # | Command (abridged) | Purpose | ~tok |
|---|---|---|---|
| 1 | `find … -iname "*.yml"` + `ls -la` + find `playwright-cli` dir | locate the "yaml file" / project layout | 500 |
| 2 | `cat playwright.config.ts; ls tests/ incoming-scripts/; ls -t .playwright-cli/*.yml` | read config, see the `incoming` project + existing specs | 300 |
| 3 | `which playwright-cli; playwright-cli --version` | is the tool installed | 60 |
| 4 | `playwright-cli -s=ars47 open '…/devices/'` | ❌ `unknown option '-s=ars47'` | 20 |
| 5 | `playwright-cli --help` | discover it wraps `npx playwright` | 400 |
| 6 | `file …/playwright-cli; head -c 400 …; playwright-cli open --help` | ❌ hung (opened a real browser), auto-backgrounded (id `bh29zwdf4`) | 120 |
| 7 | `cat …/bh29zwdf4.output` | read the backgrounded output | 200 |
| 8 | `kill %1; pkill -f "playwright.*open"; playwright-cli list` | clean up the stuck browser | 15 |
| 9 | `playwright-cli cli --help \| tail -40` | found the real sub-CLI (`playwright-cli cli …`) + command list | 550 |
| 10 | `playwright-cli cli --help \| head -50` | session syntax `-s=<session>` | 550 |

### Phase B — live exploration

| # | Command (abridged) | What it told me | ~tok |
|---|---|---|---|
| 11 | `cli -s=ars47 open '…/devices/'` | ✅ browser up, first snapshot | 150 |
| 12 | `cat "$(ls -t …/page-*.yml \| head -1)"` | 95.6 KB tree → **persisted to a file**, only ~2 KB preview into context | 550 |
| 13 | `find --regex "/z fold 8\|explore devices\|buy now/i"` | device names are `<heading>`s; "Buy Now" links carry `/add-to-cart/<id>` | 550 |
| 14 | `find --regex "/samsung\|fold\|galaxy/i"` | `/devices/` catalogue has no Z Fold 8 yet → need the nav flow | 650 |
| 15 | `click e31` (Devices nav) + `find "explore devices"` | submenu link `Explore Devices` = `e2060` | 400 |
| 16 | `click e2060` + `find "/z fold ?8\|fold8/i"` | 2 cards: `Galaxy Z Fold 8` (`f2e150`) and `… Ultra` | 480 |
| 17 | `snapshot f2e146` | Z Fold 8 card → Buy Now href `/add-to-cart/315` | 250 |
| 18 | `click f2e157` (Buy Now) + `snapshot --depth=6` | landed on `…/cart` | 480 |
| 19 | `sleep 3; find --regex "/next\|prepaid\|postpaid\|graphite\|colou?r\|select\|proceed/i"` | colour tabs (Cream/Graphite/Lavender), storage buttons, plan card, `Next [disabled]` | 800 |
| 20 | `click f4e76` (Graphite) + `click f4e117` (storage ❌ stale ref) + `click f4e151` (plan) | Graphite applied; `12GB+512GB` is default; plan needs a role locator | 300 |
| 21 | `find --regex "/next\|prepaid\|storage\|RM ?0\|select/i"` | "Choose Contract Period" → `Prepaid` button `f4e186` appeared | 900 |
| 22 | `click f4e186` + `find "/next\|RM ?0\|advanced prepaid\|contract/i"` | "Select A Prepaid Plan" → button `f4e195` "Yes 5g advanced prepaid RM 0 …" | 650 |
| 23 | `click f4e195` + `find "/\"Next\"\|SIM\|eSIM/i"` | `Next` now enabled (`f4e216`); "Choose SIM Type" eSIM / SIM card | 550 |
| 24 | `click f4e224` (SIM card) + `click f4e216` (Next) + `find "personal details\|ID Type"` | landed on `…/verification` | 550 |
| 25 | `snapshot f5e114` | full form: ID Type `<select>`, ID No, Full Name, Gender, DOB, Phone (`spinbutton`), Email, 2 checkboxes | 900 |
| 26 | `select f5e130 "MyKad"` + `fill f5e134 "900215085432"` + `snapshot f5e126` | IC parsed → **DOB `15/02/1990` auto-filled, Gender FEMALE auto-selected** | 900 |
| 27 | `fill` name/phone/email + `check f5e158`/`f5e163` (❌ intercepted) + `find "/\"Next\"/"` | checkboxes covered by an overlay; `Next` still `[disabled]` | 480 |
| 28 | `click f5e159` + `click f5e164` (consent **labels**) + `find "/\"Next\"/"` | `Next` now enabled (`f5e168`) | 330 |
| 29 | `click f5e168` (Next) + `sleep 2` + `find "address\|delivery\|…"` | landed on `…/accessories` | 180 |
| 30 | `find --regex "/\"Next\"\|skip\|no thanks\|accessor/i"` | accessories page → just a `Next` (`f6e140`) | 330 |
| 31 | `click f6e140` (Next) + `sleep 2` + `find "address\|postal\|delivery\|state\|city\|PROCEED"` | landed on `…/delivery-addresses`; Address/Unit/Postal fields, State/City `[disabled]` | 650 |
| 32 | `fill f7e146/f7e151/f7e156` (address/unit/postal) + `sleep 2` + `find "State\|City\|Next"` | **State + City auto-filled from postcode**; `Next` = `f7e167` | 480 |
| 33 | `click f7e167` (Next) + `sleep 3` + `find "payment\|FPX\|online banking\|bank\|pay now\|card"` | landed on `…/payment`; radios Card / FPX / Instalment; `Pay Now [disabled]` | 800 |
| 34 | `click f8e117` (FPX label) + `find "select bank\|maybank\|CIMB\|bank\|pay now"` | bank `<select>` appears (`f8e187`), Maybank2U among options | 800 |
| 35 | `select f8e187 "Maybank2U"` + `find "pay now"` + `eval "el => el.id" f8e187` | `Pay Now` enabled (`f8e188`); the select's id is `#select-bank` | 400 |
| 36 | `click f8e188` (Pay Now) + `sleep 4` + `tab-list` | **new popup tab** → `about:blank`, then the Razorpay mock URL | 400 |
| 37 | `tab-select 1` + `sleep 4` + `snapshot` | mock bank page: heading "Welcome to Razorpay Curlec Bank", buttons `Success` / `Failure` | 300 |
| 38 | `click f2e6` (Success) + `sleep 5` + `tab-list` | click errored "page closed", but tab 0 already on `…/thankyou` | 150 |
| 39 | `tab-select 0` + `sleep 2` + `snapshot` | thank-you page contents | 650 |
| 40 | `find --regex "/thank you\|order\|reference\|success\|Y5GA\|received/i"` | heading "Thank you!", "Tracking / Order Number", `Y5GA2608282000042337` | 400 |

### Phase C — write & verify

| # | Command (abridged) | Result | ~tok |
|---|---|---|---|
| 41 | `cli -s=ars47 close` + `npx playwright test …/YOS-ARS-47-Claude… --project=incoming` | ❌ strict-mode: `getByText('Online Banking (FPX)')` matched 2 elements | 650 |
| 42 | `npx playwright test …/YOS-ARS-47-Claude… --project=incoming` | ✅ **1 passed (59.6s)** | 90 |

---

## 3. Non-shell actions

| Tool | Count | Detail | ~tok (generated) |
|---|---|---|---|
| `Write` | 1 | the 128-line spec file | ~1,300 |
| `Edit` | 1 | line 101: `getByText(...)` → `locator('label').filter({ hasText: ... })` | ~150 |
| `Read` | 0 | (within this task) | — |

---

## 4. Token totals (estimated)

| Bucket | ~tokens |
|---|---|
| Shell command outputs into context (42 calls) | **~19,000** |
| Thinking blocks across ~30 turns | ~7,000 |
| Visible replies + spec file + edit | ~4,000 |
| **Net new context added by the task** | **≈ 30,000** |

Caveats:

- **Biggest saver:** command #12 — a 95.6 KB snapshot that `playwright-cli`
  persisted to disk, so only ~2 KB entered context (would have been
  ~24,000 tokens if `cat`-ed whole). Using `find` / `snapshot <ref>` for
  every other query kept each step at 200–900 tokens.
- **Cumulative processing** is far larger than 30 K: every turn re-sends the
  growing transcript, so across ~45 turns the model processed on the order of
  **1–1.5 M input tokens** — mostly served from prompt cache, not re-billed
  at full rate. The 30 K figure is the *net new* content generated.

See [`07-token-efficiency.md`](07-token-efficiency.md) for how to cut this.
