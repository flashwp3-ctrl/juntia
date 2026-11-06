import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAmountMinor, serializeAmountMinor } from "@/domain/money";
import type { SharedExpenseInput,SharedExpenseTransport,SharedTransaction,VoidTransactionInput,VoidResult } from "./types";
import { DbError } from "./errors";
import { requireClaims } from "./session";
import { withRetry } from "./retry";
import { afterFilter,monthBounds,readByCursor,type PageOptions } from "./paginate";
export function sharedTransaction(row:SharedExpenseTransport):SharedTransaction {
  if(typeof row.amount_minor!=="string" || !row.parts || Object.values(row.parts).some(v=>typeof v!=="string")) throw new DbError("unexpected");
  return {id:row.id,transactionDate:row.transaction_date,createdAt:row.created_at,updatedAt:row.updated_at,categoryId:row.category_id,description:row.description,
    amount:parseAmountMinor(row.amount_minor),payerUserId:row.payer_user_id,splitMode:row.split_mode,splitPercents:row.split_percents,
    allocations:Object.entries(row.parts).map(([userId,value])=>({userId,amount:parseAmountMinor(value)})),status:"active",version:row.version,createdBy:row.created_by,updatedBy:row.updated_by,movedFromMe:row.moved_from_me};
}
function args(input:SharedExpenseInput) {
  return {p_idempotency_key:input.idempotencyKey,p_amount_minor:serializeAmountMinor(input.amount),p_category_id:input.categoryId,p_transaction_date:input.transactionDate,p_description:input.description,
    p_payer_user_id:input.payerUserId,p_split_mode:input.splitMode,p_split_percents:input.splitPercents,p_parts:Object.fromEntries(input.allocations.map(a=>[a.userId,serializeAmountMinor(a.amount)]))};
}
export async function createSharedExpense(client:SupabaseClient,input:SharedExpenseInput) {
  await requireClaims(client);return sharedTransaction(await withRetry<SharedExpenseTransport>(()=>client.rpc("create_shared_expense",args(input))));
}
export async function updateSharedExpense(client:SupabaseClient,input:SharedExpenseInput&{transactionId:string;expectedVersion:number}) {
  await requireClaims(client);return sharedTransaction(await withRetry<SharedExpenseTransport>(()=>client.rpc("update_shared_expense",{...args(input),p_transaction_id:input.transactionId,p_expected_version:input.expectedVersion})));
}
export async function voidSharedExpense(client:SupabaseClient,input:VoidTransactionInput) {
  await requireClaims(client);return withRetry<VoidResult>(()=>client.rpc("void_shared_expense",{p_idempotency_key:input.idempotencyKey,p_transaction_id:input.transactionId,p_expected_version:input.expectedVersion,p_reason:input.reason}));
}
export async function listSharedExpenses(client:SupabaseClient,month?:string,options:PageOptions={}) {
  await requireClaims(client);const range=monthBounds(month);
  const rows=await readByCursor<SharedExpenseTransport>((after,limit)=>{
    let q=client.from("couple_expenses").select("*");if(range) q=q.gte("transaction_date",range[0]).lt("transaction_date",range[1]);if(after) q=q.or(afterFilter(after,"desc"));
    return q.order("transaction_date",{ascending:false}).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(limit);
  },options);return rows.map(sharedTransaction);
}
