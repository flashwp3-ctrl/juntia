// 005 · T026 (FR-053; D3, opción a; research R7). GoalStack con 6 metas compartidas sembradas en el runner, en Metas, con
// movimiento activo y CPU 4×:
//   · a 1440, el abanico: hover y foco de teclado de cada carta;
//   · a 390, la pila: deslizamiento por puntero (arrastre de la carta del frente) y por teclado. La pila no tiene un gesto
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
    const w = window as unknown as { __anim: { frames: number[]; long: number[]; on: boolean; start: number } };
    w.__anim = { frames: [], long: [], on: true, start: 0 };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (w.__anim.on) w.__anim.long.push(e.duration); }).observe({ type: "longtask" }); } catch { /* sin longtask */ }
    let last = performance.now();
    const tick = (now: number) => { if (!w.__anim.on) return; w.__anim.frames.push(now - last); last = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.evaluate(() => { (window as unknown as { __anim: { start: number } }).__anim.start = performance.now(); });
  await action();
  // La ventana de medida se cuenta en la página (sin esperas fijas, ADR-011 §6, regla 4).
  await page.waitForFunction((ms) => performance.now() - (window as unknown as { __anim: { start: number } }).__anim.start >= ms, WINDOW_MS);
  const data = await page.evaluate(() => { const w = window as unknown as { __anim: { frames: number[]; long: number[]; on: boolean; start: number } }; w.__anim.on = false; return w.__anim; });
  const frames = data.frames.slice(1);
  const within = frames.filter((ms) => ms <= FRAME_MS).length;
  const percent = frames.length ? (100 * within) / frames.length : 0;
  const longest = frames.length ? Math.max(...frames) : 0;
  return { fotogramas: frames.length, porcentajeEn18_2ms: Number(percent.toFixed(1)), fotogramaMasLargoMs: Number(longest.toFixed(1)),
    tareasLargas: data.long.map((ms) => Math.round(ms)), pasa: percent >= 95 && longest <= LONG_MS };
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
    const live = await browser.newContext({ baseURL, viewport: { width, height: 900 }, reducedMotion: "no-preference" });
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
      for (let i = 0; i < 6; i++) {
        const front = stack.locator("[data-swipe]").filter({ visible: true }).first();
        const box = await front.boundingBox();
        if (!box) break;
        rows.push({ animacion: `deslizar con puntero ${i + 1}`, ...(await measure(page, async () => {
          await page.mouse.move(box.x + box.width * 0.7, box.y + 40);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width * 0.7 - 140, box.y + 40, { steps: 8 });
          await page.mouse.up();
        })) });
      }
      await stack.locator("[data-swipe] a, [data-swipe] button").first().focus();
      for (let i = 0; i < 3; i++) rows.push({ animacion: `teclado: Tab por la pila ${i + 1}`, ...(await measure(page, async () => { await page.keyboard.press("Tab"); })) });
    }
    for (const row of rows) await record("release-goalstack.jsonl", { rotulo: "laboratorio", criterio: "≥ 95 % en ≤ 18,2 ms y ninguno > 50 ms (D3)", ...conditions, ...row });
    await live.close();
  });
}
