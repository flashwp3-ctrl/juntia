// Decisión 18; regla de los fundadores del 7 de noviembre de 2026 (pedida por el gestor en el PR B de la 003): contra
// juntia-dev se corren solo las pruebas afectadas, y el `e2e:dev` completo una vez antes de cada push.
// `npm run e2e:dev -- <args>` reenvía a Playwright solo argumentos de una LISTA BLANCA (F55-1, revisión del PR #55):
// - rutas de archivos de prueba dentro de `tests/` que terminan en `.e2e.ts` o `.a11y.ts`;
// - `--grep` / `-g` (separado, con `=` o pegado), con un patrón que no empieza por `-`;
// - `--only-changed`, con una ref opcional de git validada;
// - `--project e2e|a11y`.
// Todo lo demás (`-c…`, `--config`, `-G…`, `--grep-invert`, `--workers`, variables, rutas fuera de `tests/`) se
// rechaza antes del guardia y del bloqueo. La configuración y la exclusión de @mail las pone siempre el runner.
// Sin argumentos, lo de siempre: todo el proyecto `e2e` y todo el `a11y` con A11Y_JOB=e2e, los dos sin @mail.
import { realpathSync } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";

const BASE = (project) => ["test", "--project", project, "--grep-invert", "@mail", "--reporter=list"];
const PROJECTS = new Set(["e2e", "a11y"]);
const TEST_FILE = /^tests\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(e2e|a11y)\.ts$/;
// 005 (tasks.md T023–T027 y T032: «corre en local con una ruta y pocas cargas»): sin Docker en local (decisión 17), la única
// base para iterar un arnés de laboratorio es juntia-dev. Un archivo tests/evidence/*.capture.ts corre en el proyecto
// `evidence` con un worker: es iteración, nunca evidencia (la evidencia sale solo del job `release` o `evidence` del CI).
const EVIDENCE_FILE = /^tests\/evidence\/[A-Za-z0-9_.-]+\.capture\.ts$/;
const GIT_REF = /^[A-Za-z0-9][A-Za-z0-9._/~^-]{0,99}$/;

function reject(arg, why) {
  throw new Error(`e2e:dev no acepta «${arg}»: ${why}. Se admiten archivos de tests/ (.e2e.ts o .a11y.ts), --grep/-g, --only-changed [ref] y --project e2e|a11y.`);
}

const validPattern = (value) => typeof value === "string" && value.length > 0 && !value.startsWith("-");
const validRef = (value) => GIT_REF.test(value) && !value.includes("..");

/** Ruta normalizada de un archivo de prueba autorizado, o `null`. */
function testFile(arg) {
  const path = arg.replace(/\\/g, "/");
  if (path.split("/").includes("..")) return null;
  if (EVIDENCE_FILE.test(path)) return { path, project: "evidence" };
  const match = path.match(TEST_FILE);
  return match ? { path, project: match[1] } : null;
}

/** F55-4: el archivo existe y, resueltos los enlaces, sigue dentro de `tests/` del repositorio. */
function insideTests(path, root) {
  try {
    const within = relative(realpathSync(join(root, "tests")), realpathSync(join(root, path)));
    return within !== "" && !isAbsolute(within) && !within.split(sep).includes("..");
  } catch {
    return false;
  }
}

/** Pasos de Playwright para `e2e:dev` con estos argumentos. Lanza con cualquier argumento fuera de la lista blanca. */
export function planE2E(args, root = process.cwd()) {
  if (args.length === 0) {
    return [
      { label: "E2E (sin @mail)", project: "e2e", args: BASE("e2e") },
      { label: "axe con sesión (A11Y_JOB=e2e)", project: "a11y", a11yJob: "e2e", args: BASE("a11y") },
    ];
  }
  const files = { e2e: [], a11y: [], evidence: [] };
  const flags = [];
  let project = null;
  for (let index = 0; index < args.length; index++) {
    const arg = String(args[index]);
    const file = testFile(arg);
    if (file) {
      if (!insideTests(file.path, root)) reject(arg, "no existe o no está dentro de tests/");
      files[file.project].push(file.path);
      continue;
    }
    if (arg === "--grep" || arg === "-g") {
      const value = args[index + 1];
      if (!validPattern(value)) reject(arg, "necesita un patrón que no empiece por «-»");
      flags.push(arg, String(value));
      index++;
      continue;
    }
    if (arg.startsWith("--grep=") || (arg.startsWith("-g") && !arg.startsWith("--"))) {
      if (!validPattern(arg.startsWith("--grep=") ? arg.slice("--grep=".length) : arg.slice(2))) reject(arg, "el patrón no puede estar vacío ni empezar por «-»");
      flags.push(arg);
      continue;
    }
    if (arg === "--only-changed") {
      const next = args[index + 1];
      flags.push(arg);
      // Una ref opcional: el siguiente argumento, si no es un flag ni un archivo de prueba.
      if (next !== undefined && !String(next).startsWith("-") && !testFile(String(next))) {
        if (!validRef(String(next))) reject(`${arg} ${next}`, "la ref de git no es válida");
        flags.push(String(next));
        index++;
      }
      continue;
    }
    if (arg.startsWith("--only-changed=")) {
      if (!validRef(arg.slice("--only-changed=".length))) reject(arg, "la ref de git no es válida");
      flags.push(arg);
      continue;
    }
    if (arg === "--project" || arg.startsWith("--project=")) {
      const value = arg === "--project" ? String(args[++index] ?? "") : arg.slice("--project=".length);
      if (!PROJECTS.has(value)) reject(`${arg}${arg === "--project" ? ` ${value}` : ""}`, "solo se admiten los proyectos e2e y a11y");
      project = value;
      continue;
    }
    reject(arg, "no está en la lista blanca");
  }
  const step = (name) => (name === "a11y"
    ? { label: "axe dirigido (A11Y_JOB=e2e)", project: "a11y", a11yJob: "e2e", args: [...BASE("a11y"), ...files.a11y, ...flags] }
    : { label: "E2E dirigido (sin @mail)", project: "e2e", args: [...BASE("e2e"), ...files.e2e, ...flags] });
  const evidence = files.evidence.length
    ? [{ label: "arnés de laboratorio (iteración, no evidencia)", project: "evidence", a11yJob: undefined, args: ["test", "--project=evidence", ...files.evidence, "--workers", "1", "--retries", "0", "--reporter=list", ...flags] }]
    : [];
  if (evidence.length && files.e2e.length === 0 && files.a11y.length === 0 && !project) return evidence;
  if (project) {
    // F55-4: un archivo de un proyecto no se corre con --project del otro.
    const other = project === "e2e" ? "a11y" : "e2e";
    if (files[other].length > 0) reject(`--project ${project}`, `${files[other][0]} es del proyecto ${other}`);
    return [step(project), ...evidence];
  }
  const steps = [];
  if (files.e2e.length > 0 || files.a11y.length === 0) steps.push(step("e2e"));
  if (files.a11y.length > 0) steps.push(step("a11y"));
  return [...steps, ...evidence];
}

const INTEGRATION_FILTER = /^(?:tests\/integration\/)?[A-Za-z0-9_][A-Za-z0-9_-]*(?:\.test\.ts)?$/;
/**
 * 005 (tasks.md, regla 2: «solo las pruebas afectadas»): `npm run test:integration:dev -- <nombre>` reenvía a Vitest
 * solo filtros de archivo de `tests/integration/` (un nombre como `money-us08`, o su ruta). Cualquier otra cosa
 * (opciones, rutas fuera de la carpeta) se rechaza antes del guardia y del bloqueo. Sin argumentos, todo el proyecto.
 */
export function planIntegration(args) {
  const normal = (arg) => arg.replace(/\\/g, "/");
  for (const arg of args) {
    if (!INTEGRATION_FILTER.test(normal(arg))) throw new Error(`test:integration:dev no acepta «${arg}»: solo nombres o rutas de archivos de tests/integration/.`);
  }
  return args.map(normal);
}
