import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAmountMinor,serializeAmountMinor,type Money } from "@/domain/money";
import type { SettlementTransport,VoidResult } from "./types";
import { DbError,mapDbError } from "./errors";
import { requireClaims } from "./session";
import { withRetry } from "./retry";
import { afterFilter,monthBounds,readByCursor,type PageOptions } from "./paginate";
export function settlement(row:SettlementTransport) {
  if(typeof row.amount_minor!=="string") throw new DbError("unexpected");
  return {id:row.id,settlementDate:row.settlement_date,fromUserId:row.from_user_id,toUserId:row.to_user_id,amount:parseAmountMinor(row.amount_minor),note:row.note,status:row.status,version:row.version,createdAt:row.created_at,
    createdBy:row.created_by??"",voidedBy:row.voided_by??null,voidedAt:row.voided_at??null,
    pendingBefore:row.pending_before===undefined?undefined:parseAmountMinor(row.pending_before),pendingAfter:row.pending_after===undefined?undefined:parseAmountMinor(row.pending_after)};
}
export async function registerSettlement(client:SupabaseClient,input:{idempotencyKey:string;amount:Money;settlementDate:string;note:string|null}) {
  await requireClaims(client);return settlement(await withRetry<SettlementTransport>(()=>client.rpc("register_settlement",{p_idempotency_key:input.idempotencyKey,p_amount_minor:serializeAmountMinor(input.amount),p_settlement_date:input.settlementDate,p_note:input.note})));
}
export async function voidSettlement(client:SupabaseClient,input:{idempotencyKey:string;settlementId:string;expectedVersion:number;reason:"void"|"undo"}) {
  await requireClaims(client);return withRetry<VoidResult>(()=>client.rpc("void_settlement",{p_idempotency_key:input.idempotencyKey,p_settlement_id:input.settlementId,p_expected_version:input.expectedVersion,p_reason:input.reason}));
}
export async function listSettlements(client:SupabaseClient,month?:string,options:PageOptions={}) {
  await requireClaims(client);const range=monthBounds(month);
  const rows=await readByCursor<SettlementTransport&{transaction_date:string}>(async(after,limit)=>{
    let q=client.from("couple_settlements").select("*");if(range) q=q.gte("settlement_date",range[0]).lt("settlement_date",range[1]);if(after) q=q.or(afterFilter(after,"desc","settlement_date"));
    const {data,error}=await q.order("settlement_date",{ascending:false}).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(limit);
    if(error) throw mapDbError(error);
    return {data:(data as SettlementTransport[]).map(row=>({...row,transaction_date:row.settlement_date})),error:null};
  },options);return rows.map(settlement);
}

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** PR D (T062): una liquidación de mi pareja activa, activa o anulada, o `null` (ajena o inexistente dan lo mismo). */
export async function getSettlement(client:SupabaseClient,id:string) {
  await requireClaims(client);if(!UUID.test(id)) return null;
  const {data,error}=await client.from("couple_settlements").select("*").eq("id",id).maybeSingle();
  if(error) throw mapDbError(error);
  return data?settlement(data as SettlementTransport):null;
}
