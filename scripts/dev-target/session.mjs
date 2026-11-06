// F48-2 (tercera ronda): el único punto que toma el bloqueo de juntia-dev, arranca los pasos, cancela y lo suelta.
// - Con SIGINT o SIGTERM se marca la cancelación: no empieza ningún paso nuevo, se termina el árbol del paso en curso
//   y el bloqueo se suelta solo cuando ese árbol ya no existe. El `close()` del flujo principal espera esa misma
//   promesa: que el hijo directo cierre antes que sus nietos no adelanta la liberación.
// - No hay liberación en `exit`: si el proceso muere sin pasar por aquí (error fatal, SIGKILL), no se sabe en qué
//   estado quedó el árbol, y el bloqueo se queda huérfano hasta `npm run dev:unlock -- --force`.
import { spawn } from "node:child_process";
import { acquireDevLock, killTree, spawnOptionsForTree } from "./lock.mjs";

/**
 * @param {{ lockDir: string, branch: string, command: string, terminate?: typeof killTree, exit?: (code: number) => void, onCancel?: (signal: string) => void }} options
 */
export function openDevSession({ lockDir, branch, command, terminate = killTree, exit = (code) => process.exit(code), onCancel = () => {} }) {
  const releaseLock = acquireDevLock(lockDir, { branch, command });
  let current = null;
  let cancelling = null;
  let released = false;
  const release = () => { if (!released) { released = true; releaseLock(); } };

  const cancel = (signal) => {
    if (!cancelling) {
      onCancel(signal);
      const child = current;
      cancelling = (child ? terminate(child, signal) : Promise.resolve()).then(() => {
        release();
        exit(signal === "SIGINT" ? 130 : 143);
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
      current = child;
      child.once("close", () => { if (current === child) current = null; });
      return child;
    },
    cancelled: () => cancelling !== null,
    cancel,
    /** Fin del flujo principal: si hay una cancelación en curso, espera a que el árbol termine; después suelta. */
    async close() {
      if (cancelling) await cancelling;
      for (const [signal, handler] of handlers) process.off(signal, handler);
      release();
    },
  };
}
