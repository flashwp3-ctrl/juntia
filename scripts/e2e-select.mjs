// 004 PR B · T035 / F64-5; specs/004-presupuestos-y-metas/contracts/ci.md, «Selector de specs por área». Determinista: recibe
// los archivos cambiados del PR (`git diff --name-only <base>...HEAD`) y devuelve las specs E2E que corren en el job `e2e`.
// Reglas, en orden: (1) las specs 1, 2 y 3 siempre; (2) área de metas → la 4; (3) área de presupuestos → la 5; (4) las dos
// áreas (métricas) → la 4 y la 5; (5) neutros, nada más; (6) lo compartido, lo desconocido, una base que no se puede
// calcular o un fallo del script → las cinco. Solo se pasan a Playwright las specs que EXISTEN en el commit: una prevista que
// aún no existe no se da por aprobada ni por fallida, y el resumen la anota como «todavía no existe».
// Uso en CI: `node scripts/e2e-select.mjs --base <sha>` escribe `specs=<archivos>` en $GITHUB_OUTPUT y el resumen en
// $GITHUB_STEP_SUMMARY. Si el mapa no da lo que espera un fixture de su prueba (tests/e2e-select.test.ts), se corrige aquí o
// el fixture, nunca a mano en el workflow.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const SPECS = {
  1: "tests/e2e/access-account.e2e.ts",
  2: "tests/e2e/annotate.e2e.ts",
  3: "tests/e2e/couple-settle.e2e.ts",
  4: "tests/e2e/goals.e2e.ts",
  5: "tests/e2e/budgets.e2e.ts",
};
const ALL = [1, 2, 3, 4, 5];

/** Regla 2: área de metas. */
const GOALS = [
  /^src\/app\/\(app\)\/metas\//, /^src\/features\/goals\//, /^src\/features\/expenses\/goal-funding\//,
  // Mientras aloje la integración B1–B3 («Cómo se pagó»).
  /^src\/features\/expenses\/annotate-sheet\.tsx$/,
  /^src\/domain\/goals\//, /^src\/lib\/db\/(?:goals|goal-usage)\.ts$/, /^tests\/e2e\/goals\.e2e\.ts$/,
  /^supabase\/(?:migrations|tests)\/[^/]*_goal[^/]*\.sql$/,
];
/** Regla 3: área de presupuestos (Plan y Análisis). */
const BUDGETS = [
  /^src\/app\/\(app\)\/plan\//, /^src\/features\/plan\//, /^src\/features\/analysis\//, /^src\/domain\/budgets\//,
  /^src\/domain\/analysis\//, /^src\/lib\/db\/budgets\.ts$/, /^tests\/e2e\/budgets\.e2e\.ts$/,
  /^supabase\/(?:migrations|tests)\/[^/]*_budget[^/]*\.sql$/,
];
/** Regla 4: las métricas alimentan Inicio, Metas y Análisis. */
const BOTH = [/^src\/domain\/metrics\//, /^src\/lib\/db\/metrics\.ts$/];
/** Regla 5: los cubren las specs 1–3, que corren siempre, o una capa inferior. */
const NEUTRAL = [
  /\.md$/, /^docs\//, /^specs\//, /^src\/features\/expenses\//,
  /^src\/features\/(?:home|activity|balance|couple|account)\//,
  /^src\/lib\/copy\/es\.ts$/, /^src\/lib\/db\/(?:errors|types)\.ts$/, /^src\/lib\/supabase\/database\.types\.ts$/,
];

const normalize = (path) => String(path).trim().replace(/\\/g, "/").replace(/^\.\//, "");

/** Qué pide un archivo: las specs de su área, ninguna (neutro) o todas (compartido o sin clasificar). */
function classify(path) {
  if (BOTH.some((rule) => rule.test(path))) return { specs: [4, 5], why: "métricas: las dos áreas" };
  if (GOALS.some((rule) => rule.test(path))) return { specs: [4], why: "área de metas" };
  if (BUDGETS.some((rule) => rule.test(path))) return { specs: [5], why: "área de presupuestos" };
  if (NEUTRAL.some((rule) => rule.test(path))) return { specs: [], why: "neutro" };
  return { specs: ALL, why: "compartido o sin clasificar" };
}

/**
 * Las specs de una lista de archivos cambiados. `changed === null`: la base no se pudo calcular (regla 6). `exists` dice si
 * el archivo de una spec existe en el commit (por defecto, el disco).
 */
export function selectSpecs(changed, exists = existsSync) {
  const wanted = new Set([1, 2, 3]);
  const reasons = ["Specs 1, 2 y 3: siempre (regla 1)."];
  if (changed === null) {
    ALL.forEach((spec) => wanted.add(spec));
    reasons.push("Todas: no se pudo calcular la base del PR (regla 6).");
  } else {
    const byReason = new Map();
    for (const path of changed.map(normalize).filter(Boolean)) {
      const { specs, why } = classify(path);
      if (specs.length === 0) continue;
      specs.forEach((spec) => wanted.add(spec));
      const key = `${specs.length === ALL.length ? "Todas" : `Spec ${specs.join(" y ")}`} (${why})`;
      byReason.set(key, [...(byReason.get(key) ?? []), path]);
    }
    for (const [key, paths] of byReason) reasons.push(`${key}: ${paths.slice(0, 5).join(", ")}${paths.length > 5 ? ` y ${paths.length - 5} más` : ""}.`);
  }
  const specs = ALL.filter((spec) => wanted.has(spec));
  const missing = specs.filter((spec) => !exists(SPECS[spec]));
  return { specs, run: specs.filter((spec) => !missing.includes(spec)).map((spec) => SPECS[spec]), missing, all: specs.length === ALL.length, reasons };
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

/** El resumen del job: qué corrió, por qué y qué specs previstas todavía no existen. */
export function summary(result) {
  return [
    "### Specs E2E del PR (selector por área, contracts/ci.md)",
    "",
    ...result.run.map((file) => `- Corre: \`${file}\``),
    ...result.missing.map((spec) => `- Spec ${spec}: todavía no existe (\`${SPECS[spec]}\`); no se pasa ni se da por aprobada`),
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
    result = selectSpecs(changedFiles(base));
  } catch {
    // Un fallo del script nunca deja fuera una spec: todas las existentes (regla 6).
    result = selectSpecs(null);
    result.reasons.push("Todas: el selector falló (regla 6).");
  }
  const text = summary(result);
  process.stderr.write(`${text}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `specs=${result.run.join(" ")}\n`);
  process.stdout.write(`${result.run.join(" ")}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main(process.argv.slice(2));
