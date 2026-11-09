// 004 PR C (T046, T047): las Server Actions de metas como un solo objeto, para el layout (el «Deshacer» del proveedor de
// Anotar) y las páginas de Metas. Sin «use server»: solo reúne las referencias de actions.ts.
import { archiveGoalAction, completeGoalAction, contributeAction, createGoalAction, goalWriteStatusAction, updateGoalAction, voidGoalEntryAction, withdrawAction } from "./actions";
import type { GoalActions } from "./types";

export const goalActions: GoalActions = {
  create: createGoalAction, update: updateGoalAction, complete: completeGoalAction, archive: archiveGoalAction,
  contribute: contributeAction, withdraw: withdrawAction, voidEntry: voidGoalEntryAction, check: goalWriteStatusAction,
};
