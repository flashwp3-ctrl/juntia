import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAmountMinor, serializeAmountMinor } from "@/domain/money";
import type { Transaction } from "@/domain/transactions";
import type { CreateTransactionInput, UpdateTransactionInput, VoidTransactionInput, VoidResult, TransactionTransport } from "./types";
import { DbError, mapDbError } from "./errors";
import { withRetry } from "./retry";
import { requireClaims } from "./session";
function transaction(row: TransactionTransport): Transaction {
  if (typeof row.amount_minor !== "string" || row.currency !== "COP") throw new DbError("unexpected");
  return { id: row.id, type: row.type, categoryId: row.category_id, transactionDate: row.transaction_date,
    description: row.description, amount: parseAmountMinor(row.amount_minor), status: "active", version: row.version,
    createdAt: row.created_at, updatedAt: row.updated_at };
}
function args(input: CreateTransactionInput | UpdateTransactionInput) {
  return { p_idempotency_key: input.idempotencyKey, p_amount_minor: serializeAmountMinor(input.amount),
    p_category_id: input.categoryId, p_transaction_date: input.transactionDate, p_description: input.description };
}
export async function createTransaction(client: SupabaseClient, input: CreateTransactionInput): Promise<Transaction> {
  await requireClaims(client);
  const params = { ...args(input), p_type: input.type };
  return transaction(await withRetry<TransactionTransport>(() => client.rpc("create_transaction", params)));
}
export async function updateTransaction(client: SupabaseClient, input: UpdateTransactionInput): Promise<Transaction> {
  await requireClaims(client);
  const params = { ...args(input), p_transaction_id: input.transactionId, p_expected_version: input.expectedVersion };
  return transaction(await withRetry<TransactionTransport>(() => client.rpc("update_transaction", params)));
}
export async function voidTransaction(client: SupabaseClient, input: VoidTransactionInput): Promise<VoidResult> {
  await requireClaims(client);
  const params = { p_idempotency_key: input.idempotencyKey, p_transaction_id: input.transactionId, p_expected_version: input.expectedVersion, p_reason: input.reason };
  return withRetry<VoidResult>(() => client.rpc("void_transaction", params));
}
export async function listTransactions(client: SupabaseClient, month?: string): Promise<Transaction[]> {
  await requireClaims(client);
  let query = client.from("my_transactions").select("*").order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  if (month) {
    if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month)) throw new DbError("invalidDate");
    const [year, part] = month.split("-").map(Number);
    const next = part === 12 ? `${year + 1}-01` : `${year}-${String(part + 1).padStart(2, "0")}`;
    query = query.gte("transaction_date", `${month}-01`).lt("transaction_date", `${next}-01`);
  }
  const { data, error } = await query;
  if (error) throw mapDbError(error);
  return (data as TransactionTransport[]).map(transaction);
}
export async function listTransactionMonths(client: SupabaseClient): Promise<string[]> {
  await requireClaims(client);
  const { data, error } = await client.from("my_transaction_months").select("month").order("month");
  if (error) throw mapDbError(error);
  return data.map(({ month }) => month as string);
}
export async function listRecentCategories(client: SupabaseClient) {
  await requireClaims(client);
  const { data, error } = await client.from("my_recent_categories").select("category_id");
  if (error) throw mapDbError(error);
  return data.map(({ category_id }) => category_id as TransactionTransport["category_id"]);
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Un movimiento activo propio para el detalle (FR-037, lectura). Ajeno, anulado o inexistente dan lo mismo,
 * `transactionNotFound` (JT010): la RLS no deja distinguirlos y la pantalla tampoco lo intenta.
 */
export async function getTransaction(client: SupabaseClient, id: string): Promise<Transaction> {
  await requireClaims(client);
  if (!UUID.test(id)) throw new DbError("transactionNotFound");
  const { data, error } = await client.from("my_transactions").select("*").eq("id", id).maybeSingle();
  if (error) throw mapDbError(error);
  if (!data) throw new DbError("transactionNotFound");
  return transaction(data as TransactionTransport);
}
