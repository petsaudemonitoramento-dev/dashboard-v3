import { defineConfig, devices } from "@playwright/test";

import { assertSafeE2EEnvironment } from "./tests/e2e/support/environment";

const { baseUrl } = assertSafeE2EEnvironment();

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: baseUrl,
    locale: "pt-BR",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: baseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
