"use client";
// T050 (spec 003, PR C) / FR-031–FR-036, FR-041, FR-059; US-8.2–8.9; precisión F47-4; 04·10 A2–A5; decisión 20.3
// (ChangePreview aprobado en su forma). Hoja por debajo de 768 px y diálogo de 520 desde 768 (COMPONENT_SPECIFICATIONS,
// «Flujo Mover a Pareja»).
//   A2  importe y pagador fijos («Se mantiene», ADR-001 punto 2); se eligen participantes y reparto.
//   A3  ChangePreview: solo cifras de quien mira (privados, su parte, el gasto de Nosotros y el saldo), antes y después,
//       con el aviso de visibilidad. Las de antes las lee una Server Action al pedir la vista previa.
//   A3b confirmando, con los campos bloqueados.
//   A4  lo hace el proveedor con `onDone`: pasa a Nosotros, resalta la fila «movido desde Yo» y avisa con «Deshacer».
//   A5  rechazo confirmado: dice que no se movió y que sigue en Yo. Resultado desconocido: nunca lo afirma, conserva la clave
//       y bloquea la intención; «Reintentar» idéntico y «Comprobar estado» (`write_status`); cerrar pregunta antes.
import { useCallback, useId, useState, useSyncExternalStore } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { DialogTitle, Modal } from "@/components/ui/modal";
import { AppIcon } from "@/components/ui/app-icon";
import { computeBalance } from "@/domain/balances";
import type { Allocation } from "@/domain/allocations";
import { formatMoney, parseAmountMinor, type Money } from "@/domain/money";
import { useWrite } from "@/features/shared/use-write";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { monthName } from "@/lib/format";
import { ConfirmDialog } from "./confirm-dialog";
import { SplitEditor } from "./split-editor";
import { evaluateSplit, initialSplit, splitPayload, type SplitDraft } from "./split-state";
import type { MovePreviewBase, MoveResult, ReclassifyPayload, SharedActions, SheetMember } from "./shared-types";
import type { SavedTransaction } from "./types";

const WIDE = "(min-width: 768px)";
const subscribeWide = (onChange: () => void) => {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(WIDE);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
};
const readWide = () => typeof window.matchMedia === "function" && window.matchMedia(WIDE).matches;
const money = (amountMinor: bigint): Money => ({ amountMinor, currency: "COP" });
const abs = (value: bigint) => (value < 0n ? -value : value);

type PreviewRow = { label: string; before: Money; after: Money };
type Preview = { rows: PreviewRow[]; myShare: Money; done: string };

/**
 * ChangePreview: el después a partir del antes y del reparto elegido (FR-041: solo cifras de quien mira). El saldo sigue el
 * cálculo de `computeBalance`: quien pagó suma el importe y cada uno resta lo que le corresponde.
 */
export function movePreview(base: MovePreviewBase, amount: Money, allocations: readonly Allocation[], members: readonly SheetMember[]): Preview {
  const me = members.find((member) => member.isMe)!;
  const partner = members.find((member) => !member.isMe)!;
  const mine = allocations.find((part) => part.userId === me.userId)?.amount.amountMinor ?? 0n;
  const net = (userId: string) => BigInt(base.balance.find((row) => row.userId === userId)?.netMinor ?? "0");
  const ordered = [...members].sort((a, b) => a.joinOrder - b.joinOrder).map((member) => ({ userId: member.userId, joinOrder: member.joinOrder }));
  const delta = computeBalance([{ amount, payerUserId: me.userId, status: "active", allocations }], [], ordered);
  const myAfter = net(me.userId) + (delta.find((row) => row.userId === me.userId)?.net.amountMinor ?? 0n);
  const myBefore = net(me.userId);
  const owes = (value: bigint) => (value > 0n ? copy.move.preview.owes(partner.name, me.name) : value < 0n ? copy.move.preview.owes(me.name, partner.name) : copy.move.preview.settled);
  const label = myAfter !== 0n ? owes(myAfter) : owes(myBefore);
  const done = myAfter === 0n ? copy.move.doneSettled
    : myAfter > 0n ? copy.move.done(partner.name, me.name, formatMoney(money(myAfter))) : copy.move.done(me.name, partner.name, formatMoney(money(-myAfter)));
  return {
    myShare: money(mine), done,
    rows: [
      { label: copy.move.preview.private, before: parseAmountMinor(base.privateMinor), after: money(BigInt(base.privateMinor) - amount.amountMinor) },
      { label: copy.move.preview.sharedPart, before: parseAmountMinor(base.sharedPartMinor), after: money(BigInt(base.sharedPartMinor) + mine) },
      { label: copy.move.preview.couple, before: parseAmountMinor(base.coupleTotalMinor), after: money(BigInt(base.coupleTotalMinor) + amount.amountMinor) },
      { label, before: money(abs(myBefore)), after: money(abs(myAfter)) },
    ],
  };
}

type MoveDialogProps = {
  transaction: SavedTransaction;
  idempotencyKey: string;
  members: readonly SheetMember[];
  actions: SharedActions;
  onClose: () => void;
  onDone: (result: MoveResult, message: string) => void;
};

export default function MoveDialog({ transaction, idempotencyKey, members, actions, onClose, onDone }: MoveDialogProps) {
  const wide = useSyncExternalStore(subscribeWide, readWide, () => false);
  const amount = parseAmountMinor(transaction.amountMinor);
  const pesos = Number(amount.amountMinor / 100n);
  const me = members.find((member) => member.isMe)!;
  const partner = members.find((member) => !member.isMe)!;
  const title = transaction.description ?? copy.categories[transaction.categoryId];
  const [step, setStep] = useState<"choose" | "preview">("choose");
  const [split, setSplit] = useState<SplitDraft>(() => ({ ...initialSplit(members, null), payerUserId: me.userId }));
  const [base, setBase] = useState<{ state: "loading" } | { state: "ready"; value: MovePreviewBase } | { state: "failed" }>({ state: "loading" });
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [rejectedShown, setRejectedShown] = useState(false);
  const statusId = `${useId()}-split`;
  const status = evaluateSplit(split, pesos, members);
  const payload = splitPayload(split, status, members);
  const preview = base.state === "ready" && status.kind === "ok" ? movePreview(base.value, amount, status.allocations, members) : null;

  const run = useCallback((input: ReclassifyPayload) => actions.reclassify!(input), [actions]);
  const check = useCallback((input: Parameters<SharedActions["check"]>[0]) => actions.check(input), [actions]);
  const finish = (result: MoveResult) => onDone(result, preview?.done ?? copy.move.donePrefix);
  const write = useWrite<ReclassifyPayload, MoveResult>({ action: "reclassify_to_shared", run, check, onOk: finish, onRejected: () => setRejectedShown(true) });

  const loadPreview = useCallback(async () => {
    setBase({ state: "loading" });
    const result = await (actions.previewMove?.({ transactionId: transaction.id }) ?? Promise.resolve({ ok: false as const })).catch(() => ({ ok: false as const }));
    setBase(result.ok ? { state: "ready", value: result.value } : { state: "failed" });
  }, [actions, transaction.id]);
  const toPreview = () => { setStep("preview"); void loadPreview(); };

  const confirm = () => {
    if (!payload) return;
    const { payerUserId: _payer, ...rest } = payload;
    void _payer;
    void write.submit({ idempotencyKey, transactionId: transaction.id, expectedVersion: transaction.version, ...rest });
  };

  const requestClose = (next: boolean) => {
    if (next) return;
    if (write.state.phase === "pending") return;
    if (write.locked) { setConfirmingClose(true); return; }
    if (step === "preview" && !rejectedShown) { setStep("choose"); return; }
    onClose();
  };

  const header = (
    <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
      <span />
      <div className="flex min-w-0 flex-col items-center text-center">
        <p className="max-w-full truncate text-[12px] font-medium text-[var(--comp-field-muted-fg)]">{title}</p>
        <DialogTitle className="font-serif text-[23px] leading-[1.04] font-medium tracking-[-0.015em] text-balance">{copy.move.action}</DialogTitle>
      </div>
      <button type="button" onClick={() => requestClose(false)} aria-label={copy.annotate.close} className="grid size-11 place-items-center rounded-[13px] bg-raised text-ink shadow-raised hover:bg-sunken">
        <AppIcon name="x" weight="bold" size={16} />
      </button>
    </div>
  );

  const choose = (
    <>
      <p className="text-center text-[length:var(--body-s-size)] text-[var(--comp-field-muted-fg)]">{copy.move.lead}</p>
      <div className="flex min-h-11 items-center justify-between gap-3 rounded-[14px] bg-sunken px-3.5 shadow-[var(--comp-field-inset)]">
        <span className="text-[12px] font-medium text-ink-secondary">{copy.move.amount}</span>
        <span className="flex items-center gap-2"><span className="text-[17px] font-semibold text-ink tabular-nums">{formatMoney(amount)}</span><span className="text-[12px] font-medium text-[var(--comp-field-muted-fg)]">{copy.move.kept}</span></span>
      </div>
      <SplitEditor members={members} draft={split} onChange={setSplit} amountPesos={pesos} statusId={statusId} payerFixed />
      {status.kind === "ok" ? <p className="text-center text-[13px] font-semibold text-ink">{copy.shared.summary.parts(status.allocations.map((part) => [members.find((m) => m.userId === part.userId)!.name, formatMoney(part.amount)] as const))}</p> : null}
      <Button size="lg" icon="arrow-right" className="w-full" disabled={!payload} aria-describedby={payload ? undefined : statusId} onClick={toPreview}>{copy.move.review}</Button>
    </>
  );

  const locked = write.locked || write.pending;
  const changePreview = (
    <>
      <p className="text-center text-[12px] font-semibold tracking-[var(--overline-tracking)] uppercase text-ink-secondary">{copy.move.preview.eyebrow}</p>
      {rejectedShown && write.state.phase === "rejected" ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-[16px] bg-danger-subtle px-3.5 py-3 text-[13px] leading-[1.45] font-medium text-ink">
          <AppIcon name="warning-circle" weight="bold" size={20} className="shrink-0 text-danger" />
          <span>{copy.move.rejected(title)}</span>
        </div>
      ) : null}
      {base.state === "loading" ? <p role="status" className="text-center text-[13px] text-[var(--comp-field-muted-fg)]">{copy.move.preview.loading}</p> : null}
      {base.state === "failed" ? (
        <div role="alert" className="flex flex-col gap-2 rounded-[16px] bg-warning-subtle px-3.5 py-3 text-[13px] font-medium text-ink">
          <span>{copy.move.preview.failed}</span>
          <Button variant="secondary" icon="arrow-clockwise" onClick={() => void loadPreview()}>{copy.annotate.retry}</Button>
        </div>
      ) : null}
      {preview && base.state === "ready" ? (
        <>
          <h3 className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.move.preview.title(monthName(base.value.month))}</h3>
          <ul role="list" aria-label={copy.move.preview.title(monthName(base.value.month))} className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
            {preview.rows.map((row) => (
              <li key={row.label} aria-label={copy.move.preview.row(row.label, formatMoney(row.before), formatMoney(row.after))} className="flex min-h-12 items-center justify-between gap-3 py-2">
                <span aria-hidden="true" className="min-w-0 text-[13px] font-medium text-ink-secondary">{row.label}</span>
                <span aria-hidden="true" className="flex shrink-0 items-baseline gap-2 tabular-nums">
                  <s className="text-[13px] text-ink-secondary">{formatMoney(row.before)}</s>
                  <AppIcon name="arrow-right" size={12} className="text-ink-secondary" />
                  <span className="text-[15px] font-semibold text-ink">{formatMoney(row.after)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-[var(--comp-field-muted-fg)]">{copy.move.preview.paidNote(me.name, formatMoney(amount), formatMoney(preview.myShare))}</p>
          <p className="flex items-start gap-2 rounded-[14px] bg-sunken px-3 py-2.5 text-[13px] font-medium text-ink"><AppIcon name="eye" size={16} className="mt-px shrink-0 text-ink-secondary" />{copy.move.preview.visibility(partner.name, title)}</p>
          <p className="text-[12px] text-[var(--comp-field-muted-fg)]">{copy.move.preview.atomic}</p>
        </>
      ) : null}
      {write.state.phase === "unknown" ? (
        <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} />
      ) : null}
      <div className="flex flex-col gap-2.5">
        {rejectedShown && write.state.phase === "rejected" ? (
          <Button size="lg" variant="secondary" className="w-full" onClick={onClose}>{copy.annotate.close}</Button>
        ) : write.state.phase === "unknown" ? null : (
          <>
            <Button size="lg" icon="users-three" className="w-full" disabled={!preview} loading={write.pending} loadingLabel={copy.move.moving} onClick={confirm}>{copy.move.confirm}</Button>
            {locked ? null : <Button size="lg" variant="ghost" className="w-full" onClick={() => setStep("choose")}>{copy.move.back}</Button>}
          </>
        )}
      </div>
    </>
  );

  const body = (
    <div className="flex flex-col gap-3.5">
      {header}
      {step === "choose" ? choose : changePreview}
      <ConfirmDialog
        open={confirmingClose}
        onOpenChange={setConfirmingClose}
        title={copy.writes.close.title}
        description={copy.annotate.uncertain.description}
        cancel={(ref) => <Button ref={ref} variant="ghost" icon="arrow-clockwise" onClick={() => { setConfirmingClose(false); void write.retry(); }}>{copy.writes.retry}</Button>}
        confirm={<Button variant="secondary" onClick={() => { setConfirmingClose(false); onClose(); }}>{copy.writes.close.confirm}</Button>}
      />
    </div>
  );
  const props = { open: true, onOpenChange: requestClose, title: copy.move.action, bare: true };
  return wide ? <Modal {...props}>{body}</Modal> : <BottomSheet {...props}>{body}</BottomSheet>;
}
