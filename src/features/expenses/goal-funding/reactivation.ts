// 004 PR D (T063) / F64-1, opción (a) (decisión del gestor): anular un gasto pagado con una meta archivada, o quitarle el
// uso, devuelve los fondos y la reactiva sola; la interfaz lo dice con el nombre y el monto que devolvió el servidor
// (`reactivated_goals`). Sin metas reactivadas, nada.
import { cop } from "@/features/goals/format";
import { copy } from "@/lib/copy/es";
import type { ReactivatedGoalView } from "./types";

export function reactivationMessage(goals: readonly ReactivatedGoalView[] | undefined): string | null {
  if (!goals || goals.length === 0) return null;
  return goals.map((goal) => copy.goalExpense.reactivated(goal.name, cop(goal.returnedMinor))).join(". ");
}
