// 004 PR D (T060–T064) / FR-050–FR-059, FR-071, FR-072, FR-090–FR-095; contracts/server-actions.md §1, §4 y §7. Lo que
// cruza entre la hoja de Anotar con «Con una meta» (B1–B3), las tarjetas de solicitud (B4–B7), el detalle del gasto y sus
// Server Actions. Los importes viajan como texto en unidades menores (FR-005; ADR-013 §4); los pesos que escribe la persona,
// como texto de dígitos. El navegador manda solo lo que la persona decide —meta, uso y fondos por aportante—; el servidor
// recalcula y valida saldos y disponibles (FR-090) y la función SQL vuelve a comprobarlo todo.
import type { CategoryId } from "@/domain/transactions";
import type { GoalType } from "@/lib/db/types";
import type { WriteAction, WriteOutcome, WriteStatusOutcome } from "@/features/shared/write-result";
import type { SavedTransaction } from "../types";
import type { SavedShared, SharedSplitPayload } from "../shared-types";

export type FundingContext = "me" | "us";

/** Una meta elegible en B1: del contexto de la hoja (FR-085), con su saldo y lo disponible de cada aportante. */
export type FundingGoal = {
  id: string; name: string; goalType: GoalType; status: "active" | "completed"; version: number;
  balanceMinor: string; targetMinor: string; progressPercent: number;
  /** `goal_member_balances`: solo aportantes con algo disponible. */
  members: { userId: string; availableMinor: string }[];
};
export type FundingGoalsResult = { ok: true; goals: FundingGoal[] } | { ok: false };

/** Un aportante en FundingLedger: nombre visible, orden de ingreso y lo disponible en la meta elegida. */
export type Contributor = { userId: string; name: string; joinOrder: 1 | 2; isMe: boolean; availableMinor: string };

type ExpenseFields = { idempotencyKey: string; amountPesos: string; categoryId: CategoryId; transactionDate: string; description: string | null };
type FundingFields = { goalId: string; ownPesos: string; requestedPesos: string };
/** Registro inicial (FR-052): el gasto, el uso propio y, en Nosotros, la solicitud por los fondos del otro, en una operación. */
export type GoalExpensePayload = (ExpenseFields & FundingFields & { context: "me" }) | (ExpenseFields & FundingFields & SharedSplitPayload & { context: "us" });

export type SavedGoalExpense =
  | { context: "me"; transaction: SavedTransaction; goalId: string; requestId: null }
  | { context: "us"; transaction: SavedShared; goalId: string; requestId: string | null };

export type ReactivatedGoalView = { goalId: string; name: string; returnedMinor: string };

/** Una solicitud de `usage_requests`, con lo que B4 y B5 necesitan para explicarla. */
export type UsageRequestView = {
  id: string; version: number; goalId: string; goalName: string; transactionId: string; description: string | null;
  transactionAmountMinor: string; requestedBy: string; memberUserId: string; amountMinor: string;
  status: "pending" | "approved" | "rejected" | "cancelled"; createdAt: string; resolvedAt: string | null;
  /** Lo ya usado de la meta en ese gasto (`expense_goal_funding`). */
  usedMinor: string;
  /** Lo disponible de quien aprueba en esa meta (`goal_member_balances`), o `null` si no tiene fila. */
  memberAvailableMinor: string | null;
  /** «50/50», «55/45»… del gasto compartido, si se pudo leer. */
  splitLabel: string | null;
};

/** El uso de una meta en un gasto (`expense_goal_funding` y sus asientos), para el detalle y la fila CON META. */
export type ExpenseFundingView = {
  goalId: string; goalName: string; usedMinor: string; pendingMinor: string; funded: boolean;
  /** Usos aplicados y vivos, por aportante. */
  uses: { memberUserId: string; amountMinor: string }[];
  /** La última solicitud del gasto, o `null`. */
  request: UsageRequestView | null;
};

/** La fila de un gasto en Actividad: su marca de ConfirmationBadge. */
export type RowFunding = { transactionId: string; funded: boolean; pendingMemberId: string | null };

export type RequestPayload = { idempotencyKey: string; requestId: string; expectedVersion: number };
export type RemoveUsagePayload = { idempotencyKey: string; transactionId: string; expectedVersion: number };
export type RequestResult = { requestId: string; status: "approved" | "rejected" | "cancelled" };
export type RemoveUsageResult = { transactionId: string; version: number; reactivatedGoals: ReactivatedGoalView[] };
export type UndoExpensePayload = { idempotencyKey: string; context: FundingContext; transactionId: string; expectedVersion: number };
export type VoidedExpense = { id: string; version: number; reactivatedGoals: ReactivatedGoalView[] };

export type GoalFundingActions = {
  /** B1: las metas del contexto de la hoja. En Nosotros, solo compartidas; nunca se piden las personales (F63-3). */
  loadGoals: (input: { context: FundingContext }) => Promise<FundingGoalsResult>;
  create: (payload: GoalExpensePayload) => Promise<WriteOutcome<SavedGoalExpense>>;
  approve: (payload: RequestPayload) => Promise<WriteOutcome<RequestResult>>;
  reject: (payload: RequestPayload) => Promise<WriteOutcome<RequestResult>>;
  cancel: (payload: RequestPayload) => Promise<WriteOutcome<RequestResult>>;
  removeUsage: (payload: RemoveUsagePayload) => Promise<WriteOutcome<RemoveUsageResult>>;
  /** FR-059: el «Deshacer» de 6 s de un gasto con meta anula en una operación el gasto, sus usos y la solicitud. */
  undoExpense: (payload: UndoExpensePayload) => Promise<WriteOutcome<VoidedExpense>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cada acción devuelve su propio resultado guardado.
  check: (input: { action: WriteAction; idempotencyKey: string }) => Promise<WriteStatusOutcome<any>>;
};
