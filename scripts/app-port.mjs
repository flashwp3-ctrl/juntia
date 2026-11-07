// Puerto local de Juntia, una sola fuente: la variable PORT, 3400 por defecto (un segundo servidor usa 3500). Lo leen
// `npm run dev`/`npm run start` (scripts/next.mjs), playwright.config.ts y `npm run e2e:dev` (dev-target/run.mjs).
// El 3000 y el 3100 son de otro proyecto del mismo equipo. Juntia nunca reutiliza lo que haya en su puerto —podría
// ser otro proyecto u otra rama de Juntia— y, si está ocupado, dice qué PID lo tiene y no cierra ningún proceso.
// Sin `await` de primer nivel ni `import.meta`: Playwright transpila a CommonJS lo que importa playwright.config.ts.
import { spawnSync } from "node:child_process";
import { connect, createServer } from "node:net";
import { join } from "node:path";

export const DEFAULT_PORT = 3400;

/** @typedef {Record<string, string | undefined>} Env */
/** @typedef {(file: string, args: string[]) => string | null} Run */

/** @param {Env} [env] */
export function appPort(env = process.env) {
  const raw = env.PORT?.trim();
  if (!raw) return DEFAULT_PORT;
  const port = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`PORT tiene que ser un entero entre 1024 y 65535 (por defecto ${DEFAULT_PORT}); se recibió «${raw}».`);
  return port;
}

/** @param {Env} [env] */
export const appOrigin = (env = process.env) => `http://localhost:${appPort(env)}`;

/** El webServer de Playwright: el mismo puerto que la app y nunca un servidor ya abierto. @param {Env} [env] */
export function webServer(env = process.env) {
  return { command: "npm run start", url: `${appOrigin(env)}/entrar`, reuseExistingServer: false, env: { PORT: String(appPort(env)) } };
}

const endsWithPort = (address, port) => address.endsWith(`:${port}`);
const unique = (pids) => [...new Set(pids)];

/** PIDs que escuchan en `port` según `netstat -ano` de Windows. Escuchar = dirección remota `:0` (el estado va traducido). */
export function parseNetstat(text, port) {
  const pids = [];
  for (const line of text.split(/\r?\n/)) {
    const [proto, local, remote, , pid] = line.trim().split(/\s+/);
    if (proto === "TCP" && local && remote && endsWithPort(local, port) && /:0$/.test(remote) && /^\d+$/.test(pid ?? "")) pids.push(Number(pid));
  }
  return unique(pids);
}

/** PIDs que escuchan en `port` según `ss -ltnpH` de Linux (solo los que ss puede atribuir). */
export function parseSs(text, port) {
  const pids = [];
  for (const line of text.split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] !== "LISTEN" || !parts[3] || !endsWithPort(parts[3], port)) continue;
    for (const match of line.matchAll(/pid=(\d+)/g)) pids.push(Number(match[1]));
  }
  return unique(pids);
}

/** @type {Run} */
function defaultRun(file, args) {
  const result = spawnSync(file, args, { encoding: "utf8", windowsHide: true, timeout: 10_000 });
  return result.status === 0 ? result.stdout : null;
}

/** @param {number} port @param {{ platform?: string, run?: Run }} [options] */
export function listeningPids(port, { platform = process.platform, run = defaultRun } = {}) {
  if (platform === "win32") return parseNetstat(run("netstat", ["-ano"]) ?? "", port);
  const lsof = run("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
  if (lsof) return unique(lsof.split(/\s+/).filter((pid) => /^\d+$/.test(pid)).map(Number));
  return parseSs(run("ss", ["-ltnpH"]) ?? "", port);
}

/** @param {number} pid @param {{ platform?: string, run?: Run }} [options] */
function processName(pid, { platform = process.platform, run = defaultRun } = {}) {
  if (platform === "win32") return run("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"])?.match(/^"([^"]+)"/m)?.[1] ?? null;
  return run("ps", ["-p", String(pid), "-o", "comm="])?.trim() || null;
}

/** ¿Acepta conexiones `host:port`? */
function accepts(host, port) {
  return new Promise((done) => {
    const socket = connect({ host, port });
    const finish = (result) => { socket.destroy(); done(result); };
    socket.setTimeout(1000, () => finish(false));
    socket.once("connect", () => finish(true)).once("error", () => finish(false));
  });
}

/** ¿Podría `next start` escuchar en `port`? Como Next: todas las interfaces. */
function canBind(port) {
  return new Promise((done) => {
    const server = createServer().once("error", () => done(false)).once("listening", () => server.close(() => done(true)));
    server.listen(port);
  });
}

/** Ocupado si alguien acepta conexiones en localhost (IPv4 o IPv6) o si no se puede escuchar en él. @param {number} port */
export async function portInUse(port) {
  if ((await accepts("127.0.0.1", port)) || (await accepts("::1", port))) return true;
  return !(await canBind(port));
}

/** Se niega si el puerto está ocupado, con el PID y el nombre de quien lo tiene. Nunca cierra ese proceso. @param {number} port */
export async function assertPortFree(port) {
  if (!(await portInUse(port))) return;
  const pids = listeningPids(port);
  const owners = pids.length ? pids.map((pid) => { const name = processName(pid); return name ? `PID ${pid}, ${name}` : `PID ${pid}`; }).join("; ") : "PID no identificado";
  throw new Error(`El puerto ${port} está ocupado (${owners}). Juntia no reutiliza un servidor abierto: puede ser de otro proyecto o de otra rama. No se cierra ningún proceso: ciérralo si es tuyo, espera a que termine o arranca en otro puerto con PORT=3500.`);
}

/**
 * assertPortFree para contextos síncronos (playwright.config.ts): corre este archivo en un proceso aparte.
 * @param {number} port @param {string} [root] raíz del repositorio; Playwright corre desde ella
 */
export function assertPortFreeSync(port, root = process.cwd()) {
  const result = spawnSync(process.execPath, [join(root, "scripts", "app-port.mjs"), "assert-free", String(port)], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error((result.stderr || result.error?.message || `No se pudo comprobar el puerto ${port}`).trim());
}

if (process.argv[2] === "assert-free" && /[\\/]scripts[\\/]app-port\.mjs$/.test(process.argv[1] ?? "")) {
  assertPortFree(Number(process.argv[3] ?? appPort())).catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
