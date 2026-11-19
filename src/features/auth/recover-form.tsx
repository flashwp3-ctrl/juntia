"use client";
// T045 / FR-022, FR-023; US-1.5; 04·17 A4 y A4b: el mismo «enlace enviado» exista o no la cuenta. Con `expired`, el
// aviso de enlace caducado o usado, sin ningún dato de la cuenta (caso límite). Con `otherBrowser`, el del enlace de
// recuperación abierto en otro navegador (enmienda del 5 nov 2026).
import { useActionState } from "react";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/es";
import { recover, type FormState } from "./actions";
import { BackToSignIn, SubmitButton, AuthTitle } from "./auth-ui";

export type RecoverNotice = "expired" | "otherBrowser" | null;

export function RecoverForm({ notice }: { notice: RecoverNotice }) {
  const [state, action] = useActionState<FormState, FormData>(recover, {});
  const sent = Boolean(state.notice);
  return (
    <>
      <BackToSignIn />
      {notice && !sent ? <InlineNotice tone="danger" icon="warning-circle">{notice === "otherBrowser" ? copy.auth.recover.otherBrowser : copy.auth.recover.linkExpired}</InlineNotice> : null}
      <AuthTitle>{copy.auth.recover.title}</AuthTitle>
      <p className="text-[0.9375rem] leading-[1.5] text-pretty text-ink-secondary">{copy.auth.recover.description}</p>
      <form action={action} noValidate className="flex flex-col gap-5">
        <Input label={copy.auth.fields.email} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.email} key={`email-${state.email ?? ""}`} readOnly={sent} error={state.field === "email" ? state.error : undefined} />
        {sent ? <InlineNotice tone="success" icon="check-circle">{state.notice}</InlineNotice> : null}
        {state.error && !state.field ? <InlineNotice tone="danger" icon="wifi-slash">{state.error}</InlineNotice> : null}
        {sent ? null : <SubmitButton icon="paper-plane-tilt" pendingLabel={copy.auth.recover.submitting}>{copy.auth.recover.submit}</SubmitButton>}
      </form>
    </>
  );
}
