// Diagnóstico del desbordamiento horizontal de «Actividad con datos extremos» a 1440 px (PR aparte autorizado por los
// fundadores el 26 nov 2026; maestro, decisión 30). Siembra los datos extremos de la prueba (seedMovements «extreme»: un gasto de
// 999.999.999 y la descripción más larga que admite el esquema, 140) y el nombre de perfil más largo (60), abre /actividad en
// Yo, con y sin el panel de detalle, y mide la caja de cada pieza de la columna de la lista. Después repite la medición con
// CSS de prueba inyectado SOLO en la página del arnés (no en el producto), para aislar la causa. Corre solo con
// `ACT1440=1 npm run e2e:dev -- tests/evidence/actividad-1440.capture.ts`, contra juntia-dev; no es una prueba ni evidencia de CI.
import { expect, test, type Page } from "@playwright/test";
import { seedMovements, seedUser } from "../support/seed";

test.skip(process.env.ACT1440 !== "1", "Solo a mano: ACT1440=1");

const WIDTHS = (process.env.ACT1440_WIDTHS ?? "1440").split(",").map(Number);

async function measure(page: Page) {
  return page.evaluate(() => {
    const box = (node: Element | null) => (node ? Math.round(node.getBoundingClientRect().width * 100) / 100 : null);
    const table = document.querySelector<HTMLTableElement>("main table");
    const list = table?.closest(".min-w-0");
    const grid = list?.parentElement ?? null;
    const firstRow = table?.querySelector("tbody tr:not([data-goal-row])");
    const cells = firstRow ? [...firstRow.children].map((cell) => box(cell)) : [];
    const title = firstRow?.querySelector<HTMLElement>("td span.truncate") ?? null;
    return {
      viewport: window.innerWidth,
      documentScroll: document.documentElement.scrollWidth,
      grid: box(grid),
      gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      list: box(list ?? null),
      table: box(table),
      tableLayout: table ? getComputedStyle(table).tableLayout : null,
      cells,
      titleClient: title?.clientWidth ?? null,
      titleScroll: title?.scrollWidth ?? null,
      aside: box(document.querySelector("aside")),
    };
  });
}

const EXPERIMENTS: Record<string, string> = {
  "sin cambios": "",
  "table-layout: fixed": "main table { table-layout: fixed; }",
  "1.ª celda max-width: 0": "main table tbody td:first-child { max-width: 0; }",
  "descripción sin nowrap (solo prueba)": "main table td span.truncate { white-space: normal; }",
};

test("Actividad con datos extremos: anchos con y sin panel de detalle, y experimentos de CSS", async ({ browser, baseURL }, info) => {
  test.setTimeout(600_000);
  const user = await seedUser({ role: "act1440", index: info.parallelIndex, displayName: "María Fernanda de los Ángeles Restrepo Villegas de la Cruz A" });
  const rows = await seedMovements(user, "extreme");
  for (const width of WIDTHS) {
    for (const colorScheme of ["light", "dark"] as const) {
      const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, colorScheme, reducedMotion: "reduce" });
      await context.addCookies([...user.cookies, { name: "juntia_theme", value: colorScheme, domain: "localhost", path: "/" }, { name: "juntia_context", value: "me", domain: "localhost", path: "/" }]);
      const page = await context.newPage();
      for (const [label, path] of [["lista", "/actividad"], ["panel abierto", `/actividad/${rows[0].id}`]] as const) {
        await page.goto(path);
        await expect(page.locator("main")).toBeVisible();
        for (const [name, css] of Object.entries(EXPERIMENTS)) {
          const handle = css ? await page.addStyleTag({ content: css }) : null;
          const result = await measure(page);
          console.log(JSON.stringify({ width, colorScheme, view: label, experiment: name, ...result }));
          // Con ACT1440_SHOT=<etiqueta>, una captura de la vista sin CSS de prueba (para revisar a ojo el antes y el después).
          if (!css && process.env.ACT1440_SHOT) await page.screenshot({ path: `test-results/act1440/${process.env.ACT1440_SHOT}-${label.replace(" ", "-")}-${colorScheme}-${width}.png`, fullPage: false, animations: "disabled" });
          if (handle) await handle.evaluate((node) => (node as HTMLElement).remove());
        }
      }
      await context.close();
    }
  }
});
