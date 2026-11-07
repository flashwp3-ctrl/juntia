import type { SupabaseClient } from "@supabase/supabase-js";
import { requireClaims } from "./session";
import { withRetry } from "./retry";
/** Acciones de planificación admitidas por el protocolo compartido de recuperación. */
export const planningWriteActions=["create_budget","update_budget","create_goal","update_goal","complete_goal","archive_goal","contribute_to_goal","withdraw_from_goal","void_goal_entry","create_expense_with_goal","approve_usage_request","reject_usage_request","cancel_usage_request","remove_goal_usage"] as const;
export type PlanningWriteAction=(typeof planningWriteActions)[number];
export type WriteStatus = {state:"not_found"}|{state:"completed";result:unknown};
export async function writeStatus(client:SupabaseClient,action:string,idempotencyKey:string):Promise<WriteStatus> {
  await requireClaims(client);
  return withRetry<WriteStatus>(()=>client.rpc("write_status",{p_action:action,p_idempotency_key:idempotencyKey}));
}
