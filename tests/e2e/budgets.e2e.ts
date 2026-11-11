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
import { contributeToGoal, createGoal } from "../../src/lib/db/goals";
import { createTransaction } from "../../src/lib/db/transactions";
import { monthName, shortDate } from "../../src/lib/format";
import { captureRsc } from "../support/rsc-capture";
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
  await expect(sara.page.getByRole("main").getByText(copy.plan.leftPercent("$20.000", 92))).toBeVisible();
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
  await expect(sara.page.getByRole("main").getByText(copy.plan.left("$60.000"))).toBeVisible();

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
  await expect(tomas.page.getByRole("main").getByText(copy.plan.left("$80.000"))).toBeVisible();

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
  // Cada respuesta RSC se registra al EMPEZAR su petición, con su ruta, la fase en que empezó y la promesa de su cuerpo; los
  // cuerpos se esperan todos antes de comprobarlos (revisiones del gestor y de ChatGPT del PR #67: 1, F67-2 y F67-4).
  // El cuerpo se lee interceptando la petición (`route.fetch()`), no con `response.text()`: en las respuestas RSC transmitidas,
  // Playwright no da el cuerpo y la lectura devolvía "" en silencio, así que no se inspeccionaba nada. La respuesta se entrega
  // tal cual a la página (sin streaming ni caché HTTP mientras dura esta parte; las lecturas directas de HTML y RSC de arriba
  // no se interceptan). Un fallo al leer hace fallar la prueba.
  // Fases (F67-4): `me` antes del clic en «Nosotros»; `switch` desde justo antes del clic hasta que Plan de Nosotros se ve
  // (la transición: el selector escribe la cookie en el navegador y pide `router.refresh()`, un GET con `_rsc`); `us` después.
  // Se interceptan los GET con `_rsc` y, por si el cambio de contexto pasara a una Server Action, los POST con `Next-Action`
  // (su respuesta `text/x-component` trae el árbol refrescado).
  type Phase = "me" | "switch" | "us";
  let phase: Phase = "me";
  const fetched: { path: string; phase: Phase; body: Promise<string> }[] = [];
  await page.route((url) => url.searchParams.has("_rsc") || url.pathname === "/" || url.pathname === "/plan", async (route) => {
    const request = route.request();
    const rsc = request.method() === "GET" && new URL(request.url()).searchParams.has("_rsc");
    const action = request.method() === "POST" && request.headers()["next-action"] !== undefined;
    if (!rsc && !action) return route.continue();
    const started = phase;
    let settle!: (body: string) => void;
    let fail!: (error: unknown) => void;
    fetched.push({ path: new URL(request.url()).pathname, phase: started, body: new Promise<string>((resolve, reject) => { settle = resolve; fail = reject; }) });
    try {
      const response = await route.fetch();
      const body = await response.text();
      settle(body);
      await route.fulfill({ response, body });
    } catch (error) {
      fail(error);
      await route.abort().catch(() => {});
    }
  });
  // En Yo se llega a Plan desde Inicio, en el cliente: su RSC lleva el presupuesto personal de Sara. Es el control de que la
  // captura ve un presupuesto personal cuando viaja; en Nosotros, el mismo camino no debe traerlo.
  await page.goto("/");
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.plan }).click();
  await expect(page.getByRole("img", { name: copy.plan.bar(copy.categories.health, "0", "123.400", 0) })).toBeVisible();
  const inMe = await Promise.all(fetched.filter((item) => item.path === "/plan").map((item) => item.body));
  expect(inMe.some((body) => body.includes(saraOwn.budget_id)), "el RSC de Plan en Yo trae el presupuesto personal").toBe(true);
  // Tomás nunca: el personal de Tomás no aparece en el Plan de Sara en Yo.
  expect(leaks(await (await page.request.get("/plan")).text()).filter((marker) => marker === "98.700" || marker === tomasOwn.budget_id)).toEqual([]);
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.home }).hover();
  phase = "switch";
  await page.locator("[data-context-selector]:visible").getByRole("radio", { name: copy.context.us }).click();
  await expect(page.getByRole("img", { name: copy.plan.bar(copy.categories.market, "640.000", "900.000", 71) })).toBeVisible();
  phase = "us";
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.home }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.plan }).click();
  await expect(page.getByRole("img", { name: copy.plan.bar(copy.categories.market, "640.000", "900.000", 71) })).toBeVisible();
  expect(leaks(await page.locator("main").innerText())).toEqual([]);
  const afterMe = await Promise.all(fetched.filter((item) => item.phase !== "me").map(async (item) => ({ path: item.path, phase: item.phase, body: await item.body })));
  for (const { path, phase: started, body } of afterMe) expect(leaks(body), `respuesta de ${path} en la fase ${started}`).toEqual([]);
  // La prueba tiene que poder fallar. La transición se inspeccionó: hay respuesta de la fase `switch` con cuerpo, y la de
  // `/plan` trae ya el presupuesto compartido (control positivo).
  const transition = afterMe.filter((item) => item.phase === "switch");
  expect(transition.filter(({ body }) => body.length > 0).length, `respuestas de la transición: ${transition.map((item) => item.path).join(", ")}`).toBeGreaterThan(0);
  expect(transition.some(({ path, body }) => path === "/plan" && body.includes(shared.budget_id))).toBe(true);
  // Y en Nosotros: al menos un RSC de /plan iniciado después, que trae el presupuesto compartido sembrado.
  const plan = afterMe.filter((item) => item.phase === "us" && item.path === "/plan");
  expect(plan.length, `RSC iniciados en Nosotros: ${afterMe.filter((item) => item.phase === "us").map((item) => item.path).join(", ")}`).toBeGreaterThan(0);
  expect(plan.some(({ body }) => body.includes(shared.budget_id))).toBe(true);
  await context.close();
});

// 004 PR E · T071 [US3] — la spec 5 crece con Análisis. Criterio literal (tasks.md, T071): «Análisis con y sin presupuesto
// (con presupuesto muestra límite y desviación; sin presupuesto, ninguna barra fingida); HTML, RSC y prefetch de Análisis en
// Nosotros sin datos personales». Cumple: FR-114 (Análisis); FR-085; US-3.
// Por qué en E2E (docs/TESTING.md §4; contracts/ci.md, mitigación b): lo que ninguna capa inferior ve es que la página real
// lee `metric_months` y `budget_months` del contexto de la cookie y el mes de la URL, y lo que el servidor manda en Nosotros.
// Los capítulos, la comparación, el Chart y la PlanningNote con todas sus variantes están en componentes (T070); las cifras
// de las vistas, en dominio, pgTAP e integración. Dos casos: el recorrido (una pareja dorada) y la privacidad.
const analysisOf = (month: string) => `/plan/analisis?mes=${month}`;
const chapter = (page: Page, name: string) => page.getByRole("main").getByRole("region", { name });

test("spec 5 · Análisis con y sin presupuesto: octubre de Nosotros con límite y desviación, y Yo de Tomás sin presupuesto, sin barras fingidas", async ({ browser, baseURL }, testInfo) => {
  test.slow();
  // La pareja dorada: octubre con los seis compartidos, los presupuestos de la parte B y los aportes de la parte A.
  const pair = await seedCouple({ index: testInfo.parallelIndex, golden: true });
  const sara = await open(browser, baseURL!, pair.sara, "us");
  // Acceso desde Plan (Q5): «Ver el análisis de {mes}» abre el del mes en curso.
  await sara.page.goto("/plan");
  await sara.page.getByRole("main").getByRole("link", { name: copy.plan.analysis(monthName(today().slice(0, 7))) }).click();
  await expect(sara.page).toHaveURL(/\/plan\/analisis/);
  await expect(chapter(sara.page, copy.analysis.chapters.amount)).toBeVisible();

  // Octubre en Nosotros (US-3, escenarios 1 y 2): el gasto, el desglose con límite y desviación, sin comparación (no hay
  // gastos compartidos en septiembre: Q10), lo apartado por persona y la PlanningNote.
  await sara.page.goto(analysisOf("2026-10"));
  const amount = chapter(sara.page, copy.analysis.chapters.amount);
  await expect(amount).toContainText(copy.analysis.spent.us);
  await expect(amount).toContainText("$2.840.000");
  await expect(amount).not.toContainText("%");
  const where = chapter(sara.page, copy.analysis.chapters.where);
  await expect(where.getByRole("img", { name: copy.plan.bar(copy.categories.market, "640.000", "900.000", 71) })).toBeVisible();
  await expect(where.getByText(copy.plan.over.us("$20.000", 105))).toBeVisible();
  await expect(where.getByText(copy.plan.leftPercent("$20.000", 92))).toBeVisible();
  const setAside = chapter(sara.page, copy.analysis.chapters.setAside);
  await expect(setAside.getByText("$900.000 · Sara $500.000 · Tomás $400.000. Va aparte: no es gasto.")).toBeVisible();
  const how = setAside.getByRole("button", { name: copy.analysis.note.how });
  await how.click();
  await expect(how).toHaveAttribute("aria-expanded", "true");
  await expect(setAside.getByRole("group", { name: copy.analysis.note.overline })).toContainText("$3.740.000");
  await expect(sara.page.getByRole("main")).not.toContainText(/total gastado/i);

  // Yo de Tomás en octubre: no tiene presupuestos personales. Solo gasto y categorías; ninguna barra, límite ni 0 %.
  const tomas = await open(browser, baseURL!, pair.tomas, "me");
  await tomas.page.goto(analysisOf("2026-10"));
  await expect(chapter(tomas.page, copy.analysis.chapters.amount)).toContainText(copy.analysis.spent.me);
  const mine = chapter(tomas.page, copy.analysis.chapters.where);
  await expect(mine.getByText(copy.analysis.where.noBudgets.me)).toBeVisible();
  await expect(mine.getByRole("img")).toHaveCount(0);
  await expect(mine.locator("[data-budget-bar], [data-elapsed-mark]")).toHaveCount(0);
  await expect(chapter(tomas.page, copy.analysis.chapters.setAside).getByText("$400.000. Va aparte: no es gasto.")).toBeVisible();
  expect(await tomas.page.locator("main").innerText()).not.toMatch(/\$0(?![.\d])|\b0 %|EXCEDIDO/);
  await Promise.all([sara.context.close(), tomas.context.close()]);
});

test("spec 5 · privacidad de Análisis: ni el HTML, ni el RSC, ni el prefetch de Análisis en Nosotros llevan gastos, presupuestos ni metas personales", async ({ browser, baseURL }, testInfo) => {
  test.slow();
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  await seedSharedMovements(pair, "recent");
  // Lo personal de cada uno, por las funciones reales y con importes únicos: un presupuesto de cada uno, un gasto privado de
  // Sara en Salud (ninguna fila compartida es de Salud) y un aporte a una meta personal suya.
  const [saraOwn, tomasOwn] = await Promise.all([
    createBudget(pair.sara.client, { idempotencyKey: randomUUID(), context: "me", categoryId: "health", limit: moneyFromPesos(123400n) }),
    createBudget(pair.tomas.client, { idempotencyKey: randomUUID(), context: "me", categoryId: "entertainment", limit: moneyFromPesos(98700n) }),
    createTransaction(pair.sara.client, { idempotencyKey: randomUUID(), type: "expense", amount: moneyFromPesos(43210n), categoryId: "health", transactionDate: today(), description: "Consulta privada" }),
  ]);
  const bike = await createGoal(pair.sara.client, { idempotencyKey: randomUUID(), context: "me", name: "Bicicleta secreta", goalType: "vehicle", target: moneyFromPesos(3000000n), targetMonth: null });
  await contributeToGoal(pair.sara.client, { idempotencyKey: randomUUID(), goalId: bike.id, amount: moneyFromPesos(77770n), entryDate: today(), fundingMode: "reserved" });
  const PERSONAL = ["123.400", "12340000", "98.700", "9870000", saraOwn.budget_id, tomasOwn.budget_id, "43.210", "4321000", "Consulta privada", "77.770", "7777000", "Bicicleta secreta", bike.id];
  const leaks = (text: string) => PERSONAL.filter((marker) => text.includes(marker));
  // Control positivo de Nosotros: el gasto compartido del mes, en unidades menores, viaja en el HTML y en el RSC.
  const US = "284000000";
  const path = analysisOf(today().slice(0, 7));

  for (const user of [pair.sara, pair.tomas]) {
    for (const cookie of ["us", null, "nosotros"]) {
      const { context, page } = await open(browser, baseURL!, user, "us", cookie);
      for (const rsc of [false, true]) {
        const response = await page.request.get(rsc ? `${path}&_rsc=spec5` : path, { headers: rsc ? { RSC: "1" } : {} });
        expect(response.status()).toBe(200);
        const body = await response.text();
        expect(leaks(body), `${user.displayName} ${cookie ?? "sin cookie"} ${rsc ? "RSC" : "HTML"}`).toEqual([]);
        if (cookie === "us") expect(body, `${user.displayName} ${rsc ? "RSC" : "HTML"}: control positivo`).toContain(US);
      }
      await context.close();
    }
  }

  // Prefetch (tests/support/rsc-capture.ts: cada RSC se clasifica por su propia cookie al empezar). Sara en Yo a 1440 llega a
  // Análisis desde Plan: su RSC trae lo personal (control de que la captura lo ve cuando viaja). Cambia a Nosotros en
  // Análisis y vuelve a entrar desde «En qué se fue» de Inicio: ningún RSC de Nosotros lo trae, y el de Análisis trae el gasto
  // compartido (control positivo).
  const { context, page } = await open(browser, baseURL!, pair.sara, "me", "me", 1440);
  const rsc = await captureRsc(page);
  const nav = page.getByRole("navigation", { name: copy.shell.navigation });
  await page.goto("/plan");
  await page.getByRole("main").getByRole("link", { name: copy.plan.analysis(monthName(today().slice(0, 7))) }).click();
  await expect(chapter(page, copy.analysis.chapters.setAside).getByText("$77.770. Va aparte: no es gasto.")).toBeVisible();
  const inMe = await rsc.read((item) => item.path === "/plan/analisis" && !item.underUs);
  expect(inMe.some(({ body }) => body.includes("7777000") && body.includes("4321000")), "el RSC de Análisis en Yo trae lo personal").toBe(true);
  await page.locator("[data-context-selector]:visible").getByRole("radio", { name: copy.context.us }).click();
  await expect(chapter(page, copy.analysis.chapters.amount)).toContainText(copy.analysis.spent.us);
  const atSwitch = await rsc.read((item) => item.underUs);
  for (const { path: from, body } of atSwitch) expect(leaks(body), `RSC de ${from} del cambio a Nosotros`).toEqual([]);
  expect(atSwitch.some(({ path: from, body }) => from === "/plan/analisis" && body.includes(US)), `RSC del cambio: ${atSwitch.map((item) => item.path).join(", ")}`).toBe(true);
  await nav.getByRole("link", { name: copy.nav.home }).click();
  await page.getByRole("main").getByRole("link", { name: copy.home.analysis, exact: true }).click();
  await expect(chapter(page, copy.analysis.chapters.amount)).toContainText("$2.840.000");
  expect(leaks(await page.locator("main").innerText())).toEqual([]);
  const inUs = await rsc.read((item) => item.underUs);
  for (const { path: from, body } of inUs) expect(leaks(body), `RSC de ${from} pedido en Nosotros`).toEqual([]);
  const analysis = inUs.filter((item) => item.path === "/plan/analisis");
  expect(analysis.length, `RSC iniciados en Nosotros: ${inUs.map((item) => item.path).join(", ")}`).toBeGreaterThan(1);
  expect(analysis.filter(({ body }) => body.includes(US)).length).toBeGreaterThan(1);
  await context.close();
});
