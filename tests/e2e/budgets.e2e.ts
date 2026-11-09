// 004 PR B · T030 [US2] — Spec E2E 5 «Presupuesto activado/desactivado» (nace en el PR B; el PR E la amplía con Análisis).
// Criterio literal (tasks.md, T030): «crear Restaurantes en Nosotros, editar con conflicto entre Sara y Tomás (dos
// `storageState`), desactivar y volver a «sin presupuesto»; HTML, RSC y prefetch de Plan en Nosotros sin presupuestos
// personales de ninguno». Cumple: FR-114 (spec 5); FR-085; US-2.
// Qué rompería sin que ninguna capa inferior se entere (docs/TESTING.md §4; contracts/ci.md, mitigación b): la hoja real con
// la Server Action y la clave nacida al abrir, el conflicto de versión pintado en la sesión del otro tras releer, la vuelta
// a «sin presupuesto» en la pantalla y lo que el servidor manda en Nosotros. Las validaciones del límite, la vigencia por mes
// y las carreras viven en dominio, pgTAP e integración. Cada test siembra su pareja por la base y las funciones reales
// (regla dura 1); ningún caso se prepara por la interfaz. Solo Chromium, ninguna espera fija, movimiento reducido.
// Los textos se buscan dentro de `main`: con `loading.tsx`, Next deja un instante fuera de `main` la copia oculta del HTML que
// transmite, y `getByText` también encuentra nodos ocultos (falló así en el `e2e:dev` completo).
import { randomUUID } from "node:crypto";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { budgetHistory, budgetMonths, createBudget } from "../../src/lib/db/budgets";
import { shortDate } from "../../src/lib/format";
import { seedCouple, seedSharedMovements, type SeededUser } from "../support/seed";
import { expect, test } from "./fixtures";

const anonymous = { cookies: [], origins: [] };
test.use({ storageState: anonymous });

const today = () => todayInBogota();
const month = () => `${today().slice(0, 7)}-01`;

async function open(browser: Browser, baseURL: string, user: SeededUser, context: "me" | "us", cookie: string | null = context, width = 390): Promise<{ context: BrowserContext; page: Page }> {
  const browserContext = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width, height: 900 } });
  await browserContext.addCookies(user.cookies);
  if (cookie !== null) await browserContext.addCookies([{ name: "juntia_context", value: cookie, domain: new URL(baseURL).hostname, path: "/" }]);
  await browserContext.addInitScript((value) => window.localStorage.setItem("juntia:context", value), context);
  return { context: browserContext, page: await browserContext.newPage() };
}
const restaurants = copy.categories.restaurants;

test("spec 5 · presupuesto activado y desactivado: Sara crea Restaurantes en Nosotros, Tomás choca con su cambio, lo revisa, y al desactivarlo vuelve a «sin presupuesto»", async ({ browser, baseURL }, testInfo) => {
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  // Los seis gastos compartidos del dataset en el mes en curso: Restaurantes lleva 240.000 y no tiene presupuesto.
  await seedSharedMovements(pair, "recent");
  const sara = await open(browser, baseURL!, pair.sara, "us");
  await sara.page.goto("/plan");
  await expect(sara.page.getByRole("main").getByText(copy.plan.noBudget("$240.000"))).toBeVisible();

  // Crear (US-2.1): activo desde el mes en curso, visible para los dos sin aprobación, con autor y fecha.
  await sara.page.getByRole("button", { name: copy.plan.createFor(restaurants) }).click();
  const create = sara.page.getByRole("dialog", { name: copy.plan.sheet.createTitle });
  await expect(create.getByText(copy.plan.sheet.context.us)).toBeVisible();
  await create.getByRole("textbox", { name: copy.plan.sheet.limit }).fill("260000");
  await create.getByRole("button", { name: copy.plan.sheet.save }).click();
  await expect(create).toBeHidden();
  await expect(sara.page.getByRole("main").getByText(copy.plan.saved.created)).toBeAttached();
  await expect(sara.page.getByRole("main").getByText(copy.plan.leftPercent("20.000", 92))).toBeVisible();
  await expect(sara.page.getByRole("main").getByText(copy.plan.lastChange(copy.plan.change.create("Sara", restaurants, "$260.000"), shortDate(today())), { exact: false })).toBeVisible();
  const [created] = (await budgetMonths(pair.tomas.client, "us", month())).filter((row) => row.category_id === "restaurants");
  expect(created).toMatchObject({ limit_minor: "26000000", consumed_minor: "24000000", state: "near", version: 1 });

  // Conflicto (US-2.7; §15.6.3 punto 7): Tomás abre Restaurantes con la versión 1; Sara lo sube a 300.000 antes que él.
  const tomas = await open(browser, baseURL!, pair.tomas, "us");
  await tomas.page.goto("/plan");
  await tomas.page.getByRole("button", { name: copy.plan.edit(restaurants) }).click();
  const tomasSheet = tomas.page.getByRole("dialog", { name: copy.plan.sheet.editTitle });
  await expect(tomasSheet.getByRole("textbox", { name: copy.plan.sheet.limit })).toHaveValue("260.000");

  await sara.page.getByRole("button", { name: copy.plan.edit(restaurants) }).click();
  const saraSheet = sara.page.getByRole("dialog", { name: copy.plan.sheet.editTitle });
  await saraSheet.getByRole("textbox", { name: copy.plan.sheet.limit }).fill("300000");
  await saraSheet.getByRole("button", { name: copy.plan.sheet.saveChanges }).click();
  await expect(saraSheet).toBeHidden();
  await expect(sara.page.getByRole("main").getByText(copy.plan.left("60.000"))).toBeVisible();

  // Tomás guarda con la versión vieja: no se sobrescribe; ve quién lo cambió y el valor vigente, y revisa.
  await tomasSheet.getByRole("textbox", { name: copy.plan.sheet.limit }).fill("280000");
  await tomasSheet.getByRole("button", { name: copy.plan.sheet.saveChanges }).click();
  await expect(tomasSheet.getByText(copy.plan.errors.versionConflict("Sara"))).toBeVisible();
  await expect(tomasSheet.getByText(copy.plan.sheet.current("$300.000"))).toBeVisible();
  expect((await budgetMonths(pair.tomas.client, "us", month())).find((row) => row.category_id === "restaurants")?.limit_minor).toBe("30000000");
  await tomasSheet.getByRole("button", { name: copy.plan.sheet.review }).click();
  await expect(tomasSheet.getByRole("textbox", { name: copy.plan.sheet.limit })).toHaveValue("300.000");
  await tomasSheet.getByRole("textbox", { name: copy.plan.sheet.limit }).fill("320000");
  await tomasSheet.getByRole("button", { name: copy.plan.sheet.saveChanges }).click();
  await expect(tomasSheet).toBeHidden();
  await expect(tomas.page.getByRole("main").getByText(copy.plan.left("80.000"))).toBeVisible();

  // Desactivar (US-2.5): vuelve a «sin presupuesto»; los gastos y el historial siguen; nunca un límite 0.
  await sara.page.reload();
  await sara.page.getByRole("button", { name: copy.plan.edit(restaurants) }).click();
  const off = sara.page.getByRole("dialog", { name: copy.plan.sheet.editTitle });
  await expect(off.getByRole("list", { name: copy.plan.sheet.history }).getByRole("listitem")).toHaveCount(3);
  await off.getByRole("button", { name: copy.plan.sheet.deactivate }).click();
  await expect(off).toBeHidden();
  await expect(sara.page.getByRole("main").getByText(copy.plan.noBudget("$240.000"))).toBeVisible();
  await expect(sara.page.getByRole("button", { name: copy.plan.createFor(restaurants) })).toBeVisible();
  expect(await sara.page.locator("main").innerText()).not.toMatch(/\$0(?![.\d])|\b0 %/);
  const [after] = (await budgetMonths(pair.tomas.client, "us", month())).filter((row) => row.category_id === "restaurants");
  expect(after).toMatchObject({ limit_minor: null, remaining_minor: null, consumed_minor: "24000000", state: "none" });
  const history = await budgetHistory(pair.tomas.client, after.budget_id!);
  expect(history.map((row) => row.limit_minor)).toEqual([null, "32000000", "30000000", "26000000"]);
  await Promise.all([sara.context.close(), tomas.context.close()]);
});

test("spec 5 · privacidad: ni el HTML, ni el RSC, ni el prefetch de Plan en Nosotros llevan presupuestos personales de ninguno, con la cookie válida, ausente o no válida", async ({ browser, baseURL }, testInfo) => {
  test.slow();
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  await seedSharedMovements(pair, "recent");
  // Un presupuesto personal de cada uno (por la función real) con importes únicos, y uno de Nosotros como control positivo.
  const [saraOwn, tomasOwn, shared] = await Promise.all([
    createBudget(pair.sara.client, { idempotencyKey: randomUUID(), context: "me", categoryId: "health", limit: moneyFromPesos(123400n) }),
    createBudget(pair.tomas.client, { idempotencyKey: randomUUID(), context: "me", categoryId: "entertainment", limit: moneyFromPesos(98700n) }),
    createBudget(pair.sara.client, { idempotencyKey: randomUUID(), context: "us", categoryId: "market", limit: moneyFromPesos(900000n) }),
  ]);
  const PERSONAL = ["123.400", "12340000", "98.700", "9870000", saraOwn.budget_id, tomasOwn.budget_id];
  const leaks = (text: string) => PERSONAL.filter((marker) => text.includes(marker));

  for (const user of [pair.sara, pair.tomas]) {
    for (const cookie of ["us", null, "nosotros"]) {
      const { context, page } = await open(browser, baseURL!, user, "us", cookie);
      for (const rsc of [false, true]) {
        const response = await page.request.get(rsc ? "/plan?_rsc=spec5" : "/plan", { headers: rsc ? { RSC: "1" } : {} });
        expect(response.status()).toBe(200);
        const body = await response.text();
        expect(leaks(body), `${user.displayName} ${cookie ?? "sin cookie"} ${rsc ? "RSC" : "HTML"}`).toEqual([]);
        // Control positivo: con la cookie en Nosotros y la pareja activa, el servidor sí trae el presupuesto compartido.
        if (cookie === "us") expect(body).toContain(shared.budget_id);
      }
      await context.close();
    }
  }

  // Prefetch: Sara en Yo a 1440 (su presupuesto personal se ve, como debe), cambia a Nosotros y navega a Plan.
  const { context, page } = await open(browser, baseURL!, pair.sara, "me", "me", 1440);
  const fetched: string[] = [];
  page.on("response", async (response) => {
    if (response.url().includes("_rsc=") && response.request().method() === "GET") fetched.push(await response.text().catch(() => ""));
  });
  await page.goto("/plan");
  await expect(page.getByRole("img", { name: copy.plan.bar(copy.categories.health, "0", "123.400", 0) })).toBeVisible();
  // Tomás nunca: el personal de Tomás no aparece en el Plan de Sara en Yo.
  expect(leaks(await (await page.request.get("/plan")).text()).filter((marker) => marker === "98.700" || marker === tomasOwn.budget_id)).toEqual([]);
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.home }).hover();
  await page.locator("[data-context-selector]:visible").getByRole("radio", { name: copy.context.us }).click();
  await expect(page.getByRole("main").getByText(copy.plan.optional.us, { exact: false })).toBeVisible();
  const afterSwitch = fetched.length;
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.home }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.plan }).click();
  await expect(page.getByRole("img", { name: copy.plan.bar(copy.categories.market, "640.000", "900.000", 71) })).toBeVisible();
  expect(leaks(await page.locator("main").innerText())).toEqual([]);
  for (const body of fetched.slice(afterSwitch)) expect(leaks(body), "RSC pedido en Nosotros").toEqual([]);
  await context.close();
});
