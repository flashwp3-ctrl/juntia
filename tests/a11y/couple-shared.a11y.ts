// T044b / T051, T055 (spec 003, PR C) / FR-054, FR-055, FR-068; SC-001, SC-002 y SC-005 (C); F50-2, F50-3, F50-5;
// interpretaciones I4 e I5.
// Criterio literal (tasks.md, T051): «axe en los dos temas de Inicio, Actividad y Anotar en Nosotros y del inventario de
// estados nuevos del PR C: edición compartida (con el aviso y en conflicto de versión), la confirmación de eliminar un
// gasto compartido, ChangePreview (A3) y A5 de Mover a Pareja en sus dos variantes (rechazo confirmado y resultado
// desconocido); teclado: el selector de participantes, los modos de reparto, los campos de Importe y Porcentaje, Guardar
// con Enter y Escape para cerrar, y el flujo A1–A4 de Mover a Pareja; texto al 200 % y objetivos de 44 px en esos
// controles nuevos». Y de T055: «barrido sin scroll horizontal en los siete anchos y en los dos temas de Anotar compartido,
// Inicio y Actividad en Nosotros, Yo con la parte compartida, edición compartida y A1–A5».
// Interpretación de ejecución del PR C (como M6 y M7 en el PR B): estos estados necesitan dos cuentas emparejadas y gastos
// compartidos sembrados por las funciones reales, que el registro de una sola cuenta (route-registry.ts) no siembra. Van
// aquí, una pareja por tema y ancho que recorre todos los estados, para no pagar una siembra por estado en el job e2e.
// Regla 10 de tasks.md: todo necesita sesión, así que solo se define con A11Y_JOB=e2e y cada título termina en «con sesión».
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { createTransaction, updateTransaction } from "../../src/lib/db/transactions";
import { axe, largeText, signedContext, sweep, tabTo, target44 } from "../support/a11y";
import { seedCouple, seedMovements, seedSharedMovements, type SeededCouple } from "../support/seed";
import { THEMES } from "./route-registry";

const JOB = process.env.A11Y_JOB === "e2e" ? "e2e" : "app";
const month = () => todayInBogota().slice(0, 7);
const isAction = (method: string, headers: Record<string, string>) => method === "POST" && "next-action" in headers;

/** Pareja con los compartidos del mes en curso, privados de Sara y un privado para Mover a Pareja. */
async function seedState(index: number) {
  const pair = await seedCouple({ index });
  const [shared] = await Promise.all([seedSharedMovements(pair, "recent"), seedMovements(pair.sara, "recent")]);
  const pharmacy = await createTransaction(pair.sara.client, { idempotencyKey: randomUUID(), type: "expense", amount: moneyFromPesos(64000n), categoryId: "health", transactionDate: todayInBogota(), description: "Farmacia Pasteur" });
  return { pair, shared, pharmacy };
}

async function openAnnotate(page: Page) {
  await page.locator("body").focus();
  await page.keyboard.press("n");
  const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
  await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
  return sheet;
}
const summary = (page: Page) => page.getByRole("button", { name: new RegExp(`^${copy.shared.summary.open}`) });

async function openMove(page: Page, pair: SeededCouple, id: string) {
  await page.goto(`/actividad/${id}?mes=${month()}`);
  await page.getByRole("button", { name: copy.move.action }).click();
  const dialog = page.getByRole("dialog", { name: copy.move.action });
  await expect(dialog.getByText(copy.move.kept).first()).toBeVisible();
  void pair;
  return dialog;
}

if (JOB === "e2e") test.describe("Nosotros con pareja activa (PR C)", () => {
  for (const colorScheme of THEMES) {
    for (const width of [390, 1440]) {
      test(`Nosotros · axe de Inicio, Actividad, Anotar, Reparto, edición, eliminar, ChangePreview y A5 · ${colorScheme} · ${width}px · con sesión`, async ({ browser, baseURL }, testInfo) => {
        const { pair, shared, pharmacy } = await seedState(testInfo.parallelIndex);
        const label = (state: string) => `${colorScheme} ${width}px · ${state}`;
        const { context, page } = await signedContext(browser, baseURL!, pair.sara, colorScheme, "us");
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });

        await page.goto("/");
        await expect(page.locator("[data-balance-line]:visible")).toBeVisible();
        await axe(page, label("Inicio en Nosotros"));

        const sheet = await openAnnotate(page);
        await page.keyboard.type("186400");
        await sheet.getByRole("radio", { name: copy.categories.market }).click();
        await expect(summary(page)).toBeVisible();
        await axe(page, label("Anotar en Nosotros E1"));
        await summary(page).click();
        await page.getByRole("radio", { name: copy.shared.mode.amount }).click();
        const parts = page.getByRole("textbox", { name: /^Importe de/ });
        await parts.nth(1).fill("73200");
        await expect(page.getByText(copy.shared.split.missing("$20.000"))).toBeVisible();
        await axe(page, label("Reparto con «Faltan»"));
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");
        await page.getByRole("alertdialog").getByRole("button", { name: copy.annotate.discard.confirm }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);

        await page.goto(`/actividad?mes=${month()}`);
        await expect(page.getByText("Carulla Laureles").first()).toBeVisible();
        await axe(page, label("Actividad en Nosotros"));

        const detail = `/actividad/${shared[5].id}?mes=${month()}`;
        await page.goto(detail);
        await expect(page.getByRole("region", { name: copy.shared.detail.owed })).toBeVisible();
        await page.getByRole("button", { name: copy.detail.edit, exact: true }).click();
        const edit = page.getByRole("dialog", { name: copy.annotate.editTitle.expense });
        await expect(edit.getByText(copy.shared.edit.notice("Tomás"))).toBeVisible();
        await axe(page, label("edición compartida con el aviso"));
        // Conflicto de versión: Tomás lo edita mientras Sara tiene la hoja abierta.
        await pair.tomas.client.rpc("update_shared_expense", {
          p_idempotency_key: randomUUID(), p_transaction_id: shared[5].id, p_expected_version: shared[5].version, p_amount_minor: "18640000", p_category_id: "market",
          p_transaction_date: shared[5].transactionDate, p_description: "Carulla Laureles (editado)", p_payer_user_id: pair.tomas.id, p_split_mode: "equal", p_split_percents: null,
          p_parts: { [pair.sara.id]: "9320000", [pair.tomas.id]: "9320000" },
        });
        const amount = edit.getByRole("textbox", { name: copy.annotate.amount });
        await amount.fill("190000");
        await edit.getByRole("button", { name: copy.annotate.saveChanges }).click();
        await expect(edit.getByText(copy.shared.errors.versionConflict("Tomás"))).toBeVisible();
        await axe(page, label("edición compartida en conflicto"));
        await context.close();

        const fresh = await signedContext(browser, baseURL!, pair.sara, colorScheme, "us");
        await fresh.page.setViewportSize({ width, height: 900 });
        await fresh.page.goto(`/actividad/${shared[4].id}?mes=${month()}`);
        await fresh.page.getByRole("button", { name: copy.remove.action.expense }).click();
        await expect(fresh.page.getByRole("alertdialog", { name: copy.remove.title.expense })).toBeVisible();
        await axe(fresh.page, label("confirmación de eliminar"));
        await fresh.context.close();

        // Mover a Pareja en Yo: A3 ChangePreview, A5 rechazo confirmado (versión antigua) y A5 desconocido (red caída).
        const me = await signedContext(browser, baseURL!, pair.sara, colorScheme, "me");
        await me.page.setViewportSize({ width, height: 900 });
        let dialog = await openMove(me.page, pair, pharmacy.id);
        await dialog.getByRole("button", { name: copy.move.review }).click();
        await expect(dialog.getByRole("list", { name: new RegExp(copy.move.preview.title("")) })).toBeVisible();
        await axe(me.page, label("ChangePreview (A3)"));
        await updateTransaction(pair.sara.client, { idempotencyKey: randomUUID(), transactionId: pharmacy.id, expectedVersion: pharmacy.version, amount: pharmacy.amount, categoryId: "health", transactionDate: pharmacy.transactionDate, description: "Farmacia Pasteur" });
        await dialog.getByRole("button", { name: copy.move.confirm }).click();
        await expect(dialog.getByText(copy.move.rejected("Farmacia Pasteur"))).toBeVisible();
        await axe(me.page, label("A5 rechazo confirmado"));
        await me.page.keyboard.press("Escape");
        dialog = await openMove(me.page, pair, pharmacy.id);
        await dialog.getByRole("button", { name: copy.move.review }).click();
        await expect(dialog.getByRole("list")).toBeVisible();
        // Con la vista previa ya calculada, la red cae: la Server Action de mover no obtiene respuesta.
        await me.page.route("**/*", (route) => (isAction(route.request().method(), route.request().headers()) ? route.abort("failed") : route.fallback()));
        await dialog.getByRole("button", { name: copy.move.confirm }).click();
        await expect(dialog.getByRole("alert")).toContainText(copy.writes.unknown);
        await axe(me.page, label("A5 resultado desconocido"));
        await me.context.close();
      });
    }
  }

  test("barrido de siete anchos y 200 %: Anotar compartido, Inicio y Actividad en Nosotros, Yo con la parte, edición y A1–A3 · con sesión", async ({ browser, baseURL }, testInfo) => {
    const { pair, shared, pharmacy } = await seedState(testInfo.parallelIndex);
    const us = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    const page = us.page;
    await page.goto("/");
    await expect(page.locator("[data-balance-line]:visible")).toBeVisible();
    await sweep(page, "Inicio en Nosotros");
    await largeText(page, "Inicio en Nosotros");
    await page.goto(`/actividad?mes=${month()}`);
    await expect(page.getByText("Carulla Laureles").first()).toBeVisible();
    await sweep(page, "Actividad en Nosotros");
    await largeText(page, "Actividad en Nosotros");
    await page.goto("/");
    const sheet = await openAnnotate(page);
    await page.keyboard.type("186400");
    await sheet.getByRole("radio", { name: copy.categories.market }).click();
    await sweep(page, "Anotar en Nosotros E1");
    await largeText(page, "Anotar en Nosotros E1");
    await summary(page).click();
    await page.getByRole("radio", { name: copy.shared.mode.percent }).click();
    await sweep(page, "Reparto en Porcentaje");
    await largeText(page, "Reparto en Porcentaje");
    await page.goto(`/actividad/${shared[5].id}?mes=${month()}`);
    await page.getByRole("button", { name: copy.detail.edit, exact: true }).click();
    await expect(page.getByRole("dialog", { name: copy.annotate.editTitle.expense })).toBeVisible();
    await sweep(page, "edición compartida");
    await largeText(page, "edición compartida");
    await us.context.close();

    const me = await signedContext(browser, baseURL!, pair.sara, "light", "me");
    await me.page.goto("/");
    await expect(me.page.getByText(copy.home.sharedPart)).toBeVisible();
    await sweep(me.page, "Yo con la parte compartida");
    await largeText(me.page, "Yo con la parte compartida");
    await me.page.goto(`/actividad/${pharmacy.id}?mes=${month()}`);
    await expect(me.page.getByRole("button", { name: copy.move.action })).toBeVisible();
    await sweep(me.page, "A1");
    await largeText(me.page, "A1");
    const dialog = await openMove(me.page, pair, pharmacy.id);
    await sweep(me.page, "A2");
    await largeText(me.page, "A2");
    await dialog.getByRole("button", { name: copy.move.review }).click();
    await expect(dialog.getByRole("list")).toBeVisible();
    await sweep(me.page, "A3");
    await largeText(me.page, "A3");
    await me.context.close();
  });

  test("teclado y 44 px: participantes, modos de reparto, Importe y Porcentaje, Enter, Escape y Mover a Pareja A1–A4 · con sesión", async ({ browser, baseURL }, testInfo) => {
    const { pair, pharmacy } = await seedState(testInfo.parallelIndex);
    const us = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    const page = us.page;
    await page.goto("/");
    const sheet = await openAnnotate(page);
    await page.keyboard.type("90000");
    // La rejilla: Tab entra en la categoría y Espacio la elige; después Tab llega al resumen y Enter abre «Reparto».
    await tabTo(page, copy.categories.market);
    await page.keyboard.press("Space");
    await tabTo(page, new RegExp(`^${copy.shared.summary.open}`));
    await target44(page, new RegExp(`^${copy.shared.summary.open}`));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: copy.shared.split.title })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: copy.shared.split.payer }).getByRole("radio", { name: /Sara/ })).toBeFocused();
    // Pagó con flechas.
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radiogroup", { name: copy.shared.split.payer }).getByRole("radio", { name: /Tomás/ })).toHaveAttribute("aria-checked", "true");
    // Modos de reparto con flechas: 50/50 → Porcentaje.
    await tabTo(page, copy.shared.mode.equal);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: copy.shared.mode.percent })).toHaveAttribute("aria-checked", "true");
    for (const name of [copy.shared.mode.equal, copy.shared.mode.percent, copy.shared.mode.amount]) await target44(page, name, "radio");
    // Porcentaje: teclear 60 y 40.
    await tabTo(page, copy.shared.split.percentOf("Sara"));
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("60");
    await tabTo(page, copy.shared.split.percentOf("Tomás"));
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("40");
    await target44(page, copy.shared.split.percentOf("Sara"), "textbox");
    // Participantes: Espacio en la casilla de Tomás la quita y la vuelve a poner.
    await tabTo(page, new RegExp(`^Tomás`));
    await target44(page, /^Tomás/, "checkbox");
    await page.keyboard.press("Space");
    await expect(page.getByText(copy.shared.split.singleNote("Sara"))).toBeVisible();
    await page.keyboard.press("Space");
    // Importe: el modo y un campo.
    await page.getByRole("radio", { name: copy.shared.mode.amount }).focus();
    await page.keyboard.press("Enter");
    await tabTo(page, copy.shared.split.amountOf("Sara"));
    await target44(page, copy.shared.split.amountOf("Sara"), "textbox");
    // Escape vuelve al resumen; Guardar con Enter desde el monto.
    await page.keyboard.press("Escape");
    await expect(summary(page)).toBeVisible();
    await sheet.getByRole("textbox", { name: copy.annotate.amount }).focus();
    await page.keyboard.press("Enter");
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: copy.annotate.saved.expense })).toBeVisible();
    // Escape cierra una hoja sin cambios.
    await openAnnotate(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await us.context.close();

    // Mover a Pareja A1–A4 sin ratón.
    const me = await signedContext(browser, baseURL!, pair.sara, "light", "me");
    await me.page.goto(`/actividad/${pharmacy.id}?mes=${month()}`);
    await target44(me.page, copy.move.action);
    await tabTo(me.page, copy.move.action);
    await me.page.keyboard.press("Enter");
    const dialog = me.page.getByRole("dialog", { name: copy.move.action });
    await expect(dialog).toBeVisible();
    await tabTo(me.page, copy.move.review);
    await target44(me.page, copy.move.review);
    await me.page.keyboard.press("Enter");
    await expect(dialog.getByRole("list")).toBeVisible();
    await tabTo(me.page, copy.move.confirm);
    await me.page.keyboard.press("Enter");
    await expect(me.page.getByRole("status").filter({ hasText: copy.move.donePrefix })).toBeVisible();
    await me.context.close();
  });
});
