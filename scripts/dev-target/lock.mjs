// Decisión 18: «un solo agente usa juntia-dev a la vez». Herramienta de desarrollo para uno o dos agentes en una
// máquina, así que el diseño es simple a propósito:
// - El bloqueo es un DIRECTORIO en la carpeta común de git: `mkdir` es atómico, de dos agentes solo uno lo crea.
//   Dentro, `owner.json` (rama, comando, hora, equipo, PID e identificador de ejecución), escrito con un rename.
// - Nunca se recupera solo (F48-2, segunda ronda): si el dueño murió de golpe (SIGKILL, apagón), un descendiente suyo
//   podría seguir escribiendo en juntia-dev, y un PID reutilizado haría creer que sigue vivo. El comando se niega y
//   explica cómo liberarlo a mano con `npm run dev:unlock -- --force`, que antes enseña a quién pertenece.
// - Con SIGINT o SIGTERM se termina el ÁRBOL del hijo en curso y el bloqueo se suelta cuando ya no queda nadie.
// Entre equipos distintos (los dos fundadores) no hay carpeta común: esa parte es una regla de docs/TESTING.md §2.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

export function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === "EPERM"; }
}

/** Metadatos del bloqueo, o null si faltan o están incompletos. */
export function readOwner(dir) {
  try {
    const owner = JSON.parse(readFileSync(join(dir, "owner.json"), "utf8"));
    const complete = ["branch", "command", "host", "runId"].every((key) => typeof owner[key] === "string")
      && Number.isInteger(owner.pid) && !Number.isNaN(Date.parse(owner.startedAt));
    return complete ? owner : null;
  } catch { return null; }
}

export const describeOwner = (owner) =>
  `rama ${owner.branch}, comando ${owner.command}, desde ${owner.startedAt} (equipo ${owner.host}, PID ${owner.pid}, ejecución ${owner.runId})`;

const UNLOCK = "npm run dev:unlock -- --force";

/**
 * Intenta tomar el bloqueo `dir`. Devuelve una función que lo suelta, o lanza. No recupera nunca un bloqueo ajeno:
 * vivo → «en uso»; dueño muerto o metadatos ilegibles → «huérfano», que se libera a mano con `dev:unlock`.
 * `options` existe para las pruebas.
 */
export function acquireDevLock(dir, { branch, command }, { host = hostname(), isAlive = alive } = {}) {
  try {
    mkdirSync(dir);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const owner = readOwner(dir);
    if (!owner) throw new Error(`juntia-dev tiene un bloqueo sin metadatos legibles (${dir}): puede ser otro agente que acaba de empezar. Espera; si sabes que nadie lo usa, libéralo con ${UNLOCK}.`);
    if (owner.host === host && !isAlive(owner.pid)) {
      throw new Error(`juntia-dev tiene un bloqueo huérfano: ${describeOwner(owner)}, y ese proceso ya no existe. No se recupera solo porque un descendiente podría seguir escribiendo en juntia-dev. Comprueba que no queda nada corriendo y libéralo con ${UNLOCK}.`);
    }
    throw new Error(`juntia-dev está en uso: ${describeOwner(owner)}. Un solo agente usa juntia-dev a la vez (decisión 18): espera a que termine.`);
  }
  const entry = { branch, command, startedAt: new Date().toISOString(), host, pid: process.pid, runId: randomUUID() };
  const temporary = join(dir, `owner.${process.pid}.tmp`);
  writeFileSync(temporary, JSON.stringify(entry, null, 2));
  renameSync(temporary, join(dir, "owner.json"));
  let released = false;
  const release = () => { if (!released) { released = true; rmSync(dir, { recursive: true, force: true }); } };
  process.once("exit", release);
  return release;
}

/**
 * `npm run dev:unlock`: enseña de quién es el bloqueo y solo lo borra con `force`. Devuelve el mensaje y si lo borró.
 */
export function unlockDevLock(dir, { force = false, isAlive = alive, host = hostname() } = {}) {
  if (!existsSync(dir)) return { removed: false, message: `No hay bloqueo de juntia-dev (${dir}).` };
  const owner = readOwner(dir);
  const who = owner
    ? `${describeOwner(owner)}; ${owner.host !== host ? "es de otro equipo" : isAlive(owner.pid) ? "ese PID está vivo en este equipo (puede ser el dueño o un PID reutilizado)" : "ese PID ya no existe en este equipo"}`
    : "sin metadatos legibles";
  if (!force) return { removed: false, message: `Bloqueo de juntia-dev en ${dir}: ${who}. Comprueba que no queda ningún proceso de ese comando y vuelve a lanzar con --force para borrarlo.` };
  rmSync(dir, { recursive: true, force: true });
  return { removed: true, message: `Bloqueo borrado (${dir}): ${who}.` };
}

/** Lanza el hijo de forma que su árbol se pueda terminar entero: en POSIX, en su propio grupo de procesos. */
export const spawnOptionsForTree = () => (process.platform === "win32" ? {} : { detached: true });

/** ¿Queda algún proceso del árbol? En POSIX, el grupo; en Windows, el hijo (taskkill /T ya terminó a los demás). */
function treeAlive(child) {
  if (process.platform === "win32") return child.exitCode === null && child.signalCode === null;
  try { process.kill(-child.pid, 0); return true; } catch (error) { return error.code === "EPERM"; }
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Termina el árbol entero del hijo y resuelve cuando ya no queda ninguno. Windows: `taskkill /PID <pid> /T /F`.
 * POSIX: la señal al grupo (`process.kill(-pid)`); si a los 5 s sigue vivo, SIGKILL al grupo.
 */
export async function killTree(child, signal) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try { process.kill(-child.pid, signal); } catch { /* el grupo ya no existe */ }
  }
  for (let waited = 0; treeAlive(child); waited += 50) {
    if (waited === 5000 && process.platform !== "win32") { try { process.kill(-child.pid, "SIGKILL"); } catch { /* ya terminó */ } }
    await pause(50);
  }
  if (child.exitCode === null && child.signalCode === null) await new Promise((resolve) => child.once("close", resolve));
}

/**
 * F48-2: con SIGINT o SIGTERM termina el árbol del hijo en curso y, solo cuando ya no queda ninguno, suelta el
 * bloqueo y sale. Una segunda señal no repite nada.
 */
export function createSignalHandler({ release, getChild, exit, terminate = killTree }) {
  let handling = false;
  return async (signal) => {
    if (handling) return;
    handling = true;
    const child = getChild();
    if (child) await terminate(child, signal);
    release();
    exit(signal === "SIGINT" ? 130 : 143);
  };
}
