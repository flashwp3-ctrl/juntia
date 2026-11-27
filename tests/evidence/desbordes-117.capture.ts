// PR #117, ampliación autorizada por los fundadores el 27 nov 2026 (maestro, decisión 30): diagnóstico de tres posibles
// desbordamientos, para demostrarlos ANTES de cambiar el producto (o documentar que no se reproducen):
//   1. Inicio en Yo a 390 con texto al 200 % («Compartido · tu parte» y «Ver todo»).
//   2. La tabla de Actividad en Nosotros con datos extremos.
//   3. Las filas de aportes a metas dentro de Actividad (Yo y Nosotros) con datos extremos.
// Mide, en cada caso, el ancho del documento y, para cada texto financiero buscado, si está recortado por un ancestro con
// overflow (incluida la elipsis), si sale de la ventana y si queda debajo del panel de detalle (`aside` de Actividad). Corre
// solo con `D117=1 npm run e2e:dev -- tests/evidence/desbordes-117.capture.ts` (y `D117_CASES=inicio,nosotros,metas`), contra
// juntia-dev; no es una prueba ni evidencia de CI. Cada línea JSON es una medición.
import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { formatMoney, moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { contributeToGoal, createGoal, withdrawFromGoal } from "../../src/lib/db/goals";
import { createSharedExpense } from "../../src/lib/db/shared-expenses";
import { createTransaction } from "../../src/lib/db/transactions";
import { updateDisplayName } from "../../src/lib/db/profile";
import { registerSettlement } from "../../src/lib/db/settlements";
import { seedCouple, seedMovements, seedSharedMovements, type SeededUser } from "../support/seed";

test.skip(process.env.D117 !== "1", "Solo a mano: D117=1");
test.describe.configure({ mode: "serial" });

const CASES = (process.env.D117_CASES ?? "inicio,nosotros,metas").split(",");
const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440] as const;
const THEMES = ["light", "dark"] as const;
const LONG = "Remodelación completa del apartamento con muebles nuevos, electrodomésticos, pintura, pisos y el trasteo de todo lo que había en él".padEnd(140, ".");
const GOAL = "Viaje largo a Japón con toda la familia y los abuelos en 2027".slice(0, 60);
const MAX = moneyFromPesos(999_999_999n);
const today = () => todayInBogota();
const key = () => randomUUID();

async function open(browser: Browser, baseURL: string, user: SeededUser, context: "me" | "us", colorScheme: "light" | "dark") {
  const browserContext = await browser.newContext({ baseURL, reducedMotion: "reduce", colorScheme, viewport: { width: 390, height: 900 } });
  await browserContext.addCookies([...user.cookies, { name: "juntia_context", value: context, domain: "localhost", path: "/" }, { name: "juntia_theme", value: colorScheme, domain: "localhost", path: "/" }]);
  await browserContext.addInitScript((value) => window.localStorage.setItem("juntia:context", value), context);
  return { context: browserContext, page: await browserContext.newPage() };
}

/** Documento, tablas y, para cada texto buscado, recorte por un ancestro con overflow, salida de la ventana y solape con el panel. */
async function measure(page: Page, texts: readonly string[]) {
  return page.evaluate((needles) => {
    const root = document.documentElement;
    const aside = [...document.querySelectorAll<HTMLElement>("main aside")].find((node) => node.getClientRects().length > 0) ?? null;
    const asideRect = aside?.getBoundingClientRect() ?? null;
    const tables = [...document.querySelectorAll<HTMLTableElement>("main table")].filter((node) => node.getClientRects().length > 0)
      .map((table) => ({
        table: Math.round(table.getBoundingClientRect().width), column: Math.round((table.closest(".min-w-0") ?? table.parentElement!).getBoundingClientRect().width),
        layout: getComputedStyle(table).tableLayout,
        // Cada fila: su tipo, el ancho de cada celda y, en cada celda, el ancho del contenido más ancho que no se recorta.
        rows: [...table.querySelectorAll("tbody tr")].slice(0, 12).map((row) => ({
          kind: row.hasAttribute("data-goal-row") ? "meta (colSpan)" : row.querySelector("[data-goal-entry]") ? "meta" : "movimiento",
          text: (row.textContent ?? "").trim().slice(0, 40),
          cells: [...row.children].map((cell) => Math.round(cell.getBoundingClientRect().width * 100) / 100),
          widest: [...row.children].map((cell) => Math.max(0, ...[...cell.querySelectorAll<HTMLElement>("*")].map((node) => node.scrollWidth))),
        })),
      }));
    const found = needles.flatMap((needle) => [...document.querySelectorAll<HTMLElement>("main *")]
      .filter((node) => node.getClientRects().length > 0 && [...node.childNodes].some((child) => child.nodeType === 3 && (child.textContent ?? "").includes(needle)))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        let clippedBy: string | null = null;
        for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (style.overflowX !== "visible" || style.overflow !== "visible") {
            const box = parent.getBoundingClientRect();
            if (rect.right > box.right + 1 || rect.left < box.left - 1) { clippedBy = `${parent.tagName.toLowerCase()}.${String(parent.className).split(" ").slice(0, 2).join(".")}`; break; }
          }
        }
        const ownClip = node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).overflow !== "visible";
        const underPanel = asideRect && !aside!.contains(node) ? rect.right > asideRect.left + 1 && rect.left < asideRect.right && rect.bottom > asideRect.top && rect.top < asideRect.bottom : false;
        return { needle, right: Math.round(rect.right), clipped: ownClip || clippedBy !== null, clippedBy, outside: rect.right > root.clientWidth + 1, underPanel };
      }));
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, tables, found };
  }, texts);
}

function log(caseName: string, view: string, colorScheme: string, width: number, extra: object, result: Awaited<ReturnType<typeof measure>>) {
  const problems = result.found.filter((item) => item.clipped || item.outside || item.underPanel);
  console.log(JSON.stringify({ case: caseName, view, colorScheme, width, ...extra, scrollWidth: result.scrollWidth, clientWidth: result.clientWidth, overflow: result.scrollWidth > result.clientWidth, tables: result.tables, found: result.found.length, problems }));
}

test("1 · Inicio en Yo a 390 con texto al 200 %", async ({ browser, baseURL }, info) => {
  test.skip(!CASES.includes("inicio"));
  test.setTimeout(300_000);
  const pair = await seedCouple({ index: info.parallelIndex });
  await Promise.all([seedSharedMovements(pair, "recent"), seedMovements(pair.sara, "recent")]);
  for (const colorScheme of THEMES) {
    const { context, page } = await open(browser, baseURL!, pair.sara, "me", colorScheme);
    await page.goto("/");
    await expect(page.getByText("Compartido · tu parte", { exact: false }).filter({ visible: true }).first()).toBeVisible();
    for (const scale of ["100%", "200%"]) {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.evaluate((value) => { document.documentElement.style.fontSize = value === "100%" ? "" : value; }, scale);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const result = await measure(page, ["Compartido · tu parte", "Ver todo", "$186.400", "$240.000", "$89.900", "$50.000", "+$86.000"]);
      const header = await page.evaluate(() => {
        const link = [...document.querySelectorAll<HTMLElement>("main a")].find((node) => node.textContent?.includes("Ver todo") && node.getClientRects().length > 0)!;
        const row = link.parentElement!;
        return { row: Math.round(row.getBoundingClientRect().width), rowScroll: row.scrollWidth, children: [...row.children].map((child) => `${child.tagName.toLowerCase()} ${Math.round(child.getBoundingClientRect().width)} (${getComputedStyle(child).whiteSpace})`) };
      });
      const parts = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("main span.truncate")]
        .filter((node) => node.textContent?.includes("Compartido · tu parte") && node.getClientRects().length > 0)
        .map((node) => ({ text: (node.textContent ?? "").trim(), client: node.clientWidth, scroll: node.scrollWidth, partRight: Math.round((node.firstElementChild as HTMLElement).getBoundingClientRect().right), boxRight: Math.round(node.getBoundingClientRect().right) })));
      log("inicio-yo", `texto ${scale}`, colorScheme, 390, { header, parts }, result);
      if (process.env.D117_SHOT) {
        await page.locator("#home-recent").scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/d117/${process.env.D117_SHOT}-inicio-${colorScheme}-${scale.replace("%", "")}.png`, animations: "disabled" });
      }
    }
    await context.close();
  }
});

test("2 · Actividad en Nosotros con datos extremos", async ({ browser, baseURL }, info) => {
  test.skip(!CASES.includes("nosotros"));
  test.setTimeout(600_000);
  const pair = await seedCouple({ index: info.parallelIndex });
  const half = moneyFromPesos(499_999_999n);
  const extreme = await createSharedExpense(pair.sara.client, {
    idempotencyKey: key(), amount: moneyFromPesos(999_999_998n), categoryId: "home", transactionDate: today(), description: LONG,
    payerUserId: pair.sara.id, splitMode: "equal", splitPercents: null, allocations: [{ userId: pair.sara.id, amount: half }, { userId: pair.tomas.id, amount: half }],
  });
  await seedSharedMovements(pair, "recent");
  const amount = formatMoney(moneyFromPesos(999_999_998n));
  for (const colorScheme of THEMES) {
    const { context, page } = await open(browser, baseURL!, pair.sara, "us", colorScheme);
    for (const [view, path] of [["lista", "/actividad"], ["panel abierto", `/actividad/${extreme.id}`]] as const) {
      await page.goto(path);
      await expect(page.getByText(amount).filter({ visible: true }).first()).toBeVisible();
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        log("actividad-nosotros", view, colorScheme, width, {}, await measure(page, [amount]));
      }
    }
    await context.close();
  }
});

test("2b · Actividad en Nosotros: una liquidación con los nombres más largos (60)", async ({ browser, baseURL }, info) => {
  test.skip(!CASES.includes("liquidacion"));
  test.setTimeout(600_000);
  const pair = await seedCouple({ index: info.parallelIndex });
  await updateDisplayName(pair.sara.client, "María Fernanda de los Ángeles Restrepo Villegas de la Cruz A");
  await updateDisplayName(pair.tomas.client, "Juan Sebastián de la Santísima Trinidad Echeverri Olarte B");
  const half = moneyFromPesos(50_000n);
  await createSharedExpense(pair.sara.client, {
    idempotencyKey: key(), amount: moneyFromPesos(100_000n), categoryId: "home", transactionDate: today(), description: "Gasto corto",
    payerUserId: pair.sara.id, splitMode: "equal", splitPercents: null, allocations: [{ userId: pair.sara.id, amount: half }, { userId: pair.tomas.id, amount: half }],
  });
  await registerSettlement(pair.tomas.client, { idempotencyKey: key(), amount: moneyFromPesos(20_000n), settlementDate: today(), note: null });
  for (const colorScheme of THEMES) {
    const { context, page } = await open(browser, baseURL!, pair.sara, "us", colorScheme);
    await page.goto("/actividad");
    await expect(page.getByText("$20.000").filter({ visible: true }).first()).toBeVisible();
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      log("liquidacion-nombres-largos", "lista", colorScheme, width, {}, await measure(page, ["$20.000", "$100.000"]));
    }
    await context.close();
  }
});

test("3 · Aportes a metas dentro de Actividad (Yo y Nosotros) con datos extremos", async ({ browser, baseURL }, info) => {
  test.skip(!CASES.includes("metas"));
  test.setTimeout(900_000);
  const pair = await seedCouple({ index: info.parallelIndex });
  // Yo: meta personal de nombre máximo (60), un aporte de 999.999.999 y un retiro con el motivo más largo (140).
  const personal = await createGoal(pair.sara.client, { idempotencyKey: key(), name: GOAL, goalType: "travel", target: MAX, targetMonth: null, context: "me" });
  await contributeToGoal(pair.sara.client, { idempotencyKey: key(), goalId: personal.id, amount: MAX, entryDate: today(), fundingMode: "reserved" });
  await withdrawFromGoal(pair.sara.client, { idempotencyKey: key(), goalId: personal.id, amount: moneyFromPesos(999_999_998n), entryDate: today(), reason: LONG });
  // Nosotros: meta compartida de nombre máximo, aportes de 999.999.999 de cada uno y un retiro con el motivo más largo.
  const shared = await createGoal(pair.sara.client, { idempotencyKey: key(), name: GOAL, goalType: "travel", target: MAX, targetMonth: null, context: "us" });
  await contributeToGoal(pair.sara.client, { idempotencyKey: key(), goalId: shared.id, amount: MAX, entryDate: today(), fundingMode: "reserved" });
  await contributeToGoal(pair.tomas.client, { idempotencyKey: key(), goalId: shared.id, amount: MAX, entryDate: today(), fundingMode: "transferred_declared" });
  await withdrawFromGoal(pair.tomas.client, { idempotencyKey: key(), goalId: shared.id, amount: moneyFromPesos(999_999_998n), entryDate: today(), reason: LONG });
  // Un gasto de cada contexto para abrir el panel de detalle a su lado.
  const own = await createTransaction(pair.sara.client, { idempotencyKey: key(), type: "expense", amount: moneyFromPesos(45000n), categoryId: "transport", transactionDate: today(), description: "Taxi" });
  const [firstShared] = await seedSharedMovements(pair, "recent");
  const texts = [formatMoney(MAX), formatMoney(moneyFromPesos(999_999_998n))];
  for (const [ctx, detail] of [["me", own.id], ["us", firstShared.id]] as const) {
    for (const colorScheme of THEMES) {
      const { context, page } = await open(browser, baseURL!, pair.sara, ctx, colorScheme);
      for (const [view, path] of [["lista", "/actividad"], ["panel abierto", `/actividad/${detail}`]] as const) {
        await page.goto(path);
        await expect(page.getByText(texts[0]).filter({ visible: true }).first()).toBeVisible();
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          log(`aportes-${ctx === "me" ? "yo" : "nosotros"}`, view, colorScheme, width, {}, await measure(page, texts));
        }
      }
      await context.close();
    }
  }
});
