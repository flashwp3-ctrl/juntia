// Maestro §15.10, decisión 18; ADR-011 §9.9. Destino de las pruebas que necesitan Supabase: el runner de CI (localhost)
// o, solo a través de `npm run *:dev`, `juntia-dev`. El runner `scripts/dev-target/run.mjs` fija JUNTIA_TEST_TARGET=dev
// después de pasar el guardia; aquí se repite el guardia dentro del proceso de pruebas antes de cada escritura.
import { checkDevProcessEnv } from "../../scripts/dev-target/guard.mjs";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

/** Verdadero solo dentro de un comando `*:dev`. */
export const isDevTarget = () => process.env.JUNTIA_TEST_TARGET === "dev";

/**
 * Los flujos que envían o leen un correo solo corren en CI: dev no tiene Mailpit y su correo integrado admite 2 envíos por
 * hora y solo a miembros de la organización. Se usa como `it.skipIf(sendsMailOnDev)` y, en Playwright, con la etiqueta
 * `@mail`, que `e2e:dev` excluye y declara en su resumen.
 */
export const sendsMailOnDev = isDevTarget();

/** Lanza si `url` no es el destino de pruebas permitido: localhost en el runner o, en un comando `*:dev`, juntia-dev. */
export function assertTestTarget(url: string, what: string) {
  let host = "";
  try { host = new URL(url).hostname; } catch { /* vacío o no válido */ }
  if (isDevTarget()) {
    checkDevProcessEnv(process.env);
    return;
  }
  if (!LOCAL_HOSTS.has(host)) throw new Error(`${what} solo corre contra el Supabase local del runner o, con npm run *:dev, contra juntia-dev (ADR-011 §9.6 y §9.9)`);
}
