export type CoupleStatus = "none" | "provisional" | "active";
export type InvitationView = Readonly<{ status: "pending" | "expired" | "accepted" | "cancelled" | "replaced"; expiresAt: string }>;
export function isExpired(invitation: InvitationView, now: Date): boolean {
  return new Date(invitation.expiresAt).valueOf() <= now.valueOf();
}
