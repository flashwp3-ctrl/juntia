// F111-12 (revisión del PR #111, ronda 2): diagnóstico, sin corregir nada, de «rectángulos distintos del aviso» en
// tests/a11y/routes.a11y.ts (annotateFrames, l.67–86; la aserción, l.312–319). Repite la MISMA medición —abrir Anotar por su
// disparador visible y guardar el rectángulo del diálogo o la hoja en cada cuadro (requestAnimationFrame) durante 10
// cuadros— varias veces por ruta, a 390 en claro y con movimiento reducido, y guarda cada serie con el tema, el ancho, la ruta
// y qué componente del rectángulo cambió (top, left, width, height), más un trace por ruta. Corre solo con
// `F111_12=1 npm run e2e:dev -- tests/evidence/f111-12.capture.ts`, contra juntia-dev; no es una prueba ni evidencia de CI.
import { appendFile, mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { seedMovements, seedUser } from "../support/seed";

const OUT = "test-results/f111-12";
const FRAMES = 10;
const REPEATS = 12;
const ROUTES = ["/", "/actividad", "/metas", "/balance"] as const;
const LABEL = process.env.F111_12_LABEL ?? "candidato";
/** Carga simulada: ralentización de CPU por CDP (1 = sin ralentizar). Los 4 fallos ocurrieron con 8 workers en paralelo. */
const CPU = Number(process.env.F111_12_CPU ?? "1");
/** Con `F111_12_KNOB=1`, antes de medir se hace lo mismo que `knobFrames` de routes.a11y.ts: «Nosotros» durante 10 cuadros y vuelta a «Yo». */
const KNOB = process.env.F111_12_KNOB === "1";

test.skip(process.env.F111_12 !== "1", "Solo a mano: F111_12=1");

test("aviso de Anotar: rectángulos por cuadro a 390, claro, movimiento reducido", async ({ browser, baseURL }, info) => {
  test.setTimeout(600_000);
  await mkdir(OUT, { recursive: true });
  const user = await seedUser({ role: "f111-12", index: info.parallelIndex });
  await seedMovements(user, "recent");
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, colorScheme: "light", reducedMotion: "reduce" });
  await context.addCookies([...user.cookies, { name: "juntia_theme", value: "light", domain: "localhost", path: "/" }, { name: "juntia_context", value: "me", domain: "localhost", path: "/" }]);
  const page = await context.newPage();
  if (CPU > 1) await (await context.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: CPU });
  for (const route of ROUTES) {
    await context.tracing.start({ screenshots: true, snapshots: true });
    await page.goto(route);
    await expect(page.locator("[data-annotate-trigger]").first()).toBeAttached();
    for (let repeat = 0; repeat < REPEATS; repeat++) {
      if (KNOB) await page.evaluate((frames) => new Promise<void>((resolve) => {
        const group = [...document.querySelectorAll<HTMLElement>('[data-context-selector] [role="radiogroup"]')].find((node) => node.getClientRects().length > 0)!;
        group.querySelector<HTMLElement>('[data-value="us"]')!.click();
        let count = 0;
        const tick = () => { if (++count < frames) requestAnimationFrame(tick); else { group.querySelector<HTMLElement>('[data-value="me"]')!.click(); resolve(); } };
        requestAnimationFrame(tick);
      }), FRAMES);
      const series = await page.evaluate((frames) => new Promise<{ container: string; rects: string[]; firstFrame: number }>((resolve) => {
        const trigger = [...document.querySelectorAll<HTMLElement>("[data-annotate-trigger]")].find((node) => node.getClientRects().length > 0)!;
        trigger.click();
        const rects: string[] = [];
        let container = "";
        let frame = 0;
        let firstFrame = -1;
        const tick = () => {
          frame++;
          const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
          if (dialog) {
            if (firstFrame < 0) firstFrame = frame;
            container = dialog.hasAttribute("data-modal") ? "diálogo" : "hoja";
            const { top, left, width, height } = dialog.getBoundingClientRect();
            rects.push([top, left, width, height].map((value) => value.toFixed(2)).join("/"));
          }
          if (rects.length < frames) requestAnimationFrame(tick);
          else resolve({ container, rects, firstFrame });
        };
        requestAnimationFrame(tick);
      }), FRAMES);
      const distinct = [...new Set(series.rects)];
      const changed = distinct.length > 1
        ? ["top", "left", "width", "height"].filter((_, index) => new Set(distinct.map((rect) => rect.split("/")[index])).size > 1)
        : [];
      const row = { label: LABEL, cpu: CPU, knob: KNOB, theme: "light", width: 390, reducedMotion: true, route, repeat, container: series.container, firstFrame: series.firstFrame, distinct: distinct.length, changed, rects: series.rects };
      await appendFile(`${OUT}/f111-12.jsonl`, `${JSON.stringify(row)}\n`);
      console.log(JSON.stringify(row));
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await context.tracing.stop({ path: `${OUT}/trace-${LABEL}-cpu${CPU}${KNOB ? "-knob" : ""}-${route === "/" ? "inicio" : route.slice(1)}.zip` });
  }
  await context.close();
});
