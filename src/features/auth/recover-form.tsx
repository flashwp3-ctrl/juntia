"use client";
// T045 / FR-022, FR-023; US-1.5; 04·17 A4 y A4b: el mismo «enlace enviado» exista o no la cuenta. Con `expired`, el
// aviso de enlace caducado o usado, sin ningún dato de la cuenta (caso límite).
import { useActionState } from "react";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/es";
import { recover, type FormState } from "./actions";
import { BackToSignIn, SubmitButton } from "./auth-ui";

export function RecoverForm({ expired }: { expired: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(recover, {});
  const sent = Boolean(state.notice);
  return (
    <>
      <BackToSignIn />
      {expired && !sent ? <InlineNotice tone="danger" icon="warning-circle">{copy.auth.recover.linkExpired}</InlineNotice> : null}
      <h1 className="font-serif text-[40px] leading-none font-medium tracking-[-0.01em] text-ink">{copy.auth.recover.title}</h1>
      <p className="text-[15px] leading-[1.5] text-pretty text-ink-secondary">{copy.auth.recover.description}</p>
      <form action={action} noValidate className="flex flex-col gap-5">
        <Input label={copy.auth.fields.email} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.email} key={`email-${state.email ?? ""}`} readOnly={sent} error={state.field === "email" ? state.error : undefined} />
        {sent ? <InlineNotice tone="success" icon="check-circle">{state.notice}</InlineNotice> : null}
        {state.error && !state.field ? <InlineNotice tone="danger" icon="wifi-slash">{state.error}</InlineNotice> : null}
        {sent ? null : <SubmitButton icon="paper-plane-tilt" pendingLabel={copy.auth.recover.submitting}>{copy.auth.recover.submit}</SubmitButton>}
      </form>
    </>
  );
}
