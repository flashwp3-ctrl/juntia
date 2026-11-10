"use server";
// 004 PR D (T060–T063) / FR-050–FR-059, FR-085, FR-090–FR-094; contracts/server-actions.md §1, §4 y §7. Las escrituras y la
// lectura de B1 del gasto con meta, por las funciones de entrada de src/lib/db, con el cliente de la petición y nunca con la
// clave secreta (FR-006). Cada escritura devuelve `ok`, `rejected` con su error de dominio o `unknown`; la clave de
// idempotencia la trae el navegador (nace al abrir la hoja o el diálogo) y src/lib/db reintenta 40P01/40001 con ella. El
// navegador manda solo lo que la persona decide: el gasto, la meta, el uso y cuánto de cada aportante. Las partes del reparto
// las calcula esta acción (como en la 003) y la función SQL revalida saldos, disponibles y que el uso no supere el gasto
// (FR-090). B1 (`loadFundingGoalsAction`) lee en Nosotros solo `goal_scope = 'shared'` y en Yo solo `personal`: nunca pide una
// meta personal para pintarla deshabilitada (F63-3; FR-085).
import { revalidatePath } from "next/cache";
import { moneyFromPesos } from "@/domain/money";
import { runWrite, type WriteOutcome, type WriteStatusOutcome } from "@/features/shared/write-result";
import { DbError } from "@/lib/db/errors";
import { listCoupleMembers } from "@/lib/db/couple";
import { approveUsageRequest, cancelUsageRequest, createExpenseWithGoal, rejectUsageRequest, removeGoalUsage, type FundedExpense } from "@/lib/db/goal-usage";
import { goalMemberBalancesFor, listGoalsByScope } from "@/lib/db/goals";
import { sharedTransaction, voidSharedExpense } from "@/lib/db/shared-expenses";
import { voidTransaction } from "@/lib/db/transactions";
import type { ReactivatedGoal, SharedExpenseTransport, TransactionTransport } from "@/lib/db/types";
import { writeStatus } from "@/lib/db/write-status";
import { createClient } from "@/lib/supabase/server";
import { isUuid, parseCreatePayload } from "../payload";
import { allocationsFor, parseSharedCreate, toSavedShared } from "../shared-payload";
import type { FundingGoal, FundingGoalsResult, ReactivatedGoalView, RemoveUsageResult, RequestResult, SavedGoalExpense, VoidedExpense } from "./types";

const refresh = () => revalidatePath("/", "layout");
const INVALID = { status: "rejected", error: "invalid" } as const;
const FUNDS = /^(0|[1-9][0-9]{0,8})$/;
const MAX_VERSION = 2_147_483_647;
const record = (input: unknown) => (typeof input === "object" && input !== null && !Array.isArray(input) ? (input as Record<string, unknown>) : null);
const isVersion = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_VERSION;


const toReactivated = (rows: readonly ReactivatedGoal[] | undefined): ReactivatedGoalView[] => (rows ?? []).map((row) => ({ goalId: row.goal_id, name: row.name, returnedMinor: row.returned_minor }));

/** B1: las metas abiertas del contexto de la hoja, con lo disponible de cada aportante. */
export async function loadFundingGoalsAction(input: unknown): Promise<FundingGoalsResult> {
  const raw = record(input);
  if (!raw || (raw.context !== "me" && raw.context !== "us")) return { ok: false };
  try {
    const client = await createClient();
    const rows = (await listGoalsByScope(client, raw.context === "us" ? "shared" : "personal")).filter((goal) => goal.status !== "archived");
    const balances = await goalMemberBalancesFor(client, rows.map(({ id }) => id));
    const goals: FundingGoal[] = rows
      .sort((a, b) => (a.created_at === b.created_at ? (a.id < b.id ? -1 : 1) : a.created_at < b.created_at ? -1 : 1))
      .map((row) => ({
        id: row.id, name: row.name, goalType: row.goal_type, status: row.status as FundingGoal["status"], version: row.version,
        balanceMinor: row.balance_minor, targetMinor: row.target_minor, progressPercent: Number(row.progress_percent),
        members: balances.filter((member) => member.goal_id === row.id && BigInt(member.available_minor) > 0n).map((member) => ({ userId: member.user_id, availableMinor: member.available_minor })),
      }));
    return { ok: true, goals };
  } catch {
    return { ok: false };
  }
}

function parseFunding(raw: Record<string, unknown>) {
  const { goalId, ownPesos, requestedPesos } = raw;
  if (!isUuid(goalId) || typeof ownPesos !== "string" || !FUNDS.test(ownPesos) || typeof requestedPesos !== "string" || !FUNDS.test(requestedPesos)) return null;
  if (BigInt(ownPesos) + BigInt(requestedPesos) <= 0n) return null;
  return { goalId, own: moneyFromPesos(BigInt(ownPesos)), requested: moneyFromPesos(BigInt(requestedPesos)) };
}

function savedFrom(context: "me" | "us", row: FundedExpense): SavedGoalExpense {
  if (context === "us") return { context, transaction: toSavedShared(sharedTransaction(row as unknown as SharedExpenseTransport)), goalId: row.goal_id, requestId: row.request_id };
  const transport = row as unknown as TransactionTransport;
  return {
    context, goalId: row.goal_id, requestId: null,
    transaction: { id: transport.id, type: transport.type, categoryId: transport.category_id, transactionDate: transport.transaction_date, description: transport.description, amountMinor: transport.amount_minor, version: transport.version },
  };
}

/** Registro inicial (FR-052): el gasto, el uso propio y la solicitud por los fondos del otro, en una operación atómica. */
export async function createExpenseWithGoalAction(input: unknown): Promise<WriteOutcome<SavedGoalExpense>> {
  const raw = record(input);
  const funding = raw ? parseFunding(raw) : null;
  if (!raw || !funding) return INVALID;
  if (raw.context === "us") {
    const payload = parseSharedCreate(raw);
    if (!payload) return INVALID;
    const outcome = await runWrite(async () => {
      const client = await createClient();
      const members = await listCoupleMembers(client);
      const amount = moneyFromPesos(BigInt(payload.amountPesos));
      const split = allocationsFor(amount, payload, members);
      if (!split || !members.some((member) => member.user_id === payload.payerUserId)) throw new DbError("invalidSplit");
      const row = await createExpenseWithGoal(client, {
        context: "us", idempotencyKey: payload.idempotencyKey, amount, categoryId: payload.categoryId, transactionDate: payload.transactionDate,
        description: payload.description, payerUserId: payload.payerUserId, ...split, ...funding,
      });
      return savedFrom("us", row);
    });
    if (outcome.status === "ok") refresh();
    return outcome;
  }
  // En Yo, una meta personal: todo el uso es propio y no hay solicitud (US-7.12; DEC-G06).
  if (raw.context !== "me" || funding.requested.amountMinor !== 0n) return INVALID;
  const draft = parseCreatePayload({ idempotencyKey: raw.idempotencyKey, type: "expense", amountPesos: raw.amountPesos, categoryId: raw.categoryId, transactionDate: raw.transactionDate, description: raw.description });
  if (!draft || draft.type !== "expense") return INVALID;
  const outcome = await runWrite(async () => savedFrom("me", await createExpenseWithGoal(await createClient(), { context: "me", ...draft, ...funding })));
  if (outcome.status === "ok") refresh();
  return outcome;
}

function parseRequest(input: unknown) {
  const raw = record(input);
  return raw && isUuid(raw.idempotencyKey) && isUuid(raw.requestId) && isVersion(raw.expectedVersion)
    ? { idempotencyKey: raw.idempotencyKey, requestId: raw.requestId, expectedVersion: raw.expectedVersion } : null;
}
const toRequestResult = (row: { request_id: string; status: RequestResult["status"] }): RequestResult => ({ requestId: row.request_id, status: row.status });

async function requestWrite(input: unknown, write: typeof approveUsageRequest): Promise<WriteOutcome<RequestResult>> {
  const payload = parseRequest(input);
  if (!payload) return INVALID;
  const outcome = await runWrite(async () => toRequestResult(await write(await createClient(), payload)));
  if (outcome.status === "ok") refresh();
  return outcome;
}
/** B5: aprobar (FR-054). Solo quien aporta los fondos; la función revalida todo con la versión leída. */
export async function approveUsageRequestAction(input: unknown) { return requestWrite(input, approveUsageRequest); }
/** B7: rechazar (FR-055). */
export async function rejectUsageRequestAction(input: unknown) { return requestWrite(input, rejectUsageRequest); }
/** B4: cancelar (FR-055). Solo quien pidió. */
export async function cancelUsageRequestAction(input: unknown) { return requestWrite(input, cancelUsageRequest); }

/** «Quitar el uso de la meta» (FR-057; Q17): con la versión del gasto; devuelve las metas que volvieron a estar activas. */
export async function removeGoalUsageAction(input: unknown): Promise<WriteOutcome<RemoveUsageResult>> {
  const raw = record(input);
  if (!raw || !isUuid(raw.idempotencyKey) || !isUuid(raw.transactionId) || !isVersion(raw.expectedVersion)) return INVALID;
  const payload = { idempotencyKey: raw.idempotencyKey, transactionId: raw.transactionId, expectedVersion: raw.expectedVersion };
  const outcome = await runWrite(async () => {
    const row = await removeGoalUsage(await createClient(), payload);
    return { transactionId: row.transaction_id, version: row.version, reactivatedGoals: toReactivated(row.reactivated_goals) };
  });
  if (outcome.status === "ok") refresh();
  return outcome;
}

/** FR-059: el «Deshacer» de 6 s de un gasto con meta (la función acepta 60 s y responde JT225 fuera de esa ventana). */
export async function undoGoalExpenseAction(input: unknown): Promise<WriteOutcome<VoidedExpense>> {
  const raw = record(input);
  if (!raw || (raw.context !== "me" && raw.context !== "us") || !isUuid(raw.idempotencyKey) || !isUuid(raw.transactionId) || !isVersion(raw.expectedVersion)) return INVALID;
  const payload = { idempotencyKey: raw.idempotencyKey, transactionId: raw.transactionId, expectedVersion: raw.expectedVersion, reason: "undo" as const };
  const outcome = await runWrite(async () => {
    const client = await createClient();
    const row = raw.context === "us" ? await voidSharedExpense(client, payload) : await voidTransaction(client, payload);
    return { id: row.id, version: row.version, reactivatedGoals: toReactivated(row.reactivated_goals) };
  });
  if (outcome.status === "ok") refresh();
  return outcome;
}

const ACTIONS = ["create_expense_with_goal", "approve_usage_request", "reject_usage_request", "cancel_usage_request", "remove_goal_usage", "void_transaction", "void_shared_expense"] as const;
type Action = (typeof ACTIONS)[number];

/** «Comprobar estado» (FR-093): lee `write_status` de la propia intención; nunca la repite. */
export async function goalFundingWriteStatusAction(input: unknown): Promise<WriteStatusOutcome<unknown>> {
  const raw = record(input);
  if (!raw || typeof raw.action !== "string" || !(ACTIONS as readonly string[]).includes(raw.action) || !isUuid(raw.idempotencyKey)) return { state: "error" };
  try {
    const status = await writeStatus(await createClient(), raw.action, raw.idempotencyKey);
    if (status.state === "not_found") return { state: "not_found" };
    const result = status.result as Record<string, unknown>;
    switch (raw.action as Action) {
      case "create_expense_with_goal": {
        const context = "payer_user_id" in result || "split_mode" in result ? "us" : "me";
        return { state: "completed", value: savedFrom(context, result as unknown as FundedExpense) };
      }
      case "approve_usage_request": case "reject_usage_request": case "cancel_usage_request":
        return { state: "completed", value: toRequestResult(result as { request_id: string; status: RequestResult["status"] }) };
      case "remove_goal_usage":
        return { state: "completed", value: { transactionId: String(result.transaction_id), version: Number(result.version), reactivatedGoals: toReactivated(result.reactivated_goals as ReactivatedGoal[] | undefined) } };
      case "void_transaction": case "void_shared_expense":
        return { state: "completed", value: { id: String(result.id), version: Number(result.version), reactivatedGoals: toReactivated(result.reactivated_goals as ReactivatedGoal[] | undefined) } };
    }
  } catch {
    return { state: "error" };
  }
}
