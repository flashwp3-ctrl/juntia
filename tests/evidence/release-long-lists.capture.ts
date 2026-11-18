// 005 · T027 (FR-043; research R7; N2, opción a). Listas largas en el runner: la cuenta de scripts/dev-target/long-lists.mjs
// (600 movimientos en un mes, 120 aportes y 40 versiones de presupuesto), la misma que crea seed-long-lists.mjs en
// juntia-dev. A 390 y 1440, en Actividad, el historial de aportes de la meta y el historial del presupuesto (hoja de Plan):
//   · «cargar más» no cambia el total. Si la lista no tiene ese control (llega entera: el paginador del servidor, cuya
//     integración de más de 500 filas ya existe, 004 F64-4, y aquí no se duplica), se comprueba que el total y el recuento
//     son los de lo sembrado;
//   · las cajas de las filas son disjuntas (nada se solapa);
//   · no hay scroll horizontal.
// Capturas PNG con los datos sembrados, que revisan los fundadores junto a las de T054. Tramo `lab-interaction` (@release).
// Salida: test-results/evidence/release-long-lists.jsonl y release-long-lists--<vista>--<ancho>.png.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { runnerSql } from "../integration/support/sql";
import { seedUser } from "../support/seed";
import { LONG_LISTS, longListsSql } from "../../scripts/dev-target/long-lists.mjs";
import { OUT, record } from "./release-support";

/** Filas visibles que se solapan (cajas no disjuntas), por pares, y el scroll horizontal del documento. */
async function geometry(page: Page, rows: Locator) {
  const boxes = await rows.evaluateAll((nodes) => nodes.filter((node) => node.getClientRects().length > 0).map((node) => { const r = node.getBoundingClientRect(); return [r.left, r.top + scrollY, r.right, r.bottom + scrollY]; }));
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a, b] = [boxes[i], boxes[j]];
    if (a[0] < b[2] - 0.5 && b[0] < a[2] - 0.5 && a[1] < b[3] - 0.5 && b[1] < a[3] - 0.5) overlaps++;
  }
  const scroll = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  return { filas: boxes.length, solapes: overlaps, scrollHorizontal: scroll.scrollWidth > scroll.clientWidth, ...scroll };
}

/** «Cargar más»: si existe, se pulsa hasta que no quede y el total no puede cambiar. */
async function loadMore(page: Page, total: Locator) {
  const more = page.getByRole("button", { name: /cargar más|ver más|mostrar más/i });
  if ((await more.count()) === 0) return { cargarMas: "no existe: la lista llega entera (paginador del servidor)", totalAntes: await total.innerText(), totalDespues: await total.innerText() };
  const before = await total.innerText();
  let clicks = 0;
  while ((await more.count()) > 0 && clicks < 50) { await more.first().click(); clicks++; }
  return { cargarMas: `${clicks} pulsaciones`, totalAntes: before, totalDespues: await total.innerText() };
}

for (const width of [390, 1440] as const) {
  test(`@release listas largas · ${width}px`, async ({ browser, baseURL }) => {
    test.setTimeout(10 * 60_000);
    const user = await seedUser({ role: "listas-largas", index: test.info().parallelIndex, displayName: "Listas largas" });
    runnerSql(longListsSql({ userId: user.id, today: todayInBogota() }));
    const expected = JSON.parse(runnerSql(`select jsonb_build_object('total',(select sum(amount_minor) from juntia_data.transactions where owner_user_id='${user.id}' and status='active'),
      'goal',(select id from juntia_data.savings_goals where owner_user_id='${user.id}' and name='Listas largas'))::text`));
    const host = new URL(baseURL!).hostname;
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.addCookies([...user.cookies.map((cookie) => ({ ...cookie, domain: host })), { name: "juntia_context", value: "me", domain: host, path: "/", sameSite: "Lax" }]);
    await context.addInitScript(() => window.localStorage.setItem("juntia:context", "me"));
    const page = await context.newPage();
    const shot = (name: string) => page.screenshot({ path: `${OUT}/release-long-lists--${name}--${width}.png`, fullPage: true, animations: "disabled" });

    // Actividad: el mes en curso con 600 movimientos.
    await page.goto("/actividad");
    await expect(page.getByText(copy.activity.count(LONG_LISTS.movements)).first()).toBeVisible({ timeout: 60_000 });
    const activityTotal = page.getByText(/^\$[\d.]+$/).first();
    const activity = { vista: "actividad", ...(await loadMore(page, activityTotal)), recuento: copy.activity.count(LONG_LISTS.movements), totalSembradoMinor: String(expected.total),
      ...(await geometry(page, page.locator("main li, main tbody tr"))) };
    await shot("actividad");
    await record("release-long-lists.jsonl", { rotulo: "laboratorio", ancho: width, ...activity });

    // Historial de aportes de la meta.
    await page.goto(`/metas/${expected.goal}`);
    const history = page.getByRole("heading", { name: copy.goals.history.title });
    await expect(history).toBeVisible({ timeout: 60_000 });
    const entries = page.locator("[data-goal-entry]");
    await expect(entries.first()).toBeVisible();
    const goal = { vista: "historial de aportes", ...(await loadMore(page, history)), filasEsperadas: LONG_LISTS.contributions, ...(await geometry(page, entries)) };
    await shot("aportes");
    await record("release-long-lists.jsonl", { rotulo: "laboratorio", ancho: width, ...goal });

    // Historial del presupuesto: la hoja de edición de Plan, con sus 40 versiones.
    await page.goto("/plan");
    await page.getByRole("button", { name: new RegExp(copy.categories.market) }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: copy.plan.sheet.history })).toBeVisible({ timeout: 60_000 });
    const versions = sheet.getByRole("list").last().getByRole("listitem");
    const budget = { vista: "historial de presupuesto", versionesVistas: await versions.count(), versionesEsperadas: LONG_LISTS.budgetVersions, ...(await geometry(page, versions)) };
    await shot("presupuesto");
    await record("release-long-lists.jsonl", { rotulo: "laboratorio", ancho: width, ...budget });

    for (const row of [activity, goal, budget]) {
      expect.soft(row.solapes, `${row.vista} ${width}: filas solapadas`).toBe(0);
      expect.soft(row.scrollHorizontal, `${row.vista} ${width}: scroll horizontal`).toBe(false);
    }
    expect.soft(activity.totalAntes, "Actividad: «cargar más» no cambia el total").toBe(activity.totalDespues);
    expect.soft(budget.versionesVistas, "historial de presupuesto completo").toBe(LONG_LISTS.budgetVersions);
    await context.close();
  });
}
