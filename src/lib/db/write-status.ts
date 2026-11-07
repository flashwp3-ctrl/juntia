import type { SupabaseClient } from "@supabase/supabase-js";
import { requireClaims } from "./session";
import { withRetry } from "./retry";
export type WriteStatus = {state:"not_found"}|{state:"completed";result:unknown};
export async function writeStatus(client:SupabaseClient,action:string,idempotencyKey:string):Promise<WriteStatus> {
  await requireClaims(client);
  return withRetry<WriteStatus>(()=>client.rpc("write_status",{p_action:action,p_idempotency_key:idempotencyKey}));
}
