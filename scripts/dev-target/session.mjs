// F48-2: el único punto que toma el bloqueo de juntia-dev, arranca los pasos, cancela y lo suelta.
// - Cada paso corre en su propio grupo de procesos, y la sesión conserva ese grupo hasta comprobar que ya no existe,
//   aunque el proceso principal del paso haya cerrado antes que sus descendientes (F48-2A).
// - Con SIGINT o SIGTERM se marca la cancelación: no empieza ningún paso nuevo, se terminan todos los grupos que sigan
//   vivos y el bloqueo se suelta solo cuando ya no queda ninguno. `close()` espera esa misma promesa, y al final normal
//   también termina los grupos que sigan vivos antes de soltar.
// - No hay liberación en `exit`: si el proceso muere sin pasar por aquí (error fatal, SIGKILL), no se sabe en qué estado
//   quedó el árbol, y el bloqueo se queda huérfano hasta `npm run dev:unlock -- --force`.
// - `runInSession` es el flujo que comparten `run.mjs` y su prueba (F48-2C): pasos dentro de try, y en `finally` el
//   `await session.close()`.
import { spawn } from "node:child_process";
import { acquireDevLock, killTree, spawnOptionsForTree, treeAlive } from "./lock.mjs";

/**
 * @param {{ lockDir: string, branch: string, command: string, terminate?: typeof killTree, exit?: (code: number) => void, onCancel?: (signal: string) => void }} options
 */
export function openDevSession({ lockDir, branch, command, terminate = killTree, exit = (code) => process.exit(code), onCancel = () => {} }) {
  const releaseLock = acquireDevLock(lockDir, { branch, command });
  /** Grupos de los pasos que pueden seguir vivos, por PID de su proceso principal (= PGID en POSIX). */
  const groups = new Map();
  let cancelling = null;
  let failure = null;
  let released = false;
  const release = () => { if (!released) { released = true; releaseLock(); } };
  const terminateAll = async (signal) => {
    for (const [pid, child] of [...groups]) { await terminate(child, signal); groups.delete(pid); }
  };

  const cancel = (signal) => {
    if (!cancelling) {
      onCancel(signal);
      // Si el árbol no termina (TreeStillAliveError), no se suelta el bloqueo: se queda huérfano y se sale con error.
      cancelling = terminateAll(signal).then(() => {
        release();
        exit(signal === "SIGINT" ? 130 : 143);
      }, (error) => {
        failure = error;
        console.error(error instanceof Error ? error.message : String(error));
        exit(1);
      });
    }
    return cancelling;
  };
  const handlers = ["SIGINT", "SIGTERM"].map((signal) => [signal, () => { void cancel(signal); }]);
  for (const [signal, handler] of handlers) process.on(signal, handler);

  return {
    /** Lanza un paso en su propio grupo de procesos, o devuelve null si hay una cancelación en curso. */
    spawn(file, args, options) {
      if (cancelling) return null;
      const child = spawn(file, args, { ...spawnOptionsForTree(), ...options });
      groups.set(child.pid, child);
      // El grupo se olvida solo cuando ya no queda ningún proceso suyo, no cuando cierra el principal.
      child.once("close", () => { if (!treeAlive(child)) groups.delete(child.pid); });
      return child;
    },
    cancelled: () => cancelling !== null,
    cancel,
    /** Fin del flujo: espera la cancelación en curso o termina los grupos que sigan vivos; después suelta. Si un árbol
     * no termina, lanza y el bloqueo se queda huérfano. */
    async close() {
      if (cancelling) { await cancelling; if (failure) throw failure; }
      else if (groups.size) await terminateAll("SIGTERM");
      for (const [signal, handler] of handlers) process.off(signal, handler);
      release();
    },
  };
}

/**
 * Flujo compartido por `run.mjs` y su prueba: los pasos dentro de try y, pase lo que pase, `await session.close()`.
 * @template T
 * @param {Parameters<typeof openDevSession>[0]} options
 * @param {(session: ReturnType<typeof openDevSession>) => Promise<T>} flow
 * @returns {Promise<T>}
 */
export async function runInSession(options, flow) {
  const session = openDevSession(options);
  try {
    return await flow(session);
  } finally {
    await session.close();
  }
}
