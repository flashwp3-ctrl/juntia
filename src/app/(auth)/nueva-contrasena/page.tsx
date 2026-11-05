// T045 / FR-022; 04·17 A5. Solo con la sesión de recuperación que crea /auth/confirm (proxy.ts lleva sin sesión a A4).
import { NewPasswordForm } from "@/features/auth/new-password-form";
import { copy } from "@/lib/copy/es";

export const metadata = { title: `${copy.auth.newPassword.title} · ${copy.shell.brand}` };

export default function NewPasswordPage() {
  return <NewPasswordForm />;
}
