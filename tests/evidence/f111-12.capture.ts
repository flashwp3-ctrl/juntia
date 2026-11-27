// F111-12 (revisión del PR #111, ronda 2; PR aparte autorizado por los fundadores el 26 nov 2026): diagnóstico de
// «rectángulos distintos del aviso» en tests/a11y/routes.a11y.ts (annotateFrames; la aserción, `new Set(notice.rects).size`
// igual a 1). Cada repetición carga la ruta de nuevo (como cada caso de la prueba), espera al selector hidratado (como la
// prueba) y hace la perilla y el aviso con el mismo código que la prueba, en uno de dos órdenes:
// - `F111_12_ORDER=old`: el orden anterior al PR, EXACTO: `knobFrames` pulsa «Nosotros», mide 10 cuadros y pulsa «Yo» dentro
//   del callback del 10.º cuadro, en el mismo `page.evaluate`; justo después, `annotateFrames`.
// - `F111_12_ORDER=new`: el orden del PR: primero `annotateFrames` (página en reposo), Escape, y después `knobFrames` igual.
// Además instrumenta BottomSheet desde fuera, sin cambiar el producto: en cada cuadro del aviso guarda `body.style.minHeight`,
// `body.offsetHeight` y el alto fraccionario de `body` (el área con scroll de la hoja, la que fija `holdKey`), y en qué cuadro
// cambia `minHeight` (MutationObserver). Variables: `F111_12_CPU` (ralentización de CPU por CDP), `F111_12_COUPLE=1` (Sara de
// una pareja activa con gastos compartidos; sin ella, un usuario sin pareja) y `F111_12_LABEL`. Corre solo con
// `F111_12=1 npm run e2e:dev -- tests/evidence/f111-12.capture.ts`, contra juntia-dev; no es una prueba ni evidencia de CI.
// Que una corrida «pase» solo dice que terminó y escribió sus series (F111-17).
import { appendFile, mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { seedCouple, seedMovements, seedSharedMovements, seedUser, type SeededUser } from "../support/seed";

const OUT = "test-results/f111-12";
const FRAMES = 10;
const REPEATS = 12;
const ROUTES = ["/", "/actividad", "/metas", "/balance"] as const;
const LABEL = process.env.F111_12_LABEL ?? "candidato";
const CPU = Number(process.env.F111_12_CPU ?? "1");
const ORDER = process.env.F111_12_ORDER === "new" ? "new" : "old";
const COUPLE = process.env.F111_12_COUPLE === "1";

test.skip(process.env.F111_12 !== "1", "Solo a mano: F111_12=1");

// Copia literal de `knobFrames` de routes.a11y.ts (sin cambios en el PR): la vuelta a «Yo» va dentro del 10.º cuadro.
async function knobFrames(page: Page) {
  return page.evaluate((frames) => new Promise<{ xs: number[] }>((resolve) => {
    const group = [...document.querySelectorAll<HTMLElement>('[data-context-selector] [role="radiogroup"]')].find((node) => node.getClientRects().length > 0)!;
    const us = group.querySelector<HTMLElement>('[data-value="us"]')!;
    us.click();
    const xs: number[] = [];
    const tick = () => {
      xs.push(Math.round(group.querySelector("[data-segmented-knob]")!.getBoundingClientRect().x * 100) / 100);
      if (xs.length < frames) requestAnimationFrame(tick);
      else { group.querySelector<HTMLElement>('[data-value="me"]')!.click(); resolve({ xs }); }
    };
    requestAnimationFrame(tick);
  }), FRAMES);
}

// La medición de `annotateFrames` de routes.a11y.ts, con la instrumentación de BottomSheet al lado (no cambia lo que mide).
async function annotateFrames(page: Page) {
  return page.evaluate((frames) => new Promise<{ container: string; rects: string[]; firstFrame: number; body: string[]; minHeightChanges: { frame: number; value: string }[] }>((resolve) => {
    const trigger = [...document.querySelectorAll<HTMLElement>("[data-annotate-trigger]")].find((node) => node.getClientRects().length > 0)!;
    trigger.click();
    const rects: string[] = [];
    const body: string[] = [];
    const minHeightChanges: { frame: number; value: string }[] = [];
    let container = "";
    let frame = 0;
    let firstFrame = -1;
    let observed: HTMLElement | null = null;
    const tick = () => {
      frame++;
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (dialog) {
        if (firstFrame < 0) firstFrame = frame;
        container = dialog.hasAttribute("data-modal") ? "diálogo" : "hoja";
        const { top, left, width, height } = dialog.getBoundingClientRect();
        rects.push([top, left, width, height].map((value) => value.toFixed(2)).join("/"));
        const area = dialog.querySelector<HTMLElement>(".overscroll-contain");
        if (area && area !== observed) {
          observed = area;
          new MutationObserver(() => minHeightChanges.push({ frame, value: area.style.minHeight })).observe(area, { attributes: true, attributeFilter: ["style"] });
        }
        body.push(area ? `${area.style.minHeight || "(vacío)"}|offset ${area.offsetHeight}|rect ${area.getBoundingClientRect().height.toFixed(2)}` : "(sin área)");
      }
      if (rects.length < frames) requestAnimationFrame(tick);
      else resolve({ container, rects, firstFrame, body, minHeightChanges });
    };
    requestAnimationFrame(tick);
  }), FRAMES);
}

async function seeded(index: number): Promise<SeededUser> {
  if (!COUPLE) {
    const user = await seedUser({ role: "f111-12", index });
    await seedMovements(user, "recent");
    return user;
  }
  const pair = await seedCouple({ index });
  await Promise.all([seedMovements(pair.sara, "recent"), seedSharedMovements(pair, "recent")]);
  return pair.sara;
}

test("aviso de Anotar y perilla en el orden de la prueba: rectángulos e instrumentación de BottomSheet a 390, claro", async ({ browser, baseURL }, info) => {
  test.setTimeout(1_200_000);
  await mkdir(OUT, { recursive: true });
  const user = await seeded(info.parallelIndex);
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, colorScheme: "light", reducedMotion: "reduce" });
  await context.addCookies([...user.cookies, { name: "juntia_theme", value: "light", domain: "localhost", path: "/" }, { name: "juntia_context", value: "me", domain: "localhost", path: "/" }]);
  const page = await context.newPage();
  if (CPU > 1) await (await context.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: CPU });
  for (const route of ROUTES) {
    await context.tracing.start({ screenshots: true, snapshots: true });
    for (let repeat = 0; repeat < REPEATS; repeat++) {
      // Cada repetición es una visita nueva, como cada caso de la prueba; con el selector hidratado, como la prueba.
      await page.goto(route);
      await expect(page.locator("[data-context-selector][data-hydrated]").first()).toBeAttached();
      await expect(page.locator("[data-annotate-trigger]").first()).toBeAttached();
      let knob: { xs: number[] } | null = null;
      if (ORDER === "old") knob = await knobFrames(page);
      const series = await annotateFrames(page);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      if (ORDER === "new") {
        knob = await knobFrames(page);
        await expect(page.locator('[data-context-selector] [role="radio"][data-value="me"]:visible').first()).toHaveAttribute("aria-checked", "true");
      }
      const distinct = [...new Set(series.rects)];
      const changed = distinct.length > 1
        ? ["top", "left", "width", "height"].filter((_, index) => new Set(distinct.map((rect) => rect.split("/")[index])).size > 1)
        : [];
      const row = { label: LABEL, cpu: CPU, order: ORDER, couple: COUPLE, theme: "light", width: 390, reducedMotion: true, route, repeat, knobPositions: knob ? new Set(knob.xs).size : null, container: series.container, firstFrame: series.firstFrame, distinct: distinct.length, changed, rects: series.rects, body: series.body, minHeightChanges: series.minHeightChanges };
      await appendFile(`${OUT}/f111-12.jsonl`, `${JSON.stringify(row)}\n`);
      console.log(JSON.stringify(row));
    }
    await context.tracing.stop({ path: `${OUT}/trace-${LABEL}-${ORDER}-cpu${CPU}${COUPLE ? "-pareja" : ""}-${route === "/" ? "inicio" : route.slice(1)}.zip` });
  }
  await context.close();
});
