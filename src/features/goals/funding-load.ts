import "server-only";
// 004 PR D (T062, T064) / FR-056, FR-071, FR-085, FR-096; contracts/server-actions.md §4 y §7. Lecturas del gasto con meta
// para Inicio, Actividad, el detalle y la meta, con el cliente de la petición. En Nosotros, solo metas compartidas y
// solicitudes (`usage_requests`, que solo existen sobre metas compartidas); en Yo, los usos de las metas personales de quien
// mira (de `goal_activity` con `context = 'me'`): nunca se piden datos personales del otro (FR-085, FR-086). Las cifras salen
// de vistas de una sola sentencia (`expense_goal_funding`, `goal_member_balances`); el cliente solo las formatea.
import type { SupabaseClient } from "@supabase/supabase-js";
import { rowMode } from "@/features/shared/shared-format";
import { expenseGoalFundingFor, fundedSharedExpenses, usageRequests } from "@/lib/db/goal-usage";
import { goalMemberBalancesFor } from "@/lib/db/goals";
import type { GoalEntryTransport, PlanningContext, UsageRequestTransport } from "@/lib/db/types";
import type { ExpenseFundingView, UsageRequestView } from "@/features/expenses/goal-funding/types";

/** Las solicitudes con lo que B4 y B5 necesitan: lo ya usado en el gasto, lo disponible de quien aprueba y el reparto. */
export async function requestViews(client: SupabaseClient, rows: readonly UsageRequestTransport[]): Promise<UsageRequestView[]> {
  if (rows.length === 0) return [];
  const transactions = [...new Set(rows.map((row) => row.transaction_id))];
  const goals = [...new Set(rows.map((row) => row.goal_id))];
  const [funding, balances, expenses] = await Promise.all([expenseGoalFundingFor(client, transactions), goalMemberBalancesFor(client, goals), fundedSharedExpenses(client, transactions)]);
  return rows.map((row) => {
    const expense = expenses.find((item) => item.id === row.transaction_id);
    return {
      id: row.id, version: row.version, goalId: row.goal_id, goalName: row.goal_name, transactionId: row.transaction_id, description: row.transaction_description,
      transactionAmountMinor: row.transaction_amount_minor, requestedBy: row.requested_by, memberUserId: row.member_user_id, amountMinor: row.amount_minor,
      status: row.status, createdAt: row.created_at, resolvedAt: row.resolved_at,
      usedMinor: funding.find((item) => item.transaction_id === row.transaction_id)?.used_minor ?? "0",
      memberAvailableMinor: balances.find((item) => item.goal_id === row.goal_id && item.user_id === row.member_user_id)?.available_minor ?? null,
      splitLabel: expense ? rowMode(expense) : null,
    };
  });
}

/** Las solicitudes pendientes de Nosotros (de una meta, si se pide), de la más antigua a la más reciente. */
export async function pendingRequests(client: SupabaseClient, goalId?: string): Promise<UsageRequestView[]> {
  const rows = await usageRequests(client, { status: "pending", ...(goalId ? { goalId } : {}) });
  return requestViews(client, [...rows].reverse());
}

/**
 * El uso de metas en los gastos del mes: de los usos de `goal_activity` del mes (en Yo, solo los de quien mira) y, en
 * Nosotros, de las solicitudes de esos gastos o pendientes. Una sola lectura de `usage_requests` (revisión del gestor del
 * PR #69, 8): de ella salen también las pendientes que Actividad pinta arriba; y una de `expense_goal_funding` por gasto.
 */
export async function monthFunding(client: SupabaseClient, context: PlanningContext, entries: readonly GoalEntryTransport[], names: ReadonlyMap<string, string>, anyPending = true): Promise<{ funding: Record<string, ExpenseFundingView>; pending: UsageRequestView[] }> {
  const usages = entries.filter((entry) => entry.kind === "usage" && entry.transaction_id);
  // Solo se lee `usage_requests` si hay usos en el mes o alguna meta con una solicitud pendiente.
  const requestRows = context === "us" && (usages.length > 0 || anyPending) ? await usageRequests(client) : [];
  const ids = new Set<string>(usages.map((entry) => entry.transaction_id!));
  for (const row of requestRows) if (row.status === "pending" || ids.has(row.transaction_id)) ids.add(row.transaction_id);
  if (ids.size === 0) return { funding: {}, pending: [] };
  const [funding, requests] = await Promise.all([expenseGoalFundingFor(client, [...ids]), requestViews(client, requestRows.filter((row) => ids.has(row.transaction_id)))]);
  // Las pendientes, de la más antigua a la más reciente (como pendingRequests).
  const pending = requests.filter((item) => item.status === "pending").reverse();
  const result: Record<string, ExpenseFundingView> = {};
  for (const row of funding) {
    const uses = new Map<string, bigint>();
    for (const entry of usages) {
      if (entry.transaction_id !== row.transaction_id || entry.voided) continue;
      const member = entry.member_user_id ?? entry.created_by;
      uses.set(member, (uses.get(member) ?? 0n) + BigInt(entry.amount_minor));
    }
    // La solicitud más reciente del gasto (las vistas vienen de la más reciente a la más antigua).
    const request = requests.find((item) => item.transactionId === row.transaction_id) ?? null;
    result[row.transaction_id] = {
      goalId: row.goal_id, goalName: row.goal_name ?? names.get(row.goal_id) ?? "", usedMinor: row.used_minor, pendingMinor: row.pending_minor, funded: row.funded,
      uses: [...uses.entries()].map(([memberUserId, amount]) => ({ memberUserId, amountMinor: amount.toString() })), request,
    };
  }
  return { funding: result, pending };
}
