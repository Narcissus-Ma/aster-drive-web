import { defineConfig, devices } from '@playwright/test';

const webBaseUrl = process.env.E2E_WEB_BASE_URL ?? 'http://127.0.0.1:4173';
const apiBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:18000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: webBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'yarn dev --host 127.0.0.1 --port 4173',
    env: {
      ...process.env,
      VITE_API_BASE_URL: apiBaseUrl,
      VITE_ROOT_RESOURCE_ID:
        process.env.E2E_ROOT_RESOURCE_ID ?? 'b4e540de-715b-51af-8cd3-567eb1ea6ed6',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: webBaseUrl,
  },
});
