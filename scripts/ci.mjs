// Medición de comandos y jobs: ADR-011 §4. Los presupuestos de comando generan avisos. El del job `e2e` (< 480 s, maestro
// §15.10, decisiones 19.5 y 21.4) bloquea desde el PR D de la 003 (decisión 20.17, Q17; tasks.md T070), salvo en el barrido
// de accesibilidad a mano (A11Y_LEVEL=sweep), que tiene su propio tope duro de 10 min (docs/TESTING.md §9).
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const timingFile = join(process.env.RUNNER_TEMP ?? tmpdir(), `juntia-ci-${process.env.GITHUB_JOB ?? "local"}.jsonl`);
const [mode, ...commands] = process.argv.slice(2);
const budgets = { "test:unit": 15, verify: 90, "test:db": 60, "test:e2e:smoke": 180 };

/**
 * Los argumentos de npm para un comando. 004 PR B (T035, F64-5): en el job e2e, las specs que eligió scripts/e2e-select.mjs
 * (`E2E_SPECS`) van detrás de `--`; sin la variable, todas. Los scripts de package.json fijan el proyecto con `--project=e2e`
 * (con `=`): con `--project e2e`, Playwright tomaba los archivos que siguen como más nombres de proyecto (gate del PR #67, run
 * 42847381388). tests/ci-command.test.ts ejecuta este mismo comando con `--list`.
 * @param {string} command
 * @param {Record<string, string | undefined>} [env]
 * @returns {string[]}
 */
export function npmArgs(command, env = process.env) {
  const specs = command === "test:e2e:smoke" ? (env.E2E_SPECS ?? "").split(/\s+/).filter(Boolean) : [];
  if (command === "ci") return ["ci"];
  if (command === "chromium") return ["exec", "--", "playwright", "install", "--with-deps", "--only-shell", "chromium"];
  return ["run", command, ...(specs.length ? ["--", ...specs] : [])];
}

// Importado por una prueba, el módulo no ejecuta nada.
const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (!isMain) {
  // Sin efectos.
} else if (mode === "run") {
  for (const command of commands) {
    const start = Date.now();
    const args = npmArgs(command);
    const result = spawnSync("npm", args, { encoding: "utf8", shell: process.platform === "win32" });
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    const seconds = (Date.now() - start) / 1000;
    const emptyDomain = command === "test:unit" && /No test files found/.test((result.stdout ?? "") + (result.stderr ?? ""));
    appendFileSync(timingFile, JSON.stringify({ command, seconds, status: result.status ?? 1, emptyDomain }) + "\n");
    if (budgets[command] && seconds >= budgets[command]) console.log(`::warning::${command}: ${seconds.toFixed(2)} s; presupuesto < ${budgets[command]} s`);
    if (result.error || result.status !== 0) { console.error(result.error?.message ?? `Falló ${command}`); process.exitCode = result.status || 1; break; }
  }
} else if (mode === "summary") {
  const rows = existsSync(timingFile) ? readFileSync(timingFile, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
  const lines = ["| Control | Estado | Duración | Presupuesto |", "| --- | --- | --- | --- |"];
  for (const row of rows) lines.push(`| ${row.command} | ${row.status !== 0 ? "falló" : row.emptyDomain ? "0 pruebas — la 001 no tiene dominio financiero" : "pasó"} | ${row.seconds.toFixed(2)} s | ${budgets[row.command] ? `< ${budgets[row.command]} s` : "—"} |`);
  const duration = (Date.now() - Number(process.env.JOB_STARTED_MS)) / 1000;
  // Maestro §15.10, decisión 19.5: el job e2e tiene < 480 s; los demás, el < 6 min del gate (ADR-011 §4).
  const jobBudget = process.env.GITHUB_JOB === "e2e" ? 480 : 360;
  lines.push(`| Job ${process.env.GITHUB_JOB} (incluye instalación) | ${process.env.JOB_STATUS} | ${duration.toFixed(2)} s | < ${jobBudget} s |`);
  const blocking = process.env.GITHUB_JOB === "e2e" && process.env.A11Y_LEVEL !== "sweep";
  if (duration >= jobBudget && blocking) {
    console.log(`::error::Job ${process.env.GITHUB_JOB}: SUPERA EL PRESUPUESTO; ${duration.toFixed(2)} s / < ${jobBudget} s (bloquea desde el cierre de P0-2)`);
    process.exitCode = 1;
  } else if (duration >= jobBudget) console.log(`::warning::Job ${process.env.GITHUB_JOB}: SUPERA EL PRESUPUESTO (aviso); ${duration.toFixed(2)} s / < ${jobBudget} s`);
  if (process.env.GITHUB_JOB === "app") lines.push("", "| Control | Estado |", "| --- | --- |", "| 3 · Supabase local, migraciones y SQL/RLS | job `db` |", "| 4 · E2E de humo | job `e2e` |");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  console.log(lines.join("\n"));
} else {
  console.error("Usa run o summary.");
  process.exitCode = 1;
}
