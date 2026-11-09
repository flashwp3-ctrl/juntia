import "server-only";
// 004 PR B (T033) / FR-015, FR-018, FR-020, FR-085–FR-087, FR-096; contracts/server-actions.md §4 y §5. Lecturas de Plan con
// el cliente de la petición (vistas `security_invoker`), nunca con la clave secreta (FR-006). Una lectura por contexto:
// `budget_months` y `metric_months` con `context` = el de la pantalla y el mes en curso, y el historial de los presupuestos
// que esa misma lectura devolvió. En Nosotros no se pide nada personal: el filtro de contexto va en la consulta, no después
// (FR-085). Los totales salen de vistas de una sola sentencia; el servidor de la aplicación no suma ni recalcula cifras: solo
// convierte el historial en el tipo de cada cambio para decirlo.
import { redirect } from "next/navigation";
import { budgetChangeKind } from "@/domain/budgets";
import type { CategoryId } from "@/domain/transactions";
import { budgetHistoryFor, budgetMonths } from "@/lib/db/budgets";
import { DbError, mapDbError } from "@/lib/db/errors";
import { metricMonths } from "@/lib/db/metrics";
import type { BudgetHistoryTransport } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import type { BudgetChange, PlanContext, PlanData, PlanRow } from "./types";

type Loaded<T> = { ok: true; value: T } | { ok: false };

const bogotaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" });

/** El historial de un presupuesto, del más nuevo al más antiguo, con el tipo de cada cambio y el nombre de quien lo hizo. */
function changesOf(rows: readonly BudgetHistoryTransport[], names: ReadonlyMap<string, string>): BudgetChange[] {
  return rows.map((row, index) => ({
    id: row.id,
    budgetId: row.budget_id,
    kind: budgetChangeKind(row.previous_limit_minor === null ? null : BigInt(row.previous_limit_minor), row.limit_minor === null ? null : BigInt(row.limit_minor), index === rows.length - 1),
    limitMinor: row.limit_minor,
    previousLimitMinor: row.previous_limit_minor,
    byName: names.get(row.changed_by) ?? "",
    changedAt: row.changed_at,
    date: bogotaDay.format(new Date(row.changed_at)),
  }));
}

/**
 * Plan del mes en curso en `context`. `names`: quién puede aparecer como autor de un cambio (en Nosotros, los dos integrantes
 * activos que el servidor ya comprobó; en Yo, la propia persona).
 */
export async function loadPlan(context: PlanContext, today: string, names: ReadonlyMap<string, string>): Promise<Loaded<PlanData>> {
  try {
    const client = await createClient();
    const month = today.slice(0, 7);
    const [months, metrics] = await Promise.all([budgetMonths(client, context, `${month}-01`), metricMonths(client, context, `${month}-01`)]);
    const budgetIds = [...new Set(months.flatMap((row) => (row.budget_id ? [row.budget_id] : [])))];
    const history = await budgetHistoryFor(client, budgetIds);
    const rows: PlanRow[] = months
      .filter((row) => row.category_id !== "income")
      .map((row) => ({
        categoryId: row.category_id as CategoryId,
        budgetId: row.budget_id,
        version: row.version,
        limitMinor: row.limit_minor,
        consumedMinor: row.consumed_minor,
        history: row.budget_id ? changesOf(history.filter((item) => item.budget_id === row.budget_id), names) : [],
      }));
    return { ok: true, value: { context, month, today, spentMinor: metrics[0]?.gasto_consumo ?? null, rows } };
  } catch (error) {
    if ((error instanceof DbError ? error : mapDbError(error)).kind === "notAuthenticated") redirect(`/entrar?volver=${encodeURIComponent("/plan")}`);
    return { ok: false };
  }
}
