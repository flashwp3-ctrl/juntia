// T045 / FR-022, FR-027, FR-028; 04·17 A1–A1d, aviso de verificado y S3. `volver` se valida en el dominio (R8.7).
import { safeReturnPath } from "@/domain/account";
import { SignInForm } from "@/features/auth/sign-in-form";
import { copy } from "@/lib/copy/es";

export const metadata = { title: copy.auth.signIn.submit };

type Props = { searchParams: Promise<{ volver?: string | string[]; aviso?: string | string[] }> };

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const volver = safeReturnPath(typeof params.volver === "string" ? params.volver : null);
  const notice = params.aviso === "verificado" || params.aviso === "sesion-cerrada" || params.aviso === "enlace" ? params.aviso : null;
  return <SignInForm volver={volver} notice={notice} />;
}
