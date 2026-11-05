"use client";
// T045 / FR-022; 04·17 A5. Mínimo 8 caracteres, aplicado también por Auth (F37-7); `weak_password` y `same_password` se
// muestran en el campo. El comp añade una nota sobre cerrar otras sesiones que P0-1 no garantiza: no se muestra.
import { useActionState } from "react";
import { InlineNotice } from "@/components/ui/inline-notice";
import { copy } from "@/lib/copy/es";
import { setNewPassword, type FormState } from "./actions";
import { BackToSignIn, PasswordInput, SubmitButton } from "./auth-ui";

export function NewPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(setNewPassword, {});
  return (
    <>
      <BackToSignIn />
      <h1 className="font-serif text-[40px] leading-none font-medium tracking-[-0.01em] text-ink">{copy.auth.newPassword.title}</h1>
      {state.error && !state.field ? <InlineNotice tone="danger" icon="wifi-slash">{state.error}</InlineNotice> : null}
      <form action={action} noValidate className="flex flex-col gap-5">
        <PasswordInput label={copy.auth.newPassword.label} name="password" autoComplete="new-password" help={copy.auth.newPassword.help} error={state.field === "password" ? state.error : undefined} />
        <PasswordInput label={copy.auth.newPassword.repeat} name="repeat" autoComplete="new-password" placeholder={copy.auth.newPassword.repeatPlaceholder} error={state.field === "repeat" ? state.error : undefined} />
        <SubmitButton icon="check" pendingLabel={copy.auth.newPassword.submitting}>{copy.auth.newPassword.submit}</SubmitButton>
      </form>
    </>
  );
}
