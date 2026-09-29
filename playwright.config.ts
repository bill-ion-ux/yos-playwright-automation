import { defineConfig } from '@playwright/test';

// Load .env for local runs (credentials, host). In CI these come from the
// environment directly, so a missing file is not an error.
try {
  process.loadEnvFile();
} catch {
  /* no .env file - rely on the ambient environment */
}

const YOS_HOST = process.env.YOS_HOST ?? 'https://yesmy-dev.azurewebsites.net';

export default defineConfig({
  projects: [
    { name: 'incoming', testDir: './incoming-scripts' },
    // Authoring-only entry point; not part of any CI run.
    { name: 'seed', testDir: './tests', testMatch: 'seed.spec.ts' },
    // The migrated POM/COM suite. `test:restructured` targets this project.
    { name: 'restructured', testDir: './tests', testMatch: 'specs/**/*.spec.ts' },
  ],
  retries: 1,
  timeout: 120_000,
  use: {
    channel: 'chromium',
    baseURL: YOS_HOST,
    ...(process.env.DEV_SITE_USER && {
      httpCredentials: {
        username: process.env.DEV_SITE_USER,
        password: process.env.DEV_SITE_PASS ?? '',
      },
    }),
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 900 },
    screenshot: 'on',
  },
});
