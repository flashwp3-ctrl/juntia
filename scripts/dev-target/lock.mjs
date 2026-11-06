// Decisión 18: «un solo agente usa juntia-dev a la vez». Archivo de bloqueo con la rama, la hora, el equipo y el PID,
// en la carpeta común de git: lo comparten todos los worktrees de un clon, que es donde trabajan los agentes en
// paralelo. Entre equipos distintos (los dos fundadores) no hay archivo común: esa parte es una regla documentada en
// docs/TESTING.md, no un mecanismo. Un bloqueo cuyo proceso ya no existe en este equipo se considera abandonado.
import { closeSync, openSync, readFileSync, rmSync, writeSync } from "node:fs";
import { hostname } from "node:os";

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === "EPERM"; }
}

/** Intenta tomar el bloqueo. Devuelve una función que lo suelta, o lanza con quién lo tiene. */
export function acquireDevLock(path, { branch, command }) {
  const entry = { branch, command, startedAt: new Date().toISOString(), host: hostname(), pid: process.pid };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(path, "wx");
      writeSync(fd, JSON.stringify(entry, null, 2));
      closeSync(fd);
      let released = false;
      const release = () => { if (!released) { released = true; rmSync(path, { force: true }); } };
      process.once("exit", release);
      return release;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let holder = null;
      try { holder = JSON.parse(readFileSync(path, "utf8")); } catch { /* ilegible: se trata como abandonado */ }
      const abandoned = !holder || (holder.host === hostname() && !alive(holder.pid));
      if (abandoned && attempt === 0) { rmSync(path, { force: true }); continue; }
      throw new Error(
        `juntia-dev está en uso: rama ${holder.branch}, comando ${holder.command}, desde ${holder.startedAt} (equipo ${holder.host}, PID ${holder.pid}). ` +
        "Un solo agente usa juntia-dev a la vez (decisión 18). Espera a que termine; si ese proceso ya no existe, borra " + path,
      );
    }
  }
  throw new Error(`No se pudo tomar el bloqueo de juntia-dev (${path})`);
}
