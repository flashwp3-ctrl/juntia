// 005 · T026 (FR-053; D3, opción a; research R7). GoalStack con 6 metas compartidas sembradas en el runner, en Metas, con
// movimiento activo y CPU 4×:
//   · a 1440, el abanico: hover y foco de teclado de cada carta;
//   · a 390, la pila: deslizamiento con el dedo (táctil por CDP, como la E2E de la pila) y por teclado. La pila no tiene un gesto
//     de teclado propio (Motion `drag`); por teclado se mide el recorrido con Tab por sus cartas, que es lo que la persona
//     hace con el teclado (observación para la revisión, no un cambio de alcance).
// Por animación: los intervalos entre requestAnimationFrame y las tareas largas (`longtask`); escribe el % de fotogramas en
// ≤ 18,2 ms, el más largo y si PASA: ≥ 95 % en ≤ 18,2 ms y ninguno > 50 ms (≥ 55 fps, D3). Declara CPU, red y navegador.
// Tramo `lab-interaction` del job `release` (@release). Salida: test-results/evidence/release-goalstack.jsonl.
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { moneyFromPesos } from "../../src/domain/money";
import { todayInBogota } from "../../src/domain/transactions";
import { contributeToGoal, createGoal } from "../../src/lib/db/goals";
import { record, seedReleaseCouple } from "./release-support";

const FRAME_MS = 18.2, LONG_MS = 50, WINDOW_MS = 700;

/** Registra los intervalos entre fotogramas y las tareas largas mientras dura `action` más WINDOW_MS. */
async function measure(page: Page, action: () => Promise<void>) {
  await page.evaluate(() => {
    const w = window as unknown as { __anim: { frames: number[]; long: number[]; loaf: unknown[]; on: boolean; start: number } };
    // Cada medida tiene su objeto: el bucle y el observador de la anterior se paran con ella y no suman a esta.
    const anim = { frames: [] as number[], long: [] as number[], loaf: [] as unknown[], on: true, start: 0 };
    w.__anim = anim;
    try { const obs = new PerformanceObserver((l) => { if (!anim.on) { obs.disconnect(); return; } for (const e of l.getEntries()) anim.long.push(e.duration); }); obs.observe({ type: "longtask" }); } catch { /* sin longtask */ }
    // 005 · PR B (corrección 4; encargo del gestor del 19 nov 2026, solo en la prueba): qué causa cada fotograma largo (> 50 ms).
    // Long Animation Frames da los scripts que corrieron en él: invocador (p. ej. «HTMLAnchorElement.ontouchstart» o
    // «Window.fetch.then»), tipo, archivo y función, duración y estilo/layout forzados; y cuánto fue render y estilo/layout.
    type Script = { invoker: string; invokerType: string; sourceURL: string; sourceFunctionName: string; sourceCharPosition: number; duration: number; forcedStyleAndLayoutDuration: number };
    type Frame = PerformanceEntry & { blockingDuration: number; renderStart: number; styleAndLayoutStart: number; scripts: Script[] };
    try {
      const loaf = new PerformanceObserver((l) => {
        if (!anim.on) { loaf.disconnect(); return; }
        for (const e of l.getEntries() as Frame[]) {
          if (e.duration <= 50) continue;
          const end = e.startTime + e.duration;
          anim.loaf.push({ ms: Math.round(e.duration), bloqueo: Math.round(e.blockingDuration), render: e.renderStart ? Math.round(end - e.renderStart) : 0,
            estiloLayout: e.styleAndLayoutStart ? Math.round(end - e.styleAndLayoutStart) : 0,
            scripts: e.scripts.map((x) => ({ invocador: x.invoker.slice(0, 80), tipo: x.invokerType, archivo: x.sourceURL.split("/").pop(), funcion: x.sourceFunctionName, posicion: x.sourceCharPosition, ms: Math.round(x.duration), forzado: Math.round(x.forcedStyleAndLayoutDuration) })) });
        }
      });
      loaf.observe({ type: "long-animation-frame" });
    } catch { /* sin LoAF */ }
    let last = performance.now();
    const tick = (now: number) => { if (!anim.on) return; anim.frames.push(now - last); last = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.evaluate(() => { (window as unknown as { __anim: { start: number } }).__anim.start = performance.now(); });
  await action();
  // La ventana de medida se cuenta en la página (sin esperas fijas, ADR-011 §6, regla 4).
  await page.waitForFunction((ms) => performance.now() - (window as unknown as { __anim: { start: number } }).__anim.start >= ms, WINDOW_MS);
  const data = await page.evaluate(() => { const w = window as unknown as { __anim: { frames: number[]; long: number[]; loaf: unknown[]; on: boolean; start: number } }; w.__anim.on = false; return w.__anim; });
  const frames = data.frames.slice(1);
  const within = frames.filter((ms) => ms <= FRAME_MS).length;
  const percent = frames.length ? (100 * within) / frames.length : 0;
  const longest = frames.length ? Math.max(...frames) : 0;
  return { fotogramas: frames.length, porcentajeEn18_2ms: Number(percent.toFixed(1)), fotogramaMasLargoMs: Number(longest.toFixed(1)),
    tareasLargas: data.long.map((ms) => Math.round(ms)), fotogramasLargos: data.loaf, pasa: percent >= 95 && longest <= LONG_MS };
}

for (const width of [1440, 390] as const) {
  test(`@release GoalStack con 6 metas · ${width === 1440 ? "abanico" : "pila"} · ${width}px · CPU 4×`, async ({ browser, baseURL, browserName }) => {
    test.skip(browserName !== "chromium", "La CPU emulada por CDP solo existe en Chromium.");
    test.setTimeout(10 * 60_000);
    const pair = await seedReleaseCouple(test.info().parallelIndex);
    // El dataset trae Japón; cinco metas compartidas más, con un aporte cada una, hasta seis.
    for (const [index, name] of ["Sala nueva", "Fondo de imprevistos", "Bicicletas", "Navidad", "Curso de cocina"].entries()) {
      const goal = await createGoal(pair.sara.client, { idempotencyKey: randomUUID(), context: "us", name, goalType: "home", target: moneyFromPesos(5000000n + BigInt(index) * 1000000n), targetMonth: null });
      await contributeToGoal(pair.sara.client, { idempotencyKey: randomUUID(), goalId: goal.id, amount: moneyFromPesos(200000n * BigInt(index + 1)), entryDate: todayInBogota(), fundingMode: "reserved" });
    }
    await pair.sara.client.rpc("set_theme", { p_theme: "light" });
    // Movimiento activo: se mide la animación real, no la versión reducida.
    const live = await browser.newContext({ baseURL, viewport: { width, height: 900 }, reducedMotion: "no-preference", ...(width === 390 ? { hasTouch: true, isMobile: true } : {}) });
    const host = new URL(baseURL!).hostname;
    await live.addCookies([...pair.sara.cookies.map((cookie) => ({ ...cookie, domain: host })), { name: "juntia_context", value: "us", domain: host, path: "/", sameSite: "Lax" }]);
    await live.addInitScript(() => window.localStorage.setItem("juntia:context", "us"));
    const page = await live.newPage();
    const cdp = await live.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto("/metas");
    const stack = page.locator("[data-goal-stack]").first();
    await expect(stack).toBeVisible();
    const conditions = { cpu: "4×", red: "sin emulación", motor: `chromium ${browser.version()}`, ancho: width, metas: 6 };
    const rows: object[] = [];
    if (width === 1440) {
      const layers = stack.locator("[data-fan-layer]");
      const count = await layers.count();
      for (let i = 0; i < count; i++) {
        const box = await layers.nth(i).boundingBox();
        if (!box) continue;
        rows.push({ animacion: `hover carta ${i + 1}`, ...(await measure(page, async () => { await page.mouse.move(box.x + box.width / 2, box.y + 24); })) });
      }
      await page.mouse.move(0, 0);
      await layers.first().locator("a, button").first().focus();
      for (let i = 0; i < count; i++) {
        rows.push({ animacion: `foco carta ${i + 1}`, ...(await measure(page, async () => { await page.keyboard.press(i === 0 ? "Shift+Tab" : "Tab"); if (i === 0) await page.keyboard.press("Tab"); })) });
      }
    } else {
      // El deslizamiento, con un dedo por CDP (`Input.dispatchTouchEvent`), como la E2E de la pila (goals.e2e.ts): pasa por
      // el compositor y respeta `touch-action`. Un arrastre de ratón con la CPU a 4× puede leerse como un clic y abrir la meta.
      const touchDrag = async (x: number, y: number, dx: number) => {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        for (let step = 1; step <= 10; step += 1) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * step) / 10, y }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      };
      // La caja de la carta del frente se lee del DOM, sin esperar a un localizador que se vuelve a pintar en cada fotograma.
      const frontBox = () => page.evaluate(() => {
        const card = [...document.querySelectorAll<HTMLElement>("[data-goal-stack] [data-swipe]")].find((node) => node.getClientRects().length > 0);
        const rect = card?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      });
      for (let i = 0; i < 6; i++) {
        const box = await frontBox();
        if (!box || !page.url().endsWith("/metas")) break;
        rows.push({ animacion: `deslizar con el dedo ${i + 1}`, ...(await measure(page, async () => { await touchDrag(box.x + box.width * 0.7, box.y + 40, -160); })) });
      }
      const focusable = stack.locator("a, button").filter({ visible: true });
      if ((await focusable.count()) > 0) await focusable.first().focus();
      for (let i = 0; i < 3; i++) rows.push({ animacion: `teclado: Tab por la pila ${i + 1}`, ...(await measure(page, async () => { await page.keyboard.press("Tab"); })) });
    }
    for (const row of rows) await record("release-goalstack.jsonl", { rotulo: "laboratorio", criterio: "≥ 95 % en ≤ 18,2 ms y ninguno > 50 ms (D3)", ...conditions, ...row });
    await live.close();
  });
}
