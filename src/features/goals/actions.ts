"use server";
// 004 PR C (T046, T047) / FR-030–FR-033, FR-040–FR-042, FR-090–FR-094; contracts/server-actions.md §1. Las escrituras de
// metas por las funciones de entrada de src/lib/db, con el cliente de la petición y nunca con la clave secreta (FR-006).
// Cada una devuelve `ok`, `rejected` con su error de dominio o `unknown` (write-result.ts); la clave de idempotencia la trae
// el navegador (nace al abrir la hoja) y src/lib/db reintenta 40P01/40001 con ella. El navegador manda solo lo que la
// persona decide —importe escrito, meta, fecha, modo, motivo—; el aportante es siempre quien llama (DEC-G06) y el saldo, el
// disponible y la ventana de 60 s del deshacer los decide la función SQL (FR-090). Tras escribir, `revalidatePath` del
// layout: la misma respuesta trae Metas, Inicio y Actividad con lo nuevo.
import { revalidatePath } from "next/cache";
import { moneyFromPesos } from "@/domain/money";
import { runWrite, type WriteOutcome, type WriteStatusOutcome } from "@/features/shared/write-result";
import { archiveGoal, completeGoal, contributeToGoal, createGoal, updateGoal, voidGoalEntry, withdrawFromGoal, type EntryResult } from "@/lib/db/goals";
import type { GoalResult } from "@/lib/db/types";
import { writeStatus } from "@/lib/db/write-status";
import { createClient } from "@/lib/supabase/server";
import { GOAL_TYPES, type ContributePayload, type CreateGoalPayload, type GoalFormPayload, type GoalStatusPayload, type SavedEntry, type SavedGoal, type SavedGoalStatus, type UpdateGoalPayload, type VoidEntryPayload, type WithdrawPayload } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const MONTH = /^[0-9]{4}-(0[1-9]|1[0-2])-01$/;
const PESOS = /^[1-9][0-9]{0,8}$/;
const INVALID = { status: "rejected", error: "invalid" } as const;
const refresh = () => revalidatePath("/", "layout");
const record = (input: unknown) => (typeof input === "object" && input !== null ? (input as Record<string, unknown>) : null);
const isKey = (value: unknown): value is string => typeof value === "string" && UUID.test(value);
const isVersion = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1;

function parseForm(input: Record<string, unknown>): GoalFormPayload | null {
  const { idempotencyKey, name, goalType, targetPesos, targetMonth } = input;
  if (!isKey(idempotencyKey) || typeof name !== "string" || name.trim() === "" || name.trim().length > 60) return null;
  if (typeof goalType !== "string" || !(GOAL_TYPES as readonly string[]).includes(goalType)) return null;
  if (typeof targetPesos !== "string" || !PESOS.test(targetPesos)) return null;
  if (targetMonth !== null && (typeof targetMonth !== "string" || !MONTH.test(targetMonth))) return null;
  return { idempotencyKey, name: name.trim(), goalType: goalType as GoalFormPayload["goalType"], targetPesos, targetMonth };
}

const toSavedGoal = (row: GoalResult): SavedGoal => ({ id: row.id, name: row.name, goalType: row.goal_type, targetMinor: row.target_minor, targetMonth: row.target_month, status: row.status, version: row.version });
const toSavedEntry = (row: EntryResult): SavedEntry => ({ id: row.id, goalId: row.goal_id, amountMinor: row.amount_minor, availableMinor: row.available_minor });
const form = (payload: GoalFormPayload) => ({ idempotencyKey: payload.idempotencyKey, name: payload.name, goalType: payload.goalType, target: moneyFromPesos(BigInt(payload.targetPesos)), targetMonth: payload.targetMonth });

async function written<T>(write: () => Promise<T>): Promise<WriteOutcome<T>> {
  const outcome = await runWrite(write);
  if (outcome.status === "ok") refresh();
  return outcome;
}

export async function createGoalAction(input: unknown): Promise<WriteOutcome<SavedGoal>> {
  const raw = record(input);
  const payload = raw ? parseForm(raw) : null;
  if (!raw || !payload || (raw.context !== "me" && raw.context !== "us")) return INVALID;
  const context = raw.context as CreateGoalPayload["context"];
  return written(async () => toSavedGoal(await createGoal(await createClient(), { ...form(payload), context })));
}

export async function updateGoalAction(input: unknown): Promise<WriteOutcome<SavedGoal>> {
  const raw = record(input);
  const payload = raw ? parseForm(raw) : null;
  if (!raw || !payload || !isKey(raw.goalId) || !isVersion(raw.expectedVersion)) return INVALID;
  const { goalId, expectedVersion } = raw as Pick<UpdateGoalPayload, "goalId" | "expectedVersion">;
  return written(async () => toSavedGoal(await updateGoal(await createClient(), { ...form(payload), goalId, expectedVersion })));
}

function parseStatus(input: unknown): GoalStatusPayload | null {
  const raw = record(input);
  if (!raw || !isKey(raw.idempotencyKey) || !isKey(raw.goalId) || !isVersion(raw.expectedVersion)) return null;
  return { idempotencyKey: raw.idempotencyKey, goalId: raw.goalId, expectedVersion: raw.expectedVersion };
}

export async function completeGoalAction(input: unknown): Promise<WriteOutcome<SavedGoalStatus>> {
  const payload = parseStatus(input);
  if (!payload) return INVALID;
  return written(async () => { const row = await completeGoal(await createClient(), payload); return { id: row.id, status: row.status, version: row.version }; });
}

export async function archiveGoalAction(input: unknown): Promise<WriteOutcome<SavedGoalStatus>> {
  const payload = parseStatus(input);
  if (!payload) return INVALID;
  return written(async () => { const row = await archiveGoal(await createClient(), payload); return { id: row.id, status: row.status, version: row.version }; });
}

function parseEntry(input: unknown) {
  const raw = record(input);
  if (!raw || !isKey(raw.idempotencyKey) || !isKey(raw.goalId)) return null;
  if (typeof raw.amountPesos !== "string" || !PESOS.test(raw.amountPesos) || typeof raw.entryDate !== "string" || !DATE.test(raw.entryDate)) return null;
  return { raw, base: { idempotencyKey: raw.idempotencyKey, goalId: raw.goalId, amount: moneyFromPesos(BigInt(raw.amountPesos)), entryDate: raw.entryDate } };
}

export async function contributeAction(input: unknown): Promise<WriteOutcome<SavedEntry>> {
  const parsed = parseEntry(input);
  const mode = parsed?.raw.fundingMode;
  if (!parsed || (mode !== "reserved" && mode !== "transferred_declared")) return INVALID;
  return written(async () => toSavedEntry(await contributeToGoal(await createClient(), { ...parsed.base, fundingMode: mode as ContributePayload["fundingMode"] })));
}

export async function withdrawAction(input: unknown): Promise<WriteOutcome<SavedEntry>> {
  const parsed = parseEntry(input);
  const reason = parsed?.raw.reason;
  if (!parsed || typeof reason !== "string" || reason.trim() === "" || reason.trim().length > 140) return INVALID;
  return written(async () => toSavedEntry(await withdrawFromGoal(await createClient(), { ...parsed.base, reason: (reason as WithdrawPayload["reason"]).trim() })));
}

export async function voidGoalEntryAction(input: unknown): Promise<WriteOutcome<{ entryId: string }>> {
  const raw = record(input);
  if (!raw || !isKey(raw.idempotencyKey) || !isKey(raw.entryId) || (raw.reason !== "undo" && raw.reason !== "void")) return INVALID;
  const payload = raw as VoidEntryPayload;
  return written(async () => ({ entryId: (await voidGoalEntry(await createClient(), payload)).entry_id }));
}

const ACTIONS = ["create_goal", "update_goal", "complete_goal", "archive_goal", "contribute_to_goal", "withdraw_from_goal", "void_goal_entry"] as const;

/** «Comprobar estado» (FR-093): lee `write_status` de la propia intención; nunca la repite. */
export async function goalWriteStatusAction(input: unknown): Promise<WriteStatusOutcome<unknown>> {
  const raw = record(input);
  if (!raw || typeof raw.action !== "string" || !(ACTIONS as readonly string[]).includes(raw.action) || !isKey(raw.idempotencyKey)) return { state: "error" };
  try {
    const status = await writeStatus(await createClient(), raw.action, raw.idempotencyKey);
    if (status.state === "not_found") return { state: "not_found" };
    const result = status.result as Record<string, unknown>;
    switch (raw.action as (typeof ACTIONS)[number]) {
      case "create_goal": case "update_goal": return { state: "completed", value: toSavedGoal(result as unknown as GoalResult) };
      case "complete_goal": case "archive_goal": return { state: "completed", value: { id: String(result.id), status: result.status, version: Number(result.version) } };
      case "contribute_to_goal": case "withdraw_from_goal": return { state: "completed", value: toSavedEntry(result as unknown as EntryResult) };
      case "void_goal_entry": return { state: "completed", value: { entryId: String(result.entry_id) } };
    }
  } catch {
    return { state: "error" };
  }
}
