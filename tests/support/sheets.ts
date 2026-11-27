// PR del paso 4b, M3 (opción (a) aprobada por el gestor, 27 nov 2026): abrir cada diálogo que lleva SheetTitle
// (`src/components/ui/modal.tsx`) y medir su título. Lo usan la regresión de `tests/a11y/routes.a11y.ts` y la comparación de
// geometría de `tests/evidence/desbordes-117.capture.ts`.
// Los diálogos: Anotar gasto, Anotar ingreso, Editar gasto (Inicio y Actividad en Yo); Crear presupuesto y Editar presupuesto
// (Plan en Nosotros); Nueva meta, Registrar aporte y Retirar de la meta (Metas en Nosotros); Registrar liquidación (Balance en
// Nosotros); Invitar a mi pareja (Mi pareja, sin pareja); Exportar mis datos (Privacidad). Los títulos de SheetTitle que no se
// PR 119, ronda 2 (F119-2): también «Editar ingreso» (el ingreso de octubre de Sara), «Enlace nuevo» (Mi pareja con una invitación
// pendiente) y «Editar meta» (Japón): las 14 variantes de título que llegan a SheetTitle.
import { expect, type Browser, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";
import { runnerSql } from "../integration/support/sql";
import { signedContext } from "./a11y";
import { seedCouple, seedInvitation, seedUser, type SeededUser } from "./seed";

export type SheetCase = { title: string; user: SeededUser; scope: "me" | "us"; path: string; open: (page: Page) => Promise<void> };

const click = async (page: Page, name: string | RegExp, exact = false) => { await page.getByRole("button", { name, exact }).filter({ visible: true }).first().click(); };
async function annotate(page: Page) {
  await expect(page.locator("[data-context-selector][data-hydrated]").first()).toBeAttached();
  await page.locator("body").focus();
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog", { name: copy.annotate.title.expense }).getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
}

/** Siembra la pareja dorada (con los presupuestos del mes, Japón y los gastos de Sara) y una cuenta sin pareja, y da los casos. */
export async function sheetCases(index: number): Promise<SheetCase[]> {
  const pair = await seedCouple({ index, golden: true });
  const solo = await seedUser({ role: "hojas", index });
  const inviting = await seedUser({ role: "hojas-enlace", index });
  await seedInvitation(inviting, `pareja-hojas-${index}-${Date.now()}@seed.test`);
  const japan = runnerSql(`select id from juntia_data.savings_goals where group_id='${pair.groupId}' and name='Japón'`);
  return [
    { title: copy.annotate.title.expense, user: pair.sara, scope: "me", path: "/", open: annotate },
    { title: copy.annotate.title.income, user: pair.sara, scope: "me", path: "/", open: async (page) => {
      await annotate(page);
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("ArrowRight");
    } },
    { title: copy.annotate.editTitle.expense, user: pair.sara, scope: "me", path: "/actividad?mes=2026-10", open: async (page) => {
      await page.locator("main a[data-transaction-id]").filter({ visible: true }).first().click();
      await page.waitForURL(/\/actividad\/[^/?]+/);
      await click(page, copy.detail.edit, true);
    } },
    { title: copy.plan.sheet.createTitle, user: pair.sara, scope: "us", path: "/plan", open: (page) => click(page, copy.plan.createBudget, true) },
    { title: copy.plan.sheet.editTitle, user: pair.sara, scope: "us", path: "/plan", open: (page) => click(page, copy.plan.edit(copy.categories.market)) },
    { title: copy.goals.sheet.createTitle, user: pair.sara, scope: "us", path: "/metas", open: (page) => click(page, copy.goals.stack.create) },
    { title: copy.goals.contribute.title, user: pair.sara, scope: "us", path: `/metas/${japan}`, open: (page) => click(page, copy.goals.immersive.contribute) },
    { title: copy.goals.withdrawSheet.title, user: pair.sara, scope: "us", path: `/metas/${japan}`, open: (page) => click(page, copy.goals.immersive.withdraw) },
    { title: copy.balance.settle.title, user: pair.sara, scope: "us", path: "/balance", open: (page) => click(page, copy.balance.actions.settle) },
    { title: copy.couple.invite.title, user: solo, scope: "me", path: "/cuenta/pareja", open: (page) => click(page, copy.couple.none.invite) },
    { title: copy.account.export.title, user: solo, scope: "me", path: "/cuenta/privacidad", open: (page) => click(page, new RegExp(copy.account.privacy.export)) },
    { title: copy.annotate.editTitle.income, user: pair.sara, scope: "me", path: "/actividad?mes=2026-10", open: async (page) => {
      await page.locator("main a[data-transaction-id]").filter({ visible: true, hasText: "+$" }).first().click();
      await page.waitForURL(/\/actividad\/[^/?]+/);
      await click(page, copy.detail.edit, true);
    } },
    { title: copy.couple.invite.regenerateTitle, user: inviting, scope: "me", path: "/cuenta/pareja", open: (page) => click(page, copy.couple.pending.regenerate) },
    { title: copy.goals.sheet.editTitle, user: pair.sara, scope: "us", path: `/metas/${japan}`, open: (page) => click(page, copy.goals.immersive.edit) },
  ];
}

/** Abre el caso en un contexto nuevo y espera al diálogo con su título. */
export async function openSheet(browser: Browser, baseURL: string, item: SheetCase) {
  const { context, page } = await signedContext(browser, baseURL, item.user, "light", item.scope);
  await page.goto(item.path);
  await item.open(page);
  await expect(page.getByRole("dialog", { name: item.title })).toBeVisible();
  return { context, page };
}

/**
 * El título de SheetTitle del diálogo abierto, con Brygada 1918 500 ya cargada (F119-3: `document.fonts.ready` y su comprobación):
 * tamaño de letra, ancho de su columna (el contenedor `@container`), la palabra más ancha medida en el DOM (geometría del texto),
 * la caja del título y, para la geometría real (F119-1): cuántas líneas del título salen de su columna, si el título se recorta y
 * cuántos botones del diálogo solapa.
 */
export const measureSheetTitle = (page: Page, title: string) => page.evaluate(async (name) => {
  await document.fonts.ready;
  const fontLoaded = document.fonts.check('500 16px "Brygada 1918"');
  const dialog = [...document.querySelectorAll<HTMLElement>("[role='dialog']")].find((node) => node.getClientRects().length > 0 && node.querySelector("h1, h2, h3")?.textContent === name)!;
  const heading = dialog.querySelector<HTMLElement>("h1, h2, h3")!;
  const column = heading.parentElement!.getBoundingClientRect();
  const text = [...heading.childNodes].find((node) => node.nodeType === 3) as Text;
  const words = [...text.data.matchAll(/\S+/g)].map((match) => {
    const range = document.createRange();
    range.setStart(text, match.index!);
    range.setEnd(text, match.index! + match[0].length);
    return { word: match[0], width: range.getBoundingClientRect().width };
  });
  const widest = words.reduce((a, b) => (b.width > a.width ? b : a));
  const whole = document.createRange();
  whole.selectNodeContents(heading);
  const lines = [...whole.getClientRects()].filter((rect) => rect.width > 0);
  const linesOutside = lines.filter((rect) => rect.left < column.left - 0.5 || rect.right > column.right + 0.5).length;
  const meets = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  const overButtons = [...dialog.querySelectorAll("button")].filter((button) => button.getClientRects().length > 0 && lines.some((line) => meets(line, button.getBoundingClientRect()))).length;
  const box = heading.getBoundingClientRect();
  const r = (value: number) => Math.round(value * 100) / 100;
  return { fontLoaded, fontSize: r(parseFloat(getComputedStyle(heading).fontSize)), titleEm: heading.style.getPropertyValue("--title-em"), column: r(column.width), word: widest.word, wordWidth: r(widest.width),
    linesOutside, clipped: heading.scrollWidth > heading.clientWidth + 1, overButtons,
    box: [r(box.left), r(box.top), r(box.width), r(box.height)], root: parseFloat(getComputedStyle(document.documentElement).fontSize) };
}, title);
