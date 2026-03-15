// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)

import { createServer } from 'net';
import { defineConfig, devices } from '@playwright/test';

/** Ask the OS for a free TCP port by binding to port 0. */
const getFreePort = (): Promise<number> =>
  new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });

// Pick free ports for both the React client and the Express backend so that
// a developer who already has `npm run dev` running never causes a conflict.
const clientPort = await getFreePort();
const backendPort = await getFreePort();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({

  testDir: './tests/ui',

  /* Maximum time one test can run for. */
  timeout: 15_000,

  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5_000,
  },

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Always run tests serially (1 worker) so clearDB() in beforeEach never
   * races with another worker writing to the same database. */
  workers: 1,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html'], ['list']],

  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,

    /* Base URL for the running app — port is chosen dynamically at startup. */
    baseURL: `http://localhost:${clientPort}`,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  /* Start the full stack before running tests.
   * The script spins up an isolated in-memory MongoDB, then launches
   * `npm run dev` (backend + React client) with MONGO_URL overridden so
   * the real database is never touched.
   * CLIENT_PORT is the OS-assigned free port for the React client.
   * reuseExistingServer: false ensures a clean DB on every run.
   */
  webServer: {
    command: 'node tests/ui/start-test-server.js',
    url: `http://localhost:${clientPort}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { CLIENT_PORT: String(clientPort), BACKEND_PORT: String(backendPort) },
  },
});
