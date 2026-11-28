// PR del paso 4b, Análisis: abrir la tabla «Ver cifras exactas» de Análisis en Nosotros (octubre de la pareja dorada) y medirla
// en los 7 anchos al 100 % y a 320, 360 y 390 con la raíz al 200 %: documento, `figure`, tabla, la caja de cada fila y de cada
// celda, y su árbol de accesibilidad (`ariaSnapshot`). Lo usan los arneses de Chromium y de WebKit.
import { expect, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";

export async function openFigures(page: Page) {
  await page.goto("/plan/analisis?mes=2026-10");
  const region = (name: string) => page.getByRole("main").getByRole("region", { name });
  await expect(region(copy.analysis.chapters.where).getByRole("img").first()).toBeVisible();
  await region(copy.analysis.chapters.compared).getByRole("button", { name: copy.analysis.compared.show }).click();
  await expect(region(copy.analysis.chapters.compared).getByRole("table")).toBeVisible();
}

export async function measureFigures(page: Page) {
  const out: object[] = [];
  for (const [width, scale] of [...[360, 390, 430, 768, 1024, 1280, 1440].map((value) => [value, ""] as const), [320, ""], [320, "200%"], [360, "200%"], [390, "200%"]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate((value) => { document.documentElement.style.fontSize = value; }, scale);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const table = page.getByRole("main").getByRole("table", { name: copy.analysis.compared.table });
    const geometry = await table.evaluate((node) => {
      const r = (rect: DOMRect) => [rect.left, rect.top, rect.width, rect.height].map((v) => Math.round(v * 100) / 100);
      return {
        document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
        figure: r(node.closest("figure")!.getBoundingClientRect()), table: r(node.getBoundingClientRect()),
        rows: [...node.querySelectorAll("tr")].map((row) => ({ row: r(row.getBoundingClientRect()), cells: [...row.children].map((cell) => ({ text: (cell.textContent ?? "").trim(), box: r(cell.getBoundingClientRect()) })) })),
      };
    });
    out.push({ width, scale: scale || "100%", ...geometry, aria: await table.ariaSnapshot() });
  }
  return out;
}
