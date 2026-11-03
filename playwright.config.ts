import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/a11y",
  testMatch: "**/*.a11y.ts",
  retries: process.env.CI ? 1 : 0,
  use: { reducedMotion: "reduce", baseURL: "http://localhost:3000" },
  projects: [{ name: "a11y", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run start", url: "http://localhost:3000", env: { JUNTIA_INTERNAL_SURFACE: "1" }, reuseExistingServer: !process.env.CI },
});
