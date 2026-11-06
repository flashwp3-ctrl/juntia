// T032 / FR-010–FR-012a, FR-015, FR-016; US-1 escenarios 1–4 y 8–11; 04·15 M1–M4. El servidor lee `my_couple` y
// `couple_members` (load.ts) y la interfaz escribe por las Server Actions de invitación. `?invitar=1` abre M3 al llegar
// desde A6 o desde Nosotros sin pareja (FR-016).
import { AccountPageTitle } from "@/features/account/account-ui";
import { loadAccount } from "@/features/account/load-account";
import { cancelInvitationAction, checkInvitationWriteAction, createInvitationAction, regenerateInvitationAction } from "@/features/couple/actions";
import { loadCouple } from "@/features/couple/load";
import { PartnerScreen, type PartnerView } from "@/features/couple/partner-screen";
import { copy } from "@/lib/copy/es";

export const metadata = { title: `${copy.account.partner.title} · ${copy.shell.brand}` };

const actions = { create: createInvitationAction, regenerate: regenerateInvitationAction, cancel: cancelInvitationAction, checkStatus: checkInvitationWriteAction };

type Props = { searchParams: Promise<{ invitar?: string | string[] }> };

export default async function PartnerPage({ searchParams }: Props) {
  const [account, couple, { invitar }] = await Promise.all([loadAccount(), loadCouple(), searchParams]);
  if (!account) return null;
  const me = { name: account.profile.displayName };
  const view: PartnerView = couple.status === "active"
    ? { kind: "active", members: couple.members }
    : couple.status === "provisional" && couple.invitation
      ? { kind: "pending", me, groupId: couple.groupId, version: couple.version, email: couple.invitation.email, expiresAt: couple.invitation.expiresAt, expired: couple.invitation.expired }
      : { kind: "none", me };
  return (
    <>
      <AccountPageTitle title={copy.account.partner.title} />
      <PartnerScreen view={view} actions={actions} openInvite={invitar === "1"} />
    </>
  );
}
