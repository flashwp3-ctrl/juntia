// 005 · Soporte compartido de los arneses de laboratorio del job `release` (contracts/ci.md; contracts/cls-comparator.md).
// No es una prueba: lo importan release-cls, cls-frames, release-lcp, release-goalstack y release-long-lists.
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { compareLoad } from "../../scripts/cls-frames/compare.mjs";
import { spawnRunnerSql } from "../integration/support/sql";
import { seedCouple, seedMovements, seedSharedMovements, type SeededCouple } from "../support/seed";

export const OUT = "test-results/evidence";
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const themeLabel = (theme: Theme) => (theme === "light" ? "claro" : "oscuro");

/**
 * Las rutas con sesión de FR-050 y la tabla que retiene su lectura en el servidor (research R5), fijada leyendo qué vista
 * consulta cada `page.tsx`: Inicio en Yo y Actividad leen `my_transactions` (`transactions`); Balance, `couple_balance` y
 * `couple_settlements` (`settlements`); Plan y Análisis, `budget_months` y `budget_history` (`budget_versions`); Metas,
 * `goals_overview` (`goal_ledger_entries`). Inicio en Nosotros lee `couple_balance`, y se retiene `settlements` y no
 * `transactions`: con pareja activa, el layout de (app) lee `couple_expenses` (`loadCoupleForSheet`), así que bloquear
 * `transactions` retendría el layout entero y no habría esqueleto que medir.
 */
export const SESSION_ROUTES = {
  "inicio-yo": { path: "/", context: "me", table: "transactions" },
  "inicio-nosotros": { path: "/", context: "us", table: "settlements" },
  actividad: { path: "/actividad", context: "me", table: "transactions" },
  balance: { path: "/balance", context: "us", table: "settlements" },
  plan: { path: "/plan", context: "us", table: "budget_versions" },
  analisis: { path: "/plan/analisis", context: "us", table: "budget_versions" },
  metas: { path: "/metas", context: "us", table: "goal_ledger_entries" },
} as const;
export type SessionRoute = keyof typeof SESSION_ROUTES;
/** Sin sesión (A1, A2, A4): sin retención (contrato del comparador §6). */
export const PUBLIC_ROUTES = { a1: "/entrar", a2: "/crear-cuenta", a4: "/recuperar" } as const;
export type PublicRoute = keyof typeof PUBLIC_ROUTES;

export async function record(file: string, row: object) {
  await mkdir(OUT, { recursive: true });
  await appendFile(`${OUT}/${file}`, `${JSON.stringify(row)}\n`);
  console.log(JSON.stringify(row));
}

/** Pareja con el dataset dorado de P0-1 a P0-3 y movimientos en el mes en curso, para que cada ruta tenga contenido. */
export async function seedReleaseCouple(index: number): Promise<SeededCouple> {
  const pair = await seedCouple({ index, golden: true });
  await seedSharedMovements(pair, "recent");
  await seedMovements(pair.sara, "recent");
  return pair;
}

/** Contexto de Sara con su sesión, el tema guardado y el contexto (Yo o Nosotros) de la ruta. */
export async function sessionContext(browser: Browser, baseURL: string, pair: SeededCouple, options: { theme: Theme; width: number; context: "me" | "us"; recordVideo?: boolean }) {
  await pair.sara.client.rpc("set_theme", { p_theme: options.theme });
  const host = new URL(baseURL).hostname;
  const context = await browser.newContext({ baseURL, viewport: { width: options.width, height: 900 }, colorScheme: options.theme, reducedMotion: "reduce",
    ...(options.recordVideo ? { recordVideo: { dir: `${OUT}/video` } } : {}) });
  await context.addCookies([...pair.sara.cookies.map((cookie) => ({ ...cookie, domain: host })),
    { name: "juntia_theme", value: options.theme, domain: host, path: "/", sameSite: "Lax" },
    { name: "juntia_context", value: options.context, domain: host, path: "/", sameSite: "Lax" }]);
  await context.addInitScript((value) => window.localStorage.setItem("juntia:context", value), options.context);
  return context;
}

export async function publicContext(browser: Browser, baseURL: string, options: { theme: Theme; width: number; recordVideo?: boolean }) {
  const context = await browser.newContext({ baseURL, viewport: { width: options.width, height: 900 }, colorScheme: options.theme, reducedMotion: "reduce",
    ...(options.recordVideo ? { recordVideo: { dir: `${OUT}/video` } } : {}) });
  await context.addCookies([{ name: "juntia_theme", value: options.theme, domain: new URL(baseURL).hostname, path: "/", sameSite: "Lax" }]);
  return context;
}

/** Retiene la lectura de una tabla con un bloqueo real (`access exclusive`) hasta `release` (research R5). */
export async function holdTable(table: string) {
  if (!/^[a-z_]+$/.test(table)) throw new Error("Tabla inválida");
  const psql = spawnRunnerSql();
  psql.stdin.write(`begin; lock table juntia_data.${table} in access exclusive mode; select 'locked';\n`);
  await new Promise<void>((resolve, reject) => {
    psql.stdout.on("data", (chunk) => { if (String(chunk).includes("locked")) resolve(); });
    psql.on("close", () => reject(new Error(`No se pudo bloquear ${table}`)));
  });
  let released = false;
  return () => {
    if (released) return Promise.resolve();
    released = true;
    return new Promise<void>((resolve) => { psql.on("close", () => resolve()); psql.stdin.end("commit;\n"); });
  };
}

/** El grabador tal cual, sin imports: el mismo archivo que se pega en Safari con el Mac (R11). */
export const RECORDER = readFileSync("scripts/cls-frames/recorder.js", "utf8");

/** Observador de la API Layout Instability (Chromium): CLS sin redondear y las fuentes de cada desplazamiento. */
export const CLS_OBSERVER = `(() => { const w = window; w.__cls = 0; w.__shifts = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) { w.__cls += e.value;
    w.__shifts.push({ value: e.value, t: e.startTime, sources: (e.sources || []).map((s) => ({ node: s.node ? s.node.nodeName : null, from: [s.previousRect.x, s.previousRect.y], to: [s.currentRect.x, s.currentRect.y] })) }); } } })
    .observe({ type: "layout-shift", buffered: true }); } catch { w.__cls = null; } })();`;

type Frames = Parameters<typeof compareLoad>[0];
/** Espera a que el grabador termine y devuelve su salida, el resultado del comparador y las rutas de los nodos movidos. */
export async function readFrames(page: Page, meta: Record<string, unknown>) {
  await page.waitForFunction(() => (window as unknown as { __clsFrames?: { done?: boolean } }).__clsFrames?.done === true, null, { timeout: 60_000 });
  const frames = await page.evaluate(() => (window as unknown as { __clsFrames: Frames }).__clsFrames);
  // Solo en local: CLS_FRAMES_DUMP guarda la salida cruda del grabador (diagnóstico y fixture de T034).
  if (process.env.CLS_FRAMES_DUMP) {
    await mkdir(`${OUT}/raw`, { recursive: true });
    await writeFile(`${OUT}/raw/${Object.values(meta).join("-").replace(/[^\w.-]+/g, "_")}.json`, JSON.stringify(frames));
  }
  const first = compareLoad(frames, meta);
  const ids = [...new Set(first.desplazamientos.map((shift: { id: number }) => shift.id))];
  const paths = ids.length ? await page.evaluate((list) => (window as unknown as { __clsFramesDescribe: (ids: number[]) => Record<string, string> }).__clsFramesDescribe(list), ids) : {};
  return { frames, result: compareLoad(frames, meta, paths) };
}

/**
 * Navega a una ruta con sesión reteniendo su lectura en el servidor (R5): 1,5 s contados desde el primer fotograma PINTADO
 * con esqueleto que ve el grabador (o, sin grabador, desde que el esqueleto está en el DOM).
 */
export async function loadWithHold(page: Page, path: string, table: string, holdMs = 1500) {
  const release = await holdTable(table);
  try {
    await page.goto(path, { waitUntil: "commit" });
    // Sin esperas fijas (ADR-011 §6, regla 4): la condición es el tiempo que la propia página lleva pintando el esqueleto.
    await page.waitForFunction((ms) => {
      const recorder = (window as unknown as { __clsFrames?: { frames: { t: number; skeleton: boolean }[] } }).__clsFrames;
      const w = window as unknown as { __holdStart?: number };
      const painted = recorder ? recorder.frames.find((frame) => frame.skeleton)?.t : document.querySelector("[data-skeleton]") ? (w.__holdStart ??= performance.now()) : undefined;
      return painted !== undefined && performance.now() - painted >= ms;
    }, holdMs, { timeout: 60_000 });
  } finally {
    await release();
  }
}

export const nextFrames = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
export const uid = () => randomUUID().slice(0, 8);
export type { BrowserContext };
