// 005 · T023 (FR-050, SC-005; research R6). CLS de laboratorio en Chromium, una ruta por tramo del job `release`
// (RELEASE_CLS_ROUTE: inicio-yo, inicio-nosotros, actividad, balance, plan, analisis o metas). Generaliza el observador de
// theme-cls.capture.ts y home-states.capture.ts: 40 cargas en claro y 10 en oscuro, alternando 390 y 1440, con CPU 6× y red
// lenta por CDP; CLS de la API sin redondear por carga, con las fuentes de cada desplazamiento. El grabador del comparador
// corre a la vez (control 7, concordancia con la API; contracts/cls-comparator.md §5). Consolida 003-T054, 003-T068,
// 004-T040, 004-T054 (CLS de Metas) y 004-T079. Salida: test-results/evidence/release-cls.jsonl (una línea por carga) y
// cls-frames.jsonl (el resultado del comparador de las mismas cargas). RELEASE_CLS_LOADS reduce las cargas en local.
import { rmSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { CLS_OBSERVER, RECORDER, SESSION_ROUTES, readFrames, record, seedReleaseCouple, sessionContext, themeLabel, type SessionRoute, type Theme } from "./release-support";

const ROUTE = (process.env.RELEASE_CLS_ROUTE ?? "inicio-yo") as SessionRoute;
const LOCAL = Number(process.env.RELEASE_CLS_LOADS ?? 0) || null;
const LIGHT = LOCAL ?? 40, DARK = LOCAL ? Math.max(1, Math.floor(LOCAL / 2)) : 10;
// Red lenta y CPU 6×, como theme-cls.capture.ts (R2 de la 001).
const NETWORK = { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 };

test(`@release CLS de 40 cargas · ${ROUTE}`, async ({ browser, baseURL, browserName }) => {
  test.skip(browserName !== "chromium", "La API Layout Instability y la emulación por CDP solo existen en Chromium (FR-050).");
  if (!(ROUTE in SESSION_ROUTES)) throw new Error(`RELEASE_CLS_ROUTE desconocida: ${ROUTE}`);
  test.setTimeout(25 * 60_000);
  const spec = SESSION_ROUTES[ROUTE];
  const pair = await seedReleaseCouple(test.info().parallelIndex);
  const motor = `chromium ${browser.version()}`;
  const plan: { theme: Theme; width: number }[] = [
    ...Array.from({ length: LIGHT }, (_, i) => ({ theme: "light" as Theme, width: i % 2 ? 1440 : 390 })),
    ...Array.from({ length: DARK }, (_, i) => ({ theme: "dark" as Theme, width: i % 2 ? 1440 : 390 })),
  ];
  // T046: RELEASE_CLS_PART=1/2 o 2/2 corre la mitad de las cargas (claro y oscuro repartidos); entre las dos, las 50.
  const part = /^([12])\/2$/.exec(process.env.RELEASE_CLS_PART ?? "")?.[1];
  const half = (list: typeof plan, which: string) => list.filter((_, i) => (i < list.length / 2) === (which === "1"));
  const light = plan.slice(0, LIGHT), dark = plan.slice(LIGHT);
  const chosen = new Set(part ? [...half(light, part), ...half(dark, part)] : plan);
  const tally = { cargas: 0, apiMayorQueCero: 0, porFotogramas: 0, coinciden: 0, discrepancias: 0, sinVentana: 0, coincidenEnVentana: 0, discrepanciasEnVentana: 0 };
  for (const [index, load] of plan.entries()) {
    if (!chosen.has(load)) continue;
    const { theme, width } = load;
    const context = await sessionContext(browser, baseURL!, pair, { theme, width, context: spec.context, recordVideo: true });
    const page = await context.newPage();
    await page.addInitScript(CLS_OBSERVER);
    await page.addInitScript(RECORDER);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", NETWORK);
    await page.goto(spec.path, { waitUntil: "commit" });
    await expect(page.locator("main").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("[data-skeleton]")).toHaveCount(0, { timeout: 60_000 });
    const meta = { ruta: ROUTE, motor, tema: themeLabel(theme), ancho: width, carga: index + 1 };
    const { result, frames: recorded } = await readFrames(page, meta);
    const api = await page.evaluate(() => { const w = window as unknown as { __cls: number; __shifts: { value: number; t: number }[] }; return { cls: w.__cls, shifts: w.__shifts }; });
    // Control 7, decisión del gestor del 18 nov 2026 (run 44349192421): el instante de cada desplazamiento de la API frente a
    // la ventana del comparador (del primer fotograma con esqueleto al primer final), con un fotograma de margen. Mismo reloj:
    // `startTime` de la API y el `t` de requestAnimationFrame del grabador son de `performance.now()`.
    const FRAME = 17;
    const span = result.ventana ? { desde: recorded.frames[result.ventana.desde].t, hasta: recorded.frames[result.ventana.hasta].t } : null;
    const moment = (t: number) => (!span ? "sin ventana" : t < span.desde - FRAME ? "antes" : t > span.hasta + FRAME ? "después" : "dentro");
    const timed = api.shifts.map((shift) => ({ ...shift, momento: moment(shift.t) }));
    const inWindow = timed.filter((shift) => shift.momento === "dentro").reduce((sum, shift) => sum + shift.value, 0);
    const video = page.video();
    await context.close();
    const path = video ? await video.path().catch(() => null) : null;
    const frames = result.desplazamientos.length > 0;
    // Control 7: una carga tiene desplazamientos por fotogramas si y solo si la API da CLS > 0. Sin ventana (el esqueleto
    // no llegó a pintarse) el comparador no dice nada: se cuenta aparte, no como acuerdo.
    const agree = result.ventana ? frames === api.cls > 0 : null;
    // La misma concordancia con solo la parte de la API que cae dentro de la ventana (lo que el comparador compara).
    const agreeInWindow = result.ventana ? frames === inWindow > 0 : null;
    if (agreeInWindow === true) tally.coincidenEnVentana++; else if (agreeInWindow === false) tally.discrepanciasEnVentana++;
    tally.cargas++; if (api.cls > 0) tally.apiMayorQueCero++; if (frames) tally.porFotogramas++;
    if (agree === true) tally.coinciden++; else if (agree === false) tally.discrepancias++; else tally.sinVentana++;
    // Vídeo solo de las cargas con desplazamiento o discrepancia, para la revisión humana; no entra al repositorio.
    const keepVideo = frames || api.cls > 0 || agree === false;
    if (path && !keepVideo) rmSync(path, { force: true });
    await record("release-cls.jsonl", { ...meta, rotulo: "laboratorio · API Layout Instability", cpu: "6×", red: NETWORK, cls: api.cls, clsEnVentana: inWindow, ventanaMs: span, fuentes: timed, porFotogramas: result.desplazamientos.length, ventana: result.ventana, concordancia: agree, concordanciaEnVentana: agreeInWindow, video: keepVideo ? path : null });
    await record("cls-frames.jsonl", { ...result, control: 7, clsApi: api.cls });
    expect.soft(api.cls, `${ROUTE} ${themeLabel(theme)} ${width} carga ${index + 1}`).toBe(0);
  }
  await record("release-cls.jsonl", { kind: "resumen", ruta: ROUTE, parte: part ? `${part}/2` : "completa", motor, ...tally, clsCero: tally.apiMayorQueCero === 0, control7: tally.discrepancias >= 2 ? "no fiable en Chromium (dos o más discrepancias)" : `${tally.discrepancias} discrepancia(s) a investigar` });
});
