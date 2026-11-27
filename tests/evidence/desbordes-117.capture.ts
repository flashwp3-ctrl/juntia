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
import { mkdir, writeFile } from "node:fs/promises";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { formatMoney, moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { contributeToGoal, createGoal, withdrawFromGoal } from "../../src/lib/db/goals";
import { createSharedExpense } from "../../src/lib/db/shared-expenses";
import { createTransaction } from "../../src/lib/db/transactions";
import { updateDisplayName } from "../../src/lib/db/profile";
import { registerSettlement } from "../../src/lib/db/settlements";
import { copy } from "../../src/lib/copy/es";
import { seedCouple, seedMovements, seedSharedMovements, seedUser, type SeededUser } from "../support/seed";

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

// Ronda 2 (F117-3): la fecha de la línea «Compartido · tu parte $X · fecha». Para cada fila compartida: el ancho de la fecha
// frente al de su texto (lo que se ve), si comparte línea con «tu parte» y cuántas líneas ocupa la línea entera.
test("1b · Inicio en Yo: la fecha de la parte compartida a 360, 390 y al 200 %", async ({ browser, baseURL }, info) => {
  test.skip(!CASES.includes("fecha"));
  test.setTimeout(300_000);
  const pair = await seedCouple({ index: info.parallelIndex });
  await Promise.all([seedSharedMovements(pair, "recent"), seedMovements(pair.sara, "recent")]);
  const { context, page } = await open(browser, baseURL!, pair.sara, "me", "light");
  await page.goto("/");
  await expect(page.getByText("Compartido · tu parte", { exact: false }).filter({ visible: true }).first()).toBeVisible();
  for (const [width, scale] of [[360, ""], [390, ""], [430, ""], [390, "200%"], [1280, "200%"], [1440, "200%"]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate((value) => { document.documentElement.style.fontSize = value; }, scale);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const dates = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("main [data-shared-part] span")]
      .filter((node) => node.children.length === 0 && (node.textContent ?? "").startsWith("· ") && node.getClientRects().length > 0)
      .map((node) => {
        const part = node.previousElementSibling as HTMLElement;
        const line = node.parentElement!;
        const lineHeight = parseFloat(getComputedStyle(line).lineHeight);
        return { date: node.textContent, visible: Math.round(node.clientWidth), needs: node.scrollWidth, sameLine: Math.abs(part.getBoundingClientRect().top - node.getBoundingClientRect().top) < 2, lines: Math.round(line.getBoundingClientRect().height / lineHeight) };
      }));
    console.log(JSON.stringify({ case: "fecha", width, scale: scale || "100%", dates }));
    if (process.env.D117_SHOT) {
      await page.locator("#home-recent").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/d117/${process.env.D117_SHOT}-fecha-${width}-${scale ? "200" : "100"}.png`, animations: "disabled" });
    }
  }
  await context.close();
});

// Ronda 2 (F117-2): de dónde sale el ancho de la columna de la lista en Actividad con la raíz al 200 % a 1280 y 1440. Mide el
// ancho de la navegación lateral, el padding del `main`, la rejilla lista/panel (columnas y hueco) y la tabla.
test("4 · Actividad al 200 % en escritorio: la rejilla del shell", async ({ browser, baseURL }, info) => {
  test.skip(!CASES.includes("shell200"));
  test.setTimeout(300_000);
  const pair = await seedCouple({ index: info.parallelIndex });
  const [first] = await seedMovements(pair.sara, "extreme");
  const { context, page } = await open(browser, baseURL!, pair.sara, "me", "light");
  for (const [view, path] of [["lista", "/actividad"], ["panel abierto", `/actividad/${first.id}`]] as const) {
    await page.goto(path);
    await expect(page.getByText(formatMoney(MAX)).filter({ visible: true }).first()).toBeVisible();
    for (const [width, scale] of [[1280, ""], [1280, "200%"], [1440, ""], [1440, "200%"]] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate((value) => { document.documentElement.style.fontSize = value; }, scale);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const shell = await page.evaluate(() => {
        const visible = (node: Element) => node.getClientRects().length > 0;
        const main = document.querySelector("main")!;
        const nav = [...document.querySelectorAll("nav")].filter(visible).map((node) => Math.round(node.getBoundingClientRect().width));
        const table = [...main.querySelectorAll("table")].find(visible) ?? null;
        const grid = table ? (() => { for (let node = table.parentElement; node && node !== main; node = node.parentElement) { const style = getComputedStyle(node); if (style.display === "grid") return { columns: style.gridTemplateColumns, gap: style.columnGap, width: Math.round(node.getBoundingClientRect().width) }; } return null; })() : null;
        const css = getComputedStyle(main);
        return { main: Math.round(main.getBoundingClientRect().width), mainPadding: `${css.paddingLeft} ${css.paddingRight}`, nav, grid, table: table ? Math.round(table.getBoundingClientRect().width) : null, column: table ? Math.round((table.closest(".min-w-0") ?? table.parentElement!).getBoundingClientRect().width) : null, document: document.documentElement.scrollWidth };
      });
      console.log(JSON.stringify({ case: "shell200", view, width, scale: scale || "100%", ...shell }));
      if (process.env.D117_SHOT && scale) await page.screenshot({ path: `test-results/d117/${process.env.D117_SHOT}-shell200-${view.replace(" ", "-")}-${width}.png`, animations: "disabled" });
    }
  }
  await context.close();
});

// Ronda 2, defecto B (autorizado el 27 nov 2026): el detalle de un gasto compartido a pantalla completa con la raíz al 200 %.
// Con los nombres de 60 y el reparto de 499.999.999: el documento y, por cada bloque del detalle con un importe, su ancho frente
// al del artículo y el de cada hijo (avatar, nombre, importe), con su ancho mínimo de contenido.
test("5 · Detalle de un gasto compartido al 200 %", async ({ browser, baseURL }, info) => {
  test.skip(!CASES.includes("detalle"));
  test.setTimeout(300_000);
  const pair = await seedCouple({ index: info.parallelIndex });
  await updateDisplayName(pair.sara.client, "María Fernanda de los Ángeles Restrepo Villegas de la Cruz A");
  await updateDisplayName(pair.tomas.client, "Juan Sebastián de la Santísima Trinidad Echeverría Olarte JB");
  const half = moneyFromPesos(499_999_999n);
  const extreme = await createSharedExpense(pair.sara.client, {
    idempotencyKey: key(), amount: moneyFromPesos(999_999_998n), categoryId: "home", transactionDate: today(), description: LONG,
    payerUserId: pair.sara.id, splitMode: "equal", splitPercents: null, allocations: [{ userId: pair.sara.id, amount: half }, { userId: pair.tomas.id, amount: half }],
  });
  for (const colorScheme of THEMES) {
    const { context, page } = await open(browser, baseURL!, pair.sara, "us", colorScheme);
    await page.goto(`/actividad/${extreme.id}`);
    await expect(page.locator("[data-transaction-detail]").first()).toBeVisible();
    for (const [width, scale] of [[360, ""], [390, ""], [360, "200%"], [390, "200%"], [430, "200%"], [768, "200%"], [1024, "200%"]] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate((value) => { document.documentElement.style.fontSize = value; }, scale);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const detail = await page.evaluate(() => {
        const article = [...document.querySelectorAll<HTMLElement>("[data-transaction-detail]")].find((node) => node.getClientRects().length > 0)!;
        const box = article.getBoundingClientRect();
        const wide = [...article.querySelectorAll<HTMLElement>("li, dl > div, p, h2")].filter((node) => node.getBoundingClientRect().right > box.right + 1 || node.scrollWidth > node.clientWidth + 1)
          .map((node) => ({ tag: node.tagName.toLowerCase(), text: (node.textContent ?? "").trim().slice(0, 40), right: Math.round(node.getBoundingClientRect().right), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
            children: [...node.children].map((child) => `${child.tagName.toLowerCase()} ${Math.round(child.getBoundingClientRect().width)} (${getComputedStyle(child).flex})`) }));
        return { document: document.documentElement.scrollWidth, article: Math.round(box.width), articleRight: Math.round(box.right), wide };
      });
      console.log(JSON.stringify({ case: "detalle-compartido", colorScheme, width, scale: scale || "100%", ...detail }));
      if (process.env.D117_SHOT && scale && width === 390) {
        await page.getByText("A quién le corresponde", { exact: false }).first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/d117/${process.env.D117_SHOT}-detalle-${colorScheme}-390-200.png`, animations: "disabled" });
      }
    }
    await context.close();
  }
});

// Ronda 2, defecto A: tres formas de llevar el texto al 200 % en Actividad a 1280 y 1440, con el panel abierto. (a) La de la
// suite: `html { font-size: 200% }`. (b) El ajuste de tamaño de letra del navegador: tamaño por defecto de 32 px (CDP
// `Page.setFontSizes`), que también mueve los cortes en rem de las media queries. (c) El zoom del navegador al 200 %: la ventana
// CSS es la mitad (640 / 720) con DPR 2. Mide la navegación, la rejilla, la tabla o la lista y el documento.
test("6 · Actividad: tres formas del 200 % en escritorio", async ({ browser, baseURL }, info) => {
  test.skip(!CASES.includes("zoom200"));
  test.setTimeout(300_000);
  const pair = await seedCouple({ index: info.parallelIndex });
  const [first] = await seedMovements(pair.sara, "extreme");
  for (const mode of ["raíz 200 %", "letra del navegador 32 px", "zoom 200 %"] as const) {
    for (const width of [1280, 1440]) {
      const zoom = mode === "zoom 200 %";
      const browserContext = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width: zoom ? width / 2 : width, height: zoom ? 450 : 900 }, deviceScaleFactor: zoom ? 2 : 1 });
      await browserContext.addCookies([...pair.sara.cookies, { name: "juntia_context", value: "me", domain: "localhost", path: "/" }]);
      await browserContext.addInitScript(() => window.localStorage.setItem("juntia:context", "me"));
      const page = await browserContext.newPage();
      if (mode === "letra del navegador 32 px") {
        const cdp = await browserContext.newCDPSession(page);
        await cdp.send("Page.enable");
        await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32, fixed: 26 } });
      }
      await page.goto(`/actividad/${first.id}`);
      await expect(page.getByText(formatMoney(MAX)).filter({ visible: true }).first()).toBeVisible();
      if (mode === "raíz 200 %") await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const shell = await page.evaluate(() => {
        const visible = (node: Element) => node.getClientRects().length > 0;
        const main = document.querySelector("main")!;
        const grid = [...main.querySelectorAll<HTMLElement>("div")].find((node) => getComputedStyle(node).display === "grid" && node.querySelector(":scope > aside"));
        return {
          rootFont: getComputedStyle(document.documentElement).fontSize, viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth,
          nav: [...document.querySelectorAll("nav")].filter(visible).map((node) => `${Math.round(node.getBoundingClientRect().width)}×${Math.round(node.getBoundingClientRect().height)}`),
          main: Math.round(main.getBoundingClientRect().width), grid: grid ? getComputedStyle(grid).gridTemplateColumns : "sin rejilla (una columna)",
          table: [...main.querySelectorAll("table")].some(visible), listVisible: [...main.querySelectorAll("[data-transaction-id]")].filter((node) => !node.closest("aside") && visible(node)).length,
          detail: [...main.querySelectorAll("[data-transaction-detail]")].some(visible),
        };
      });
      console.log(JSON.stringify({ case: "zoom200", mode, width, ...shell }));
      if (process.env.D117_SHOT) await page.screenshot({ path: `test-results/d117/${process.env.D117_SHOT}-zoom200-${mode.replace(/[^a-z0-9]+/gi, "-")}-${width}.png`, animations: "disabled" });
      await browserContext.close();
    }
  }
});

// Ronda 3 (F117-5): el ancho real del contenedor `@container/actividad` (el abuelo del `aside` del panel) y la disposición de
// Actividad entre 1024 y 1440 al 100 %, con la lista y con el detalle abierto: navegación, `main`, contenedor, rejilla, tabla, y la
// visibilidad de la × del detalle y de la cabecera móvil «Volver».
test("7 · Actividad: el contenedor entre 1024 y 1440 al 100 %", async ({ browser, baseURL }, info) => {
  test.skip(!CASES.includes("contenedor"));
  test.setTimeout(300_000);
  const pair = await seedCouple({ index: info.parallelIndex });
  const [first] = await seedMovements(pair.sara, "extreme");
  const { context, page } = await open(browser, baseURL!, pair.sara, "me", "light");
  for (const [view, path] of [["lista", "/actividad"], ["detalle abierto", `/actividad/${first.id}`]] as const) {
    await page.goto(path);
    await expect(page.getByText(formatMoney(MAX)).filter({ visible: true }).first()).toBeVisible();
    for (const width of [1024, 1100, 1200, 1279, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const layout = await page.evaluate(() => {
        const visible = (node: Element | null | undefined) => Boolean(node && node.getClientRects().length > 0);
        const main = document.querySelector("main")!;
        const aside = main.querySelector("aside");
        const grid = aside?.parentElement ?? null;
        const container = grid?.parentElement ?? null;
        const links = [...document.querySelectorAll<HTMLElement>("a")];
        return {
          nav: [...document.querySelectorAll("nav")].filter(visible).map((node) => Math.round(node.getBoundingClientRect().width)),
          main: Math.round(main.getBoundingClientRect().width), container: container ? Math.round(container.getBoundingClientRect().width) : null,
          containerRem: container ? Math.round((container.getBoundingClientRect().width / parseFloat(getComputedStyle(document.documentElement).fontSize)) * 100) / 100 : null,
          grid: grid && getComputedStyle(grid).display === "grid" ? getComputedStyle(grid).gridTemplateColumns : "una columna",
          table: [...main.querySelectorAll("table")].some(visible), dayList: [...main.querySelectorAll("a[data-transaction-id]")].filter((node) => visible(node) && !node.closest("table") && !node.closest("aside")).length,
          close: links.some((node) => node.textContent?.includes("Cerrar detalle") && visible(node)), back: links.some((node) => node.textContent?.includes("Volver a Actividad") && visible(node)),
          document: document.documentElement.scrollWidth,
        };
      });
      console.log(JSON.stringify({ case: "contenedor", view, width, ...layout }));
      if (process.env.D117_SHOT && (width === 1200 || width === 1279)) await page.screenshot({ path: `test-results/d117/${process.env.D117_SHOT}-contenedor-${view.replace(" ", "-")}-${width}.png`, animations: "disabled" });
    }
  }
  await context.close();
});

// Ronda 3, fecha privada de ExpenseRow (autorizada el 27 nov 2026, «dale la opcion 1»): la geometría de cada ExpenseRow visible
// en las pantallas que lo usan (Inicio en Yo sin pareja y con pareja, y la lista por días de Actividad en Yo), en los 7 anchos al
// 100 % y a 390, 1280 y 1440 con la raíz al 200 %. Por fila: alto de la fila y de la línea de meta, y caja de «Solo tú» y de la
// fecha (geometría del texto) con su recorte. Se escribe en `test-results/d117/expenserow-{D117_TAG}.json` para comparar el antes
// y el después. Las filas en vuelo (pending-home) son el mismo componente; solo existen mientras se guarda.
test("8 · ExpenseRow: geometría de la fecha privada en todas sus pantallas", async ({ browser, baseURL }, info) => {
  test.skip(!CASES.includes("expenserow"));
  test.setTimeout(600_000);
  const solo = await seedUser({ role: "expenserow", index: info.parallelIndex });
  await seedMovements(solo, "recent");
  const pair = await seedCouple({ index: info.parallelIndex });
  await Promise.all([seedSharedMovements(pair, "recent"), seedMovements(pair.sara, "recent")]);
  const out: object[] = [];
  for (const [screen, user, path] of [["Inicio · sin pareja", solo, "/"], ["Actividad · Yo", solo, "/actividad"], ["Inicio · Yo con pareja", pair.sara, "/"]] as const) {
    const { context, page } = await open(browser, baseURL!, user, "me", "light");
    await page.goto(path);
    await expect(page.locator("main a.row-stack[data-transaction-id]").filter({ visible: true }).first()).toBeVisible();
    for (const [width, scale] of [...[360, 390, 430, 768, 1024, 1280, 1440].map((value) => [value, ""] as const), [390, "200%"], [1280, "200%"], [1440, "200%"]] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate((value) => { document.documentElement.style.fontSize = value; }, scale);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const rows = await page.evaluate((onlyYou) => [...document.querySelectorAll<HTMLElement>("main a.row-stack[data-transaction-id], main div.row-stack[data-transaction-id]")]
        .filter((row) => row.getClientRects().length > 0 && row.querySelector("svg") && (row.textContent ?? "").includes(onlyYou))
        .map((row) => {
          const meta = [...row.querySelectorAll<HTMLElement>("span")].find((node) => node.textContent?.includes(onlyYou) && node.querySelector("svg"))!;
          const walker = document.createTreeWalker(meta, NodeFilter.SHOW_TEXT);
          const nodes: { node: Text; start: number }[] = [];
          let all = "";
          for (let node = walker.nextNode(); node; node = walker.nextNode()) { nodes.push({ node: node as Text, start: all.length }); all += (node as Text).data; }
          const box = (from: number, to: number) => {
            const rects = nodes.filter(({ node, start }) => start < to && start + node.data.length > from).flatMap(({ node, start }) => {
              const range = document.createRange();
              range.setStart(node, Math.max(0, from - start));
              range.setEnd(node, Math.min(node.data.length, to - start));
              return [...range.getClientRects()].filter((rect) => rect.width > 0);
            });
            if (!rects.length) return null;
            const left = Math.min(...rects.map((r) => r.left)), right = Math.max(...rects.map((r) => r.right)), top = Math.min(...rects.map((r) => r.top));
            // Recortado: alguna parte fuera de un ancestro con overflow (también la elipsis).
            let clipped = false;
            for (let parent = nodes[0].node.parentElement; parent && parent !== row; parent = parent.parentElement) {
              const css = getComputedStyle(parent);
              if (css.overflowX === "visible" && css.overflowY === "visible") continue;
              const b = parent.getBoundingClientRect();
              if (left < b.left - 0.5 || right > b.right + 0.5) clipped = true;
            }
            return { left: Math.round(left * 10) / 10, top: Math.round(top * 10) / 10, width: Math.round((right - left) * 10) / 10, clipped };
          };
          const dateStart = all.indexOf("·") >= 0 ? all.indexOf("·") + 1 : all.length;
          const dateText = all.slice(dateStart).replace(/ ·$/, "").trim();
          const dateFrom = all.indexOf(dateText, dateStart);
          return {
            id: row.dataset.transactionId, row: Math.round(row.getBoundingClientRect().height * 10) / 10, meta: Math.round(meta.getBoundingClientRect().height * 10) / 10,
            onlyYou: box(all.indexOf(onlyYou), all.indexOf(onlyYou) + onlyYou.length), date: dateText, dateBox: box(dateFrom, dateFrom + dateText.length),
          };
        }), copy.row.onlyYou);
      out.push({ screen, width, scale: scale || "100%", rows });
    }
    await context.close();
  }
  await mkdir("test-results/d117", { recursive: true });
  await writeFile(`test-results/d117/expenserow-${process.env.D117_TAG ?? "medida"}.json`, JSON.stringify(out, null, 1));
  console.log(`expenserow: ${out.length} combinaciones, ${out.reduce((sum, item) => sum + (item as { rows: unknown[] }).rows.length, 0)} filas medidas`);
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
  await updateDisplayName(pair.tomas.client, "Juan Sebastián de la Santísima Trinidad Echeverría Olarte JB");
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
