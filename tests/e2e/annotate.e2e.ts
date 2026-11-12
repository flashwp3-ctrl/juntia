// T083 / FR-065; US-2; SC-009; ADR-011 §2, fila 14. Spec E2E 2 «Anotar gasto, cronometrado» (nace en el PR D).
// Criterio literal (tasks.md, T083): «con sesión y dataset sembrados, `N` → monto → categoría reciente → Guardar → el
// total de Inicio sube y la fila nueva queda resaltada, Toast; doble toque en Guardar → un solo movimiento, comprobado
// por la base (SC-009); el tiempo del recorrido se reporta como laboratorio; un test con motion activo para los momentos
// L2 de E5».
// Además, «Deshacer» de punta a punta (US-2.5): el total vuelve y el movimiento sale de la base activa. Solo Chromium y
// ninguna espera fija (ADR-011 §6); cada test siembra su propia cuenta, porque escribe movimientos.
import type { Locator, Page } from "@playwright/test";
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

/** El anillo de foco que pinta el marco del monto (estilo calculado de su padre). */
const ringOf = (sheet: Locator) => sheet.getByRole("textbox", { name: copy.annotate.amount }).evaluate((node) => getComputedStyle(node.parentElement!).outlineStyle);

async function annotate(page: Page, pesos: string) {
  await page.locator("body").focus();
  await page.keyboard.press("n");
  const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
  await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
  // WCAG 2.4.7: abierta con el teclado, el foco del monto se ve (anillo pintado en el marco, estilo calculado).
  expect(await ringOf(sheet)).toBe("solid");
  await page.keyboard.type(pesos);
  await sheet.getByRole("radiogroup", { name: copy.annotate.category }).getByRole("radio").first().click();
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

test("@serial motion activo: el total cuenta hacia arriba y la fila nueva se desvanece (momentos L2 de E5)", async ({ browser, baseURL }, testInfo) => {
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

// UX lote 1, cambio 3. Criterio literal (petición de los fundadores): «guardar → la fila aparece antes de la respuesta → se
// confirma». La petición de la Server Action se retiene en el navegador hasta que la prueba la suelta: mientras tanto el
// servidor ni la ve, y la fila ya está en la lista, marcada «Guardando…», sin aviso de guardado. Al soltarla, la fila en
// vuelo se va, llega la real (una sola) y la base tiene un movimiento más. Es un caso de la spec 2, no una spec nueva.
test("UX 3: Guardar → la fila aparece antes de la respuesta del servidor → se confirma, una sola vez", async ({ page }, testInfo) => {
  const user = await seedUser({ role: "fila-optimista", index: testInfo.parallelIndex });
  const seeded = (await seedMovements(user, "recent")).length;
  await signedInHome(page, user);
  const before = await heroPesos(page);
  const optimistic = formatMoney(moneyFromPesos(before + 47350n));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let held = 0;
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && "next-action" in route.request().headers()) { held += 1; await gate; }
    await route.continue();
  });

  const sheet = await annotate(page, "47350");
  await page.keyboard.press("Enter");
  // La hoja se oculta y la fila aparece sin que el servidor haya respondido (la petición sigue retenida).
  await expect(sheet).toBeHidden();
  const inFlight = page.locator("[data-pending='saving']:visible");
  await expect(inFlight).toHaveCount(1);
  await expect(inFlight).toContainText("$47.350");
  await expect(inFlight).toContainText(copy.row.pending.saving);
  expect(held).toBe(1);
  await expect(page.getByRole("status").filter({ hasText: copy.annotate.saved.expense })).toHaveCount(0);
  expect(await activeCount(user)).toBe(seeded);
  // F05 (auditoría de Impeccable): el total del héroe sube con la fila, sin esperar al servidor.
  await expect(page.locator("[data-counting-amount]:visible")).toHaveAttribute("data-counting-amount", optimistic);

  // Se suelta la respuesta: se confirma, la fila en vuelo desaparece y queda la real, una sola vez.
  release();
  await expect(page.getByRole("status").filter({ hasText: copy.annotate.saved.expense })).toBeVisible();
  await expect(page.locator("[data-pending]")).toHaveCount(0);
  // Con la real en la lista, el total del servidor la incluye: el mismo, nunca sumada dos veces.
  await expect(page.locator("[data-counting-amount]:visible")).toHaveAttribute("data-counting-amount", optimistic);
  await expect(page.locator("a[data-transaction-id]:visible").filter({ hasText: "$47.350" })).toHaveCount(1);
  expect(await activeCount(user)).toBe(seeded + 1);

  // Navegar a Actividad no deja ni duplicado ni fantasma.
  await page.getByRole("link", { name: copy.nav.activity }).first().click();
  await expect(page).toHaveURL(/\/actividad/);
  await expect(page.locator("[data-pending]")).toHaveCount(0);
  // En Actividad la fila real es un enlace con su nombre accesible completo (a 1280 px la tabla; debajo, la lista).
  await expect(page.locator("tbody tr:visible, [data-transaction-id]:visible").filter({ hasText: "47.350" })).toHaveCount(1);
});

// UX lote 1, cambio 5. El cursor computado en un navegador real, en 390 y 1440 px: mano en lo pulsable, not-allowed en lo
// deshabilitado. (La cobertura de selectores está en src/styles/cursor.test.tsx.)
for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`UX 5: cursor de mano en lo pulsable y not-allowed en lo deshabilitado (${viewport.width} px)`, async ({ page }, testInfo) => {
    const user = await seedUser({ role: `cursor-${viewport.width}`, index: testInfo.parallelIndex });
    await page.setViewportSize(viewport);
    await signedInHome(page, user);
    const cursorOf = (locator: ReturnType<Page["locator"]>) => locator.evaluate((element) => getComputedStyle(element).cursor);

    const trigger = page.locator("[data-annotate-trigger]:visible").first();
    expect(await cursorOf(trigger)).toBe("pointer");
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
    await expect(sheet).toBeVisible();
    expect(await cursorOf(sheet.getByRole("button", { name: copy.annotate.close }))).toBe("pointer");
    expect(await cursorOf(sheet.getByRole("radiogroup", { name: copy.annotate.category }).getByRole("radio").first())).toBe("pointer");
    expect(await cursorOf(sheet.getByLabel(copy.annotate.date))).toBe("pointer");
    expect(await cursorOf(sheet.getByRole("radio", { name: copy.annotate.income }))).toBe("pointer");
    // Guardar sin monto ni categoría está deshabilitado.
    expect(await cursorOf(sheet.getByRole("button", { name: /^Guardar/ }))).toBe("not-allowed");
    await sheet.getByRole("button", { name: copy.annotate.close }).click();
    await expect(sheet).toBeHidden();
    expect(await cursorOf(page.getByRole("link", { name: copy.nav.activity }).first())).toBe("pointer");
  });
}

// UX lote 1, cambio 2 (definitivo; comp 06, opción 1c «Rejilla fija de 3 × 3»). Las 9 categorías a la vista sin interactuar, en
// la misma casilla en 360, 390 y 1440 px, en los dos temas: 3 columnas × 3 filas, 208 px de alto, objetivos de al menos 44 px y
// ninguna superposición entre celdas ni con la descripción, la fecha o «Solo tú».
for (const scheme of ["light", "dark"] as const) {
  for (const width of [360, 390, 1440]) {
    test(`UX 2: rejilla de 3 × 3 fija, sin superposiciones (${width} px, ${scheme})`, async ({ browser, baseURL }, testInfo) => {
      const user = await seedUser({ role: `rejilla-${scheme}-${width}`, index: testInfo.parallelIndex });
      const context = await browser.newContext({ baseURL, colorScheme: scheme, viewport: { width, height: width < 700 ? 844 : 900 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      await signedInHome(page, user);
      await page.locator("[data-annotate-trigger]:visible").first().click();
      const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
      const group = sheet.getByRole("radiogroup", { name: copy.annotate.category });
      await expect(group).toBeVisible();
      const radios = group.getByRole("radio");
      await expect(radios).toHaveCount(9);
      const order = ["market", "restaurants", "home", "transport", "health", "entertainment", "shopping", "services", "other"] as const;
      await expect(radios).toHaveText(order.map((id) => copy.categories[id]));
      for (const radio of await radios.all()) await expect(radio).toBeVisible();
      const box = async (locator: ReturnType<Page["locator"]>) => (await locator.boundingBox())!;
      const cells = await Promise.all((await radios.all()).map(box));
      const grid = await box(group);
      expect(Math.abs(grid.height - 208), "la rejilla mide 208 px de alto").toBeLessThanOrEqual(1);
      cells.forEach((cell, index) => {
        expect(cell.height, `alto de la celda ${index}`).toBeGreaterThanOrEqual(44);
        expect(cell.width, `ancho de la celda ${index}`).toBeGreaterThanOrEqual(44);
        // Misma casilla: columna y fila salen del orden, no del contenido.
        expect(Math.abs(cell.x - cells[index % 3].x), `columna de la celda ${index}`).toBeLessThanOrEqual(1);
        expect(Math.abs(cell.y - cells[Math.floor(index / 3) * 3].y), `fila de la celda ${index}`).toBeLessThanOrEqual(1);
        expect(cell.x + cell.width).toBeLessThanOrEqual(width + 0.5);
      });
      const others = [group.locator("xpath=following::label[1]"), sheet.getByLabel(copy.annotate.date).locator("xpath=.."), sheet.getByText(copy.annotate.onlyYou)];
      const all = [...cells, ...(await Promise.all(others.map(box)))];
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const apart = all[i].x + all[i].width <= all[j].x + 0.5 || all[j].x + all[j].width <= all[i].x + 0.5 || all[i].y + all[i].height <= all[j].y + 0.5 || all[j].y + all[j].height <= all[i].y + 0.5;
        expect(apart, `el elemento ${i} se superpone al ${j}`).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "sin scroll horizontal").toBe(true);
      await context.close();
    });
  }
}

// Decisión de los fundadores del 12 nov 2026: el diálogo de escritorio se ancla arriba y la hoja móvil conserva su alto entre
// Gasto e Ingreso. Ingreso quita la rejilla y «Dinero del mes»; el segmentado que se acaba de pulsar no se mueve más de 1 px
// (ni al ir ni al volver), en 390, 768 y 1440 px. Se mide cuando termina la entrada (opacidad 1 y sin transform).
for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`Gasto ↔ Ingreso: el segmentado no se mueve (${viewport.width} px)`, async ({ browser, baseURL }, testInfo) => {
    const user = await seedUser({ role: `segmentado-${viewport.width}`, index: testInfo.parallelIndex });
    const context = await browser.newContext({ baseURL, viewport });
    const page = await context.newPage();
    await signedInHome(page, user);
    await page.locator("[data-annotate-trigger]:visible").first().click();
    const sheet = page.getByRole("dialog");
    const categories = sheet.getByRole("radiogroup", { name: copy.annotate.category });
    await expect(categories).toBeVisible();
    await page.waitForFunction(() => {
      const el = document.querySelector("[data-bottom-sheet], [data-modal]");
      return Boolean(el) && getComputedStyle(el!).opacity === "1" && getComputedStyle(el!).transform === "none";
    });
    const type = sheet.getByRole("radiogroup", { name: copy.annotate.type });
    // Dos fotogramas tras el cambio: la posición ya es la del nuevo diseño.
    const settledTop = async () => { await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))); return (await type.boundingBox())!.y; };
    const before = await settledTop();
    await sheet.getByRole("radio", { name: copy.annotate.income }).click();
    await expect(sheet.getByRole("radio", { name: copy.categories.market })).toHaveCount(0);
    const income = await settledTop();
    expect(Math.abs(income - before), `Gasto → Ingreso movió el segmentado ${income - before} px`).toBeLessThanOrEqual(1);
    await sheet.getByRole("radio", { name: copy.annotate.expense }).click();
    await expect(categories).toBeVisible();
    const back = await settledTop();
    expect(Math.abs(back - before), `Ingreso → Gasto movió el segmentado ${back - before} px`).toBeLessThanOrEqual(1);
    await context.close();
  });
}

// Teclado de la rejilla (grupo de radio) y los dos campos que ya no viven tras «Editar detalles»: la descripción se guarda y la
// fecha se cambia desde el chip.
test("UX 2: flechas en la rejilla, descripción guardada y fecha cambiada desde el chip", async ({ page }, testInfo) => {
  const user = await seedUser({ role: "rejilla-teclado", index: testInfo.parallelIndex });
  await signedInHome(page, user);
  await page.locator("[data-annotate-trigger]:visible").first().click();
  const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
  await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
  // 02·5: abierta con puntero, el monto no tiene marco: el foco de la apertura no pinta el anillo.
  expect(await ringOf(sheet)).toBe("none");
  await page.keyboard.type("23400");
  const radio = (id: keyof typeof copy.categories) => sheet.getByRole("radio", { name: copy.categories[id] });
  await radio("home").click();
  await page.keyboard.press("ArrowRight");
  await expect(radio("transport")).toBeChecked();
  await expect(radio("transport")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(radio("shopping")).toBeFocused();
  await page.keyboard.press("End");
  await expect(radio("other")).toBeChecked();
  await page.keyboard.press("Home");
  await expect(radio("market")).toBeChecked();
  await page.keyboard.press("ArrowLeft"); // da la vuelta
  await expect(radio("other")).toBeFocused();
  await page.keyboard.press("ArrowUp"); // Otra (8) − 3 = Entretenimiento (5)
  await expect(radio("entertainment")).toBeFocused();

  await sheet.getByRole("textbox", { name: copy.annotate.description }).fill("Pan y café");
  const yesterday = new Date(`${todayInBogota()}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const day = yesterday.toISOString().slice(0, 10);
  const date = sheet.getByLabel(copy.annotate.date);
  await date.fill(day);
  await expect(sheet.getByText(copy.dates.yesterday)).toBeVisible();
  await sheet.getByRole("button", { name: /^Guardar/ }).click();
  await expect(page.getByRole("status").filter({ hasText: copy.annotate.saved.expense })).toBeVisible();
  const rows = await listTransactions(user.client, day.slice(0, 7));
  const saved = rows.find((row) => row.transactionDate === day);
  expect(saved?.description).toBe("Pan y café");
  expect(saved?.categoryId).toBe("entertainment");
});

// Revisión del gestor del PR #51 contra la comp 1c. (1) La hoja móvil abre ajustada al contenido, no a la altura máxima: en 390
// px el borde inferior de Guardar queda a ≤ 20 px (más el safe area, 0 aquí) del borde inferior de la hoja, y la hoja no ocupa
// toda la altura. (2) «Guardar sube con el teclado»: con la altura emulada de 544 px, Guardar está visible y se puede pulsar
// sin desplazar el contenido.
test("UX 2: la hoja de 390 px abre ajustada al contenido, con Guardar a ≤ 20 px de su borde inferior", async ({ page }, testInfo) => {
  const user = await seedUser({ role: "hoja-ajustada", index: testInfo.parallelIndex });
  await page.setViewportSize({ width: 390, height: 844 });
  await signedInHome(page, user);
  await page.locator("[data-annotate-trigger]:visible").first().click();
  const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
  await expect(sheet.getByRole("radiogroup", { name: copy.annotate.category })).toBeVisible();
  await page.waitForFunction(() => { const el = document.querySelector("[data-bottom-sheet]"); return Boolean(el) && getComputedStyle(el!).opacity === "1" && getComputedStyle(el!).transform === "none"; });
  const panel = page.locator("[data-bottom-sheet] > div");
  const box = (await panel.boundingBox())!;
  const save = (await sheet.getByRole("button", { name: /^Guardar/ }).boundingBox())!;
  expect(box.height, "la hoja no ocupa toda la altura (viewport − 96)").toBeLessThan(844 - 96 - 20);
  expect(box.y, "queda el saludo a la vista").toBeGreaterThan(96);
  const gap = box.y + box.height - (save.y + save.height);
  expect(gap, "Guardar a ≤ 20 px del borde inferior de la hoja (safe area 0)").toBeLessThanOrEqual(20.5);
  expect(gap).toBeGreaterThanOrEqual(0);
});

test("UX 2: con el teclado abierto (544 px de alto emulado), Guardar es visible y se pulsa sin desplazar", async ({ page }, testInfo) => {
  const user = await seedUser({ role: "guardar-teclado", index: testInfo.parallelIndex });
  await page.setViewportSize({ width: 390, height: 544 });
  await signedInHome(page, user);
  await page.locator("[data-annotate-trigger]:visible").first().click();
  const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
  await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
  await page.keyboard.type("18900");
  await sheet.getByRole("radio", { name: copy.categories.market }).click();
  const save = sheet.getByRole("button", { name: /^Guardar/ });
  await expect(save).toBeInViewport({ ratio: 1 });
  const scrollTop = await save.evaluate((el) => { let node = el.parentElement; while (node && getComputedStyle(node).overflowY !== "auto") node = node.parentElement; return node ? node.scrollTop : -1; });
  expect(scrollTop, "el contenido no se desplazó para llegar a Guardar").toBe(0);
  await save.click();
  await expect(page.getByRole("status").filter({ hasText: copy.annotate.saved.expense })).toBeVisible();
});

// Resultado desconocido (decisión de los fundadores, 7 nov 2026): la fila desaparece y la hoja vuelve BLOQUEADA con lo escrito, con
// la misma clave para «Reintentar», como la E4 desconocida de la 002. Aquí la petición llega al servidor (que escribe) y el
// navegador no ve la respuesta; «Reintentar» reenvía lo mismo con la misma clave y el servidor devuelve el resultado original:
// una sola transacción en la base y una sola fila en Actividad. Nada se guarda en el navegador.
test("desconocido: respuesta perdida tras el commit → fila fuera, hoja bloqueada, Reintentar con la misma clave y una sola transacción", async ({ page }, testInfo) => {
  const user = await seedUser({ role: "respuesta-perdida", index: testInfo.parallelIndex });
  const seeded = (await seedMovements(user, "recent")).length;
  await signedInHome(page, user);
  const bodies: string[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && "next-action" in request.headers()) {
      bodies.push(request.postData() ?? "");
      if (bodies.length === 1) {
        await route.fetch(); // la petición llega y el servidor escribe…
        await route.abort("failed"); // …pero el navegador no ve la respuesta
        return;
      }
    }
    await route.continue();
  });

  const sheet = await annotate(page, "61250");
  await page.keyboard.press("Enter");
  // La hoja vuelve bloqueada con lo escrito; no hay fila «Sin confirmar» ni aviso de guardado.
  await expect(sheet.getByRole("alert")).toBeVisible();
  await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeDisabled();
  await expect(page.locator("[data-pending]")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: copy.annotate.saved.expense })).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.includes("unconfirmed")))).toEqual([]);
  expect(await activeCount(user), "el servidor sí guardó aunque el navegador no lo sepa").toBe(seeded + 1);

  // Reintentar: misma intención y misma clave (mismo cuerpo); el servidor devuelve el original, sin crear otra.
  await sheet.getByRole("alert").getByRole("button", { name: copy.annotate.retry }).click();
  await expect(page.getByRole("status").filter({ hasText: copy.annotate.saved.expense })).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[1], "el reintento lleva la misma intención y la misma clave").toBe(bodies[0]);
  expect(await activeCount(user), "una sola transacción más en la base").toBe(seeded + 1);
  await expect(page.locator("[data-pending]")).toHaveCount(0);

  await page.getByRole("link", { name: copy.nav.activity }).first().click();
  await expect(page).toHaveURL(/actividad/);
  await expect(page.locator("tbody tr:visible, [data-transaction-id]:visible").filter({ hasText: "61.250" })).toHaveCount(1);
});
