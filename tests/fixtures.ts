import { test as base, expect, type Page } from '@playwright/test';
import { installEkycStub, ekycStubFromEnv } from './support/ekyc';

export { expect };

/**
 * Shared fixtures for the migrated ("restructured") YOS suite.
 *
 * The overridden `page` fixture lands every spec on the YOS site root
 * (`https://yesmy-dev.azurewebsites.net/`) - already through HTTP basic
 * auth, past the Azure App Service cold start, and with the homepage
 * pre-order modal dismissed. Every flow starts here and navigates onward
 * by clicking (Devices, Broadband, etc.); specs must not repeat the root
 * navigation themselves.
 *
 * Auth + host come from the environment (`.env` locally, CI secrets in the
 * pipeline), wired up in `playwright.config.ts`:
 *   - DEV_SITE_USER / DEV_SITE_PASS -> use.httpCredentials
 *   - YOS_HOST (optional)           -> use.baseURL
 *
 * Page-specific readiness (a section heading, a catalogue list, ...) belongs
 * in that section's spec or Page Object, not here. Journeys that run the
 * full checkout + payment chain should raise their own budget with
 * `test.setTimeout(180_000)`.
 */

export const ROOT_PATH = '/';

/**
 * The homepage renders a "pre-order" / ILMU-chat modal (`#YesxILMUchatModal`)
 * a beat after load. It is `aria-modal` and its backdrop intercepts pointer
 * events, so it blocks the very first click of every spec. Dismiss it here
 * once. It is absent on deep-linked pages like `/devices/`, which is why the
 * original recorded scripts never had to deal with it.
 *
 * Confirmed live (2026-09-29) that on the dev build the modal element can
 * fail to even render (a bootstrap.bundle.js Modal init throws on the site's
 * own homepage script) - `#YesxILMUchatModal` never enters the DOM at all.
 * Probe for it with a short `waitFor` first: locator actions like `.click()`
 * poll for the full timeout before throwing, so calling `.click({timeout:
 * 15_000})` unconditionally turned every "modal didn't show" run into a flat
 * 15s stall before the spec's first action, swallowed silently by the catch.
 */
async function dismissHomepageModal(page: Page): Promise<void> {
  const modal = page.locator('#YesxILMUchatModal');
  try {
    await modal.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return; // modal didn't show (or doesn't render at all) this run - fine
  }
  await modal
    .getByRole('button', { name: 'Close' })
    .click({ timeout: 5_000 })
    .catch(() => {});
  await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
}

/** Test-scoped options layered onto the base `test`. */
type YosOptions = {
  /**
   * Stub the postpaid eKYC (VIDA) identity check so an unattended run can
   * get past `/plan/verification`. Off by default; prepaid journeys never
   * need it. Opt in per spec with `test.use({ stubEkyc: true })`, or set
   * `EKYC_STUB=1` for a whole run.
   *
   * PENDING dev + Sami team approval - see tests/support/ekyc.ts.
   */
  stubEkyc: boolean;
};

export const test = base.extend<YosOptions>({
  stubEkyc: [ekycStubFromEnv(), { option: true }],

  page: async ({ page, stubEkyc }, use) => {
    // Azure App Service cold-starts; the first navigation of a run can take
    // ~30s. Give navigation room well beyond the Playwright default.
    page.setDefaultNavigationTimeout(90_000);

    // Optional, opt-in: intercept the eKYC result endpoints before any
    // navigation so nothing slips through on the verification step later.
    if (stubEkyc) await installEkycStub(page);

    await page.goto(ROOT_PATH, { waitUntil: 'domcontentloaded' });

    // Readiness gate: the global top-nav "Devices" control is present on
    // every YOS page, so waiting for it absorbs the cold start before any
    // spec's (shorter-timeout) assertions run.
    await expect(
      page.getByRole('button', { name: 'Devices' }),
    ).toBeVisible({ timeout: 60_000 });

    await dismissHomepageModal(page);

    await use(page);
  },
});
