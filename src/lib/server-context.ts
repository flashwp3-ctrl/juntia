import "server-only";
// F44-1 (revisión del PR #44, dos rondas). El contexto que pinta el servidor: la cookie `juntia_context` del
// dispositivo, `me` o `us`. Sin ella o con un valor no válido devuelve `null`: el servidor no sabe qué recuerda el
// dispositivo y **no lee movimientos ni construye la vista privada**; pinta el Skeleton y el cliente resuelve la
// preferencia (localStorage o, sin ella, Yo, el valor por defecto de la 001), escribe la cookie y pide la página otra
// vez. Con `us` tampoco se lee nada: nada privado viaja en el HTML ni en el payload RSC.
import { cookies } from "next/headers";
import { CONTEXT_COOKIE, parseContextChoice, type ContextChoice } from "./context-preference";

export async function serverContext(): Promise<ContextChoice | null> {
  return parseContextChoice((await cookies()).get(CONTEXT_COOKIE)?.value);
}
