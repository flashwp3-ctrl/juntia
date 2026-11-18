// 005 · contracts/ci.md, «Job nuevo: release» (FR-020, FR-050–FR-054, FR-093; F85-7). Los tramos del job `release` (17, y 25 desde T046)
// (solo `workflow_dispatch` con `release_lab`, nunca en un PR, no es del gate) y qué ejecuta cada uno. El workflow solo
// llama a este script, así que la prueba (tests/ci-workflow.test.ts) afirma la matriz y los comandos sin lanzar CI.
//
//   node scripts/release-leg.mjs requested <tramo>   ¿lo pide `release_legs`? (salida `run` y, si no, «no pedido»)
//   node scripts/release-leg.mjs browser <tramo>     chromium | webkit | firefox (salida `browser`)
//   node scripts/release-leg.mjs run <tramo>         ejecuta sus comandos en serie y apunta su tiempo
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Las siete rutas con sesión de FR-050, una por tramo de Chromium. */
export const CLS_ROUTES = ["inicio-yo", "inicio-nosotros", "actividad", "balance", "plan", "analisis", "metas"];
/**
 * T046 (F85-7; regla 5): los tramos que midieron más de 600 s en el punto de control (run 44349192421) se parten en dos
 * SIN quitar cargas. Las rutas de CLS de Chromium partidas reparten sus 50 cargas en dos mitades (RELEASE_CLS_PART); los
 * tramos de rutas de WebKit y Firefox reparten sus rutas en `a` y `b`.
 */
export const SPLIT_CLS_ROUTES = ["inicio-yo", "actividad"];
/** En tercios desde el parcial 44355668184: las mitades midieron 607–639 s (cargas de ~15 s y ~270 s de arranque). */
export const CLS_PARTS = 3;
export const LEGS = [
  ...CLS_ROUTES.flatMap((route) => (SPLIT_CLS_ROUTES.includes(route) ? Array.from({ length: CLS_PARTS }, (_, i) => `cls-${route}-${i + 1}`) : [`cls-${route}`])),
  "cls-controls-chromium", "lab-interaction", "webkit-e2e-1", "webkit-e2e-2",
  "webkit-cls-1", "webkit-cls-2a", "webkit-cls-2b", "webkit-cls-3a", "webkit-cls-3b",
  "firefox-cls-1", "firefox-cls-2a", "firefox-cls-2b", "firefox-cls-3a", "firefox-cls-3b",
];
/** Los conjuntos del arnés del comparador por tramo (contracts/cls-comparator.md §5 y §6). */
export const CLS_FRAMES_SETS = { "1": "controls", "2a": "routes-1a", "2b": "routes-1b", "3a": "routes-2a", "3b": "routes-2b" };

const playwright = (...args) => ["playwright", "test", ...args, "--retries", "0", "--reporter=line"];
/** Los arneses del laboratorio llevan la etiqueta @release; el job `evidence` la excluye y los tramos solo corren esa. */
const lab = (...args) => playwright(...args, "--grep", "@release");

/**
 * El plan de un tramo: su navegador y sus comandos (argumentos de `npx` y variables). Lanza con un tramo desconocido.
 * @param {string} leg
 * @returns {{ browser: "chromium" | "webkit" | "firefox", commands: { label: string, args: string[], env: Record<string, string> }[] }}
 */
export function legPlan(leg) {
  if (!LEGS.includes(leg)) throw new Error(`Tramo desconocido: ${leg}`);
  const cls = /^cls-(.+?)(?:-([1-9]))?$/.exec(leg);
  if (cls && CLS_ROUTES.includes(cls[1]) && (cls[2] === undefined) === !SPLIT_CLS_ROUTES.includes(cls[1])) {
    // FR-050: 40 cargas en claro y 10 en oscuro de una ruta, con la API y el grabador a la vez (control 7); partida, la mitad.
    return { browser: "chromium", commands: [{ label: leg, args: lab("--project=evidence", "tests/evidence/release-cls.capture.ts", "--workers", "1"),
      env: { RELEASE_CLS_ROUTE: cls[1], ...(cls[2] ? { RELEASE_CLS_PART: `${cls[2]}/${CLS_PARTS}` } : {}) } }] };
  }
  if (leg === "cls-controls-chromium") {
    return { browser: "chromium", commands: [{ label: leg, args: lab("--project=evidence", "tests/evidence/cls-frames.capture.ts", "--workers", "1"), env: { CLS_FRAMES_SET: "controls" } }] };
  }
  if (leg === "lab-interaction") {
    return { browser: "chromium", commands: [{ label: leg, args: lab("--project=evidence", "tests/evidence/inp.capture.ts", "tests/evidence/release-lcp.capture.ts",
      "tests/evidence/release-goalstack.capture.ts", "tests/evidence/release-long-lists.capture.ts", "--workers", "1"), env: {} }] };
  }
  const e2e = /^webkit-e2e-([12])$/.exec(leg);
  if (e2e) {
    // Las cinco specs una vez en WebKit (FR-020), como el gate: primero sin @serial y después @serial con un worker.
    const shard = `--shard=${e2e[1]}/2`;
    return { browser: "webkit", commands: [
      { label: `${leg} (sin @serial)`, args: playwright("--project=e2e-webkit", shard, "--grep-invert", "@serial"), env: {} },
      { label: `${leg} (@serial, 1 worker)`, args: playwright("--project=e2e-webkit", shard, "--grep", "@serial", "--workers", "1", "--pass-with-no-tests"), env: {} },
    ] };
  }
  const frames = /^(webkit|firefox)-cls-(1|2a|2b|3a|3b)$/.exec(leg);
  if (frames) {
    const browser = /** @type {"webkit" | "firefox"} */ (frames[1]);
    return { browser, commands: [{ label: leg, args: lab(`--project=evidence-${browser}`, "tests/evidence/cls-frames.capture.ts", "--workers", "1"), env: { CLS_FRAMES_SET: CLS_FRAMES_SETS[frames[2]] } }] };
  }
  throw new Error(`Tramo sin plan: ${leg}`);
}

/**
 * `release_legs`: vacío = todos; si no, nombres o prefijos separados por comas (`cls-metas,webkit-cls`).
 * @param {string} leg
 * @param {string | undefined} requested
 */
export function legRequested(leg, requested) {
  return validateLegs(requested).includes(leg);
}

/**
 * F87-3 (revisión del PR #87): la selección de \`release_legs\`, validada entera ANTES de la matriz (paso de \`inputs-guard\`).
 * Vacía (o solo espacios) = todos los tramos. Lanza con un elemento vacío (\`a,,b\`, \`,\`), con un nombre o prefijo que no
 * coincide con ningún tramo (\`webkit-clss\`) o si la selección no deja ningún tramo. Devuelve los tramos elegidos.
 * @param {string | undefined} requested
 * @returns {string[]}
 */
export function validateLegs(requested) {
  const raw = (requested ?? "").trim();
  if (raw === "") return [...LEGS];
  const items = raw.split(",").map((item) => item.trim());
  if (items.some((item) => item === "")) throw new Error(`release_legs tiene un elemento vacío: «${raw}»`);
  const unknown = items.filter((item) => !LEGS.some((leg) => leg === item || leg.startsWith(item)));
  if (unknown.length) throw new Error(`release_legs no coincide con ningún tramo: ${unknown.join(", ")}`);
  return LEGS.filter((leg) => items.some((item) => leg === item || leg.startsWith(item)));
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) {
  const [mode, leg] = process.argv.slice(2);
  const output = (line) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`); console.log(line); };
  const summary = (line) => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`); };
  if (mode === "validate") {
    // F87-3: en inputs-guard, antes de la matriz. Un error deja el workflow en rojo y no arranca ningún tramo.
    try {
      const legs = validateLegs(process.env.RELEASE_LEGS);
      console.log(`release_legs válida: ${legs.length} de ${LEGS.length} tramos (${legs.join(", ")})`);
      summary(`release_legs: ${legs.length} de ${LEGS.length} tramos.`);
    } catch (error) {
      console.log(`::error title=release_legs::${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  } else if (mode === "requested") {
    const run = legRequested(leg, process.env.RELEASE_LEGS);
    output(`run=${run}`);
    // Un tramo no pedido termina en segundos y lo dice; nunca se presenta como aprobado.
    if (!run) summary(`**${leg}: no pedido** (release_legs = «${process.env.RELEASE_LEGS}»). No se ejecutó nada; no es un tramo aprobado.`);
  } else if (mode === "browser") {
    output(`browser=${legPlan(leg).browser}`);
  } else if (mode === "run") {
    const timingFile = join(process.env.RUNNER_TEMP ?? tmpdir(), `juntia-ci-${process.env.GITHUB_JOB ?? "local"}.jsonl`);
    let failed = 0;
    for (const command of legPlan(leg).commands) {
      const start = Date.now();
      const result = spawnSync("npx", command.args, { stdio: "inherit", env: { ...process.env, ...command.env }, shell: process.platform === "win32" });
      const seconds = (Date.now() - start) / 1000;
      appendFileSync(timingFile, JSON.stringify({ command: command.label, seconds, status: result.status ?? 1 }) + "\n");
      if (result.status !== 0) failed++;
    }
    process.exitCode = failed ? 1 : 0;
  } else {
    console.error("Uso: node scripts/release-leg.mjs requested|browser|run <tramo>");
    process.exitCode = 1;
  }
}
