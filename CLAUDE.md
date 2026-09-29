# CLAUDE.md

Rules of thumb, distilled from `docs/playwright-test-authoring/`.

## Authoring specs

- Drive the **live site** with `playwright-cli`; paste the role-based locators
  it emits. Don't hand-write selectors from memory.
- Replace any generated positional CSS (`div:nth-child(15)`) with a semantic
  locator — `getByRole`, or `a[href$="/add-to-cart/<id>"]` for catalogue items.
- Turn exploration failures into test logic: overlay-covered checkbox → click
  its label text; a field the site auto-fills (DOB from MyKad, State/City from
  postcode) → `toHaveValue` assert it, don't fill it.
- `toHaveURL(/…/)` between pages as sync points; `toBeEnabled()` before every
  `Next`; regex (not literals) for volatile values like order numbers.

## playwright-cli

- Stateful form: `playwright-cli cli -s=<session> <cmd>`.
- Refs die on every navigation — `find "<label>"` again on each new page;
  never `cat` a `*.yml` snapshot. `find` also shows `[disabled]`/`[enabled]`.
- `find` matches names/text, not ids — use `snapshot "#id"` for an id.
- This install has **no `--raw`**; `open --help` (no `cli`) hangs the shell.
- A batch shell-walk of the checkout fails (progressive form, no auto-wait) —
  drive it through a real test with `--debug=cli`.

## Efficiency

- Fewer, fatter turns beats trimming any single output.
- Save reasoning budget for selector-design calls, not the find→click→find middle.

## Payment flow

- Never `page.goto()` a gateway redirect URL — drive what the popup loads.
- `page.waitForEvent('popup')` **before** clicking Pay Now; the bank popup
  closes itself on Success → `.catch(() => {})` then `page.waitForURL(/thankyou/)`.
- Cold-start Azure: raise timeouts, don't trust the 5s default. Intermittent
  FPX backend: a closed popup usually means no gateway session, not a script bug.

## This repo

- Specs import `test`/`expect` from `tests/fixtures.ts` (auth, root nav,
  cold-start wait, homepage `#YesxILMUchatModal` dismissal).
- Identities from `tests/support/identity.ts` (`makeCustomer()`), never
  literals — `yesshop-dev` caps ~5 prepaid / ~15 postpaid orders per ID.
- Author from the seed: `npx playwright test --project=seed --debug=cli`.
- Run: `npx playwright test --project=restructured` (`incoming` / `seed` too).
