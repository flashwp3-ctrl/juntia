"use client";
// T031b / FR-059; contracts/server-actions.md §1: el lado del cliente de write-result.ts (las Server Actions no pueden
// importar React).
import { useCallback, useRef, useState } from "react";
import type { WriteAction, WriteError, WriteOutcome, WriteStatusOutcome } from "./write-result";

export type WriteState<T> =
  | { phase: "idle" }
  | { phase: "pending" }
  /** `key`: la clave de la intención que dio este resultado (F55-2): quien lo pinta comprueba que es la suya. */
  | { phase: "ok"; value: T; key: string }
  | { phase: "rejected"; error: WriteError }
  | { phase: "unknown"; checking: boolean; notFound: boolean };

/**
 * F55-3 (segunda ronda del PR #55): ninguna escritura ni «Comprobar estado» espera para siempre. El contrato habla de
 * «tiempo agotado» sin cifra (contracts/server-actions.md §1), así que el límite es 15 s. Al vencer, el resultado es
 * `unknown` con la misma clave y la misma carga, y se abre una generación nueva: la respuesta tardía no toca nada.
 */
export const WRITE_TIMEOUT_MS = 15_000;
const TIMED_OUT = Symbol("timedOut");

function withTimeout<V>(promise: Promise<V>): Promise<V | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<typeof TIMED_OUT>((resolve) => { timer = setTimeout(() => resolve(TIMED_OUT), WRITE_TIMEOUT_MS); });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

type UseWriteOptions<P, T> = {
  action: WriteAction;
  run: (payload: P) => Promise<WriteOutcome<T>>;
  check: (input: { action: WriteAction; idempotencyKey: string }) => Promise<WriteStatusOutcome<T>>;
  onOk?: (value: T, payload: P) => void;
  onRejected?: (error: WriteError, payload: P) => void;
};

/**
 * En el cliente: una intención de escritura. `submit` envía una carga (con su clave, nacida al abrir la hoja o el
 * diálogo); tras `unknown` queda bloqueada (`locked`) y solo `retry` (la misma carga, la misma clave) o `checkStatus`
 * pueden seguir. Una excepción al llamar a la Server Action (la red se cayó) también es `unknown`.
 * F55-2 (revisión del PR #55): cada envío y cada `reset` abren una generación nueva; la respuesta de una generación
 * anterior se ignora (ni `setState` ni `onOk`), así un resultado tardío nunca se mezcla con otra intención.
 */
export function useWrite<P extends { idempotencyKey: string }, T>({ action, run, check, onOk, onRejected }: UseWriteOptions<P, T>) {
  const [state, setState] = useState<WriteState<T>>({ phase: "idle" });
  const last = useRef<P | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);

  const send = useCallback(async (payload: P) => {
    if (busy.current) return;
    busy.current = true;
    last.current = payload;
    const mine = ++generation.current;
    setState({ phase: "pending" });
    let outcome: WriteOutcome<T> | typeof TIMED_OUT;
    try {
      outcome = await withTimeout(run(payload));
    } catch {
      outcome = { status: "unknown" };
    }
    if (mine !== generation.current) return;
    if (outcome === TIMED_OUT) {
      // Tiempo agotado: desconocido, con la misma carga para «Reintentar», y una generación nueva para la respuesta tardía.
      generation.current++;
      outcome = { status: "unknown" };
    }
    busy.current = false;
    if (outcome.status === "ok") {
      setState({ phase: "ok", value: outcome.value, key: payload.idempotencyKey });
      onOk?.(outcome.value, payload);
    } else if (outcome.status === "rejected") {
      setState({ phase: "rejected", error: outcome.error });
      onRejected?.(outcome.error, payload);
    } else {
      setState({ phase: "unknown", checking: false, notFound: false });
    }
  }, [run, onOk, onRejected]);

  const locked = state.phase === "unknown";
  const submit = useCallback((payload: P) => (locked ? Promise.resolve() : send(payload)), [locked, send]);
  const retry = useCallback(() => (last.current ? send(last.current) : Promise.resolve()), [send]);

  const checkStatus = useCallback(async () => {
    const payload = last.current;
    if (!payload || busy.current) return;
    busy.current = true;
    const mine = ++generation.current;
    setState({ phase: "unknown", checking: true, notFound: false });
    let result: WriteStatusOutcome<T> | typeof TIMED_OUT | null = null;
    try {
      result = await withTimeout(check({ action, idempotencyKey: payload.idempotencyKey }));
    } catch {
      result = null;
    }
    if (mine !== generation.current) return;
    if (result === TIMED_OUT) {
      // Comprobar tampoco espera para siempre: sigue desconocido y se puede volver a comprobar.
      generation.current++;
      result = null;
    }
    busy.current = false;
    if (result?.state === "completed") {
      setState({ phase: "ok", value: result.value, key: payload.idempotencyKey });
      onOk?.(result.value, payload);
    } else {
      // `not_found` dice que todavía no consta; un fallo al comprobar deja el estado desconocido como estaba.
      setState({ phase: "unknown", checking: false, notFound: result?.state === "not_found" });
    }
  }, [action, check, onOk]);

  /** F55-3: reanuda una intención que quedó sin resultado (tras recargar) como `unknown`, con su carga, sin enviar nada. */
  const resume = useCallback((payload: P) => {
    generation.current++;
    last.current = payload;
    busy.current = false;
    setState({ phase: "unknown", checking: false, notFound: false });
  }, []);

  const reset = useCallback(() => {
    generation.current++;
    last.current = null;
    busy.current = false;
    setState({ phase: "idle" });
  }, []);

  return { state, locked, pending: state.phase === "pending" || (state.phase === "unknown" && state.checking), submit, retry, checkStatus, resume, reset };
}
