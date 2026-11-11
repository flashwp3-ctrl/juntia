// 004 PR E · T072 — axe de Análisis (S3) y la PlanningNote.
// Criterio literal (tasks.md, T072): «ligero (Análisis en Yo y Nosotros, con y sin presupuesto, PlanningNote abierta) y
// `@sweep`». Cumple: FR-101, FR-102; FR-115; US-3, escenario 5.
// Decisión 21: el nivel ligero corre en cada PR (390 px, dos temas, cada estado una vez); el barrido completo (siete anchos,
// 200 %, teclado y 44 px) lleva @sweep y lo lanza el gestor a mano. Necesita la pareja dorada (octubre con presupuestos de
// Nosotros, aportes a Japón y los gastos privados de Sara) sembrada por la base y las funciones reales, que el registro de una
// sola cuenta no siembra: va aquí, solo con A11Y_JOB=e2e, y cada título termina en «con sesión».
import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";
import { axe, largeText, signedContext, sweep, tabTo, target44 } from "../support/a11y";
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
async function openNote(page: Page) {
  const how = region(page, copy.analysis.chapters.setAside).getByRole("button", { name: copy.analysis.note.how });
  await how.click();
  await expect(how).toHaveAttribute("aria-expanded", "true");
}

if (JOB === "e2e") test.describe("Análisis (004, PR E)", () => {
  test("Análisis · axe de Nosotros con presupuesto, la PlanningNote abierta y Yo sin presupuesto · light y dark · 390px · con sesión", async ({ browser, baseURL }, testInfo) => {
    test.slow();
    const pair = await seedCouple({ index: testInfo.parallelIndex, golden: true });
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.goto(OCTOBER);
    await usReady(page);
    await bothThemes(page, "Análisis en Nosotros con presupuesto");
    await openNote(page);
    await bothThemes(page, "Análisis en Nosotros con la PlanningNote abierta");
    await context.close();

    const me = await signedContext(browser, baseURL!, pair.sara, "light", "me");
    await me.page.goto(OCTOBER);
    await meReady(me.page);
    await bothThemes(me.page, "Análisis en Yo sin presupuesto");
    await me.context.close();
  });

  test("barrido de siete anchos y 200 %: Análisis en Nosotros con la PlanningNote abierta y en Yo · con sesión", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    test.slow();
    const pair = await seedCouple({ index: testInfo.parallelIndex, golden: true });
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.goto(OCTOBER);
    await usReady(page);
    await openNote(page);
    await sweep(page, "Análisis en Nosotros");
    await largeText(page, "Análisis en Nosotros");
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
    for (const name of [next, copy.analysis.note.how]) await target44(page, name, name === next ? "link" : "button");
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
