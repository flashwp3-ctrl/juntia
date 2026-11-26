// 005, paso 3 (maestro §15.10, decisiones 30.2 y 30.3): capturas de C-1 a C-7 del informe `corrida-completa.md` (PR #104),
// antes y después de la corrección, a 390 y 1440. Es un arnés de laboratorio, no una prueba ni evidencia de CI: con
// `npm run e2e:dev -- tests/evidence/c1-c7.capture.ts` corre contra juntia-dev (iteración, ADR-011 §9.8) y escribe los PNG
// en specs/005-gate-mvp-1/evidence/correcciones-c1-c7/. Solo corre con `C17_PHASE=antes` (con los archivos de producto de
// `main`) o `C17_PHASE=despues`; sin la variable se salta, así el job `evidence` del CI no lo ejecuta. Cada caso siembra su propia pareja ficticia (Sara y Tomás, correos
// `@seed.test`) y prepara el estado con las funciones de src/lib/db y la sesión de cada uno, como la app; solo C-1 anota por la
// interfaz, porque el tachado aparece al guardar desde Inicio. No mide nada ni afirma cifras: las regresiones están en las
// pruebas de componentes de cada C-n.
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { cancelUsageRequest, createExpenseWithGoal, rejectUsageRequest, removeGoalUsage } from "../../src/lib/db/goal-usage";
import { contributeToGoal, createGoal, withdrawFromGoal } from "../../src/lib/db/goals";
import { createSharedExpense } from "../../src/lib/db/shared-expenses";
import { createTransaction } from "../../src/lib/db/transactions";
import { seedCouple, type SeededCouple, type SeededUser } from "../support/seed";

const OUT = "specs/005-gate-mvp-1/evidence/correcciones-c1-c7";
const PHASE = process.env.C17_PHASE === "antes" || process.env.C17_PHASE === "despues" ? process.env.C17_PHASE : null;
const WIDTHS = [390, 1440] as const;
const today = () => todayInBogota();
const month = () => today().slice(0, 7);
const pesos = (value: bigint) => moneyFromPesos(value);
const key = () => randomUUID();

test.describe.configure({ mode: "serial" });
test.skip(PHASE === null, "Solo a mano: C17_PHASE=antes|despues");

async function open(browser: Browser, baseURL: string, user: SeededUser, context: "me" | "us", width: number) {
  const browserContext = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width, height: width === 390 ? 844 : 900 } });
  await browserContext.addCookies([...user.cookies, { name: "juntia_context", value: context, domain: "localhost", path: "/" }]);
  await browserContext.addInitScript((value) => window.localStorage.setItem("juntia:context", value), context);
  return { context: browserContext, page: await browserContext.newPage() };
}

async function shot(page: Page, name: string, width: number) {
  await mkdir(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/${name}-${PHASE}-${width}.png`, fullPage: true, animations: "disabled" });
}

/** El bloque solo: en la página completa, la barra inferior fija de 390 tapa parte del detalle. */
async function block(locator: Locator, name: string, width: number) {
  await mkdir(OUT, { recursive: true });
  await locator.screenshot({ path: `${OUT}/${name}-bloque-${PHASE}-${width}.png`, animations: "disabled" });
}

const equal = (pair: SeededCouple, total: bigint) => [{ userId: pair.sara.id, amount: pesos(total / 2n) }, { userId: pair.tomas.id, amount: pesos(total / 2n) }];

async function sharedGoal(pair: SeededCouple, name: string, sara: bigint, tomas: bigint) {
  const goal = await createGoal(pair.sara.client, { idempotencyKey: key(), name, goalType: "travel", target: pesos(2000000n), targetMonth: null, context: "us" });
  await contributeToGoal(pair.sara.client, { idempotencyKey: key(), goalId: goal.id, amount: pesos(sara), entryDate: today(), fundingMode: "reserved" });
  await contributeToGoal(pair.tomas.client, { idempotencyKey: key(), goalId: goal.id, amount: pesos(tomas), entryDate: today(), fundingMode: "transferred_declared" });
  return goal;
}

async function expenseWithGoal(pair: SeededCouple, goalId: string, description: string, total: bigint) {
  return createExpenseWithGoal(pair.sara.client, {
    context: "us", idempotencyKey: key(), amount: pesos(total), categoryId: "restaurants", transactionDate: today(), description,
    payerUserId: pair.sara.id, splitMode: "equal", splitPercents: null, allocations: equal(pair, total), goalId, own: pesos(total / 2n), requested: pesos(total / 2n),
  });
}

for (const width of WIDTHS) {
  test(`C-1 · saldo que cambia de dirección en Inicio · ${width}`, async ({ browser, baseURL }, info) => {
    const pair = await seedCouple({ index: info.parallelIndex });
    await createSharedExpense(pair.sara.client, { idempotencyKey: key(), amount: pesos(186400n), categoryId: "market", transactionDate: today(), description: "Mercado ficticio", payerUserId: pair.sara.id, splitMode: "equal", splitPercents: null, allocations: equal(pair, 186400n) });
    const { context, page } = await open(browser, baseURL!, pair.tomas, "us", width);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /gastaron juntos/ })).toBeVisible();
    // Tomás anota desde Inicio un arriendo de 400.000 que pagó él, 50/50: el saldo pasa de «Tomás le debe a Sara $93.200» a
    // «Sara le debe a Tomás $106.800».
    await page.locator("body").focus();
    await page.keyboard.press("n");
    const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
    await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
    await page.keyboard.type("400000");
    await sheet.getByRole("radio", { name: copy.categories.home }).click();
    await page.keyboard.press("Enter");
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: copy.annotate.saved.expense })).toBeVisible();
    if (width === 390) await expect(page.locator("[data-balance-line]:visible")).toContainText(copy.couple.home.owes("Sara", "Tomás"));
    await shot(page, "c1-inicio-nosotros-tomas", width);
    await context.close();
  });

  test(`C-2 y C-5 · resumen de Actividad en Yo y en Nosotros · ${width}`, async ({ browser, baseURL }, info) => {
    const pair = await seedCouple({ index: info.parallelIndex });
    await createTransaction(pair.tomas.client, { idempotencyKey: key(), type: "expense", amount: pesos(37000n), categoryId: "transport", transactionDate: today(), description: "Taxi privado ficticio" });
    await createSharedExpense(pair.sara.client, { idempotencyKey: key(), amount: pesos(870000n), categoryId: "home", transactionDate: today(), description: "Arriendo ficticio", payerUserId: pair.sara.id, splitMode: "equal", splitPercents: null, allocations: equal(pair, 870000n) });
    await sharedGoal(pair, "Viaje ficticio", 300000n, 200000n);
    const me = await open(browser, baseURL!, pair.tomas, "me", width);
    await me.page.goto(`/actividad?mes=${month()}`);
    await expect(me.page.getByText("Taxi privado ficticio").filter({ visible: true }).first()).toBeVisible();
    await shot(me.page, "c2-actividad-yo-tomas", width);
    await me.context.close();
    const us = await open(browser, baseURL!, pair.tomas, "us", width);
    await us.page.goto(`/actividad?mes=${month()}`);
    await expect(us.page.getByText("Arriendo ficticio").filter({ visible: true }).first()).toBeVisible();
    await shot(us.page, "c5-actividad-nosotros-tomas", width);
    await us.context.close();
  });

  test(`C-4 · meta personal superada · ${width}`, async ({ browser, baseURL }, info) => {
    const pair = await seedCouple({ index: info.parallelIndex });
    const goal = await createGoal(pair.sara.client, { idempotencyKey: key(), name: "Bicicleta ficticia", goalType: "other", target: pesos(100000n), targetMonth: null, context: "me" });
    await contributeToGoal(pair.sara.client, { idempotencyKey: key(), goalId: goal.id, amount: pesos(120000n), entryDate: today(), fundingMode: "reserved" });
    const { context, page } = await open(browser, baseURL!, pair.sara, "me", width);
    await page.goto(`/metas/${goal.id}`);
    await expect(page.getByText(copy.goals.reached.me).filter({ visible: true }).first()).toBeVisible();
    await shot(page, "c4-meta-personal-superada-sara", width);
    await context.close();
  });

  test(`C-3, C-6 y C-7 · financiación con una meta compartida · ${width}`, async ({ browser, baseURL }, info) => {
    const pair = await seedCouple({ index: info.parallelIndex });
    const goal = await sharedGoal(pair, "Viaje ficticio", 300000n, 200000n);
    // C-3: la cena de 60.000 pide 30.000 a Tomás; Tomás rechaza y Sara quita el uso de la meta.
    const dinner = await expenseWithGoal(pair, goal.id, "Cena con meta ficticia", 60000n);
    await rejectUsageRequest(pair.tomas.client, { idempotencyKey: key(), requestId: dinner.request_id!, expectedVersion: 1 });
    await removeGoalUsage(pair.sara.client, { idempotencyKey: key(), transactionId: dinner.id, expectedVersion: dinner.version });
    // C-6: 40.000 con 20.000 pedidos a Tomás; Sara cancela la solicitud.
    const cancelled = await expenseWithGoal(pair, goal.id, "Solicitud a cancelar ficticia", 40000n);
    await cancelUsageRequest(pair.sara.client, { idempotencyKey: key(), requestId: cancelled.request_id!, expectedVersion: 1 });
    // C-7: 60.000 con 30.000 pedidos a Tomás; después Tomás retira 190.000 y se queda con 10.000 disponibles.
    await expenseWithGoal(pair, goal.id, "Aprobar tras retiro ficticio", 60000n);
    await withdrawFromGoal(pair.tomas.client, { idempotencyKey: key(), goalId: goal.id, amount: pesos(190000n), entryDate: today(), reason: "Bajar fondos ficticio" });

    const sara = await open(browser, baseURL!, pair.sara, "us", width);
    await sara.page.goto(`/actividad/${dinner.id}?mes=${month()}`);
    await expect(sara.page.locator("[data-expense-funding]:visible")).toBeVisible();
    await shot(sara.page, "c3-detalle-tras-quitar-uso-sara", width);
    await block(sara.page.locator("[data-expense-funding]:visible"), "c3-detalle-tras-quitar-uso-sara", width);
    await sara.page.goto(`/actividad/${cancelled.id}?mes=${month()}`);
    await expect(sara.page.locator("[data-expense-funding]:visible")).toBeVisible();
    await shot(sara.page, "c6-detalle-solicitud-cancelada-sara", width);
    await block(sara.page.locator("[data-expense-funding]:visible"), "c6-detalle-solicitud-cancelada-sara", width);
    await sara.context.close();

    const tomas = await open(browser, baseURL!, pair.tomas, "us", width);
    await tomas.page.goto("/");
    const card = tomas.page.locator("[data-usage-request]:visible").first();
    await expect(card).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await shot(tomas.page, "c7-solicitud-sin-fondos-tomas", width);
    await block(card, "c7-solicitud-sin-fondos-tomas", width);
    // Antes de la corrección, «Aprobar» seguía ofrecido: se pulsa para mostrar el error que veía Tomás. Después, no existe.
    const approve = card.getByRole("button", { name: /^Aprobar/ });
    if (PHASE === "antes") {
      await approve.click();
      await expect(card.getByRole("alert")).toBeVisible();
      await shot(tomas.page, "c7-aprobar-sin-fondos-error-tomas", width);
      await block(card, "c7-aprobar-sin-fondos-error-tomas", width);
    } else {
      await expect(approve).toHaveCount(0);
    }
    await tomas.context.close();
  });
}
