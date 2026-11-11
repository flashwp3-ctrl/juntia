// 004 PR D (T060–T063): las Server Actions del gasto con meta como un solo objeto. Viaja con las de metas
// (`goalActions.funding`), que el layout ya entrega al proveedor de Anotar. Sin «use server»: solo reúne las referencias.
import {
  approveUsageRequestAction, cancelUsageRequestAction, createExpenseWithGoalAction, goalFundingWriteStatusAction, loadFundingGoalsAction,
  rejectUsageRequestAction, removeGoalUsageAction, undoGoalExpenseAction,
} from "./actions";
import type { GoalFundingActions } from "./types";

export const goalFundingActions: GoalFundingActions = {
  loadGoals: loadFundingGoalsAction, create: createExpenseWithGoalAction, approve: approveUsageRequestAction, reject: rejectUsageRequestAction,
  cancel: cancelUsageRequestAction, removeUsage: removeGoalUsageAction, undoExpense: undoGoalExpenseAction, check: goalFundingWriteStatusAction,
};
