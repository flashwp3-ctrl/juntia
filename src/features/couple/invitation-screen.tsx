"use client";
// T033 / FR-013, FR-014, FR-056, FR-059; US-1 escenarios 5–7, 9 y 11; contracts/server-actions.md §3; research R5;
// 04·15 M5–M7. `/invitacion` es pública y su HTML no lleva ningún dato: todo lo decide el cliente.
// 1. Lee `#t=…`, lo guarda en el dispositivo y limpia el fragmento (intent.ts).
// 2. Sin sesión, M5: nada de la pareja ni de quien invita; «Entrar» y «Crear cuenta» vuelven aquí.
// 3. Con sesión, `inspect` revalida en el servidor (preview_invitation y la pareja de quien mira): M6 o M7, con el mismo
//    texto para todos los motivos salvo quien tiene su propia invitación pendiente (US-1.9).
// 4. «Aceptar invitación» con el contrato ok / rejected / unknown; con la respuesta perdida, «Comprobar estado» lleva a
//    M1 sin aceptar otra vez.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { initialOf } from "@/domain/account";
import { newIdempotencyKey } from "@/features/expenses/idempotency";
import { useWrite } from "@/features/shared/use-write";
import type { WriteAction, WriteError, WriteOutcome, WriteStatusOutcome } from "@/features/shared/write-result";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { invitationDay } from "./dates";
import { captureInvitationFragment, clearInvitationIntent, readInvitationIntent } from "./intent";
import { RichText } from "./rich-text";

export type InspectResult =
  | { state: "signedOut" }
  | { state: "valid"; inviterName: string; expiresAt: string; email: string; myName: string }
  | { state: "invalid"; reason: "generic" | "ownPending" }
  | { state: "error" };
type AcceptInput = { idempotencyKey: string; token: string };
export type InvitationActions = {
  inspect: (input: { token: string }) => Promise<InspectResult>;
  accept: (input: AcceptInput) => Promise<WriteOutcome<{ groupId: string }>>;
  checkStatus: (input: { action: WriteAction; idempotencyKey: string }) => Promise<WriteStatusOutcome<unknown>>;
};

type Screen =
  | { kind: "loading" }
  | { kind: "signedOut" }
  | { kind: "valid"; inviterName: string; expiresAt: string; email: string; myName: string }
  | { kind: "invalid"; message: string; toPartner: boolean }
  | { kind: "error" };

const volver = encodeURIComponent("/invitacion");
const linkPrimary = "inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--comp-button-primary-bg)] px-5 text-base font-semibold text-[var(--comp-button-primary-fg)] shadow-[var(--comp-button-primary-highlight),var(--comp-button-primary-edge)] hover:bg-primary-hover active:bg-primary-pressed";
const linkSecondary = "inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-raised px-5 text-base font-semibold text-ink shadow-raised";

function Brand() {
  return (
    <p aria-hidden="true" className="flex items-center gap-2 font-serif text-[1.625rem] leading-none font-medium tracking-[-0.015em] text-ink lg:hidden">
      <span className="size-[9px] rounded-[3px] bg-primary" />
      {copy.shell.brand}
    </p>
  );
}

function Tile({ icon }: { icon: AppIconName }) {
  return (
    <span aria-hidden="true" className="mt-10 grid size-16 place-items-center rounded-[20px] bg-category-restaurants-bg text-category-restaurants-fg lg:mt-2">
      <AppIcon name={icon} weight="duotone" size={32} />
    </span>
  );
}

const Title = ({ children }: { children: string }) => (
  <h1 className="font-serif text-[clamp(2rem,10vw,2.375rem)] leading-[1.05] font-normal tracking-[-0.01em] text-balance text-ink">{children}</h1>
);

function HowRow({ icon, text }: { icon: AppIconName; text: string }) {
  return (
    <li className="flex items-start gap-2.5 py-[7px] text-[0.875rem] leading-[1.45] text-ink-secondary">
      <AppIcon name={icon} size={18} className="mt-px shrink-0 text-ink" />
      <span className="min-w-0 text-pretty"><RichText text={text} /></span>
    </li>
  );
}

function toScreen(result: InspectResult): Screen {
  if (result.state === "signedOut") return { kind: "signedOut" };
  if (result.state === "valid") return { kind: "valid", inviterName: result.inviterName, expiresAt: result.expiresAt, email: result.email, myName: result.myName };
  if (result.state === "invalid") return { kind: "invalid", message: result.reason === "ownPending" ? copy.couple.invitation.ownPending : copy.couple.invitation.invalidDescription, toPartner: result.reason === "ownPending" };
  return { kind: "error" };
}

function rejectedScreen(error: WriteError): Screen | null {
  if (error === "invalid") return { kind: "invalid", message: copy.couple.invitation.invalidDescription, toPartner: false };
  if (error === "alreadyInCouple") return { kind: "invalid", message: copy.couple.errors.alreadyInCouple, toPartner: true };
  return null;
}

function Valid({ screen, token, actions }: { screen: Extract<Screen, { kind: "valid" }>; token: string; actions: InvitationActions; }) {
  const router = useRouter();
  // La clave nace al mostrar M6 y se reutiliza en cada reintento de esta apertura (FR-059).
  const key = useRef(newIdempotencyKey());
  const [notice, setNotice] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Screen | null>(null);
  const check = useCallback((input: { action: WriteAction; idempotencyKey: string }) => actions.checkStatus(input) as Promise<WriteStatusOutcome<{ groupId: string }>>, [actions]);
  const accept = useWrite<AcceptInput, { groupId: string }>({
    action: "accept_invitation", run: actions.accept, check,
    onOk: () => { clearInvitationIntent(); router.replace("/cuenta/pareja"); },
    onRejected: (error) => {
      const next = rejectedScreen(error);
      if (next) { clearInvitationIntent(); setOutcome(next); return; }
      setNotice(error === "sessionExpired" ? copy.errors.sessionExpired : copy.errors.unexpected);
    },
  });
  if (outcome?.kind === "invalid") return <Invalid screen={outcome} />;
  const { state } = accept;
  return (
    <>
      <Brand />
      <div aria-hidden="true" className="mt-1 flex">
        <Avatar person={1} initial={initialOf(screen.inviterName)} size={64} />
        <span className="-ml-3 flex rounded-[21px] shadow-[0_0_0_3px_var(--color-surface-canvas)] lg:shadow-[0_0_0_3px_var(--color-surface-raised)]">
          <Avatar person={2} initial={initialOf(screen.myName)} size={64} />
        </span>
      </div>
      <Title>{copy.couple.invitation.valid.title(screen.inviterName)}</Title>
      <ul className="flex flex-col rounded-[18px] bg-raised px-4 py-3.5 shadow-raised lg:bg-overlay lg:shadow-none">
        <HowRow icon="users-three" text={copy.couple.invitation.valid.shared} />
        <HowRow icon="lock-simple" text={copy.couple.invitation.valid.private} />
        <HowRow icon="scales" text={copy.couple.invitation.valid.money} />
      </ul>
      <p className="text-[0.75rem] leading-[1.45] [overflow-wrap:anywhere] text-ink-secondary">{copy.couple.invitation.valid.line(screen.email, invitationDay(screen.expiresAt))}</p>
      {notice ? <InlineNotice tone="danger" icon="warning-circle">{notice}</InlineNotice> : null}
      {state.phase === "unknown" ? <WriteUnknown checking={state.checking} notFound={state.notFound} onRetry={() => void accept.retry()} onCheck={() => void accept.checkStatus()} /> : null}
      <div className="flex flex-col gap-2">
        <Button size="lg" icon="check" className="w-full" loading={state.phase === "pending"} loadingLabel={copy.couple.invitation.valid.accepting} disabled={accept.locked || state.phase === "ok"}
          onClick={() => void accept.submit({ idempotencyKey: key.current, token })}>
          {copy.couple.invitation.valid.accept}
        </Button>
        <Button variant="ghost" className="h-12 w-full" disabled={accept.locked || state.phase === "pending"} onClick={() => { clearInvitationIntent(); router.replace("/"); }}>
          {copy.couple.invitation.valid.later}
        </Button>
      </div>
    </>
  );
}

function Invalid({ screen }: { screen: Extract<Screen, { kind: "invalid" }> }) {
  useEffect(() => clearInvitationIntent(), []);
  return (
    <>
      <Brand />
      <Tile icon="link-break" />
      <Title>{copy.couple.invitation.invalid}</Title>
      <p className="text-[0.9375rem] leading-[1.5] text-pretty text-ink-secondary">{screen.message}</p>
      {screen.toPartner ? null : <InlineNotice icon="info">{copy.couple.invitation.invalidNote}</InlineNotice>}
      {screen.toPartner ? (
        <Link href="/cuenta/pareja" className={linkSecondary}><AppIcon name="users-three" weight="bold" size={17} />{copy.couple.invitation.toPartner}</Link>
      ) : (
        <Link href="/" className={linkSecondary}><AppIcon name="house-simple" weight="bold" size={17} />{copy.couple.invitation.home}</Link>
      )}
    </>
  );
}

export function InvitationScreen({ actions }: { actions: InvitationActions }) {
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });
  const [token, setToken] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    captureInvitationFragment();
    const current = readInvitationIntent();
    const next: Promise<Screen> = current
      ? actions.inspect({ token: current }).then(toScreen, () => ({ kind: "error" }))
      : Promise.resolve({ kind: "invalid", message: copy.couple.invitation.invalidDescription, toPartner: false });
    void next.then((screen) => {
      if (!live) return;
      setToken(current);
      setScreen(screen);
    });
    return () => { live = false; };
  }, [actions, attempt]);

  // Otro enlace pegado con /invitacion ya abierta solo cambia el fragmento: se vuelve a leer y a revalidar.
  useEffect(() => {
    const again = () => { setScreen({ kind: "loading" }); setAttempt((value) => value + 1); };
    window.addEventListener("hashchange", again);
    return () => window.removeEventListener("hashchange", again);
  }, []);

  if (screen.kind === "loading") {
    return (
      <div aria-busy="true" className="flex flex-col gap-5">
        <Brand />
        <p role="status" className="mt-10 flex items-center gap-2 text-[0.9375rem] text-ink-secondary lg:mt-2">
          <AppIcon name="circle-notch" weight="bold" size={18} className="motion-safe:animate-[button-spin_0.8s_linear_infinite]" />
          {copy.couple.invitation.loading}
        </p>
      </div>
    );
  }
  if (screen.kind === "signedOut") {
    return (
      <>
        <Brand />
        <Tile icon="envelope-open" />
        <Title>{copy.couple.invitation.signedOut.title}</Title>
        <p className="text-[0.9375rem] leading-[1.5] text-pretty text-ink-secondary">{copy.couple.invitation.signedOut.description}</p>
        <div className="flex flex-col gap-2">
          <Link href={`/entrar?volver=${volver}`} className={linkPrimary}><AppIcon name="sign-in" weight="bold" size={17} />{copy.couple.invitation.signedOut.signIn}</Link>
          <Link href={`/crear-cuenta?volver=${volver}`} className={linkSecondary}><AppIcon name="user-plus" weight="bold" size={17} />{copy.couple.invitation.signedOut.signUp}</Link>
        </div>
        <p className="text-[0.75rem] leading-[1.45] text-ink-secondary">{copy.couple.invitation.signedOut.note}</p>
      </>
    );
  }
  if (screen.kind === "valid" && token) return <Valid screen={screen} token={token} actions={actions} />;
  if (screen.kind === "invalid") return <Invalid screen={screen} />;
  return (
    <>
      <Brand />
      <Tile icon="wifi-slash" />
      <Title>{copy.couple.invitation.signedOut.title}</Title>
      <InlineNotice tone="danger" icon="wifi-slash">{copy.auth.networkError}</InlineNotice>
      <Button size="lg" variant="secondary" icon="arrow-clockwise" className="w-full" onClick={() => { setScreen({ kind: "loading" }); setAttempt((value) => value + 1); }}>{copy.states.retry}</Button>
    </>
  );
}
