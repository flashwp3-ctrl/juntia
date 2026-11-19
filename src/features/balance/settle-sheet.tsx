"use client";
// T062 (spec 003, PR D) / FR-027, FR-029, FR-059; US-6.1–6.5, 6.10; Q10; 04·2 REGISTRAR LIQUIDACIÓN. Hoja por debajo de 768 y
// diálogo de 520 desde 768 (RESPONSIVE_SPECIFICATIONS, «Sheets y diálogos»), con la × a la derecha.
// - La dirección es fija: deudor → acreedor, como la sugiere el saldo; ningún control la invierte, y la función la vuelve a
//   derivar bajo el bloqueo del grupo (contracts/database.md, «Dirección de la liquidación»).
// - «Todo» (el saldo pendiente) u «Otro» (un pago parcial en pesos enteros); por encima del saldo no se envía y el error dice
//   el máximo. Fecha de hoy o pasada, nunca futura; nota opcional de hasta 140 caracteres.
// - Resultado desconocido: nunca dice que no se registró; los campos se bloquean, «Reintentar» repite lo mismo con la misma
//   clave y «Comprobar estado» lee `write_status`. Cerrar pregunta antes. Rechazo confirmado: lo dice y los campos siguen
//   editables. La clave nace al abrir la hoja (la trae BalancePanel) y se reusa en cada reintento.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import { AmountInput } from "@/components/ui/amount-input";
import { AppIcon } from "@/components/ui/app-icon";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetTitle, Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { initialOf } from "@/domain/account";
import { formatMoney, moneyFromPesos, type Money } from "@/domain/money";
import { ConfirmDialog } from "@/features/expenses/confirm-dialog";
import type { SharedActions } from "@/features/expenses/shared-types";
import { useWrite } from "@/features/shared/use-write";
import type { WriteError } from "@/features/shared/write-result";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import type { BalanceMember, SavedSettlement, SettlePayload } from "./types";

const WIDE = "(min-width: 768px)";
const subscribeWide = (onChange: () => void) => {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(WIDE);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
};
const readWide = () => typeof window.matchMedia === "function" && window.matchMedia(WIDE).matches;
const DATE = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

type Props = {
  open: boolean;
  /** `unconfirmed`: se cerró con un registro sin confirmar (la liquidación pudo haberse guardado). */
  onClose: (options?: { unconfirmed: boolean }) => void;
  debtor: BalanceMember;
  creditor: BalanceMember;
  /** El saldo pendiente que se ve (de `couple_balance`); tras un rechazo se pide la página y llega el vigente. */
  pending: Money;
  /** Hoy en Bogotá, que calcula el servidor. */
  today: string;
  idempotencyKey: string;
  actions: SharedActions;
  onDone: (saved: SavedSettlement) => void;
  /** BalancePanel congela el saldo que se ve mientras el servidor responde (S4 parte de él). */
  onPendingChange?: (pending: boolean) => void;
};

function rejectedMessage(error: WriteError) {
  switch (error) {
    // Revisión del gestor del PR #60 (3): el servidor rechazó por el saldo vigente; el que se ve puede ser viejo hasta que
    // llegue la página nueva (se pide al rechazar). El aviso no da cifra; «Saldo pendiente» se actualiza solo.
    case "exceedsPending":
    case "nothingToSettle": return copy.balance.settle.errors.changed;
    case "settlementDate": return copy.balance.settle.errors.date;
    case "coupleNotActive": return copy.couple.errors.notActive;
    case "sessionExpired": return copy.errors.sessionExpired;
    default: return `${copy.balance.settle.rejected} ${copy.errors.unexpected}`;
  }
}

export function SettleSheet({ open, onClose, debtor, creditor, pending, today, idempotencyKey, actions, onDone, onPendingChange }: Props) {
  const wide = useSyncExternalStore(subscribeWide, readWide, () => false);
  const router = useRouter();
  const [mode, setMode] = useState<"all" | "other">("all");
  const [other, setOther] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const errorId = `${useId()}-error`;
  const pendingPesos = pending.amountMinor / 100n;
  const pesos = mode === "all" ? pendingPesos : other === null ? null : BigInt(other);
  const amount = pesos !== null && pesos > 0n ? moneyFromPesos(pesos) : null;

  const run = useCallback((payload: SettlePayload) => actions.settle!(payload), [actions]);
  const check = useCallback((input: Parameters<SharedActions["check"]>[0]) => actions.check(input), [actions]);
  const onRejected = useCallback((error: WriteError) => { if (error === "exceedsPending" || error === "nothingToSettle") router.refresh(); }, [router]);
  const onOk = useCallback((saved: SavedSettlement) => onDone(saved), [onDone]);
  const write = useWrite<SettlePayload, SavedSettlement>({ action: "register_settlement", run, check, onOk, onRejected });
  const locked = write.locked || write.pending;
  useEffect(() => { onPendingChange?.(write.state.phase === "pending" || (write.state.phase === "unknown" && write.state.checking)); }, [write.state, onPendingChange]);

  const submit = () => {
    if (!amount || pesos === null || pesos <= 0n) { setInvalid(copy.balance.settle.errors.amount); return; }
    if (pesos > pendingPesos) { setInvalid(copy.balance.settle.errors.exceedsPending(formatMoney(pending))); return; }
    if (!DATE.test(date) || date > today) { setInvalid(copy.balance.settle.errors.date); return; }
    if (note.trim().length > 140) { setInvalid(copy.balance.settle.errors.noteTooLong); return; }
    setInvalid(null);
    void write.submit({ idempotencyKey, amountPesos: pesos.toString(), settlementDate: date, note: note.trim() === "" ? null : note.trim() });
  };

  const requestClose = (next: boolean) => {
    if (next) return;
    if (write.state.phase === "pending") return;
    if (write.locked) { setConfirmingClose(true); return; }
    onClose();
  };

  const remaining = amount && amount.amountMinor <= pending.amountMinor ? pending.amountMinor - amount.amountMinor : null;
  const message = invalid ?? (write.state.phase === "rejected" ? rejectedMessage(write.state.error) : null);
  const body = (
    <form noValidate onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex flex-col gap-4">
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
        <span />
        <SheetTitle>{copy.balance.settle.title}</SheetTitle>
        <button type="button" onClick={() => requestClose(false)} aria-label={copy.annotate.close} className="grid size-11 place-items-center rounded-[13px] bg-raised text-ink shadow-raised hover:bg-sunken">
          <AppIcon name="x" weight="bold" size={16} />
        </button>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <span aria-hidden="true" className="flex items-center gap-2.5">
          <Avatar person={debtor.joinOrder} initial={initialOf(debtor.name)} size={40} />
          <AppIcon name="arrow-right" weight="bold" size={16} className="text-ink-secondary" />
          <Avatar person={creditor.joinOrder} initial={initialOf(creditor.name)} size={40} />
        </span>
        <p className="text-[length:var(--body-m-size)] font-medium text-ink">{copy.balance.settle.direction(debtor.name, creditor.name)}</p>
        {mode === "all" ? (
          <p aria-hidden="true" className="rounded-[18px] px-4 py-1 text-[clamp(2rem,9vw,2.5rem)] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums shadow-[0_0_0_2px_var(--color-border-strong)]">
            {formatMoney(amount ?? { amountMinor: 0n, currency: "COP" })}
          </p>
        ) : (
          // «Otro»: el monto se escribe en el mismo lugar (04·2), en pesos enteros, a lo ancho de la hoja.
          <AmountInput label={copy.balance.settle.otherAmount} value={other} onValueChange={(next) => { setOther(next); setInvalid(null); }} disabled={locked} className="w-full self-stretch text-left" fieldClassName="w-full" />
        )}
        <p className="text-[0.75rem] leading-[1.4] text-pretty text-ink-secondary">{copy.balance.settle.pending(formatMoney(pending))}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Segmented
          role="radiogroup"
          label={copy.balance.settle.options}
          options={[{ value: "all", label: copy.balance.settle.all }, { value: "other", label: copy.balance.settle.other }]}
          value={mode}
          onValueChange={(next) => { setMode(next); setInvalid(null); }}
          disabled={locked}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={copy.balance.settle.date} type="date" value={date} max={today} disabled={locked} onChange={(event) => { setDate(event.target.value); setInvalid(null); }} />
        <Input label={copy.balance.settle.note} value={note} maxLength={140} disabled={locked} onChange={(event) => setNote(event.target.value)} />
      </div>
      {remaining !== null && !message ? (
        <p className="flex items-start gap-2 rounded-[14px] bg-saving-subtle px-3 py-2.5 text-[0.8125rem] font-medium text-ink">
          <AppIcon name="check-circle" weight="fill" size={18} className="mt-px shrink-0 text-saving" />
          {remaining === 0n ? copy.balance.settle.afterAll : copy.balance.settle.afterPartial(debtor.name, creditor.name, formatMoney({ amountMinor: remaining, currency: "COP" }))}
        </p>
      ) : null}
      {message ? (
        <p id={errorId} role="alert" className="flex items-start gap-2 rounded-[14px] bg-danger-subtle px-3 py-2.5 text-[0.8125rem] font-medium text-ink">
          <AppIcon name="warning-circle" weight="bold" size={18} className="mt-px shrink-0 text-danger" />
          {message}
        </p>
      ) : null}
      <p className="text-[0.75rem] leading-[1.5] text-pretty text-ink-secondary">{copy.balance.settle.disclaimer}</p>
      {write.state.phase === "unknown" ? (
        <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} />
      ) : (
        <Button type="submit" size="lg" icon="check" className="w-full" loading={write.pending} loadingLabel={copy.balance.settle.submitting} aria-describedby={message ? errorId : undefined}>
          {copy.balance.settle.submit(formatMoney(amount ?? { amountMinor: 0n, currency: "COP" }))}
        </Button>
      )}
      <ConfirmDialog
        open={confirmingClose}
        onOpenChange={setConfirmingClose}
        title={copy.writes.close.title}
        description={copy.annotate.uncertain.description}
        cancel={(ref) => <Button ref={ref} variant="ghost" icon="arrow-clockwise" onClick={() => { setConfirmingClose(false); void write.retry(); }}>{copy.writes.retry}</Button>}
        confirm={<Button variant="secondary" onClick={() => { setConfirmingClose(false); onClose({ unconfirmed: true }); }}>{copy.writes.close.confirm}</Button>}
      />
    </form>
  );
  // Foco inicial en la opción elegida (Todo): desde ahí, las flechas eligen y Tab sigue a la fecha.
  const focusChoice = (event: Event) => {
    event.preventDefault();
    document.querySelector<HTMLElement>('[role="dialog"] [role="radio"][aria-checked="true"]')?.focus();
  };
  const props = { open, onOpenChange: requestClose, title: copy.balance.settle.title, bare: true, onOpenAutoFocus: focusChoice };
  return wide ? <Modal {...props}>{body}</Modal> : <BottomSheet {...props}>{body}</BottomSheet>;
}
