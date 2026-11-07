// T044a / T051 (spec 003, PR C) / FR-037–FR-041, FR-067 (spec 3); US-2, US-3, US-8; ADR-011 §2 y §3 (matriz). Spec E2E 3
// «Pareja 50/50 y liquidación»: nace en el PR C con el gasto compartido, «Cambiar Yo/Nosotros» y «Mover a Pareja»; el PR D
// la amplía con Balance y liquidaciones (precisión F47-1).
// Criterio literal (tasks.md, T044a): «gasto compartido 50/50 con el total de Nosotros; «Cambiar Yo/Nosotros» con el HTML,
// el RSC y el prefetch sin datos privados con la cookie válida, ausente y no válida; «Mover a Pareja»».
// Cada test siembra su propia pareja (escribe gastos) por la base y las funciones reales (FR-066). Solo Chromium, ninguna
// espera fija, movimiento reducido (ADR-011 §6).
import { randomUUID } from "node:crypto";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { listSharedExpenses } from "../../src/lib/db/shared-expenses";
import { createTransaction, listTransactions } from "../../src/lib/db/transactions";
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
  await expect(sara.page.getByText(copy.couple.home.empty.title)).toBeVisible();

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
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  const [privateRows, sharedRows] = await Promise.all([seedMovements(pair.sara, "current"), seedSharedMovements(pair, "recent")]);
  const privateId = privateRows[0].id;
  const sharedId = sharedRows[0].id;
  const routes = ["/", `/actividad?mes=${month()}`, `/actividad/${sharedId}?mes=${month()}`, `/actividad/${privateId}?mes=${month()}`];

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

  // Prefetch: en Yo, con los enlaces de Inicio precargados, se cambia a Nosotros y se navega a Actividad.
  const { context, page } = await open(browser, baseURL!, pair.sara, "me", "me", 1440);
  const prefetched: string[] = [];
  page.on("response", async (response) => {
    if (response.url().includes("_rsc=") && response.request().method() === "GET") prefetched.push(await response.text().catch(() => ""));
  });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^Regalo de cumpleaños, / })).toBeVisible();
  await page.getByRole("link", { name: copy.home.seeAll }).hover();
  await page.locator("[data-context-selector]:visible").getByRole("radio", { name: copy.context.us }).click();
  await expect(page.getByRole("heading", { name: /gastaron juntos/ })).toBeVisible();
  const afterSwitch = prefetched.length;
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.activity }).click();
  await expect(page).toHaveURL(/\/actividad/);
  await expect(page.getByText("Carulla Laureles", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  expect(leaks(await page.locator("main").innerText())).toEqual([]);
  for (const body of prefetched.slice(afterSwitch)) expect(leaks(body), "RSC pedido en Nosotros").toEqual([]);
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
  await expect(page.getByText(new RegExp(copy.move.movedFromMe)).first()).toBeVisible();

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
