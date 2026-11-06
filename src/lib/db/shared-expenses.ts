import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAmountMinor, serializeAmountMinor } from "@/domain/money";
import type { SharedExpenseInput,SharedExpenseTransport,SharedTransaction,VoidTransactionInput,VoidResult } from "./types";
import { DbError } from "./errors";
import { requireClaims } from "./session";
import { withRetry } from "./retry";
import { afterFilter,monthBounds,readByCursor,type PageOptions } from "./paginate";
import type {Allocation,SplitMode} from "@/domain/allocations";

/** F52-1 / FR-019a: el dominio admite una selección explícita de un integrante.
 * Antes de enviar a SQL, equal con UNA allocation se traduce a percent 100/0;
 * el cero y el orden se completan con couple_members, nunca se infieren de pesos.
 * Dos allocations equal se conservan, incluso si el redondeo de $1 da 1/0.
 * Percent de uno se normaliza a 100/0; amount conserva sus importes explícitos.
 * Esta misma frontera se usa para crear, editar y reclasificar.
 */
export async function sharedSplitArgs(client:SupabaseClient,input:{splitMode:SplitMode;splitPercents:readonly number[]|null;allocations:readonly Allocation[]}) {
  const parts=Object.fromEntries(input.allocations.map(a=>[a.userId,serializeAmountMinor(a.amount)]));
  const original={p_split_mode:input.splitMode,p_split_percents:input.splitPercents,p_parts:parts};
  if(input.allocations.length!==1 || !["equal","percent","amount"].includes(input.splitMode)) return original;
  const members=await withRetry<{user_id:string;join_order:number}[]>(()=>client.from("couple_members").select("user_id,join_order").order("join_order"));
  if(members.length!==2 || members[0].join_order!==1 || members[1].join_order!==2) throw new DbError("coupleNotActive");
  const selected=input.allocations[0];
  if(!members.some(m=>m.user_id===selected.userId)) throw new DbError("notCoupleMember");
  return {p_split_mode:input.splitMode==="amount"?"amount":"percent",p_split_percents:input.splitMode==="amount"?null:members.map(m=>m.user_id===selected.userId?100:0),
    p_parts:Object.fromEntries(members.map(m=>[m.user_id,m.user_id===selected.userId?serializeAmountMinor(selected.amount):"0"]))};
}
export function sharedTransaction(row:SharedExpenseTransport):SharedTransaction {
  if(typeof row.amount_minor!=="string" || !row.parts || Object.values(row.parts).some(v=>typeof v!=="string")) throw new DbError("unexpected");
  return {id:row.id,transactionDate:row.transaction_date,createdAt:row.created_at,updatedAt:row.updated_at,categoryId:row.category_id,description:row.description,
    amount:parseAmountMinor(row.amount_minor),payerUserId:row.payer_user_id,splitMode:row.split_mode,splitPercents:row.split_percents,
    allocations:Object.entries(row.parts).map(([userId,value])=>({userId,amount:parseAmountMinor(value)})),status:"active",version:row.version,createdBy:row.created_by,updatedBy:row.updated_by,movedFromMe:row.moved_from_me};
}
async function args(client:SupabaseClient,input:SharedExpenseInput) {
  return {p_idempotency_key:input.idempotencyKey,p_amount_minor:serializeAmountMinor(input.amount),p_category_id:input.categoryId,p_transaction_date:input.transactionDate,p_description:input.description,
    p_payer_user_id:input.payerUserId,...await sharedSplitArgs(client,input)};
}
export async function createSharedExpense(client:SupabaseClient,input:SharedExpenseInput) {
  await requireClaims(client);const params=await args(client,input);return sharedTransaction(await withRetry<SharedExpenseTransport>(()=>client.rpc("create_shared_expense",params)));
}
export async function updateSharedExpense(client:SupabaseClient,input:SharedExpenseInput&{transactionId:string;expectedVersion:number}) {
  await requireClaims(client);const params=await args(client,input);return sharedTransaction(await withRetry<SharedExpenseTransport>(()=>client.rpc("update_shared_expense",{...params,p_transaction_id:input.transactionId,p_expected_version:input.expectedVersion})));
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
