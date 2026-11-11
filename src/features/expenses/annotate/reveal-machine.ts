// E5 (MOTION_SYSTEM.md §2) como función pura: en cada cuadro, con lo que la pantalla sabe en ese momento, decide si la fila
// recién guardada se resalta ahí, si se sigue esperando, si se lleva a la persona a Actividad del mes o si E5 termina sin
// navegar. La decisión sale de datos: los ids que el servidor entregó a cada lista montada (F69-5), con su mes y sus contextos
// (F69-6), las listas en carga (F69-7) y la ruta en la que estaba la persona al guardar. Lo único que se mira en el DOM es si
// la fila se ve (`shown`), porque eso depende de lo que la lista pinta: los 5 recientes de Inicio, los filtros de Actividad y
// las copias ocultas por ancho. La tabla de estados está en `reveal-machine.test.ts`, con una prueba por fila.
import type { ContextChoice } from "@/lib/context-preference";

/**
 * Cuadros que se sigue mirando cuando la lista ya trae el id pero la fila no se ve, por si se pinta en el cuadro siguiente.
 * Revisión del PR #69 (F69-5): E5 no decide por un número de cuadros desde el guardado ni por la llegada de un árbol cualquiera,
 * sino por los ids que el servidor entrega a las listas montadas (traza en juntia-dev: la acción responde a ~0,4 s y el árbol
 * con la fila llega a ~1,4–1,5 s).
 */
export const SETTLE_FRAMES = 3;
/** Tope de seguridad si la revalidación no llega nunca: entonces se pide otra y se lleva a Actividad. */
export const REVEAL_SAFETY_MS = 10_000;

/**
 * Lo que E5 enseña resaltado: el id, su fecha (para llevar a Actividad del mes), el contexto de la escritura (F69-6: Yo o
 * Nosotros, que puede no ser el de la página desde la que se anotó) y la ruta en la que estaba la persona al guardar.
 * `follow`: E5 ya llevó a la persona a Actividad del mes (`route` es esa) y sigue mirando ahí, por si un filtro lo oculta
 * (#54); al terminar, no vuelve a navegar.
 */
export type RevealTarget = { id: string; transactionDate: string; context: ContextChoice; route: string; follow?: boolean };

/**
 * Una lista montada: el mes que pinta, de qué contextos pinta movimientos y los ids que le entregó el servidor. `hidden`: los
 * ids que trae pero que sus filtros dejan fuera (Actividad, #54); `key` la identifica para pedirle que los quite.
 */
export type ListSnapshot = { key: string; month: string; contexts: readonly ContextChoice[]; ids: ReadonlySet<string>; hidden: ReadonlySet<string> };

export type RevealFrame = {
  target: RevealTarget;
  /** El contexto de la página en este cuadro. */
  page: ContextChoice;
  /** La ruta en este cuadro (ruta y consulta). */
  route: string;
  lists: Iterable<ListSnapshot>;
  /** La fila real (no la temporal) se ve en la pantalla. */
  shown: boolean;
  /** Milisegundos desde que empezó E5. */
  elapsed: number;
  /** Cuadros seguidos en los que una lista ya traía el id y la fila no se veía. */
  settled: number;
  /** E5 ya pidió quitar los filtros que lo ocultaban (una vez). */
  unfiltered: boolean;
  /** Con `follow`: la ruta ya llegó a la de destino al menos una vez (la navegación de Next tarda en cambiar la URL). */
  reached: boolean;
};

export type RevealStep =
  /** La pantalla enseña la fila: se resalta en el contexto de la página (F69-6: la parte compartida en Inicio de Yo). */
  | { kind: "highlight"; context: ContextChoice }
  | { kind: "wait"; settled: number }
  /** #54: la lista de Actividad trae el id y un filtro activo lo oculta: se quitan solo los filtros que lo excluyen. */
  | { kind: "unfilter"; list: string }
  /** La pantalla no la enseña y el gasto es del contexto de la página: otra revalidación y Actividad del mes. */
  | { kind: "toActivity"; month: string }
  /** E5 deja de mirar sin navegar: queda el aviso «Gasto guardado · Deshacer». */
  | { kind: "stop"; reason: "otherContext" | "navigated" | "arrived" };

export const monthOf = (date: string) => date.slice(0, 7);

export function revealStep({ target, page, route, lists, shown, elapsed, settled, unfiltered, reached }: RevealFrame): RevealStep {
  if (shown) return { kind: "highlight", context: page };
  if (route !== target.route) {
    // Tras llevarla a Actividad, la URL tarda en cambiar: se espera a que llegue (con el tope).
    if (target.follow && !reached) return elapsed >= REVEAL_SAFETY_MS ? { kind: "stop", reason: "arrived" } : { kind: "wait", settled };
    // La persona fue a otra ruta mientras E5 esperaba: se respeta su navegación. El resaltado sigue en el proveedor y se verá
    // si la ruta nueva pinta la fila; E5 no la lleva a ninguna parte.
    return { kind: "stop", reason: "navigated" };
  }
  const month = monthOf(target.transactionDate);
  // Terminar es ir a Actividad del mes si el gasto es del contexto de la página (una sola vez: ya en Actividad, solo se deja de
  // mirar); si no, Actividad de este contexto tampoco lo enseña: solo se deja de mirar (F69-6).
  const end: RevealStep = target.context !== page ? { kind: "stop", reason: "otherContext" } : target.follow ? { kind: "stop", reason: "arrived" } : { kind: "toActivity", month };
  // Las listas que pueden enseñarlo: las del mes del gasto que pintan su contexto, también en carga (F69-7, sin ids todavía).
  const candidates = [...lists].filter((list) => list.month === month && list.contexts.includes(target.context));
  // Ninguna (otro mes, una ruta sin lista u otro contexto): la fila no puede estar aquí; termina enseguida.
  if (candidates.length === 0) return end;
  const holding = candidates.filter((list) => list.ids.has(target.id));
  if (holding.length > 0) {
    // #54: la trae una lista cuyo filtro la oculta: se quitan esos filtros (una vez) y se vuelve a mirar.
    const filtered = holding.find((list) => list.hidden.has(target.id));
    if (filtered && !unfiltered) return { kind: "unfilter", list: filtered.key };
    // La trae y no se ve (fuera de los 5 recientes de Inicio): tras unos cuadros, termina.
    return settled + 1 >= SETTLE_FRAMES ? end : { kind: "wait", settled: settled + 1 };
  }
  // Todavía no lo trae: se espera, aunque lleguen árboles ajenos, hasta el tope de seguridad (F69-5).
  return elapsed >= REVEAL_SAFETY_MS ? end : { kind: "wait", settled };
}
