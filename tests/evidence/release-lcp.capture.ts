// 005 · T024 (FR-054, SC-012; Q5, opción c; research R7). LCP de LABORATORIO en Chromium con PerformanceObserver
// (`largest-contentful-paint`), en Inicio y Actividad: a 390 con 4G emulado (150 ms de latencia, 1,6 Mbps de bajada,
// 750 kbps de subida) y CPU 4×; a 1440 sin emulación de red (y sin emulación de CPU: la spec solo la pide a 390). 10 cargas
// por ruta y ancho. Escribe mediana y máximo con el rótulo «laboratorio»: nunca es un percentil de campo. Una mediana
// > 2,5 s es un «hallazgo para los fundadores», no un fallo. Tramo `lab-interaction` del job `release` (@release).
// Salida: test-results/evidence/release-lcp.jsonl. LCP_LOADS reduce las cargas en local.
import { expect, test } from "@playwright/test";
import { record, seedReleaseCouple, sessionContext } from "./release-support";

const LOADS = Number(process.env.LCP_LOADS ?? 0) || 10;
const ROUTES = [{ name: "inicio", path: "/" }, { name: "actividad", path: "/actividad" }] as const;
const FOUR_G = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };
const OBSERVER = `(() => { const w = window; w.__lcp = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__lcp = Math.max(w.__lcp, e.renderTime || e.loadTime || e.startTime); })
    .observe({ type: "largest-contentful-paint", buffered: true }); })();`;
const median = (values: number[]) => { const s = [...values].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

for (const route of ROUTES) {
  for (const width of [390, 1440] as const) {
    test(`@release LCP de laboratorio · ${route.name} · ${width}px`, async ({ browser, baseURL, browserName }) => {
      test.skip(browserName !== "chromium", "PerformanceObserver de LCP y la emulación por CDP: Chromium.");
      test.setTimeout(10 * 60_000);
      const pair = await seedReleaseCouple(test.info().parallelIndex);
      const values: number[] = [];
      for (let load = 0; load < LOADS; load++) {
        const context = await sessionContext(browser, baseURL!, pair, { theme: "light", width, context: "me" });
        const page = await context.newPage();
        await page.addInitScript(OBSERVER);
        if (width === 390) {
          const cdp = await context.newCDPSession(page);
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
          await cdp.send("Network.enable");
          await cdp.send("Network.emulateNetworkConditions", FOUR_G);
        }
        await page.goto(route.path, { waitUntil: "load" });
        await expect(page.locator("[data-skeleton]")).toHaveCount(0, { timeout: 60_000 });
        // LCP deja de cambiar con la primera interacción; aquí no hay ninguna: se lee tras dos fotogramas sin esqueleto.
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        values.push(Math.round(await page.evaluate(() => (window as unknown as { __lcp: number }).__lcp)));
        await context.close();
      }
      const med = median(values), max = Math.max(...values);
      await record("release-lcp.jsonl", {
        rotulo: "laboratorio", ruta: route.name, ancho: width, motor: `chromium ${browser.version()}`,
        condiciones: width === 390 ? { red: "4G emulado (150 ms, 1,6 Mbps / 750 kbps)", cpu: "4×" } : { red: "sin emulación", cpu: "sin emulación" },
        cargas: values.length, valoresMs: values, medianaMs: med, maximoMs: max,
        resultado: med > 2500 ? "hallazgo para los fundadores (mediana > 2,5 s)" : "mediana ≤ 2,5 s",
      });
    });
  }
}
