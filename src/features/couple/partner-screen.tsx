"use client";
// T032, T035 / FR-010–FR-012a, FR-015, FR-017, FR-056, FR-059; US-1 escenarios 1–4, 8, 10, 10a y 11; precisiones F47-2
// y F47-3; 04·15 M1–M4 (anatomía de Cuenta aprobada, decisión 16.6). Mi pareja con los datos que el servidor leyó de
// `my_couple` y `couple_members`. Tres escrituras con el contrato ok / rejected / unknown (write-result.ts):
// - «Crear invitación» (M3 → M3b) y «Generar enlace nuevo» (M4 → enlace nuevo): la clave y el token nacen en el
//   navegador al abrir la hoja; el enlace se muestra una sola vez, en la respuesta. M4 nunca ofrece «Copiar enlace».
// - «Anular» con SensitiveActionConfirmation (foco en «Mantener»): descarta la pareja provisional y vuelve a M2.
// Tras cada escritura confirmada, `router.refresh()` trae el estado real del servidor (Q16).
// Decisión de los fundadores (6–7 nov 2026): la × de cerrar va a la derecha en todas las hojas y diálogos.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { DialogTitle, Modal } from "@/components/ui/modal";
import { initialOf } from "@/domain/account";
import { LimitNote } from "@/features/account/limit-note";
import { newIdempotencyKey } from "@/features/expenses/idempotency";
import { useWrite } from "@/features/shared/use-write";
import type { WriteAction, WriteError, WriteOutcome, WriteStatusOutcome } from "@/features/shared/write-result";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { useMediaQuery } from "@/lib/use-media-query";
import { CoupleStatus } from "./couple-status";
import { invitationDay } from "./dates";
import { invitationLink, tokenIntent, type TokenPair } from "./intent";
import { RichText } from "./rich-text";
import { SensitiveActionConfirmation } from "./sensitive-confirmation";

export type Member = { userId: string; name: string; role: "owner" | "member"; joinOrder: 1 | 2; isMe: boolean };
export type PartnerView =
  | { kind: "none"; me: { name: string } }
  | { kind: "pending"; me: { name: string }; groupId: string; version: number; email: string; expiresAt: string; expired: boolean }
  | { kind: "active"; members: Member[] };

type Issued = { expiresAt: string; invitationId: string };
type CreateInput = { idempotencyKey: string; email: string; token: string };
type RegenerateInput = { idempotencyKey: string; groupId: string; expectedVersion: number; token: string };
type CancelInput = { idempotencyKey: string; groupId: string; expectedVersion: number };
export type CoupleActions = {
  create: (input: CreateInput) => Promise<WriteOutcome<Issued>>;
  regenerate: (input: RegenerateInput) => Promise<WriteOutcome<Issued>>;
  cancel: (input: CancelInput) => Promise<WriteOutcome<{ status: "discarded" }>>;
  checkStatus: (input: { action: WriteAction; idempotencyKey: string }) => Promise<WriteStatusOutcome<unknown>>;
  /** F55-6: la invitación pendiente vigente, para revalidar un ok que llegó por «Reintentar» o «Comprobar estado». */
  currentInvitation: () => Promise<{ state: "read"; invitationId: string | null } | { state: "error" }>;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mensaje de un rechazo confirmado. `invalidEmail` va en el campo; el resto, en un aviso. */
function rejectedMessage(error: WriteError) {
  switch (error) {
    case "alreadyInCouple": return copy.couple.errors.alreadyInCouple;
    case "invitationGone": return copy.couple.errors.invitationGone;
    case "alreadyAccepted": return copy.couple.errors.alreadyAccepted;
    case "versionConflict": return copy.couple.errors.versionConflict;
    case "sessionExpired": return copy.errors.sessionExpired;
    case "invalidEmail": return copy.couple.invite.errors.email;
    default: return copy.errors.unexpected;
  }
}
/** Rechazos que dicen que Mi pareja cambió en el servidor: se relee (M4 → M1 con JT103, F49-3 con JT011). */
const STALE: ReadonlySet<WriteError> = new Set(["alreadyInCouple", "invitationGone", "alreadyAccepted", "versionConflict"]);

function HowRow({ icon, text }: { icon: AppIconName; text: string }) {
  return (
    <li className="flex items-start gap-2.5 py-[7px] text-[0.875rem] leading-[1.45] text-ink-secondary">
      <AppIcon name={icon} size={18} className="mt-px shrink-0 text-ink" />
      <span className="min-w-0 text-pretty"><RichText text={text} /></span>
    </li>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-[26px] flex flex-col">
      <h2 className="pb-0.5 font-serif text-[1.5rem] leading-tight font-normal text-ink">{title}</h2>
      {children}
    </section>
  );
}

function ActiveCouple({ members }: { members: Member[] }) {
  const owner = members.find((member) => member.role === "owner") ?? members[0];
  const member = members.find((item) => item.role === "member") ?? members[1];
  const me = members.find((item) => item.isMe) ?? owner;
  const partner = members.find((item) => !item.isMe) ?? member;
  return (
    <>
      <CoupleStatus
        state="active"
        title={copy.couple.active.title(owner.name, member.name)}
        line={copy.couple.active.line}
        me={{ initial: initialOf(me.name), person: me.joinOrder }}
        partner={{ initial: initialOf(partner.name), person: partner.joinOrder }}
      />
      <Section title={copy.couple.active.members}>
        <ul className="flex flex-col">
          {[...members].sort((a, b) => a.joinOrder - b.joinOrder).map((item, index, all) => {
            const role = item.role === "owner" ? copy.couple.active.owner : copy.couple.active.member;
            return (
              <li key={item.userId} className={`flex min-h-14 items-center gap-3 py-2 ${index < all.length - 1 ? "border-b-[length:var(--border-hairline)] border-border" : ""}`}>
                <Avatar person={item.joinOrder} initial={initialOf(item.name)} size={36} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[0.9375rem] font-semibold break-words text-ink">{item.name}</span>
                  <span className="text-[0.75rem] text-ink-secondary">{item.isMe ? copy.couple.active.you(role) : role}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Section>
      <Section title={copy.couple.active.howTitle}>
        <ul className="flex flex-col">
          <HowRow icon="lock-simple" text={copy.couple.active.how.private(partner.name)} />
          <HowRow icon="users-three" text={copy.couple.active.how.shared} />
          <HowRow icon="scales" text={copy.couple.active.how.balance} />
          <HowRow icon="currency-circle-dollar" text={copy.couple.active.how.currency} />
        </ul>
      </Section>
      <div className="mt-[26px]">
        <LimitNote title={copy.couple.active.leave.title} description={copy.couple.active.leave.description} />
      </div>
    </>
  );
}

/**
 * El enlace de una sola vez (M3b y la respuesta de «Generar enlace nuevo»), con Compartir y Copiar al pie, como el comp:
 * el aviso «Enlace listo», el enlace (seleccionable, para copiarlo a mano si no hay portapapeles), las reglas y las acciones.
 */
function IssuedLink({ link, expiresAt, children }: { link: string; expiresAt: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Sin portapapeles (permiso o contexto no seguro): queda seleccionado para copiarlo a mano.
      field.current?.select();
    }
  };
  const share = async () => {
    if (typeof navigator.share === "function") {
      try { await navigator.share({ text: copy.couple.invite.shareText, url: link }); return; } catch { /* cancelado: se ofrece copiar */ }
    }
    await copyLink();
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-[18px] bg-sunken p-4">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-category-home-bg text-category-home-fg">
          <AppIcon name="link" weight="duotone" size={22} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[0.9375rem] font-semibold text-ink">{copy.couple.invite.ready}</span>
          {/* Sobre surface.sunken, el texto secundario usa el tono de campo (text.secondary daría 4,29:1 en claro). */}
          <span className="text-[0.75rem] text-[var(--comp-field-muted-fg)]">{copy.couple.invite.readyLine(invitationDay(expiresAt))}</span>
        </span>
      </div>
      <Input ref={field} label={copy.couple.invite.link} value={link} readOnly onFocus={(event) => event.currentTarget.select()} inputClassName="text-[length:max(var(--field-text-min),0.875rem)] text-ellipsis" help={copy.couple.invite.once} />
      {children}
      <div role="status" className="empty:hidden">{copied ? <InlineNotice tone="success" icon="check-circle">{copy.couple.invite.copied}</InlineNotice> : null}</div>
      <div className="flex flex-col gap-2">
        <Button size="lg" icon="share-network" onClick={share}>{copy.couple.invite.share}</Button>
        <Button size="lg" variant="secondary" icon="copy" onClick={copyLink}>{copy.couple.invite.copy}</Button>
      </div>
    </div>
  );
}

type SheetProps = {
  mode: "create" | "regenerate";
  open: boolean;
  /** La clave y el token de esta apertura (FR-059: nacen al abrir la hoja; contracts §2: el token, en el navegador). */
  pair: TokenPair | null;
  onClose: () => void;
  view: PartnerView;
  actions: CoupleActions;
};

function InviteSheet({ mode, open, pair, onClose, view, actions }: SheetProps) {
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const Container = wide ? Modal : BottomSheet;
  const started = useRef(false);
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const pendingEmail = view.kind === "pending" ? view.email : "";

  // F55-6: un ok que llega después de un resultado desconocido (por «Reintentar» o «Comprobar estado») puede ser de una
  // invitación que otra pestaña ya regeneró o anuló. Antes de mostrar el enlace se relee my_couple: solo se muestra si la
  // invitación del resultado sigue siendo la pendiente; si no, o si no se puede leer, se avisa y se relee Mi pareja.
  // F55-7 (cuarta ronda del PR #55): la comprobación va atada a la clave de su intención. Su respuesta solo cambia
  // `linkCheck` si esa clave sigue siendo la de la comprobación en curso de esta hoja; cerrar o empezar otra intención
  // la invalida. El enlace exige además que la clave coincida con la del ok que se pinta.
  const afterUnknown = useRef(false);
  type LinkCheck = { key: string | null; state: "fresh" | "checking" | "valid" | "changed" };
  const [linkCheck, setLinkCheck] = useState<LinkCheck>({ key: null, state: "fresh" });
  const onOk = useCallback((value: Issued, payload: { idempotencyKey: string }) => {
    router.refresh();
    const key = payload.idempotencyKey;
    if (!afterUnknown.current) { setLinkCheck({ key, state: "fresh" }); return; }
    setLinkCheck({ key, state: "checking" });
    const settle = (next: "valid" | "changed") => setLinkCheck((current) => (current.key === key && current.state === "checking" ? { key, state: next } : current));
    actions.currentInvitation().then(
      (current) => settle(current.state === "read" && current.invitationId === value.invitationId ? "valid" : "changed"),
      () => settle("changed"),
    );
  }, [router, actions]);
  const onRejected = useCallback((error: WriteError) => {
    if (error === "invalidEmail") setFieldError(copy.couple.invite.errors.email);
    else setNotice(rejectedMessage(error));
    if (STALE.has(error)) router.refresh();
  }, [router]);
  const check = useCallback((input: { action: WriteAction; idempotencyKey: string }) => actions.checkStatus(input) as Promise<WriteStatusOutcome<Issued>>, [actions]);
  const create = useWrite<CreateInput, Issued>({ action: "create_invitation", run: actions.create, check, onOk, onRejected });
  const regenerate = useWrite<RegenerateInput, Issued>({ action: "regenerate_invitation", run: actions.regenerate, check, onOk, onRejected });
  const write = mode === "create" ? create : regenerate;
  const { state, locked } = write;

  // «Generar enlace nuevo» escribe en cuanto se abre la hoja: es una operación explícita (precisión F47-3).
  useEffect(() => {
    if (!open || !pair || started.current) return;
    started.current = true;
    if (mode === "regenerate" && view.kind === "pending") {
      void regenerate.submit({ idempotencyKey: pair.key, groupId: view.groupId, expectedVersion: view.version, token: pair.token });
    }
  }, [open, pair, mode, view, regenerate]);
  // Desde que una escritura de esta apertura quedó desconocida, su ok se revalida (F55-6).
  useEffect(() => { if (state.phase === "unknown") afterUnknown.current = true; }, [state.phase]);

  const finish = () => {
    started.current = false;
    afterUnknown.current = false;
    setLinkCheck({ key: null, state: "fresh" });
    create.reset();
    regenerate.reset();
    setEmail("");
    setFieldError(undefined);
    setNotice(null);
    setConfirmClose(false);
    onClose();
  };
  // F55-2 (revisión del PR #55): con la escritura en curso la hoja no se cierra (×, Escape ni arrastre). Así la intención,
  // con su clave y su token, se conserva hasta tener resultado; después, con `unknown`, cerrar pregunta antes (FR-059).
  const inFlight = write.pending;
  const requestClose = () => { if (inFlight) return; if (locked) setConfirmClose(true); else finish(); };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    if (locked || state.phase === "pending" || !pair) return;
    const value = email.trim();
    setNotice(null);
    if (!EMAIL.test(value)) { setFieldError(copy.couple.invite.errors.email); return; }
    setFieldError(undefined);
    void create.submit({ idempotencyKey: pair.key, email: value, token: pair.token });
  };

  // El enlace solo se pinta si el resultado es de esta misma intención (misma clave que el token de esta apertura).
  const okKey = state.phase === "ok" ? state.key : null;
  const checkOfThisOk = okKey !== null && linkCheck.key === okKey;
  const linkAllowed = checkOfThisOk && (linkCheck.state === "fresh" || linkCheck.state === "valid");
  const issued = state.phase === "ok" && pair && state.key === pair.key && linkAllowed ? { link: invitationLink(window.location.origin, pair.token), expiresAt: state.value.expiresAt } : null;
  const title = mode === "create" ? copy.couple.invite.title : copy.couple.invite.regenerateTitle;
  const lead = issued ? (mode === "create" ? copy.couple.invite.readyLead : copy.couple.invite.regenerateLead) : mode === "create" ? copy.couple.invite.lead : copy.couple.invite.regenerateLead;
  const busy = state.phase === "pending";
  const rules = (
    <ul className="flex flex-col">
      <HowRow icon="clock" text={copy.couple.invite.rules.expiry} />
      <HowRow icon="user" text={copy.couple.invite.rules.role} />
      <HowRow icon="lock-simple" text={copy.couple.invite.rules.private} />
    </ul>
  );

  return (
    <>
      <Container open={open} onOpenChange={(next) => { if (!next) requestClose(); }} title={title} bare>
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center">
          <span />
          <DialogTitle className="text-center font-serif text-[1.4375rem] leading-[1.04] font-medium tracking-[-0.015em] text-balance">{title}</DialogTitle>
          <button type="button" onClick={requestClose} aria-label={copy.primitives.close} aria-disabled={inFlight || undefined} className="grid size-11 place-items-center rounded-[13px] bg-raised text-ink shadow-raised hover:bg-sunken aria-disabled:bg-sunken aria-disabled:text-ink-secondary aria-disabled:shadow-none">
            <AppIcon name="x" weight="bold" size={16} />
          </button>
        </div>
        {/* Desde #51, la hoja sin pie propio (bare) deja al contenido su relleno inferior y el safe area; el diálogo de escritorio ya lo trae. */}
        <form noValidate onSubmit={submitCreate} className={`flex min-w-0 flex-col gap-3.5 ${wide ? "" : "pb-[calc(20px+env(safe-area-inset-bottom))]"}`}>
          <p className="text-[0.875rem] leading-[1.5] text-pretty text-ink-secondary">{lead}</p>
          <Input
            label={copy.couple.invite.email}
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={copy.couple.invite.emailPlaceholder}
            value={mode === "create" ? email : pendingEmail}
            onChange={(event) => { setEmail(event.target.value); setFieldError(undefined); }}
            disabled={mode === "regenerate" || locked || busy || Boolean(issued)}
            error={fieldError}
            autoFocus={mode === "create" && !issued}
          />

          {mode === "regenerate" && busy ? (
            <p role="status" className="flex items-center gap-2 text-[0.875rem] text-ink-secondary">
              <AppIcon name="circle-notch" weight="bold" size={17} className="motion-safe:animate-[button-spin_0.8s_linear_infinite]" />
              {copy.couple.invite.generating}
            </p>
          ) : null}
          {notice ? <InlineNotice tone="danger" icon="warning-circle">{notice}</InlineNotice> : null}
          {checkOfThisOk && linkCheck.state === "checking" ? (
            <p role="status" className="flex items-center gap-2 text-[0.875rem] text-ink-secondary">
              <AppIcon name="circle-notch" weight="bold" size={17} className="motion-safe:animate-[button-spin_0.8s_linear_infinite]" />
              {copy.writes.checking}
            </p>
          ) : null}
          {checkOfThisOk && linkCheck.state === "changed" ? <InlineNotice icon="info">{copy.couple.invite.changed}</InlineNotice> : null}
          {state.phase === "unknown" ? <WriteUnknown checking={state.checking} notFound={state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} /> : null}
          {issued ? <IssuedLink link={issued.link} expiresAt={issued.expiresAt}>{rules}</IssuedLink> : rules}
          {mode === "create" && !issued && !locked ? (
            <Button type="submit" size="lg" icon="link" loading={busy} loadingLabel={copy.couple.invite.creating}>{copy.couple.invite.create}</Button>
          ) : null}
        </form>
      </Container>
      <CloseUnconfirmed open={confirmClose} onKeep={() => setConfirmClose(false)} onClose={finish} />
    </>
  );
}

/** FR-059: cerrar con un resultado desconocido pregunta antes. */
function CloseUnconfirmed({ open, onKeep, onClose }: { open: boolean; onKeep: () => void; onClose: () => void }) {
  const keep = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      open={open}
      onOpenChange={(next) => { if (!next) onKeep(); }}
      role="alertdialog"
      size="confirm"
      title={copy.writes.close.title}
      description={copy.writes.close.description}
      onOpenAutoFocus={(event) => { event.preventDefault(); keep.current?.focus(); }}
      actions={(
        <>
          <Button ref={keep} variant="ghost" onClick={onKeep}>{copy.writes.close.keep}</Button>
          <Button variant="secondary" onClick={onClose}>{copy.writes.close.confirm}</Button>
        </>
      )}
    />
  );
}

function CancelInvitation({ view, actions, onDone }: { view: Extract<PartnerView, { kind: "pending" }>; actions: CoupleActions; onDone: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const key = useRef<string | null>(null);
  const check = useCallback((input: { action: WriteAction; idempotencyKey: string }) => actions.checkStatus(input) as Promise<WriteStatusOutcome<{ status: "discarded" }>>, [actions]);
  const cancel = useWrite<CancelInput, { status: "discarded" }>({
    action: "cancel_invitation", run: actions.cancel, check,
    onOk: () => { setOpen(false); key.current = null; onDone(); router.refresh(); },
    onRejected: (error) => {
      // Un rechazo confirmado no anuló nada: lo que quedó igual depende de por qué.
      setMessage(STALE.has(error) ? rejectedMessage(error) : error === "sessionExpired" ? copy.errors.sessionExpired : copy.couple.cancel.failed);
      if (STALE.has(error)) router.refresh();
    },
  });
  const close = () => { cancel.reset(); key.current = null; setMessage(null); setConfirmClose(false); setOpen(false); };
  const onOpenChange = (next: boolean) => {
    // F55-2: mientras «Anulando…» está en curso, Escape no cierra la confirmación.
    if (!next && cancel.pending) return;
    if (next) { key.current = newIdempotencyKey(); setMessage(null); cancel.reset(); setOpen(true); return; }
    if (cancel.locked) setConfirmClose(true); else close();
  };
  return (
    <>
      <Button variant="ghost" className="px-4" onClick={() => onOpenChange(true)}>{copy.couple.pending.cancel}</Button>
      <SensitiveActionConfirmation
        open={open}
        onOpenChange={onOpenChange}
        title={copy.couple.cancel.title}
        description={copy.couple.cancel.description}
        keepLabel={copy.couple.cancel.keep}
        confirmLabel={copy.couple.cancel.confirm}
        loadingLabel={copy.couple.cancel.cancelling}
        loading={cancel.state.phase === "pending"}
        locked={cancel.locked}
        onConfirm={() => { if (key.current) void cancel.submit({ idempotencyKey: key.current, groupId: view.groupId, expectedVersion: view.version }); }}
      >
        {message ? <InlineNotice tone="danger" icon="warning-circle">{message}</InlineNotice> : null}
        {cancel.state.phase === "unknown" ? <WriteUnknown checking={cancel.state.checking} notFound={cancel.state.notFound} onRetry={() => void cancel.retry()} onCheck={() => void cancel.checkStatus()} /> : null}
      </SensitiveActionConfirmation>
      <CloseUnconfirmed open={confirmClose} onKeep={() => setConfirmClose(false)} onClose={close} />
    </>
  );
}

export function PartnerScreen({ view, actions, openInvite = false }: { view: PartnerView; actions: CoupleActions; openInvite?: boolean }) {
  // Abrir una hoja abre su intención: la clave y el token nacen aquí, en el navegador, y se reutilizan en cada reintento.
  // La clave y el token de cada apertura nacen aquí, en memoria (F55-5): al recargar no se reanuda nada.
  type Sheet = { mode: "create" | "regenerate"; pair: TokenPair };
  const opening = (mode: "create" | "regenerate"): Sheet => ({ mode, pair: tokenIntent().begin() });
  const [sheet, setSheet] = useState<Sheet | null>(() => (openInvite && view.kind === "none" ? opening("create") : null));
  const open = (mode: "create" | "regenerate") => setSheet(opening(mode));
  const [announcement, setAnnouncement] = useState("");
  const myName = view.kind === "active" ? view.members.find((member) => member.isMe)?.name ?? "" : view.me.name;
  return (
    <div className="mt-[18px] flex flex-col">
      {view.kind === "active" ? <ActiveCouple members={view.members} /> : null}
      {view.kind === "none" ? (
        <>
          <CoupleStatus state="solo" title={copy.couple.none.title} line={copy.couple.none.line} me={{ initial: initialOf(myName) }} />
          <div className="mt-[26px] flex flex-col gap-3.5">
            <h2 className="font-serif text-[clamp(1.625rem,7.4vw,1.875rem)] leading-[1.1] font-normal text-balance text-ink">{copy.couple.none.heading}</h2>
            <p className="text-[0.9375rem] leading-[1.5] text-pretty text-ink-secondary">{copy.couple.none.description}</p>
            <Button size="lg" icon="user-plus" onClick={() => open("create")}>{copy.couple.none.invite}</Button>
            <p className="text-[0.8125rem] leading-[1.45] text-ink-secondary">{copy.couple.none.invited}</p>
          </div>
        </>
      ) : null}
      {view.kind === "pending" ? (
        <>
          <CoupleStatus
            state="pending"
            title={copy.couple.pending.title}
            line={(view.expired ? copy.couple.pending.expiredLine : copy.couple.pending.line)(view.email, invitationDay(view.expiresAt))}
            me={{ initial: initialOf(myName) }}
          />
          <div className="mt-5 flex flex-col gap-3">
            <p className="text-[0.875rem] leading-[1.5] text-pretty text-ink-secondary">{view.expired ? copy.couple.pending.expiredDescription : copy.couple.pending.description}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon="arrow-clockwise" className="min-w-0 flex-1" onClick={() => open("regenerate")}>{copy.couple.pending.regenerate}</Button>
              <CancelInvitation view={view} actions={actions} onDone={() => setAnnouncement(copy.couple.cancel.done)} />
            </div>
          </div>
        </>
      ) : null}
      <InviteSheet mode="create" open={sheet?.mode === "create"} pair={sheet?.mode === "create" ? sheet.pair : null} onClose={() => setSheet(null)} view={view} actions={actions} />
      <InviteSheet mode="regenerate" open={sheet?.mode === "regenerate"} pair={sheet?.mode === "regenerate" ? sheet.pair : null} onClose={() => setSheet(null)} view={view} actions={actions} />
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </div>
  );
}
