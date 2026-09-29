import { test } from './fixtures';

/**
 * Seed test - the shared starting point for authoring restructured specs.
 *
 * The `page` fixture (see `fixtures.ts`) has already:
 *   - passed HTTP basic auth
 *   - navigated to the YOS site root
 *   - waited out the Azure cold start
 *
 * There is nothing to do here. Run it under the CLI debugger to land on
 * that state, then explore / generate the next spec:
 *
 *   PLAYWRIGHT_HTML_OPEN=never npx playwright test --project=seed --debug=cli
 *   playwright-cli attach tw-XXXX
 *   playwright-cli resume
 *
 * It is its own Playwright project (`seed`), so the hourly BrowserStack run
 * - which uses `--project=restructured` - never executes it.
 */

test('seed', async ({ page }) => {
  // Intentionally empty. The fixture did the work; this body just marks
  // where authoring sessions begin.
  await page.waitForLoadState('domcontentloaded');
});
