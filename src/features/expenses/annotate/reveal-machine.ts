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
 */
export type RevealTarget = { id: string; transactionDate: string; context: ContextChoice; route: string };

/** Una lista montada: el mes que pinta, de qué contextos pinta movimientos y los ids que le entregó el servidor. */
export type ListSnapshot = { month: string; contexts: readonly ContextChoice[]; ids: ReadonlySet<string> };

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
};

export type RevealStep =
  /** La pantalla enseña la fila: se resalta en el contexto de la página (F69-6: la parte compartida en Inicio de Yo). */
  | { kind: "highlight"; context: ContextChoice }
  | { kind: "wait"; settled: number }
  /** La pantalla no la enseña y el gasto es del contexto de la página: otra revalidación y Actividad del mes. */
  | { kind: "toActivity"; month: string }
  /** E5 deja de mirar sin navegar: queda el aviso «Gasto guardado · Deshacer». */
  | { kind: "stop"; reason: "otherContext" | "navigated" };

export const monthOf = (date: string) => date.slice(0, 7);

export function revealStep({ target, page, route, lists, shown, elapsed, settled }: RevealFrame): RevealStep {
  if (shown) return { kind: "highlight", context: page };
  // La persona fue a otra ruta mientras E5 esperaba: se respeta su navegación. El resaltado sigue en el proveedor y se verá si
  // la ruta nueva pinta la fila; E5 no la lleva a ninguna parte.
  if (route !== target.route) return { kind: "stop", reason: "navigated" };
  const month = monthOf(target.transactionDate);
  // Terminar es ir a Actividad del mes si el gasto es del contexto de la página; si no, Actividad de este contexto tampoco lo
  // enseña: solo se deja de mirar (F69-6).
  const end: RevealStep = target.context === page ? { kind: "toActivity", month } : { kind: "stop", reason: "otherContext" };
  // Las listas que pueden enseñarlo: las del mes del gasto que pintan su contexto, también en carga (F69-7, sin ids todavía).
  const candidates = [...lists].filter((list) => list.month === month && list.contexts.includes(target.context));
  // Ninguna (otro mes, una ruta sin lista u otro contexto): la fila no puede estar aquí; termina enseguida.
  if (candidates.length === 0) return end;
  // Una ya trae el id y la fila no se ve (fuera de los 5 recientes de Inicio): tras unos cuadros, termina.
  if (candidates.some((list) => list.ids.has(target.id))) return settled + 1 >= SETTLE_FRAMES ? end : { kind: "wait", settled: settled + 1 };
  // Todavía no lo trae: se espera, aunque lleguen árboles ajenos, hasta el tope de seguridad (F69-5).
  return elapsed >= REVEAL_SAFETY_MS ? end : { kind: "wait", settled };
}
