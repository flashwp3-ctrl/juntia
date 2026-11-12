"use client";
// T045 / FR-022, FR-023; 04·17 A3. Mismo texto para cualquier resultado del registro, y el mismo aviso al reenviar
// (200 o 429). Ficha de 64 con el sobre en el fondo de categoría «hogar», como el comp.
import Link from "next/link";
import { useActionState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import { copy } from "@/lib/copy/es";
import { resend, type FormState } from "./actions";
import { BackToSignIn, SubmitButton } from "./auth-ui";

export function VerifyEmail() {
  const [state, action] = useActionState<FormState, FormData>(resend, {});
  return (
    <>
      <BackToSignIn />
      <span aria-hidden="true" className="mt-6 grid size-16 place-items-center rounded-[20px] bg-category-home-bg text-category-home-fg lg:mt-2">
        <AppIcon name="envelope-simple" weight="duotone" size={32} />
      </span>
      <h1 className="font-serif text-[2.5rem] leading-none font-medium tracking-[-0.01em] text-ink">{copy.auth.verifyEmail.title}</h1>
      <p className="text-[0.9375rem] leading-[1.5] text-pretty text-ink-secondary">
        {copy.auth.verifyEmail.description} {copy.auth.verifyEmail.spam}
      </p>
      {state.notice ? <InlineNotice tone="success" icon="check-circle">{state.notice}</InlineNotice> : null}
      {state.error ? <InlineNotice tone="danger" icon="wifi-slash">{state.error}</InlineNotice> : null}
      <form action={action}>
        <SubmitButton variant="secondary" icon="paper-plane-tilt" pendingLabel={copy.auth.verifyEmail.resending}>{copy.auth.verifyEmail.resend}</SubmitButton>
      </form>
      <Link href="/entrar" className="relative inline-flex h-12 items-center justify-center rounded-[var(--radius-lg)] border-[length:var(--border-strong)] border-border font-semibold text-ink">
        {copy.auth.verifyEmail.backToSignIn}
      </Link>
    </>
  );
}
