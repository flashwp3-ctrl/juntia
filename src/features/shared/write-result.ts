// T031b / FR-056, FR-059; contracts/server-actions.md §1; contracts/errors.md, «Rechazo confirmado frente a resultado
// desconocido»; interpretación I2 (nace completa en el PR B con las cuatro escrituras de invitación; el PR C la amplía).
// Tres resultados que la interfaz nunca trata igual:
// - `ok`: la función respondió con éxito.
// - `rejected`: la función respondió con un `JTnnn` (o el servidor rechazó antes de escribir): no se escribió nada.
// - `unknown`: red, tiempo agotado, respuesta perdida, 5xx sin `JT` o `40P01`/`40001` agotados. Nunca se afirma que no
//   se escribió: la intención queda bloqueada, «Reintentar» repite lo mismo con la misma clave y «Comprobar estado» lee
//   `write_status`, que no reejecuta nada.
// Este módulo lo importan las Server Actions: sin React. El hook del cliente vive en use-write.ts.
import { DbError, mapDbError, type DbErrorKind } from "@/lib/db/errors";

/** Errores de dominio que la interfaz sabe decir (contracts/errors.md); el resto cae en `unexpected`. */
export type WriteError =
  | "alreadyInCouple" | "invitationGone" | "alreadyAccepted" | "invalid" | "invalidEmail" | "versionConflict"
  | "sessionExpired" | "unexpected"
  // PR C (T045): gasto compartido y Mover a Pareja.
  | "alreadyDeleted" | "notFound" | "invalidSplit" | "coupleNotActive" | "moveNotAllowed" | "undoNotAvailable";
export type WriteOutcome<T> = { status: "ok"; value: T } | { status: "rejected"; error: WriteError } | { status: "unknown" };
/**
 * Lo que devuelve «Comprobar estado», ya normalizado por la Server Action. `error`: no se pudo comprobar (red); el
 * estado sigue desconocido, sin decir que no consta.
 */
export type WriteStatusOutcome<T> = { state: "completed"; value: T } | { state: "not_found" } | { state: "error" };
/** Acciones de `idempotency_records` que el PR B consulta con `write_status`. El PR C añade las suyas. */
export type WriteAction = "create_invitation" | "regenerate_invitation" | "cancel_invitation" | "accept_invitation"
  | "create_shared_expense" | "update_shared_expense" | "void_shared_expense" | "reclassify_to_shared" | "undo_reclassify_to_shared";
/** Andamio de T045: la lista se completa con la implementación. */
export const SHARED_WRITE_ACTIONS: readonly WriteAction[] = [];

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

