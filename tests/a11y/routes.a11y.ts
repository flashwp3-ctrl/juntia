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
import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy/es";
import { analyzeAtRest } from "../support/a11y";
import { seedCouple, seedMovements, seedUser } from "../support/seed";
import { runnerSql } from "../integration/support/sql";
import { openWithSession, reach, targetPath } from "../support/states";
import { appEntries, e2eEntries, routeArea, routeAreaFilter, THEMES } from "./route-registry";

const JOB = process.env.A11Y_JOB === "e2e" ? "e2e" : "app";
// T084: los estados marcados `axe: false` solo se capturan (T098); su hoja ya se audita en otro estado.
// Decisión de los fundadores del 11 nov 2026: A11Y_ROUTE_AREAS (scripts/a11y-select.mjs) limita el nivel ligero a las áreas
// del PR; sin la variable, con un valor desconocido o en el barrido, todo el registro (route-registry.ts, routeAreaFilter).
const areas = routeAreaFilter();
const inAreas = (route: string) => !areas || areas.has(routeArea(route));
// F82-1 (revisión del PR #82): `axe: false` evita repetir axe, no la geometría. Esos estados se visitan igual, solo para
// layoutChecks (sin AxeBuilder), con el mismo filtro por área.
const entries = (JOB === "e2e" ? e2eEntries : appEntries).filter((entry) => inAreas(entry.route));
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
// PR D (T084): con un diálogo abierto (Anotar, confirmar), solo cuentan sus campos: lo de detrás queda inerte bajo el
// diálogo modal y el teclado no puede llegar ahí, como debe ser.
async function fieldFocusRings(page: Page) {
  const dialogs = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible');
  const scope = (await dialogs.count()) > 0 ? dialogs.last() : page.locator("body");
  // PR B de la 003: los radios de A6 (tarjetas con el radio nativo oculto) no son campos de texto; su foco es la tarjeta.
  const fields = scope.locator("label input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not(:disabled):visible");
  const count = await fields.count();
  const results: { name: string; focused: boolean; input: string; frame: string }[] = [];
  for (let index = 0; index < count; index++) {
    const input = fields.nth(index);
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

// Decisión de los fundadores del 17 nov 2026. Un solo evaluate sobre la página ya cargada, sin navegar ni esperar:
// 1. Ancho: `scrollWidth <= clientWidth` del documento. El 11 nov entró a producción Actividad a 585 px de ancho a 390
//    (nombres sr-only absolutos que escapaban del scroller de fichas) y ningún gate lo vio. Si se desborda, devuelve los
//    elementos más externos que pasan del borde derecho sin que los recorte un `overflow-x` distinto de visible. El recorte
//    sigue la cadena de bloques contenedores, no el DOM: un absoluto solo lo recorta su bloque contenedor o algo por encima
//    de él, que es justo lo que falló en Actividad. F82-2: el bloque contenedor lo crea un ancestro posicionado (solo para
//    absolutos) o uno con transform, filter, perspective, contain (paint, layout, strict, content) o will-change de esas
//    propiedades (también para fijos). Un fijo sin ese ancestro va contra la ventana, no alarga el documento y no cuenta.
// 2. Campos: con la media de globals.css (`(width < 48rem), (pointer: coarse)`), cada campo de texto con caja (también el
//    de fecha invisible de Anotar) calcula al menos 1rem, para que Safari de iPhone no amplíe la página al enfocarlo. F82-3:
//    la media y el valor real de 1rem se leen en la página (`floor`, `null` si la media no aplica).
const TEXT_FIELDS = 'input:not([type="hidden"], [type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="button"], [type="submit"], [type="reset"], [type="image"]), textarea, select';
async function layoutChecks(page: Page) {
  return page.evaluate((selector) => {
    const root = document.documentElement;
    const viewport = root.clientWidth;
    const describe = (element: Element) => {
      const classes = (element.getAttribute("class") ?? "").trim().split(/\s+/).slice(0, 6).join(".");
      const text = (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      return `<${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${classes ? `.${classes}` : ""}> «${text}» hasta ${Math.round(element.getBoundingClientRect().right)} px`;
    };
    const establishesContainingBlock = (element: Element, forFixed: boolean) => {
      const style = getComputedStyle(element);
      if (!forFixed && style.position !== "static") return true;
      return style.transform !== "none" || style.filter !== "none" || style.perspective !== "none"
        || /\b(paint|layout|strict|content)\b/.test(style.contain) || /\b(transform|filter|perspective)\b/.test(style.willChange);
    };
    const clipped = (element: Element) => {
      let node: Element = element;
      for (;;) {
        const position = getComputedStyle(node).position;
        let parent = node.parentElement;
        if (position === "absolute" || position === "fixed") {
          const forFixed = position === "fixed";
          while (parent && parent !== root && !establishesContainingBlock(parent, forFixed)) parent = parent.parentElement;
          // Un fijo contra la ventana no alarga el documento: no es culpable.
          if (forFixed && (!parent || parent === root)) return true;
        }
        if (!parent || parent === root) return false;
        if (getComputedStyle(parent).overflowX !== "visible") return true;
        node = parent;
      }
    };
    const offenders: Element[] = [];
    if (root.scrollWidth > viewport) {
      for (const element of document.body.querySelectorAll("*")) {
        if (element.getBoundingClientRect().right <= viewport + 0.5) continue;
        if (offenders.some((outer) => outer.contains(element)) || clipped(element)) continue;
        offenders.push(element);
      }
    }
    const fields = [...document.querySelectorAll(selector)].filter((field) => field.getClientRects().length > 0).map((field) => ({
      name: field.getAttribute("aria-label") ?? field.getAttribute("placeholder") ?? (field as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? field.getAttribute("type") ?? field.tagName.toLowerCase(),
      size: parseFloat(getComputedStyle(field).fontSize),
    }));
    const floor = matchMedia("(width < 48rem), (pointer: coarse)").matches ? parseFloat(getComputedStyle(root).fontSize) : null;
    return { scrollWidth: root.scrollWidth, clientWidth: viewport, offenders: offenders.slice(0, 8).map(describe), fields, floor };
  }, TEXT_FIELDS);
}

async function assertLayout(page: Page, label: string) {
  const layout = await layoutChecks(page);
  console.log(`${label}: ancho ${layout.scrollWidth}/${layout.clientWidth}; campos ${layout.fields.map(({ name, size }) => `«${name}» ${size}`).join(", ") || "ninguno"}${layout.floor === null ? "" : ` (suelo ${layout.floor})`}`);
  expect.soft(layout.scrollWidth, `ancho del documento a ${layout.clientWidth} px; se salen: ${layout.offenders.join(" · ") || "(ninguno sin recorte)"}`).toBeLessThanOrEqual(layout.clientWidth);
  const { floor } = layout;
  if (floor !== null) {
    expect.soft(layout.fields.filter(({ size }) => size < floor), `campos de texto por debajo de 1rem (${floor} px): Safari de iPhone amplía al enfocarlos`).toEqual([]);
  }
}

for (const colorScheme of THEMES) {
  for (const width of [390, 1440]) {
    for (const entry of entries) {
      // Decisión 21: el nivel ligero de cada PR es 390; 1440 es parte del barrido completo (@sweep, a mano).
      const geometryOnly = entry.axe === false;
      test(`${entry.route} · ${entry.state} · ${geometryOnly ? "solo geometría · " : ""}${colorScheme} · ${width}px`, width === 390 ? {} : { tag: "@sweep" }, async ({ page: base, browser, baseURL }, testInfo) => {
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
        if (geometryOnly) {
          await assertLayout(page, `${colorScheme} ${route} · ${entry.state} ${width}px (solo geometría)`);
          if (page !== base) await page.context().close();
          return;
        }
        // Los momentos de motion de las rutas de producto se miden en su estado base, no con una hoja o un aviso abiertos.
        const isProduct = (PRODUCT as readonly string[]).includes(route) && !entry.prepare;
        // Flakes del PR C («/recuperar · A4b · dark · 390») y del gate del PR #66 («/cuenta/pareja · M3b enlace listo · light
        // · 390», run 42543237243), los dos de document-title: tras una Server Action, Next vuelve a transmitir los metadatos
        // y el <title> desaparece un instante, también a mitad del escaneo. analyzeAtRest audita `document-title` aparte,
        // cuando document.title ya no está vacío; si de verdad faltara, la espera falla igual.
        const result = await analyzeAtRest(page);
        const blocking = result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
        console.log(`${colorScheme} ${route} · ${entry.state} ${width}px: ${result.violations.length} violaciones, ${blocking.length} serias o críticas`);
        expect(blocking).toEqual([]);
        await assertLayout(page, `${colorScheme} ${route} · ${entry.state} ${width}px`);
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
            // F13: el token está en rem; una sonda con `font-size: var(--body-m-size)` da su valor en px para compararlo con el
            // tamaño calculado del Input (antes se leía el texto del token, que ahora es «0.9375rem»).
            body: (() => {
              const probe = document.createElement("span");
              probe.style.fontSize = "var(--body-m-size)";
              document.body.appendChild(probe);
              const px = parseFloat(getComputedStyle(probe).fontSize);
              probe.remove();
              return px;
            })(),
            // F82-3: el suelo de globals.css, leído en la página: la misma media y el valor real de 1rem; null si no aplica.
            floor: matchMedia("(width < 48rem), (pointer: coarse)").matches ? parseFloat(getComputedStyle(document.documentElement).fontSize) : null,
            frame: node.parentElement!.getBoundingClientRect().height,
            clipped: node.scrollWidth > node.clientWidth,
          })));
          for (const { amount, value, size, body, floor, frame, clipped } of sizes) {
            console.log(`${colorScheme} ${route} ${width}px: ${amount ? "AmountInput" : "Input"} «${value}» a ${size} px, marco de ${frame} px${clipped ? ", cortado" : ""}`);
            if (amount) {
              expect.soft(size >= 28 && size <= 40, `AmountInput «${value}»: ${size} px fuera de 28–40`).toBe(true);
              expect.soft(clipped, `AmountInput «${value}»: sin cortar`).toBe(false);
            } else {
              // 17 nov 2026: con la media de globals.css, el campo calcula al menos 1rem (--field-text-min).
              expect.soft(size, `Input: body.m${floor === null ? "" : `, con suelo de ${floor} px`}`).toBe(floor === null ? body : Math.max(floor, body));
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
for (const colorScheme of JOB === "e2e" && inAreas("/cuenta") ? THEMES : []) {
  for (const [width, barVisible] of [[390, false], [768, true]] as const) {
    test(`/cuenta · ${colorScheme} · ${width}px: barra ${barVisible ? "visible con Anotar" : "oculta (pantalla apilada)"}`, width === 390 ? {} : { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
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

// ─── 005 · T020 (FR-040, FR-042, FR-046; Q11; research R8). Casos nuevos del barrido (@sweep, a mano), con sesión ──────────
// (a) texto al 200 % en hojas, diálogos, acceso A1–A6 e invitación; (b) raíz al 200 % a 1440 en Inicio · Yo y en Metas,
// sin scroll horizontal: Inicio · Yo FALLA en `main` hasta el PR B (1.447 px, residuo de F13; interpretación I3, sin
// `fixme` que lo esconda); Metas, con el abanico de Nosotros, hoy mide 1.440 en juntia-dev; (c) Anotar con un monto escrito, de 390 a 1024 px y vuelta: el monto sigue; (d) al llegar por URL a la meta
// inmersiva y cerrar con Escape, el foco vuelve a su tarjeta (lección 004-T084, punto 3).
const root200 = (page: Page) => page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
const overflow = (page: Page) => page.evaluate(() => {
  const doc = { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
  const dialogs = [...document.querySelectorAll<HTMLElement>("[role='dialog'], [role='alertdialog']")].filter((node) => node.getClientRects().length > 0)
    .map((node) => ({ name: node.getAttribute("aria-label") ?? node.querySelector("h1, h2, h3")?.textContent?.trim() ?? "diálogo", scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
  return { doc, dialogs };
});
const twoFrames = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

if (JOB === "e2e") test.describe("005 · barrido de PR A (T020)", () => {
  // (a) Los estados del registro que abren una hoja o un diálogo, el acceso A1–A6 y la invitación sin sesión.
  const TEXT_200 = ["A1", "A2", "A3", "A4", "A5", "A6", "M5 sin sesión", "Anotar E1 gasto", "Anotar E2 detalles", "Edición", "Diálogo de eliminar",
    "M3 crear invitación", "M4 confirmación de anular", "D2 · hoja de exportar"];
  for (const state of TEXT_200) {
    test(`texto al 200 %: ${state} · teléfono (390) · sin scroll horizontal en la página ni en la hoja`, { tag: "@sweep" }, async ({ page: base, browser, baseURL }, testInfo) => {
      const entry = [...e2eEntries, ...appEntries].find((item) => item.state === state);
      if (!entry) throw new Error(`El registro no tiene el estado ${state}`);
      const page = await openWithSession(browser, base, entry, "light", 390, testInfo.parallelIndex, baseURL!);
      await page.setViewportSize({ width: 390, height: 900 });
      if (entry.session !== "recovery") await page.goto(targetPath(page, entry));
      await reach(page, entry, testInfo.parallelIndex);
      await root200(page);
      await twoFrames(page);
      const result = await overflow(page);
      console.log(`200 % · ${state}: página ${result.doc.scrollWidth}/${result.doc.clientWidth}; ${result.dialogs.map((d) => `«${d.name}» ${d.scrollWidth}/${d.clientWidth}`).join(", ") || "sin hoja"}`);
      // Con desbordamiento, una captura con los datos sembrados para la lista de hallazgos (no es evidencia por sí sola).
      if (result.doc.scrollWidth > result.doc.clientWidth || result.dialogs.some((d) => d.scrollWidth > d.clientWidth)) {
        await page.screenshot({ path: `test-results/a11y-200/texto-200--${state.replace(/[^\p{L}\p{N}]+/gu, "-")}--390.png`, fullPage: false, animations: "disabled" });
      }
      expect.soft(result.doc.scrollWidth, `${state}: scroll horizontal de la página al 200 %`).toBeLessThanOrEqual(result.doc.clientWidth);
      for (const dialog of result.dialogs) expect.soft(dialog.scrollWidth, `${state}: «${dialog.name}» se sale al 200 %`).toBeLessThanOrEqual(dialog.clientWidth);
      if (page !== base) await page.context().close();
    });
  }

  // (b) y (d) con la pareja del dataset dorado: Inicio en Yo (Bicicleta de ruta) y Metas en Nosotros, con el abanico de Japón.
  for (const target of [{ name: "Inicio · Yo", path: "/", context: "me" }, { name: "Metas", path: "/metas", context: "us" }] as const) {
    test(`raíz al 200 % a 1440: ${target.name} sin scroll horizontal (residuo de F13)`, { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
      const pair = await seedCouple({ index: testInfo.parallelIndex, golden: true });
      await seedMovements(pair.sara, "recent");
      const context = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
      const host = new URL(baseURL!).hostname;
      await context.addCookies([...pair.sara.cookies.map((cookie) => ({ ...cookie, domain: host })), { name: "juntia_context", value: target.context, domain: host, path: "/" }]);
      await context.addInitScript((value) => window.localStorage.setItem("juntia:context", value), target.context);
      const page = await context.newPage();
      await page.goto(target.path);
      await expect(page.locator("[data-goal-stack]").first()).toBeVisible();
      await root200(page);
      await twoFrames(page);
      const { doc } = await overflow(page);
      console.log(`raíz 200 % · ${target.name} · 1440: ${doc.scrollWidth}/${doc.clientWidth}`);
      expect(doc.scrollWidth, `${target.name}: el documento mide ${doc.scrollWidth} px a 1440 con la raíz al 200 %`).toBeLessThanOrEqual(doc.clientWidth);
      await context.close();
    });
  }

  test("Anotar con un monto escrito, de 390 a 1024 px y vuelta: el monto sigue en el campo (Q11; R8)", { tag: "@sweep" }, async ({ page: base, browser, baseURL }, testInfo) => {
    const entry = e2eEntries.find((item) => item.state === "Anotar E1 gasto")!;
    const page = await openWithSession(browser, base, { ...entry, prepare: undefined }, "light", 390, testInfo.parallelIndex, baseURL!);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/");
    await page.locator("[data-annotate-trigger]:visible").click();
    const amount = page.getByRole("textbox", { name: copy.annotate.amount });
    await expect(amount).toBeFocused();
    await page.keyboard.type("45000");
    const typed = await amount.inputValue();
    for (const width of [1024, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await twoFrames(page);
      await expect(page.getByRole("textbox", { name: copy.annotate.amount }), `a ${width} px el monto sigue`).toHaveValue(typed);
    }
    if (page !== base) await page.context().close();
  });

  test("al llegar por URL a la meta inmersiva y cerrar con Escape, el foco vuelve a su tarjeta (FR-046; 004-T084 punto 3)", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const pair = await seedCouple({ index: testInfo.parallelIndex, golden: true });
    const japan = runnerSql(`select id from juntia_data.savings_goals where group_id='${pair.groupId}' and name='Japón'`);
    const context = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const host = new URL(baseURL!).hostname;
    await context.addCookies([...pair.sara.cookies.map((cookie) => ({ ...cookie, domain: host })), { name: "juntia_context", value: "us", domain: host, path: "/" }]);
    await context.addInitScript(() => window.localStorage.setItem("juntia:context", "us"));
    const page = await context.newPage();
    await page.goto(`/metas/${japan}`);
    await expect(page.getByRole("heading", { name: "Japón" }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/metas$/);
    await expect.poll(() => page.evaluate((id) => {
      const active = document.activeElement as HTMLElement | null;
      return !!active && (active.getAttribute("href")?.includes(id) === true || active.textContent?.includes("Japón") === true);
    }, japan), { message: "el foco está en la tarjeta de Japón" }).toBe(true);
    await context.close();
  });
});
