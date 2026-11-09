// 004 PR B (T033, T034) / FR-015, FR-017, FR-018, FR-020, FR-093; contracts/server-actions.md §1. Lo que Plan recibe del
// servidor y lo que sus Server Actions aceptan y devuelven. Los importes viajan como texto de dígitos (unidades menores;
// FR-005, ADR-013 §4) y el cliente los convierte a `bigint` solo para formatearlos: nunca decide con ellos (FR-090).
import type { BudgetChangeKind } from "@/domain/budgets";
import type { CategoryId } from "@/domain/transactions";
import type { WriteOutcome, WriteStatusOutcome } from "@/features/shared/write-result";

export type PlanContext = "me" | "us";

/** Un cambio del historial de un presupuesto (`budget_history`), con el nombre de quien lo hizo. */
export type BudgetChange = {
  id: string;
  budgetId: string;
  kind: BudgetChangeKind;
  limitMinor: string | null;
  previousLimitMinor: string | null;
  byName: string;
  /** Instante del cambio (ISO), para ordenar. */
  changedAt: string;
  /** Día del cambio en Bogotá (`AAAA-MM-DD`). */
  date: string;
};

/**
 * Una categoría del mes en este contexto (`budget_months`): con presupuesto vigente (`limitMinor`), sin presupuesto
 * (`null`, nunca 0; DEC-R01) o con uno desactivado (`budgetId` presente y `limitMinor` `null`). `history`, del más nuevo
 * al más antiguo.
 */
export type PlanRow = {
  categoryId: CategoryId;
  budgetId: string | null;
  version: number | null;
  limitMinor: string | null;
  consumedMinor: string;
  history: BudgetChange[];
};

export type PlanData = {
  context: PlanContext;
  /** `AAAA-MM`. */
  month: string;
  /** Hoy en Bogotá (`AAAA-MM-DD`). */
  today: string;
  /** `gasto_consumo` del mes en este contexto (`metric_months`), o `null` si el mes no tiene gasto. */
  spentMinor: string | null;
  rows: PlanRow[];
};

export type CreateBudgetPayload = { idempotencyKey: string; context: PlanContext; categoryId: CategoryId; limitPesos: string };
/** `limitPesos: null` desactiva. */
export type UpdateBudgetPayload = { idempotencyKey: string; budgetId: string; expectedVersion: number; limitPesos: string | null };
export type SavedBudget = { budgetId: string; version: number };
export type BudgetWriteAction = "create_budget" | "update_budget";

export type PlanActions = {
  create: (payload: CreateBudgetPayload) => Promise<WriteOutcome<SavedBudget>>;
  update: (payload: UpdateBudgetPayload) => Promise<WriteOutcome<SavedBudget>>;
  check: (input: { action: BudgetWriteAction; idempotencyKey: string }) => Promise<WriteStatusOutcome<SavedBudget>>;
};
