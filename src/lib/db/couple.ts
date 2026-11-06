import type { SupabaseClient } from "@supabase/supabase-js";
import { requireClaims } from "./session";
import { withRetry } from "./retry";
import { mapDbError } from "./errors";
import type { CoupleTransport,CoupleMemberTransport } from "./types";
type InvitationResult={group_id:string;invitation_id:string;expires_at:string;version?:number};
type VersionInput={idempotencyKey:string;groupId:string;expectedVersion:number};
async function call<T>(client:SupabaseClient,name:string,args:Record<string,unknown>):Promise<T> {
  await requireClaims(client);return withRetry<T>(()=>client.rpc(name,args));
}
export function createInvitation(client:SupabaseClient,input:{idempotencyKey:string;email:string;tokenHash:string}) {
  return call<InvitationResult>(client,"create_invitation",{p_idempotency_key:input.idempotencyKey,p_email:input.email,p_token_hash:input.tokenHash});
}
export function regenerateInvitation(client:SupabaseClient,input:VersionInput&{tokenHash:string}) {
  return call<InvitationResult>(client,"regenerate_invitation",{p_idempotency_key:input.idempotencyKey,p_group_id:input.groupId,p_expected_version:input.expectedVersion,p_token_hash:input.tokenHash});
}
export function cancelInvitation(client:SupabaseClient,input:VersionInput) {
  return call<{group_id:string;status:"discarded"}>(client,"cancel_invitation",{p_idempotency_key:input.idempotencyKey,p_group_id:input.groupId,p_expected_version:input.expectedVersion});
}
export function previewInvitation(client:SupabaseClient,tokenHash:string) {
  return call<{inviter_display_name:string;expires_at:string}>(client,"preview_invitation",{p_token_hash:tokenHash});
}
export function acceptInvitation(client:SupabaseClient,input:{idempotencyKey:string;tokenHash:string}) {
  return call<{group_id:string;status:"active"}>(client,"accept_invitation",{p_idempotency_key:input.idempotencyKey,p_token_hash:input.tokenHash});
}
export async function getMyCouple(client:SupabaseClient) {
  await requireClaims(client);const {data,error}=await client.from("my_couple").select("*").maybeSingle();if(error) throw mapDbError(error);return data as CoupleTransport|null;
}
export async function listCoupleMembers(client:SupabaseClient) {
  await requireClaims(client);const {data,error}=await client.from("couple_members").select("*").order("join_order");if(error) throw mapDbError(error);return data as CoupleMemberTransport[];
}
