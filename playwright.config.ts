import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser", fullyParallel: false, workers: 1,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000", ...devices["iPhone 13"], defaultBrowserType: "chromium", trace: "retain-on-failure" },
  webServer: { command: "npm run dev -- --hostname 127.0.0.1 --port 3010", url: "http://127.0.0.1:3010", reuseExistingServer: true, timeout: 120000 },
});
