import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  outputDir: ".tmp/codex/ui-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4325",
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "node tests/ui/server.ts",
    url: "http://127.0.0.1:4325/api/bootstrap",
    reuseExistingServer: false,
    timeout: 15_000,
    env: { PAYMENTS_MODE: "mock" },
  },
});
