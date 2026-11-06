// T083 / FR-065; US-2; SC-009; ADR-011 §2, fila 14. Spec E2E 2 «Anotar gasto, cronometrado» (nace en el PR D).
// Criterio literal (tasks.md, T083): «con sesión y dataset sembrados, `N` → monto → categoría reciente → Guardar → el
// total de Inicio sube y la fila nueva queda resaltada, Toast; doble toque en Guardar → un solo movimiento, comprobado
// por la base (SC-009); el tiempo del recorrido se reporta como laboratorio; un test con motion activo para los momentos
// L2 de E5».
// Además, «Deshacer» de punta a punta (US-2.5): el total vuelve y el movimiento sale de la base activa. Solo Chromium y
// ninguna espera fija (ADR-011 §6); cada test siembra su propia cuenta, porque escribe movimientos.
import type { Page } from "@playwright/test";
import { formatMoney, moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { listTransactions } from "../../src/lib/db/transactions";
import { seedMovements, seedUser, type SeededUser } from "../support/seed";
import { expect, signInContext, test } from "./fixtures";

const anonymous = { cookies: [], origins: [] };
test.use({ storageState: anonymous });

const month = () => todayInBogota().slice(0, 7);
const activeCount = async (user: SeededUser) => (await listTransactions(user.client, month())).length;
/** El héroe de Inicio guarda su valor final en `data-counting-amount`: «$412.900» → 412900n pesos. */
const heroPesos = async (page: Page) => BigInt(((await page.locator("[data-counting-amount]:visible").getAttribute("data-counting-amount")) ?? "").replace(/\D/g, ""));

async function signedInHome(page: Page, user: SeededUser) {
  await signInContext(page.context(), user);
  // El contexto recordado en el dispositivo es Yo (F44-1): el servidor pinta Inicio con los movimientos.
  await page.context().addCookies([{ name: "juntia_context", value: "me", domain: "localhost", path: "/" }]);
  await page.context().addInitScript(() => window.localStorage.setItem("juntia:context", "me"));
  await page.goto("/");
}

async function annotate(page: Page, pesos: string) {
  await page.locator("body").focus();
  await page.keyboard.press("n");
  const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
  await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
  await page.keyboard.type(pesos);
  await sheet.getByRole("group", { name: copy.annotate.recent }).getByRole("button").first().click();
  return sheet;
}

test("N → monto → categoría reciente → Guardar: el total sube, la fila nueva queda resaltada y Deshacer lo revierte", async ({ page }, testInfo) => {
  const user = await seedUser({ role: "anotar", index: testInfo.parallelIndex });
  const seeded = (await seedMovements(user, "recent")).length;
  await signedInHome(page, user);
  const before = await heroPesos(page);
  expect(before).toBeGreaterThan(0n);

  const started = Date.now();
  const sheet = await annotate(page, "45000");
  await page.keyboard.press("Enter");
  await expect(sheet).toBeHidden();
  const toast = page.getByRole("status").filter({ hasText: copy.annotate.saved.expense });
  await expect(toast).toBeVisible();
  const elapsed = Date.now() - started;
  // Laboratorio, no US-12 (SC-003 se mide en el teléfono de un fundador, T087).
  testInfo.annotations.push({ type: "laboratorio", description: `recorrido N → Toast en ${elapsed} ms` });
  console.log(`spec 2 · laboratorio: N → monto → categoría → Enter → Toast en ${elapsed} ms`);

  const expected = formatMoney(moneyFromPesos(before + 45000n));
  await expect(page.locator("[data-counting-amount]:visible")).toHaveAttribute("data-counting-amount", expected);
  const fresh = page.locator("a[data-new]:visible");
  await expect(fresh).toHaveCount(1);
  await expect(fresh).toContainText("$45.000");
  expect(await activeCount(user)).toBe(seeded + 1);

  // US-2.5: «Deshacer» dentro de los 6 s anula con auditoría; el total vuelve y la fila desaparece.
  await toast.getByRole("button", { name: copy.annotate.undo }).click();
  await expect(page.getByRole("status").filter({ hasText: copy.annotate.undone.expense })).toBeVisible();
  await expect(page.locator("[data-counting-amount]:visible")).toHaveAttribute("data-counting-amount", formatMoney(moneyFromPesos(before)));
  await expect(page.locator("a[data-new]:visible")).toHaveCount(0);
  expect(await activeCount(user)).toBe(seeded);
});

test("SC-009: doble toque en Guardar y el mismo envío repetido a mano dejan un solo movimiento en la base", async ({ page }, testInfo) => {
  const user = await seedUser({ role: "doble-toque", index: testInfo.parallelIndex });
  await signedInHome(page, user);
  // Se guarda la petición real de la Server Action para repetirla tal cual (misma clave de idempotencia).
  const posted = page.waitForRequest((request) => request.method() === "POST" && "next-action" in request.headers());
  const sheet = await annotate(page, "12500");
  await sheet.getByRole("button", { name: /^Guardar/ }).dblclick();
  const request = await posted;
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: copy.annotate.saved.expense })).toBeVisible();
  // El navegador ya no manda una segunda: el servidor tampoco crea otra si llega (reintento de red, ADR-013 §3).
  const replay = await page.request.post(request.url(), { headers: await request.allHeaders(), data: request.postData() ?? "" });
  expect(replay.ok()).toBe(true);
  const rows = await listTransactions(user.client, month());
  expect(rows).toHaveLength(1);
  expect(rows[0].amount.amountMinor).toBe(1250000n);
});

test("motion activo: el total cuenta hacia arriba y la fila nueva se desvanece (momentos L2 de E5)", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, reducedMotion: "no-preference", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const user = await seedUser({ role: "anotar-motion", index: testInfo.parallelIndex });
  await seedMovements(user, "recent");
  await signedInHome(page, user);
  const before = await heroPesos(page);
  // Cada texto que pinta el contador entre el guardado y el valor final, sin esperas fijas: un MutationObserver.
  await page.evaluate(() => {
    // Next conserva copias ocultas de rutas visitadas: la que cuenta es la visible.
    const target = [...document.querySelectorAll<HTMLElement>("[data-counting-amount]")].find((node) => node.getClientRects().length > 0)!;
    const seen: string[] = [];
    const rows: string[] = [];
    Object.assign(window, { __counter: seen, __rowAnimations: rows });
    new MutationObserver(() => seen.push(target.textContent ?? "")).observe(target, { childList: true, characterData: true, subtree: true });
    // La fila nueva anima su fondo (row-new, 1,2 s): se registra el arranque, que no depende de cuándo se mire.
    document.addEventListener("animationstart", (event) => { if ((event.target as HTMLElement).matches("a[data-new]")) rows.push(event.animationName); });
  });
  const sheet = await annotate(page, "80000");
  await page.keyboard.press("Enter");
  await expect(sheet).toBeHidden();
  const expected = formatMoney(moneyFromPesos(before + 80000n));
  await expect(page.locator("[data-counting-amount]:visible")).toHaveText(expected);
  const frames = await page.evaluate(() => (window as unknown as { __counter: string[] }).__counter);
  console.log(`spec 2 · motion: ${frames.length} cuadros del contador hasta ${expected}`);
  expect(new Set(frames).size, "el contador pasa por valores intermedios").toBeGreaterThan(2);
  expect(frames.at(-1)).toBe(expected);
  await expect(page.locator("[data-amount-delta]")).toHaveText("+80.000");
  // La fila nueva lleva la animación row-new (savingSubtle → transparente en 1,2 s), solo con motion activo.
  await expect(page.locator("a[data-new]:visible")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __rowAnimations: string[] }).__rowAnimations)).toContain("row-new");
  await context.close();
});
