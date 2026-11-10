"use client";
// T082 / FR-037–FR-039; US-4.1–4.4; Q4, Q14, Q15. Editar y «Eliminar gasto»/«Eliminar ingreso» sobre el detalle del PR C
// (T068), en móvil y en el panel de 04·7. Editar abre la hoja de Anotar en modo edición con la `version` leída al pintar
// el detalle. Eliminar abre el diálogo de 02·1 (`alertdialog`, foco inicial en Cancelar) y anula con motivo `delete`;
// por dentro el movimiento queda anulado y auditado, y sale de Inicio, Actividad y la exportación. Sin «Deshacer» (Q4).
// Las dos acciones van al pie, como en la edición de 04·1 («Guardar cambios» / «Eliminar gasto»), a todo el ancho.
// 004 PR D (T063; FR-057; Q17; F64-1): si el gasto está pagado con una meta, la confirmación avisa que el uso también se quita
// (las dos cosas en una operación) y, si una meta archivada vuelve a estar activa, el aviso lo dice con su monto.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useWrite } from "@/features/shared/use-write";
import { WriteUnknown } from "@/features/shared/write-unknown";
import type { WriteAction } from "@/features/shared/write-result";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { formatMoney, parseAmountMinor } from "@/domain/money";
import { copy } from "@/lib/copy/es";
import { useAnnotate } from "./annotate-provider";
import { ConfirmDialog } from "./confirm-dialog";
import { newIdempotencyKey } from "./idempotency";
import type { SavedTransaction, VoidedTransaction, VoidPayload } from "./types";
import { useExpenseFunding } from "./goal-funding/funding-context";
import { reactivationMessage } from "./goal-funding/reactivation";

export function TransactionActions({ transaction, backHref, funding }: { transaction: SavedTransaction; backHref: string; funding?: { goalName: string } }) {
  const router = useRouter();
  const fromContext = useExpenseFunding(transaction.id);
  const goalName = funding?.goalName ?? fromContext?.goalName ?? null;
  const { openEdit, notify, actions } = useAnnotate();
  const [confirming, setConfirming] = useState(false);
  // F69-1: con el resultado desconocido, cerrar pide confirmación y conserva la intención (como en un compartido).
  const [confirmingClose, setConfirmingClose] = useState(false);
  // Una clave por apertura del diálogo: el doble clic y el reintento son la misma intención.
  const key = useRef("");
  const deleteButton = useRef<HTMLButtonElement | null>(null);
  const title = transaction.description ?? copy.categories[transaction.categoryId];

  // 004 PR D (F69-1, revisión de ChatGPT del PR #69): la eliminación de un privado sigue el contrato común —ok, rechazo
  // confirmado o resultado desconocido, 15 s y «Comprobar estado» por write_status con void_transaction—, con o sin meta.
  const run = useCallback((payload: VoidPayload) => actions.voidTransaction(payload), [actions]);
  const check = useCallback((input: { action: WriteAction; idempotencyKey: string }) => (actions.check ? actions.check(input) : Promise.resolve({ state: "error" as const })), [actions]);
  const done = useCallback((result: VoidedTransaction) => {
    setConfirming(false);
    notify({ tone: "success", message: [copy.remove.done[transaction.type], reactivationMessage(result.reactivatedGoals)].filter(Boolean).join(". ") });
    router.push(backHref);
  }, [backHref, notify, router, transaction.type]);
  const write = useWrite<VoidPayload, VoidedTransaction>({ action: "void_transaction", run, check, onOk: done });

  const openDialog = () => {
    key.current = newIdempotencyKey();
    write.reset();
    setConfirming(true);
  };
  const remove = () => void write.submit({ idempotencyKey: key.current, transactionId: transaction.id, expectedVersion: transaction.version, reason: "delete" });

  const error = write.state.phase === "rejected" ? (() => {
    switch (write.state.error) {
      case "alreadyDeleted":
      case "notFound":
        return <Toast tone="error" message={<>{copy.transaction.errors.alreadyDeleted}{" "}<Link href={backHref} className="font-semibold underline underline-offset-2">{copy.remove.backToActivity}</Link></>} />;
      case "versionConflict":
        return <Toast tone="error" message={copy.transaction.errors.versionConflict} action={{ label: copy.annotate.reload, onAction: () => { setConfirming(false); router.refresh(); } }} />;
      case "sessionExpired":
        return <Toast tone="error" message={<>{copy.errors.sessionExpired}{" "}<a href={`/entrar?volver=${encodeURIComponent(backHref)}`} className="font-semibold underline underline-offset-2">{copy.account.signInAgain}</a></>} />;
      default:
        // Un rechazo confirmado no se escribió: reintentar repetiría el mismo rechazo.
        return <Toast tone="error" message={copy.errors.unexpected} />;
    }
  })() : write.state.phase === "unknown" ? (
    <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} />
  ) : null;

  return (
    <div className="flex flex-col gap-2.5">
      <Button variant="secondary" size="lg" icon="pencil-simple" className="w-full" onClick={(event) => openEdit(transaction, event.currentTarget, () => router.refresh())}>
        {copy.detail.edit}
      </Button>
      <Button ref={deleteButton} variant="danger" size="lg" icon="trash" className="w-full" onClick={openDialog}>
        {copy.remove.action[transaction.type]}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={(next) => {
          if (!next && write.pending) return;
          if (!next && write.locked) { setConfirmingClose(true); return; }
          setConfirming(next);
        }}
        title={copy.remove.title[transaction.type]}
        description={copy.remove.description(title, formatMoney(parseAmountMinor(transaction.amountMinor)))}
        onCloseAutoFocus={(event) => { event.preventDefault(); deleteButton.current?.focus(); }}
        cancel={(ref) => <Button ref={ref} variant="ghost" disabled={write.pending} onClick={() => (write.locked ? setConfirmingClose(true) : setConfirming(false))}>{write.locked ? copy.annotate.uncertain.close : copy.remove.cancel}</Button>}
        confirm={write.locked ? <span /> : <Button variant="danger" icon="trash" loading={write.pending} loadingLabel={copy.remove.deleting} onClick={remove}>{copy.remove.confirm}</Button>}
      >
        {goalName ? <p className="text-[13px] leading-[1.45] text-ink">{copy.goalExpense.deleteWarning(goalName)}</p> : null}
        {error}
        <ConfirmDialog
          open={confirmingClose}
          onOpenChange={setConfirmingClose}
          title={copy.writes.close.title}
          description={copy.annotate.uncertain.description}
          cancel={(ref) => <Button ref={ref} variant="ghost" onClick={() => setConfirmingClose(false)}>{copy.writes.close.keep}</Button>}
          confirm={<Button variant="secondary" onClick={() => { setConfirmingClose(false); setConfirming(false); write.reset(); }}>{copy.writes.close.confirm}</Button>}
        />
      </ConfirmDialog>
    </div>
  );
}

