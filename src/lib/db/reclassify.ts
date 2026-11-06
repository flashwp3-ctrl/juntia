import type { SupabaseClient } from "@supabase/supabase-js";
import type { Allocation,SplitMode } from "@/domain/allocations";
import { serializeAmountMinor } from "@/domain/money";
import type { SharedExpenseTransport } from "./types";
import { sharedTransaction } from "./shared-expenses";
import { requireClaims } from "./session";
import { withRetry } from "./retry";
export async function reclassifyToShared(client:SupabaseClient,input:{idempotencyKey:string;transactionId:string;expectedVersion:number;splitMode:SplitMode;splitPercents:readonly number[]|null;allocations:readonly Allocation[]}) {
  await requireClaims(client);const result=await withRetry<{voided_private_id:string;shared:SharedExpenseTransport}>(()=>client.rpc("reclassify_to_shared",{p_idempotency_key:input.idempotencyKey,p_transaction_id:input.transactionId,p_expected_version:input.expectedVersion,p_split_mode:input.splitMode,p_split_percents:input.splitPercents,p_parts:Object.fromEntries(input.allocations.map(a=>[a.userId,serializeAmountMinor(a.amount)]))}));
  return {voided_private_id:result.voided_private_id,shared:sharedTransaction(result.shared)};
}
export async function undoReclassifyToShared(client:SupabaseClient,input:{idempotencyKey:string;sharedTransactionId:string;expectedVersion:number}) {
  await requireClaims(client);return withRetry<{restored_private_id:string}>(()=>client.rpc("undo_reclassify_to_shared",{p_idempotency_key:input.idempotencyKey,p_shared_transaction_id:input.sharedTransactionId,p_expected_version:input.expectedVersion}));
}
