// Decisión 18; docs/TESTING.md §2. Lo que comparten los comandos que escriben en `juntia-dev` (run.mjs, el borrado de
// cuentas de la 005 y la siembra de listas largas): leer `.env.test` (ignorado por git), pasar el guardia de destino con
// los enlaces de la CLI del worktree y del checkout principal (F48-5) y encontrar psql.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseEnv } from "node:util";
import { checkDevTarget } from "./guard.mjs";

const git = (root, ...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" }).stdout?.trim() ?? "";

export function loadEnvTest(root) {
  const commonDir = resolve(root, git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"));
  const mainRoot = dirname(commonDir);
  const path = [join(root, ".env.test"), join(mainRoot, ".env.test")].find((candidate) => existsSync(candidate));
  if (!path) throw new Error(`No existe .env.test (ni en ${root} ni en ${mainRoot}). Cópialo de .env.test.example y rellénalo desde el panel de juntia-dev (docs/TESTING.md §2).`);
  const ignored = spawnSync("git", ["check-ignore", "-q", path], { cwd: dirname(path) }).status === 0;
  if (!ignored) throw new Error(`${path} no está ignorado por git: no se usa una clave secreta en un archivo que se podría versionar.`);
  return { path, commonDir, fileEnv: parseEnv(readFileSync(path, "utf8")) };
}

/** psql del PATH o, en Windows, el de una instalación de PostgreSQL (el cliente de la copia de la decisión 17). */
export function findPsql() {
  if (spawnSync("psql", ["--version"], { encoding: "utf8" }).status === 0) return null;
  const base = "C:\\Program Files\\PostgreSQL";
  const versions = existsSync(base) ? readdirSync(base).filter((name) => /^\d+$/.test(name)).sort((a, b) => Number(b) - Number(a)) : [];
  for (const version of versions) if (existsSync(join(base, version, "bin", "psql.exe"))) return join(base, version, "bin");
  throw new Error("No se encuentra psql. Instala el cliente de PostgreSQL 17 (solo «Command Line Tools») o añádelo al PATH.");
}

/** F48-5: los `supabase/.temp/project-ref` del worktree y del checkout principal que existan. */
export function linkedRefs(root, commonDir) {
  return [["el worktree", root], ["el checkout principal", dirname(commonDir)]]
    .map(([where, dir]) => ({ where, path: join(dir, "supabase", ".temp", "project-ref") }))
    .filter(({ path }, index, all) => existsSync(path) && all.findIndex((other) => other.path === path) === index)
    .map(({ where, path }) => ({ where, ref: readFileSync(path, "utf8") }));
}

/** `.env.test` + guardia + psql, para un comando que escribe en juntia-dev con el bloqueo. */
export function devTargetEnv(root) {
  const { path, commonDir, fileEnv } = loadEnvTest(root);
  const target = checkDevTarget({ fileEnv, processEnv: process.env, linkedRefs: linkedRefs(root, commonDir) });
  const psqlDir = findPsql();
  return { target, path, commonDir, psqlDir, psqlBin: psqlDir ? join(psqlDir, "psql.exe") : "psql",
    branch: git(root, "branch", "--show-current") || git(root, "rev-parse", "--short", "HEAD") };
}
