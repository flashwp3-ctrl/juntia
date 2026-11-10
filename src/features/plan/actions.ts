"use server";
// 004 PR B (T034) / FR-011, FR-012, FR-090–FR-093; contracts/server-actions.md §1; contracts/database.md, «Escrituras».
// Crear, editar y desactivar un presupuesto por las funciones de entrada de src/lib/db, con el cliente de la petición y
// nunca con la clave secreta (FR-006). El navegador envía solo lo que la persona decide: el contexto que la hoja guardó al
// abrirse (FR-099), la categoría, el límite en pesos enteros (o `null` para desactivar) y la versión que leyó; el mes de
// vigencia, el consumo y los permisos los decide la función bajo su bloqueo (FR-090). La clave nace al abrir la hoja y
// src/lib/db reintenta 40P01/40001 con ella (FR-097). Cada acción devuelve `ok`, `rejected` o `unknown` (write-result.ts) y,
// tras escribir, `revalidatePath` del layout: la misma respuesta trae Plan con el estado nuevo.
import { revalidatePath } from "next/cache";
import { moneyFromPesos } from "@/domain/money";
import { CATEGORY_CATALOG, type CategoryId } from "@/domain/transactions";
import { runWrite, type WriteOutcome, type WriteStatusOutcome } from "@/features/shared/write-result";
import { createBudget, updateBudget } from "@/lib/db/budgets";
import { writeStatus } from "@/lib/db/write-status";
import { createClient } from "@/lib/supabase/server";
import type { BudgetWriteAction, CreateBudgetPayload, SavedBudget, UpdateBudgetPayload } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PESOS = /^[1-9][0-9]{0,8}$/;
const EXPENSE_CATEGORIES: ReadonlySet<string> = new Set(CATEGORY_CATALOG.filter((category) => category.kind === "expense").map((category) => category.id));
const INVALID = { status: "rejected", error: "invalid" } as const;
const ACTIONS: ReadonlySet<string> = new Set<BudgetWriteAction>(["create_budget", "update_budget"]);
const refresh = () => revalidatePath("/", "layout");

const record = (input: unknown): Record<string, unknown> | null => (typeof input === "object" && input !== null ? (input as Record<string, unknown>) : null);

function parseCreate(input: unknown): CreateBudgetPayload | null {
  const value = record(input);
  if (!value) return null;
  const { idempotencyKey, context, categoryId, limitPesos } = value;
  if (typeof idempotencyKey !== "string" || !UUID.test(idempotencyKey)) return null;
  if (context !== "me" && context !== "us") return null;
  if (typeof categoryId !== "string" || !EXPENSE_CATEGORIES.has(categoryId)) return null;
  if (typeof limitPesos !== "string" || !PESOS.test(limitPesos)) return null;
  return { idempotencyKey, context, categoryId: categoryId as CategoryId, limitPesos };
}

function parseUpdate(input: unknown): UpdateBudgetPayload | null {
  const value = record(input);
  if (!value) return null;
  const { idempotencyKey, budgetId, expectedVersion, limitPesos } = value;
  if (typeof idempotencyKey !== "string" || !UUID.test(idempotencyKey) || typeof budgetId !== "string" || !UUID.test(budgetId)) return null;
  if (typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion) || expectedVersion < 1) return null;
  if (limitPesos !== null && (typeof limitPesos !== "string" || !PESOS.test(limitPesos))) return null;
  return { idempotencyKey, budgetId, expectedVersion, limitPesos };
}

const saved = (result: { budget_id?: unknown; version?: unknown }): SavedBudget => ({ budgetId: String(result.budget_id ?? ""), version: Number(result.version ?? 0) });

export async function createBudgetAction(input: unknown): Promise<WriteOutcome<SavedBudget>> {
  const payload = parseCreate(input);
  if (!payload) return INVALID;
  const outcome = await runWrite(async () => saved(await createBudget(await createClient(), {
    idempotencyKey: payload.idempotencyKey, context: payload.context, categoryId: payload.categoryId, limit: moneyFromPesos(BigInt(payload.limitPesos)),
  })));
  if (outcome.status === "ok") refresh();
  return outcome;
}

export async function updateBudgetAction(input: unknown): Promise<WriteOutcome<SavedBudget>> {
  const payload = parseUpdate(input);
  if (!payload) return INVALID;
  const outcome = await runWrite(async () => saved(await updateBudget(await createClient(), {
    idempotencyKey: payload.idempotencyKey, budgetId: payload.budgetId, expectedVersion: payload.expectedVersion,
    limit: payload.limitPesos === null ? null : moneyFromPesos(BigInt(payload.limitPesos)),
  })));
  if (outcome.status === "ok") refresh();
  return outcome;
}

/** «Comprobar estado»: lee el resultado guardado de la propia intención (`write_status`), sin repetir nada. */
export async function checkBudgetWriteAction(input: unknown): Promise<WriteStatusOutcome<SavedBudget>> {
  const value = record(input);
  if (!value || typeof value.action !== "string" || !ACTIONS.has(value.action)) return { state: "error" };
  if (typeof value.idempotencyKey !== "string" || !UUID.test(value.idempotencyKey)) return { state: "error" };
  try {
    const status = await writeStatus(await createClient(), value.action, value.idempotencyKey);
    if (status.state !== "completed") return { state: "not_found" };
    refresh();
    return { state: "completed", value: saved((record(status.result) ?? {}) as { budget_id?: unknown; version?: unknown }) };
  } catch {
    return { state: "error" };
  }
}
