import { execFileSync, spawn } from "node:child_process";
import { assertTestTarget } from "../../support/dev-target";
import { runnerEnv } from "./env";
/** Variables de libpq para DB_URL: la base del runner o, en un comando `*:dev`, juntia-dev con TLS obligatorio. */
function psqlEnv() {
  runnerEnv();
  const raw = process.env.DB_URL ?? "";
  assertTestTarget(raw, "El SQL de las pruebas");
  const url = new URL(raw);
  return { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: url.pathname.slice(1), ...(url.hostname === "127.0.0.1" ? {} : { PGSSLMODE: "require" }) };
}
export function runnerSql(sql: string): string {
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-qAt", "-c", sql], { encoding: "utf8", env: psqlEnv() }).trim();
}
export function spawnRunnerSql() {
  return spawn("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-qAt"], { env: psqlEnv() });
}
