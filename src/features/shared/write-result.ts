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
  | "alreadyDeleted" | "notFound" | "invalidSplit" | "coupleNotActive" | "moveNotAllowed" | "undoNotAvailable"
  // PR D (T062): liquidaciones (contracts/errors.md, JT106, JT107, JT112–JT114).
  | "nothingToSettle" | "exceedsPending" | "settlementDate" | "alreadyVoided"
  // 004 PR B (T034): presupuestos (contracts/errors.md, JT218, JT219, JT221).
  | "budgetExists"
  // 004 PR C (T046, T047): metas, aportes, retiros y anulaciones (contracts/errors.md, JT201–JT217, JT225).
  | "goalNotFound" | "goalNotOpen" | "insufficientFunds" | "entryNotFound" | "entryAlreadyVoided" | "entryNotVoidable" | "entryDate"
  | "goalTransition" | "invalidGoal" | "reasonRequired" | "goalUndoNotAvailable";
/** 004 PR C: `detail` lleva lo que el servidor dijo del rechazo (JT204: el disponible vigente, en unidades menores). */
export type WriteRejectionDetail = { availableMinor?: string };
export type WriteOutcome<T> = { status: "ok"; value: T } | { status: "rejected"; error: WriteError; detail?: WriteRejectionDetail } | { status: "unknown" };
/**
 * Lo que devuelve «Comprobar estado», ya normalizado por la Server Action. `error`: no se pudo comprobar (red); el
 * estado sigue desconocido, sin decir que no consta.
 */
export type WriteStatusOutcome<T> = { state: "completed"; value: T } | { state: "not_found" } | { state: "error" };
/** Acciones de `idempotency_records` que el PR B consulta con `write_status`. El PR C añade las suyas. */
export type WriteAction = "create_invitation" | "regenerate_invitation" | "cancel_invitation" | "accept_invitation"
  | "create_shared_expense" | "update_shared_expense" | "void_shared_expense" | "reclassify_to_shared" | "undo_reclassify_to_shared"
  | "register_settlement" | "void_settlement"
  // 004 PR B (T034): crear, editar y desactivar presupuesto (contracts/server-actions.md §1).
  | "create_budget" | "update_budget"
  // 004 PR C (T046, T047): las escrituras de metas que «Comprobar estado» consulta.
  | "create_goal" | "update_goal" | "complete_goal" | "archive_goal" | "contribute_to_goal" | "withdraw_from_goal" | "void_goal_entry";
/** T045: las escrituras del PR C que «Comprobar estado» consulta (las de `idempotency_records`). */
export const SHARED_WRITE_ACTIONS = ["create_shared_expense", "update_shared_expense", "void_shared_expense", "reclassify_to_shared", "undo_reclassify_to_shared"] as const satisfies readonly WriteAction[];

const UNKNOWN: ReadonlySet<DbErrorKind> = new Set(["network", "retryable", "retryExhausted", "unexpected"]);
const REJECTED: Partial<Record<DbErrorKind, WriteError>> = {
  alreadyInCouple: "alreadyInCouple",
  invitationNotFound: "invitationGone",
  invitationAlreadyAccepted: "alreadyAccepted",
  invitationInvalid: "invalid",
  invalidEmail: "invalidEmail",
  versionConflict: "versionConflict",
  notAuthenticated: "sessionExpired",
  // T045 (PR C): gasto compartido y Mover a Pareja (contracts/errors.md).
  transactionVoided: "alreadyDeleted",
  transactionNotFound: "notFound",
  invalidSplit: "invalidSplit",
  invalidSplitMode: "invalidSplit",
  notCoupleMember: "invalidSplit",
  coupleNotActive: "coupleNotActive",
  moveNotAllowed: "moveNotAllowed",
  moveFundedByGoal: "moveNotAllowed",
  undoNotAvailable: "undoNotAvailable",
  invalidAmount: "invalid",
  amountOutOfRange: "invalid",
  invalidCategory: "invalid",
  invalidDate: "invalid",
  descriptionTooLong: "invalid",
  // PR D (T062): liquidaciones. Una liquidación inexistente o de otra pareja y una ya anulada son rechazos confirmados.
  nothingToSettle: "nothingToSettle",
  settlementExceedsPending: "exceedsPending",
  invalidSettlementDate: "settlementDate",
  settlementNotFound: "notFound",
  settlementVoided: "alreadyVoided",
  // 004 PR B (T034): presupuestos. Uno inexistente o no visible, uno que ya existe para esa clave (incluye perder la carrera
  // de creación) y un límite no válido son rechazos confirmados; JT011 ya es versionConflict.
  budgetNotFound: "notFound",
  budgetAlreadyExists: "budgetExists",
  invalidBudget: "invalid",
  // 004 PR C (T046, T047): metas. Un saldo que no alcanza (JT204 o el trigger JT220) es el mismo rechazo para la interfaz.
  goalNotFound: "goalNotFound",
  goalNotOpen: "goalNotOpen",
  insufficientMemberFunds: "insufficientFunds",
  goalNegative: "insufficientFunds",
  entryNotFound: "entryNotFound",
  entryAlreadyVoided: "entryAlreadyVoided",
  entryNotVoidable: "entryNotVoidable",
  invalidEntryDate: "entryDate",
  goalTransitionNotAllowed: "goalTransition",
  invalidGoal: "invalidGoal",
  withdrawalReasonRequired: "reasonRequired",
  goalUndoNotAvailable: "goalUndoNotAvailable",
};

/**
 * En el servidor: un error de `src/lib/db` → `rejected` o `unknown`. `unexpected` de `mapDbError` es un código que no
 * es `JT` ni Postgres conocido (un 5xx sin código): desconocido. Un `JT` sin copy propia (JT008, JT009, JT109, JT119) es
 * un rechazo confirmado que la interfaz dice como «algo salió mal».
 */
export function outcomeFromError(error: unknown): { status: "rejected"; error: WriteError; detail?: WriteRejectionDetail } | { status: "unknown" } {
  const mapped = error instanceof DbError ? error : mapDbError(error);
  if (UNKNOWN.has(mapped.kind)) return { status: "unknown" };
  return mapped.detail ? { status: "rejected", error: REJECTED[mapped.kind] ?? "unexpected", detail: mapped.detail } : { status: "rejected", error: REJECTED[mapped.kind] ?? "unexpected" };
}

/** En el servidor: ejecuta la escritura y la clasifica. */
export async function runWrite<T>(write: () => Promise<T>): Promise<WriteOutcome<T>> {
  try {
    return { status: "ok", value: await write() };
  } catch (error) {
    return outcomeFromError(error);
  }
}

