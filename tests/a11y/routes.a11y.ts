// T021 / SC-002: cero violaciones serias o críticas en las rutas implementadas, en los dos temas.
// ADR-011 §2, fila 17: todos los momentos de motion respetan prefers-reduced-motion.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes: readonly string[] = ["/"];
for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    for (const route of routes) {
      test(`${route} · ${colorScheme} · ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });
        const response = await page.goto(route);
        expect(response?.status()).toBe(200);
        const result = await new AxeBuilder({ page }).analyze();
        const blocking = result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
        console.log(`${colorScheme} ${route} ${width}px: ${result.violations.length} violaciones, ${blocking.length} serias o críticas`);
        expect(blocking).toEqual([]);
        const durations = await page.evaluate(() => getComputedStyle(document.body).transitionDuration.split(",").map((value) => value.trim()));
        expect(durations.every((value) => value === "0s")).toBe(true);
      });
    }
  }
}
