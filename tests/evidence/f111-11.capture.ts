// F111-11 (revisión del PR #111, ronda 2): diagnóstico de las dos E2E que fallaron en `e2e:dev` completo y pasaron aisladas:
// «gasto con meta en dos sesiones» (el aviso de aprobar no llegó en 5 s) y «Cambiar Yo/Nosotros» (la URL de Actividad no
// llegó en 5 s). No es una prueba ni evidencia de CI: corre solo con `F111_11=1 npm run e2e:dev --
// tests/evidence/f111-11.capture.ts`, contra juntia-dev, y reproduce la carga de la suite (5 workers) con CONCURRENCY
// flujos a la vez. Por cada flujo guarda un trace de Playwright y una línea JSON con los tiempos y, en la aprobación, el
// estado final de la solicitud leído con `usageRequests` (la sesión de Sara), que la E2E no llega a comprobar cuando falla
// el aviso. No sube timeouts de ninguna prueba ni cambia nada del producto.
import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { expect, test, type Browser } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { copy } from "../../src/lib/copy/es";
import { createExpenseWithGoal, usageRequests } from "../../src/lib/db/goal-usage";
import { contributeToGoal, createGoal } from "../../src/lib/db/goals";
import { createSharedExpense } from "../../src/lib/db/shared-expenses";
import { seedCouple, type SeededUser } from "../support/seed";

const OUT = "test-results/f111-11";
const CONCURRENCY = 5;
const today = () => todayInBogota();
const pesos = (value: bigint) => moneyFromPesos(value);
const key = () => randomUUID();

test.skip(process.env.F111_11 !== "1", "Solo a mano: F111_11=1");
test.describe.configure({ mode: "serial" });

const record = async (row: object) => {
  await mkdir(OUT, { recursive: true });
  await appendFile(`${OUT}/f111-11.jsonl`, `${JSON.stringify(row)}\n`);
  console.log(JSON.stringify(row));
};

async function open(browser: Browser, baseURL: string, user: SeededUser, context: "me" | "us") {
  const browserContext = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  await browserContext.addCookies([...user.cookies, { name: "juntia_context", value: context, domain: "localhost", path: "/" }]);
  await browserContext.addInitScript((value) => window.localStorage.setItem("juntia:context", value), context);
  await browserContext.tracing.start({ screenshots: true, snapshots: true });
  return { context: browserContext, page: await browserContext.newPage() };
}

test("aprobar con fondos suficientes, 5 a la vez: tiempos del clic a la respuesta y al aviso, y estado final de la solicitud", async ({ browser, baseURL }, info) => {
  test.setTimeout(600_000);
  await Promise.all(Array.from({ length: CONCURRENCY }, async (_, run) => {
    const pair = await seedCouple({ index: info.parallelIndex });
    const goal = await createGoal(pair.sara.client, { idempotencyKey: key(), name: "Japón", goalType: "travel", target: pesos(2000000n), targetMonth: null, context: "us" });
    await contributeToGoal(pair.sara.client, { idempotencyKey: key(), goalId: goal.id, amount: pesos(300000n), entryDate: today(), fundingMode: "reserved" });
    await contributeToGoal(pair.tomas.client, { idempotencyKey: key(), goalId: goal.id, amount: pesos(200000n), entryDate: today(), fundingMode: "transferred_declared" });
    const expense = await createExpenseWithGoal(pair.sara.client, {
      context: "us", idempotencyKey: key(), amount: pesos(60000n), categoryId: "restaurants", transactionDate: today(), description: `Diagnóstico ${run}`,
      payerUserId: pair.sara.id, splitMode: "equal", splitPercents: null,
      allocations: [{ userId: pair.sara.id, amount: pesos(30000n) }, { userId: pair.tomas.id, amount: pesos(30000n) }], goalId: goal.id, own: pesos(30000n), requested: pesos(30000n),
    });
    await record({ flow: "aprobar", run, step: "sembrado", at: new Date().toISOString() });
    const { context, page } = await open(browser, baseURL!, pair.tomas, "us");
    const posts: { ms: number; status: number }[] = [];
    page.on("requestfinished", async (request) => {
      if (request.method() !== "POST") return;
      const timing = request.timing();
      posts.push({ ms: Math.round(timing.responseEnd), status: (await request.response())?.status() ?? 0 });
    });
    await page.goto("/");
    const card = page.locator("[data-usage-request]:visible").first();
    const approve = card.getByRole("button", { name: copy.goalExpense.request.approve("$30.000") });
    await expect(approve).toBeVisible({ timeout: 30_000 });
    await record({ flow: "aprobar", run, step: "tarjeta visible", at: new Date().toISOString() });
    const start = Date.now();
    await approve.click();
    let toastMs: number | null = null;
    try {
      await expect(page.getByRole("status").filter({ hasText: copy.goalExpense.request.approved("Japón") }).first()).toBeVisible({ timeout: 30_000 });
      toastMs = Date.now() - start;
    } catch { toastMs = null; }
    await record({ flow: "aprobar", run, step: "tras el aviso", clickToToastMs: toastMs, at: new Date().toISOString() });
    const alert = await card.getByRole("alert").textContent({ timeout: 1000 }).catch(() => null);
    const final = (await usageRequests(pair.sara.client)).find((row) => row.id === expense.request_id)?.status ?? "no encontrada";
    await context.tracing.stop({ path: `${OUT}/trace-aprobar-${run}.zip` });
    await record({ flow: "aprobar", run, clickToToastMs: toastMs, within5s: toastMs !== null && toastMs <= 5000, posts, alert, finalStatus: final });
    await context.close();
  }));
});

test("Nosotros: Inicio → Actividad desde la navegación, 5 a la vez: tiempo hasta la URL", async ({ browser, baseURL }, info) => {
  test.setTimeout(600_000);
  await Promise.all(Array.from({ length: CONCURRENCY }, async (_, run) => {
    const pair = await seedCouple({ index: info.parallelIndex });
    await createSharedExpense(pair.sara.client, { idempotencyKey: key(), amount: pesos(186400n), categoryId: "market", transactionDate: today(), description: `Diagnóstico ${run}`,
      payerUserId: pair.sara.id, splitMode: "equal", splitPercents: null, allocations: [{ userId: pair.sara.id, amount: pesos(93200n) }, { userId: pair.tomas.id, amount: pesos(93200n) }] });
    const { context, page } = await open(browser, baseURL!, pair.sara, "us");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /gastaron juntos/ })).toBeVisible({ timeout: 30_000 });
    const start = Date.now();
    await page.getByRole("navigation", { name: copy.shell.navigation }).getByRole("link", { name: copy.nav.activity }).click();
    let urlMs: number | null = null;
    try { await expect(page).toHaveURL(/\/actividad/, { timeout: 30_000 }); urlMs = Date.now() - start; } catch { urlMs = null; }
    await context.tracing.stop({ path: `${OUT}/trace-actividad-${run}.zip` });
    await record({ flow: "navegar-actividad", run, clickToUrlMs: urlMs, within5s: urlMs !== null && urlMs <= 5000 });
    await context.close();
  }));
});
