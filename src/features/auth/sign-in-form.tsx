"use client";
// T045 / FR-022, FR-028; 04·17 A1, A1b, A1c, A1d; aviso de verificado (caso límite) y S3 («Cerraste sesión en este
// dispositivo.»). A1b no dice cuál de los dos falló (US-1.4).
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/es";
import { resend, signIn, type FormState } from "./actions";
import { PasswordInput, SubmitButton, authLink } from "./auth-ui";

type Props = { volver: string; notice: "verificado" | "sesion-cerrada" | null };

export function SignInForm({ volver, notice }: Props) {
  const [state, action] = useActionState<FormState, FormData>(signIn, {});
  const [resent, resendAction, resending] = useActionState<FormState, FormData>(resend, {});
  const network = state.error === copy.auth.networkError;
  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);
  return (
    <>
      <p aria-hidden="true" className="flex items-center gap-2 font-serif text-[26px] leading-none font-medium tracking-[-0.015em] text-ink lg:hidden">
        <span className="size-[9px] rounded-[3px] bg-primary" />
        {copy.shell.brand}
      </p>
      {notice === "sesion-cerrada" ? <InlineNotice tone="success" icon="check-circle">{copy.auth.signIn.signedOut}</InlineNotice> : null}
      {notice === "verificado" ? <InlineNotice tone="success" icon="check-circle">{copy.auth.signIn.verified}</InlineNotice> : null}
      <h1 className={`font-serif text-[clamp(34px,calc((100vw-48px)*0.128),46px)] leading-[0.98] lg:text-[44px] font-medium tracking-[-0.01em] text-ink ${notice || state.error ? "mt-1" : "mt-7 lg:mt-2"}`}>
        {/* Dos líneas, como el comp, y un tamaño con el que «Lo tuyo, lo mío y» cabe en la columna con la fuente real y con su
            respaldo (que mide un 3 % más): con 48 px la línea medía 360 px reales y 371 de respaldo en una columna de 360, y
            la llegada de la fuente movía el titular (CLS 0,0053 con el arnés de T053). A 390 px, 48 no cabía ni con la real. */}
        <span className="block">{copy.auth.signIn.titleLead}</span>{" "}
        <em className="block font-serif-italic italic">{copy.auth.signIn.titleEmphasis}</em>
      </h1>
      {state.resend ? (
        <InlineNotice icon="envelope-simple">
          <span className="font-semibold">{state.error}</span>{" "}
          <form action={resendAction} className="inline">
            <input type="hidden" name="email" value={state.email ?? ""} />
            <button type="submit" disabled={resending} className={`${authLink} relative inline-flex min-h-11 items-center align-middle`}>{copy.auth.signIn.resend}</button>
          </form>
          {resent.notice ? <span className="mt-1 block font-normal text-[var(--comp-field-muted-fg)]">{resent.notice}</span> : null}
        </InlineNotice>
      ) : null}
      {network ? <InlineNotice tone="danger" icon="wifi-slash">{state.error}</InlineNotice> : null}
      {state.error && !state.resend && !network && state.error !== copy.auth.signIn.invalidCredentials ? <InlineNotice tone="danger" icon="warning-circle">{state.error}</InlineNotice> : null}
      <form action={action} noValidate className="flex flex-col gap-5">
        <input type="hidden" name="volver" value={volver} />
        <Input label={copy.auth.fields.email} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.email} key={`email-${state.email ?? ""}`} />
        <PasswordInput
          label={copy.auth.fields.password}
          name="password"
          autoComplete="current-password"
          error={state.error === copy.auth.signIn.invalidCredentials ? state.error : undefined}
        />
        <SubmitButton icon="sign-in" pendingLabel={copy.auth.signIn.submitting}>{copy.auth.signIn.submit}</SubmitButton>
      </form>
      <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[14px]">
        <Link href="/recuperar" className={`${authLink} relative inline-flex min-h-11 items-center`}>{copy.auth.signIn.forgot}</Link>
        {/* Alineado a la derecha, su ancho cambia unos píxeles al llegar la fuente. Con dirección rtl, el punto de partida
            que mide Layout Instability es su esquina derecha, que no se mueve (CLS 0,000009 medido en el runner). El texto
            no tiene signos que la dirección pueda reordenar. */}
        <Link href="/crear-cuenta" className={`${authLink} relative inline-flex min-h-11 items-center [direction:rtl]`}>{copy.auth.signIn.createAccount}</Link>
      </p>
    </>
  );
}
