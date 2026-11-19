"use client";
// T045 / FR-022, FR-023, FR-025; 04·17 A2. El comp dibuja «Acepto los Términos y la Política de privacidad»; P0-1 no
// tiene texto legal (Q9), así que la casilla confirma el aviso de versión privada de prueba y no enlaza nada.
import Link from "next/link";
import { useActionState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/es";
import { signUp, type FormState } from "./actions";
import { BackToSignIn, PasswordInput, SubmitButton, authLink, AuthTitle } from "./auth-ui";

export function SignUpForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, {});
  const fieldError = (field: FormState["field"]) => (state.field === field ? state.error : undefined);
  return (
    <>
      <BackToSignIn />
      <AuthTitle>{copy.auth.signUp.title}</AuthTitle>
      {state.error && !state.field ? <InlineNotice tone="danger" icon="wifi-slash">{state.error}</InlineNotice> : null}
      <form action={action} noValidate className="flex flex-col gap-5">
        <Input label={copy.auth.signUp.nameLabel} name="displayName" autoComplete="nickname" placeholder={copy.auth.signUp.namePlaceholder} help={copy.auth.signUp.nameHelp} defaultValue={state.name} key={`name-${state.name ?? ""}`} error={fieldError("name")} />
        <Input label={copy.auth.fields.email} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.email} key={`email-${state.email ?? ""}`} error={fieldError("email")} />
        <PasswordInput label={copy.auth.fields.password} name="password" autoComplete="new-password" placeholder={copy.auth.signUp.passwordPlaceholder} help={copy.auth.signUp.passwordHelp} error={fieldError("password")} />
        <div className="flex flex-col gap-2">
          <InlineNotice icon="info">{copy.auth.signUp.notice}</InlineNotice>
          <label className="group flex min-h-11 cursor-pointer items-start gap-2.5 text-[0.8125rem] leading-[1.45] text-ink-secondary">
            <input type="checkbox" name="acknowledge" aria-invalid={state.field === "acknowledge" || undefined} className="peer sr-only" />
            <span aria-hidden="true" className="mt-px grid size-[22px] shrink-0 place-items-center rounded-[7px] border-[1.5px] border-border-emphasis text-transparent peer-checked:border-ink peer-checked:bg-ink peer-checked:text-canvas peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
              <AppIcon name="check" weight="bold" size={14} />
            </span>
            <span className="pt-0.5">{copy.auth.signUp.acknowledge}</span>
          </label>
          {state.field === "acknowledge" ? <p role="alert" className="text-[length:var(--label-s-size)] font-medium text-[var(--comp-danger-text-fg)]">{state.error}</p> : null}
        </div>
        <SubmitButton pendingLabel={copy.auth.signUp.submitting}>{copy.auth.signUp.submit}</SubmitButton>
      </form>
      <p className="text-[0.875rem]">
        <Link href="/entrar" className={`${authLink} relative inline-flex min-h-11 items-center`}>{copy.auth.signUp.haveAccount}</Link>
      </p>
    </>
  );
}
