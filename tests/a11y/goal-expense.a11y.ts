// 004 PR D, T059 / FR-101, FR-102, FR-115; SC-002; maestro §15.10, decisión 21 (accesibilidad en dos niveles).
// Criterio literal (tasks.md, T059): «ligero (B1–B7, la tarjeta pendiente, la LimitNote) y `@sweep`».
// Como Metas (PR C), estos estados necesitan dos cuentas emparejadas, metas con aportes de los dos y gastos con meta
// sembrados por las funciones reales: van aquí, solo con A11Y_JOB=e2e y con «con sesión» en el título (regla 10 de
// tasks.md). Nivel ligero: cada estado una vez, a 390, en los dos temas, una pareja por tema. El barrido lleva @sweep y corre
// a mano (T068).
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { contributeToGoal, createGoal } from "../../src/lib/db/goals";
import { createExpenseWithGoal, rejectUsageRequest, usageRequests } from "../../src/lib/db/goal-usage";
import { axe, largeText, signedContext, sweep, target44 } from "../support/a11y";
import { seedCouple } from "../support/seed";
import { THEMES } from "./route-registry";

const JOB = process.env.A11Y_JOB === "e2e" ? "e2e" : "app";

/**
 * Japón compartida (Sara 500.000, Tomás 400.000), Bicicleta de ruta personal de Sara (1.050.000), un gasto compartido con
 * una solicitud pendiente a Tomás (B4/B5), otro con la solicitud rechazada (B7) y un privado pagado con Bicicleta (LimitNote).
 */
async function seedFunding(index: number) {
  const pair = await seedCouple({ index });
  const today = todayInBogota();
  const japan = await createGoal(pair.sara.client, { idempotencyKey: randomUUID(), context: "us", name: "Japón", goalType: "travel", target: moneyFromPesos(18000000n), targetMonth: null });
  const bike = await createGoal(pair.sara.client, { idempotencyKey: randomUUID(), context: "me", name: "Bicicleta de ruta", goalType: "other", target: moneyFromPesos(3000000n), targetMonth: null });
  await contributeToGoal(pair.sara.client, { idempotencyKey: randomUUID(), goalId: japan.id, amount: moneyFromPesos(500000n), entryDate: today, fundingMode: "reserved" });
  await contributeToGoal(pair.tomas.client, { idempotencyKey: randomUUID(), goalId: japan.id, amount: moneyFromPesos(400000n), entryDate: today, fundingMode: "reserved" });
  await contributeToGoal(pair.sara.client, { idempotencyKey: randomUUID(), goalId: bike.id, amount: moneyFromPesos(1050000n), entryDate: today, fundingMode: "reserved" });
  const shared = (description: string) => createExpenseWithGoal(pair.sara.client, {
    idempotencyKey: randomUUID(), context: "us", amount: moneyFromPesos(300000n), categoryId: "transport", transactionDate: today, description,
    payerUserId: pair.tomas.id, splitMode: "equal", splitPercents: null,
    allocations: [{ userId: pair.sara.id, amount: moneyFromPesos(150000n) }, { userId: pair.tomas.id, amount: moneyFromPesos(150000n) }],
    goalId: japan.id, own: moneyFromPesos(100000n), requested: moneyFromPesos(200000n),
  });
  const pending = await shared("Tiquetes a Medellín");
  const rejected = await shared("Hotel en Cali");
  const request = (await usageRequests(pair.tomas.client, { status: "pending" })).find((row) => row.transaction_id === rejected.id)!;
  await rejectUsageRequest(pair.tomas.client, { idempotencyKey: randomUUID(), requestId: request.id, expectedVersion: request.version });
  const funded = await createExpenseWithGoal(pair.sara.client, {
    idempotencyKey: randomUUID(), context: "me", type: "expense", amount: moneyFromPesos(400000n), categoryId: "shopping", transactionDate: today, description: "Repuestos",
    goalId: bike.id, own: moneyFromPesos(400000n), requested: moneyFromPesos(0n),
  });
  return { pair, pending, rejected, funded };
}

async function openFunding(page: Page) {
  await page.locator("body").focus();
  await page.keyboard.press("n");
  const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
  await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
  await page.keyboard.type("300000");
  await sheet.getByRole("radio", { name: copy.categories.transport }).click();
  await sheet.getByRole("button", { name: new RegExp(`^${copy.goalExpense.paidWith.label}:`) }).click();
  await sheet.getByRole("radiogroup", { name: copy.goalExpense.paidWith.label }).getByRole("radio", { name: copy.goalExpense.paidWith.goal }).click();
  const picker = sheet.getByRole("radiogroup", { name: copy.goalExpense.picker.title });
  await expect(picker.getByRole("radio", { name: /^Japón/ })).toBeVisible();
  return { sheet, picker };
}

/** Los dos temas sobre el mismo estado, sin repetir el recorrido (como Plan, contracts/ci.md: agrupados por ruta). */
async function bothThemes(page: Page, label: string) {
  for (const colorScheme of THEMES) {
    await page.emulateMedia({ colorScheme });
    await axe(page, `${colorScheme} 390px · ${label}`);
  }
}

if (JOB === "e2e") test.describe("Gasto con meta y confirmaciones (PR D de la 004)", () => {
  test("Gasto con meta · axe de B1–B3 en Anotar, B4 y B7 en Actividad, B5 en Inicio, la LimitNote y quitar el uso · light y dark · 390px · con sesión", async ({ browser, baseURL }, testInfo) => {
    test.slow();
    const { pair, rejected, funded } = await seedFunding(testInfo.parallelIndex);

    const sara = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await sara.page.goto("/");
    const { sheet, picker } = await openFunding(sara.page);
    await picker.getByRole("radio", { name: /^Japón/ }).click();
    await expect(sheet.getByRole("list", { name: copy.goalExpense.effect.title })).toBeVisible();
    await bothThemes(sara.page, "B1–B3 · metas de Nosotros, FundingLedger y efecto");
    await sheet.getByRole("button", { name: copy.annotate.close }).click();
    await sara.page.getByRole("alertdialog").getByRole("button", { name: copy.annotate.discard.confirm }).click();
    await expect(sheet).toBeHidden();

    await sara.page.goto("/actividad");
    await expect(sara.page.getByRole("region", { name: copy.goalExpense.request.region }).filter({ visible: true }).getByText(copy.goalExpense.request.noExpiry)).toBeVisible();
    await bothThemes(sara.page, "B4 · tarjeta pendiente en Actividad");
    await sara.page.goto(`/actividad/${rejected.id}`);
    await expect(sara.page.locator("[data-transaction-detail]:visible").getByText(copy.goalExpense.badge.rejected("Tomás"), { exact: true })).toBeVisible();
    await bothThemes(sara.page, "B7 · detalle con la solicitud rechazada");
    await sara.context.close();

    const tomas = await signedContext(browser, baseURL!, pair.tomas, "light", "us");
    await tomas.page.goto("/");
    await expect(tomas.page.getByRole("region", { name: copy.goalExpense.request.region }).filter({ visible: true }).getByText(copy.goalExpense.request.title("Sara"))).toBeVisible();
    await bothThemes(tomas.page, "B5 · solicitud en Inicio de quien aprueba");
    await tomas.context.close();

    const me = await signedContext(browser, baseURL!, pair.sara, "light", "me");
    await me.page.goto(`/actividad/${funded.id}`);
    const detail = me.page.locator("[data-transaction-detail]:visible");
    await expect(detail.getByRole("note").getByText(copy.goalExpense.limit.title)).toBeVisible();
    await bothThemes(me.page, "LimitNote de Mover a Pareja y CON META");
    await detail.getByRole("button", { name: copy.goalExpense.remove.action }).click();
    await expect(me.page.getByRole("alertdialog", { name: copy.goalExpense.remove.title })).toBeVisible();
    await bothThemes(me.page, "confirmación de quitar el uso");
    await me.context.close();
  });

  test("barrido de siete anchos y 200 %: B1–B3 en Anotar, B5 en Inicio y la LimitNote · con sesión", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const { pair, funded } = await seedFunding(testInfo.parallelIndex);
    const sara = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await sara.page.goto("/");
    const { sheet, picker } = await openFunding(sara.page);
    await picker.getByRole("radio", { name: /^Japón/ }).click();
    await expect(sheet.getByRole("list", { name: copy.goalExpense.effect.title })).toBeVisible();
    await sweep(sara.page, "Anotar con meta (B2 y B3)");
    await largeText(sara.page, "Anotar con meta (B2 y B3)");
    await sara.context.close();

    const tomas = await signedContext(browser, baseURL!, pair.tomas, "light", "us");
    await tomas.page.goto("/");
    const card = tomas.page.getByRole("region", { name: copy.goalExpense.request.region }).filter({ visible: true });
    await expect(card.getByText(copy.goalExpense.request.title("Sara"))).toBeVisible();
    await sweep(tomas.page, "B5 en Inicio");
    await largeText(tomas.page, "B5 en Inicio");
    await tomas.page.setViewportSize({ width: 390, height: 900 });
    await target44(tomas.page, copy.goalExpense.request.approve("$200.000"));
    await target44(tomas.page, copy.goalExpense.request.reject);
    await tomas.context.close();

    const me = await signedContext(browser, baseURL!, pair.sara, "light", "me");
    await me.page.goto(`/actividad/${funded.id}`);
    await expect(me.page.locator("[data-transaction-detail]:visible").getByRole("note")).toBeVisible();
    await sweep(me.page, "detalle con LimitNote");
    await largeText(me.page, "detalle con LimitNote");
    await target44(me.page, copy.goalExpense.remove.action);
    await me.context.close();
  });
});
