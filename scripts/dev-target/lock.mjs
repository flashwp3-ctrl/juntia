// Decisión 18: «un solo agente usa juntia-dev a la vez». El bloqueo es un DIRECTORIO en la carpeta común de git: `mkdir`
// es atómico, así que de dos agentes que lo intentan a la vez solo uno lo crea (F48-2; un archivo con `open wx` y la
// escritura del JSON aparte dejaba una ventana). Dentro, `owner.json` con la rama, el comando, la hora, el equipo y el
// PID, escrito con un rename para que nunca se lea a medias. Lo comparten todos los worktrees de un clon; entre equipos
// distintos (los dos fundadores) no hay carpeta común y la regla es documental (docs/TESTING.md §2).
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

/** Un bloqueo solo se da por abandonado si su PID ya no existe en este equipo Y lleva al menos este tiempo. */
export const STALE_AFTER_MS = 2 * 60 * 1000;

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === "EPERM"; }
}

function readOwner(dir) {
  try {
    const owner = JSON.parse(readFileSync(join(dir, "owner.json"), "utf8"));
    const complete = typeof owner.branch === "string" && typeof owner.command === "string" && typeof owner.host === "string"
      && Number.isInteger(owner.pid) && !Number.isNaN(Date.parse(owner.startedAt));
    return complete ? owner : null;
  } catch { return null; }
}

const sameOwner = (a, b) => a && b && a.host === b.host && a.pid === b.pid && a.startedAt === b.startedAt;

/**
 * Intenta tomar el bloqueo `dir`. Devuelve una función que lo suelta, o lanza diciendo quién lo tiene. Unos metadatos
 * ilegibles o incompletos NO cuentan como abandono: puede ser otro agente que acaba de crear el directorio.
 * `options` existe para las pruebas (hora, equipo y comprobación de PID).
 */
export function acquireDevLock(dir, { branch, command }, { now = Date.now, host = hostname(), isAlive = alive } = {}) {
  const entry = { branch, command, startedAt: new Date(now()).toISOString(), host, pid: process.pid };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      mkdirSync(dir);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const owner = readOwner(dir);
      if (!owner) throw new Error(`juntia-dev está en uso y su bloqueo no tiene metadatos legibles todavía (${dir}). Un solo agente usa juntia-dev a la vez (decisión 18): espera; si sabes que nadie lo usa, borra esa carpeta.`);
      const abandoned = owner.host === host && !isAlive(owner.pid) && now() - Date.parse(owner.startedAt) >= STALE_AFTER_MS;
      if (!abandoned || attempt > 0) {
        throw new Error(
          `juntia-dev está en uso: rama ${owner.branch}, comando ${owner.command}, desde ${owner.startedAt} (equipo ${owner.host}, PID ${owner.pid}). ` +
          `Un solo agente usa juntia-dev a la vez (decisión 18). Espera a que termine; si ese proceso ya no existe, borra ${dir}`,
        );
      }
      // Se aparta el bloqueo abandonado con un rename atómico y se comprueba que lo apartado es el que se vio: si otro
      // agente lo recuperó a la vez y ya creó el suyo, se devuelve a su sitio y se para.
      const grave = `${dir}.abandonado-${process.pid}-${now()}`;
      try { renameSync(dir, grave); } catch (moved) { if (moved.code === "ENOENT") continue; throw moved; }
      if (!sameOwner(readOwner(grave), owner)) {
        try { renameSync(grave, dir); } catch { /* el otro ya creó el suyo; el apartado se queda para revisarlo a mano */ }
        throw new Error(`Otro agente tomó juntia-dev mientras se recuperaba un bloqueo abandonado (${dir}). Vuelve a lanzar.`);
      }
      rmSync(grave, { recursive: true, force: true });
      continue;
    }
    const temporary = join(dir, `owner.${process.pid}.tmp`);
    writeFileSync(temporary, JSON.stringify(entry, null, 2));
    renameSync(temporary, join(dir, "owner.json"));
    let released = false;
    const release = () => { if (!released) { released = true; rmSync(dir, { recursive: true, force: true }); } };
    process.once("exit", release);
    return release;
  }
  throw new Error(`No se pudo tomar el bloqueo de juntia-dev (${dir})`);
}

/**
 * F48-2: con SIGINT o SIGTERM, reenvía la señal al hijo en curso (`supabase db reset`, psql, vitest, Playwright), espera
 * a que termine y solo entonces suelta el bloqueo y sale. Así ningún otro agente entra mientras el hijo sigue
 * escribiendo en juntia-dev. Una segunda señal no repite nada.
 */
export function createSignalHandler({ release, getChild, exit }) {
  let handling = false;
  return async (signal) => {
    if (handling) return;
    handling = true;
    const child = getChild();
    if (child && child.exitCode === null && child.signalCode === null) {
      const closed = new Promise((resolve) => child.once("close", resolve));
      child.kill(signal);
      await closed;
    }
    release();
    exit(signal === "SIGINT" ? 130 : 143);
  };
}
