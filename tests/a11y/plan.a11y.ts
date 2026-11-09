// 004 PR B · T031 — axe de Plan, la hoja de presupuesto, el conflicto y el historial.
// Criterio literal (tasks.md, T031): «nivel ligero (Plan en Yo y Nosotros, con y sin presupuesto, la hoja, el conflicto, el
// historial; 390 px, dos temas) y `@sweep` (siete anchos, 200 %, teclado, 44 px)». Cumple: FR-101, FR-102; FR-115.
// Decisión 21: el nivel ligero corre en cada PR; el barrido completo lleva @sweep y lo lanza el gestor a mano. Como en la 003,
// los estados se agrupan por ruta con los dos temas en el mismo contexto (contracts/ci.md). Necesitan una pareja con gastos
// compartidos y presupuestos sembrados por la base y las funciones reales, que el registro de una sola cuenta
// (route-registry.ts) no siembra: van aquí, solo con A11Y_JOB=e2e (regla 10 de la 003), y cada título termina en «con sesión».
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { budgetMonths, updateBudget } from "../../src/lib/db/budgets";
import { axe, largeText, signedContext, sweep, tabTo, target44 } from "../support/a11y";
import { seedCouple, seedSharedMovements, type SeededCouple } from "../support/seed";
import { THEMES } from "./route-registry";

const JOB = process.env.A11Y_JOB === "e2e" ? "e2e" : "app";
const month = () => `${todayInBogota().slice(0, 7)}-01`;
const market = copy.categories.market;

/** La pareja dorada (presupuestos de Nosotros con su historia, por SQL) y los seis compartidos en el mes en curso. */
async function seedPlan(index: number) {
  const pair = await seedCouple({ index, golden: true });
  await seedSharedMovements(pair, "recent");
  return pair;
}
/** Tomás cambia Mercado por la función real mientras la hoja de Sara tiene la versión vieja. */
async function changeMarketAsTomas(pair: SeededCouple) {
  const row = (await budgetMonths(pair.tomas.client, "us", month())).find((item) => item.category_id === "market")!;
  await updateBudget(pair.tomas.client, { idempotencyKey: randomUUID(), budgetId: row.budget_id!, expectedVersion: row.version!, limit: moneyFromPesos(950000n) });
}
async function bothThemes(page: Page, label: string) {
  for (const colorScheme of THEMES) {
    await page.emulateMedia({ colorScheme });
    await axe(page, `${colorScheme} 390px · ${label}`);
  }
}
const planReady = (page: Page) => expect(page.getByRole("img", { name: copy.plan.bar(market, "640.000", "900.000", 71) })).toBeVisible();

if (JOB === "e2e") test.describe("Plan y presupuestos (004, PR B)", () => {
  test("Plan · axe de Nosotros con presupuesto, la hoja con el historial, el conflicto, crear, y Yo sin presupuesto · light y dark · 390px · con sesión", async ({ browser, baseURL }, testInfo) => {
    test.slow();
    const pair = await seedPlan(testInfo.parallelIndex);
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.goto("/plan");
    await planReady(page);
    await bothThemes(page, "Plan en Nosotros con presupuesto");

    await page.getByRole("button", { name: copy.plan.edit(market) }).click();
    const sheet = page.getByRole("dialog", { name: copy.plan.sheet.editTitle });
    await expect(sheet.getByRole("list", { name: copy.plan.sheet.history }).getByRole("listitem")).toHaveCount(2);
    await bothThemes(page, "hoja de presupuesto con el historial");

    await changeMarketAsTomas(pair);
    await sheet.getByRole("textbox", { name: copy.plan.sheet.limit }).fill("850000");
    await sheet.getByRole("button", { name: copy.plan.sheet.saveChanges }).click();
    await expect(sheet.getByText(copy.plan.errors.versionConflict("Tomás"))).toBeVisible();
    await bothThemes(page, "conflicto de versión");
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    await page.getByRole("button", { name: copy.plan.createBudget }).click();
    await expect(page.getByRole("dialog", { name: copy.plan.sheet.createTitle })).toBeVisible();
    await bothThemes(page, "hoja de crear presupuesto");
    await page.keyboard.press("Escape");
    await context.close();

    // Yo de Sara: sin presupuestos personales en el dataset (US-1): el modo sin presupuesto.
    const me = await signedContext(browser, baseURL!, pair.sara, "light", "me");
    await me.page.goto("/plan");
    await expect(me.page.getByRole("button", { name: copy.plan.empty.action })).toBeVisible();
    await bothThemes(me.page, "Plan en Yo sin presupuesto");
    await me.context.close();
  });

  test("barrido de siete anchos y 200 %: Plan en Nosotros y en Yo, la hoja con el historial y el conflicto · con sesión", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const pair = await seedPlan(testInfo.parallelIndex);
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.goto("/plan");
    await planReady(page);
    await sweep(page, "Plan en Nosotros");
    await largeText(page, "Plan en Nosotros");
    await page.getByRole("button", { name: copy.plan.edit(market) }).click();
    const sheet = page.getByRole("dialog", { name: copy.plan.sheet.editTitle });
    await expect(sheet).toBeVisible();
    await sweep(page, "hoja de presupuesto");
    await largeText(page, "hoja de presupuesto");
    await changeMarketAsTomas(pair);
    await sheet.getByRole("textbox", { name: copy.plan.sheet.limit }).fill("850000");
    await sheet.getByRole("button", { name: copy.plan.sheet.saveChanges }).click();
    await expect(sheet.getByText(copy.plan.errors.versionConflict("Tomás"))).toBeVisible();
    await sweep(page, "conflicto de versión");
    await largeText(page, "conflicto de versión");
    await context.close();
    const me = await signedContext(browser, baseURL!, pair.sara, "light", "me");
    await me.page.goto("/plan");
    await expect(me.page.getByRole("button", { name: copy.plan.empty.action })).toBeVisible();
    await sweep(me.page, "Plan en Yo sin presupuesto");
    await largeText(me.page, "Plan en Yo sin presupuesto");
    await me.context.close();
  });

  test("teclado y 44 px: editar desde la fila, límite, guardar, desactivar, crear desde «sin presupuesto» y Escape · con sesión", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const pair = await seedPlan(testInfo.parallelIndex);
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.goto("/plan");
    await planReady(page);
    for (const name of [copy.plan.edit(market), copy.plan.createFor(copy.categories.home), copy.plan.createBudget]) await target44(page, name);
    await tabTo(page, copy.plan.edit(market));
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: copy.plan.sheet.editTitle });
    await expect(sheet.getByRole("textbox", { name: copy.plan.sheet.limit })).toBeFocused();
    await target44(page, copy.plan.sheet.limit, "textbox");
    await tabTo(page, copy.plan.sheet.saveChanges);
    await target44(page, copy.plan.sheet.saveChanges);
    await tabTo(page, copy.plan.sheet.deactivate);
    await target44(page, copy.plan.sheet.deactivate);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await tabTo(page, copy.plan.createFor(copy.categories.home));
    await page.keyboard.press("Enter");
    const create = page.getByRole("dialog", { name: copy.plan.sheet.createTitle });
    await expect(create.getByRole("textbox", { name: copy.plan.sheet.limit })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(create).toBeHidden();
    await context.close();
  });
});
