// 004 PR C, T043 / FR-114 (spec 4), FR-085; US-4, US-5, US-6, US-9; ADR-011 §2 y §3 (matriz). Spec E2E 4 «Meta con aportes
// y uso»: nace en el PR C (crear meta, aportar, ver que el héroe no cambia, retirar) y el PR D la amplía con el caso de dos
// sesiones «Financiación ajena → aprobar/rechazar».
// Criterio literal (tasks.md, T043): «crear una meta compartida, aportar y comprobar que el número héroe de Inicio no
// cambia, retirar; HTML, RSC y prefetch de Metas en Nosotros sin metas personales».
// Cada test siembra su propia pareja por la base y las funciones reales (FR-117). Solo Chromium, ninguna espera fija,
// movimiento reducido (ADR-011 §6).
import { randomUUID } from "node:crypto";
import type { Browser, BrowserContext, Locator, Page } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { contributeToGoal, createGoal, goalEntries, listGoals, updateGoal } from "../../src/lib/db/goals";
import { createExpenseWithGoal, usageRequests } from "../../src/lib/db/goal-usage";
import { captureRsc } from "../support/rsc-capture";
import { seedCouple, seedSharedMovements, type SeededUser } from "../support/seed";
import { expect, test } from "./fixtures";

const anonymous = { cookies: [], origins: [] };
test.use({ storageState: anonymous });

const month = () => todayInBogota().slice(0, 7);

async function open(browser: Browser, baseURL: string, user: SeededUser, context: "me" | "us", cookie: string | null = context, width = 390): Promise<{ context: BrowserContext; page: Page }> {
  const browserContext = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width, height: 900 } });
  await browserContext.addCookies(user.cookies);
  if (cookie !== null) await browserContext.addCookies([{ name: "juntia_context", value: cookie, domain: new URL(baseURL).hostname, path: "/" }]);
  await browserContext.addInitScript((value) => window.localStorage.setItem("juntia:context", value), context);
  return { context: browserContext, page: await browserContext.newPage() };
}
const hero = (page: Page) => page.locator("[data-counting-amount]:visible").first();

test("meta compartida: Sara la crea, aporta (el héroe de Inicio no cambia) y retira; Tomás la ve igual", async ({ browser, baseURL }, testInfo) => {
  // Un recorrido de dos sesiones con cinco navegaciones y tres escrituras: más que el límite por defecto de 30 s.
  test.slow();
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  await seedSharedMovements(pair, "recent");
  const sara = await open(browser, baseURL!, pair.sara, "us");

  // El número héroe de Nosotros antes de tocar metas: el gasto compartido del mes (2.840.000).
  await sara.page.goto("/");
  await expect(hero(sara.page)).toHaveAttribute("data-counting-amount", "$2.840.000");

  // Crear (US-4.2): en Nosotros, compartida y en COP.
  await sara.page.goto("/metas");
  await expect(sara.page.getByRole("heading", { name: copy.goals.empty.us.title })).toBeVisible();
  await sara.page.getByRole("button", { name: copy.goals.empty.us.action }).click();
  const create = sara.page.getByRole("dialog", { name: copy.goals.sheet.createTitle });
  await create.getByRole("textbox", { name: copy.goals.sheet.name }).fill("Viaje a Cartagena");
  await create.getByRole("radio", { name: copy.goals.types.travel }).click();
  await create.getByRole("textbox", { name: copy.goals.sheet.target }).fill("2000000");
  await expect(create.getByText(copy.goals.sheet.scopeNote.us)).toBeVisible();
  await create.getByRole("button", { name: copy.goals.sheet.submitCreate }).click();
  await expect(create).toBeHidden();
  const card = sara.page.getByRole("link", { name: /^Viaje a Cartagena, meta compartida, 0 %/ }).first();
  await expect(card).toBeVisible();
  const [goal] = await listGoals(pair.tomas.client, "us");
  expect(goal).toMatchObject({ name: "Viaje a Cartagena", goal_scope: "shared", goal_type: "travel", target_minor: "200000000", status: "active" });

  // Aportar (US-5.1, US-5.2): sin «¿Quién aporta?»; la cinta sube solo tras la confirmación.
  await card.click();
  await expect(sara.page).toHaveURL(new RegExp(`/metas/${goal.id}$`));
  await expect(sara.page.getByRole("heading", { level: 1, name: "Viaje a Cartagena" })).toBeVisible();
  await sara.page.getByRole("button", { name: copy.goals.immersive.contribute }).click();
  const contribute = sara.page.getByRole("dialog", { name: copy.goals.contribute.title });
  await expect(contribute.getByText(/Quién aporta/i)).toHaveCount(0);
  await contribute.getByRole("textbox", { name: copy.goals.contribute.amount }).fill("250000");
  await expect(contribute.getByText(copy.goals.contribute.preview("$250.000", 12))).toBeVisible();
  await contribute.getByRole("button", { name: copy.goals.contribute.submit("$250.000") }).click();
  await expect(contribute).toBeHidden();
  await expect(sara.page.getByRole("status").filter({ hasText: copy.goals.contribute.done("$250.000", "Viaje a Cartagena") })).toBeVisible();
  await expect(sara.page.getByText(copy.goals.ofTarget("$250.000", "$2.000.000")).first()).toBeVisible();
  const afterContribution = await goalEntries(pair.tomas.client, goal.id);
  expect(afterContribution.map(({ kind, member_user_id, amount_minor, voided }) => ({ kind, member_user_id, amount_minor, voided }))).toEqual([{ kind: "contribution", member_user_id: pair.sara.id, amount_minor: "25000000", voided: false }]);

  // El héroe no cambia: el aporte va aparte, en «Apartado para metas» (DEC-G04).
  await sara.page.goto("/");
  await expect(hero(sara.page)).toHaveAttribute("data-counting-amount", "$2.840.000");
  await expect(sara.page.getByRole("region", { name: copy.goals.home.usSetAside }).filter({ visible: true })).toContainText("$250.000");

  // Retirar (US-6.1): solo lo propio, con motivo; es reasignación, nunca ingreso.
  await sara.page.goto(`/metas/${goal.id}`);
  await sara.page.getByRole("button", { name: copy.goals.immersive.withdraw }).click();
  const withdraw = sara.page.getByRole("dialog", { name: copy.goals.withdrawSheet.title });
  await expect(withdraw.getByText(copy.goals.withdrawSheet.max("$250.000"))).toBeVisible();
  await withdraw.getByRole("textbox", { name: copy.goals.withdrawSheet.amount }).fill("100000");
  await withdraw.getByLabel(copy.goals.withdrawSheet.reason).fill("Ajuste del viaje");
  await withdraw.getByRole("button", { name: copy.goals.withdrawSheet.submit("$100.000") }).click();
  await expect(withdraw).toBeHidden();
  await expect(sara.page.getByText(copy.goals.ofTarget("$150.000", "$2.000.000")).first()).toBeVisible();
  await expect(sara.page.getByText(copy.goals.history.withdrawal).first()).toBeVisible();

  // Tomás, con su sesión, ve la misma meta con $150.000 y el aporte de Sara en el historial.
  const tomas = await open(browser, baseURL!, pair.tomas, "us");
  await tomas.page.goto("/metas");
  await expect(tomas.page.getByRole("link", { name: /^Viaje a Cartagena, meta compartida, 7 %, \$150\.000 de \$2\.000\.000/ }).first()).toBeVisible();
  await Promise.all([sara.context.close(), tomas.context.close()]);
});

test("Metas en Nosotros: ni el HTML, ni el RSC, ni el prefetch llevan metas personales, con la cookie válida, ausente o no válida", async ({ browser, baseURL }, testInfo) => {
  test.slow();
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  const personal = await createGoal(pair.sara.client, { idempotencyKey: randomUUID(), context: "me", name: "Bicicleta secreta", goalType: "vehicle", target: moneyFromPesos(3000000n), targetMonth: null });
  await contributeToGoal(pair.sara.client, { idempotencyKey: randomUUID(), goalId: personal.id, amount: moneyFromPesos(345678n), entryDate: todayInBogota(), fundingMode: "reserved" });
  const shared = await createGoal(pair.sara.client, { idempotencyKey: randomUUID(), context: "us", name: "Japón compartido", goalType: "travel", target: moneyFromPesos(18000000n), targetMonth: null });
  await contributeToGoal(pair.tomas.client, { idempotencyKey: randomUUID(), goalId: shared.id, amount: moneyFromPesos(400000n), entryDate: todayInBogota(), fundingMode: "reserved" });
  const PRIVATE = ["Bicicleta secreta", "345.678", "34567800", personal.id];
  // Al pedir /metas/{id personal}, la propia URL vuelve en el payload del router: ahí el id no es un dato filtrado, y lo que
  // se comprueba es que no salgan ni el nombre ni los importes.
  const leaks = (text: string, path = "") => PRIVATE.filter((marker) => text.includes(marker) && !(marker === personal.id && path.includes(personal.id)));
  const routes = ["/metas", `/metas/${shared.id}`, `/metas/${personal.id}`, "/", `/actividad?mes=${month()}`];

  for (const cookie of ["us", null, "nosotros"]) {
    const { context, page } = await open(browser, baseURL!, pair.sara, "us", cookie);
    for (const path of routes) {
      for (const rsc of [false, true]) {
        const url = rsc ? `${path}${path.includes("?") ? "&" : "?"}_rsc=spec4` : path;
        const response = await page.request.get(url, { headers: rsc ? { RSC: "1" } : {} });
        expect([200, 404], url).toContain(response.status());
        expect(leaks(await response.text(), path), `${cookie ?? "sin cookie"} ${url} ${rsc ? "RSC" : "HTML"}`).toEqual([]);
      }
    }
    // Control positivo: con la cookie en Nosotros, el servidor sí trae la compartida.
    if (cookie === "us") expect(await (await page.request.get("/metas")).text()).toContain("Japón compartido");
    await page.goto("/metas");
    await expect(page.getByRole("link", { name: /^Japón compartido, meta compartida/ }).first()).toBeVisible();
    expect(leaks(await page.locator("main").innerText())).toEqual([]);
    await context.close();
  }

  // Tomás nunca recibe la meta personal de Sara, en ningún contexto ni por su id.
  for (const cookie of ["us", "me"] as const) {
    const { context, page } = await open(browser, baseURL!, pair.tomas, cookie);
    for (const path of routes) expect(leaks(await (await page.request.get(path)).text(), path), `Tomás ${cookie} ${path}`).toEqual([]);
    await context.close();
  }

  // Prefetch: Sara en Yo (su meta personal se ve, como debe), cambia a Nosotros y navega. Los RSC se capturan al empezar,
  // con su ruta y su contexto (tests/support/rsc-capture.ts; revisión del gestor del PR #68).
  const { context, page } = await open(browser, baseURL!, pair.sara, "me", "me", 1440);
  const rsc = await captureRsc(page);
  // En Yo se llega a Metas desde Inicio, en el cliente: su RSC lleva la meta personal. Es el control de que la captura ve
  // una meta personal cuando viaja; en Nosotros, el mismo camino no debe traerla.
  await page.goto("/");
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.goals }).click();
  await expect(page.getByRole("link", { name: /^Bicicleta secreta, meta personal/ }).first()).toBeVisible();
  const inMe = await rsc.read((item) => item.path === "/metas" && !item.underUs);
  // (Cada RSC cuenta como de Nosotros por su propia cookie al empezar: F67-4.)
  expect(inMe.some(({ body }) => body.includes(personal.id) && body.includes("Bicicleta secreta")), "el RSC de Metas en Yo trae la meta personal").toBe(true);
  await page.locator("[data-context-selector]:visible").getByRole("radio", { name: copy.context.us }).click();
  await expect(page.getByRole("link", { name: /^Japón compartido, meta compartida/ }).first()).toBeVisible();
  // El cambio Yo → Nosotros pide /metas otra vez (`router.refresh()`) con la cookie nueva: esa respuesta es de Nosotros, se
  // inspecciona y trae la compartida sembrada (control positivo del cambio, F67-4).
  const atSwitch = await rsc.read((item) => item.underUs);
  for (const { path, body } of atSwitch) expect(leaks(body), `RSC de ${path} del cambio a Nosotros`).toEqual([]);
  expect(atSwitch.some(({ path, body }) => path === "/metas" && body.includes(shared.id)), `RSC del cambio: ${atSwitch.map((item) => item.path).join(", ")}`).toBe(true);
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.home }).click();
  await expect(page.getByRole("region", { name: copy.goals.home.usSetAside }).filter({ visible: true })).toBeVisible();
  await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.goals }).click();
  await expect(page.getByRole("link", { name: /^Japón compartido, meta compartida/ }).first()).toBeVisible();
  expect(leaks(await page.locator("main").innerText())).toEqual([]);
  const inUs = await rsc.read((item) => item.underUs);
  for (const { path, body } of inUs) expect(leaks(body), `RSC de ${path} pedido en Nosotros`).toEqual([]);
  // La prueba tiene que poder fallar: al menos un RSC de /metas iniciado en Nosotros, y su cuerpo trae la meta compartida
  // sembrada (control positivo), así que de verdad se inspeccionó Metas de Nosotros.
  const metas = inUs.filter((item) => item.path === "/metas");
  expect(metas.length, `RSC iniciados en Nosotros: ${inUs.map((item) => item.path).join(", ")}`).toBeGreaterThan(0);
  expect(metas.some(({ body }) => body.includes(shared.id) && body.includes("Japón compartido"))).toBe(true);
  await context.close();
});

// F68-1 (revisión del PR #68): el conflicto de versión al editar una meta. Sara abre «Editar meta»; mientras tanto, la misma
// meta cambia desde otra sesión suya (otra pestaña). Al guardar: JT011, ningún autor inventado, la versión ganadora se
// conserva en la base y no se puede volver a guardar hasta «Revisar»; solo una nueva confirmación explícita la cambia.
test("editar una meta con una versión vieja: JT011 sin autor; la ganadora se conserva hasta «Revisar» y guardar otra vez", async ({ browser, baseURL }, testInfo) => {
  test.slow();
  const pair = await seedCouple({ index: testInfo.parallelIndex });
  const goal = await createGoal(pair.sara.client, { idempotencyKey: randomUUID(), context: "us", name: "Japón", goalType: "travel", target: moneyFromPesos(18000000n), targetMonth: null });
  const sara = await open(browser, baseURL!, pair.sara, "us");
  await sara.page.goto(`/metas/${goal.id}`);
  await sara.page.getByRole("button", { name: copy.goals.immersive.edit }).click();
  const sheet = sara.page.getByRole("dialog", { name: copy.goals.sheet.editTitle });
  const name = sheet.getByLabel(copy.goals.sheet.name);
  await name.fill("Japón y Corea");

  // La otra pestaña gana: misma cuenta, versión leída.
  const winner = await updateGoal(pair.sara.client, { idempotencyKey: randomUUID(), goalId: goal.id, expectedVersion: goal.version, name: "Japón 2027", goalType: "travel", target: moneyFromPesos(20000000n), targetMonth: null });

  await sheet.getByRole("button", { name: copy.goals.sheet.submitEdit }).click();
  const conflict = sheet.locator("[data-goal-conflict]");
  await expect(conflict).toContainText(copy.goals.sheet.conflict.title);
  await expect(conflict).toContainText("Japón y Corea");
  await expect(conflict).toContainText("Japón 2027");
  await expect(conflict).not.toContainText(/Tomás|Alguien/);
  await expect(sheet.getByRole("button", { name: copy.goals.sheet.submitEdit })).toHaveCount(0);
  await expect(name).toBeDisabled();
  const kept = async () => (await listGoals(pair.sara.client, "us")).find((item) => item.id === goal.id)!;
  expect(await kept()).toMatchObject({ name: "Japón 2027", version: winner.version });

  // «Revisar»: lo vigente en el formulario; una nueva confirmación explícita guarda sobre la versión ganadora.
  await conflict.getByRole("button", { name: copy.goals.sheet.conflict.review }).click();
  await expect(name).toHaveValue("Japón 2027");
  expect(await kept()).toMatchObject({ name: "Japón 2027", version: winner.version });
  await name.fill("Japón 2027 y Corea");
  await sheet.getByRole("button", { name: copy.goals.sheet.submitEdit }).click();
  await expect(sheet).toHaveCount(0);
  expect(await kept()).toMatchObject({ name: "Japón 2027 y Corea", target_minor: "2000000000", version: winner.version + 1 });
  await sara.context.close();
});

// 004 PR D, T058 / FR-114 (dos sesiones), FR-085, FR-086; SC-009 (recorrido); US-7.1, US-7.1a, US-7.4–US-7.8; F63-3.
// Criterio literal (tasks.md, T058): «el caso de la matriz "Financiación ajena → aprobar/rechazar" con dos contextos
// autenticados (Sara pide, Tomás aprueba en un caso y rechaza en otro; los estados se ven en las dos sesiones al navegar), y
// el caso de privacidad de B1 (F63-3): Sara con metas personales, Tomás sin ellas, nada personal en el HTML, el RSC ni el
// prefetch de Anotar en Nosotros».
// Qué rompería sin que una capa inferior se entere (contracts/ci.md, mitigación b): la integración ya prueba la atomicidad,
// la revalidación y las carreras; aquí se prueba lo que solo existe con dos navegadores y el servidor real: que la solicitud
// viaja de la sesión de Sara a la de Tomás sin tiempo real (al navegar), que cada uno ve el estado del otro, y que B1 en
// Nosotros nunca trae una meta personal por la respuesta de su Server Action, el HTML ni el RSC. Un solo caso con una sola
// pareja del dataset dorado (Japón 11.340.000: Sara 6.120.000, Tomás 5.220.000; Bicicleta de ruta, personal de Sara): la
// segunda solicitud (la que se rechaza) se siembra por la función real, porque su registro por la interfaz ya lo cubre la
// primera. B1 no es una ruta: sus metas llegan por una Server Action al elegir «Con una meta», así que se inspecciona su
// respuesta, con un control positivo en Yo; y la navegación y el prefetch de Inicio (donde vive Anotar), con rsc-capture.ts.

/** Respuestas de las Server Actions de la página (POST con `next-action`), leídas al interceptarlas, como rsc-capture.ts. */
async function captureActions(page: Page) {
  const fetched: Promise<string>[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() !== "POST" || !(await request.headerValue("next-action"))) return route.fallback();
    let settle!: (body: string) => void;
    let fail!: (error: unknown) => void;
    const body = new Promise<string>((resolve, reject) => { settle = resolve; fail = reject; });
    // Sin esto, un rechazo que nadie espera todavía sería un error no manejado; al leerlo con `read`, falla igual.
    body.catch(() => {});
    fetched.push(body);
    try {
      const response = await route.fetch();
      const text = await response.text();
      settle(text);
      await route.fulfill({ response, body: text });
    } catch (error) {
      fail(error);
      await route.abort().catch(() => {});
    }
  });
  return { count: () => fetched.length, read: (from = 0) => Promise.all(fetched.slice(from)) };
}

async function openAnnotate(page: Page) {
  await page.locator("body").focus();
  await page.keyboard.press("n");
  const sheet = page.getByRole("dialog", { name: copy.annotate.title.expense });
  await expect(sheet.getByRole("textbox", { name: copy.annotate.amount })).toBeFocused();
  return sheet;
}
/** «Con una meta» y la lista de B1, en el contexto que tenga la hoja. */
async function goalPicker(sheet: Locator) {
  await sheet.getByRole("button", { name: new RegExp(`^${copy.goalExpense.paidWith.label}:`) }).click();
  await sheet.getByRole("radiogroup", { name: copy.goalExpense.paidWith.label }).getByRole("radio", { name: copy.goalExpense.paidWith.goal }).click();
  const picker = sheet.getByRole("radiogroup", { name: copy.goalExpense.picker.title });
  await expect(picker.getByRole("radio").first()).toBeVisible();
  return picker;
}
const optionNames = (picker: Locator) => picker.getByRole("radio").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label") ?? node.textContent ?? ""));

test("gasto con meta en dos sesiones: Sara pide fondos a Tomás, él aprueba uno y rechaza otro; B1 en Nosotros sin metas personales", async ({ browser, baseURL }, testInfo) => {
  test.slow();
  const pair = await seedCouple({ index: testInfo.parallelIndex, golden: true });
  const mine = await listGoals(pair.sara.client, "me");
  const japan = mine.find((goal) => goal.name === "Japón")!;
  const bike = mine.find((goal) => goal.name === "Bicicleta de ruta")!;
  expect(japan).toMatchObject({ balance_minor: "1134000000" });
  const PRIVATE = ["Bicicleta de ruta", bike.id, "105000000", "1.050.000"];
  const leaks = (text: string) => PRIVATE.filter((marker) => text.includes(marker));

  // F63-3 (revisión del gestor del PR #69, 3): la navegación y el prefetch de la página donde vive Anotar, con sus RSC
  // clasificados por la cookie de cada petición (tests/support/rsc-capture.ts). Sara empieza en Yo, en escritorio (los
  // enlaces de la barra lateral precargan): en Yo, el RSC de Inicio trae su meta personal (control positivo); tras cambiar a
  // Nosotros, ningún RSC lleva la personal y el de Inicio trae Japón (control positivo de Nosotros).
  const desk = await open(browser, baseURL!, pair.sara, "me", "me", 1440);
  const rsc = await captureRsc(desk.page);
  const nav = desk.page.getByRole("navigation", { name: copy.shell.navigation });
  await desk.page.goto("/actividad");
  await nav.getByRole("link", { name: copy.nav.home }).click();
  await expect(desk.page.getByRole("link", { name: /^Bicicleta de ruta, meta personal/ }).first()).toBeVisible();
  const inMe = await rsc.read((item) => item.path === "/" && !item.underUs);
  expect(inMe.some(({ body }) => body.includes(bike.id) && body.includes("Bicicleta de ruta")), "el RSC de Inicio en Yo trae la meta personal").toBe(true);
  // Mutación: el mismo detector, sobre lo que viajó en Yo, sí encuentra la personal; si no la encontrara, no prueba nada.
  expect(inMe.some(({ body }) => leaks(body).length > 0), "el detector de fugas falla con un RSC que lleva la personal").toBe(true);
  await desk.page.locator("[data-context-selector]:visible").getByRole("radio", { name: copy.context.us }).click();
  await expect(desk.page.getByRole("heading", { name: /gastaron juntos/ })).toBeVisible();
  await nav.getByRole("link", { name: copy.nav.activity }).hover();
  await nav.getByRole("link", { name: copy.nav.activity }).click();
  await expect(desk.page).toHaveURL(/\/actividad/);
  await nav.getByRole("link", { name: copy.nav.home }).hover();
  await nav.getByRole("link", { name: copy.nav.home }).click();
  await expect(desk.page.getByRole("heading", { name: /gastaron juntos/ })).toBeVisible();
  const inUs = await rsc.read((item) => item.underUs);
  for (const { path, body } of inUs) expect(leaks(body), `RSC de ${path} pedido en Nosotros`).toEqual([]);
  expect(inUs.some(({ path, body }) => path === "/" && body.includes(japan.id)), `RSC en Nosotros: ${inUs.map((item) => item.path).join(", ")}`).toBe(true);
  await desk.context.close();

  // El recorrido, en una sesión de Sara en Nosotros a 390.
  const sara = await open(browser, baseURL!, pair.sara, "us");

  const actions = await captureActions(sara.page);
  await sara.page.goto("/");
  const sheet = await openAnnotate(sara.page);
  await sara.page.keyboard.type("3000000");
  await sheet.getByRole("radio", { name: copy.categories.transport }).click();
  await sheet.getByPlaceholder(copy.annotate.descriptionPlaceholder).fill("Tiquetes a Tokio");

  // Control positivo: con la hoja en «Solo tú», B1 trae la meta personal por la respuesta de su Server Action y la captura la ve.
  await sheet.getByRole("radio", { name: copy.annotate.onlyYou }).click();
  const personal = await goalPicker(sheet);
  expect(await optionNames(personal)).toEqual([copy.goalExpense.picker.option("Bicicleta de ruta", "$1.050.000")]);
  expect((await actions.read()).some((body) => body.includes(bike.id) && body.includes("Bicicleta de ruta")), "la respuesta de B1 en Yo trae la personal").toBe(true);
  await sheet.getByRole("button", { name: copy.goalExpense.back }).click();

  // US-7.1 y 7.1a: en Nosotros, solo Japón; ni la lista ni la respuesta de la acción traen la personal, ni deshabilitada.
  const fromUs = actions.count();
  await sheet.getByRole("radio", { name: copy.context.us }).click();
  const picker = await goalPicker(sheet);
  expect(await optionNames(picker)).toEqual([copy.goalExpense.picker.option("Japón", "$11.340.000")]);
  await expect(sheet.getByText(copy.goalExpense.picker.note.us)).toBeVisible();
  const usBodies = await actions.read(fromUs);
  expect(usBodies.length, "B1 en Nosotros pidió sus metas").toBeGreaterThan(0);
  for (const body of usBodies) expect(leaks(body), "respuesta de B1 en Nosotros").toEqual([]);
  expect(usBodies.some((body) => body.includes(japan.id)), "control positivo: la respuesta de Nosotros trae Japón").toBe(true);

  // B2 y B3 con los importes escritos del dataset (no la propuesta): 1.620.000 de Sara y 1.380.000 pedidos a Tomás.
  await picker.getByRole("radio", { name: /^Japón/ }).click();
  await sheet.getByRole("textbox", { name: copy.goalExpense.ledger.mine }).fill("1620000");
  await sheet.getByRole("textbox", { name: copy.goalExpense.ledger.theirs("Tomás") }).fill("1380000");
  await expect(sheet.getByText(copy.goalExpense.ledger.sum("$3.000.000", "$3.000.000"))).toBeVisible();
  const effect = await sheet.getByRole("list", { name: copy.goalExpense.effect.title }).getByRole("listitem").evaluateAll((rows) => rows.map((row) => row.getAttribute("aria-label")));
  expect(effect).toEqual([
    copy.goalExpense.effect.row(copy.goalExpense.effect.now("Japón"), "$11.340.000", "$9.720.000"),
    copy.goalExpense.effect.row(copy.goalExpense.effect.ifApproves("Tomás"), "$9.720.000", "$8.340.000"),
  ]);
  await sheet.getByRole("button", { name: copy.goalExpense.submit.ask("Tomás") }).click();
  // La escritura tiene hasta 15 s antes de pasar a desconocido (FR-093); bajo la carga de la suite completa tarda más de 5 s.
  await expect(sheet).toBeHidden({ timeout: 15_000 });
  await expect(sara.page.getByRole("status").filter({ hasText: copy.goalExpense.saved.ask("Tomás") })).toBeVisible();

  // US-7.4: la solicitud de 1.380.000 queda pendiente. Los saldos y la atomicidad los prueban integración y pgTAP.
  const [pending] = await usageRequests(pair.tomas.client, { status: "pending" });
  expect(pending).toMatchObject({ goal_id: japan.id, requested_by: pair.sara.id, member_user_id: pair.tomas.id, amount_minor: "138000000", transaction_description: "Tiquetes a Tokio" });

  // B4: Sara, al navegar a Actividad, ve la tarjeta pendiente y la fila CON META.
  await sara.page.goto("/actividad");
  const requests = sara.page.getByRole("region", { name: copy.goalExpense.request.region }).filter({ visible: true });
  await expect(requests.getByText(copy.goalExpense.badge.pending("Tomás"))).toBeVisible();
  await expect(requests.getByText(copy.goalExpense.request.waiting("Tomás"))).toBeVisible();
  await expect(requests.getByText(copy.goalExpense.request.noExpiry)).toBeVisible();
  await expect(requests.getByRole("button", { name: copy.goalExpense.request.cancel })).toBeVisible();
  await expect(sara.page.locator(`[data-transaction-id="${pending.transaction_id}"]:visible`).first()).toContainText(copy.goalExpense.badge.funded);

  // B5: Tomás, en su sesión, la ve al navegar a Inicio.
  const tomas = await open(browser, baseURL!, pair.tomas, "us");
  const tomasActions = await captureActions(tomas.page);
  await tomas.page.goto("/");
  const card = tomas.page.getByRole("region", { name: copy.goalExpense.request.region }).filter({ visible: true });
  await expect(card.getByText(copy.goalExpense.request.title("Sara"))).toBeVisible();
  await expect(card.getByText(copy.goalExpense.request.yoursLabel("Japón", "$5.220.000", "$3.840.000"))).toHaveCount(1);
  await expect(card.getByText(copy.goalExpense.request.rejectNote)).toBeVisible();
  // US-7.7: Tomás aprueba con la versión leída. La tarjeta se va con el refresco; el aviso lo dice y la solicitud consta
  // aprobada. Los saldos tras aprobar los prueban integración y pgTAP (contracts/ci.md, mitigación b).
  await card.getByRole("button", { name: copy.goalExpense.request.approve("$1.380.000") }).click();
  await expect(tomas.page.getByRole("status").filter({ hasText: copy.goalExpense.request.approved("Japón") }).first()).toBeVisible();
  await expect.poll(async () => (await usageRequests(pair.sara.client)).find((row) => row.id === pending.id)).toMatchObject({ status: "approved" });

  // Sara lo ve al navegar: el detalle del gasto dice APROBADO.
  await sara.page.goto(`/actividad/${pending.transaction_id}`);
  await expect(sara.page.locator("[data-transaction-detail]:visible").getByText(copy.goalExpense.badge.approved, { exact: true })).toBeVisible();

  // Segundo caso (US-7.8): otra solicitud, sembrada por la función real; Tomás la rechaza y el gasto sigue.
  const second = await createExpenseWithGoal(pair.sara.client, {
    idempotencyKey: randomUUID(), context: "us", amount: moneyFromPesos(300000n), categoryId: "restaurants", transactionDate: todayInBogota(), description: "Cena en Kioto",
    payerUserId: pair.sara.id, splitMode: "equal", splitPercents: null,
    allocations: [{ userId: pair.sara.id, amount: moneyFromPesos(150000n) }, { userId: pair.tomas.id, amount: moneyFromPesos(150000n) }],
    goalId: japan.id, own: moneyFromPesos(100000n), requested: moneyFromPesos(200000n),
  });
  await tomas.page.goto("/");
  await expect(card.getByText(copy.goalExpense.request.expense("Cena en Kioto", "$300.000"))).toBeVisible();
  await card.getByRole("button", { name: copy.goalExpense.request.reject }).click();
  await expect(tomas.page.getByRole("status").filter({ hasText: copy.goalExpense.request.rejected }).first()).toBeVisible();
  await expect.poll(async () => (await usageRequests(pair.sara.client)).find((row) => row.transaction_id === second.id)).toMatchObject({ status: "rejected" });
  await sara.page.goto(`/actividad/${second.id}`);
  const detail = sara.page.locator("[data-transaction-detail]:visible");
  await expect(detail).toContainText("Cena en Kioto");
  await expect(detail.getByText(copy.goalExpense.badge.rejected("Tomás"), { exact: true })).toBeVisible();

  // B1 de Tomás (que no tiene metas personales): su respuesta no filtra la personal de Sara.
  await openAnnotate(tomas.page).then(goalPicker);
  const tomasBodies = await tomasActions.read();
  expect(tomasBodies.length, "B1 de Tomás pidió sus metas").toBeGreaterThan(0);
  for (const body of tomasBodies) expect(leaks(body), "B1 de Tomás").toEqual([]);
  await Promise.all([sara.context.close(), tomas.context.close()]);
});

// Decisión de los fundadores del 11 de noviembre de 2026: en móvil, la pila se recorre deslizando en horizontal y el scroll
// vertical empezado sobre la tarjeta del frente mueve la página (antes, `drag="y"` con `touch-action: pan-x` lo bloqueaba).
// Móvil emulado de verdad (táctil): los toques van por CDP (`Input.dispatchTouchEvent`), que pasa por el compositor y respeta
// `touch-action`; `Input.synthesizeScrollGesture` no desplaza en el Chromium sin interfaz.
test("pila de metas en móvil: el scroll vertical sobre la tarjeta mueve la página y deslizar a la izquierda trae la siguiente", async ({ browser, baseURL }) => {
  const pair = await seedCouple({ index: test.info().parallelIndex });
  const today = todayInBogota();
  for (const [name, pesos] of [["Japón", 500000n], ["Sala nueva", 300000n]] as const) {
    const goal = await createGoal(pair.sara.client, { idempotencyKey: randomUUID(), context: "us", name, goalType: "travel", target: moneyFromPesos(18000000n), targetMonth: null });
    await contributeToGoal(pair.sara.client, { idempotencyKey: randomUUID(), goalId: goal.id, amount: moneyFromPesos(pesos), entryDate: today, fundingMode: "reserved" });
  }
  const context = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width: 390, height: 520 }, hasTouch: true, isMobile: true });
  await context.addCookies(pair.sara.cookies);
  await context.addCookies([{ name: "juntia_context", value: "us", domain: new URL(baseURL!).hostname, path: "/" }]);
  await context.addInitScript(() => window.localStorage.setItem("juntia:context", "us"));
  const page = await context.newPage();
  await page.goto("/metas");
  const front = page.locator("[data-swipe]");
  const frontName = () => front.locator("[data-goal-title]").innerText();
  await expect(front).toBeVisible();
  const first = await frontName();
  const cdp = await context.newCDPSession(page);
  const center = async () => { const box = (await front.boundingBox())!; return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }; };
  // Un dedo que se apoya en (x, y) y se desliza (dx, dy) en diez pasos.
  const touchDrag = async (x: number, y: number, dx: number, dy: number) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 10; step += 1) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * step) / 10, y: y + (dy * step) / 10 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };

  // Scroll vertical empezado sobre la tarjeta: la página baja y el frente no cambia.
  expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight), "la página tiene recorrido vertical").toBeGreaterThan(120);
  const start = await center();
  expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest("[data-swipe]"), start), "el dedo empieza sobre la tarjeta del frente").toBe(true);
  await touchDrag(start.x, start.y, 0, -150);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(60);
  expect(await frontName()).toBe(first);

  // Deslizar a la izquierda sobre la frontal: la siguiente pasa al frente.
  const from = await center();
  await touchDrag(from.x, from.y, -160, 0);
  await expect.poll(frontName).not.toBe(first);
  await context.close();
});
