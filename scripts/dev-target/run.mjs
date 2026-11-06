// Maestro §15.10, decisión 18; ADR-011 §9.9; docs/TESTING.md §2. Iterar las capas de base de datos contra
// `juntia-dev` en vez de gastar minutos de CI:
//   npm run db:dev:reset          reinicia juntia-dev con las migraciones de la rama y la semilla de pruebas
//   npm run test:db:dev           reinicia juntia-dev y corre pgTAP (supabase/tests), como el job db
//   npm run test:integration:dev  integración de servidor contra juntia-dev
//   npm run e2e:dev               build + E2E + axe con sesión, sin los flujos que leen correos
// Cada comando pasa el guardia de destino (guard.mjs), toma el bloqueo de un solo agente (lock.mjs) y termina con un
// resumen que dice qué corrió, qué se saltó y por qué. Lo que se salta solo corre en CI. Nada de esto es evidencia:
// el gate sigue siendo `verify` más los jobs de CI sobre el mismo commit (ADR-011 §9.8).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { parseEnv } from "node:util";
import { checkDevTarget, cleanPgEnv, dbUrlWithoutPassword, DEV_REF } from "./guard.mjs";
import { openDevSession } from "./session.mjs";
import { readTap } from "./tap.mjs";

/** Versión de la CLI fijada en el CI (`.github/workflows/ci.yml`) y en el quickstart de la 002. */
const SUPABASE_CLI = "supabase@2.121.0";
const ROOT = process.cwd();
const command = process.argv[2];

/** Lo que nunca corre contra dev, con su motivo. Se imprime siempre en el resumen del comando. */
const CI_ONLY = {
  reset: [
    ["Semilla de producción", "no existe: producción no se siembra. Se aplica solo supabase/seed.sql, que es de pruebas (esquema tests y correos @seed.test)"],
  ],
  "test:db": [
    ["db:types:check", "usa `supabase gen types --local`, que necesita Docker (decisión 17); solo en el job db"],
    ["Descripción del bootstrap de Auth e inventario de EXECUTE", "artefactos del job db; solo en CI"],
    ["Ensayo de restauración y los nueve controles negativos", "ADR-011 §9.6; solo en el runner efímero del job db"],
  ],
  "test:integration": [
    ["Pruebas que envían o leen correos", "dev no tiene Mailpit y su correo integrado admite 2 envíos por hora; solo en el job db (lista abajo)"],
    ["40P01 real (money.test.ts)", "la carrera de interbloqueo no se reproduce de forma fiable con la latencia de dev; solo en el job db"],
  ],
  e2e: [
    ["E2E etiquetadas @mail", "registro, recuperación y Mailpit; solo en el job e2e (lista abajo)"],
    ["Proyecto evidence (capturas, anchos, tema, INP)", "evidencia bajo demanda en CI; nunca de dev (ADR-011 §9.8)"],
  ],
};
const ALWAYS = [["Evidencia de [V] y de puntos de control", "solo cuenta la salida del CI sobre el commit (ADR-011 §9.8); esto es iteración"]];

const rows = [];
const skipped = [];
let secrets = [];

const redact = (text) => secrets.reduce((out, secret) => (secret ? out.split(secret).join("‹oculto›") : out), text);
const git = (...args) => spawnSync("git", args, { cwd: ROOT, encoding: "utf8" }).stdout?.trim() ?? "";

function loadEnvTest() {
  const commonDir = resolve(ROOT, git("rev-parse", "--path-format=absolute", "--git-common-dir"));
  const mainRoot = dirname(commonDir);
  const path = [join(ROOT, ".env.test"), join(mainRoot, ".env.test")].find((candidate) => existsSync(candidate));
  if (!path) throw new Error(`No existe .env.test (ni en ${ROOT} ni en ${mainRoot}). Cópialo de .env.test.example y rellénalo desde el panel de juntia-dev (docs/TESTING.md §2).`);
  const ignored = spawnSync("git", ["check-ignore", "-q", path], { cwd: dirname(path) }).status === 0;
  if (!ignored) throw new Error(`${path} no está ignorado por git: no se usa una clave secreta en un archivo que se podría versionar.`);
  return { path, commonDir, fileEnv: parseEnv(readFileSync(path, "utf8")) };
}

/** psql del PATH o, en Windows, el de una instalación de PostgreSQL (el cliente de la copia de la decisión 17). */
function findPsql() {
  if (spawnSync("psql", ["--version"], { encoding: "utf8" }).status === 0) return null;
  const base = "C:\\Program Files\\PostgreSQL";
  const versions = existsSync(base) ? readdirSync(base).filter((name) => /^\d+$/.test(name)).sort((a, b) => Number(b) - Number(a)) : [];
  for (const version of versions) if (existsSync(join(base, version, "bin", "psql.exe"))) return join(base, version, "bin");
  throw new Error("No se encuentra psql. Instala el cliente de PostgreSQL 17 (solo «Command Line Tools») o añádelo al PATH.");
}

function childEnv(target, psqlDir, extra = {}) {
  // F48-1: ninguna PG* heredada llega a un hijo; psql y la CLI reciben las suyas de cleanPgEnv.
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("JUNTIA_DEV_") && !name.startsWith("NEXT_PUBLIC_SUPABASE_") && !/^PG[A-Z0-9_]+$/i.test(name)));
  const pathKey = Object.keys(env).find((name) => name.toUpperCase() === "PATH") ?? "PATH";
  if (psqlDir) env[pathKey] = `${psqlDir}${delimiter}${env[pathKey] ?? ""}`;
  return { ...env, JUNTIA_TEST_TARGET: "dev", API_URL: target.apiUrl, PUBLISHABLE_KEY: target.publishableKey, SECRET_KEY: target.secretKey, DB_URL: target.dbUrl, ...extra };
}

/** Sesión con el bloqueo (session.mjs): arranca los pasos, cancela con SIGINT o SIGTERM y suelta el bloqueo (F48-2). */
let session = null;

/** Ejecuta un paso, con la salida filtrada por líneas para que ningún secreto llegue a la terminal. */
function step(label, file, args, env, { input, capture = false } = {}) {
  const start = performance.now();
  return new Promise((done) => {
    const options = { cwd: ROOT, env, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] };
    // Con una cancelación en curso no empieza ningún paso nuevo.
    const child = session ? session.spawn(file, args, options) : spawn(file, args, options);
    if (!child) { rows.push({ paso: label, resultado: "no empezó: cancelado", duración: "—" }); done({ code: 1, output: "", seconds: "0.00" }); return; }
    let captured = "";
    const pipe = (stream, out) => {
      let pending = "";
      stream.setEncoding("utf8");
      stream.on("data", (chunk) => {
        const lines = (pending + chunk).split("\n");
        pending = lines.pop();
        for (const line of lines) { if (capture) captured += line + "\n"; else out.write(redact(line) + "\n"); }
      });
      stream.on("end", () => { if (pending) { if (capture) captured += pending; else out.write(redact(pending)); } });
    };
    pipe(child.stdout, process.stdout);
    pipe(child.stderr, process.stderr);
    if (input !== undefined) child.stdin.end(input);
    child.on("error", (error) => { rows.push({ paso: label, resultado: `falló: ${error.message}`, duración: "—" }); done({ code: 1, output: "" }); });
    child.on("close", (code) => {
      const seconds = ((performance.now() - start) / 1000).toFixed(2);
      if (!capture) rows.push({ paso: label, resultado: code === 0 ? "pasó" : "falló", duración: `${seconds} s` });
      done({ code: code ?? 1, output: captured, seconds });
    });
  });
}

const node = (script, args, env, options) => (label) => step(label, process.execPath, [join(ROOT, script), ...args], env, options);
const npx = () => join(dirname(process.env.npm_execpath ?? join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")), "npx-cli.js");

/**
 * F48-3: el lanzador de la CLI fijada (`node_modules/supabase/dist/supabase.js` de la caché de npx), para ejecutarlo
 * con node y sin npm de por medio. Si no está en caché, se descarga con `npx --yes supabase@2.121.0 --version`, sin
 * ningún secreto en la línea de órdenes.
 */
function supabaseCli() {
  const version = SUPABASE_CLI.split("@")[1];
  const find = () => {
    const cache = spawnSync(process.execPath, [join(dirname(npx()), "npm-cli.js"), "config", "get", "cache"], { encoding: "utf8" }).stdout?.trim();
    const base = join(cache ?? "", "_npx");
    if (!cache || !existsSync(base)) return null;
    for (const entry of readdirSync(base)) {
      const pkg = join(base, entry, "node_modules", "supabase");
      try { if (JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")).version === version) return join(pkg, "dist", "supabase.js"); } catch { /* no es este */ }
    }
    return null;
  };
  let launcher = find();
  if (!launcher) { spawnSync(process.execPath, [npx(), "--yes", SUPABASE_CLI, "--version"], { stdio: "ignore" }); launcher = find(); }
  if (!launcher) throw new Error(`No se encuentra ${SUPABASE_CLI} en la caché de npx`);
  return launcher;
}

let psqlBin = "psql";
/** psql contra DB_URL con las variables de libpq, como tests/integration/support/sql.ts, y TLS obligatorio. */
function psql(env, args, options) {
  const pgEnv = { ...cleanPgEnv(env, env.DB_URL), PGAPPNAME: "juntia-dev-tests" };
  return (label) => step(label, psqlBin, ["-X", "-v", "ON_ERROR_STOP=1", "-qAt", ...args], pgEnv, options);
}

async function reset(target, env) {
  // F48-3: la URL va sin contraseña; la contraseña viaja en PGPASSWORD dentro del entorno limpio de libpq, y el
  // lanzador corre con node directamente, sin npx, para que npm no registre la línea de órdenes.
  const run = await step(`${SUPABASE_CLI} db reset (migraciones de la rama + supabase/seed.sql; contraseña solo en PGPASSWORD)`, process.execPath,
    [supabaseCli(), "db", "reset", "--db-url", dbUrlWithoutPassword(target.dbUrl), "--yes"], cleanPgEnv(env, target.dbUrl));
  if (run.code !== 0) return 1;
  // Comprobación de lectura: las migraciones de la rama y el esquema de pruebas existen en juntia-dev.
  const check = await psql(env, ["-c", "select (select count(*) from supabase_migrations.schema_migrations)||' migraciones; esquema tests: '||(to_regnamespace('tests') is not null)"], { capture: true })("comprobación");
  const local = readdirSync(join(ROOT, "supabase", "migrations")).filter((name) => name.endsWith(".sql")).length;
  const ok = check.code === 0 && check.output.trim() === `${local} migraciones; esquema tests: true`;
  rows.push({ paso: "comprobación después del reinicio", resultado: ok ? `pasó (${check.output.trim()})` : `falló (${check.output.trim() || "sin salida"}; se esperaban ${local} migraciones)`, duración: `${check.seconds} s` });
  return ok ? 0 : 1;
}

async function testDb(env) {
  const files = readdirSync(join(ROOT, "supabase", "tests")).filter((name) => name.endsWith(".sql")).sort();
  // Como `supabase test db`: pgTAP en el esquema extensions solo mientras corren las pruebas.
  const before = await psql(env, ["-c", "select count(*) from pg_extension where extname='pgtap'"], { capture: true })("pgtap");
  const created = before.output.trim() === "0";
  if (created && (await psql(env, ["-c", "create extension pgtap with schema extensions"])("crear la extensión pgtap")).code !== 0) return 1;
  let failed = 0;
  for (const file of files) {
    const run = await psql(env, ["-f", join("supabase", "tests", file)], { capture: true })(file);
    const tap = readTap(run.output, run.code);
    if (!tap.ok) { failed++; process.stdout.write(redact(run.output)); }
    rows.push({ paso: `pgTAP ${file}`, resultado: tap.ok ? `pasó (${tap.total})` : `falló: ${redact(tap.problems.join(" · ")).slice(0, 300)}`, duración: `${run.seconds} s` });
  }
  if (created) await psql(env, ["-c", "drop extension if exists pgtap"])("quitar la extensión pgtap");
  return failed ? 1 : 0;
}

async function testIntegration(env) {
  const dir = mkdtempSync(join(tmpdir(), "juntia-dev-"));
  const report = join(dir, "vitest.json");
  try {
    // Timeouts de 60 s: cada prueba cruza la red hasta East US (ADR-011 §9.5); en CI se usan los de Vitest.
    const run = await node("node_modules/vitest/vitest.mjs", ["run", "--project", "integration", "--testTimeout=60000", "--hookTimeout=60000", "--reporter=default", "--reporter=json", `--outputFile.json=${report}`], env)("vitest --project integration");
    if (existsSync(report)) {
      const results = JSON.parse(readFileSync(report, "utf8")).testResults ?? [];
      for (const file of results) for (const test of file.assertionResults ?? []) {
        if (["skipped", "pending", "todo"].includes(test.status)) skipped.push(`${relative(ROOT, file.name).split("\\").join("/")} › ${test.fullName}`);
      }
    }
    return run.code;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function portFree(port) {
  return new Promise((done) => {
    const server = createServer().once("error", () => done(false)).once("listening", () => server.close(() => done(true)));
    server.listen(port, "127.0.0.1");
  });
}

async function e2e(target, env) {
  if (!(await portFree(3000))) throw new Error("El puerto 3000 está ocupado. e2e:dev no reutiliza un servidor abierto (podría apuntar a otro proyecto): ciérralo y vuelve a lanzar.");
  // La app se construye con la URL y la clave publicable de dev, sin la clave secreta ni la conexión.
  const appEnv = { ...env, NEXT_PUBLIC_SUPABASE_URL: target.apiUrl, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: target.publishableKey, SITE_URL: "http://localhost:3000" };
  const buildEnv = { ...appEnv, SECRET_KEY: "", DB_URL: "" };
  if ((await node("node_modules/next/dist/bin/next", ["build"], buildEnv)("next build (juntia-dev)")).code !== 0) return 1;
  const playwright = "node_modules/@playwright/test/cli.js";
  const listed = await node(playwright, ["test", "--project", "e2e", "--grep", "@mail", "--list"], appEnv, { capture: true })("lista @mail");
  for (const line of listed.output.split("\n")) if (/@mail|›/.test(line) && /\.e2e\.ts/.test(line)) skipped.push(line.trim());
  const smoke = await node(playwright, ["test", "--project", "e2e", "--grep-invert", "@mail", "--reporter=list"], appEnv)("E2E (sin @mail)");
  const axe = await node(playwright, ["test", "--project", "a11y", "--grep-invert", "@mail", "--reporter=list"], { ...appEnv, A11Y_JOB: "e2e" })("axe con sesión (A11Y_JOB=e2e)");
  return smoke.code || axe.code;
}

function summary(exitCode, started) {
  const label = { reset: "db:dev:reset", "test:db": "test:db:dev", "test:integration": "test:integration:dev", e2e: "e2e:dev" }[command];
  console.log(`\n${label} · destino ${DEV_REF} (juntia-dev) · no es evidencia: el gate es el CI (ADR-011 §9.8)`);
  rows.push({ paso: `${label} (total)`, resultado: exitCode ? "falló" : "pasó", duración: `${((performance.now() - started) / 1000).toFixed(2)} s` });
  console.table(rows);
  console.log("No corre contra dev (solo en CI):");
  for (const [what, why] of [...(CI_ONLY[command] ?? []), ...ALWAYS]) console.log(`  - ${what}: ${why}`);
  if (skipped.length) {
    console.log("Saltadas en este comando, de forma declarada (corren en CI):");
    for (const name of skipped) console.log(`  - ${name}`);
  }
}

async function main() {
  if (!CI_ONLY[command]) throw new Error("Uso: node scripts/dev-target/run.mjs reset|test:db|test:integration|e2e");
  const started = performance.now();
  const { path, commonDir, fileEnv } = loadEnvTest();
  // F48-5: el enlace de la CLI se lee en el worktree y en el checkout principal; cualquiera que no sea dev para el comando.
  const linkedRefs = [["el worktree", ROOT], ["el checkout principal", dirname(commonDir)]]
    .map(([where, dir]) => ({ where, path: join(dir, "supabase", ".temp", "project-ref") }))
    .filter(({ path }, index, all) => existsSync(path) && all.findIndex((other) => other.path === path) === index)
    .map(({ where, path }) => ({ where, ref: readFileSync(path, "utf8") }));
  const target = checkDevTarget({ fileEnv, processEnv: process.env, linkedRefs });
  const db = new URL(target.dbUrl);
  secrets = [target.secretKey, target.dbUrl, db.password, decodeURIComponent(db.password), encodeURIComponent(decodeURIComponent(db.password))].filter((value) => value && value.length >= 6);
  console.log(`Guardia de destino: ${DEV_REF} (juntia-dev) · .env.test: ${path}`);
  const psqlDir = findPsql();
  if (psqlDir) psqlBin = join(psqlDir, "psql.exe");
  // F48-2: la sesión toma el bloqueo y es el único punto que lo suelta, cuando el árbol del paso en curso ya no existe.
  session = openDevSession({
    lockDir: join(commonDir, "juntia-dev.lock"), branch: git("branch", "--show-current") || git("rev-parse", "--short", "HEAD"), command,
    onCancel: (signal) => console.error(`
${signal}: se cancela ${command}; se termina el árbol del paso en curso y después se suelta el bloqueo.`),
  });
  const env = childEnv(target, psqlDir);
  let exitCode = 1;
  try {
    exitCode = command === "reset" ? await reset(target, env)
      // Como el job db: pgTAP corre sobre una base recién reiniciada. Las pruebas suponen tablas vacías (04 y 07 fallan
      // con los usuarios y movimientos que dejan la integración y las E2E en dev).
      : command === "test:db" ? (await reset(target, env)) || await testDb(env)
      : command === "test:integration" ? await testIntegration(env)
      : await e2e(target, env);
  } finally {
    await session.close();
    summary(exitCode, started);
  }
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
