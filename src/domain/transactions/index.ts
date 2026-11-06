import { type Money, MAX_COP_PESOS } from "../money";
export type TransactionType = "expense" | "income";
export type TransactionStatus = "active" | "voided";
export const CATEGORY_CATALOG = [
  { id: "market", kind: "expense" }, { id: "restaurants", kind: "expense" },
  { id: "home", kind: "expense" }, { id: "transport", kind: "expense" },
  { id: "health", kind: "expense" }, { id: "entertainment", kind: "expense" },
  { id: "shopping", kind: "expense" }, { id: "services", kind: "expense" },
  { id: "income", kind: "income" }, { id: "other", kind: "expense" },
] as const;
export type CategoryId = (typeof CATEGORY_CATALOG)[number]["id"];
export type TransactionDraft = Readonly<{
  type: TransactionType; amount: Money; categoryId: CategoryId;
  transactionDate: string; description: string | null;
}>;
export type Transaction = TransactionDraft & Readonly<{
  id: string; status: TransactionStatus; version: number; createdAt: string; updatedAt: string;
}>;
export type DraftError = "invalidType" | "amountOutOfRange" | "invalidCategory" | "invalidDate" | "descriptionTooLong";
export function validateDraft(draft: TransactionDraft): DraftError[] {
  const errors: DraftError[] = [];
  if (draft.type !== "expense" && draft.type !== "income") errors.push("invalidType");
  if (draft.amount.amountMinor <= 0n || draft.amount.amountMinor > MAX_COP_PESOS * 100n || draft.amount.amountMinor % 100n !== 0n) errors.push("amountOutOfRange");
  if (!CATEGORY_CATALOG.some(({ id, kind }) => id === draft.categoryId && kind === draft.type)) errors.push("invalidCategory");
  const date = new Date(`${draft.transactionDate}T00:00:00Z`);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(draft.transactionDate) || draft.transactionDate.startsWith("0000") || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== draft.transactionDate) errors.push("invalidDate");
  if (draft.description !== null && [...draft.description.trim()].length > 140) errors.push("descriptionTooLong");
  return errors;
}
export function monthKey(date: string): string { return date.slice(0, 7); }
export function todayInBogota(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
const money = (amountMinor: bigint): Money => ({ amountMinor, currency: "COP" });
export function monthSummary(rows: readonly Transaction[], month: string) {
  let expense = 0n; let income = 0n;
  const byCategory: Partial<Record<CategoryId, Money>> = {};
  for (const row of rows) {
    if (row.status !== "active" || monthKey(row.transactionDate) !== month) continue;
    if (row.type === "income") income += row.amount.amountMinor;
    else {
      expense += row.amount.amountMinor;
      byCategory[row.categoryId] = money((byCategory[row.categoryId]?.amountMinor ?? 0n) + row.amount.amountMinor);
    }
  }
  return { expenseTotal: money(expense), incomeTotal: money(income), byCategory };
}
export function groupByDay(rows: readonly Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const row of rows.filter(({ status }) => status === "active").sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.localeCompare(a.createdAt))) {
    const group = groups.get(row.transactionDate) ?? [];
    group.push(row); groups.set(row.transactionDate, group);
  }
  return [...groups].map(([date, transactions]) => ({ date, transactions }));
}
export function monthBounds(months: readonly string[], current: string) {
  const sorted = [...months.map(monthKey), monthKey(current)].sort();
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}
/** Suma o resta meses a una clave `AAAA-MM`, cruzando el año. */
export function shiftMonth(month: string, delta: number): string {
  const [year, part] = month.split("-").map(Number);
  const index = year * 12 + (part - 1) + delta;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
}
/**
 * Flechas de Actividad (FR-046; Q8, Q13): hasta el primer mes con movimientos y hasta el más lejano con movimientos,
 * incluidos los futuros, o el mes actual si queda fuera. Los meses vacíos entre medias se recorren; más allá, no.
 */
export function monthNavigation(months: readonly string[], current: string, selected: string) {
  const { min, max } = monthBounds(months, current);
  const month = clampMonth(months, current, selected);
  return { previous: month > min ? shiftMonth(month, -1) : null, next: month < max ? shiftMonth(month, 1) : null };
}
/**
 * F44-4 (revisión del PR #44). Un mes `AAAA-MM` del dominio de fechas de los movimientos: el mismo que admite
 * `transaction_date` (validateDraft y la función SQL rechazan el año 0000), de 0001-01 a 9999-12.
 */
export function isSupportedMonth(month: unknown): month is string {
  return typeof month === "string" && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month) && month >= "0001-01";
}
/** Lleva un mes al intervalo navegable de las flechas (del primer al último mes con movimientos, o el actual). */
export function clampMonth(months: readonly string[], current: string, month: string) {
  const { min, max } = monthBounds(months, current);
  return month < min ? min : month > max ? max : month;
}
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es").trim();
/** Búsqueda por descripción sin distinguir tildes ni mayúsculas (FR-047; research R8.9). */
export function matchesSearch(description: string | null, query: string): boolean {
  const needle = fold(query);
  return needle === "" || (description !== null && fold(description).includes(needle));
}
export type TransactionFilter = Readonly<{ query?: string; type?: TransactionType; categoryId?: CategoryId }>;
/** Filtros de Actividad dentro del mes: texto, tipo y categoría. No reordena ni muta. */
export function filterTransactions(rows: readonly Transaction[], { query = "", type, categoryId }: TransactionFilter): Transaction[] {
  return rows.filter((row) => (!type || row.type === type) && (!categoryId || row.categoryId === categoryId) && matchesSearch(row.description, query));
}
