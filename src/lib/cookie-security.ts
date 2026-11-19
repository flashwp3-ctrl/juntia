// 005 · PR B (corrección 6, FR-020; decisión del gestor del 19 nov 2026). `Secure` en las cookies propias: siempre, salvo cuando
// el host es `localhost` o `127.0.0.1` (CI y desarrollo local), donde la app se sirve por http. Antes dependía de NODE_ENV: el CI
// sirve la build de producción por http y WebKit no guarda una cookie Secure en http (Chromium sí), así que el tema oscuro nunca
// llegaba al segundo dispositivo (run 44430973809). No se deriva del protocolo ni de `x-forwarded-proto`: se pueden manipular, y
// en Vercel (https) tiene que seguir siempre en true.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** El nombre del host sin puerto, en minúsculas («localhost:3400» → «localhost»). */
export function hostName(host: string | null | undefined): string {
  return (host ?? "").trim().toLowerCase().replace(/:\d+$/, "");
}

/** `true` salvo con `localhost` o `127.0.0.1`. Sin host, `true`. */
export function cookieSecure(host: string | null | undefined): boolean {
  return !LOCAL_HOSTS.has(hostName(host));
}
