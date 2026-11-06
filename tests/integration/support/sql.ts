import { execFileSync, spawn } from "node:child_process";
import { cleanPgEnv } from "../../../scripts/dev-target/guard.mjs";
import { assertTestTarget } from "../../support/dev-target";
import { runnerEnv } from "./env";
/**
 * Variables de libpq para DB_URL: la base del runner o, en un comando `*:dev`, juntia-dev con TLS obligatorio. Ninguna
 * PG* heredada pasa a psql (F48-1): solo las que salen de la URL ya comprobada.
 */
function psqlEnv(): NodeJS.ProcessEnv {
  runnerEnv();
  const raw = process.env.DB_URL ?? "";
  assertTestTarget(raw, "El SQL de las pruebas");
  return cleanPgEnv(process.env, raw) as NodeJS.ProcessEnv;
}
export function runnerSql(sql: string): string {
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-qAt", "-c", sql], { encoding: "utf8", env: psqlEnv() }).trim();
}
export function spawnRunnerSql() {
  return spawn("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-qAt"], { env: psqlEnv() });
}
