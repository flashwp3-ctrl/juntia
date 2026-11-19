// 005 · T032 y T033 (FR-051, SC-005; F85-5, F85-11). Arnés del comparador de CLS por fotogramas
// (contracts/cls-comparator.md), en los proyectos `evidence` (Chromium), `evidence-webkit` y `evidence-firefox`. Laboratorio
// del job `release`, nunca del gate. Conjuntos por tramo con CLS_FRAMES_SET:
//   · controls  — los controles 1 a 6 del §5, 10 cargas cada uno (más 10 de 0,5 px que solo se registran) y el resumen de
//                 fiabilidad del motor (tramos cls-controls-chromium, webkit-cls-1, firefox-cls-1);
//   · routes-1  — A1, A2 y A4 (sin sesión, sin retención), Inicio en Yo y en Nosotros;
//   · routes-2  — Actividad, Balance, Plan, Análisis y Metas.
// Fuera de Chromium y en Chromium, aquí sin emulación de CPU ni de red (§6): 10 cargas en claro y 5 en oscuro por ruta y
// motor, alternando 390 y 1440. Las rutas con sesión retienen su lectura 1,5 s en el servidor (research R5). Una línea por
// carga en test-results/evidence/cls-frames.jsonl; vídeo solo de las cargas con desplazamiento (no entra al repositorio).
// CLS_FRAMES_LOADS (opcional) reduce las cargas para correrlo en local; la medición solo vale en `release`.
import { rmSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { summarize } from "../../scripts/cls-frames/compare.mjs";
import { CLS_OBSERVER, PUBLIC_ROUTES, RECORDER, SESSION_ROUTES, loadWithHold, publicContext, readFrames, record, seedReleaseCouple, sessionContext,
  themeLabel, type PublicRoute, type SessionRoute, type Theme } from "./release-support";
import type { SeededCouple } from "../support/seed";

const SET = process.env.CLS_FRAMES_SET ?? "routes-1";
const LOADS = Number(process.env.CLS_FRAMES_LOADS ?? 0) || null;
const SETS: Record<string, (SessionRoute | PublicRoute)[]> = {
  "routes-1": ["a1", "a2", "a4", "inicio-yo", "inicio-nosotros"],
  "routes-2": ["actividad", "balance", "plan", "analisis", "metas"],
  // T046: los tramos de rutas de WebKit y Firefox partidos (más de 600 s en el punto de control), sin quitar cargas.
  "routes-1a": ["a1", "a2", "a4"],
  "routes-1b": ["inicio-yo", "inicio-nosotros"],
  "routes-2a": ["actividad", "balance", "plan"],
  "routes-2b": ["analisis", "metas"],
};
/** 10 cargas en claro y 5 en oscuro, alternando 390 y 1440 (§6). */
const schedule = (light = 10, dark = 5) => [...Array.from({ length: LOADS ?? light }, (_, i) => ({ theme: "light" as Theme, width: i % 2 ? 1440 : 390 })),
  ...Array.from({ length: LOADS ? Math.max(1, Math.floor(LOADS / 2)) : dark }, (_, i) => ({ theme: "dark" as Theme, width: i % 2 ? 1440 : 390 }))];

test.describe.configure({ mode: "serial" });
let pair: SeededCouple | null = null;
const loads: Awaited<ReturnType<typeof readFrames>>["result"][] = [];
const engine = (browser: Browser) => `${browser.browserType().name()} ${browser.version()}`;

async function measured(page: Page, meta: Record<string, unknown>, file = "cls-frames.jsonl") {
  const { result } = await readFrames(page, meta);
  // Controles: desde el fotograma en que actúa el control. Lo anterior es comportamiento de la ruta (por ejemplo, el cambio
  // de fuente de la barra inferior) y se registra aparte, como dato de la ruta, no del método.
  const at = await page.evaluate(() => (window as unknown as { __clsControlAt?: number }).__clsControlAt ?? null);
  const control = at === null ? result.desplazamientos : result.desplazamientos.filter((shift: { hasta: number }) => shift.hasta >= at);
  const previous = at === null ? [] : result.desplazamientos.filter((shift: { hasta: number }) => shift.hasta < at);
  // 005 · PR B (decisión del gestor del 19 nov 2026; R5): bajo la retención, en Firefox algunas cargas no llegan a pintar el
  // esqueleto y la lectura falla: la página enseña el estado de error de la ruta en vez de la ruta (parcial 44433137464,
  // 4 de 8 cargas a 390 en Inicio · Yo y Actividad). Esa carga no mide la ruta: la marca quien llama, nunca cuenta como CLS = 0.
  const harnessError = await page.evaluate(() => document.querySelector('[data-provisional-state="danger"]') !== null);
  const video = page.video();
  await page.context().close();
  // Vídeo solo de las cargas con desplazamiento, para la revisión humana (§7).
  const path = video ? await video.path().catch(() => null) : null;
  if (path && result.desplazamientos.length === 0) rmSync(path, { force: true });
  await record(harnessError ? "cls-frames-invalidas.jsonl" : file, { ...result, controlEnFotograma: at, desplazamientosDelControl: control.length, anterioresAlControl: previous.length, video: result.desplazamientos.length && path ? path : null });
  return { ...result, desplazamientos: control, anterioresAlControl: previous, harnessError };
}

async function sessionLoad(browser: Browser, baseURL: string, route: SessionRoute, theme: Theme, width: number, init: string[] = []) {
  const spec = SESSION_ROUTES[route];
  pair ??= await seedReleaseCouple(test.info().parallelIndex);
  const context = await sessionContext(browser, baseURL, pair, { theme, width, context: spec.context, recordVideo: true });
  const page = await context.newPage();
  await page.addInitScript(RECORDER);
  for (const script of init) await page.addInitScript(script);
  await loadWithHold(page, spec.path, spec.table);
  return page;
}

async function publicLoad(browser: Browser, baseURL: string, route: PublicRoute, theme: Theme, width: number, init: string[] = []) {
  const context = await publicContext(browser, baseURL, { theme, width, recordVideo: true });
  const page = await context.newPage();
  await page.addInitScript(RECORDER);
  for (const script of init) await page.addInitScript(script);
  await page.goto(PUBLIC_ROUTES[route]);
  await expect(page.locator("main").first()).toBeVisible();
  return page;
}

/**
 * Revisión del PR #87, F87-6: la calibración y las rutas BLOQUEAN el tramo. Falla si un control exigido no cumple todas sus
 * cargas, si una ruta tiene una carga sin ventana verificable (inconclusa) o si muestra desplazamientos. Modo exploratorio
 * explícito, `CLS_FRAMES_EXPLORE=1`, solo para iterar: lo negativo o inconcluso sale como aviso visible (anotación y
 * `::warning::`), nunca como verde en silencio. Ningún tramo de `release` lo activa (scripts/release-leg.mjs; lo comprueba
 * tests/ci-workflow.test.ts), así que el candidato del paso 4 nunca lo usa. Los JSONL quedan como diagnóstico.
 */
const EXPLORE = process.env.CLS_FRAMES_EXPLORE === "1";
function verdict(ok: boolean, message: string) {
  if (ok) return;
  if (EXPLORE) {
    test.info().annotations.push({ type: "warning", description: `modo exploratorio: ${message}` });
    console.log(`::warning title=Comparador (exploratorio)::${message}`);
    return;
  }
  expect(ok, message).toBe(true);
}

if (SET !== "controls") {
  // CLS_FRAMES_ROUTES (opcional, solo en local): limita las rutas del conjunto.
  const only = (process.env.CLS_FRAMES_ROUTES ?? "").split(",").filter(Boolean);
  for (const route of (SETS[SET] ?? []).filter((name) => only.length === 0 || only.includes(name))) {
    test(`@release comparador · ${route}`, async ({ browser, baseURL }) => {
      test.setTimeout(20 * 60_000);
      // Cargas inválidas por el arnés (R5; decisión del gestor del 19 nov 2026): se registran aparte, se repiten una vez y nunca
      // cuentan como CLS = 0. Si la repetición también es inválida, la ruta no puede salir en verde.
      let invalid = 0, invalidAgain = 0;
      for (const [index, { theme, width }] of schedule().entries()) {
        const meta = { ruta: route, motor: engine(browser), tema: themeLabel(theme), ancho: width, carga: index + 1 };
        const load = async () => measured(route in SESSION_ROUTES ? await sessionLoad(browser, baseURL!, route as SessionRoute, theme, width) : await publicLoad(browser, baseURL!, route as PublicRoute, theme, width), meta);
        let result = await load();
        if (result.harnessError) {
          invalid++;
          await record("cls-frames.jsonl", { kind: "inválida por el arnés (R5)", ...meta, intento: 1, desplazamientos: result.desplazamientos.length });
          result = await load();
          if (result.harnessError) {
            invalidAgain++;
            await record("cls-frames.jsonl", { kind: "inválida por el arnés (R5)", ...meta, intento: 2, desplazamientos: result.desplazamientos.length });
            continue;
          }
        }
        loads.push(result);
      }
      await record("cls-frames.jsonl", { kind: "inválidas por el arnés (R5)", ruta: route, motor: engine(browser), invalidas: invalid, repetidasInvalidas: invalidAgain });
      verdict(invalidAgain === 0, `${route} · ${engine(browser)}: ${invalidAgain} cargas inválidas por el arnés también al repetir (estado de error en vez de la ruta; R5)`);
      const [row] = summarize(loads.filter((load) => load.ruta === route));
      verdict(row.incompletas === 0, `${route} · ${row.motor}: ${row.incompletas} de ${row.cargas} cargas sin ventana verificable (inconclusas)`);
      verdict(row.conDesplazamientos === 0, `${route} · ${row.motor}: ${row.conDesplazamientos} de ${row.cargas} cargas con desplazamientos por fotogramas`);
    });
  }
  test("@release comparador · resumen por ruta y motor", async () => {
    const rows = summarize(loads);
    for (const row of rows) await record("cls-frames.jsonl", { kind: "resumen", ...row, rotulo: "laboratorio · por fotogramas" });
  });
}

// ─── Controles 1 a 6 (§5), cada uno con su propio addInitScript, solo en el arnés y nunca en la app ───────────────────────
// Cada script espera al primer fotograma con esqueleto que ve el grabador (window.__clsFrames) y actúa desde ahí.
const AFTER_SKELETON = (body: string, delayMs = 0) => `(() => { const start = () => { const f = window.__clsFrames;
  if (!f || !f.frames.some((x) => x.skeleton)) { requestAnimationFrame(start); return; } setTimeout(() => { window.__clsControlAt = f.frames.length; ${body} }, ${delayMs}); };
  requestAnimationFrame(start); })();`;
const CONTROLS = {
  // 1 · positivo: un bloque de 40 px encima de main, 300 ms después del primer fotograma con esqueleto.
  positive: AFTER_SKELETON(`const main = document.querySelector("main"); const block = document.createElement("div");
    block.className = "cls-control-1"; block.style.height = "40px"; main.parentNode.insertBefore(block, main);`, 300),
  // 2 · resolución: main baja 1 px (layout, no transformación); y 0,5 px, que solo se registra.
  onePixel: AFTER_SKELETON(`const main = document.querySelector("main"); main.style.marginTop = (parseFloat(getComputedStyle(main).marginTop) + 1) + "px";`, 300),
  halfPixel: AFTER_SKELETON(`const main = document.querySelector("main"); main.style.marginTop = (parseFloat(getComputedStyle(main).marginTop) + 0.5) + "px";`, 300),
  // 4 · animación con transformación, fuera del flujo para no empujar nada: Web Animations o estilo en línea por fotograma.
  waapi: AFTER_SKELETON(`const block = document.createElement("div"); block.className = "cls-control-4";
    Object.assign(block.style, { position: "absolute", top: "120px", left: "16px", width: "120px", height: "48px", background: "currentColor", opacity: "0.2" });
    document.body.appendChild(block); block.animate([{ transform: "translateY(24px)" }, { transform: "translateY(0)" }], { duration: 300, easing: "ease-out" });`),
  inline: AFTER_SKELETON(`const block = document.createElement("div"); block.className = "cls-control-4";
    Object.assign(block.style, { position: "absolute", top: "120px", left: "16px", width: "120px", height: "48px", background: "currentColor", opacity: "0.2", transform: "translateY(24px)" });
    document.body.appendChild(block); const t0 = performance.now();
    const step = (now) => { const p = Math.min(1, (now - t0) / 300); block.style.transform = "translateY(" + (24 * (1 - p)) + "px)"; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);`),
  // 5 · transición CSS en curso (F85-11): el bloque se crea quieto y su transform cambia justo después del primer
  // fotograma con esqueleto, así que la transición está activa mientras se mide.
  transition: AFTER_SKELETON(`const block = document.createElement("div"); block.className = "cls-control-5";
    Object.assign(block.style, { position: "absolute", top: "160px", left: "16px", width: "120px", height: "48px", background: "currentColor", opacity: "0.2", transition: "transform 400ms linear" });
    document.body.appendChild(block); window.__clsControlBlock = block; block.getBoundingClientRect();
    requestAnimationFrame(() => { block.style.transform = "translateY(32px)"; });`),
  // 6 · scroll con sticky y fixed: una cabecera sticky, un fixed y un fixed dentro de un antepasado transformado, en un
  // contenedor absoluto (fuera del flujo de la app) con altura para desplazar; después, 200 px de scroll en 10 pasos.
  scroll: AFTER_SKELETON(`const box = document.createElement("div"); box.className = "cls-control-6";
    Object.assign(box.style, { position: "absolute", top: "0", left: "0", width: "100%", height: "3000px", pointerEvents: "none" });
    box.innerHTML = '<div class="cls-control-6-sticky" style="position:sticky;top:0;height:40px;background:currentColor;opacity:.1"></div>'
      + '<div class="cls-control-6-fixed" style="position:fixed;top:200px;right:8px;width:40px;height:40px;background:currentColor;opacity:.1"></div>'
      + '<div class="cls-control-6-transformed" style="transform:translateZ(0);position:absolute;top:400px;left:0;width:100px;height:100px">'
      + '<div class="cls-control-6-fixed-inner" style="position:fixed;top:10px;left:10px;width:40px;height:40px;background:currentColor;opacity:.1"></div></div>';
    document.body.appendChild(box); let n = 0; const step = () => { window.scrollBy(0, 20); if (++n < 10) requestAnimationFrame(step); }; requestAnimationFrame(step);`, 100),
};

type ControlRow = { control: string; motor: string; cumple: number; cargas: number; nota?: string };
const controlRows: ControlRow[] = [];
const count = (n = 10) => LOADS ?? n;
/** Los controles con esqueleto corren en Inicio · Nosotros: su retención (settlements) deja el esqueleto ~1,5 s. */
const CONTROL_ROUTE: SessionRoute = "inicio-nosotros";
const width = (i: number) => (i % 2 ? 1440 : 390);
/**
 * Controles negativos 4 a 6: se cuentan solo los desplazamientos de los bloques del propio control (su ruta nombra la clase
 * `cls-control-N`). Decisión del gestor del 18 nov 2026, tras el punto de control (run 44349192421): en Firefox a 390,
 * nodos de la app se desplazan 10 px en x en el primer par de fotogramas, en las siete rutas y también en estos controles,
 * mientras el bloque del control no se movía; eso es un hallazgo de la ruta (PR B), no del método. Los demás desplazamientos
 * se siguen registrando en la línea de la carga.
 */
const ownShifts = (result: { desplazamientos: { ruta: string | null }[] }) => result.desplazamientos.filter((shift) => /cls-control-/.test(shift.ruta ?? "")).length;
/** La ruta del nodo (`etiqueta.clase>…`) termina en el propio `main`. */
const IS_MAIN = /(^|>)main(\.[^>]*)?$/;

if (SET === "controls") {
  test("@release control 1 · positivo: un bloque de 40 px encima de main → dy de 40 ± 1", async ({ browser, baseURL }) => {
    test.setTimeout(10 * 60_000);
    let ok = 0;
    for (let i = 0; i < count(); i++) {
      const page = await sessionLoad(browser, baseURL!, CONTROL_ROUTE, "light", width(i), [CONTROLS.positive]);
      const result = await measured(page, { control: 1, ruta: CONTROL_ROUTE, motor: engine(browser), tema: "claro", ancho: width(i), carga: i + 1 });
      if (result.desplazamientos.some((s: { dy: number; ruta: string | null }) => Math.abs(s.dy - 40) <= 1 && IS_MAIN.test(s.ruta ?? ""))) ok++;
    }
    controlRows.push({ control: "1 · positivo", motor: engine(browser), cumple: ok, cargas: count() });
    verdict(ok === count(), `control 1 · positivo · ${engine(browser)}: ${ok} de ${count()}`);
  });

  test("@release control 2 · resolución: 1 px detectado; 0,5 px solo se registra", async ({ browser, baseURL }) => {
    test.setTimeout(15 * 60_000);
    let ok = 0, half = 0;
    for (let i = 0; i < count(); i++) {
      const page = await sessionLoad(browser, baseURL!, CONTROL_ROUTE, "light", width(i), [CONTROLS.onePixel]);
      const result = await measured(page, { control: "2 · 1 px", ruta: CONTROL_ROUTE, motor: engine(browser), tema: "claro", ancho: width(i), carga: i + 1 });
      if (result.desplazamientos.some((s: { dy: number; ruta: string | null }) => s.dy === 1 && IS_MAIN.test(s.ruta ?? ""))) ok++;
    }
    for (let i = 0; i < count(); i++) {
      const page = await sessionLoad(browser, baseURL!, CONTROL_ROUTE, "light", width(i), [CONTROLS.halfPixel]);
      const result = await measured(page, { control: "2 · 0,5 px", ruta: CONTROL_ROUTE, motor: engine(browser), tema: "claro", ancho: width(i), carga: i + 1 });
      if (result.desplazamientos.length) half++;
    }
    controlRows.push({ control: "2 · 1 px", motor: engine(browser), cumple: ok, cargas: count() });
    verdict(ok === count(), `control 2 · 1 px · ${engine(browser)}: ${ok} de ${count()}`);
    controlRows.push({ control: "2 · 0,5 px (solo se registra)", motor: engine(browser), cumple: half, cargas: count(), nota: "vistas, sin resultado exigido" });
  });

  test("@release control 3 · ruta quieta: A1 sin esqueleto ni cambios → cero", async ({ browser, baseURL }) => {
    test.setTimeout(10 * 60_000);
    let ok = 0;
    for (let i = 0; i < count(); i++) {
      const page = await publicLoad(browser, baseURL!, "a1", "light", width(i));
      const result = await measured(page, { control: 3, ruta: "a1", motor: engine(browser), tema: "claro", ancho: width(i), carga: i + 1 });
      if (result.desplazamientos.length === 0) ok++;
    }
    controlRows.push({ control: "3 · ruta quieta", motor: engine(browser), cumple: ok, cargas: count() });
    verdict(ok === count(), `control 3 · ruta quieta · ${engine(browser)}: ${ok} de ${count()}`);
  });

  test("@release control 4 · animación con transformación (Web Animations y estilo en línea) → cero; en Chromium, la API también", async ({ browser, baseURL, browserName }) => {
    test.setTimeout(10 * 60_000);
    let ok = 0, api = 0;
    for (let i = 0; i < count(); i++) {
      const variant = i % 2 ? "inline" : "waapi";
      const init = browserName === "chromium" ? [CONTROLS[variant], CLS_OBSERVER] : [CONTROLS[variant]];
      const page = await sessionLoad(browser, baseURL!, CONTROL_ROUTE, "light", width(i), init);
      const cls = browserName === "chromium" ? await page.evaluate(() => (window as unknown as { __cls: number }).__cls) : null;
      const result = await measured(page, { control: `4 · ${variant}`, ruta: CONTROL_ROUTE, motor: engine(browser), tema: "claro", ancho: width(i), carga: i + 1, clsApi: cls });
      if (ownShifts(result) === 0) ok++;
      if (cls === 0) api++;
    }
    controlRows.push({ control: "4 · transformación", motor: engine(browser), cumple: ok, cargas: count() });
    verdict(ok === count(), `control 4 · transformación · ${engine(browser)}: ${ok} de ${count()}`);
    if (browserName === "chromium") {
      controlRows.push({ control: "4 · API CLS = 0 en las mismas cargas", motor: engine(browser), cumple: api, cargas: count() });
      verdict(api === count(), `control 4 · API CLS = 0 · ${engine(browser)}: ${api} de ${count()}`);
    }
  });

  test("@release control 5 · transición CSS en curso → cero y la posición medida del bloque no cambia", async ({ browser, baseURL }) => {
    test.setTimeout(10 * 60_000);
    let ok = 0;
    for (let i = 0; i < count(); i++) {
      const page = await sessionLoad(browser, baseURL!, CONTROL_ROUTE, "light", width(i), [CONTROLS.transition]);
      await page.waitForFunction(() => (window as unknown as { __clsFrames?: { done?: boolean } }).__clsFrames?.done === true, null, { timeout: 60_000 });
      const own = await page.evaluate(() => {
        const w = window as unknown as { __clsControlBlock?: Element; __clsFramesIdOf: (el: Element) => number | null; __clsFrames: { frames: { boxes: number[][] }[] } };
        const id = w.__clsControlBlock ? w.__clsFramesIdOf(w.__clsControlBlock) : null;
        const positions = new Set(w.__clsFrames.frames.flatMap((f) => f.boxes.filter((b) => b[0] === id).map((b) => `${b[2]},${b[3]}`)));
        return { id, positions: positions.size };
      });
      const result = await measured(page, { control: 5, ruta: CONTROL_ROUTE, motor: engine(browser), tema: "claro", ancho: width(i), carga: i + 1, bloque: own });
      if (ownShifts(result) === 0 && own.id !== null && own.positions === 1) ok++;
    }
    controlRows.push({ control: "5 · transición CSS en curso", motor: engine(browser), cumple: ok, cargas: count() });
    verdict(ok === count(), `control 5 · transición CSS en curso · ${engine(browser)}: ${ok} de ${count()}`);
  });

  test("@release control 6 · scroll con sticky y fixed → cero", async ({ browser, baseURL }) => {
    test.setTimeout(10 * 60_000);
    let ok = 0;
    for (let i = 0; i < count(); i++) {
      const page = await sessionLoad(browser, baseURL!, CONTROL_ROUTE, "light", width(i), [CONTROLS.scroll]);
      const result = await measured(page, { control: 6, ruta: CONTROL_ROUTE, motor: engine(browser), tema: "claro", ancho: width(i), carga: i + 1 });
      if (ownShifts(result) === 0) ok++;
    }
    controlRows.push({ control: "6 · scroll con sticky y fixed", motor: engine(browser), cumple: ok, cargas: count() });
    verdict(ok === count(), `control 6 · scroll con sticky y fixed · ${engine(browser)}: ${ok} de ${count()}`);
  });

  test("@release resumen de fiabilidad del motor (controles 1 a 6; el 7 sale de release-cls en Chromium)", async ({ browserName }) => {
    const exigidos = controlRows.filter((row) => !row.nota);
    const fiable = exigidos.length === 7 - (browserName === "chromium" ? 0 : 1) && exigidos.every((row) => row.cumple === row.cargas);
    for (const row of controlRows) await record("cls-frames.jsonl", { kind: "control", ...row, rotulo: `${row.cumple} de ${row.cargas}` });
    // «Fiable» exige además el control 7 en Chromium (concordancia con la API, tramos cls-*): aquí solo los controles 1 a 6.
    await record("cls-frames.jsonl", { kind: "fiabilidad", motor: controlRows[0]?.motor, controles1a6: fiable ? "cumplen" : "no cumplen", nota: browserName === "chromium" ? "falta el control 7 (release-cls)" : "" });
  });
}

