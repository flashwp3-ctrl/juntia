// T021 / SC-002: cero violaciones serias o críticas en las rutas implementadas, en los dos temas.
// ADR-011 §2, fila 17: todos los momentos de motion respetan prefers-reduced-motion.
// T040 / FR-051, FR-052: «El job 5 MUST comprobar que de verdad visitó la superficie interna y fallar si no la
// encuentra». FR-012, FR-016: con movimiento reducido, el pulso de Skeleton es estático y la pulsación de Button no
// desplaza ni escala; solo cambia el color.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";

const INTERNAL = "/interno/primitivos";
const routes: readonly string[] = ["/", INTERNAL];
const FRAMES = 10;

// Registra un valor en 10 cuadros seguidos con requestAnimationFrame, dentro de un único evaluate (sin esperas fijas).
async function skeletonFrames(page: Page) {
  return page.evaluate((frames) => new Promise<{ animations: number; opacities: string[] }>((resolve) => {
    const block = document.querySelector<HTMLElement>("[data-skeleton]")!;
    const opacities: string[] = [];
    const tick = () => {
      opacities.push(getComputedStyle(block).opacity);
      if (opacities.length < frames) requestAnimationFrame(tick);
      else resolve({ animations: block.getAnimations().length, opacities });
    };
    requestAnimationFrame(tick);
  }), FRAMES);
}

async function pressFrames(page: Page) {
  return page.evaluate((frames) => new Promise<string[]>((resolve) => {
    const button = document.querySelector<HTMLElement>('[data-theme="light"] button[data-variant="primary"]:not([aria-disabled])')!;
    const rects: string[] = [];
    const tick = () => {
      const { top, height } = button.getBoundingClientRect();
      rects.push(`${top.toFixed(2)}/${height.toFixed(2)}`);
      if (rects.length < frames) requestAnimationFrame(tick);
      else resolve(rects);
    };
    requestAnimationFrame(tick);
  }), FRAMES);
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    for (const route of routes) {
      test(`${route} · ${colorScheme} · ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });
        const response = await page.goto(route);
        expect(response?.status()).toBe(200);
        if (route === INTERNAL) {
          // FR-052: sin el encabezado de la superficie, la visita no cuenta y la prueba falla.
          await expect(page.getByRole("heading", { level: 1, name: copy.internal.title })).toBeVisible();
          await expect(page.locator("[data-skeleton-visible]").first()).toBeAttached();
        }
        const result = await new AxeBuilder({ page }).analyze();
        const blocking = result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
        console.log(`${colorScheme} ${route} ${width}px: ${result.violations.length} violaciones, ${blocking.length} serias o críticas`);
        expect(blocking).toEqual([]);
        const durations = await page.evaluate(() => getComputedStyle(document.body).transitionDuration.split(",").map((value) => value.trim()));
        // Aserciones de movimiento con expect.soft: la prueba falla igual, pero informa de todas a la vez.
        expect.soft(durations.every((value) => value === "0s"), "transición de tema").toBe(true);

        if (route === INTERNAL) {
          // Skeleton: sin animaciones y con la misma opacidad en cada cuadro.
          const skeleton = await skeletonFrames(page);
          expect.soft(skeleton.animations, "animaciones de Skeleton").toBe(0);
          expect.soft(new Set(skeleton.opacities).size, "opacidades distintas de Skeleton").toBe(1);
          // Button primary: con el puntero abajo, su rectángulo no cambia entre cuadros.
          const button = page.locator('[data-theme="light"] button[data-variant="primary"]:not([aria-disabled])').first();
          await button.scrollIntoViewIfNeeded();
          const before = await button.boundingBox();
          await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
          await page.mouse.down();
          const rects = await pressFrames(page);
          await page.mouse.up();
          expect.soft(new Set(rects).size, "rectángulos distintos de Button al presionar").toBe(1);
          console.log(`${colorScheme} ${route} ${width}px: skeleton ${skeleton.animations} animaciones, opacidad ${[...new Set(skeleton.opacities)].join(",")}; button ${rects[0]} en ${rects.length} cuadros`);
        }
      });
    }
  }
}
