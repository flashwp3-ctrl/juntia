import "server-only";
// T048, T049 (spec 003, PR C) / FR-037–FR-046; contracts/server-actions.md §4 y §5; interpretación I3. Lecturas de Nosotros y
// de la parte compartida de Yo con el cliente de la petición (src/lib/db y las vistas `security_invoker`). Antes de leer
// nada del grupo, el servidor comprueba la membresía activa (`my_couple` en `active`, FR-038); sin ella, nada. Los totales
// y el saldo salen de una sola sentencia (`couple_month_summary`, `me_month_summary`, `couple_balance`; FR-043) y las listas
// por cursor (FR-042). Con Nosotros, ninguna lectura toca `my_transactions` ni `me_month_summary`; con Yo, solo
// `my_shared_parts` y `me_month_summary` de lo compartido (la parte propia).
import { redirect } from "next/navigation";
import type { MemberBalance } from "@/domain/balances";
import { clampMonth, monthNavigation, type CategoryId } from "@/domain/transactions";
import type { CoupleSettlementView } from "@/features/activity/couple-activity-view";
import type { CoupleMemberView, CoupleMonthSummary } from "@/features/home/couple-home-view";
import type { MeSummary, SharedPartRow } from "@/features/home/home-view";
import { lastFromSaved } from "@/features/expenses/split-state";
import { toSavedShared } from "@/features/expenses/shared-payload";
import type { CoupleForSheet } from "@/features/expenses/shared-types";
import { getCoupleBalance, getCoupleMonthSummary, getLastSharedExpenseBy, getMeMonthSummary, getSharedExpense, listCoupleMonths, listMySharedParts } from "@/lib/db/couple-reads";
import { DbError, mapDbError } from "@/lib/db/errors";
import { listSettlements } from "@/lib/db/settlements";
import { listSharedExpenses } from "@/lib/db/shared-expenses";
import type { SharedTransaction } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import { loadCouple } from "./load";

type Loaded<T> = { ok: true; value: T } | { ok: false };

async function guard<T>(read: () => Promise<T>, volver: string): Promise<Loaded<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    const kind = (error instanceof DbError ? error : mapDbError(error)).kind;
    if (kind === "notAuthenticated") redirect(`/entrar?volver=${encodeURIComponent(volver)}`);
    return { ok: false };
  }
}

/** FR-038: la pareja activa de quien pregunta, o `null` (sin pareja, provisional o la lectura falló): entonces nada del grupo. */
export async function activeCouple(): Promise<CoupleMemberView[] | null> {
  try {
    const couple = await loadCouple();
    return couple.status === "active" ? couple.members.map(({ userId, name, joinOrder, isMe }) => ({ userId, name, joinOrder, isMe })) : null;
  } catch {
    return null;
  }
}

const minorText = (value: { amountMinor: bigint }) => value.amountMinor.toString();
const byCategoryText = (value: Partial<Record<CategoryId, { amountMinor: bigint }>>) =>
  Object.fromEntries(Object.entries(value).map(([category, money]) => [category, minorText(money!)])) as Partial<Record<CategoryId, string>>;

export type CoupleHomeData = { summary: CoupleMonthSummary | null; balance: MemberBalance[]; rows: SharedTransaction[] };

/** Inicio en Nosotros (FR-044; I3): el gasto compartido del mes, su desglose, el saldo y los recientes. */
export async function loadCoupleHome(month: string, volver: string): Promise<Loaded<CoupleHomeData>> {
  return guard(async () => {
    const client = await createClient();
    const [totals, balance, rows] = await Promise.all([getCoupleMonthSummary(client, month), getCoupleBalance(client), listSharedExpenses(client, month)]);
    const summary = totals ? { totalMinor: minorText(totals.total), count: totals.count, byCategory: byCategoryText(totals.byCategory) } : null;
    return { summary, balance, rows };
  }, volver);
}

export type CoupleMonthData = { expenses: SharedTransaction[]; settlements: CoupleSettlementView[]; month: string; navigation: { previous: string | null; next: string | null } };

/** Actividad en Nosotros (FR-046): gastos y liquidaciones del mes por cursor, con las flechas de `couple_transaction_months`. */
export async function loadCoupleMonth(requested: string, current: string, volver: string): Promise<Loaded<CoupleMonthData>> {
  return guard(async () => {
    const client = await createClient();
    const months = await listCoupleMonths(client);
    const month = clampMonth(months, current.slice(0, 7), requested);
    const [expenses, settlements] = await Promise.all([listSharedExpenses(client, month), listSettlements(client, month)]);
    return {
      expenses, month, navigation: monthNavigation(months, current.slice(0, 7), month),
      settlements: settlements.map((row) => ({ id: row.id, settlementDate: row.settlementDate, createdAt: row.createdAt, fromUserId: row.fromUserId, toUserId: row.toUserId, amount: row.amount, status: row.status, note: row.note, version: row.version })),
    };
  }, volver);
}

/** Un gasto compartido activo de la pareja, o `null` (ajeno, anulado, privado o inexistente dan lo mismo). */
export async function loadSharedExpense(id: string, volver: string): Promise<Loaded<SharedTransaction | null>> {
  return guard(async () => getSharedExpense(await createClient(), id), volver);
}

/** Yo con la parte compartida (FR-045): `my_shared_parts` del mes y `me_month_summary` (una sola sentencia). */
export async function loadMeShared(month: string, volver: string): Promise<Loaded<{ parts: SharedPartRow[]; summary: MeSummary }>> {
  return guard(async () => {
    const client = await createClient();
    const [parts, totals] = await Promise.all([listMySharedParts(client, month), getMeMonthSummary(client, month)]);
    return { parts, summary: { privateMinor: minorText(totals.privateTotal), sharedPartMinor: minorText(totals.sharedPart), consumptionMinor: minorText(totals.consumption), byCategory: byCategoryText(totals.byCategory) } };
  }, volver);
}

/**
 * La pareja para la hoja de Anotar (layout): integrantes y lo último que usó esta persona en Nosotros (Q5; decisión 1),
 * leído de su último gasto compartido. Si falla, la hoja abre con «Pagó: yo» y 50/50.
 */
export async function loadCoupleForSheet(members: readonly CoupleMemberView[] | null): Promise<CoupleForSheet | null> {
  if (!members) return null;
  const me = members.find((member) => member.isMe);
  if (!me) return null;
  try {
    const last = await getLastSharedExpenseBy(await createClient(), me.userId);
    return { members: [...members], last: last ? lastFromSaved(toSavedShared(last), members) : null };
  } catch {
    return { members: [...members], last: null };
  }
}
