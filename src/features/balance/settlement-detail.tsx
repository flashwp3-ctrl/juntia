"use client";
// T062 (spec 003, PR D) / FR-028, FR-029, FR-057, FR-059; US-6.9; Q11 y enmienda de ADR-007 (liquidaciones anulables con
// auditoría, nunca editables ni borrables). El detalle de una liquidación: quién le pagó a quién, cuánto, cuándo, la nota,
// quién la registró y, si se anuló, quién y cuándo. «Anular liquidación» abre SensitiveActionConfirmation (anatomía
// aprobada, decisión 16.6): `alertdialog`, foco inicial en «Cancelar», Escape cancela; anular lleva la versión leída
// (`expectedVersion`) y una clave nacida al abrir la confirmación. Resultado desconocido: nunca dice que no se anuló;
// «Reintentar» (misma clave) y «Comprobar estado». Una anulada sigue en el historial, marcada, sin «Anular».
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialOf } from "@/domain/account";
import { formatMoney } from "@/domain/money";
import { SensitiveActionConfirmation } from "@/features/couple/sensitive-confirmation";
import { ConfirmDialog } from "@/features/expenses/confirm-dialog";
import { useOptionalAnnotate } from "@/features/expenses/annotate-provider";
import { newIdempotencyKey } from "@/features/expenses/idempotency";
import type { SharedActions } from "@/features/expenses/shared-types";
import { useWrite } from "@/features/shared/use-write";
import type { WriteError } from "@/features/shared/write-result";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { instantInBogota, longDate } from "@/lib/format";
import type { BalanceMember, SettlementView, VoidSettlementPayload } from "./types";

type Props = { settlement: SettlementView; members: readonly BalanceMember[]; actions?: SharedActions | null; closeHref: string };

export function SettlementDetail({ settlement, members, actions: given, closeHref }: Props) {
  const annotate = useOptionalAnnotate();
  const actions = given ?? annotate?.sharedActions ?? null;
  const router = useRouter();
  const [key, setKey] = useState<string | null>(null);
  // Revisión del gestor del PR #60 (1), como F57-3 del PR C: con la anulación sin confirmar, cerrar pregunta antes y
  // «Seguir aquí» conserva la intención (la misma clave para «Reintentar» y «Comprobar estado»).
  const [confirmingClose, setConfirmingClose] = useState(false);
  const name = (userId: string | null) => members.find((member) => member.userId === userId)?.name ?? "";
  const from = members.find((member) => member.userId === settlement.fromUserId);
  const to = members.find((member) => member.userId === settlement.toUserId);
  const title = copy.shared.row.settlementTitle(name(settlement.fromUserId), name(settlement.toUserId));
  const voided = settlement.status === "voided";
  const partner = members.find((member) => !member.isMe)?.name ?? "";

  const run = useCallback((payload: VoidSettlementPayload) => actions!.voidSettlement!(payload), [actions]);
  const check = useCallback((input: Parameters<SharedActions["check"]>[0]) => actions!.check(input), [actions]);
  const onOk = useCallback(() => {
    setKey(null);
    annotate?.notify({ tone: "success", message: copy.balance.settlement.void.done });
    router.refresh();
  }, [annotate, router]);
  const onRejected = useCallback((error: WriteError) => { if (error === "alreadyVoided" || error === "versionConflict" || error === "notFound") router.refresh(); }, [router]);
  const write = useWrite<VoidSettlementPayload, { id: string; version: number }>({ action: "void_settlement", run, check, onOk, onRejected });
  const rejected = write.state.phase === "rejected" ? write.state.error : null;
  const rejectedText = rejected === "alreadyVoided" ? copy.balance.settlement.errors.alreadyVoided : rejected === "notFound" ? copy.balance.settlement.errors.notFound
    : rejected === "versionConflict" ? copy.balance.settlement.errors.versionConflict(partner) : rejected === "sessionExpired" ? copy.errors.sessionExpired : rejected ? copy.balance.settlement.void.rejected : null;

  const open = (next: boolean) => {
    if (next) return;
    if (write.pending) return;
    if (write.locked) { setConfirmingClose(true); return; }
    setKey(null);
    write.reset();
  };
  const closeUnconfirmed = () => {
    setConfirmingClose(false);
    setKey(null);
    write.reset();
    // La anulación pudo haberse hecho: la página vuelve a leer el estado del servidor.
    router.refresh();
  };
  const row = "flex min-h-12 items-center justify-between gap-3 border-b-[length:var(--border-hairline)] border-border py-2";
  return (
    <article aria-labelledby="settlement-title" className="flex flex-col gap-5">
      <header className="flex flex-col items-start gap-2">
        <div className="flex w-full items-start justify-between gap-3">
          <span aria-hidden="true" className="flex items-center gap-2">
            {from ? <Avatar person={from.joinOrder} initial={initialOf(from.name)} size={32} /> : null}
            <AppIcon name="arrow-right" weight="bold" size={14} className="text-ink-secondary" />
            {to ? <Avatar person={to.joinOrder} initial={initialOf(to.name)} size={32} /> : null}
          </span>
          {/* Desde 1280, el panel de detalle junto a la tabla se cierra con la × a la derecha, como el de un gasto. */}
          <Link href={closeHref} className="hidden size-11 shrink-0 place-items-center rounded-[var(--radius-md)] text-ink hover:bg-sunken xl:grid">
            <AppIcon name="x" weight="bold" size={18} />
            <span className="sr-only">{copy.detail.close}</span>
          </Link>
        </div>
        <h2 id="settlement-title" className={`font-serif text-[length:var(--title-l-size)] leading-[1.1] font-medium text-ink ${voided ? "line-through" : ""}`}>{title}</h2>
        <p className={`text-[length:var(--money-l-size)] leading-none font-semibold tracking-[var(--money-l-tracking)] text-ink tabular-nums ${voided ? "line-through" : ""}`}>{formatMoney(settlement.amount)}</p>
        <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-ink-secondary">
          <span>{copy.shared.row.settlement}</span>
          {voided ? <span className="inline-flex h-6 items-center rounded-[8px] bg-sunken px-[9px] text-[11px] font-semibold tracking-[.06em] text-ink">{copy.balance.settlement.voidedBadge}</span> : null}
        </p>
      </header>
      <dl className="flex flex-col">
        <div className={row}><dt className="text-[12px] font-medium text-ink-secondary">{copy.balance.settlement.date}</dt><dd className="text-[15px] font-semibold text-ink">{longDate(settlement.settlementDate)}</dd></div>
        {settlement.note ? <div className={row}><dt className="text-[12px] font-medium text-ink-secondary">{copy.balance.settlement.note}</dt><dd className="min-w-0 text-right text-[15px] font-semibold break-words text-ink">{settlement.note}</dd></div> : null}
      </dl>
      <p className="text-[12px] text-ink-secondary">{copy.balance.settlement.by(name(settlement.createdBy), instantInBogota(settlement.createdAt))}</p>
      {voided && settlement.voidedAt ? <p className="text-[12px] text-ink-secondary">{copy.balance.settlement.voidedBy(name(settlement.voidedBy), instantInBogota(settlement.voidedAt))}</p> : null}
      <p className="text-[12px] leading-[1.5] text-pretty text-ink-secondary">{copy.balance.settlements.note}</p>
      {!voided && actions?.voidSettlement ? (
        <Button variant="ghost" icon="minus-circle" className="self-start" onClick={() => { write.reset(); setKey(newIdempotencyKey()); }}>{copy.balance.settlement.void.action}</Button>
      ) : null}
      <SensitiveActionConfirmation
        open={key !== null}
        onOpenChange={open}
        title={copy.balance.settlement.void.title}
        description={copy.balance.settlement.void.description(title, formatMoney(settlement.amount))}
        keepLabel={copy.balance.settlement.void.keep}
        confirmLabel={copy.balance.settlement.void.confirm}
        loadingLabel={copy.balance.settlement.void.loading}
        loading={write.pending}
        locked={write.locked}
        onConfirm={() => { if (key) void write.submit({ idempotencyKey: key, settlementId: settlement.id, expectedVersion: settlement.version, reason: "void" }); }}
      >
        {rejectedText ? <p role="alert" className="rounded-[14px] bg-danger-subtle px-3 py-2.5 text-[13px] font-medium text-ink">{rejectedText}</p> : null}
        {write.state.phase === "unknown" ? (
          <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} />
        ) : null}
        <ConfirmDialog
          open={confirmingClose}
          onOpenChange={setConfirmingClose}
          title={copy.writes.close.title}
          description={copy.balance.settlement.void.closeUnconfirmed}
          cancel={(ref) => <Button ref={ref} variant="ghost" onClick={() => setConfirmingClose(false)}>{copy.writes.close.keep}</Button>}
          confirm={<Button variant="secondary" onClick={closeUnconfirmed}>{copy.writes.close.confirm}</Button>}
        />
      </SensitiveActionConfirmation>
    </article>
  );
}
