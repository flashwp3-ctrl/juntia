// Decisión de los fundadores del 11 nov 2026 (maestro §15.10, decisión 21); specs/004-presupuestos-y-metas/contracts/ci.md,
// «Selector de accesibilidad por área». Determinista, con el mismo criterio que scripts/e2e-select.mjs: recibe los archivos
// cambiados del PR (`git diff --name-only <base>...HEAD`) y devuelve los archivos `tests/a11y/*.a11y.ts` del NIVEL LIGERO que
// corren en el paso de axe del job `e2e`, y las áreas del registro que recorre routes.a11y.ts (`A11Y_ROUTE_AREAS`, opción C
// del gestor). Reglas, en orden: (1) un archivo a11y cambiado → ese archivo (routes.a11y.ts, el registro completo); (2) un
// archivo de código de un área → los archivos y las áreas del registro de esa área; (3) neutros, nada; (4) lo compartido, lo
// desconocido, una base que no se puede calcular o un fallo del script → todos, con el registro completo. El barrido `@sweep`
// (A11Y_LEVEL=sweep) no pasa por aquí: corre entero. Solo se pasan a Playwright los archivos que EXISTEN en el commit; uno
// previsto que aún no existe se anota y no se pasa.
// Uso en CI: `node scripts/a11y-select.mjs --base <sha>` escribe `files`, `route_areas` y `skip` en $GITHUB_OUTPUT y el resumen en
// $GITHUB_STEP_SUMMARY. Si el mapa no da lo que espera un fixture de su prueba (tests/a11y-select.test.ts), se corrige aquí o
// el fixture, nunca a mano en el workflow.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Cada archivo del nivel ligero y su área. Una prueba exige que cubra todos los tests/a11y/**\/*.a11y.ts. */
export const FILES = {
  "tests/a11y/routes.a11y.ts": "registro",
  "tests/a11y/couple.a11y.ts": "pareja",
  "tests/a11y/couple-shared.a11y.ts": "compartidos",
  "tests/a11y/balance.a11y.ts": "balance",
  "tests/a11y/goals.a11y.ts": "metas",
  "tests/a11y/goal-expense.a11y.ts": "gasto con meta",
  "tests/a11y/plan.a11y.ts": "presupuestos",
};
export const ROUTES_FILE = "tests/a11y/routes.a11y.ts";
/**
 * Las áreas del registro (tests/a11y/route-registry.ts, `ROUTE_AREAS` y `routeArea`), que routes.a11y.ts filtra con
 * `A11Y_ROUTE_AREAS`. Opción C del gestor: los casos de /metas, /plan, /balance y /cuenta/pareja (e /invitacion) van con su
 * área; el núcleo (acceso, Inicio, Actividad, detalle, Anotar, /cuenta, exportación) solo con lo compartido o el núcleo.
 */
export const ROUTE_AREAS = ["nucleo", "metas", "presupuestos", "balance", "pareja"];
const ALL = Object.keys(FILES);
const ofArea = (...areas) => ALL.filter((file) => areas.includes(FILES[file]));

/**
 * Las áreas: qué archivos de código piden qué archivos a11y (`files`) y qué áreas del registro (`routes`). Gana la primera
 * fila que encaja. Metas y presupuestos repiten las reglas de e2e-select.mjs; pareja, compartidos, Balance y núcleo son
 * propias de axe, porque en E2E las cubren las specs 1–3, que corren siempre.
 */
const AREAS = [
  // Las métricas alimentan Metas y Plan/Análisis (regla 4 de e2e-select.mjs; las cargan features/goals y features/plan).
  { why: "métricas: metas y presupuestos", files: ofArea("metas", "gasto con meta", "presupuestos"), routes: ["metas", "presupuestos"],
    rules: [/^src\/domain\/metrics\//, /^src\/lib\/db\/metrics\.ts$/] },
  // Gasto con meta: B1–B3 en Anotar, B4/B7 en Actividad y B5 en Inicio; ninguno de esos estados está en el registro.
  { why: "gasto con meta", files: ofArea("gasto con meta"), routes: [],
    rules: [/^src\/features\/expenses\/goal-funding\//, /^src\/lib\/db\/goal-usage\.ts$/] },
  { why: "área de metas", files: ofArea("metas", "gasto con meta"), routes: ["metas"], rules: [
    /^src\/app\/\(app\)\/metas\//, /^src\/features\/goals\//, /^src\/domain\/goals\//, /^src\/lib\/db\/goals\.ts$/,
    /^supabase\/migrations\/[^/]*_goal[^/]*\.sql$/,
  ] },
  { why: "área de presupuestos", files: ofArea("presupuestos"), routes: ["presupuestos"], rules: [
    /^src\/app\/\(app\)\/plan\//, /^src\/features\/plan\//, /^src\/features\/analysis\//, /^src\/domain\/budgets\//,
    /^src\/domain\/analysis\//, /^src\/lib\/db\/(?:budgets|planning)\.ts$/, /^supabase\/migrations\/[^/]*_budget[^/]*\.sql$/,
  ] },
  { why: "área de Balance", files: ofArea("balance"), routes: ["balance"], rules: [
    /^src\/app\/\(app\)\/balance\//, /^src\/features\/balance\//, /^src\/domain\/balances\//, /^src\/lib\/db\/settlements\.ts$/,
  ] },
  { why: "área de pareja", files: ofArea("pareja"), routes: ["pareja"], rules: [
    /^src\/app\/\(app\)\/cuenta\/pareja\//, /^src\/app\/invitacion\//, /^src\/features\/couple\//, /^src\/domain\/couple\//,
    /^src\/lib\/db\/(?:couple|invitation-token)\.ts$/,
  ] },
  // Los gastos compartidos se ven en Inicio y Actividad en Nosotros, que son del núcleo del registro.
  { why: "gastos compartidos", files: ofArea("compartidos"), routes: ["nucleo"], rules: [
    /^src\/features\/expenses\/(?:shared-[^/]+|split-[^/]+|reclassify-[^/]+)\.tsx?$/, /^src\/features\/shared\//,
    /^src\/domain\/allocations\//, /^src\/lib\/db\/(?:shared-expenses|couple-reads|reclassify)\.ts$/,
  ] },
  // Núcleo: acceso, cuenta (fuera de pareja, que va antes) y exportación. Inicio, Actividad y el resto de Anotar los auditan
  // también otros archivos, así que son compartidos (regla 4).
  { why: "núcleo del registro", files: [], routes: ["nucleo"], rules: [
    /^src\/features\/auth\//, /^src\/app\/\(auth\)\//, /^src\/app\/auth\//, /^src\/features\/account\//, /^src\/app\/\(app\)\/cuenta\//,
    /^src\/lib\/db\/(?:export|profile)\.ts$/,
  ] },
];
/**
 * Neutros: no cambian lo que audita ningún archivo a11y. `src/lib/copy/es.ts` es neutro como en E2E (decisión del gestor,
 * 11 nov 2026): todo PR lo toca. Riesgo aceptado: un cambio de copy que afecte nombres accesibles de otra área no se detecta
 * en el gate; lo cubren la revisión y el barrido completo al cerrar cada etapa. Otro archivo de src/lib/copy/ es compartido.
 */
const NEUTRAL = [
  /\.md$/, /^docs\//, /^specs\//, /^tests\/e2e\//, /^tests\/evidence\//, /\.test\.tsx?$/, /^supabase\/tests\//,
  /^src\/lib\/copy\/es\.ts$/,
  /^scripts\/(?:backup|restore|order-restore|dev-target\/)/, /^tests\/support\/(?:corrupt-restore|restore)-[^/]+\.mjs$/,
];

const normalize = (path) => String(path).trim().replace(/\\/g, "/").replace(/^\.\//, "");

/** Qué pide un archivo: archivos a11y y áreas del registro, nada (neutro) o todo (`all`: compartido o sin clasificar). */
function classify(path) {
  if (path === ROUTES_FILE) return { files: [ROUTES_FILE], routes: ROUTE_AREAS, why: "cambia routes.a11y.ts: todo el registro" };
  if (path in FILES) return { files: [path], routes: [], why: "cambia el propio archivo a11y" };
  for (const area of AREAS) if (area.rules.some((rule) => rule.test(path))) return { files: area.files, routes: area.routes, why: area.why };
  if (NEUTRAL.some((rule) => rule.test(path))) return { files: [], routes: [], why: "neutro" };
  return { files: ALL, routes: ROUTE_AREAS, why: "compartido o sin clasificar", all: true };
}

const label = (files, routes, all) => {
  if (all) return "Todos";
  const names = files.filter((file) => file !== ROUTES_FILE).map((file) => file.replace("tests/a11y/", ""));
  if (routes.length) names.push(`registro (${routes.length === ROUTE_AREAS.length ? "completo" : routes.join(", ")})`);
  return names.join(" y ");
};

/**
 * Los archivos a11y (y las áreas del registro) de una lista de archivos cambiados. `changed === null`: la base no se pudo
 * calcular (regla 4). `exists` dice si un archivo existe en el commit (por defecto, el disco). `routeAreas`: `null` = todo
 * el registro; si no, las áreas para `A11Y_ROUTE_AREAS`. `skip`: ningún archivo que correr (solo neutros).
 */
export function selectA11y(changed, exists = existsSync) {
  const wanted = new Set();
  const areas = new Set();
  const reasons = [];
  if (changed === null) {
    ALL.forEach((file) => wanted.add(file));
    ROUTE_AREAS.forEach((area) => areas.add(area));
    reasons.push("Todos: no se pudo calcular la base del PR (regla 4).");
  } else {
    const byReason = new Map();
    for (const path of changed.map(normalize).filter(Boolean)) {
      const { files, routes, why, all } = classify(path);
      if (files.length === 0 && routes.length === 0) continue;
      files.forEach((file) => wanted.add(file));
      routes.forEach((area) => areas.add(area));
      if (routes.length) wanted.add(ROUTES_FILE);
      const key = `${label(files, routes, all)} (${why})`;
      byReason.set(key, [...(byReason.get(key) ?? []), path]);
    }
    for (const [key, paths] of byReason) reasons.push(`${key}: ${paths.slice(0, 5).join(", ")}${paths.length > 5 ? ` y ${paths.length - 5} más` : ""}.`);
    if (byReason.size === 0) reasons.push("Ninguno: el PR solo toca archivos neutros (regla 3).");
  }
  const files = ALL.filter((file) => wanted.has(file));
  const missing = files.filter((file) => !exists(file));
  const run = files.filter((file) => !missing.includes(file));
  const routeAreas = !wanted.has(ROUTES_FILE) || ROUTE_AREAS.every((area) => areas.has(area)) ? null : ROUTE_AREAS.filter((area) => areas.has(area));
  return { files, run, missing, routeAreas, skip: run.length === 0, all: files.length === ALL.length && routeAreas === null, reasons };
}

/** Archivos cambiados respecto de la base, o `null` si no hay base o git falla (clon superficial, evento sin PR). */
export function changedFiles(base, git = (args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })) {
  if (!base) return null;
  try {
    return git(["diff", "--name-only", `${base}...HEAD`]).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return null;
  }
}

/** El resumen del job: qué archivos a11y corrieron, por qué y cuáles previstos todavía no existen. */
export function summary(result) {
  return [
    "### Accesibilidad de nivel ligero del PR (selector por área, contracts/ci.md)",
    "",
    ...(result.skip ? ["- Ninguno: el paso de axe con sesión se salta (solo archivos neutros)"] : []),
    ...result.run.map((file) => `- Corre: \`${file}\`${file === ROUTES_FILE ? ` — registro: ${result.routeAreas ? `solo ${result.routeAreas.join(", ")}` : "completo"}` : ""}`),
    ...ALL.filter((file) => !result.files.includes(file)).map((file) => `- No corre: \`${file}\` (el PR no toca su área)`),
    ...result.missing.map((file) => `- \`${file}\`: todavía no existe; no se pasa ni se da por aprobado`),
    "",
    "Por qué:",
    ...result.reasons.map((reason) => `- ${reason}`),
    "",
  ].join("\n");
}

function main(argv) {
  const index = argv.indexOf("--base");
  const base = index >= 0 ? argv[index + 1] ?? "" : "";
  let result;
  try {
    result = selectA11y(changedFiles(base));
  } catch {
    // Un fallo del script nunca deja fuera un archivo: todos los existentes (regla 4).
    result = selectA11y(null);
    result.reasons.push("Todos: el selector falló (regla 4).");
  }
  const text = summary(result);
  process.stderr.write(`${text}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  // `route_areas` vacío = todo el registro; `skip=true` = ningún archivo (el paso de axe con sesión se salta).
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `files=${result.run.join(" ")}\nroute_areas=${(result.routeAreas ?? []).join(" ")}\nskip=${result.skip}\n`);
  process.stdout.write(`${result.run.join(" ")}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main(process.argv.slice(2));
