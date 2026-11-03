// Medición de comandos y jobs: ADR-011 §4. Los presupuestos solo generan avisos.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const timingFile = join(process.env.RUNNER_TEMP ?? tmpdir(), `juntia-ci-${process.env.GITHUB_JOB ?? "local"}.jsonl`);
const [mode, ...commands] = process.argv.slice(2);
const budgets = { "test:unit": 15, verify: 90 };
if (mode === "run") {
  for (const command of commands) {
    const start = Date.now();
    const args = command === "ci" ? ["ci"] : command === "chromium" ? ["exec", "--", "playwright", "install", "--with-deps", "chromium"] : ["run", command];
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
  lines.push(`| Job ${process.env.GITHUB_JOB} (incluye instalación) | ${process.env.JOB_STATUS} | ${duration.toFixed(2)} s | < 360 s |`);
  if (duration >= 360) console.log(`::warning::Job ${process.env.GITHUB_JOB}: SUPERA EL PRESUPUESTO (aviso); ${duration.toFixed(2)} s / < 360 s`);
  if (process.env.GITHUB_JOB === "lint-typecheck-build") lines.push("", "| Control | Estado |", "| --- | --- |", "| 3 · Supabase local, migraciones y SQL/RLS | NO APLICABLE — lo incorpora P0-1 |", "| 4 · E2E de humo | NO APLICABLE — la primera spec E2E nace en P0-1 |");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  console.log(lines.join("\n"));
} else {
  console.error("Usa run o summary.");
  process.exitCode = 1;
}
