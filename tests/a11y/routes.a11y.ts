// T021 / SC-002 (001): cero violaciones serias o críticas en las rutas implementadas, en los dos temas.
// ADR-011 §2, fila 17: todos los momentos de motion respetan prefers-reduced-motion.
// T040 / FR-051, FR-052 (001): «El job 5 MUST comprobar que de verdad visitó la superficie interna y fallar si no la
// encuentra». FR-012, FR-016: con movimiento reducido, el pulso de Skeleton es estático y la pulsación de Button no
// desplaza ni escala; solo cambia el color.
// T060 / FR-040, FR-043; SC-002, SC-010 (001): las rutas de producto y una URL inexistente, que responde 404 con el
// estado de «no encontrado» diseñado. Con movimiento reducido, la perilla del selector salta y el aviso de Anotar aparece
// sin desplazarse ni escalar (ADR-011 §2, fila 17).
// T051 / FR-067; SC-002 (002): el recorrido sale de tests/a11y/route-registry.ts. Con A11Y_JOB=app (job app) audita los
// estados sin sesión; con A11Y_JOB=e2e (job e2e, con Supabase en el runner) los que necesitan sesión de usuario o de
// recuperación, con una cuenta sembrada (T049), y los que necesitan la respuesta real de Auth. Dos temas, 390 y 1440.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";
import { seedUser } from "../support/seed";
import { openWithSession, reach, targetPath } from "../support/states";
import { appEntries, e2eEntries, THEMES } from "./route-registry";

const JOB = process.env.A11Y_JOB === "e2e" ? "e2e" : "app";
// T084: los estados marcados `axe: false` solo se capturan (T098); su hoja ya se audita en otro estado.
const entries = (JOB === "e2e" ? e2eEntries : appEntries).filter((entry) => entry.axe !== false);
const INTERNAL = "/interno/primitivos";
const NOT_FOUND = "/ruta-que-no-existe";
const PRODUCT = ["/", "/actividad", "/metas", "/plan", "/balance", "/cuenta"] as const;
const FRAMES = 10;
// F17-R2: cada pasada mide el panel de su propio tema. El selector apunta a la sección del panel, no a <html>,
// que también lleva data-theme por el script de tema.
const panel = (colorScheme: "light" | "dark") => `section[data-theme="${colorScheme}"]`;

// Registra un valor en 10 cuadros seguidos con requestAnimationFrame, dentro de un único evaluate (sin esperas fijas).
async function skeletonFrames(page: Page, scope: string) {
  return page.evaluate(([frames, root]) => new Promise<{ animations: number; opacities: string[] }>((resolve) => {
    const block = document.querySelector<HTMLElement>(`${root} [data-skeleton]`)!;
    const opacities: string[] = [];
    const tick = () => {
      opacities.push(getComputedStyle(block).opacity);
      if (opacities.length < frames) requestAnimationFrame(tick);
      else resolve({ animations: block.getAnimations().length, opacities });
    };
    requestAnimationFrame(tick);
  }), [FRAMES, scope] as const);
}

// Perilla del Segmented: activa «Nosotros» y registra su x en cada cuadro, dentro de un único evaluate. Vuelve a «Yo».
async function knobFrames(page: Page) {
  return page.evaluate((frames) => new Promise<{ xs: number[] }>((resolve) => {
    const group = [...document.querySelectorAll<HTMLElement>('[data-context-selector] [role="radiogroup"]')].find((node) => node.getClientRects().length > 0)!;
    const us = group.querySelector<HTMLElement>('[data-value="us"]')!;
    us.click();
    const xs: number[] = [];
    const tick = () => {
      xs.push(Math.round(group.querySelector("[data-segmented-knob]")!.getBoundingClientRect().x * 100) / 100);
      if (xs.length < frames) requestAnimationFrame(tick);
      else { group.querySelector<HTMLElement>('[data-value="me"]')!.click(); resolve({ xs }); }
    };
    requestAnimationFrame(tick);
  }), FRAMES);
}

// Aviso de Anotar: lo abre su disparador visible y registra el rectángulo del diálogo o de la hoja en cada cuadro.
async function annotateFrames(page: Page) {
  return page.evaluate((frames) => new Promise<{ container: string; rects: string[] }>((resolve) => {
    const trigger = [...document.querySelectorAll<HTMLElement>("[data-annotate-trigger]")].find((node) => node.getClientRects().length > 0)!;
    trigger.click();
    const rects: string[] = [];
    let container = "";
    const tick = () => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (dialog) {
        container = dialog.hasAttribute("data-modal") ? "diálogo" : "hoja";
        const { top, left, width, height } = dialog.getBoundingClientRect();
        rects.push([top, left, width, height].map((value) => value.toFixed(2)).join("/"));
      }
      if (rects.length < frames) requestAnimationFrame(tick);
      else resolve({ container, rects });
    };
    requestAnimationFrame(tick);
  }), FRAMES);
}

async function pressFrames(page: Page, scope: string) {
  return page.evaluate(([frames, root]) => new Promise<string[]>((resolve) => {
    const button = document.querySelector<HTMLElement>(`${root} button[data-variant="primary"]:not([aria-disabled])`)!;
    const rects: string[] = [];
    const tick = () => {
      const { top, height } = button.getBoundingClientRect();
      rects.push(`${top.toFixed(2)}/${height.toFixed(2)}`);
      if (rects.length < frames) requestAnimationFrame(tick);
      else resolve(rects);
    };
    requestAnimationFrame(tick);
  }), [FRAMES, scope] as const);
}

// Hallazgo de la prueba manual del PR B (5 nov 2026): el campo pintaba dos marcos de foco, el anillo del diseño en el
// marco y el outline global de :focus-visible en el <input>. Con el foco puesto desde el teclado (Tab), cada campo de
// texto visible tiene un solo indicador: el <input> sin outline y el marco con el anillo de focus.ring.
async function fieldFocusRings(page: Page) {
  const count = await page.locator("label input:not([type=hidden]):not([type=checkbox]):not(:disabled):visible").count();
  const results: { name: string; focused: boolean; input: string; frame: string }[] = [];
  for (let index = 0; index < count; index++) {
    const input = page.locator("label input:not([type=hidden]):not([type=checkbox]):not(:disabled):visible").nth(index);
    // F43-2: el foco llega por teclado al campo que se mide. Se enfoca el campo, Shift+Tab sale al anterior y Tab vuelve:
    // así :focus-visible es de teclado aunque un envío previo haya dejado el foco en un botón (A1b, A1d). Si el campo es el
    // primero de la página, Shift+Tab sale del documento y Tab vuelve a él. Se comprueba qué elemento quedó enfocado.
    await input.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    results.push(await input.evaluate((node) => {
      const own = getComputedStyle(node);
      const frame = getComputedStyle(node.parentElement!);
      return { name: node.getAttribute("name") ?? node.getAttribute("type") ?? "", focused: document.activeElement === node, input: own.outlineStyle, frame: `${frame.outlineStyle} ${frame.outlineWidth} ${frame.outlineColor}` };
    }));
  }
  return results;
}

// F17-2 / FR-037: área clicable real ≥ 44 × 44. Combina la caja del elemento con su ::after posicionado y
// comprueba con elementFromPoint que las cuatro esquinas de un cuadrado de 44 centrado caen en el mismo control.
async function touchArea(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((element) => {
    const box = element.getBoundingClientRect();
    const after = getComputedStyle(element, "::after");
    const extended = after.content !== "none" && after.position === "absolute";
    const px = (value: string) => (extended && value.endsWith("px") ? parseFloat(value) : 0);
    const width = Math.max(box.width, box.width - px(after.left) - px(after.right));
    const height = Math.max(box.height, box.height - px(after.top) - px(after.bottom));
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    // ±21 px: dentro del cuadrado de 44 y fuera del medio píxel que comparten dos segmentos contiguos.
    const corners = [[-21, -21], [21, -21], [-21, 21], [21, 21]].map(([dx, dy]) => {
      const hit = document.elementFromPoint(cx + dx, cy + dy);
      return Boolean(hit && (hit === element || element.contains(hit)));
    });
    return { width: Math.round(width * 100) / 100, height: Math.round(height * 100) / 100, corners: corners.every(Boolean) };
  });
}

// D-02 (T077) / FR-013, FR-037: todo el marco visible de Input y AmountInput enfoca su <input>. Para cada campo habilitado
// del panel, un clic real en las cuatro esquinas del marco (el padre del <input>), a 5 px de cada borde para quedar
// dentro del radio de 14, y después del clic el foco tiene que estar en el <input>. Devuelve el marco y las esquinas.
async function fieldCorners(page: Page, scope: string) {
  const inputs = page.locator(`${scope} input:not([disabled])`);
  const results: { label: string; frame: string; corners: boolean[] }[] = [];
  for (let index = 0; index < await inputs.count(); index++) {
    const input = inputs.nth(index);
    // Se centra el marco, no el <input>: el <input> puede quedar visible con el borde inferior del marco fuera de la ventana.
    const { label, box } = await input.evaluate((element) => {
      element.parentElement!.scrollIntoView({ block: "center" });
      const frame = element.parentElement!.getBoundingClientRect();
      const labelledBy = element.getAttribute("aria-labelledby");
      const label = (labelledBy ? document.getElementById(labelledBy) : (element as HTMLInputElement).labels?.[0])?.textContent ?? "";
      return { label, box: { x: frame.x, y: frame.y, width: frame.width, height: frame.height } };
    });
    const corners: boolean[] = [];
    for (const [x, y] of [[box.x + 5, box.y + 5], [box.x + box.width - 5, box.y + 5], [box.x + 5, box.y + box.height - 5], [box.x + box.width - 5, box.y + box.height - 5]]) {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.mouse.click(x, y);
      corners.push(await input.evaluate((element) => document.activeElement === element));
    }
    results.push({ label, frame: `${box.width.toFixed(2)}×${box.height.toFixed(2)}`, corners });
  }
  return results;
}


for (const colorScheme of THEMES) {
  for (const width of [390, 1440]) {
    for (const entry of entries) {
      test(`${entry.route} · ${entry.state} · ${colorScheme} · ${width}px`, async ({ page: base, browser, baseURL }, testInfo) => {
        const page = await openWithSession(browser, base, entry, colorScheme, width, testInfo.parallelIndex, baseURL!);
        const route = entry.route;
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });
        if (entry.session !== "recovery") {
          const response = await page.goto(targetPath(page, entry));
          // Una ruta que no existe nunca cuenta como verificada: 200 en las que existen, 404 en la inexistente.
          expect(response?.status()).toBe(entry.status ?? 200);
        }
        if (route === NOT_FOUND) {
          await expect(page.getByRole("heading", { level: 1, name: copy.states.notFound })).toBeVisible();
        }
        if (route === INTERNAL) {
          // FR-052: sin el encabezado de la superficie, la visita no cuenta y la prueba falla.
          await expect(page.getByRole("heading", { level: 1, name: copy.internal.title })).toBeVisible();
          await expect(page.locator("[data-skeleton-visible]").first()).toBeAttached();
        }
        await reach(page, entry, testInfo.parallelIndex);
        // Los momentos de motion de las rutas de producto se miden en su estado base, no con una hoja o un aviso abiertos.
        const isProduct = (PRODUCT as readonly string[]).includes(route) && !entry.prepare;
        const result = await new AxeBuilder({ page }).analyze();
        const blocking = result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
        console.log(`${colorScheme} ${route} · ${entry.state} ${width}px: ${result.violations.length} violaciones, ${blocking.length} serias o críticas`);
        expect(blocking).toEqual([]);
        const durations = await page.evaluate(() => getComputedStyle(document.body).transitionDuration.split(",").map((value) => value.trim()));
        // Aserciones de movimiento con expect.soft: la prueba falla igual, pero informa de todas a la vez.
        expect.soft(durations.every((value) => value === "0s"), "transición de tema").toBe(true);
        for (const ring of await fieldFocusRings(page)) {
          console.log(`${colorScheme} ${route} · ${entry.state} ${width}px: foco del campo «${ring.name}»${ring.focused ? "" : " (SIN FOCO)"}: input ${ring.input}, marco ${ring.frame}`);
          expect.soft(ring.focused, `«${ring.name}»: recibió el foco con el teclado`).toBe(true);
          expect.soft(ring.input, `«${ring.name}»: el <input> no pinta su propio outline`).toBe("none");
          expect.soft(ring.frame.startsWith("solid"), `«${ring.name}»: el marco lleva el anillo de foco`).toBe(true);
        }
  
        if (isProduct) {
          // Hidratado: los manejadores de React ya están. El selector existe en el DOM en todas las rutas de producto.
          await expect(page.locator("[data-context-selector][data-hydrated]").first()).toBeAttached();
          // El selector existe en todas salvo /cuenta por debajo de 1280 (contracts/routes.md).
          const hasSelector = await page.locator("[data-context-selector][data-hydrated]").evaluateAll((nodes) => nodes.some((node) => node.getClientRects().length > 0));
          if (hasSelector) {
            const knob = await knobFrames(page);
            expect.soft(new Set(knob.xs).size, "posiciones distintas de la perilla").toBe(1);
            console.log(`${colorScheme} ${route} ${width}px: perilla ${knob.xs[0]} en ${knob.xs.length} cuadros, ${new Set(knob.xs).size} posición(es)`);
          } else {
            console.log(`${colorScheme} ${route} ${width}px: sin selector en este ancho`);
          }
          // /cuenta por debajo de 1024 es una pantalla apilada sin barra: no tiene disparador visible (FR-033).
          const hasTrigger = await page.locator("[data-annotate-trigger]").evaluateAll((nodes) => nodes.some((node) => node.getClientRects().length > 0));
          if (hasTrigger) {
            const notice = await annotateFrames(page);
            expect.soft(notice.rects.length, "cuadros con el aviso").toBe(FRAMES);
            expect.soft(new Set(notice.rects).size, "rectángulos distintos del aviso").toBe(1);
            console.log(`${colorScheme} ${route} ${width}px: aviso en ${notice.container}, ${new Set(notice.rects).size} rectángulo(s) en ${notice.rects.length} cuadros`);
            await page.keyboard.press("Escape");
            await expect(page.getByRole("dialog")).toHaveCount(0);
          } else {
            console.log(`${colorScheme} ${route} ${width}px: sin disparador visible de Anotar`);
          }
        }
  
        if (route === INTERNAL) {
          // Skeleton: sin animaciones y con la misma opacidad en cada cuadro.
          const scope = panel(colorScheme);
          const skeleton = await skeletonFrames(page, scope);
          expect.soft(skeleton.animations, "animaciones de Skeleton").toBe(0);
          expect.soft(new Set(skeleton.opacities).size, "opacidades distintas de Skeleton").toBe(1);
          // Button primary: con el puntero abajo, su rectángulo no cambia entre cuadros.
          const button = page.locator(`${scope} button[data-variant="primary"]:not([aria-disabled])`).first();
          await button.scrollIntoViewIfNeeded();
          const before = await button.boundingBox();
          await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
          await page.mouse.down();
          const rects = await pressFrames(page, scope);
          await page.mouse.up();
          expect.soft(new Set(rects).size, "rectángulos distintos de Button al presionar").toBe(1);
          // F17-2: etiquetas cortas. «Yo» del Segmented y un Button sm de solo ícono.
          for (const [name, selector] of [["Segmented «Yo»", `${scope} [role="radio"]:text-is("${copy.context.me}")`], ["Button sm solo ícono", `${scope} [data-touch-probe]`]] as const) {
            await page.locator(selector).first().scrollIntoViewIfNeeded();
            const area = await touchArea(page, selector);
            console.log(`${colorScheme} ${route} ${width}px: área táctil ${name} [${scope}] ${area.width}×${area.height}, esquinas de 44 ${area.corners ? "dentro" : "fuera"}`);
            expect.soft(area.width, `${name}: ancho clicable`).toBeGreaterThanOrEqual(44);
            expect.soft(area.height, `${name}: alto clicable`).toBeGreaterThanOrEqual(44);
            expect.soft(area.corners, `${name}: las esquinas de 44 × 44 caen en el control`).toBe(true);
          }
          const fields = await fieldCorners(page, scope);
          expect(fields.length, "campos habilitados medidos").toBe(7);
          for (const field of fields) {
            console.log(`${colorScheme} ${route} ${width}px: campo «${field.label}» marco ${field.frame}, esquinas que enfocan ${field.corners.filter(Boolean).length}/4 [${field.corners.map((hit) => (hit ? "sí" : "no")).join(" ")}]`);
            expect.soft(field.corners, `«${field.label}»: las cuatro esquinas del marco enfocan el <input>`).toEqual([true, true, true, true]);
          }
          // D-05 (T077) / FR-014; COMPONENT_SPECIFICATIONS.md §Input (Monto): los dígitos de AmountInput van entre 28 y
          // 40 px (clamp), y el Input de texto conserva body.m. jsdom no aplica el CSS de Tailwind: esta es la capa más
          // baja que ve el tamaño calculado. El marco conserva su alto: 64 px en AmountInput y 48 en Input.
          const sizes = await page.locator(`${scope} input:not([disabled])`).evaluateAll((nodes) => nodes.map((node) => ({
            amount: node.getAttribute("inputmode") === "numeric",
            value: (node as HTMLInputElement).value,
            size: parseFloat(getComputedStyle(node).fontSize),
            body: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--body-m-size")),
            frame: node.parentElement!.getBoundingClientRect().height,
            clipped: node.scrollWidth > node.clientWidth,
          })));
          for (const { amount, value, size, body, frame, clipped } of sizes) {
            console.log(`${colorScheme} ${route} ${width}px: ${amount ? "AmountInput" : "Input"} «${value}» a ${size} px, marco de ${frame} px${clipped ? ", cortado" : ""}`);
            if (amount) {
              expect.soft(size >= 28 && size <= 40, `AmountInput «${value}»: ${size} px fuera de 28–40`).toBe(true);
              expect.soft(clipped, `AmountInput «${value}»: sin cortar`).toBe(false);
            } else {
              expect.soft(size, `Input: body.m`).toBe(body);
            }
            expect.soft(frame, `${amount ? "AmountInput" : "Input"} «${value}»: alto del marco`).toBe(amount ? 64 : 48);
          }
          console.log(`${colorScheme} ${route} ${width}px: skeleton ${skeleton.animations} animaciones, opacidad ${[...new Set(skeleton.opacities)].join(",")}; button ${rects[0]} en ${rects.length} cuadros`);
        }
        if (page !== base) await page.context().close();
      });
    }
  }
}

// F19-1 (revisión del PR #19) / FR-020, FR-033: Anotar siempre a un toque. La pantalla apilada de /cuenta, sin barra, es
// solo móvil (< 768, RESPONSIVE_SPECIFICATIONS.md §Cuenta); a 768 y más conserva la barra de tablet con su Anotar visible.
// No es una spec E2E: visita la ruta y mira qué disparador queda visible, en la misma capa que el resto de este archivo.
// Con sesión: solo en el job e2e (T051).
for (const colorScheme of JOB === "e2e" ? THEMES : []) {
  for (const [width, barVisible] of [[390, false], [768, true]] as const) {
    test(`/cuenta · ${colorScheme} · ${width}px: barra ${barVisible ? "visible con Anotar" : "oculta (pantalla apilada)"}`, async ({ browser, baseURL }, testInfo) => {
      const context = await browser.newContext({ baseURL, reducedMotion: "reduce" });
      await context.addCookies((await seedUser({ role: "axe-barra", index: testInfo.parallelIndex })).cookies);
      const page = await context.newPage();
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      expect((await page.goto("/cuenta"))?.status()).toBe(200);
      await expect(page.locator("[data-context-selector][data-hydrated]").first()).toBeAttached();
      const bar = page.locator('[data-annotate-trigger="bar"]');
      if (barVisible) {
        await expect(bar).toBeVisible();
        await bar.click();
        await expect(page.getByRole("dialog", { name: copy.annotate.title.expense })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
      } else {
        await expect(bar).toBeHidden();
        await expect(page.getByRole("link", { name: copy.account.back })).toBeVisible();
      }
      const visibleTriggers = await page.locator("[data-annotate-trigger]").evaluateAll((nodes) => nodes.filter((node) => node.getClientRects().length > 0).length);
      console.log(`${colorScheme} /cuenta ${width}px: disparadores de Anotar visibles ${visibleTriggers}`);
      expect(visibleTriggers).toBe(barVisible ? 1 : 0);
      await context.close();
    });
  }
}
