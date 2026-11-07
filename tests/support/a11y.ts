// PR B de la 003 (T031d, T038) y PR C (T044b, T055): comprobaciones de accesibilidad compartidas por los archivos a11y de
// pareja. Barrido de siete anchos sin scroll horizontal, texto al 200 %, objetivos de 44 px con boundingBox, teclado hasta
// un control por su nombre y axe sin violaciones serias ni críticas. Ninguna espera fija (ADR-011 §6).
import AxeBuilder from "@axe-core/playwright";
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { SeededUser } from "./seed";

export const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440] as const;
const THEMES = ["light", "dark"] as const;

/** Sin scroll horizontal y sin texto cortado en el `main` (o en el diálogo abierto). */
export async function overflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const dialogs = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')];
    const scope = dialogs[dialogs.length - 1] ?? document.querySelector("main") ?? document.body;
    const clipped = [...scope.querySelectorAll<HTMLElement>("h1, h2, h3, p, a, button, label, span")]
      // Fuera lo oculto a propósito para lectores de pantalla (sr-only: 1 px recortado), que no es texto perdido.
      .filter((node) => node.getClientRects().length > 0 && node.children.length === 0 && node.getBoundingClientRect().width > 1 && node.scrollWidth > node.clientWidth + 1
        && !["ellipsis"].includes(getComputedStyle(node).textOverflow) && getComputedStyle(node).overflow !== "visible")
      .map((node) => `${node.tagName.toLowerCase()} «${(node.textContent ?? "").trim().slice(0, 40)}»`);
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, clipped };
  });
}

/** Barrido de los siete anchos en los dos temas sobre la página ya en su estado. */
export async function sweep(page: Page, label: string) {
  for (const colorScheme of THEMES) {
    await page.emulateMedia({ colorScheme });
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      const result = await overflow(page);
      console.log(`${label} · ${colorScheme} · ${width}px: scrollWidth ${result.scrollWidth} / clientWidth ${result.clientWidth}${result.clipped.length ? `, cortado: ${result.clipped.join(", ")}` : ""}`);
      expect.soft(result.scrollWidth, `${label} · ${colorScheme} · ${width}px: sin scroll horizontal`).toBeLessThanOrEqual(result.clientWidth);
    }
  }
}

/** Texto al 200 % a 390: sin scroll horizontal ni texto cortado. */
export async function largeText(page: Page, label: string) {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  const result = await overflow(page);
  console.log(`${label} · 200 %: scrollWidth ${result.scrollWidth} / ${result.clientWidth}; cortado: ${result.clipped.length}`);
  expect.soft(result.scrollWidth, `${label} · 200 %: sin scroll horizontal`).toBeLessThanOrEqual(result.clientWidth);
  expect.soft(result.clipped, `${label} · 200 %: sin texto cortado`).toEqual([]);
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
}

/**
 * Objetivo táctil de 44 × 44: la caja del control y, si la extiende, su ::after posicionado (F17-2: así llega Segmented a
 * 44 de alto, como mide touchArea en routes.a11y.ts). Una casilla o un campo mide la de su <label>, que es lo que se toca.
 */
export async function target44(page: Page, name: string | RegExp, role: "button" | "link" | "radio" | "checkbox" | "textbox" = "button") {
  const box = await page.getByRole(role, { name, exact: typeof name === "string" }).first().evaluate((element) => {
    const target = (element.tagName === "INPUT" && (element as HTMLInputElement).labels?.[0]) || element;
    const rect = target.getBoundingClientRect();
    const after = getComputedStyle(target, "::after");
    const extended = after.content !== "none" && after.position === "absolute";
    const px = (value: string) => (extended && value.endsWith("px") ? parseFloat(value) : 0);
    return { width: Math.max(rect.width, rect.width - px(after.left) - px(after.right)), height: Math.max(rect.height, rect.height - px(after.top) - px(after.bottom)) };
  });
  console.log(`objetivo «${name}»: ${box?.width.toFixed(1)}×${box?.height.toFixed(1)}`);
  expect.soft(box?.width ?? 0, `«${name}»: ancho`).toBeGreaterThanOrEqual(44);
  expect.soft(box?.height ?? 0, `«${name}»: alto`).toBeGreaterThanOrEqual(44);
}

/** Tab hasta el control con ese nombre accesible (sin ratón). */
export async function tabTo(page: Page, name: string | RegExp, limit = 40) {
  const seen: string[] = [];
  for (let step = 0; step < limit; step++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element) return "";
      const labelledBy = element.getAttribute("aria-labelledby");
      const byId = labelledBy ? labelledBy.split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ") : null;
      return (element.getAttribute("aria-label") ?? byId ?? (element as HTMLInputElement).labels?.[0]?.textContent ?? element.innerText ?? "").replace(/\s+/g, " ").trim();
    });
    seen.push(label);
    if (typeof name === "string" ? label === name : name.test(label)) return;
  }
  throw new Error(`El teclado no llega a «${name}»; recorrió: ${seen.slice(0, 15).map((item) => `«${item}»`).join(", ")}`);
}

export async function signedContext(browser: Browser, baseURL: string, user: SeededUser, colorScheme: "light" | "dark" = "light", context?: "me" | "us"): Promise<{ context: BrowserContext; page: Page }> {
  const browserContext = await browser.newContext({ baseURL, reducedMotion: "reduce", colorScheme, viewport: { width: 390, height: 900 } });
  await browserContext.addCookies(user.cookies);
  if (context) {
    await browserContext.addCookies([{ name: "juntia_context", value: context, domain: new URL(baseURL).hostname, path: "/" }]);
    await browserContext.addInitScript((value) => window.localStorage.setItem("juntia:context", value), context);
  }
  return { context: browserContext, page: await browserContext.newPage() };
}

export async function axe(page: Page, label: string) {
  // Axe audita el estado en reposo: el puntero no deja un botón en hover (como reach() en tests/support/states.ts).
  await page.mouse.move(0, 0);
  // Y con los diálogos ya visibles del todo: a mitad de su aparición, axe mide colores con opacidad parcial.
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll("[role=dialog], [role=alertdialog]")].every((node) => getComputedStyle(node).opacity === "1"))).toBe(true);
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
  console.log(`${label}: ${result.violations.length} violaciones, ${blocking.length} serias o críticas${blocking.length ? ` (${blocking.map(({ id }) => id).join(", ")})` : ""}`);
  expect.soft(blocking, label).toEqual([]);
}
