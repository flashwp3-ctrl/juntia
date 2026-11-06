// 003 T004 · FR-010/011: «Vencida ... expires_at <= now()»; caduca exactamente a los siete días.
import { isExpired, type CoupleStatus, type InvitationView } from ".";
it("admite los estados sin pareja, provisional y activa y vence exactamente en el límite", () => {
  const statuses: CoupleStatus[] = ["none", "provisional", "active"];
  expect(statuses).toHaveLength(3);
  const invitation: InvitationView = { status: "pending", expiresAt: "2026-11-13T12:00:00Z" };
  expect(isExpired(invitation, new Date("2026-11-13T11:59:59.999Z"))).toBe(false);
  expect(isExpired(invitation, new Date("2026-11-13T12:00:00Z"))).toBe(true);
  expect(isExpired(invitation, new Date("2026-11-14T12:00:00Z"))).toBe(true);
});
