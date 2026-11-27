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
import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { sharedOctober2026 } from "../../src/domain/golden/october-2026";
import { formatMoney, moneyFromPesos, type Money } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { contributeToGoal, createGoal, withdrawFromGoal } from "../../src/lib/db/goals";
import { updateDisplayName } from "../../src/lib/db/profile";
import { registerSettlement } from "../../src/lib/db/settlements";
import { createSharedExpense } from "../../src/lib/db/shared-expenses";
import { copy } from "../../src/lib/copy/es";
import { analyzeAtRest } from "../support/a11y";
import { seedCouple, seedMovements, seedSharedMovements, seedUser, type SeededUser } from "../support/seed";
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
          // F111-12 (PR aparte autorizado por los fundadores el 26 nov 2026; specs/005-gate-mvp-1/diagnostico-aviso-anotar.md):
          // el aviso de Anotar se mide PRIMERO, con la página en reposo, y la perilla después. Antes, el aviso se medía justo
          // después de knobFrames, que deja en curso el cambio Nosotros → Yo (uno o dos router.refresh()): la hoja se volvía a
          // pintar dentro de la ventana de medición y la prueba medía una transición que provocaba ella misma. Las dos
          // mediciones y sus aserciones no cambian; solo el orden, para que ninguna mida la transición de la otra. Tras el
          // aviso, a una ruta de producto ya no le queda ninguna comprobación que dependa del contexto.
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
          // El selector existe en todas salvo /cuenta por debajo de 1280 (contracts/routes.md).
          const hasSelector = await page.locator("[data-context-selector][data-hydrated]").evaluateAll((nodes) => nodes.some((node) => node.getClientRects().length > 0));
          if (hasSelector) {
            const knob = await knobFrames(page);
            expect.soft(new Set(knob.xs).size, "posiciones distintas de la perilla").toBe(1);
            console.log(`${colorScheme} ${route} ${width}px: perilla ${knob.xs[0]} en ${knob.xs.length} cuadros, ${new Set(knob.xs).size} posición(es)`);
            // La vuelta a «Yo» quedó aplicada en el selector visible (también en /cuenta, que no monta ContextView).
            await expect(page.locator('[data-context-selector] [role="radio"][data-value="me"]:visible').first()).toHaveAttribute("aria-checked", "true");
          } else {
            console.log(`${colorScheme} ${route} ${width}px: sin selector en este ancho`);
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
    .map((node) => {
      // 005 · PR B (corrección 5): el título no se monta sobre ningún botón (la × de «Editar gasto») y ninguna opción se sale de
      // su caja (las fichas de categoría con «Restaurantes»; «Entretenimiento» pasó a «Ocio» el 22 nov 2026).
      // El texto del título, no su caja: el texto que no cabe se sale de la caja sin agrandarla.
      const heading = node.querySelector("h1, h2, h3");
      const range = document.createRange();
      if (heading) range.selectNodeContents(heading);
      const title = heading ? range.getBoundingClientRect() : undefined;
      const meets = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
      const titleOverButton = title && title.width > 1 ? [...node.querySelectorAll("button")].filter((button) => button.getClientRects().length > 0 && meets(title, button.getBoundingClientRect())).length : 0;
      // El texto de cada opción frente a su caja (no `scrollHeight`, que cuenta el ::after del área táctil de F17-2).
      const spilled = [...node.querySelectorAll<HTMLElement>("[role='radio']")].filter((radio) => {
        if (radio.getClientRects().length === 0) return false;
        const text = document.createRange();
        text.selectNodeContents(radio);
        const inner = text.getBoundingClientRect(), box = radio.getBoundingClientRect();
        return inner.left < box.left - 0.5 || inner.right > box.right + 0.5 || inner.top < box.top - 0.5 || inner.bottom > box.bottom + 0.5;
      }).map((radio) => radio.textContent?.trim() ?? "");
      return { name: node.getAttribute("aria-label") ?? node.querySelector("h1, h2, h3")?.textContent?.trim() ?? "diálogo", scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, titleOverButton, spilled };
    });
  return { doc, dialogs };
});
// La descripción máxima (140 caracteres) de los datos extremos, la misma de `seedMovements(user, "extreme")`.
const LONG_DESCRIPTION = "Remodelación completa del apartamento con muebles nuevos, electrodomésticos, pintura, pisos y el trasteo de todo lo que había en él".padEnd(140, ".");
const twoFrames = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/**
 * PR #117 (maestro, decisión 30): cada importe visible del `main` (un texto con «$» y dígitos), entero y a la vista. Para cada
 * uno: si lo recorta un ancestro con overflow (también la elipsis), si se sale de la ventana y si queda debajo del panel de detalle
 * de Actividad (el `aside` visible, cuando el importe no está dentro de él). Los textos solo para lectores de pantalla
 * (sr-only, 1 px) no cuentan. No basta el ancho del documento: un importe puede quedar tapado sin crear scroll.
 */
const moneyOnScreen = (page: Page) => page.evaluate(() => {
  const root = document.documentElement;
  const aside = [...document.querySelectorAll<HTMLElement>("main aside")].find((node) => node.getClientRects().length > 0) ?? null;
  const panel = aside?.getBoundingClientRect() ?? null;
  const amounts = [...document.querySelectorAll<HTMLElement>("main *")].filter((node) => node.getClientRects().length > 0
    && node.getBoundingClientRect().width > 1 && [...node.childNodes].some((child) => child.nodeType === 3 && /\$\s?\d/.test(child.textContent ?? "")));
  const problems = amounts.flatMap((node) => {
    const rect = node.getBoundingClientRect();
    const text = (node.textContent ?? "").trim().slice(0, 60);
    const found: string[] = [];
    if (node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).overflow !== "visible") found.push(`«${text}» recortado`);
    for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const box = parent.getBoundingClientRect();
      if (box.width <= 1) break;
      if ((style.overflowX !== "visible" || style.overflow !== "visible") && (rect.right > box.right + 1 || rect.left < box.left - 1)) { found.push(`«${text}» recortado por ${parent.tagName.toLowerCase()}`); break; }
    }
    if (rect.right > root.clientWidth + 1) found.push(`«${text}» fuera de la ventana (${Math.round(rect.right)})`);
    if (panel && !aside!.contains(node) && rect.right > panel.left + 1 && rect.left < panel.right && rect.bottom > panel.top && rect.top < panel.bottom) found.push(`«${text}» debajo del panel de detalle`);
    return found;
  });
  return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, amounts: amounts.length, problems };
});

/**
 * PR #117, ronda 2 (F117-1): un texto que debe verse entero en una fila sembrada, localizada por su id (`selector`, p. ej.
 * `[data-transaction-id="…"]`; la fila es su `tr` o el propio elemento; se ignora el panel de detalle).
 */
type RowText = { selector: string; text: string; label: string; panel?: boolean; count?: number };
/**
 * Para cada `RowText`: cuántas filas visibles tiene, cuántas apariciones del texto completo (signo incluido) hay en ellas, aunque
 * esté repartido entre varios elementos, y los problemas de cada aparición según la GEOMETRÍA del texto (`Range.getClientRects`),
 * no la de su elemento: cada trozo sin caja visible (ancho 0, `visibility`, `opacity: 0`), fuera de la ventana por cualquiera de
 * los dos bordes, recortado por un ancestro con overflow (también la elipsis) o debajo del panel de detalle. Las copias solo para
 * lectores de pantalla (sr-only) no cuentan como aparición visual.
 */
const rowTexts = (page: Page, items: readonly RowText[]) => page.evaluate((list) => {
  const root = document.documentElement;
  const aside = [...document.querySelectorAll<HTMLElement>("main aside")].find((node) => node.getClientRects().length > 0) ?? null;
  const panel = aside?.getBoundingClientRect() ?? null;
  const srOnly = (start: Element | null) => {
    for (let node = start; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.clip === "rect(0px, 0px, 0px, 0px)" || style.clipPath.startsWith("inset(50%")) return true;
    }
    return false;
  };
  return list.map(({ selector, text, label, panel: inPanel, count = 1 }) => {
    const rows = [...new Set([...document.querySelectorAll<HTMLElement>(`main ${selector}`)]
      .filter((node) => node.getClientRects().length > 0 && (inPanel || !node.closest("aside")))
      .map((node) => node.closest("tr") ?? node))];
    const occurrences: string[][] = [];
    for (const row of rows) {
      const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
      const nodes: { node: Text; start: number }[] = [];
      let all = "";
      for (let node = walker.nextNode(); node; node = walker.nextNode()) { nodes.push({ node: node as Text, start: all.length }); all += (node as Text).data; }
      for (let index = all.indexOf(text); index >= 0; index = all.indexOf(text, index + 1)) {
        const end = index + text.length;
        const pieces = nodes.filter(({ node, start }) => start < end && start + node.data.length > index);
        if (pieces.some(({ node }) => srOnly(node.parentElement))) continue;
        const problems: string[] = [];
        for (const { node, start } of pieces) {
          const range = document.createRange();
          range.setStart(node, Math.max(0, index - start));
          range.setEnd(node, Math.min(node.data.length, end - start));
          const piece = range.toString();
          if (!piece.trim()) continue;
          const style = getComputedStyle(node.parentElement!);
          const rects = [...range.getClientRects()].filter((rect) => rect.width > 0.5 && rect.height > 0.5);
          if (rects.length === 0 || style.visibility !== "visible" || Number(style.opacity) === 0) { problems.push(`«${piece}» sin caja visible`); continue; }
          for (const rect of rects) {
            if (rect.left < -0.5 || rect.right > root.clientWidth + 0.5) problems.push(`«${piece}» fuera de la ventana (${Math.round(rect.left)}–${Math.round(rect.right)} de ${root.clientWidth})`);
            if (panel && !aside!.contains(node) && rect.right > panel.left + 0.5 && rect.left < panel.right - 0.5 && rect.bottom > panel.top + 0.5 && rect.top < panel.bottom - 0.5) problems.push(`«${piece}» debajo del panel de detalle`);
            for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
              const box = parent.getBoundingClientRect();
              const css = getComputedStyle(parent);
              if (css.overflowX === "visible" && css.overflowY === "visible") continue;
              if (rect.left < box.left - 0.5 || rect.right > box.right + 0.5) { problems.push(`«${piece}» recortado por ${parent.tagName.toLowerCase()}`); break; }
            }
          }
        }
        occurrences.push(problems);
      }
    }
    return { label, text, count, rows: rows.length, occurrences: occurrences.length, problems: occurrences.flat() };
  });
}, items);

/**
 * La tabla visible del `main` y su columna (el contenedor `.min-w-0` de la lista); y la rejilla lista/panel de Actividad (el padre
 * del `aside` del panel): sus columnas si es una rejilla, `null` si Actividad va en una columna (defecto A).
 */
const tableFit = (page: Page) => page.evaluate(() => {
  const node = [...document.querySelectorAll<HTMLTableElement>("main table")].find((item) => item.getClientRects().length > 0) ?? null;
  const column = node?.closest(".min-w-0") ?? null;
  const grid = document.querySelector("main aside")?.parentElement ?? null;
  const columns = grid && getComputedStyle(grid).display === "grid" ? getComputedStyle(grid).gridTemplateColumns : null;
  return { table: node ? Math.round(node.getBoundingClientRect().width) : null, column: column ? Math.round(column.getBoundingClientRect().width) : null, columns };
});

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
      if (result.doc.scrollWidth > result.doc.clientWidth || result.dialogs.some((d) => d.scrollWidth > d.clientWidth || d.titleOverButton > 0 || d.spilled.length > 0)) {
        await page.screenshot({ path: `test-results/a11y-200/texto-200--${state.replace(/[^\p{L}\p{N}]+/gu, "-")}--390.png`, fullPage: false, animations: "disabled" });
      }
      expect.soft(result.doc.scrollWidth, `${state}: scroll horizontal de la página al 200 %`).toBeLessThanOrEqual(result.doc.clientWidth);
      for (const dialog of result.dialogs) expect.soft(dialog.scrollWidth, `${state}: «${dialog.name}» se sale al 200 %`).toBeLessThanOrEqual(dialog.clientWidth);
      for (const dialog of result.dialogs) {
        expect.soft(dialog.titleOverButton, `${state}: el título de «${dialog.name}» queda bajo un botón al 200 %`).toBe(0);
        expect.soft(dialog.spilled, `${state}: opciones de «${dialog.name}» que se salen de su caja al 200 %`).toEqual([]);
      }
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

  // PR #117 (maestro, decisión 30; autorizaciones del 26 y del 27 nov 2026). Las cuatro regresiones de desbordamiento con datos
  // extremos comparten este recorrido: los dos temas; cada vista; los siete anchos al 100 % y, con la raíz al 200 %, 390, 1280 y
  // 1440 (F117-2: al 200 % la barra lateral y los márgenes en rem crecen y el panel no). En cada combinación, después de cada
  // cambio de ancho: sin scroll horizontal; con la tabla visible, la tabla dentro de su columna; cada fila sembrada, localizada por
  // su id, presente y con cada texto esperado (el importe con su signo) entero, en la ventana por los dos bordes y fuera de debajo
  // del panel, según la geometría del texto (`rowTexts`, F117-1); y la red general de `moneyOnScreen`.
  const SWEEP_CASES = [...[360, 390, 430, 768, 1024, 1280, 1440].map((width) => ({ width, root: "" })), ...[390, 1280, 1440].map((width) => ({ width, root: "200%" }))];
  // `opened`: la vista tiene un movimiento elegido; en una columna solo se ve su detalle, y las filas de la lista se exigen solo
  // cuando la lista está a la vista (con la rejilla). `detail`: textos del propio detalle (a pantalla completa o en el panel),
  // comprobados en todos los anchos y escalas.
  type SweepView = { name: string; path: string; opened?: boolean; detail?: RowText[] };
  // Defecto A: al 100 %, desde 1280, la rejilla de hoy, exacta; por debajo de 1280 y con la raíz al 200 %, una columna.
  const GRID_AT: Record<number, string> = { 1280: "520px 400px", 1440: "680px 400px" };
  async function sweepRows(options: { browser: Browser; baseURL: string; user: SeededUser; scope: "me" | "us"; views: readonly SweepView[]; waitFor: string; expected: (page: Page) => Promise<RowText[]>; name: string; actividad: boolean }) {
    const { browser, baseURL, user, scope, views, waitFor, expected, name, actividad } = options;
    for (const colorScheme of THEMES) {
      const context = await browser.newContext({ baseURL, reducedMotion: "reduce", colorScheme, viewport: { width: 1440, height: 900 } });
      const host = new URL(baseURL).hostname;
      await context.addCookies([...user.cookies.map((cookie) => ({ ...cookie, domain: host })), { name: "juntia_context", value: scope, domain: host, path: "/" }, { name: "juntia_theme", value: colorScheme, domain: host, path: "/" }]);
      await context.addInitScript((value) => window.localStorage.setItem("juntia:context", value), scope);
      const page = await context.newPage();
      for (const view of views) {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(view.path);
        await expect(page.getByText(waitFor).filter({ visible: true }).first()).toBeVisible();
        const items = await expected(page);
        expect(items.length, `${name} · ${view.name}: hay filas sembradas que comprobar`).toBeGreaterThan(0);
        for (const { width, root } of SWEEP_CASES) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, root);
          await twoFrames(page);
          const label = `${name} · ${view.name} · ${colorScheme} · ${width}px${root ? " · raíz 200 %" : ""}`;
          const money = await moneyOnScreen(page);
          const fit = await tableFit(page);
          const listShown = !view.opened || fit.columns !== null;
          const checked = [...(listShown ? items : []), ...(view.detail ?? [])];
          const rows = await rowTexts(page, checked);
          const missing = rows.filter((row) => row.rows === 0 || row.occurrences < row.count).map((row) => `«${row.text}» (${row.label})`);
          const problems = rows.flatMap((row) => row.problems.map((problem) => `${problem} (${row.label})`));
          console.log(`${label}: documento ${money.scrollWidth}/${money.clientWidth}; rejilla ${fit.columns ?? "una columna"}; tabla ${fit.table ?? "—"} en columna ${fit.column ?? "—"}; textos ${rows.length - missing.length}/${rows.length}${missing.length ? `; faltan ${missing.join(", ")}` : ""}${[...problems, ...money.problems].length ? `; ${[...problems, ...money.problems].join(" · ")}` : ""}`);
          expect.soft(money.scrollWidth, `${label}: sin scroll horizontal`).toBeLessThanOrEqual(money.clientWidth);
          if (actividad) {
            const twoColumns = !root && width >= 1280;
            if (twoColumns) {
              expect.soft(fit.columns, `${label}: la rejilla lista/panel de hoy`).toBe(GRID_AT[width]);
              expect.soft(fit.table, `${label}: la tabla existe desde 1280 al 100 %`).not.toBeNull();
            } else {
              expect.soft(fit.columns, `${label}: Actividad va en una columna`).toBeNull();
              expect.soft(fit.table, `${label}: en una columna, la lista por días y no la tabla`).toBeNull();
            }
          }
          if (fit.table !== null) expect.soft(fit.table, `${label}: la tabla cabe en su columna`).toBeLessThanOrEqual(fit.column ?? 0);
          for (const row of rows) {
            expect.soft(row.rows, `${label}: la fila de ${row.label} está a la vista`).toBeGreaterThan(0);
            expect.soft(row.occurrences, `${label}: «${row.text}» completo en ${row.label}`).toBeGreaterThanOrEqual(row.count);
            expect.soft(row.problems, `${label}: «${row.text}» de ${row.label} entero, en la ventana y fuera de debajo del panel`).toEqual([]);
          }
          expect.soft(money.problems, `${label}: importes del main enteros, en la ventana y fuera de debajo del panel`).toEqual([]);
        }
      }
      await context.close();
    }
  }
  const expenseText = (row: { type: string; amount: Money }) => `${row.type === "income" ? "+" : ""}${formatMoney(row.amount)}`;
  const short = (text: string | null | undefined) => (text ?? "").slice(0, 24);
  // F117-4: las longitudes de los datos extremos, comprobadas (el máximo del esquema: 140 de descripción, 60 de nombre y de meta).
  const NAME_SARA = "María Fernanda de los Ángeles Restrepo Villegas de la Cruz A";
  const NAME_TOMAS = "Juan Sebastián de la Santísima Trinidad Echeverría Olarte JB";
  const GOAL_NAME = "Viaje largo a Japón con toda la familia y los abuelos en 202";
  const checkLengths = () => {
    expect(LONG_DESCRIPTION.length, "descripción extrema").toBe(140);
    for (const value of [NAME_SARA, NAME_TOMAS, GOAL_NAME]) expect(value.length, `«${value}»`).toBe(60);
  };

  // Desbordamiento de Actividad en Yo con datos extremos (autorización del 26 nov 2026): con layout automático, la celda de la
  // descripción medía lo que la descripción de 140 caracteres en una línea y la tabla salía de su columna (documento de 1511 a
  // 1280 y 1440, importes debajo del panel). Cada fila sembrada, por su id, con su importe y su signo.
  test("Actividad con datos extremos: siete anchos y 200 % a 390, 1280 y 1440, dos temas, lista y panel de detalle abierto, sin desbordar y con cada importe entero", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    checkLengths();
    const user = await seedUser({ role: "actividad-extremos", index: testInfo.parallelIndex, displayName: NAME_SARA });
    const seeded = await seedMovements(user, "extreme");
    const [extreme] = seeded;
    const month = extreme.transactionDate.slice(0, 7);
    const items = seeded.map((row) => ({ selector: `[data-transaction-id="${row.id}"]`, text: expenseText(row), label: short(row.description) }));
    await sweepRows({ browser, baseURL: baseURL!, user, scope: "me", name: "Actividad en Yo", actividad: true, waitFor: formatMoney(extreme.amount), expected: async () => items,
      views: [{ name: "lista", path: `/actividad?mes=${month}` }, { name: "panel de detalle abierto", path: `/actividad/${extreme.id}?mes=${month}`, opened: true,
        detail: [{ selector: "[data-transaction-detail]", text: formatMoney(extreme.amount), label: "el detalle", panel: true }] }] });
  });

  // Defecto A (luz verde del gestor, 27 nov 2026): con la ventana en `xl` y Actividad en una columna (raíz al 200 % a 1280 y
  // 1440), el detalle ocupa la columna y se cierra con su × (la cabecera móvil de «volver» sigue ligada a `max-xl`). Con teclado:
  // se abre desde la fila, la × se alcanza con Tab y tiene nombre accesible, mide al menos 44 × 44, al cerrarla se vuelve a la
  // lista (ningún estado sin salida) y el foco vuelve a la fila. A 1280 al 100 %, la misma comprobación con el panel, como hoy.
  test("Actividad en una columna con la ventana en xl: el detalle se cierra con la × por teclado, con nombre, 44 px, vuelta a la lista y foco en la fila", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const user = await seedUser({ role: "actividad-extremos", index: testInfo.parallelIndex, displayName: NAME_SARA });
    const [extreme] = await seedMovements(user, "extreme");
    const month = extreme.transactionDate.slice(0, 7);
    for (const { width, root } of [{ width: 1280, root: "" }, { width: 1280, root: "200%" }, { width: 1440, root: "200%" }]) {
      const label = `cerrar el detalle · ${width}px${root ? " · raíz 200 %" : ""}`;
      const context = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width, height: 900 } });
      const host = new URL(baseURL!).hostname;
      await context.addCookies([...user.cookies.map((cookie) => ({ ...cookie, domain: host })), { name: "juntia_context", value: "me", domain: host, path: "/" }]);
      await context.addInitScript(() => window.localStorage.setItem("juntia:context", "me"));
      const page = await context.newPage();
      await page.goto(`/actividad?mes=${month}`);
      await expect(page.getByText(formatMoney(extreme.amount)).filter({ visible: true }).first()).toBeVisible();
      await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, root);
      await twoFrames(page);
      expect.soft((await tableFit(page)).columns, `${label}: la disposición de partida`).toBe(root ? null : GRID_AT[width]);
      const row = page.locator(`main a[data-transaction-id="${extreme.id}"]`).filter({ visible: true }).first();
      await row.focus();
      await page.keyboard.press("Enter");
      await page.waitForURL(new RegExp(`/actividad/${extreme.id}`));
      await expect(page.locator("main [data-transaction-detail]").filter({ visible: true }).first()).toBeVisible();
      // La navegación en el cliente conserva el estilo de la raíz; si no, la prueba no mediría lo que dice.
      expect(await page.evaluate(() => document.documentElement.style.fontSize), `${label}: la raíz sigue al 200 %`).toBe(root);
      await twoFrames(page);
      const layout = await tableFit(page);
      expect.soft(layout.columns, `${label}: con el detalle abierto, ${root ? "una columna" : "la rejilla de hoy"}`).toBe(root ? null : GRID_AT[width]);
      const close = page.getByRole("link", { name: copy.detail.close }).filter({ visible: true });
      await expect(close, `${label}: hay una × visible con nombre «${copy.detail.close}»`).toHaveCount(1);
      let reached = false;
      for (let step = 0; step < 80 && !reached; step += 1) {
        await page.keyboard.press("Tab");
        reached = await close.evaluate((node) => node === document.activeElement);
      }
      expect(reached, `${label}: la × se alcanza con Tab`).toBe(true);
      const box = (await close.boundingBox())!;
      console.log(`${label}: rejilla ${layout.columns ?? "una columna"}; × de ${Math.round(box.width)}×${Math.round(box.height)}`);
      expect.soft(Math.min(box.width, box.height), `${label}: la × mide al menos 44 × 44`).toBeGreaterThanOrEqual(44);
      await page.keyboard.press("Enter");
      await page.waitForURL((url) => !url.pathname.includes(extreme.id));
      await expect(page.locator(`main a[data-transaction-id="${extreme.id}"]`).filter({ visible: true }).first(), `${label}: al cerrar, la lista vuelve`).toBeVisible();
      await page.waitForTimeout(1000);
      const focus = await page.evaluate((id) => { const node = document.activeElement; return { onRow: Boolean(node?.closest(`[data-transaction-id="${id}"]`)), tag: node?.tagName.toLowerCase(), name: (node?.getAttribute("aria-label") ?? node?.textContent ?? "").trim().slice(0, 40) }; }, extreme.id);
      console.log(`${label}: foco tras cerrar en ${focus.tag} «${focus.name}»`);
      expect.soft(focus.onRow, `${label}: el foco vuelve a la fila`).toBe(true);
      await context.close();
    }
  });

  // Ampliación del 27 nov 2026, punto 1: Inicio en Yo con la parte compartida. A 390 con la raíz al 200 %, «Ver todo» empujaba el
  // documento a 434 px y la elipsis de la línea «Compartido · tu parte $X · fecha» ocultaba el importe de la parte. Las filas que
  // Inicio enseña (las 5 recientes) se toman al cargar a 1440; en cada ancho, cada una con su importe completo y, las compartidas,
  // con «Compartido · tu parte $X» y su fecha enteros (F117-3).
  test("Inicio en Yo con la parte compartida: siete anchos y 200 % a 390, 1280 y 1440, dos temas, con «tu parte», su fecha y los importes enteros", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    const pair = await seedCouple({ index: testInfo.parallelIndex });
    const [shared, own] = await Promise.all([seedSharedMovements(pair, "recent"), seedMovements(pair.sara, "recent")]);
    const candidates = [
      ...shared.map((row, index) => {
        const golden = sharedOctober2026[index];
        const part = golden.allocations.find((allocation) => allocation.userId === "sara")!.amount;
        return { id: row.id, shared: true, label: short(golden.description), texts: [formatMoney(golden.amount), copy.row.sharedPart(formatMoney(part))] };
      }),
      ...own.map((row) => ({ id: row.id, shared: false, label: short(row.description), texts: [expenseText(row)] })),
    ];
    const expected = async (page: Page) => {
      const present = await page.evaluate((ids) => ids.flatMap((id) => {
        const node = [...document.querySelectorAll<HTMLElement>(`main [data-transaction-id="${id}"]`)].find((item) => item.getClientRects().length > 0);
        if (!node) return [];
        const date = [...node.querySelectorAll<HTMLElement>("span")].find((item) => item.children.length === 0 && (item.textContent ?? "").startsWith("· "));
        return [{ id, date: date?.textContent ?? null }];
      }), candidates.map(({ id }) => id));
      const visible = candidates.filter(({ id }) => present.some((item) => item.id === id));
      expect(visible.filter((item) => item.shared).length, "Inicio en Yo: hay filas con «Compartido · tu parte»").toBeGreaterThan(0);
      return visible.flatMap((item) => {
        const date = present.find((entry) => entry.id === item.id)!.date;
        if (item.shared) expect(date, `Inicio en Yo: la fila compartida ${item.label} lleva su fecha`).not.toBeNull();
        return [...item.texts, ...(item.shared && date ? [date] : [])].map((text) => ({ selector: `[data-transaction-id="${item.id}"]`, text, label: item.label }));
      });
    };
    await sweepRows({ browser, baseURL: baseURL!, user: pair.sara, scope: "me", name: "Inicio en Yo", actividad: false, waitFor: copy.row.sharedPart("").trim(), expected, views: [{ name: "Inicio", path: "/" }] });
  });

  // Punto 2: la tabla de Actividad en Nosotros. Con layout automático, la primera celda pedía el ancho de la descripción de 140
  // caracteres (1058,81 px) o del texto de una liquidación entre los dos nombres de 60, y la tabla salía de su columna: documento
  // 1570 a 1280 y el importe de 999.999.998 fuera de la ventana. El gasto y la liquidación, cada uno por su id.
  test("Actividad en Nosotros con datos extremos: gasto compartido de 140 caracteres y liquidación con nombres de 60, siete anchos y 200 % a 390, 1280 y 1440, dos temas, lista y panel", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    checkLengths();
    const pair = await seedCouple({ index: testInfo.parallelIndex });
    await updateDisplayName(pair.sara.client, NAME_SARA);
    await updateDisplayName(pair.tomas.client, NAME_TOMAS);
    const half = moneyFromPesos(499_999_999n);
    const extreme = await createSharedExpense(pair.sara.client, {
      idempotencyKey: randomUUID(), amount: moneyFromPesos(999_999_998n), categoryId: "home", transactionDate: todayInBogota(), description: LONG_DESCRIPTION,
      payerUserId: pair.sara.id, splitMode: "equal", splitPercents: null, allocations: [{ userId: pair.sara.id, amount: half }, { userId: pair.tomas.id, amount: half }],
    });
    const settlement = await registerSettlement(pair.tomas.client, { idempotencyKey: randomUUID(), amount: moneyFromPesos(20_000n), settlementDate: todayInBogota(), note: null });
    const items = [
      { selector: `[data-transaction-id="${extreme.id}"]`, text: formatMoney(moneyFromPesos(999_999_998n)), label: "gasto extremo" },
      { selector: `[data-settlement-id="${settlement.id}"]`, text: formatMoney(moneyFromPesos(20_000n)), label: "liquidación con nombres de 60" },
    ];
    await sweepRows({ browser, baseURL: baseURL!, user: pair.sara, scope: "us", name: "Actividad en Nosotros", actividad: true, waitFor: items[0].text, expected: async () => items,
      views: [{ name: "lista", path: "/actividad" }, { name: "panel de detalle abierto", path: `/actividad/${extreme.id}`, opened: true,
        // Defecto B: el reparto del detalle, las dos partes de 499.999.999 enteras en todos los anchos, también a 390 al 200 %.
        detail: [{ selector: "[data-transaction-detail]", text: formatMoney(moneyFromPesos(499_999_999n)), label: "el reparto del detalle", panel: true, count: 2 }] }] });
  });

  // Punto 3: las filas de aportes a metas dentro de Actividad en Nosotros. El título en una línea de una meta de 60 caracteres
  // hacía medir la tabla 834 px en una columna de 520/680; sin scroll del documento, pero con el panel abierto los importes
  // quedaban debajo de él. Cada asiento por su id: los DOS aportes de +$999.999.999 y el retiro de −$999.999.998, con su signo; y
  // los gastos compartidos del mes. En Yo no se reproduce: allí el asiento de meta ocupa la fila entera (`colSpan`).
  test("Actividad en Nosotros con aportes a metas extremos: meta de 60 caracteres, aportes de 999.999.999 y retiro con motivo de 140, siete anchos y 200 % a 390, 1280 y 1440, dos temas, lista y panel", { tag: "@sweep" }, async ({ browser, baseURL }, testInfo) => {
    checkLengths();
    const pair = await seedCouple({ index: testInfo.parallelIndex });
    const max = moneyFromPesos(999_999_999n);
    const goal = await createGoal(pair.sara.client, { idempotencyKey: randomUUID(), name: GOAL_NAME, goalType: "travel", target: max, targetMonth: null, context: "us" });
    const fromSara = await contributeToGoal(pair.sara.client, { idempotencyKey: randomUUID(), goalId: goal.id, amount: max, entryDate: todayInBogota(), fundingMode: "reserved" });
    const fromTomas = await contributeToGoal(pair.tomas.client, { idempotencyKey: randomUUID(), goalId: goal.id, amount: max, entryDate: todayInBogota(), fundingMode: "transferred_declared" });
    const withdrawal = await withdrawFromGoal(pair.tomas.client, { idempotencyKey: randomUUID(), goalId: goal.id, amount: moneyFromPesos(999_999_998n), entryDate: todayInBogota(), reason: LONG_DESCRIPTION });
    const shared = await seedSharedMovements(pair, "recent");
    const items = [
      { selector: `[data-entry-id="${fromSara.id}"]`, text: `+${formatMoney(max)}`, label: "aporte de Sara" },
      { selector: `[data-entry-id="${fromTomas.id}"]`, text: `+${formatMoney(max)}`, label: "aporte de Tomás" },
      { selector: `[data-entry-id="${withdrawal.id}"]`, text: `−${formatMoney(moneyFromPesos(999_999_998n))}`, label: "retiro" },
      ...shared.map((row, index) => ({ selector: `[data-transaction-id="${row.id}"]`, text: formatMoney(sharedOctober2026[index].amount), label: short(sharedOctober2026[index].description) })),
    ];
    await sweepRows({ browser, baseURL: baseURL!, user: pair.sara, scope: "us", name: "Aportes a metas en Nosotros", actividad: true, waitFor: items[0].text, expected: async () => items,
      views: [{ name: "lista", path: "/actividad" }, { name: "panel de detalle abierto", path: `/actividad/${shared[0].id}`, opened: true,
        detail: [{ selector: "[data-transaction-detail]", text: formatMoney(sharedOctober2026[0].amount), label: "el detalle", panel: true }] }] });
  });

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
