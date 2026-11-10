// T044a / T051 (spec 003, PR C) / FR-037–FR-041, FR-067 (spec 3); US-2, US-3, US-8; ADR-011 §2 y §3 (matriz). Spec E2E 3
// «Pareja 50/50 y liquidación»: nace en el PR C con el gasto compartido, «Cambiar Yo/Nosotros» y «Mover a Pareja»; el PR D
// la amplía con Balance y liquidaciones (precisión F47-1).
// Criterio literal (tasks.md, T044a): «gasto compartido 50/50 con el total de Nosotros; «Cambiar Yo/Nosotros» con el HTML,
// el RSC y el prefetch sin datos privados con la cookie válida, ausente y no válida; «Mover a Pareja»».
// Cada test siembra su propia pareja (escribe gastos) por la base y las funciones reales (FR-066). Solo Chromium, ninguna
// espera fija, movimiento reducido (ADR-011 §6).
import { randomUUID } from "node:crypto";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { formatMoney, moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { getCoupleBalance, getCoupleMonthSummary } from "../../src/lib/db/couple-reads";
import { listSettlements } from "../../src/lib/db/settlements";
import { listSharedExpenses } from "../../src/lib/db/shared-expenses";
import { createTransaction, listTransactions } from "../../src/lib/db/transactions";
import { captureRsc } from "../support/rsc-capture";
import { seedCouple, seedMovements, seedSharedMovements, type SeededUser } from "../support/seed";
import { expect, test } from "./fixtures";

const anonymous = { cookies: [], origins: [] };
test.use({ storageState: anonymous });

const month = () => todayInBogota().slice(0, 7);
// Marcadores de los privados de Sara (dataset de P0-1, sus descripciones e importes en pesos y en unidades menores). No
// coinciden con ningún importe ni descripción de los compartidos del dataset de P0-2.
const PRIVATE = ["Taxi a la oficina", "Reembolso EPS", "Regalo de cumpleaños", "Almuerzo con el equipo", "412.900", "41290000", "45.000", "4500000", "59.700", "5970000"];
const leaks = (text: string) => PRIVATE.filter((marker) => text.includes(marker));

async function open(browser: Browser, baseURL: string, user: SeededUser, context: "me" | "us" | null, cookie: string | null = context, width = 390): Promise<{ context: BrowserContext; page: Page }> {
  const browserContext = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width, height: 900 } });
  await browserContext.addCookies(user.cookies);
  if (cookie !== null) await browserContext.addCookies([{ name: "juntia_context", value: cookie, domain: new URL(baseURL).hostname, path: "/" }]);
  if (context) await browserContext.addInitScript((value) => window.localStorage.setItem("juntia:context", value), context);
  return { context: browserContext, page: await browserContext.newPage() };
}
const hero = (page: Page) => page.locator("[data-counting-amount]:visible");

test("gasto compartido 50/50: Sara lo anota en 2 toques y el total de Nosotros sube para los dos", async ({ browser, baseURL }, testInfo) => {
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  const sara = await open(browser, baseURL!, pair.sara, "us");
  await sara.page.goto("/");
  await expect(sara.page.getByText(copy.couple.home.empty.title).filter({ visible: true })).toBeVisible();

  await sara.page.locator("body").focus();
  await sara.page.keyboard.press("n");
  const sheet = sara.page.getByRole("dialog", { name: copy.annotate.title.expense });
  await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
  await expect(sheet.getByRole("button", { name: new RegExp(`^${copy.shared.summary.open}`) })).toContainText(copy.shared.summary.paid("Sara", copy.shared.mode.equal));
  await sara.page.keyboard.type("186400");
  await sheet.getByRole("radio", { name: copy.categories.market }).click();
  await sara.page.keyboard.press("Enter");
  await expect(sheet).toBeHidden();
  await expect(sara.page.getByRole("status").filter({ hasText: copy.annotate.saved.expense })).toBeVisible();
  await expect(hero(sara.page)).toHaveAttribute("data-counting-amount", "$186.400");
  await expect(sara.page.locator("[data-balance-line]:visible")).toContainText([copy.couple.home.owes("Tomás", "Sara"), "$93.200"].join(""));

  // La base: un solo gasto, pagó Sara, 93.200 cada uno; lo ve Tomás con su propia sesión.
  const rows = await listSharedExpenses(pair.tomas.client, month());
  expect(rows).toHaveLength(1);
  expect(rows[0].payerUserId).toBe(pair.sara.id);
  expect(Object.fromEntries(rows[0].allocations.map((a) => [a.userId, a.amount.amountMinor]))).toEqual({ [pair.sara.id]: 9320000n, [pair.tomas.id]: 9320000n });

  const tomas = await open(browser, baseURL!, pair.tomas, "us");
  await tomas.page.goto("/");
  await expect(hero(tomas.page)).toHaveAttribute("data-counting-amount", "$186.400");
  await expect(tomas.page.locator("[data-balance-line]:visible")).toContainText([copy.couple.home.owes("Tomás", "Sara"), "$93.200"].join(""));
  await Promise.all([sara.context.close(), tomas.context.close()]);
});

test("Cambiar Yo/Nosotros: ni el HTML, ni el RSC, ni el prefetch de Nosotros llevan privados, con la cookie válida, ausente o no válida", async ({ browser, baseURL }, testInfo) => {
  // ~30 peticiones de HTML y RSC con tres cookies y dos cuentas, más el prefetch: más que el límite por defecto de 30 s.
  test.slow();
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  const [privateRows, sharedRows] = await Promise.all([seedMovements(pair.sara, "current"), seedSharedMovements(pair, "recent")]);
  const privateId = privateRows[0].id;
  const sharedId = sharedRows[0].id;
  // PR D (FR-041; [V] «Privacidad por ámbito», se repite en el PR D): Balance tampoco lleva privados.
  const routes = ["/", `/actividad?mes=${month()}`, `/actividad/${sharedId}?mes=${month()}`, `/actividad/${privateId}?mes=${month()}`, "/balance", `/balance?mes=${month()}`];

  for (const cookie of ["us", null, "nosotros"]) {
    const { context, page } = await open(browser, baseURL!, pair.sara, "us", cookie);
    for (const path of routes) {
      for (const rsc of [false, true]) {
        const url = rsc ? `${path}${path.includes("?") ? "&" : "?"}_rsc=spec3` : path;
        const response = await page.request.get(url, { headers: rsc ? { RSC: "1" } : {} });
        expect(response.status(), url).toBe(200);
        expect(leaks(await response.text()), `${cookie ?? "sin cookie"} ${url} ${rsc ? "RSC" : "HTML"}`).toEqual([]);
      }
    }
    // Control positivo: con la cookie en Nosotros y la pareja activa, el servidor sí trae lo compartido.
    if (cookie === "us") expect(await (await page.request.get("/")).text()).toContain("Carulla Laureles");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: copy.couple.home.spentIn(copy.dates.months[Number(month().slice(5)) - 1]) })).toBeVisible();
    expect(leaks(await page.locator("main").innerText())).toEqual([]);
    await context.close();
  }

  // Tomás nunca recibe los privados de Sara, en ningún contexto.
  for (const cookie of ["us", "me"]) {
    const { context, page } = await open(browser, baseURL!, pair.tomas, cookie as "me" | "us");
    for (const path of routes) expect(leaks(await (await page.request.get(path)).text()), `Tomás ${cookie} ${path}`).toEqual([]);
    await context.close();
  }

  // Prefetch: en Yo, con los enlaces de Inicio precargados, se cambia a Nosotros y se navega a Actividad. Revisión del gestor
  // del PR #68 (mismo arreglo que F67-2 del PR B): los RSC se capturan al empezar, con su ruta y su contexto, y su cuerpo se
  // lee por `route.fetch()` (tests/support/rsc-capture.ts); antes `response.text()` devolvía "" y no se inspeccionaba nada.
  const { context, page } = await open(browser, baseURL!, pair.sara, "me", "me", 1440);
  const rsc = await captureRsc(page);
  // En Yo se llega a Actividad desde Inicio, en el cliente: su RSC lleva los privados de Sara (control de la captura).
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^Regalo de cumpleaños, / })).toBeVisible();
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.activity }).click();
  await expect(page).toHaveURL(/\/actividad/);
  await expect(page.getByText("Regalo de cumpleaños", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  const inMe = await rsc.read((item) => item.path === "/actividad" && !item.underUs);
  expect(inMe.some(({ body }) => body.includes("Regalo de cumpleaños")), "el RSC de Actividad en Yo trae los privados").toBe(true);
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.home }).click();
  await expect(page.getByRole("link", { name: /^Regalo de cumpleaños, / })).toBeVisible();
  await page.getByRole("link", { name: copy.home.seeAll }).hover();
  await page.locator("[data-context-selector]:visible").getByRole("radio", { name: copy.context.us }).click();
  await expect(page.getByRole("heading", { name: /gastaron juntos/ })).toBeVisible();
  // El cambio Yo → Nosotros pide / otra vez (`router.refresh()`) con la cookie nueva: esa respuesta es de Nosotros, se
  // inspecciona y trae un gasto compartido sembrado (control positivo del cambio, F67-4).
  const atSwitch = await rsc.read((item) => item.underUs);
  for (const { path, body } of atSwitch) expect(leaks(body), `RSC de ${path} del cambio a Nosotros`).toEqual([]);
  expect(atSwitch.some(({ path, body }) => path === "/" && body.includes("Carulla Laureles")), `RSC del cambio: ${atSwitch.map((item) => item.path).join(", ")}`).toBe(true);
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.activity }).click();
  await expect(page).toHaveURL(/\/actividad/);
  await expect(page.getByText("Carulla Laureles", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  expect(leaks(await page.locator("main").innerText())).toEqual([]);
  const inUs = await rsc.read((item) => item.underUs);
  for (const { path, body } of inUs) expect(leaks(body), `RSC de ${path} pedido en Nosotros`).toEqual([]);
  // La prueba tiene que poder fallar: al menos un RSC de /actividad iniciado en Nosotros, con el gasto compartido sembrado.
  const activity = inUs.filter((item) => item.path === "/actividad");
  expect(activity.length, `RSC iniciados en Nosotros: ${inUs.map((item) => item.path).join(", ")}`).toBeGreaterThan(0);
  expect(activity.some(({ body }) => body.includes("Carulla Laureles"))).toBe(true);
  await context.close();
});

// T060a / T065 (spec 003, PR D) / FR-025–FR-029, FR-047, FR-067 (spec 3 crece); US-5, US-6; SC-003 (E2E).
// Criterio literal (tasks.md, T060a): «ver el saldo en Balance, registrar la liquidación parcial de 200.000 y comprobar
// 229.900 con el gasto en 2.840.000». Es el paso `beforeSettlement` → `afterSettlement` del dataset dorado, con la fecha
// que fija la spec (25 de octubre). Los dos leen lo mismo: Tomás ve el saldo nuevo con su propia sesión.
test("Balance y liquidación parcial: Tomás le debe a Sara 429.900; tras 200.000, 229.900 y el gasto sigue en 2.840.000", async ({ browser, baseURL }, testInfo) => {
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  await seedSharedMovements(pair, "golden");
  const sara = await open(browser, baseURL!, pair.sara, "us");
  await sara.page.goto("/balance");
  const balance = sara.page.locator("[data-shared-balance]:visible");
  await expect(balance.getByRole("heading", { name: copy.balance.owes("Tomás", "Sara") })).toBeVisible();
  await expect(balance.locator("[data-balance-amount]")).toHaveAttribute("data-balance-amount", "$429.900");
  await expect(balance.getByText(copy.balance.paidLine("1.929.900", "1.500.000"))).toBeVisible();
  await expect(balance.getByText(copy.balance.paidLine("910.100", "1.340.000"))).toBeVisible();
  await expect(balance.getByRole("img", { name: "Tomás pagó 910.100; le corresponden 1.340.000; debe 429.900" })).toBeVisible();

  await sara.page.getByRole("button", { name: copy.balance.actions.settle }).click();
  const sheet = sara.page.getByRole("dialog", { name: copy.balance.settle.title });
  await expect(sheet.getByText(copy.balance.settle.direction("Tomás", "Sara"))).toBeVisible();
  await sheet.getByRole("radio", { name: copy.balance.settle.other }).click();
  await sheet.getByRole("textbox", { name: copy.balance.settle.otherAmount }).fill("200000");
  await sheet.getByLabel(copy.balance.settle.date).fill("2026-10-25");
  await sheet.getByRole("button", { name: copy.balance.settle.submit("$200.000") }).click();
  await expect(sheet).toBeHidden();
  await expect(sara.page.getByRole("status").filter({ hasText: copy.balance.settle.done })).toBeVisible();
  await expect(balance.locator("[data-balance-amount]")).toHaveAttribute("data-balance-amount", "$229.900");

  // La base, con la sesión de Tomás: saldo 229.900 en una sola lectura (`couple_balance`), el gasto de octubre intacto.
  const rows = await getCoupleBalance(pair.tomas.client);
  expect(Object.fromEntries(rows.map((row) => [row.userId, row.net.amountMinor]))).toEqual({ [pair.sara.id]: 22990000n, [pair.tomas.id]: -22990000n });
  expect((await getCoupleMonthSummary(pair.tomas.client, "2026-10"))?.total.amountMinor).toBe(284000000n);
  const [settlement] = await listSettlements(pair.tomas.client, "2026-10");
  expect(settlement).toMatchObject({ fromUserId: pair.tomas.id, toUserId: pair.sara.id, settlementDate: "2026-10-25", status: "active" });
  expect(settlement.amount.amountMinor).toBe(20000000n);

  // Actividad de octubre: la liquidación aparte, «Liquidado · no es un gasto», y el gasto del mes sigue en 2.840.000.
  await sara.page.goto("/actividad?mes=2026-10");
  await expect(sara.page.getByRole("link", { name: new RegExp(`^${copy.shared.row.settlementTitle("Tomás", "Sara")}`) }).filter({ visible: true }).first()).toContainText(copy.shared.row.settlement);
  await expect(sara.page.getByText("$2.840.000").filter({ visible: true }).first()).toBeVisible();

  const tomas = await open(browser, baseURL!, pair.tomas, "us");
  await tomas.page.goto("/balance");
  await expect(tomas.page.locator("[data-shared-balance]:visible [data-balance-amount]")).toHaveAttribute("data-balance-amount", "$229.900");
  await Promise.all([sara.context.close(), tomas.context.close()]);
});

// T060a / T065 (spec 003, PR D) / FR-051, FR-052; `docs/TESTING.md` §5, regla 3: **un** test con motion activo para los dos
// momentos L2 (MOTION_SYSTEM, «Contención»): E5 al guardar un gasto compartido (el total cuenta hacia arriba) y S4 al
// liquidar (el saldo cuenta hasta «Al día», el badge pasa a LIQUIDADO). Los dos solo con la confirmación del servidor.
test("@serial motion activo: E5 al anotar en Nosotros y S4 al liquidar el total (los dos momentos L2)", async ({ browser, baseURL }, testInfo) => {
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  await seedSharedMovements(pair, "recent");
  const context = await browser.newContext({ baseURL, reducedMotion: "no-preference", viewport: { width: 390, height: 844 } });
  await context.addCookies([...pair.sara.cookies, { name: "juntia_context", value: "us", domain: new URL(baseURL!).hostname, path: "/" }]);
  await context.addInitScript(() => window.localStorage.setItem("juntia:context", "us"));
  const page = await context.newPage();
  await page.goto("/");
  await expect(hero(page)).toHaveAttribute("data-counting-amount", "$2.840.000");
  // E5: cada texto que pinta el contador entre el guardado y el valor final, sin esperas fijas.
  await page.evaluate(() => {
    const target = [...document.querySelectorAll<HTMLElement>("[data-counting-amount]")].find((node) => node.getClientRects().length > 0)!;
    const seen: string[] = [];
    Object.assign(window, { __e5: seen });
    new MutationObserver(() => seen.push(target.textContent ?? "")).observe(target, { childList: true, characterData: true, subtree: true });
  });
  await page.locator("body").focus();
  await page.keyboard.press("n");
  const annotate = page.getByRole("dialog", { name: copy.annotate.title.expense });
  await expect(annotate.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
  await page.keyboard.type("100000");
  await annotate.getByRole("radio", { name: copy.categories.market }).click();
  await page.keyboard.press("Enter");
  await expect(annotate).toBeHidden();
  await expect(hero(page)).toHaveText("$2.940.000");
  const e5 = await page.evaluate(() => (window as unknown as { __e5: string[] }).__e5);
  console.log(`spec 3 · motion E5: ${e5.length} cuadros del contador hasta $2.940.000`);
  expect(new Set(e5).size, "E5: el total pasa por valores intermedios").toBeGreaterThan(2);

  // S4: liquidar el total. Antes de confirmar el servidor, nada se mueve; después, el saldo cuenta hasta «Al día».
  await page.goto("/balance");
  const balance = page.locator("[data-shared-balance]:visible");
  // El pagador del gasto nuevo es el que Sara usó la última vez (Q5); el saldo pendiente se lee de la base (FR-043).
  const pending = (await getCoupleBalance(pair.sara.client)).find((row) => row.userId === pair.sara.id)!.net;
  expect(pending.amountMinor > 0n).toBe(true);
  const owed = formatMoney(pending);
  await expect(balance.locator("[data-balance-amount]")).toHaveAttribute("data-balance-amount", owed);
  await page.evaluate(() => {
    const target = [...document.querySelectorAll<HTMLElement>("[data-shared-balance]")].find((node) => node.getClientRects().length > 0)!;
    const seen: string[] = [];
    Object.assign(window, { __s4: seen });
    new MutationObserver(() => seen.push(`${target.getAttribute("data-s4") ?? ""}|${target.querySelector("[data-balance-counter]")?.textContent ?? ""}`)).observe(target, { childList: true, characterData: true, subtree: true, attributes: true });
  });
  await page.getByRole("button", { name: copy.balance.actions.settle }).click();
  const sheet = page.getByRole("dialog", { name: copy.balance.settle.title });
  await sheet.getByRole("button", { name: copy.balance.settle.submit(owed) }).click();
  await expect(balance.getByText(copy.balance.settledBadge)).toBeVisible();
  await expect(balance.getByRole("heading", { name: copy.balance.settled })).toBeVisible();
  // T023/T026: LIQUIDADO y el heading cambian al confirmar, antes de acabar S4.
  // Espera el inicio registrado y el final real; no lee una muestra parcial del observer.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __s4: string[] }).__s4.some((frame) => frame.startsWith("animating")))).toBe(true);
  await expect(balance).not.toHaveAttribute("data-s4", "animating");
  const s4 = await page.evaluate(() => (window as unknown as { __s4: string[] }).__s4);
  console.log(`spec 3 · motion S4: ${s4.length} cambios; animando: ${s4.filter((frame) => frame.startsWith("animating")).length}`);
  expect(s4.some((frame) => frame.startsWith("animating")), "S4 anima con la confirmación").toBe(true);
  expect(new Set(s4.map((frame) => frame.split("|")[1])).size, "S4: el saldo pasa por valores intermedios").toBeGreaterThan(2);
  await expect(page.locator('[aria-live="polite"][data-settle-announce]:visible, [aria-live="polite"][data-settle-announce]').first()).toHaveText(copy.balance.settle.announceSettled("Tomás", "Sara"));
  await context.close();
});

test("Mover a Pareja: Farmacia Pasteur pasa a Nosotros en una operación, con «movido desde Yo», y Tomás lo ve sin el privado", async ({ browser, baseURL }, testInfo) => {
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  const today = todayInBogota();
  const pharmacy = await createTransaction(pair.sara.client, { idempotencyKey: randomUUID(), type: "expense", amount: moneyFromPesos(64000n), categoryId: "health", transactionDate: today, description: "Farmacia Pasteur" });
  const { context, page } = await open(browser, baseURL!, pair.sara, "me");
  await page.goto(`/actividad/${pharmacy.id}?mes=${month()}`);
  // .filter({ visible }): React deja una copia oculta (#S:n, hidden) del segmento en streaming hasta hidratar.
  await expect(page.getByText(copy.move.explain("Tomás")).filter({ visible: true })).toBeVisible();
  await page.getByRole("button", { name: copy.move.action }).click();
  const dialog = page.getByRole("dialog", { name: copy.move.action });
  await expect(dialog.getByText("$64.000")).toBeVisible();
  await dialog.getByRole("button", { name: copy.move.review }).click();
  await expect(dialog.getByText(copy.move.preview.visibility("Tomás", "Farmacia Pasteur"))).toBeVisible();
  await dialog.getByRole("button", { name: copy.move.confirm }).click();
  await expect(page.getByRole("status").filter({ hasText: copy.move.donePrefix })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/actividad\\?mes=${month()}`));
  await expect(page.getByText(new RegExp(copy.move.movedFromMe)).filter({ visible: true }).first()).toBeVisible();

  // La base: un solo gasto activo, ahora compartido; el privado sale de Yo.
  expect((await listTransactions(pair.sara.client, month())).map((row) => row.id)).not.toContain(pharmacy.id);
  const mine = await listSharedExpenses(pair.sara.client, month());
  expect(mine).toHaveLength(1);
  expect(mine[0]).toMatchObject({ description: "Farmacia Pasteur", movedFromMe: true, payerUserId: pair.sara.id });
  const theirs = await listSharedExpenses(pair.tomas.client, month());
  expect(theirs).toHaveLength(1);
  expect(theirs[0].movedFromMe).toBe(false);
  await context.close();
});
