// 004 PR C, T044 / FR-101, FR-102, FR-115; SC-002; maestro §15.10, decisión 21 (accesibilidad en dos niveles).
// Criterio literal (tasks.md, T044): «ligero (Metas vacío y con metas en Yo y Nosotros, inmersiva, hojas de meta, aporte,
// retiro, historial, error) y `@sweep`».
// Como Balance (PR D de la 003), estos estados necesitan dos cuentas emparejadas y metas sembradas por las funciones reales,
// que el registro de una sola cuenta (route-registry.ts) no siembra: van aquí. Regla 10 de tasks.md: solo con A11Y_JOB=e2e,
// y cada título termina en «con sesión». Nivel ligero: cada estado una vez, a 390, en los dos temas, en una sola pasada por
// tema con una pareja (el job `e2e` está cerca de su tope). El barrido lleva @sweep y corre a mano (T055).
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { contributeToGoal, createGoal } from "../../src/lib/db/goals";
import { axe, largeText, signedContext, sweep, tabTo, target44 } from "../support/a11y";
import { seedCouple } from "../support/seed";
import { THEMES } from "./route-registry";

const JOB = process.env.A11Y_JOB === "e2e" ? "e2e" : "app";

/** Pareja con Japón compartida (aportes de los dos) y una meta personal de Sara. */
async function seedGoals(index: number) {
  const pair = await seedCouple({ index });
  const japan = await createGoal(pair.sara.client, { idempotencyKey: randomUUID(), context: "us", name: "Japón", goalType: "travel", target: moneyFromPesos(18000000n), targetMonth: "2027-04-01" });
  const second = await createGoal(pair.tomas.client, { idempotencyKey: randomUUID(), context: "us", name: "Sala nueva", goalType: "home", target: moneyFromPesos(4000000n), targetMonth: null });
  const bike = await createGoal(pair.sara.client, { idempotencyKey: randomUUID(), context: "me", name: "Bicicleta de ruta", goalType: "other", target: moneyFromPesos(3000000n), targetMonth: null });
  const today = todayInBogota();
  await contributeToGoal(pair.sara.client, { idempotencyKey: randomUUID(), goalId: japan.id, amount: moneyFromPesos(500000n), entryDate: today, fundingMode: "reserved" });
  await contributeToGoal(pair.tomas.client, { idempotencyKey: randomUUID(), goalId: japan.id, amount: moneyFromPesos(400000n), entryDate: today, fundingMode: "transferred_declared" });
  await contributeToGoal(pair.tomas.client, { idempotencyKey: randomUUID(), goalId: second.id, amount: moneyFromPesos(300000n), entryDate: today, fundingMode: "reserved" });
  await contributeToGoal(pair.sara.client, { idempotencyKey: randomUUID(), goalId: bike.id, amount: moneyFromPesos(1050000n), entryDate: today, fundingMode: "reserved" });
  return { pair, japan, bike };
}

/**
 * Las casillas de «Tipo de meta» de la hoja abierta: cuántas hay en cada fila y qué etiqueta no cabe en la suya. En el gate del
 * PR #69 (run 42956506044) la hoja se volvía a montar al cruzar 768 px (BottomSheet → Modal) y hubo que esperar a una sola hoja
 * maquetada. Desde que el marco usa BottomSheet `adaptive` es el mismo árbol: basta esperar a que la hoja tome la presentación
 * del ancho nuevo (`data-modal` desde 768, `data-bottom-sheet` por debajo) y medir una vez.
 */
async function goalTypeRows(page: Page, title: string, width: number) {
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toHaveAttribute(width >= 768 ? "data-modal" : "data-bottom-sheet", "");
  return dialog.getByRole("group", { name: copy.goals.sheet.type }).getByRole("radio").first().evaluate((radio) => {
    const cells = [...(radio.closest("label")?.parentElement?.children ?? [])] as HTMLElement[];
    const rows = new Map<number, number>();
    for (const cell of cells) {
      const top = Math.round(cell.getBoundingClientRect().top);
      rows.set(top, (rows.get(top) ?? 0) + 1);
    }
    const clipped = cells.filter((cell) => {
      const text = cell.querySelector("span:last-child") as HTMLElement | null;
      const box = cell.getBoundingClientRect();
      const label = text?.getBoundingClientRect();
      return !text || !label || text.scrollWidth > text.clientWidth + 1 || label.left < box.left - 0.5 || label.right > box.right + 0.5;
    }).map((cell) => cell.textContent?.trim() ?? "");
    return { perRow: [...rows.entries()].sort(([a], [b]) => a - b).map(([, count]) => count), clipped };
  });
}

async function openDialog(page: Page, button: string, title: string) {
  await page.getByRole("button", { name: button }).filter({ visible: true }).first().click();
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  return dialog;
}

if (JOB === "e2e") test.describe("Metas, inmersiva, hojas e historial (PR C de la 004)", () => {
  for (const colorScheme of THEMES) {
    test(`Metas · axe ligero de Metas (vacío y con metas, Yo y Nosotros), inmersiva, hojas, historial y error · ${colorScheme} · 390px · con sesión`, async ({ browser, baseURL }, testInfo) => {
      test.slow();
      const label = (state: string) => `${colorScheme} 390px · ${state}`;
      // Vacío en Nosotros: una pareja sin metas.
      const empty = await seedCouple({ index: testInfo.parallelIndex });
      const blank = await signedContext(browser, baseURL!, empty.sara, colorScheme, "us");
      await blank.page.setViewportSize({ width: 390, height: 900 });
      await blank.page.goto("/metas");
      await expect(blank.page.getByRole("heading", { name: copy.goals.empty.us.title })).toBeVisible();
      await axe(blank.page, label("Metas vacío en Nosotros"));
      await blank.context.close();

      const { pair, japan, bike } = await seedGoals(testInfo.parallelIndex);
      const us = await signedContext(browser, baseURL!, pair.sara, colorScheme, "us");
      const page = us.page;
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto("/metas");
      await expect(page.getByRole("link", { name: /^Japón, meta compartida/ }).first()).toBeVisible();
      await axe(page, label("Metas en Nosotros con pila"));

      await openDialog(page, copy.goals.stack.create, copy.goals.sheet.createTitle);
      await axe(page, label("hoja de nueva meta"));
      // Encargo del fundador (10 nov 2026): en escritorio los siete tipos iban en una sola fila y «Emergencias» se salía de
      // su casilla. Ahora van en dos filas, 4 + 3, en todos los anchos, sin cortar ninguna etiqueta. Se mide a 390 y a 1440.
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const { perRow, clipped } = await goalTypeRows(page, copy.goals.sheet.createTitle, width);
        expect(perRow, `${width}px: tipos de meta por fila`).toEqual([4, 3]);
        expect.soft(clipped, `${width}px: etiquetas de tipo cortadas`).toEqual([]);
      }
      await page.setViewportSize({ width: 390, height: 900 });
      await page.keyboard.press("Escape");

      await page.goto(`/metas/${japan.id}`);
      await expect(page.getByRole("heading", { level: 1, name: "Japón" })).toBeVisible();
      await expect(page.getByRole("heading", { name: copy.goals.history.title })).toBeVisible();
      await axe(page, label("meta inmersiva con historial"));

      const contribute = await openDialog(page, copy.goals.immersive.contribute, copy.goals.contribute.title);
      await contribute.getByRole("textbox", { name: copy.goals.contribute.amount }).fill("500000");
      await axe(page, label("hoja de aporte con vista previa"));
      await page.keyboard.press("Escape");

      const withdraw = await openDialog(page, copy.goals.immersive.withdraw, copy.goals.withdrawSheet.title);
      await withdraw.getByRole("textbox", { name: copy.goals.withdrawSheet.amount }).fill("900000");
      await withdraw.getByLabel(copy.goals.withdrawSheet.reason).fill("Otro plan");
      await withdraw.getByRole("button", { name: copy.goals.withdrawSheet.submit("$900.000") }).click();
      await expect(withdraw.getByRole("alert")).toContainText(copy.goals.errors.insufficient("$500.000"));
      await axe(page, label("hoja de retiro con el máximo"));
      await page.keyboard.press("Escape");

      await openDialog(page, copy.goals.immersive.edit, copy.goals.sheet.editTitle);
      await axe(page, label("hoja de editar meta"));
      await page.keyboard.press("Escape");

      // Error: una meta que no existe (o de otro contexto).
      await page.goto("/metas/00000000-0000-4000-8000-000000000000");
      await expect(page.getByRole("heading", { name: copy.goals.immersive.notFound.title })).toBeVisible();
      await axe(page, label("meta no encontrada"));
      await us.context.close();

      const me = await signedContext(browser, baseURL!, pair.sara, colorScheme, "me");
      await me.page.setViewportSize({ width: 390, height: 900 });
      await me.page.goto("/metas");
      await expect(me.page.getByRole("region", { name: copy.goals.sections.shared })).toBeVisible();
      await axe(me.page, label("Metas en Yo con personales y compartidas"));
      await me.page.goto(`/metas/${bike.id}`);
      await expect(me.page.getByRole("heading", { level: 1, name: "Bicicleta de ruta" })).toBeVisible();
      await axe(me.page, label("meta personal inmersiva"));
      await me.context.close();
    });
  }

  test("barrido de siete anchos y 200 %: Metas (pila y abanico), inmersiva, hojas e historial · con sesión", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const { pair, japan } = await seedGoals(testInfo.parallelIndex);
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.goto("/metas");
    await expect(page.getByRole("link", { name: /^Japón, meta compartida/ }).first()).toBeVisible();
    await sweep(page, "Metas en Nosotros");
    await largeText(page, "Metas en Nosotros");
    await page.goto(`/metas/${japan.id}`);
    await expect(page.getByRole("heading", { level: 1, name: "Japón" })).toBeVisible();
    await sweep(page, "meta inmersiva");
    await largeText(page, "meta inmersiva");
    await openDialog(page, copy.goals.immersive.contribute, copy.goals.contribute.title);
    await sweep(page, "hoja de aporte");
    await page.keyboard.press("Escape");
    await openDialog(page, copy.goals.immersive.withdraw, copy.goals.withdrawSheet.title);
    await sweep(page, "hoja de retiro");
    await context.close();
  });

  // Encargo del gestor en el PR E (hallazgo de la sesión del PR D, 10 nov 2026): en Inicio de Nosotros, a 320 px y con el
  // texto al 200 %, el título de la tarjeta se cortaba incluso con «Japón» (tema oscuro). `largeText` mide a 390 y solo el
  // recorte horizontal; aquí se mide lo que se perdía: el título recortado en vertical (`line-clamp-2` lo dejaba encoger) y el
  // contenido de la tarjeta que se salía por debajo de su caja (`overflow-hidden`). En los dos temas, como el resto del barrido.
  test("320 px y 200 %: el título y el contenido de las tarjetas de meta de Inicio de Nosotros caben sin cortarse · con sesión", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const { pair } = await seedGoals(testInfo.parallelIndex);
    for (const colorScheme of THEMES) {
      const { context, page } = await signedContext(browser, baseURL!, pair.tomas, colorScheme, "us");
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("link", { name: /^Japón, meta compartida/ }).first()).toBeVisible();
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      // Sin esperas fijas: se mide cuando la maquetación con el texto grande ya está (las tarjetas tienen tamaño).
      const measure = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("main [data-goal-card]")]
        .filter((card) => card.getClientRects().length > 0 && card.getBoundingClientRect().width > 0)
        .flatMap((card) => {
          const title = card.querySelector<HTMLElement>("[data-goal-title]");
          const name = title?.textContent?.trim() ?? "";
          // Recortado = `line-clamp` esconde al menos media línea (unos px de más son el remate de las letras, no texto perdido).
          const line = title ? parseFloat(getComputedStyle(title).lineHeight) || 0 : 0;
          const box = card.getBoundingClientRect();
          // Texto que queda fuera de la caja de la tarjeta (`overflow-hidden` lo esconde). La decoración en posición absoluta (la
          // inicial de apertura, el fondo sin foto) no cuenta: no es contenido.
          const decorative = (node: HTMLElement) => { for (let at: HTMLElement | null = node; at && at !== card; at = at.parentElement) if (getComputedStyle(at).position === "absolute") return true; return false; };
          const outside = [...card.querySelectorAll<HTMLElement>("span, p")]
            .filter((node) => node.children.length === 0 && (node.textContent ?? "").trim() && !node.classList.contains("sr-only") && !decorative(node))
            .filter((node) => { const rect = node.getBoundingClientRect(); return rect.height > 0 && (rect.bottom > box.bottom + 1 || rect.right > box.right + 1); })
            .map((node) => `«${(node.textContent ?? "").trim().slice(0, 30)}»`);
          return [
            ...(title ? [] : ["tarjeta sin título"]),
            ...(title && title.scrollHeight - title.clientHeight > line / 2 ? [`título «${name}» recortado (${title.scrollHeight} > ${title.clientHeight})`] : []),
            ...(outside.length ? [`tarjeta «${name}»: fuera de la caja ${outside.join(", ")}`] : []),
          ];
        }));
      await expect.poll(() => page.evaluate(() => document.querySelectorAll("main [data-goal-card]").length)).toBeGreaterThan(0);
      const clipped = await measure();
      console.log(`Inicio de Nosotros · ${colorScheme} · 320px · 200 %: ${clipped.length ? clipped.join("; ") : "sin recortes"}`);
      expect.soft(clipped, `${colorScheme} · 320px · 200 %: tarjetas de meta sin recortes`).toEqual([]);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect.soft(scrollWidth, `${colorScheme} · 320px · 200 %: sin scroll horizontal`).toBeLessThanOrEqual(clientWidth);
      await context.close();
    }
  });

  test("teclado y 44 px: la pila, «Ver todas», la inmersiva (Enter abre, Escape cierra) y los botones de aporte y retiro · con sesión", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const { pair } = await seedGoals(testInfo.parallelIndex);
    const { context, page } = await signedContext(browser, baseURL!, pair.sara, "light", "us");
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/metas");
    await target44(page, copy.goals.stack.seeAll);
    await tabTo(page, /^Japón, meta compartida/);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Japón" })).toBeFocused();
    await target44(page, copy.goals.immersive.contribute);
    await target44(page, copy.goals.immersive.withdraw);
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/metas$/);
    await context.close();
  });
});
