import "server-only";
// 004 PR C (T045, T048–T050) / FR-035, FR-043, FR-070, FR-071, FR-085–FR-087, FR-096; contracts/server-actions.md §4 y §5.
// Lecturas de metas con el cliente de la petición (src/lib/db y vistas `security_invoker`), nunca con la clave secreta.
// En Nosotros, solo `goal_scope = 'shared'`: el servidor no pide metas personales, no las filtra después (F63-3). En Yo,
// `goals_overview` entera en una consulta, que la interfaz separa por `goal_scope`; el total personal sale de
// `goals_totals` con `personal` y nunca incluye una compartida (decisión 22.11). Los totales salen de vistas de una sola
// sentencia; las listas (historial, Actividad), por cursor (FR-096). Una sesión que ya no vale lleva a Entrar.
import { redirect } from "next/navigation";
import { loadAccount } from "@/features/account/load-account";
import { activeCouple } from "@/features/couple/shared-load";
import { DbError, mapDbError } from "@/lib/db/errors";
import { getGoal, goalActivity, goalEntries, goalMemberBalancesFor, goalTotals, listGoals } from "@/lib/db/goals";
import { metricMonths } from "@/lib/db/metrics";
import type { GoalEntryTransport, GoalMemberTransport, GoalTransport, PlanningContext } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import type { GoalActivityData, GoalEntryView, GoalMemberView, GoalPerson, GoalsScreenData, GoalView, HomeGoals } from "./types";
import type { UsageRequestView } from "@/features/expenses/goal-funding/types";
import { monthFunding, pendingRequests } from "./funding-load";

type Loaded<T> = { ok: true; value: T } | { ok: false };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function guard<T>(read: () => Promise<T>, volver: string): Promise<Loaded<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    const kind = (error instanceof DbError ? error : mapDbError(error)).kind;
    if (kind === "notAuthenticated") redirect(`/entrar?volver=${encodeURIComponent(volver)}`);
    return { ok: false };
  }
}

export const toGoalView = (row: GoalTransport): GoalView => ({
  id: row.id, name: row.name, goalType: row.goal_type, scope: row.goal_scope, status: row.status, version: row.version,
  targetMinor: row.target_minor, balanceMinor: row.balance_minor, progressPercent: Number(row.progress_percent), myAvailableMinor: row.my_available_minor,
  hasPendingRequest: row.has_pending_request, targetMonth: row.target_month, createdAt: row.created_at,
  lastContributionDate: row.last_contribution_date ?? null, lastContributionCreatedAt: row.last_contribution_created_at ?? null,
});

export const toEntryView = (row: GoalEntryTransport, goalName?: string): GoalEntryView => ({
  id: row.id, goalId: row.goal_id, goalName, kind: row.kind, memberUserId: row.member_user_id, amountMinor: row.amount_minor, effectiveDate: row.effective_date,
  fundingMode: row.funding_mode, reason: row.reason, transactionId: row.transaction_id, transactionDescription: row.transaction_description,
  voided: row.voided, voidedReason: row.voided_reason, createdBy: row.created_by, createdAt: row.created_at,
});

function toMembers(rows: readonly GoalMemberTransport[], people: readonly GoalPerson[]): Record<string, GoalMemberView[]> {
  const byGoal: Record<string, GoalMemberView[]> = {};
  for (const row of rows) {
    const person = people.find((candidate) => candidate.userId === row.user_id);
    if (!person) continue;
    (byGoal[row.goal_id] ??= []).push({
      ...person, contributedMinor: row.contributed_minor, withdrawnMinor: row.withdrawn_minor, usedMinor: row.used_minor,
      availableMinor: row.available_minor, contributionCount: Number(row.contribution_count),
    });
  }
  for (const list of Object.values(byGoal)) list.sort((a, b) => a.joinOrder - b.joinOrder);
  return byGoal;
}

/** Quién puede aparecer en una meta: la pareja activa o, sin ella, solo quien mira. Nunca el correo. */
export async function goalPeople(): Promise<GoalPerson[]> {
  const couple = await activeCouple();
  if (couple) return couple;
  const account = await loadAccount();
  return account ? [{ userId: account.userId, name: account.profile.displayName, joinOrder: 1, isMe: true }] : [];
}

const byCreation = (a: GoalView, b: GoalView) => (a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1);

/** Metas de la pantalla (FR-035): en Nosotros, solo compartidas; en Yo, todas en una consulta. */
export async function loadGoalsScreen(context: PlanningContext, people: readonly GoalPerson[], volver: string): Promise<Loaded<GoalsScreenData>> {
  return guard(async () => {
    const client = await createClient();
    const [rows, totals] = await Promise.all([listGoals(client, context), goalTotals(client, context === "us" ? "shared" : "personal")]);
    const goals = rows.map(toGoalView).sort(byCreation);
    const members = toMembers(await goalMemberBalancesFor(client, goals.map(({ id }) => id)), people);
    const total = totals[0];
    return { context, goals, members, totals: total ? { balanceMinor: total.balance_minor, myAvailableMinor: total.my_available_minor, count: Number(total.goal_count) } : null };
  }, volver);
}

/** 004 PR D (T062): `requests`, las solicitudes pendientes de esta meta (solo compartidas: las personales no tienen). */
export type GoalDetail = { goal: GoalView; members: GoalMemberView[]; entries: GoalEntryView[]; requests: UsageRequestView[] };

/** La meta inmersiva (T049) con su historial completo por cursor (T048). En Nosotros, una personal no existe. */
export async function loadGoalDetail(goalId: string, context: PlanningContext, people: readonly GoalPerson[], volver: string): Promise<Loaded<GoalDetail | null>> {
  if (!UUID.test(goalId)) return { ok: true, value: null };
  return guard(async () => {
    const client = await createClient();
    const row = await getGoal(client, goalId, context === "us" ? "shared" : undefined);
    if (!row) return null;
    const [balances, entries, requests] = await Promise.all([goalMemberBalancesFor(client, [goalId]), goalEntries(client, goalId), row.goal_scope === "shared" ? pendingRequests(client, goalId) : Promise.resolve([])]);
    return { goal: toGoalView(row), members: toMembers(balances, people)[goalId] ?? [], entries: entries.map((entry) => toEntryView(entry)), requests };
  }, volver);
}

/** Inicio (T050; FR-070): `aporte_a_metas` del mes (de `metric_months`) y las metas abiertas del contexto. */
export async function loadHomeGoals(context: PlanningContext, month: string, people: readonly GoalPerson[], volver: string): Promise<Loaded<HomeGoals>> {
  return guard(async () => {
    const client = await createClient();
    const [rows, metrics] = await Promise.all([listGoals(client, context), metricMonths(client, context, `${month}-01`)]);
    const goals = rows.map(toGoalView).filter((goal) => goal.status !== "archived").sort((a, b) => (a.scope === b.scope ? byCreation(a, b) : a.scope === "personal" ? -1 : 1));
    // 004 PR D (regresión de E5 medida en juntia-dev): `goals_overview` ya dice si una meta tiene una solicitud pendiente; sin
    // ninguna, Inicio no consulta `usage_requests`, y la revalidación tras anotar no paga esa lectura.
    const pending = context === "us" && goals.some((goal) => goal.hasPendingRequest);
    const [balances, requests] = await Promise.all([goalMemberBalancesFor(client, goals.map(({ id }) => id)), pending ? pendingRequests(client) : Promise.resolve([])]);
    return { setAsideMinor: metrics[0]?.aporte_a_metas ?? "0", goals, members: toMembers(balances, people), requests, people: [...people] };
  }, volver);
}

/** Actividad (T050; FR-044, FR-071): asientos de metas del mes por cursor y lo apartado del mes, con el nombre de su meta. */
export async function loadGoalActivity(context: PlanningContext, month: string, volver: string): Promise<Loaded<GoalActivityData>> {
  return guard(async () => {
    const client = await createClient();
    const [entries, goals, metrics] = await Promise.all([goalActivity(client, context, `${month}-01`), listGoals(client, context), metricMonths(client, context, `${month}-01`)]);
    const names = new Map(goals.map((goal) => [goal.id, goal.name]));
    // 004 PR D (T064): el uso de metas de los gastos del mes (CON META, el detalle) y, en Nosotros, las solicitudes pendientes.
    // Sin usos en el mes ni metas con una solicitud pendiente, no hay nada que leer de `usage_requests` (ver loadHomeGoals).
    const { funding, pending: requests } = await monthFunding(client, context, entries, names, goals.some((goal) => goal.has_pending_request));
    return { entries: entries.map((entry) => toEntryView(entry, names.get(entry.goal_id))), setAsideMinor: metrics[0]?.aporte_a_metas ?? "0", funding, requests };
  }, volver);
}
