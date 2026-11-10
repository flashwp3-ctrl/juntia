// 004 PR C (T045–T050) / FR-030–FR-044, FR-090–FR-095; contracts/server-actions.md §1–§5. Lo que cruza entre las Server
// Actions de metas, las cargas del servidor y los componentes. Los importes viajan como texto en unidades menores (FR-005;
// ADR-013 §4) y la interfaz nunca los decide: `amountPesos` y `targetPesos` son lo que escribió la persona; el saldo, el
// progreso y lo disponible por aportante salen de las vistas (`goals_overview`, `goal_member_balances`) y el servidor los
// recalcula en cada escritura (FR-090).
import type { GoalScope, GoalType, PlanningContext } from "@/lib/db/types";
import type { WriteAction, WriteOutcome, WriteStatusOutcome } from "@/features/shared/write-result";

export type { GoalScope, GoalType, PlanningContext };
export const GOAL_TYPES = ["travel", "home", "wedding", "vehicle", "education", "emergency", "other"] as const satisfies readonly GoalType[];

/** Una meta de `goals_overview`, sin `bigint`. `targetMonth`: el primer día del mes objetivo (AAAA-MM-01) o `null`. */
export type GoalView = {
  id: string; name: string; goalType: GoalType; scope: GoalScope; status: "active" | "completed" | "archived"; version: number;
  targetMinor: string; balanceMinor: string; progressPercent: number; myAvailableMinor: string; hasPendingRequest: boolean;
  targetMonth: string | null; createdAt: string;
  /** El último aporte no anulado (`goals_overview`): su fecha y su instante, o `null` sin aportes. Ordenan la pila. */
  lastContributionDate: string | null; lastContributionCreatedAt: string | null;
};

/** Una persona que puede aparecer en una meta: nombre visible, orden de ingreso (color y patrón) y si es quien mira. */
export type GoalPerson = { userId: string; name: string; joinOrder: 1 | 2; isMe: boolean };

/** Lo de cada aportante en una meta (`goal_member_balances`). */
export type GoalMemberView = GoalPerson & {
  contributedMinor: string; withdrawnMinor: string; usedMinor: string; availableMinor: string; contributionCount: number;
};

/** Un asiento de `goal_entries` o `goal_activity`. `goalName` lo añade la carga de Actividad. */
export type GoalEntryView = {
  id: string; goalId: string; goalName?: string; kind: "contribution" | "withdrawal" | "usage"; memberUserId: string | null;
  amountMinor: string; effectiveDate: string; fundingMode: "reserved" | "transferred_declared" | null; reason: string | null;
  transactionId: string | null; transactionDescription: string | null; voided: boolean; voidedReason: string | null;
  createdBy: string; createdAt: string;
};

export type GoalTotalsView = { balanceMinor: string; myAvailableMinor: string; count: number };

/** Metas de un contexto, leídas en una consulta (Q11). Yo: `personal` y, aparte, `shared` con «Tus aportes». */
export type GoalsScreenData = {
  context: PlanningContext;
  goals: GoalView[];
  /** Por meta, lo de cada aportante; solo de las metas de esta pantalla. */
  members: Record<string, GoalMemberView[]>;
  /** Nosotros: `shared`; Yo: `personal` (nunca suma las compartidas). `null` sin metas activas. */
  totals: GoalTotalsView | null;
};

export type GoalFormPayload = { idempotencyKey: string; name: string; goalType: GoalType; targetPesos: string; targetMonth: string | null };
export type CreateGoalPayload = GoalFormPayload & { context: PlanningContext };
export type UpdateGoalPayload = GoalFormPayload & { goalId: string; expectedVersion: number };
export type GoalStatusPayload = { idempotencyKey: string; goalId: string; expectedVersion: number };
export type ContributePayload = { idempotencyKey: string; goalId: string; amountPesos: string; entryDate: string; fundingMode: "reserved" | "transferred_declared" };
export type WithdrawPayload = { idempotencyKey: string; goalId: string; amountPesos: string; entryDate: string; reason: string };
export type VoidEntryPayload = { idempotencyKey: string; entryId: string; reason: "undo" | "void" };

export type SavedGoal = { id: string; name: string; goalType: GoalType; targetMinor: string; targetMonth: string | null; status: GoalView["status"]; version: number };
export type SavedGoalStatus = { id: string; status: GoalView["status"]; version: number };
/** Un aporte o retiro guardado: el asiento y lo que queda disponible de quien lo hizo, según el servidor. */
export type SavedEntry = { id: string; goalId: string; amountMinor: string; availableMinor: string };

export type GoalActions = {
  create: (payload: CreateGoalPayload) => Promise<WriteOutcome<SavedGoal>>;
  update: (payload: UpdateGoalPayload) => Promise<WriteOutcome<SavedGoal>>;
  complete: (payload: GoalStatusPayload) => Promise<WriteOutcome<SavedGoalStatus>>;
  archive: (payload: GoalStatusPayload) => Promise<WriteOutcome<SavedGoalStatus>>;
  contribute: (payload: ContributePayload) => Promise<WriteOutcome<SavedEntry>>;
  withdraw: (payload: WithdrawPayload) => Promise<WriteOutcome<SavedEntry>>;
  voidEntry: (payload: VoidEntryPayload) => Promise<WriteOutcome<{ entryId: string }>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cada acción devuelve su propio resultado guardado.
  check: (input: { action: WriteAction; idempotencyKey: string }) => Promise<WriteStatusOutcome<any>>;
};

/** Inicio (FR-070): lo apartado del mes (`aporte_a_metas`) y las metas abiertas del contexto. */
export type HomeGoals = { setAsideMinor: string; goals: GoalView[]; members: Record<string, GoalMemberView[]> };
/** Actividad (FR-044, FR-071): asientos de metas del mes y lo apartado del mes. */
export type GoalActivityData = { entries: GoalEntryView[]; setAsideMinor: string };
