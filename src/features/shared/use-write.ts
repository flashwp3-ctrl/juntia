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
    let outcome: WriteOutcome<T>;
    try {
      outcome = await run(payload);
    } catch {
      outcome = { status: "unknown" };
    }
    if (mine !== generation.current) return;
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
    let result: WriteStatusOutcome<T> | null = null;
    try {
      result = await check({ action, idempotencyKey: payload.idempotencyKey });
    } catch {
      result = null;
    }
    if (mine !== generation.current) return;
    busy.current = false;
    if (result?.state === "completed") {
      setState({ phase: "ok", value: result.value, key: payload.idempotencyKey });
      onOk?.(result.value, payload);
    } else {
      // `not_found` dice que todavía no consta; un fallo al comprobar deja el estado desconocido como estaba.
      setState({ phase: "unknown", checking: false, notFound: result?.state === "not_found" });
    }
  }, [action, check, onOk]);

  const reset = useCallback(() => {
    generation.current++;
    last.current = null;
    busy.current = false;
    setState({ phase: "idle" });
  }, []);

  return { state, locked, pending: state.phase === "pending" || (state.phase === "unknown" && state.checking), submit, retry, checkStatus, reset };
}
