// Las creaciones privadas en vuelo (UX lote 1, cambio 3, simplificado por decisión de los fundadores del 7 nov 2026) y las
// listas montadas, como funciones puras. Cada creación en vuelo es una fila temporal con estado propio, por su clave: una
// petición colgada no retrasa la retirada de otra (F51-8). Nada de esto se guarda en el navegador: si se recarga la página, no
// queda rastro (el resultado desconocido se resuelve en la hoja, con «Reintentar»).
// F51-12. La espera de una fila confirmada termina con lo primero de: (a) una lista montada trae el UUID real; (b) llega una
// revalidación que no lo trae y la fila ya no le corresponde a ninguna lista montada (otro mes): se retira, sin hueco visible,
// porque ninguna la mostraba; (c) tope de 3 revalidaciones pedidas: se retira la temporal, el servidor ya confirmó. Nunca hay
// revalidaciones periódicas sin límite.
import type { ContextChoice } from "@/lib/context-preference";
import type { PendingRow } from "../types";
import { monthOf, type ListSnapshot } from "./reveal-machine";

/** Plazo entre peticiones de revalidación mientras una fila confirmada espera a la real (F51-12). */
export const REFRESH_EVERY_MS = 8000;
/** Tope de revalidaciones por fila confirmada: pasado, se retira la temporal (el servidor ya confirmó; la real saldrá en la próxima carga). */
export const MAX_REFRESHES = 3;

export type Flights = readonly PendingRow[];
export const NO_FLIGHTS: Flights = [];

/** La fila nace «Guardando…» (o vuelve a nacer, con la misma clave, en el reintento: nunca dos). */
export const launch = (flights: Flights, row: PendingRow): Flights => [...flights.filter(({ key }) => key !== row.key), { ...row, state: "saving", savedId: undefined }];

/** Confirmada: la fila se queda, con su id real, hasta que una lista trae esa fila. Nunca se retira por tiempo. */
export const confirm = (flights: Flights, key: string, savedId: string): Flights => flights.map((flight) => (flight.key === key ? { ...flight, state: "confirmed", savedId } : flight));

/** Rechazo o desconocido: la fila se va (y la hoja vuelve). */
export const drop = (flights: Flights, keys: readonly string[]): Flights => {
  const next = flights.filter(({ key }) => !keys.includes(key));
  return next.length === flights.length ? flights : next;
};

/**
 * Una lista informa de los ids reales que trae. (a) La fila confirmada cuyo id ya está se retira. (b) Si llegó por una
 * revalidación (`revalidated`) y la fila ya no le corresponde a ninguna lista montada (`hasMonth`), también.
 */
export function reconcile(flights: Flights, ids: readonly string[], revalidated: boolean, hasMonth: (month: string) => boolean): Flights {
  const next = flights.filter((flight) => {
    if (flight.state !== "confirmed" || !flight.savedId) return true;
    if (ids.includes(flight.savedId)) return false; // (a)
    if (!revalidated) return true;
    return hasMonth(monthOf(flight.transaction.transactionDate)); // (b)
  });
  return next.length === flights.length ? flights : next;
}

/**
 * Qué hacer en una ronda de revalidación (c): las filas confirmadas que ya agotaron el tope se retiran (`exhausted`) y, si
 * queda alguna bajo el tope (`live`), se pide una revalidación más y cuenta para cada una. Tras la tercera, la fila NO provoca
 * una cuarta petición: se retira en la ronda siguiente (8 s después), dándole tiempo a la tercera.
 */
export function refreshRound(flights: Flights, counts: ReadonlyMap<string, number>) {
  const waiting = flights.filter((flight) => flight.state === "confirmed");
  const exhausted = waiting.filter((flight) => (counts.get(flight.key) ?? 0) >= MAX_REFRESHES).map((flight) => flight.key);
  const live = waiting.filter((flight) => (counts.get(flight.key) ?? 0) < MAX_REFRESHES).map((flight) => flight.key);
  return { exhausted, live };
}

/**
 * F05 (auditoría de Impeccable; propuesta aprobada por los fundadores el 11 de noviembre de 2026): lo que las creaciones en
 * vuelo suman al gasto del mes de una lista, para que el total del héroe de Inicio suba con la fila (MOTION_SYSTEM §2: «la
 * fila nueva … el total cuenta hacia arriba», un solo momento). Cuenta solo gastos (un ingreso nunca entra en el héroe,
 * FR-019) del mes de la lista. Una fila confirmada deja de contar en cuanto la lista trae su id real: desde ese render el
 * total del servidor ya la incluye, así que nunca se suma dos veces. Con rechazo o resultado desconocido la fila se retira
 * (`drop`) y el total vuelve solo a lo confirmado. Como las filas, vive en memoria: nada se guarda en el navegador.
 */
export function pendingSpendMinor(flights: Flights, month: string, knownIds: readonly string[]): bigint {
  return flights.reduce((sum, { transaction, savedId }) => (
    transaction.type === "expense" && monthOf(transaction.transactionDate) === month && !(savedId && knownIds.includes(savedId))
      ? sum + transaction.amount.amountMinor
      : sum
  ), 0n);
}

/**
 * Las listas montadas, por lista (F69-6: un id que trae una lista de Nosotros no cuenta para una de Yo). Las cuentas no se
 * pintan: viven en una referencia del proveedor y E5 las lee en cada cuadro.
 */
export class ListRegistry {
  private readonly lists = new Map<string, ListSnapshot>();
  /** #54: cómo quita cada lista los filtros que dejan fuera un id (solo esos). */
  private readonly unhiders = new Map<string, (id: string) => void>();

  enter(key: string, month: string, contexts: readonly ContextChoice[]) {
    const previous = this.lists.get(key);
    this.lists.set(key, { key, month, contexts, ids: previous?.ids ?? new Set(), hidden: previous?.hidden ?? new Set() });
    return () => { this.lists.delete(key); this.unhiders.delete(key); };
  }

  /** Guarda los ids que trae la lista, si sigue montada con ese mes. */
  report(key: string, month: string, ids: readonly string[]) {
    const list = this.lists.get(key);
    if (list && list.month === month) this.lists.set(key, { ...list, ids: new Set(ids) });
  }

  /** #54: los ids que la lista trae y sus filtros dejan fuera, y cómo quitar esos filtros. */
  filter(key: string, hidden: readonly string[], unhide: (id: string) => void) {
    const list = this.lists.get(key);
    if (!list) return;
    this.lists.set(key, { ...list, hidden: new Set(hidden) });
    this.unhiders.set(key, unhide);
  }

  unhide(key: string, id: string) {
    this.unhiders.get(key)?.(id);
  }

  hasMonth(month: string) {
    for (const list of this.lists.values()) if (list.month === month) return true;
    return false;
  }

  snapshot(): Iterable<ListSnapshot> {
    return this.lists.values();
  }
}
