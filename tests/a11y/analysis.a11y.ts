// 004 PR E · T072 — axe de Análisis (S3) y la PlanningNote.
// Criterio literal (tasks.md, T072): «ligero (Análisis en Yo y Nosotros, con y sin presupuesto, PlanningNote abierta) y
// `@sweep`». Cumple: FR-101, FR-102; FR-115; US-3, escenario 5.
// Decisión 21: el nivel ligero corre en cada PR (390 px, dos temas, cada estado una vez); el barrido completo (siete anchos,
// 200 %, teclado y 44 px) lleva @sweep y lo lanza el gestor a mano. Necesita la pareja dorada (octubre con presupuestos de
// Nosotros, aportes a Japón y los gastos privados de Sara) sembrada por la base y las funciones reales, que el registro de una
// sola cuenta no siembra: va aquí, solo con A11Y_JOB=e2e, y cada título termina en «con sesión».
import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";
import { axe, largeText, overflow, signedContext, sweep, tabTo, target44 } from "../support/a11y";
import { seedCouple } from "../support/seed";
import { THEMES } from "./route-registry";

const JOB = process.env.A11Y_JOB === "e2e" ? "e2e" : "app";
// El octubre del dataset dorado: el de Nosotros tiene presupuestos (parte B); el de Yo de Sara, ninguno (US-1).
const OCTOBER = "/plan/analisis?mes=2026-10";
const region = (page: Page, name: string) => page.getByRole("main").getByRole("region", { name });

async function bothThemes(page: Page, label: string) {
  for (const colorScheme of THEMES) {
    await page.emulateMedia({ colorScheme });
    await axe(page, `${colorScheme} 390px · ${label}`);
  }
}
const usReady = (page: Page) => expect(region(page, copy.analysis.chapters.where).getByRole("img", { name: copy.plan.bar(copy.categories.market, "640.000", "900.000", 71) })).toBeVisible();
const meReady = (page: Page) => expect(region(page, copy.analysis.chapters.where).getByText(copy.analysis.where.noBudgets.me)).toBeVisible();
/** F71-3 (decisión de los fundadores del 11 nov 2026): la tabla visible desplegable «Ver cifras exactas» bajo el gráfico. */
async function openFigures(page: Page) {
  const toggle = region(page, copy.analysis.chapters.compared).getByRole("button", { name: copy.analysis.compared.show });
  await toggle.click();
  await expect(region(page, copy.analysis.chapters.compared).getByRole("button", { name: copy.analysis.compared.hide })).toHaveAttribute("aria-expanded", "true");
  await expect(region(page, copy.analysis.chapters.compared).getByRole("table", { name: copy.analysis.compared.table })).toBeVisible();
}
async function openNote(page: Page) {
  const how = region(page, copy.analysis.chapters.setAside).getByRole("button", { name: copy.analysis.note.how });
  await how.click();
  await expect(how).toHaveAttribute("aria-expanded", "true");
}

if (JOB === "e2e") test.describe("Análisis (004, PR E)", () => {
  test("Análisis · axe de Nosotros con presupuesto, la PlanningNote y las cifras exactas abiertas y Yo sin presupuesto · light y dark · 390px · con sesión", async ({ browser, baseURL }, testInfo) => {
    test.slow();
    const pair = await seedCouple({ index: testInfo.parallelIndex, golden: true });
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.goto(OCTOBER);
    await usReady(page);
    // Revisión del gestor del PR #71 (bloqueante 1): con movimiento reducido, tras una carga completa ningún capítulo queda
    // escondido esperando su entrada; axe audita los cuatro.
    await expect(page.locator("main [data-chapter-phase]")).toHaveCount(4);
    await expect(page.locator("main [data-chapter-phase]:not([data-chapter-phase='shown'])")).toHaveCount(0);
    // El recorrido con presupuesto de la spec 5 (T071), sobre esta misma siembra (revisión del PR #71, 6): US-3, escenarios 1 y
    // 2. Octubre de Nosotros: el gasto sin comparación (sin gastos compartidos en septiembre, Q10), límite y desviación,
    // lo apartado por persona y la PlanningNote con $3.740.000.
    const amount = region(page, copy.analysis.chapters.amount);
    await expect(amount).toContainText(copy.analysis.spent.us);
    await expect(amount).toContainText("$2.840.000");
    await expect(amount).not.toContainText("%");
    const where = region(page, copy.analysis.chapters.where);
    await expect(where.getByText(copy.plan.over.us("$20.000", 105))).toBeVisible();
    await expect(where.getByText(copy.plan.leftPercent("$20.000", 92))).toBeVisible();
    await expect(region(page, copy.analysis.chapters.setAside).getByText("$900.000 · Sara $500.000 · Tomás $400.000. Va aparte: no es gasto.")).toBeVisible();
    await bothThemes(page, "Análisis en Nosotros con presupuesto");
    await openNote(page);
    await expect(region(page, copy.analysis.chapters.setAside).getByRole("group", { name: copy.analysis.note.overline })).toContainText("$3.740.000");
    await expect(page.getByRole("main")).not.toContainText(/total gastado/i);
    await openFigures(page);
    await expect(region(page, copy.analysis.chapters.compared).getByRole("row", { name: /Octubre 2026/ })).toContainText("$2.840.000");
    await bothThemes(page, "Análisis en Nosotros con la PlanningNote y las cifras exactas abiertas");
    await context.close();

    // Yo de Sara en octubre, sin presupuestos personales: solo gasto y categorías; ninguna barra, límite, 0 % ni EXCEDIDO.
    const me = await signedContext(browser, baseURL!, pair.sara, "light", "me");
    await me.page.goto(OCTOBER);
    await meReady(me.page);
    await expect(region(me.page, copy.analysis.chapters.amount)).toContainText(`${copy.analysis.spent.me}`);
    await expect(region(me.page, copy.analysis.chapters.amount)).toContainText("$1.912.900");
    const mine = region(me.page, copy.analysis.chapters.where);
    await expect(mine.getByRole("img")).toHaveCount(0);
    await expect(mine.locator("[data-budget-bar], [data-elapsed-mark]")).toHaveCount(0);
    await expect(region(me.page, copy.analysis.chapters.setAside).getByText("$500.000. Va aparte: no es gasto.")).toBeVisible();
    expect(await me.page.locator("main").innerText()).not.toMatch(/\$0(?![.\d])|\b0 %|EXCEDIDO/);
    await bothThemes(me.page, "Análisis en Yo sin presupuesto");
    await me.context.close();

    // Revisión F71-2 del PR #71, con movimiento NORMAL (el resto del archivo usa `reduce`): a 390 px el capítulo 4 empieza bajo
    // el pliegue y espera su entrada con opacidad 0. Al llegar con Tab a «Cómo se calcula», el botón enfocado y su capítulo
    // tienen opacidad efectiva 1 y ninguna transformación en ese mismo instante (sin esperar a la animación de entrada).
    const motion = await browser.newContext({ baseURL, reducedMotion: "no-preference", colorScheme: "light", viewport: { width: 390, height: 900 } });
    await motion.addCookies(pair.sara.cookies);
    await motion.addCookies([{ name: "juntia_context", value: "us", domain: new URL(baseURL!).hostname, path: "/" }]);
    await motion.addInitScript(() => window.localStorage.setItem("juntia:context", "us"));
    const moving = await motion.newPage();
    await moving.goto(OCTOBER);
    await usReady(moving);
    await expect(moving.locator("main [data-chapter-phase='waiting']").first()).toBeAttached();
    await tabTo(moving, copy.analysis.note.how);
    const seen = await moving.evaluate(() => {
      const button = document.activeElement as HTMLElement;
      let opacity = 1;
      for (let node: HTMLElement | null = button; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
      const chapter = button.closest<HTMLElement>("[data-chapter-phase]")!;
      return { opacity, chapterOpacity: getComputedStyle(chapter).opacity, transform: getComputedStyle(chapter).transform, phase: chapter.dataset.chapterPhase };
    });
    console.log(`F71-2 · foco en «Cómo se calcula» con movimiento normal: ${JSON.stringify(seen)}`);
    expect(seen).toMatchObject({ opacity: 1, chapterOpacity: "1", transform: "none", phase: "shown" });
    await motion.close();
  });

  test("barrido de siete anchos y 200 %: Análisis en Nosotros con la PlanningNote y las cifras exactas abiertas, y en Yo · con sesión", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    test.slow();
    const pair = await seedCouple({ index: testInfo.parallelIndex, golden: true });
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.goto(OCTOBER);
    await usReady(page);
    await openNote(page);
    await openFigures(page);
    await sweep(page, "Análisis en Nosotros");
    await largeText(page, "Análisis en Nosotros");
    // Las cifras exactas abiertas a 320 px y con el texto al 200 %, sin desbordar (F71-3).
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    const narrow = await overflow(page);
    console.log(`Análisis con las cifras exactas · 320px · 200 %: scrollWidth ${narrow.scrollWidth} / ${narrow.clientWidth}; cortado: ${narrow.clipped.length}`);
    expect.soft(narrow.scrollWidth, "320px · 200 %: sin scroll horizontal").toBeLessThanOrEqual(narrow.clientWidth);
    expect.soft(narrow.clipped, "320px · 200 %: sin texto cortado").toEqual([]);
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    // PR del paso 4b (autorizado el 27 nov 2026; maestro, decisión 30): la tabla de cifras exactas cabe en su `figure` y cada
    // importe se ve entero (geometría de su texto: dentro del `figure` y de la ventana, sin recortar), en los 7 anchos al 100 % y a
    // 320, 360 y 390 con la raíz al 200 %, donde las filas pasan a dos líneas si no caben.
    for (const [width, root] of [...[360, 390, 430, 768, 1024, 1280, 1440].map((value) => [value, ""] as const), [320, "200%"], [360, "200%"], [390, "200%"]] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, root);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const fit = await region(page, copy.analysis.chapters.compared).getByRole("table", { name: copy.analysis.compared.table }).evaluate((table) => {
        const figure = table.closest("figure")!.getBoundingClientRect();
        const amounts = [...table.querySelectorAll("tbody td")].map((cell) => {
          const range = document.createRange();
          range.selectNodeContents(cell);
          const text = range.getBoundingClientRect();
          return { text: (cell.textContent ?? "").trim(), whole: text.width > 0 && text.left >= figure.left - 0.5 && text.right <= figure.right + 0.5 && text.right <= document.documentElement.clientWidth + 0.5 && cell.scrollWidth <= cell.clientWidth + 1 };
        });
        return { table: Math.round(table.getBoundingClientRect().width * 100) / 100, figure: Math.round(figure.width * 100) / 100, amounts };
      });
      const label = `cifras exactas · ${width}px${root ? " · 200 %" : ""}`;
      console.log(`${label}: tabla ${fit.table} en un figure de ${fit.figure}; importes ${fit.amounts.map((item) => `${item.text}${item.whole ? "" : " (cortado)"}`).join(", ")}`);
      expect.soft(fit.table, `${label}: la tabla cabe en su figure`).toBeLessThanOrEqual(fit.figure);
      expect.soft(fit.amounts.length, `${label}: hay importes`).toBeGreaterThan(0);
      for (const item of fit.amounts) expect.soft(item.whole, `${label}: «${item.text}» entero, dentro del figure y de la ventana`).toBe(true);
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    await context.close();
    const me = await signedContext(browser, baseURL!, pair.sara, "light", "me");
    await me.page.goto(OCTOBER);
    await meReady(me.page);
    await sweep(me.page, "Análisis en Yo");
    await largeText(me.page, "Análisis en Yo");
    await me.context.close();
  });

  test("teclado y 44 px: la flecha de mes y «Cómo se calcula» con Enter · con sesión", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const pair = await seedCouple({ index: testInfo.parallelIndex, golden: true });
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.goto(OCTOBER);
    await usReady(page);
    const next = copy.analysis.nextMonth("Noviembre 2026");
    for (const name of [next, copy.analysis.note.how, copy.analysis.compared.show]) await target44(page, name, name === next ? "link" : "button");
    // En orden de lectura: el selector de mes antes que los capítulos, y «Cómo se calcula» dentro del capítulo 4.
    await tabTo(page, next);
    await tabTo(page, copy.analysis.note.how);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: copy.analysis.note.how })).toHaveAttribute("aria-expanded", "true");
    await expect(region(page, copy.analysis.chapters.setAside).getByRole("definition").last()).toHaveText("$3.740.000");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: copy.analysis.note.how })).toHaveAttribute("aria-expanded", "false");
    await context.close();
  });
});
