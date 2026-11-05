import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const started = performance.now();
const rows = [];
let exitCode = 0;
for (const [script, label, budget] of [
  ["lint", "lint", null], ["typecheck", "typecheck", null],
  ["test:unit", "unit (domain)", 15], ["test:components", "components", null],
]) {
  const start = performance.now();
  const result = spawnSync(process.execPath, [process.env.npm_execpath, "run", script], { encoding: "utf8" });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  const seconds = (performance.now() - start) / 1000;
  const failed = result.error || result.status !== 0;
  const empty = script === "test:unit" && /No test files found/.test((result.stdout ?? "") + (result.stderr ?? ""));
  rows.push({ control: label, resultado: failed ? "falló" : empty ? "0 pruebas — la 001 no tiene dominio financiero" : "pasó", duración: `${seconds.toFixed(2)} s`, presupuesto: budget ? `< ${budget} s` : "—", aviso: budget && seconds >= budget ? "SUPERA EL PRESUPUESTO (aviso)" : "" });
  if (failed) { console.error(result.error?.message ?? `Falló ${script}`); exitCode = result.status || 1; break; }
}
rows.push({ control: "SQL/RLS (pgTAP)", resultado: "SOLO EN CI — pendiente de resultado · job db", duración: "—", presupuesto: "< 60 s", aviso: "" });
rows.push({ control: "integración servidor", resultado: "SOLO EN CI — pendiente de resultado · job db", duración: "—", presupuesto: "—", aviso: "" });
rows.push({ control: "E2E de humo", resultado: "NO APLICABLE — la spec E2E 1 nace en el PR B de la 002", duración: "—", presupuesto: "< 3 min (job)", aviso: "" });
const seconds = (performance.now() - started) / 1000;
rows.push({ control: "verify (total)", resultado: exitCode ? "falló" : "pasó", duración: `${seconds.toFixed(2)} s`, presupuesto: "< 90 s", aviso: seconds >= 90 ? "SUPERA EL PRESUPUESTO (aviso)" : "" });
console.log("verify · 002");
console.table(rows);
process.exitCode = exitCode;
