// T057 / SC-001 (B). No es una spec E2E ni una prueba del gate: produce la evidencia del PR. Capturas a 390 y 1440 en
// claro y oscuro de las pantallas de acceso, Mi cuenta y la sesión caducada, nombradas por ruta, estado, ancho y tema, y
// la pasada de los siete anchos (360–1440) en los dos temas: scroll horizontal y elementos fuera de la ventana.
// Sin Supabase (equipo local) solo corre lo que no necesita sesión ni respuesta de Auth; en el runner, el resto.
import { appendFile, mkdir } from "node:fs/promises";
import { test } from "@playwright/test";
import { registry, THEMES, type RouteEntry } from "../a11y/route-registry";
import { openWithSession, reach, targetPath } from "../support/states";

const OUT = "test-results/evidence";
const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440] as const;
const SHOT = new Set([390, 1440]);
const SKIP = new Set(["/interno/primitivos", "/ruta-que-no-existe", "/plan", "/balance"]);
const withSupabase = Boolean(process.env.API_URL);
const entries = registry.filter((entry) => !SKIP.has(entry.route) && (withSupabase
  ? entry.prepare !== "networkError"
  : entry.session === "none" && !entry.needsAuthApi));

const slug = (entry: RouteEntry) => `${entry.route === "/" ? "inicio" : entry.route.slice(1).replace(/\//g, "_").replace(/[[\]]/g, "")}--${entry.state.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;

for (const colorScheme of THEMES) {
  for (const entry of entries) {
    test(`${slug(entry)} · ${colorScheme}`, async ({ page: base, browser, baseURL }, testInfo) => {
      test.setTimeout(120_000);
      await mkdir(OUT, { recursive: true });
      for (const width of WIDTHS) {
        const page = await openWithSession(browser, base, entry, colorScheme, width, testInfo.parallelIndex, baseURL!);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        if (entry.session !== "recovery") await page.goto(targetPath(page, entry));
        await reach(page, entry, testInfo.parallelIndex);
        await page.evaluate(() => document.fonts.ready);
        const layout = await page.evaluate(() => {
          const viewport = document.documentElement.clientWidth;
          const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
            .filter((node) => node.getClientRects().length > 0 && getComputedStyle(node).position !== "fixed")
            .filter((node) => { const box = node.getBoundingClientRect(); return box.right > viewport + 0.5 || box.left < -0.5; })
            .filter((node) => !node.closest(".sr-only") && getComputedStyle(node).clipPath === "none")
            .slice(0, 5).map((node) => `${node.tagName.toLowerCase()}${node.className && typeof node.className === "string" ? `.${node.className.split(" ")[0]}` : ""}`);
          return { scrollWidth: document.documentElement.scrollWidth, viewport, offenders };
        });
        const row = { route: entry.route, state: entry.state, width, theme: colorScheme, horizontalScroll: layout.scrollWidth > layout.viewport, offenders: layout.offenders };
        await appendFile(`${OUT}/pasada-anchos.jsonl`, `${JSON.stringify(row)}\n`);
        console.log(JSON.stringify(row));
        if (SHOT.has(width)) await page.screenshot({ path: `${OUT}/${slug(entry)}--${width}--${colorScheme === "light" ? "claro" : "oscuro"}.png`, fullPage: true, animations: "disabled" });
        if (page !== base) await page.context().close();
      }
    });
  }
}
