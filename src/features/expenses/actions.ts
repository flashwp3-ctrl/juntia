"use server";
// T081, T082 / FR-006, FR-008, FR-016–FR-018, FR-034, FR-036; contracts/errors.md. Escrituras de Anotar, editar, eliminar
// y «Deshacer» por las funciones de entrada de src/lib/db, con el cliente de la petición (sin `service_role`, FR-011).
// Lo que llega del navegador se comprueba antes (payload.ts); la función SQL vuelve a validar todo. La clave de
// idempotencia la trae el cliente y src/lib/db reintenta 40P01/40001 con ella. Tras escribir, `revalidatePath` del
// layout: la misma respuesta trae Inicio, Actividad y el detalle con el total y la fila nuevos (E5).
import { revalidatePath } from "next/cache";
import { DbError, mapDbError } from "@/lib/db/errors";
import { createTransaction, updateTransaction, voidTransaction } from "@/lib/db/transactions";
import { createClient } from "@/lib/supabase/server";
import { toSavedTransaction as saved } from "./saved";
import { parseCreatePayload, parseUpdatePayload, parseVoidPayload } from "./payload";
import type { ActionResult, ExpenseActionError, SavedTransaction } from "./types";

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

export async function updateTransactionAction(input: unknown): Promise<ActionResult<SavedTransaction>> {
  const payload = parseUpdatePayload(input);
  if (!payload) return { ok: false, error: "invalid" };
  try {
    const transaction = await updateTransaction(await createClient(), payload);
    refresh();
    return { ok: true, value: saved(transaction) };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function voidTransactionAction(input: unknown): Promise<ActionResult<{ id: string; version: number }>> {
  const payload = parseVoidPayload(input);
  if (!payload) return { ok: false, error: "invalid" };
  try {
    const result = await voidTransaction(await createClient(), payload);
    refresh();
    return { ok: true, value: { id: result.id, version: result.version } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
