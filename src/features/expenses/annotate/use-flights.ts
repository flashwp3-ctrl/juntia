"use client";
// Las creaciones privadas en vuelo y las listas montadas (UX lote 1, cambio 3; F51-8, F51-12; F69-5, F69-6). La lógica está en
// `flights.ts`; aquí solo el estado, la referencia que leen los efectos y el intervalo de revalidaciones con tope.
// Por qué no `useOptimistic` de React 19 (evaluado en la refactorización del 11 nov 2026; no volver a proponerlo sin esto):
//   1. el valor optimista cae al terminar la acción (~0,4 s) y la fila real llega con el árbol (~1,4 s): habría hueco, y F51-12
//      exige que la temporal confirmada se quede hasta que la lista traiga el id;
//   2. con el tope de 15 s la transición seguiría pendiente y la fila a la vista mientras la hoja vuelve bloqueada;
//   3. compartidos y gasto con meta no tienen fila optimista (aprobado): solo serviría para la creación privada;
//   4. la hoja vive en el layout y las listas en las páginas: el hook tendría que estar igual en este proveedor.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ContextChoice } from "@/lib/context-preference";
import type { ActionResult, PendingRow, SavedTransaction } from "../types";
import { confirm, drop, launch, ListRegistry, NO_FLIGHTS, reconcile, REFRESH_EVERY_MS, refreshRound, type Flights } from "./flights";

/** Lo que una lista hace con el proveedor: montar su mes (con sus contextos) e informar de los ids reales que trae. */
export type ListScope = {
  enter: (key: string, month: string, contexts: readonly ContextChoice[]) => () => void;
  /** `revalidated`: llegó por una revalidación (filas nuevas del servidor). */
  report: (key: string, month: string, ids: readonly string[], revalidated: boolean) => void;
  /** #54: los ids que la lista trae y sus filtros dejan fuera, y cómo quitar solo los filtros que excluyen uno. */
  filter: (key: string, hidden: readonly string[], unhide: (id: string) => void) => void;
};

type FlightHooks = {
  /** Pide una revalidación de la página (router.refresh). */
  refresh: () => void;
  /** La creación se envía: la hoja se oculta. */
  onLaunch: () => void;
  /** Rechazo o desconocido: la hoja vuelve. */
  onReturn: () => void;
};

export function useFlights({ refresh, onLaunch, onReturn }: FlightHooks) {
  const [flights, setFlights] = useState<Flights>(NO_FLIGHTS);
  const flightsRef = useRef(flights);
  useEffect(() => { flightsRef.current = flights; }, [flights]);
  const [registry] = useState(() => new ListRegistry());
  const hooks = useRef({ refresh, onLaunch, onReturn });
  useEffect(() => { hooks.current = { refresh, onLaunch, onReturn }; });

  // Si se confirma, la hoja ya no vuelve y la fila temporal se queda (con su id real) hasta que la lista trae la real: sin
  // hueco y sin duplicado. Rechazo confirmado o desconocido: la fila se va y la hoja vuelve (con el aviso de siempre o
  // BLOQUEADA, con la misma clave para «Reintentar», como la E4 desconocida de la 002, FR-036).
  const track = useCallback((row: PendingRow, run: () => Promise<ActionResult<SavedTransaction>>) => new Promise<ActionResult<SavedTransaction>>((resolve) => {
    hooks.current.onLaunch();
    setFlights((current) => launch(current, row));
    void (async () => {
      let result: ActionResult<SavedTransaction>;
      try {
        result = await run();
      } catch {
        result = { ok: false, error: "network" };
      }
      if (result.ok) {
        const savedId = result.value.id;
        setFlights((current) => confirm(current, row.key, savedId));
      } else {
        setFlights((current) => drop(current, [row.key]));
        hooks.current.onReturn();
      }
      resolve(result);
    })();
  }), []);

  const scope = useMemo<ListScope>(() => ({
    enter: (key, month, contexts) => registry.enter(key, month, contexts),
    filter: (key, hidden, unhide) => registry.filter(key, hidden, unhide),
    report: (key, month, ids, revalidated) => {
      registry.report(key, month, ids);
      setFlights((current) => reconcile(current, ids, revalidated, (target) => registry.hasMonth(target)));
    },
  }), [registry]);

  // Cuántas revalidaciones se han pedido por fila: en una referencia, no en el estado, para que dos peticiones seguidas (antes
  // de que React pinte) cuenten las dos y el tope de 3 sea de verdad un tope. Las cuentas no se borran al retirar la fila: una
  // clave confirmada no vuelve a usarse, y borrarla dejaría que una petición aún en cola la contara de nuevo desde cero.
  const counts = useRef(new Map<string, number>());
  const askRefresh = useCallback(() => {
    const { exhausted, live } = refreshRound(flightsRef.current, counts.current);
    if (exhausted.length > 0) setFlights((current) => drop(current, exhausted));
    if (live.length > 0) {
      for (const key of live) counts.current.set(key, (counts.current.get(key) ?? 0) + 1);
      hooks.current.refresh();
    }
  }, []);
  const waitingForReal = flights.some((flight) => flight.state === "confirmed");
  useEffect(() => {
    if (!waitingForReal) return;
    const handle = setInterval(askRefresh, REFRESH_EVERY_MS);
    return () => clearInterval(handle);
  }, [waitingForReal, askRefresh]);

  return { rows: flights, scope, track, askRefresh, registry };
}
