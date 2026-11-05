import { defineConfig, devices } from "@playwright/test";
// ADR-011 §6: solo Chromium, movimiento reducido por defecto y retries 0/1. Proyectos (contracts/ci.md, «Playwright»):
// `a11y` (tests/a11y; el job lo elige A11Y_JOB, ver route-registry.ts) y, desde el PR B de la 002, `e2e` (tests/e2e).
export default defineConfig({
  retries: process.env.CI ? 1 : 0,
  use: { reducedMotion: "reduce", baseURL: "http://localhost:3000" },
  projects: [
    { name: "a11y", testDir: "tests/a11y", testMatch: "**/*.a11y.ts", use: { ...devices["Desktop Chrome"] } },
    { name: "e2e", testDir: "tests/e2e", testMatch: "**/*.e2e.ts", use: { ...devices["Desktop Chrome"] } },
    // Evidencia del PR (T053, T057): capturas, pasada de anchos y arnés de tema. Solo bajo demanda; no es del gate.
    { name: "evidence", testDir: "tests/evidence", testMatch: "**/*.capture.ts", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: { command: "npm run start", url: "http://localhost:3000/entrar", env: { JUNTIA_INTERNAL_SURFACE: "1" }, reuseExistingServer: !process.env.CI },
});
