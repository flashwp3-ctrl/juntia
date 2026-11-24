// T033 / FR-013, FR-014; contracts/server-actions.md §2–§3; research R5. Ruta pública (fuera de PRODUCT en
// src/lib/routes.ts): su HTML no lleva ningún dato de la pareja ni de quien invita. El token llega en el fragmento, que
// el navegador no envía, y la pantalla la decide el cliente. Sin Referer hacia recursos externos.
import type { Metadata } from "next";
import { AuthFrame } from "@/features/auth/auth-frame";
import { acceptInvitationAction, checkInvitationWriteAction, inspectInvitationAction } from "@/features/couple/actions";
import { InvitationScreen } from "@/features/couple/invitation-screen";
import { copy } from "@/lib/copy/es";

export const metadata: Metadata = { title: copy.couple.invitation.pageTitle, referrer: "no-referrer" };

const actions = { inspect: inspectInvitationAction, accept: acceptInvitationAction, checkStatus: checkInvitationWriteAction };

export default function InvitationPage() {
  return (
    <AuthFrame>
      <InvitationScreen actions={actions} />
    </AuthFrame>
  );
}
