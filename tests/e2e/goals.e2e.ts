// 004 PR C, T043 / FR-114 (spec 4), FR-085; US-4, US-5, US-6, US-9; ADR-011 §2 y §3 (matriz). Spec E2E 4 «Meta con aportes
// y uso»: nace en el PR C (crear meta, aportar, ver que el héroe no cambia, retirar) y el PR D la amplía con el caso de dos
// sesiones «Financiación ajena → aprobar/rechazar».
// Criterio literal (tasks.md, T043): «crear una meta compartida, aportar y comprobar que el número héroe de Inicio no
// cambia, retirar; HTML, RSC y prefetch de Metas en Nosotros sin metas personales».
// Cada test siembra su propia pareja por la base y las funciones reales (FR-117). Solo Chromium, ninguna espera fija,
// movimiento reducido (ADR-011 §6).
import { randomUUID } from "node:crypto";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { contributeToGoal, createGoal, goalEntries, listGoals } from "../../src/lib/db/goals";
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
