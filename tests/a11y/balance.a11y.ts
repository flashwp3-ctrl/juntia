// T060b / T066, T069 (spec 003, PR D) / FR-054, FR-055, FR-068; SC-001 y SC-002 (D); F50-2, F50-3, F50-5; interpretaciones
// I4 e I5; maestro §15.10, decisión 21 (accesibilidad en dos niveles).
// Criterio literal (tasks.md, T066): «los dos temas de Balance, la hoja de liquidación, el detalle de liquidación y la
// confirmación de anular una liquidación». Y de T069: «barrido sin scroll horizontal en los siete anchos y en los dos temas
// de Balance (pantalla móvil, destino de escritorio y módulo de Inicio), la hoja de liquidación, el detalle con «Anular» y el
// saldo invertido; teclado en «Registrar liquidación», «Todo»/«Otro», la fecha, «Anular» (foco inicial en la opción segura,
// Escape) y el selector Yo/Nosotros durante S1; texto al 200 % y objetivos de 44 px en esos controles».
// Decisión 21: el nivel ligero (cada estado una vez, a 390, en los dos temas) corre en cada PR; el barrido completo (1440,
// siete anchos, 200 %, teclado y 44 px) lleva @sweep y corre a mano. Como en el PR C, estos estados necesitan dos cuentas
// emparejadas, gastos compartidos y una liquidación sembrados por las funciones reales, que el registro de una sola cuenta
// (route-registry.ts) no siembra: van aquí, una pareja por caso. Regla 10 de tasks.md: solo con A11Y_JOB=e2e, y cada
// título termina en «con sesión».
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { registerSettlement } from "../../src/lib/db/settlements";
import { createSharedExpense } from "../../src/lib/db/shared-expenses";
import { axe, largeText, signedContext, sweep, tabTo, target44 } from "../support/a11y";
import { seedCouple, seedSharedMovements, type SeededCouple } from "../support/seed";
import { THEMES } from "./route-registry";

const JOB = process.env.A11Y_JOB === "e2e" ? "e2e" : "app";
const month = () => todayInBogota().slice(0, 7);

/** Pareja con los compartidos del mes en curso (Tomás le debe a Sara 429.900) y una liquidación parcial de 100.000. */
async function seedState(index: number) {
  const pair = await seedCouple({ index });
  await seedSharedMovements(pair, "recent");
  const settlement = await registerSettlement(pair.tomas.client, { idempotencyKey: randomUUID(), amount: moneyFromPesos(100000n), settlementDate: todayInBogota(), note: "Transferencia" });
  return { pair, settlement };
}
/** Saldo invertido (US-6.7): Tomás paga después 1.200.000 al 50/50 y ahora Sara le debe a Tomás 270.100. */
async function invert(pair: SeededCouple) {
  await createSharedExpense(pair.sara.client, {
    idempotencyKey: randomUUID(), amount: moneyFromPesos(1200000n), categoryId: "home", transactionDate: todayInBogota(), description: "Arreglo del baño",
    payerUserId: pair.tomas.id, splitMode: "equal", splitPercents: null,
    allocations: [{ userId: pair.sara.id, amount: moneyFromPesos(600000n) }, { userId: pair.tomas.id, amount: moneyFromPesos(600000n) }],
  });
}
const balanceRoot = (page: Page) => page.locator("[data-shared-balance]:visible").first();
async function openSettle(page: Page) {
  await page.getByRole("button", { name: copy.balance.actions.settle }).filter({ visible: true }).first().click();
  const sheet = page.getByRole("dialog", { name: copy.balance.settle.title });
  await expect(sheet.getByText(copy.balance.settle.direction("Tomás", "Sara"))).toBeVisible();
  return sheet;
}

if (JOB === "e2e") test.describe("Balance y liquidaciones (PR D)", () => {
  for (const colorScheme of THEMES) {
    for (const width of [390, 1440]) {
      test(`Balance · axe de Balance, hoja de liquidación, detalle y confirmación de anular · ${colorScheme} · ${width}px · con sesión`, width === 390 ? {} : { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
        const { pair, settlement } = await seedState(testInfo.parallelIndex);
        const label = (state: string) => `${colorScheme} ${width}px · ${state}`;
        const { context, page } = await signedContext(browser, baseURL!, pair.sara, colorScheme, "us");
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });

        await page.goto("/balance");
        await expect(balanceRoot(page).getByRole("heading", { name: copy.balance.owes("Tomás", "Sara") })).toBeVisible();
        await axe(page, label("Balance por saldar"));

        const sheet = await openSettle(page);
        await axe(page, label("hoja de liquidación"));
        await sheet.getByRole("radio", { name: copy.balance.settle.other }).click();
        await sheet.getByRole("textbox", { name: copy.balance.settle.otherAmount }).fill("900000");
        await sheet.getByRole("button", { name: copy.balance.settle.submit("$900.000") }).click();
        await expect(sheet.getByText(copy.balance.settle.errors.exceedsPending("$329.900"))).toBeVisible();
        await axe(page, label("hoja con el máximo"));
        await page.keyboard.press("Escape");
        await expect(sheet).toBeHidden();

        await page.goto(`/actividad/${settlement.id}?mes=${month()}`);
        const voidButton = page.getByRole("button", { name: copy.balance.settlement.void.action }).filter({ visible: true }).first();
        await expect(voidButton).toBeVisible();
        await axe(page, label("detalle de liquidación"));
        await voidButton.click();
        await expect(page.getByRole("alertdialog", { name: copy.balance.settlement.void.title })).toBeVisible();
        await axe(page, label("confirmación de anular"));
        await context.close();
      });
    }
  }

  test("barrido de siete anchos y 200 %: Balance, módulo de Inicio, hoja, detalle con «Anular» y saldo invertido · con sesión", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const { pair, settlement } = await seedState(testInfo.parallelIndex);
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.goto("/balance");
    await expect(balanceRoot(page)).toBeVisible();
    await sweep(page, "Balance");
    await largeText(page, "Balance");
    await page.goto("/");
    await expect(page.locator("[data-balance-line]:visible").first()).toBeVisible();
    // A 1024 o más, Inicio en Nosotros lleva el módulo con barras de 16 px; el barrido recorre los dos.
    await sweep(page, "Inicio en Nosotros con el módulo de balance");
    await page.goto("/balance");
    await openSettle(page);
    await sweep(page, "hoja de liquidación");
    await largeText(page, "hoja de liquidación");
    await page.keyboard.press("Escape");
    await page.goto(`/actividad/${settlement.id}?mes=${month()}`);
    await expect(page.getByRole("button", { name: copy.balance.settlement.void.action }).filter({ visible: true }).first()).toBeVisible();
    await sweep(page, "detalle de liquidación");
    await largeText(page, "detalle de liquidación");
    await invert(pair);
    await page.goto("/balance");
    await expect(balanceRoot(page).getByRole("heading", { name: copy.balance.owes("Sara", "Tomás") })).toBeVisible();
    await sweep(page, "saldo invertido");
    await largeText(page, "saldo invertido");
    await context.close();
  });

  test("teclado y 44 px: Registrar liquidación, Todo/Otro, fecha, Anular con Escape y el selector durante S1 · con sesión", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const { pair, settlement } = await seedState(testInfo.parallelIndex);
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.goto("/balance");
    await expect(balanceRoot(page)).toBeVisible();
    await target44(page, copy.balance.actions.settle);
    await tabTo(page, copy.balance.actions.settle);
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: copy.balance.settle.title });
    await expect(sheet).toBeVisible();
    // «Todo»/«Otro» con flechas.
    await expect(sheet.getByRole("radio", { name: copy.balance.settle.all })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(sheet.getByRole("radio", { name: copy.balance.settle.other })).toHaveAttribute("aria-checked", "true");
    for (const name of [copy.balance.settle.all, copy.balance.settle.other]) await target44(page, name, "radio");
    await tabTo(page, copy.balance.settle.otherAmount);
    await page.keyboard.type("50000");
    await tabTo(page, copy.balance.settle.date);
    await target44(page, copy.balance.settle.date, "textbox");
    await tabTo(page, copy.balance.settle.submit("$50.000"));
    await target44(page, copy.balance.settle.submit("$50.000"));
    // Escape cierra la hoja sin registrar nada.
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(balanceRoot(page).locator("[data-balance-amount]")).toHaveAttribute("data-balance-amount", "$329.900");

    // «Anular»: el foco inicial en la opción segura; Escape cancela.
    await page.goto(`/actividad/${settlement.id}?mes=${month()}`);
    await target44(page, copy.balance.settlement.void.action);
    await tabTo(page, copy.balance.settlement.void.action);
    await page.keyboard.press("Enter");
    const confirm = page.getByRole("alertdialog", { name: copy.balance.settlement.void.title });
    await expect(confirm.getByRole("button", { name: copy.balance.settlement.void.keep })).toBeFocused();
    for (const name of [copy.balance.settlement.void.keep, copy.balance.settlement.void.confirm]) await target44(page, name);
    await page.keyboard.press("Escape");
    await expect(confirm).toBeHidden();

    // El selector Yo/Nosotros durante S1: flechas, anuncio y, al llegar, el contexto nuevo.
    await page.goto("/");
    const selector = page.locator("[data-context-selector][data-hydrated]:visible").first();
    await selector.getByRole("radio", { name: copy.context.us }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(selector.getByRole("radio", { name: copy.context.me })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: copy.context.announce(copy.context.me) })).toHaveCount(1);
    await page.keyboard.press("ArrowRight");
    await expect(selector.getByRole("radio", { name: copy.context.us })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("[data-balance-line]:visible").first()).toBeVisible();
    await context.close();
  });
});
