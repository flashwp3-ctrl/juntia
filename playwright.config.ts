import { defineConfig, devices } from "@playwright/test";
import { appOrigin, appPort, assertPortFreeSync, webServer } from "./scripts/app-port.mjs";
// ADR-011 §6: solo Chromium, movimiento reducido por defecto y retries 0/1. Proyectos (contracts/ci.md, «Playwright»):
// `a11y` (tests/a11y; el job lo elige A11Y_JOB, ver route-registry.ts) y, desde el PR B de la 002, `e2e` (tests/e2e).
// Puerto: PORT, 3400 por defecto (scripts/app-port.mjs; el 3000 y el 3100 son de otro proyecto). El servidor nunca se
// reutiliza —uno ya abierto podría ser de otro proyecto o de otra rama— y, antes de arrancarlo, el proceso principal
// comprueba que el puerto esté libre y, si no, se niega con el PID (los workers cargan esta config con él ya arrancado).
// Con `npm run e2e:dev` (decisión 18) la app arranca sin la clave secreta ni la conexión de juntia-dev, que solo usa la
// siembra del proceso de pruebas.
const devTarget = process.env.JUNTIA_TEST_TARGET === "dev";
// Maestro §15.10, decisión 21 (PR D de la 003): accesibilidad en dos niveles. Por defecto, el nivel ligero de cada PR
// (cada pantalla y estado una vez, a 390, en los dos temas): los casos con la etiqueta @sweep quedan fuera. Con
// A11Y_LEVEL=sweep corre solo el barrido completo (siete anchos, texto al 200 %, teclado y 44 px), a mano con
// «Run workflow» (input `a11y_sweep` de ci.yml). tests/a11y/job-selection.test.ts lo comprueba con --list.
const a11yLevel = process.env.A11Y_LEVEL === "sweep" ? { grep: /@sweep/ } : { grepInvert: /@sweep/ };
if (!process.env.TEST_WORKER_INDEX) assertPortFreeSync(appPort());
const server = webServer();
export default defineConfig({
  retries: process.env.CI ? 1 : 0,
  use: { reducedMotion: "reduce", baseURL: appOrigin() },
  projects: [
    { name: "a11y", testDir: "tests/a11y", testMatch: "**/*.a11y.ts", ...a11yLevel, use: { ...devices["Desktop Chrome"] } },
    { name: "e2e", testDir: "tests/e2e", testMatch: "**/*.e2e.ts", use: { ...devices["Desktop Chrome"] } },
    // Evidencia del PR (T053, T057): capturas, pasada de anchos y arnés de tema. Solo bajo demanda; no es del gate.
    { name: "evidence", testDir: "tests/evidence", testMatch: "**/*.capture.ts", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    ...server,
    env: { ...server.env, JUNTIA_INTERNAL_SURFACE: "1", ...(devTarget ? { SECRET_KEY: "", DB_URL: "" } : {}) },
  },
});
