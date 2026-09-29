import { expect, type Locator, type Page, type Response, type Route } from '@playwright/test';

/**
 * eKYC bypass for postpaid checkout automation.
 *
 * !!! PENDING APPROVAL - raised with the dev + Sami teams on 2026-09-02.
 * Do not enable this in CI until they confirm the approach is acceptable.
 * Tracking ticket: <TODO: link>.
 *
 * Why this exists
 * ---------------
 * The postpaid `/plan/verification` step gates on a third-party identity
 * check (VIDA - document scan + face match). There is no unattended test
 * identity we can drive, so an automated postpaid journey cannot get past
 * it. This stubs the provider at the network boundary - the same pattern
 * the suite already uses for the FPX mock payment gateway.
 *
 * Prepaid journeys do NOT need this: the site skips eKYC entirely when the
 * plan type is PREPAID (see YOS-ARS-47, which walks verification -> accessories
 * with no gate).
 *
 * How it works / when it will break
 * --------------------------------
 * The eKYC gate is currently CLIENT-SIDE. The desktop verification page
 * polls our own backend for the result and advances as soon as it sees
 * `status: "success"`; intercepting that poll is enough. If the backend
 * starts enforcing eKYC server-side (the fix we recommended), this stub
 * will stop working and postpaid specs will need a real dev-environment
 * bypass flag from the backend team instead.
 *
 * Two provider paths are covered, because which one runs depends on the
 * server's VIDA config and the browser:
 *   - VIDA handoff poll ...  GET   <origin>/vida/handoff/<ref>/poll
 *   - YDBP fallback check ..  POST  <origin>/api/ydbp/ekyc-check
 *
 * Usage
 * -----
 * Preferred - opt in per spec via the fixture (tests/fixtures.ts):
 *
 *     import { test, expect } from '../fixtures';
 *     test.use({ stubEkyc: true });
 *
 * Or set `EKYC_STUB=1` for a whole run. Or call directly on a raw page
 * before it reaches `/plan/verification`:
 *
 *     await installEkycStub(page);
 *
 * Flow note: the stub does not skip the verification screen. The spec must
 * still fill the personal-details form and press Next once to start eKYC;
 * the stubbed poll then goes terminal within ~5s and the page re-enables
 * Next. A MyKad postpaid journey therefore presses Next twice on this step
 * (a Passport journey auto-submits after eKYC and presses once).
 */

/** Arbitrary id echoed back as the "verified" reference; only shape matters. */
const MOCK_VERIFICATION_ID = 'qa-ekyc-stub-0001';

/** Terminal "approved" body for the VIDA desktop handoff poll. */
function vidaPollBody(): string {
  return JSON.stringify({
    status: true,
    message: 'success',
    data: {
      terminal: true,
      status: 'success',
      outcome: 'success',
      verificationId: MOCK_VERIFICATION_ID,
      message: null,
    },
  });
}

/** "Done" body for the non-VIDA YDBP status check (`processStatus` is upper-cased by the client). */
function ydbpCheckBody(): string {
  return JSON.stringify({
    status: true,
    data: {
      processStatus: 'EKYC_DONE',
      verificationId: MOCK_VERIFICATION_ID,
    },
  });
}

function fulfilJson(route: Route, body: string): Promise<void> {
  return route.fulfill({ status: 200, contentType: 'application/json', body });
}

/**
 * Intercept both eKYC result endpoints so the verification step reports a
 * successful check. Routes persist for the life of the page; call this once
 * before the checkout reaches `/plan/verification`.
 */
export async function installEkycStub(page: Page): Promise<void> {
  await page.route('**/vida/handoff/*/poll', (route) => fulfilJson(route, vidaPollBody()));
  await page.route('**/api/ydbp/ekyc-check', (route) => fulfilJson(route, ydbpCheckBody()));
}

/** True when `EKYC_STUB` is set to a truthy-ish value in the environment. */
export function ekycStubFromEnv(): boolean {
  const v = (process.env.EKYC_STUB ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Human-in-the-loop eKYC.
 *
 * The backend now enforces VIDA server-side (see `installEkycStub` above -
 * the stub no longer gets past `/verification-cart-update`), so the only way
 * through a MyKad postpaid/broadband verification today is a person passing
 * the real doc-scan + selfie check. This helper parks the run at that step
 * and resumes on its own the moment the site accepts the result.
 *
 * Run HEADED so there is a browser to act in, and with no retries (a retry
 * restarts the journey and asks for eKYC all over again):
 *
 *     ./run.sh YOS-ARS-43.spec.ts --headed
 */

/** How long to wait for the human, in ms. `EKYC_WAIT_MS` overrides (default 5 min). */
export function ekycWaitMs(): number {
  const n = Number(process.env.EKYC_WAIT_MS);
  return Number.isFinite(n) && n > 0 ? n : 5 * 60_000;
}

/**
 * Block until the site reports the manual eKYC as done, then say how.
 *
 * "Done" comes from the backend, never from elapsed time. The page polls
 * `GET /vida/handoff/<ref>/poll`; while pending it returns
 * `{data:{status:"pending",terminal:false,idMismatch:false,...}}`. We watch
 * those responses (logged as `[eKYC] poll`):
 *   - `data.terminal:true` with status/outcome "success", AND a `Next` button
 *     enabled again                                    -> 'next-enabled'
 *   - `data.idMismatch:true`                            -> throws (wrong MyKad)
 *   - the page moved on to `advanceUrl`                 -> 'advanced'
 * Fallback if no poll body is recognised: `Next` enabled after having been
 * seen disabled (or after 20s without ever seeing that).
 *
 * The re-rendered page can carry several "Next" buttons, so "enabled" means
 * any of them; pair with `clickEnabled()` for the press.
 *
 * Polls once a second, logs a heartbeat every 30s so you can see it is alive,
 * and throws a clear error if the person doesn't finish inside the budget.
 */
export async function waitForManualEkyc(
  page: Page,
  opts: { advanceUrl: RegExp; next: Locator; timeout?: number },
): Promise<'advanced' | 'next-enabled'> {
  const timeout = opts.timeout ?? ekycWaitMs();
  const started = Date.now();
  const elapsed = () => Math.round((Date.now() - started) / 1000);
  const banner = '='.repeat(64);

  console.log(
    `\n${banner}\n` +
      `  MANUAL eKYC REQUIRED - complete the identity check in the browser.\n` +
      `  Scan the QR with your phone (or click "Verify Now") and finish the\n  doc scan + selfie (usually 1-5 min).\n` +
      `  The test resumes by itself the moment the site accepts it\n` +
      `  (waiting up to ${Math.round(timeout / 1000)}s).\n` +
      `${banner}\n`,
  );
  // Ring the terminal bell so a person looking elsewhere notices.
  process.stdout.write('\u0007');

  // Log every eKYC poll response (status + body) so we can learn what the
  // backend returns on success. Consecutive identical bodies are collapsed -
  // the page polls every few seconds and would otherwise flood the terminal.
  let lastPoll = '';
  let ekycResult: 'success' | 'failed' | 'mismatch' | undefined;
  const onResponse = async (res: Response) => {
    if (!/ekyc-check|\/vida\/(handoff\/[^/]+\/poll|status|session)/.test(res.url())) return;
    const body = (await res.text().catch(() => '<unreadable>')).slice(0, 400);
    const line = `${res.request().method()} ${new URL(res.url()).pathname} -> ${res.status()} ${body}`;
    if (line === lastPoll) return;
    lastPoll = line;
    console.log(`[eKYC] poll @${elapsed()}s: ${line}`);

    // Primary completion signal: the same terminal flag the page reacts to.
    // Pending body (observed live): {"data":{"status":"pending","terminal":false,
    // "outcome":null,"idMismatch":false,...}}. The success body is assumed to
    // be terminal:true + status/outcome "success" (from the client's contract).
    try {
      const d = JSON.parse(body)?.data;
      if (d?.idMismatch === true) {
        ekycResult = 'mismatch';
      } else if (d?.terminal === true) {
        ekycResult = d.status === 'success' || d.outcome === 'success' ? 'success' : 'failed';
      } else if (String(d?.processStatus ?? '').toUpperCase() === 'EKYC_DONE') {
        ekycResult = 'success'; // YDBP variant
      }
    } catch {
      /* truncated / non-JSON body - ignore, the UI fallback still applies */
    }
  };
  page.on('response', onResponse);

  let sawDisabled = false;
  let nextBeat = 30;
  let warnedFailed = false;
  try {
    while (Date.now() - started < timeout) {
      if (opts.advanceUrl.test(page.url())) {
        console.log(`\n[eKYC] done after ${elapsed()}s - page advanced.\n`);
        return 'advanced';
      }

      if (ekycResult === 'mismatch') {
        throw new Error(
          'eKYC reported an ID mismatch - the scanned MyKad does not match the details typed ' +
            'into the form (check EKYC_* in .env).',
        );
      }
      if (ekycResult === 'failed' && !warnedFailed) {
        // The non-success status name is unverified, so don't abort on it - the
        // poll line above shows the body, and the UI fallback below still applies.
        warnedFailed = true;
        console.log('[eKYC] poll went terminal but not "success" - see the poll line above.');
      }

      // The page re-renders a second "Verify Personal Details" form after eKYC,
      // so several "Next" buttons can match - a plain isEnabled() would throw a
      // strict-mode error. Ask about all of them: "any Next enabled?".
      const nexts = await opts.next.evaluateAll((els) =>
        els.map((e) => !(e as HTMLButtonElement).disabled),
      );
      const enabled = nexts.some(Boolean);
      if (nexts.length > 0 && !enabled) sawDisabled = true;

      // Primary: the backend said success AND the page has re-enabled Next.
      if (ekycResult === 'success' && enabled) {
        console.log(`\n[eKYC] done after ${elapsed()}s - success reported, Next enabled.\n`);
        return 'next-enabled';
      }
      // Fallback (poll body not recognised): Next re-enabled after being disabled.
      if (ekycResult === undefined && enabled && (sawDisabled || elapsed() >= 20)) {
        console.log(`\n[eKYC] done after ${elapsed()}s - Next re-enabled (no poll signal seen).\n`);
        return 'next-enabled';
      }

      if (elapsed() >= nextBeat) {
        console.log(
          `[eKYC] still waiting for manual verification... ${elapsed()}s ` +
            `(poll: ${ekycResult ?? 'pending'}, Next buttons: ${nexts.length}, enabled: ${nexts.filter(Boolean).length})`,
        );
        nextBeat += 30;
      }
      await page.waitForTimeout(1_000);
    }
  } finally {
    page.off('response', onResponse);
  }

  throw new Error(
    `Manual eKYC was not completed within ${Math.round(timeout / 1000)}s. ` +
      `Finish the check faster, or raise EKYC_WAIT_MS.`,
  );
}

/**
 * Click the first visible, enabled match of `locator`. Use for the second
 * "Next" press after eKYC, where the re-rendered page can carry more than one
 * "Next" button and a plain `locator.click()` would hit a strict-mode error.
 */
export async function clickEnabled(locator: Locator): Promise<void> {
  for (const el of await locator.all()) {
    if ((await el.isVisible()) && (await el.isEnabled())) {
      await el.click();
      return;
    }
  }
  throw new Error('No visible, enabled match to click');
}
