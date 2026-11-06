// T031b / FR-056, FR-059; contracts/server-actions.md §1; contracts/errors.md, «Rechazo confirmado frente a resultado
// desconocido»; interpretación I2 (nace completa en el PR B con las cuatro escrituras de invitación; el PR C la amplía).
// Tres resultados que la interfaz nunca trata igual:
// - `ok`: la función respondió con éxito.
// - `rejected`: la función respondió con un `JTnnn` (o el servidor rechazó antes de escribir): no se escribió nada.
// - `unknown`: red, tiempo agotado, respuesta perdida, 5xx sin `JT` o `40P01`/`40001` agotados. Nunca se afirma que no
//   se escribió: la intención queda bloqueada, «Reintentar» repite lo mismo con la misma clave y «Comprobar estado» lee
//   `write_status`, que no reejecuta nada.
import { useCallback, useRef, useState } from "react";
import { DbError, mapDbError, type DbErrorKind } from "@/lib/db/errors";

/** Errores de dominio que la interfaz sabe decir (contracts/errors.md); el resto cae en `unexpected`. */
export type WriteError =
  | "alreadyInCouple" | "invitationGone" | "alreadyAccepted" | "invalid" | "invalidEmail" | "versionConflict"
  | "sessionExpired" | "unexpected";
export type WriteOutcome<T> = { status: "ok"; value: T } | { status: "rejected"; error: WriteError } | { status: "unknown" };
/**
 * Lo que devuelve «Comprobar estado», ya normalizado por la Server Action. `error`: no se pudo comprobar (red); el
 * estado sigue desconocido, sin decir que no consta.
 */
export type WriteStatusOutcome<T> = { state: "completed"; value: T } | { state: "not_found" } | { state: "error" };
/** Acciones de `idempotency_records` que el PR B consulta con `write_status`. El PR C añade las suyas. */
export type WriteAction = "create_invitation" | "regenerate_invitation" | "cancel_invitation" | "accept_invitation";

const UNKNOWN: ReadonlySet<DbErrorKind> = new Set(["network", "retryable", "retryExhausted", "unexpected"]);
const REJECTED: Partial<Record<DbErrorKind, WriteError>> = {
  alreadyInCouple: "alreadyInCouple",
  invitationNotFound: "invitationGone",
  invitationAlreadyAccepted: "alreadyAccepted",
  invitationInvalid: "invalid",
  invalidEmail: "invalidEmail",
  versionConflict: "versionConflict",
  notAuthenticated: "sessionExpired",
};

/**
 * En el servidor: un error de `src/lib/db` → `rejected` o `unknown`. `unexpected` de `mapDbError` es un código que no
 * es `JT` ni Postgres conocido (un 5xx sin código): desconocido. Un `JT` sin copy propia (JT008, JT009, JT109, JT119) es
 * un rechazo confirmado que la interfaz dice como «algo salió mal».
 */
export function outcomeFromError(error: unknown): { status: "rejected"; error: WriteError } | { status: "unknown" } {
  const kind = (error instanceof DbError ? error : mapDbError(error)).kind;
  if (UNKNOWN.has(kind)) return { status: "unknown" };
  return { status: "rejected", error: REJECTED[kind] ?? "unexpected" };
}

/** En el servidor: ejecuta la escritura y la clasifica. */
export async function runWrite<T>(write: () => Promise<T>): Promise<WriteOutcome<T>> {
  try {
    return { status: "ok", value: await write() };
  } catch (error) {
    return outcomeFromError(error);
  }
}

export type WriteState<T> =
  | { phase: "idle" }
  | { phase: "pending" }
  | { phase: "ok"; value: T }
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
 */
export function useWrite<P extends { idempotencyKey: string }, T>({ action, run, check, onOk, onRejected }: UseWriteOptions<P, T>) {
  const [state, setState] = useState<WriteState<T>>({ phase: "idle" });
  const last = useRef<P | null>(null);
  const busy = useRef(false);

  const send = useCallback(async (payload: P) => {
    if (busy.current) return;
    busy.current = true;
    last.current = payload;
    setState({ phase: "pending" });
    let outcome: WriteOutcome<T>;
    try {
      outcome = await run(payload);
    } catch {
      outcome = { status: "unknown" };
    }
    busy.current = false;
    if (outcome.status === "ok") {
      setState({ phase: "ok", value: outcome.value });
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
    setState({ phase: "unknown", checking: true, notFound: false });
    let result: WriteStatusOutcome<T> | null = null;
    try {
      result = await check({ action, idempotencyKey: payload.idempotencyKey });
    } catch {
      result = null;
    }
    busy.current = false;
    if (result?.state === "completed") {
      setState({ phase: "ok", value: result.value });
      onOk?.(result.value, payload);
    } else {
      // `not_found` dice que todavía no consta; un fallo al comprobar deja el estado desconocido como estaba.
      setState({ phase: "unknown", checking: false, notFound: result?.state === "not_found" });
    }
  }, [action, check, onOk]);

  const reset = useCallback(() => {
    last.current = null;
    busy.current = false;
    setState({ phase: "idle" });
  }, []);

  return { state, locked, pending: state.phase === "pending" || (state.phase === "unknown" && state.checking), submit, retry, checkStatus, reset };
}
