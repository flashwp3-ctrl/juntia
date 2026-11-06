import "server-only";
// F44-1 (revisión del PR #44). El contexto que pinta el servidor: la cookie `juntia_context` del dispositivo o, sin
// ella o con un valor no válido, Yo, el valor por defecto de la 001 (decisión 10; 001 FR-026). Con Nosotros, las
// páginas no leen movimientos ni construyen la vista privada: nada privado viaja en el HTML ni en el payload RSC.
import { cookies } from "next/headers";
import { CONTEXT_COOKIE, parseContextChoice, type ContextChoice } from "./context-preference";

export async function serverContext(): Promise<ContextChoice> {
  return parseContextChoice((await cookies()).get(CONTEXT_COOKIE)?.value) ?? "me";
}
