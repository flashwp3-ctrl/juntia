// T045 / FR-022; 04·17 A5. F43-4 (revisión del PR #43): solo con una sesión de recuperación reciente, comprobada en el
// servidor por el claim `amr` (src/features/auth/recovery-session.ts). Sin sesión, proxy.ts lleva a A4 con el aviso de
// enlace caducado; con una sesión normal, esta página lleva a Seguridad y sesión, donde se pide el enlace seguro (G1).
import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/features/auth/new-password-form";
import { isRecentRecovery } from "@/features/auth/recovery-session";
import { copy } from "@/lib/copy/es";
import { getSessionClaims } from "@/lib/db/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `${copy.auth.newPassword.title} · ${copy.shell.brand}` };

export default async function NewPasswordPage() {
  const claims = await getSessionClaims(await createClient());
  if (!claims) redirect("/recuperar?enlace=caducado");
  if (!isRecentRecovery(claims)) redirect("/cuenta/seguridad");
  return <NewPasswordForm />;
}
