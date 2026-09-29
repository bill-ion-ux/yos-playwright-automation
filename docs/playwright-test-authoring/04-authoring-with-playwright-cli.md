# Authoring `YOS-ARS-47-Claude` with `playwright-cli`

Goal: from the Yes "All Devices" listing, buy the **Samsung Galaxy Z Fold 8**
prepaid bundle, fill every form with mock data, and complete the FPX mock
payment through to "Thank you!" — written as a fresh test that does not
reference any existing `incoming-scripts` file.

Output: `incoming-scripts/YOS-ARS-47-Claude.spec.ts` — **passes in ~59 s.**

---

## 1. How `playwright-cli` exposes the page

`playwright-cli cli -s=<session> <command>` keeps **one long-lived browser**
alive between shell invocations. After every command it prints an
**accessibility-tree snapshot** as YAML. Every node looks like this:

```yaml
- tab "Graphite" [ref=f4e76] [cursor=pointer]
- button "Next" [disabled]
- textbox "Full Name *" [ref=f5e138]
- radio " Online Banking (FPX)" [checked] [ref=f8e158]
- heading "Galaxy Z Fold 8" [level=2] [ref=f2e150]
```

That single line contains everything needed to write a locator:

| Snapshot token | Meaning | Playwright equivalent |
|---|---|---|
| `tab`, `button`, `textbox`, `combobox`, `heading`, `link`, `checkbox`, `spinbutton` | ARIA **role** | `getByRole('tab', ...)` |
| `"Graphite"` | **accessible name** | `{ name: 'Graphite' }` |
| `[disabled]`, `[checked]`, `[selected]`, `[active]` | element state | assertion targets / wait conditions |
| `[ref=f4e76]` | a handle to act on **right now** | (not written into the test) |

The `ref` prefix (`e`, `f2e`, `f4e`, `f5e`, ...) changes whenever the page
context changes — see [`05-find-vs-snapshot.md`](05-find-vs-snapshot.md).

---

## 2. The discovery loop (repeated for every step)

```
 goto / click something
        │
        ▼
 page prints a snapshot (or a link to one on disk)
        │
        ▼
 find --regex "/label I expect/i"      ← cheap: only matching nodes + context
        │
        ▼
 read role + name + state + ref of the target
        │
        ▼
 click / fill / select <ref>           ← playwright-cli PRINTS the code it generated
        │
        ▼
 paste that generated line into the spec  (fix it if it's fragile)
```

### Commands used

| Command | Role in the loop |
|---|---|
| `open <url>` / `goto <url>` | navigate; get first snapshot |
| `find [--regex] "<text>"` | grep the current snapshot for nodes matching text; returns matches with ~3 lines of surrounding tree |
| `snapshot [<ref>] [--depth=N]` | dump a bounded subtree (used for whole forms / a single device card) |
| `click <ref-or-locator>` | click; **prints** `await page.getByRole(...).click();` |
| `fill <ref> "<text>"` | type into a field; prints the `fill` code |
| `select <ref> "<value>"` | choose a `<select>` option; prints `selectOption([...])` |
| `check <ref>` | tick a checkbox (failed here — see §4) |
| `eval "<fn>" <ref>` | read a property not in the snapshot (used to confirm the bank `<select>` id is `#select-bank`) |
| `tab-list` / `tab-select <n>` | see / switch browser tabs (needed for the payment popup) |

---

## 3. Turning each observation into a line of the test

`playwright-cli` doesn't just give you refs — when you act, it **emits the
Playwright code** for that action, derived from the element's role + name.
Examples it produced verbatim, which went straight into the spec:

```js
await page.getByRole('button', { name: 'Devices' }).click();
await page.getByRole('link', { name: 'Explore Devices' }).click();
await page.getByRole('tab', { name: 'Graphite' }).click();
await page.getByLabel('ID Type *').selectOption(['MyKad']);
await page.getByRole('spinbutton', { name: 'Phone Number' }).fill('0192345678');
await page.locator('#select-bank').selectOption(['Maybank2U']);
```

### Where the generated code was replaced

The generator falls back to positional CSS when a node has no good name.
Those were swapped for semantic equivalents:

| Generated (fragile) | Used in the spec | Reason |
|---|---|---|
| first `Buy Now` link on the page | `page.locator('a[href$="/add-to-cart/315"]')` | two cards exist — "Z Fold 8" and "Z Fold 8 **Ultra**"; href 315 is unique (confirmed by the later slug `samsung-galaxy-z-fold-8-old-315`) |
| `div:nth-child(3) > .layer-action-payment-plan-inner` | `page.getByRole('heading', { name: 'yes 5g advanced prepaid' })` | index breaks if plan order changes |
| `page.getByText('Online Banking (FPX)')` | `page.locator('label').filter({ hasText: 'Online Banking (FPX)' })` | **strict-mode violation** — text matched a `<label>` *and* an `<h4>`; this is the one that failed the first `npx playwright test` run |

---

## 4. How exploration *failures* became test logic

| Observed while driving the browser | Line(s) in the spec |
|---|---|
| `check f5e158` → `"<div class="col-lg-6 form-sec-ch-pre-l"> intercepts pointer events"` | click the **label text** instead: `page.getByText('By activating the Yes Service').click()` and `page.getByText('I further give consent to').click()` |
| After `fill` MyKad number, snapshot showed `Date Of Birth ... text: 15/02/1990` and `option "FEMALE" [selected]` — auto-derived | `await expect(page.getByRole('textbox', { name: 'Date Of Birth *' })).toHaveValue('15/02/1990')` |
| After `fill` postal `55100`, snapshot showed `State ... WILAYAH PERSEKUTUAN KUALA LUMPUR`, `City ... KUALA LUMPUR` | two `toHaveValue` assertions |
| `button "Next" [disabled]` before consents; `button "Next" [ref=f5e168] [cursor=pointer]` after | `await expect(next).toBeEnabled()` before every `Next` click |
| `tab-list` after **Pay Now** showed a new `about:blank` tab | register `const popupPromise = page.waitForEvent('popup')` **before** the click |
| `click` on "Success" threw `Target page ... has been closed`, but tab 0 was already on `/thankyou` | `await bankPage.getByRole('button', { name: 'Success' }).click().catch(() => {})` then `page.waitForURL(/\/thankyou/)` |
| Each step landed on a distinct URL: `/cart`, `/verification`, `/accessories`, `/delivery-addresses`, `/payment`, `/thankyou` | `await expect(page).toHaveURL(/.../)` as synchronisation points between pages |
| Thank-you snapshot: `paragraph: Y5GA2608282000042337` under `Tracking / Order Number` | `await expect(page.getByText(/^Y5GA\d+$/)).toBeVisible()` (regex, not the literal id) |

---

## 5. The exact click-path discovered

| # | Page / URL | Action | Selector in the spec |
|---|---|---|---|
| 1 | `.../devices/` | open with basic-auth URL | `page.goto('https://yesmy-dev:YesMyDev123$@yesmy-dev.azurewebsites.net/devices/')` |
| 2 | devices | open nav dropdown | `getByRole('button', { name: 'Devices' })` |
| 3 | devices | go to full catalogue | `getByRole('link', { name: 'Explore Devices' })` |
| 4 | All Devices | pick Z Fold 8 (not Ultra) | assert `getByRole('heading', { name: 'Galaxy Z Fold 8', exact: true })`, then click `locator('a[href$="/add-to-cart/315"]')` |
| 5 | `/cart` | colour | `getByRole('tab', { name: 'Graphite' })` |
| 6 | `/cart` | storage | `getByRole('button', { name: '12GB+512GB' })` |
| 7 | `/cart` | choose plan | `getByRole('heading', { name: 'yes 5g advanced prepaid' })` |
| 8 | `/cart` | contract period | `page.locator('#page-main').getByRole('button', { name: 'Prepaid' })` |
| 9 | `/cart` | plan price tile | `getByRole('button', { name: 'Yes 5g advanced prepaid RM 0' })` |
| 10 | `/cart` | SIM type | `getByRole('button', { name: 'SIM card' })` |
| 11 | `/cart` | proceed | `getByRole('button', { name: 'Next' })` (assert enabled) |
| 12 | `/verification` | ID type | `getByLabel('ID Type *').selectOption('MyKad')` |
| 13 | `/verification` | mock IC / name / phone / email | role-based `fill`s (see [`08-final-script.md`](08-final-script.md)) |
| 14 | `/verification` | DOB auto-check | `toHaveValue('15/02/1990')` |
| 15 | `/verification` | two consents | `getByText('By activating the Yes Service')`, `getByText('I further give consent to')` |
| 16 | `/verification` | proceed | `getByRole('button', { name: 'Next' })` (assert enabled) |
| 17 | `/accessories` | skip | `getByRole('button', { name: 'Next' })` |
| 18 | `/delivery-addresses` | mock address / unit / postcode | role-based `fill`s |
| 19 | `/delivery-addresses` | State + City auto-check | two `toHaveValue` |
| 20 | `/delivery-addresses` | proceed | `getByRole('button', { name: 'Next' })` (assert enabled) |
| 21 | `/payment` | payment method | `locator('label').filter({ hasText: 'Online Banking (FPX)' })` |
| 22 | `/payment` | bank | `locator('#select-bank').selectOption('Maybank2U')` |
| 23 | `/payment` | pay (opens popup) | `waitForEvent('popup')` + `getByRole('button', { name: 'Pay Now' })` |
| 24 | Razorpay mock | assert + succeed | `bankPage.getByRole('heading', { name: 'Welcome to Razorpay Curlec Bank' })`, then `getByRole('button', { name: 'Success' })` |
| 25 | `/thankyou` | confirm order | `getByRole('heading', { name: 'Thank you!' })`, `getByText('Tracking / Order Number')`, `getByText(/^Y5GA\d+$/)` |

---

## 6. Mock data used

```ts
const MOCK = {
  idNumber: '900215085432',   // MyKad -> site derives DOB 15/02/1990 + gender
  dob: '15/02/1990',
  fullName: 'SITI NURULHUDA BINTI AHMAD',
  phone: '0192345678',
  email: 'siti.nurulhuda.test@gmail.com',
  address: 'NO 8 JALAN BUKIT BINTANG',
  unitNo: '12-3',
  postalCode: '55100',        // -> State WILAYAH PERSEKUTUAN KUALA LUMPUR, City KUALA LUMPUR
  state: 'WILAYAH PERSEKUTUAN KUALA LUMPUR',
  city: 'KUALA LUMPUR',
};
```

---

## 7. Invocation gotchas discovered

- The installed `playwright-cli` binary wraps `npx playwright`. The
  stateful skill CLI is the **`cli` subcommand**:
  `playwright-cli cli -s=<session> <command>` (a bare
  `playwright-cli -s=... open` fails with `unknown option '-s='`).
- The devices URL contains `$` in the password
  (`YesMyDev123$@`). It must be **single-quoted** in bash or the shell
  mangles it.
- `playwright-cli open --help` (no `cli`) launches a real browser and hangs
  the shell — it is the interactive `npx playwright open`, not help for the
  sub-CLI.
