"use server";
// T045–T047, T050 (spec 003, PR C) / FR-018–FR-024, FR-031–FR-036, FR-056–FR-059; contracts/server-actions.md §1 y §2;
// contracts/database.md. Escrituras de gasto compartido y de Mover a Pareja por las funciones de entrada de src/lib/db, con
// el cliente de la petición y nunca con la clave secreta (FR-008). Cada una devuelve los tres resultados del módulo común
// (`ok`, `rejected` con su error de dominio, `unknown`); la clave de idempotencia la trae el navegador y src/lib/db
// reintenta 40P01/40001 con ella. «Comprobar estado» lee `write_status` y no reejecuta nada. Tras escribir,
// `revalidatePath` del layout: la misma respuesta trae Inicio y Actividad con el total, la fila y el saldo nuevos (E5).
import { revalidatePath } from "next/cache";
import { moneyFromPesos } from "@/domain/money";
import { runWrite, type WriteOutcome, type WriteStatusOutcome } from "@/features/shared/write-result";
import { DbError } from "@/lib/db/errors";
import { listCoupleMembers } from "@/lib/db/couple";
import { getCoupleBalance, getCoupleMonthSummary, getMeMonthSummary } from "@/lib/db/couple-reads";
import { reclassifyToShared, undoReclassifyToShared } from "@/lib/db/reclassify";
import { createSharedExpense, sharedTransaction, updateSharedExpense, voidSharedExpense } from "@/lib/db/shared-expenses";
import { getTransaction } from "@/lib/db/transactions";
import type { SettlementTransport, SharedExpenseTransport } from "@/lib/db/types";
import { savedFromTransport } from "@/features/balance/saved";
import { writeStatus } from "@/lib/db/write-status";
import { createClient } from "@/lib/supabase/server";
import { allocationsFor, parseReclassify, parseSharedCreate, parseSharedUpdate, parseSharedVoid, parseUndoReclassify, toSavedShared } from "./shared-payload";
import type { MovePreviewBase, MoveResult, SavedShared } from "./shared-types";

const refresh = () => revalidatePath("/", "layout");
const INVALID = { status: "rejected", error: "invalid" } as const;

async function sharedArgs(client: Awaited<ReturnType<typeof createClient>>, payload: NonNullable<ReturnType<typeof parseSharedCreate>>) {
  const members = await listCoupleMembers(client);
  const amount = moneyFromPesos(BigInt(payload.amountPesos));
  const split = allocationsFor(amount, payload, members);
  if (!split || !members.some((member) => member.user_id === payload.payerUserId)) throw new DbError("invalidSplit");
  return { amount, categoryId: payload.categoryId, transactionDate: payload.transactionDate, description: payload.description, payerUserId: payload.payerUserId, ...split };
}

export async function createSharedExpenseAction(input: unknown): Promise<WriteOutcome<SavedShared>> {
  const payload = parseSharedCreate(input);
  if (!payload) return INVALID;
  const outcome = await runWrite(async () => {
    const client = await createClient();
    return toSavedShared(await createSharedExpense(client, { idempotencyKey: payload.idempotencyKey, ...(await sharedArgs(client, payload)) }));
  });
  if (outcome.status === "ok") refresh();
  return outcome;
}

export async function updateSharedExpenseAction(input: unknown): Promise<WriteOutcome<SavedShared>> {
  const payload = parseSharedUpdate(input);
  if (!payload) return INVALID;
  const outcome = await runWrite(async () => {
    const client = await createClient();
    return toSavedShared(await updateSharedExpense(client, { idempotencyKey: payload.idempotencyKey, transactionId: payload.transactionId, expectedVersion: payload.expectedVersion, ...(await sharedArgs(client, payload)) }));
  });
  if (outcome.status === "ok") refresh();
  return outcome;
}

export async function voidSharedExpenseAction(input: unknown): Promise<WriteOutcome<{ id: string; version: number }>> {
  const payload = parseSharedVoid(input);
  if (!payload) return INVALID;
  const outcome = await runWrite(async () => {
    const result = await voidSharedExpense(await createClient(), payload);
    return { id: result.id, version: result.version };
  });
  if (outcome.status === "ok") refresh();
  return outcome;
}

export async function reclassifyAction(input: unknown): Promise<WriteOutcome<MoveResult>> {
  const payload = parseReclassify(input);
  if (!payload) return INVALID;
  const outcome = await runWrite(async () => {
    const client = await createClient();
    const [members, original] = await Promise.all([listCoupleMembers(client), getTransaction(client, payload.transactionId)]);
    const split = allocationsFor(original.amount, payload, members);
    if (!split) throw new DbError("invalidSplit");
    const result = await reclassifyToShared(client, { idempotencyKey: payload.idempotencyKey, transactionId: payload.transactionId, expectedVersion: payload.expectedVersion, ...split });
    return { voidedPrivateId: result.voided_private_id, shared: toSavedShared(result.shared) };
  });
  if (outcome.status === "ok") refresh();
  return outcome;
}

export async function undoReclassifyAction(input: unknown): Promise<WriteOutcome<{ restoredPrivateId: string }>> {
  const payload = parseUndoReclassify(input);
  if (!payload) return INVALID;
  const outcome = await runWrite(async () => ({ restoredPrivateId: (await undoReclassifyToShared(await createClient(), payload)).restored_private_id }));
  if (outcome.status === "ok") refresh();
  return outcome;
}

// PR D (T062): también las liquidaciones; «Comprobar estado» devuelve lo mismo que el reintento.
const ACTIONS = ["create_shared_expense", "update_shared_expense", "void_shared_expense", "reclassify_to_shared", "undo_reclassify_to_shared", "register_settlement", "void_settlement"] as const;
type Action = (typeof ACTIONS)[number];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * «Comprobar estado» (contracts/database.md, «Estado de una escritura»): `completed` con el mismo resultado que habría
 * devuelto el reintento, ya traducido a lo que la interfaz usa; `not_found` si todavía no consta; `error` si no se pudo
 * comprobar (el estado sigue desconocido).
 */
export async function sharedWriteStatusAction(input: unknown): Promise<WriteStatusOutcome<unknown>> {
  if (typeof input !== "object" || input === null) return { state: "error" };
  const { action, idempotencyKey } = input as { action?: unknown; idempotencyKey?: unknown };
  if (typeof action !== "string" || !ACTIONS.includes(action as Action) || typeof idempotencyKey !== "string" || !UUID.test(idempotencyKey)) return { state: "error" };
  try {
    const status = await writeStatus(await createClient(), action, idempotencyKey);
    if (status.state === "not_found") return { state: "not_found" };
    const result = status.result as Record<string, unknown>;
    switch (action as Action) {
      case "create_shared_expense": case "update_shared_expense":
        return { state: "completed", value: toSavedShared(sharedTransaction(result as unknown as SharedExpenseTransport)) };
      case "register_settlement":
        return { state: "completed", value: savedFromTransport(result as unknown as SettlementTransport) };
      case "void_settlement":
      case "void_shared_expense":
        return { state: "completed", value: { id: String(result.id), version: Number(result.version) } };
      case "reclassify_to_shared":
        return { state: "completed", value: { voidedPrivateId: String(result.voided_private_id), shared: toSavedShared(sharedTransaction(result.shared as SharedExpenseTransport)) } satisfies MoveResult };
      case "undo_reclassify_to_shared":
        return { state: "completed", value: { restoredPrivateId: String(result.restored_private_id) } };
    }
  } catch {
    return { state: "error" };
  }
}

/**
 * ChangePreview (A3; decisión 20.3, FR-041): las cifras de antes del mes del gasto, solo de quien mira: sus privados y su
 * parte (`me_month_summary`), el gasto de Nosotros (`couple_month_summary`) y el saldo (`couple_balance`). Se leen al
 * pedir la vista previa, nunca con la página de Yo (contracts/server-actions.md §4).
 */
export async function previewMoveAction(input: unknown): Promise<{ ok: true; value: MovePreviewBase } | { ok: false }> {
  if (typeof input !== "object" || input === null || !UUID.test(String((input as { transactionId?: unknown }).transactionId))) return { ok: false };
  try {
    const client = await createClient();
    const original = await getTransaction(client, String((input as { transactionId: string }).transactionId));
    const month = original.transactionDate.slice(0, 7);
    const [me, couple, balance] = await Promise.all([getMeMonthSummary(client, month), getCoupleMonthSummary(client, month), getCoupleBalance(client)]);
    return {
      ok: true,
      value: {
        month, privateMinor: me.privateTotal.amountMinor.toString(), sharedPartMinor: me.sharedPart.amountMinor.toString(), coupleTotalMinor: (couple?.total.amountMinor ?? 0n).toString(),
        balance: balance.map((row) => ({ userId: row.userId, netMinor: row.net.amountMinor.toString() })),
      },
    };
  } catch {
    return { ok: false };
  }
}
