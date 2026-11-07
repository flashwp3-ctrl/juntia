// PR C de la 003 (T048–T050) / FR-007, FR-037–FR-046; contracts/database.md («Lecturas»). Las lecturas de las vistas de
// pareja y de la parte compartida de Yo que no tenían función en src/lib/db: el saldo (`couple_balance`), los resúmenes de
// una sola sentencia (`couple_month_summary`, `me_month_summary`), los meses navegables, un gasto compartido, las partes
// propias y el último gasto compartido de quien pregunta. Todas con el cliente de la petición y las vistas
// `security_invoker` (RLS); los importes llegan como texto y se convierten aquí (FR-007).
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAmountMinor, type Money } from "@/domain/money";
import type { MemberBalance } from "@/domain/balances";
import type { CategoryId } from "@/domain/transactions";
import { DbError, mapDbError } from "./errors";
import { requireClaims } from "./session";
import { sharedTransaction } from "./shared-expenses";
import type { SharedExpenseTransport, SharedTransaction } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH = /^[0-9]{4}-(0[1-9]|1[0-2])$/;
const amount = (value: unknown): Money => parseAmountMinor(typeof value === "string" ? value : "0");
/** `net_minor` es el único importe con signo (contracts/database.md). */
const signed = (value: unknown): Money => {
  const text = typeof value === "string" ? value : "0";
  return text.startsWith("-") ? { amountMinor: -parseAmountMinor(text.slice(1)).amountMinor, currency: "COP" } : parseAmountMinor(text);
};
function firstDay(month: string) {
  if (!MONTH.test(month)) throw new DbError("invalidDate");
  return `${month}-01`;
}
function nextFirstDay(month: string) {
  const [year, part] = month.split("-").map(Number);
  return part === 12 ? `${String(year + 1).padStart(4, "0")}-01-01` : `${String(year).padStart(4, "0")}-${String(part + 1).padStart(2, "0")}-01`;
}

/** Una fila por integrante: pagado, le corresponde, liquidaciones y neto (una sola sentencia; FR-043). */
export async function getCoupleBalance(client: SupabaseClient): Promise<MemberBalance[]> {
  await requireClaims(client);
  const { data, error } = await client.from("couple_balance").select("user_id,paid_minor,share_minor,settled_out_minor,settled_in_minor,net_minor");
  if (error) throw mapDbError(error);
  return (data ?? []).map((row) => ({ userId: String(row.user_id), paid: amount(row.paid_minor), share: amount(row.share_minor), settledOut: amount(row.settled_out_minor), settledIn: amount(row.settled_in_minor), net: signed(row.net_minor) }));
}

export type CoupleMonthTotals = { total: Money; count: number; byCategory: Partial<Record<CategoryId, Money>> };
/** El gasto compartido de un mes y su desglose, o `null` si no hay gastos (una sola sentencia; FR-043). */
export async function getCoupleMonthSummary(client: SupabaseClient, month: string): Promise<CoupleMonthTotals | null> {
  await requireClaims(client);
  const { data, error } = await client.from("couple_month_summary").select("total_minor,by_category,count").eq("month", firstDay(month)).maybeSingle();
  if (error) throw mapDbError(error);
  if (!data) return null;
  const byCategory = Object.fromEntries(Object.entries((data.by_category ?? {}) as Record<string, string>).map(([category, value]) => [category, amount(value)])) as Partial<Record<CategoryId, Money>>;
  return { total: amount(data.total_minor), count: Number(data.count), byCategory };
}

export type MeMonthTotals = { privateTotal: Money; sharedPart: Money; consumption: Money; byCategory: Partial<Record<CategoryId, Money>> };
/** `gasto_consumo` de Yo: privados más la parte propia de lo compartido (una sola sentencia; FR-045). */
export async function getMeMonthSummary(client: SupabaseClient, month: string): Promise<MeMonthTotals> {
  await requireClaims(client);
  const { data, error } = await client.from("me_month_summary").select("private_minor,shared_part_minor,consumption_minor,by_category").eq("month", firstDay(month)).maybeSingle();
  if (error) throw mapDbError(error);
  const byCategory = Object.fromEntries(Object.entries(((data?.by_category ?? {}) as Record<string, string>)).map(([category, value]) => [category, amount(value)])) as Partial<Record<CategoryId, Money>>;
  return { privateTotal: amount(data?.private_minor), sharedPart: amount(data?.shared_part_minor), consumption: amount(data?.consumption_minor), byCategory };
}

/** Meses con gastos compartidos o liquidaciones activos, de menor a mayor (`AAAA-MM`). */
export async function listCoupleMonths(client: SupabaseClient): Promise<string[]> {
  await requireClaims(client);
  const { data, error } = await client.from("couple_transaction_months").select("month").order("month");
  if (error) throw mapDbError(error);
  return (data ?? []).map(({ month }) => String(month).slice(0, 7));
}

/** Un gasto compartido activo de mi pareja activa, o `null`: ajeno, anulado, privado o inexistente dan lo mismo. */
export async function getSharedExpense(client: SupabaseClient, id: string): Promise<SharedTransaction | null> {
  await requireClaims(client);
  if (!UUID.test(id)) return null;
  const { data, error } = await client.from("couple_expenses").select("*").eq("id", id).maybeSingle();
  if (error) throw mapDbError(error);
  return data ? sharedTransaction(data as SharedExpenseTransport) : null;
}

export type MySharedPart = { id: string; transactionDate: string; categoryId: CategoryId; description: string | null; amount: Money; myPart: Money; payerUserId: string };
/** Los gastos compartidos del mes con mi parte (`my_shared_parts`), del más reciente al más antiguo. */
export async function listMySharedParts(client: SupabaseClient, month: string): Promise<MySharedPart[]> {
  await requireClaims(client);
  const { data, error } = await client.from("my_shared_parts").select("*").gte("transaction_date", firstDay(month)).lt("transaction_date", nextFirstDay(month)).order("transaction_date", { ascending: false });
  if (error) throw mapDbError(error);
  return (data ?? []).map((row) => ({ id: String(row.id), transactionDate: String(row.transaction_date), categoryId: row.category_id as CategoryId, description: (row.description ?? null) as string | null, amount: amount(row.amount_minor), myPart: amount(row.my_part_minor), payerUserId: String(row.payer_user_id) }));
}

/** El último gasto compartido que anotó esta persona (Q5: lo último que usó en Nosotros), o `null`. */
export async function getLastSharedExpenseBy(client: SupabaseClient, userId: string): Promise<SharedTransaction | null> {
  await requireClaims(client);
  if (!UUID.test(userId)) return null;
  const { data, error } = await client.from("couple_expenses").select("*").eq("created_by", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw mapDbError(error);
  return data ? sharedTransaction(data as SharedExpenseTransport) : null;
}
