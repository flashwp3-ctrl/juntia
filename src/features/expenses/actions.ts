"use server";
// T081, T082 / FR-006, FR-008, FR-016–FR-018, FR-034, FR-036; contracts/errors.md. Escrituras de Anotar, editar, eliminar
// y «Deshacer» por las funciones de entrada de src/lib/db, con el cliente de la petición, nunca con la clave secreta (FR-011).
// Lo que llega del navegador se comprueba antes (payload.ts); la función SQL vuelve a validar todo. La clave de
// idempotencia la trae el cliente y src/lib/db reintenta 40P01/40001 con ella. Tras escribir, `revalidatePath` del
// layout: la misma respuesta trae Inicio, Actividad y el detalle con el total y la fila nuevos (E5).
import { revalidatePath } from "next/cache";
import { DbError, mapDbError } from "@/lib/db/errors";
import { createTransaction, updateTransaction, voidTransaction } from "@/lib/db/transactions";
import { createClient } from "@/lib/supabase/server";
import { toSavedTransaction as saved } from "./saved";
import { parseCreatePayload, parseUpdatePayload, parseVoidPayload } from "./payload";
import type { ActionResult, ExpenseActionError, SavedTransaction, VoidedTransaction } from "./types";
import { runWrite, type WriteOutcome, type WriteStatusOutcome } from "@/features/shared/write-result";
import { writeStatus } from "@/lib/db/write-status";
import type { ReactivatedGoal, TransactionTransport } from "@/lib/db/types";

/**
 * contracts/errors.md: el código técnico nunca llega a la pantalla; cada uno cae en lo que la interfaz dice. No se
 * exporta: en un archivo `use server` cada export es un punto de entrada que el navegador puede llamar.
 */
function toActionError(error: unknown): ExpenseActionError {
  const kind = (error instanceof DbError ? error : mapDbError(error)).kind;
  switch (kind) {
    case "notAuthenticated": return "sessionExpired";
    case "versionConflict": return "versionConflict";
    case "transactionVoided": return "alreadyDeleted";
    case "transactionNotFound": return "notFound";
    case "network": return "network";
    case "retryable": case "retryExhausted": return "saveFailed";
    case "amountBelowGoalUsage": return "belowGoalUsage";
    case "invalidAmount": case "amountOutOfRange": case "invalidCategory": case "invalidDate": case "descriptionTooLong": return "invalid";
    case "idempotencyKeyReused": case "invalidIdempotencyKey":
      // Indica un bug del cliente: se registra sin datos de la persona (contracts/errors.md, JT008/JT009).
      console.error(`expenses: ${kind}`);
      return "unexpected";
    default: return "unexpected";
  }
}

const refresh = () => revalidatePath("/", "layout");

export async function createTransactionAction(input: unknown): Promise<ActionResult<SavedTransaction>> {
  const payload = parseCreatePayload(input);
  if (!payload) return { ok: false, error: "invalid" };
  try {
    const transaction = await createTransaction(await createClient(), payload);
    refresh();
    return { ok: true, value: saved(transaction) };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// 004 PR D (F69-1, revisión de ChatGPT del PR #69): editar y eliminar un movimiento privado siguen el contrato común de
// escrituras (contracts/server-actions.md §1 de la 003; FR-093): `ok`, `rejected` con su error de dominio o `unknown`
// (red, respuesta perdida, 5xx), y «Comprobar estado» por `write_status` con `update_transaction` y `void_transaction`,
// que la 002 ya guarda en `idempotency_records`. Vale para todo movimiento privado, con o sin meta. La creación (la ruta
// mínima de Anotar, spec 2) conserva su contrato.
const INVALID = { status: "rejected", error: "invalid" } as const;
const reactivatedOf = (rows: readonly ReactivatedGoal[] | undefined) => (rows ?? []).map((goal) => ({ goalId: goal.goal_id, name: goal.name, returnedMinor: goal.returned_minor }));
const voidedOf = (result: { id: string; version: number; reactivated_goals?: ReactivatedGoal[] }): VoidedTransaction => ({ id: result.id, version: result.version, reactivatedGoals: reactivatedOf(result.reactivated_goals) });
const savedOfTransport = (row: TransactionTransport): SavedTransaction => ({ id: row.id, type: row.type, categoryId: row.category_id, transactionDate: row.transaction_date, description: row.description, amountMinor: row.amount_minor, version: row.version });

export async function updateTransactionAction(input: unknown): Promise<WriteOutcome<SavedTransaction>> {
  const payload = parseUpdatePayload(input);
  if (!payload) return INVALID;
  const outcome = await runWrite(async () => saved(await updateTransaction(await createClient(), payload)));
  if (outcome.status === "ok") refresh();
  return outcome;
}

export async function voidTransactionAction(input: unknown): Promise<WriteOutcome<VoidedTransaction>> {
  const payload = parseVoidPayload(input);
  if (!payload) return INVALID;
  // F64-1: las metas archivadas que volvieron a estar activas al devolverles los fondos.
  const outcome = await runWrite(async () => voidedOf(await voidTransaction(await createClient(), payload)));
  if (outcome.status === "ok") refresh();
  return outcome;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** «Comprobar estado» de editar o eliminar un privado: el mismo resultado que daría el reintento, sin repetir nada. */
export async function privateWriteStatusAction(input: unknown): Promise<WriteStatusOutcome<unknown>> {
  if (typeof input !== "object" || input === null) return { state: "error" };
  const { action, idempotencyKey } = input as { action?: unknown; idempotencyKey?: unknown };
  if ((action !== "update_transaction" && action !== "void_transaction") || typeof idempotencyKey !== "string" || !UUID.test(idempotencyKey)) return { state: "error" };
  try {
    const status = await writeStatus(await createClient(), action, idempotencyKey);
    if (status.state === "not_found") return { state: "not_found" };
    const result = status.result as Record<string, unknown>;
    return action === "update_transaction"
      ? { state: "completed", value: savedOfTransport(result as unknown as TransactionTransport) }
      : { state: "completed", value: voidedOf(result as unknown as { id: string; version: number; reactivated_goals?: ReactivatedGoal[] }) };
  } catch {
    return { state: "error" };
  }
}
