import { defineConfig } from "@playwright/test";

// Locally we reuse an installed Chrome (set E2E_CHANNEL=chrome) to avoid a large
// browser download; CI installs Playwright's own Chromium.
const channel = process.env.E2E_CHANNEL || undefined;
const port = 3300;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${port}`, channel, trace: "retain-on-failure" },
  webServer: {
    // Serves the static export, exactly what gets deployed.
    command: `node e2e/serve.mjs ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
  },
});
