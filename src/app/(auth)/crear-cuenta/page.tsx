// T045 / FR-022, FR-023, FR-025; 04·17 A2 con el aviso de versión privada de prueba, sin texto legal (Q9).
import { SignUpForm } from "@/features/auth/sign-up-form";
import { copy } from "@/lib/copy/es";

export const metadata = { title: `${copy.auth.signUp.title} · ${copy.shell.brand}` };

export default function SignUpPage() {
  return <SignUpForm />;
}
