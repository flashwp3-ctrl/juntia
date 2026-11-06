import "server-only";
// T032, T034, T035 / FR-010, FR-015, FR-017; contracts/database.md («Lecturas»): Mi pareja y el shell leen `my_couple`
// (estado, rol, orden de ingreso, versión y, solo para la propietaria de una pareja provisional, la invitación sin el
// hash) y, con la pareja activa, `couple_members` (nombre visible y orden, nunca el correo). Una lectura por petición.
import { cache } from "react";
import { getMyCouple, listCoupleMembers } from "@/lib/db/couple";
import { getSessionIdentity } from "@/lib/db/session";
import { createClient } from "@/lib/supabase/server";

export type CoupleMember = { userId: string; name: string; role: "owner" | "member"; joinOrder: 1 | 2; isMe: boolean };
export type CoupleSummary =
  | { status: "none" }
  | { status: "provisional"; groupId: string; version: number; invitation: { email: string; expiresAt: string; expired: boolean } | null }
  | { status: "active"; groupId: string; version: number; joinOrder: 1 | 2; members: CoupleMember[] };

export const loadCouple = cache(async (): Promise<CoupleSummary> => {
  const client = await createClient();
  const [identity, couple] = await Promise.all([getSessionIdentity(client), getMyCouple(client)]);
  if (!couple) return { status: "none" };
  if (couple.status === "provisional") {
    const invitation = couple.invitation_email && couple.invitation_expires_at
      ? { email: couple.invitation_email, expiresAt: couple.invitation_expires_at, expired: couple.invitation_expired === true }
      : null;
    return { status: "provisional", groupId: couple.group_id, version: couple.version, invitation };
  }
  const members = (await listCoupleMembers(client)).map((member) => ({
    userId: member.user_id, name: member.display_name, role: member.role, joinOrder: member.join_order, isMe: member.user_id === identity?.userId,
  }));
  return { status: "active", groupId: couple.group_id, version: couple.version, joinOrder: couple.join_order, members };
});

/** Para el shell: si la lectura falla, sin pareja conocida (color de la persona 1 y sin nombre del otro), sin romper la página. */
export async function loadCoupleForShell(): Promise<CoupleSummary | null> {
  try {
    return await loadCouple();
  } catch {
    return null;
  }
}

export const personOf = (couple: CoupleSummary | null): 1 | 2 => (couple?.status === "active" ? couple.joinOrder : 1);
export const partnerOf = (couple: CoupleSummary | null) => (couple?.status === "active" ? couple.members.find((member) => !member.isMe)?.name ?? null : null);
