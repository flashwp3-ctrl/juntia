"use client";
// T045 / FR-022, FR-028; 04·17 A1, A1b, A1c, A1d; aviso de verificado (caso límite) y S3 («Cerraste sesión en este
// dispositivo.»). A1b no dice cuál de los dos falló (US-1.4).
import Link from "next/link";
import { useActionState, useEffect, useSyncExternalStore } from "react";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/es";
import { ForgetInvitationIntent } from "@/features/couple/invitation-return";
import { resend, signIn, type FormState } from "./actions";
import { linkNoticeFromHash } from "./confirm";
import { PasswordInput, SubmitButton, authLink } from "./auth-ui";

// El fragmento se lee una sola vez por carga (después se borra de la URL); en el servidor no existe.
// Menor de la revisión del PR #43: se guarda solo el aviso ya interpretado (verificado, caducado o ninguno); la cadena
// del fragmento, que puede llevar tokens, no se conserva en ninguna variable.
let hashNotice: string | null | undefined;
const readHashNotice = () => (hashNotice === undefined ? (hashNotice = linkNoticeFromHash(window.location.hash)) : hashNotice);
const noSubscription = () => () => {};

type Props = { volver: string; notice: "verificado" | "sesion-cerrada" | "enlace" | null };

export function SignInForm({ volver, notice }: Props) {
  const [state, action] = useActionState<FormState, FormData>(signIn, {});
  const [resent, resendAction, resending] = useActionState<FormState, FormData>(resend, {});
  const network = state.error === copy.auth.networkError;
  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);
  // aviso=enlace: el enlace reenviado vuelve con el resultado en el fragmento (confirm.ts). Se lee una vez y se borra de
  // la URL sin usar ningún token.
  // En el servidor el fragmento no existe: "" significa «todavía sin leer» y no pinta ningún aviso.
  const fromHash = useSyncExternalStore(noSubscription, readHashNotice, () => "");
  const linkNotice = notice === "enlace" && fromHash !== "" ? (fromHash ?? copy.auth.recover.linkExpired) : null;
  useEffect(() => {
    if (notice === "enlace" && window.location.hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, [notice]);
  return (
    <>
      <p aria-hidden="true" className="flex items-center gap-2 font-serif text-[1.625rem] leading-none font-medium tracking-[-0.015em] text-ink lg:hidden">
        <span className="size-[9px] rounded-[3px] bg-primary" />
        {copy.shell.brand}
      </p>
      {/* PR B de la 003 (contracts/server-actions.md §3, punto 6): al cerrar sesión se borra la invitación guardada. */}
      {notice === "sesion-cerrada" ? <><ForgetInvitationIntent /><InlineNotice tone="success" icon="check-circle">{copy.auth.signIn.signedOut}</InlineNotice></> : null}
      {notice === "verificado" || linkNotice === copy.auth.signIn.verified ? <InlineNotice tone="success" icon="check-circle">{copy.auth.signIn.verified}</InlineNotice> : null}
      {linkNotice === copy.auth.recover.linkExpired ? <InlineNotice tone="danger" icon="warning-circle">{copy.auth.recover.linkExpired}</InlineNotice> : null}
      <h1 className={`@container/title font-serif text-[clamp(2.125rem,calc((100vw-3rem)*0.128),2.875rem)] leading-[0.98] lg:text-[2.75rem] font-medium tracking-[-0.01em] text-ink ${notice || state.error ? "mt-1" : "mt-7 lg:mt-2"}`}>
        {/* Dos líneas, como el comp, y un tamaño con el que «Lo tuyo, lo mío y» cabe en la columna con la fuente real y con su
            respaldo (que mide un 3 % más): con 48 px la línea medía 360 px reales y 371 de respaldo en una columna de 360, y
            la llegada de la fuente movía el titular (CLS 0,0053 con el arnés de T053). A 390 px, 48 no cabía ni con la real. */}
        {/* 005 · PR B (aprobado por el gestor, 19 nov 2026): en Firefox el primer fotograma se pinta antes que Brygada y que su
            respaldo local, con la serif del sistema, y esta línea cortaba en dos; el titular subía 43 px al llegar Brygada (parcial
            44445684478). Con la columna de 20rem o más (escala normal) no corta con ninguna fuente; con el texto al 200 % vuelve a
            poder cortar (FR-042). En reposo mide 321 px de 342. */}
        <span className="block @min-[20rem]/title:whitespace-nowrap">{copy.auth.signIn.titleLead}</span>{" "}
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
      <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[0.875rem]">
        <Link href="/recuperar" className={`${authLink} relative inline-flex min-h-11 items-center`}>{copy.auth.signIn.forgot}</Link>
        {/* Alineado a la derecha, su ancho cambia unos píxeles al llegar la fuente. Con dirección rtl, el punto de partida
            que mide Layout Instability es su esquina derecha, que no se mueve (CLS 0,000009 medido en el runner). El texto
            no tiene signos que la dirección pueda reordenar. */}
        <Link href="/crear-cuenta" className={`${authLink} relative inline-flex min-h-11 items-center [direction:rtl]`}>{copy.auth.signIn.createAccount}</Link>
      </p>
    </>
  );
}
