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
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { formatMoney, parseAmountMinor } from "@/domain/money";
import { copy } from "@/lib/copy/es";
import { useAnnotate } from "./annotate-provider";
import { ConfirmDialog } from "./confirm-dialog";
import { newIdempotencyKey } from "./idempotency";
import type { ExpenseActionError, SavedTransaction } from "./types";
import { useExpenseFunding } from "./goal-funding/funding-context";
import { reactivationMessage } from "./goal-funding/reactivation";

type Status = { kind: "idle" } | { kind: "deleting" } | { kind: "error"; error: ExpenseActionError };

export function TransactionActions({ transaction, backHref, funding }: { transaction: SavedTransaction; backHref: string; funding?: { goalName: string } }) {
  const router = useRouter();
  const fromContext = useExpenseFunding(transaction.id);
  const goalName = funding?.goalName ?? fromContext?.goalName ?? null;
  const { openEdit, notify, actions } = useAnnotate();
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Una clave por apertura del diálogo: el doble clic y el reintento son la misma intención.
  const key = useRef("");
  const busy = useRef(false);
  const deleteButton = useRef<HTMLButtonElement | null>(null);
  const title = transaction.description ?? copy.categories[transaction.categoryId];

  const openDialog = () => {
    key.current = newIdempotencyKey();
    setStatus({ kind: "idle" });
    setConfirming(true);
  };

  const remove = async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus({ kind: "deleting" });
    let result;
    try {
      result = await actions.voidTransaction({ idempotencyKey: key.current, transactionId: transaction.id, expectedVersion: transaction.version, reason: "delete" });
    } catch {
      result = { ok: false as const, error: "network" as const };
    }
    busy.current = false;
    if (result.ok) {
      setConfirming(false);
      notify({ tone: "success", message: reactivationMessage(result.value.reactivatedGoals) ?? copy.remove.done[transaction.type] });
      router.push(backHref);
    } else setStatus({ kind: "error", error: result.error });
  };

  const error = status.kind === "error" ? (() => {
    switch (status.error) {
      case "alreadyDeleted":
      case "notFound":
        return <Toast tone="error" message={<>{copy.transaction.errors.alreadyDeleted}{" "}<Link href={backHref} className="font-semibold underline underline-offset-2">{copy.remove.backToActivity}</Link></>} />;
      case "versionConflict":
        return <Toast tone="error" message={copy.transaction.errors.versionConflict} action={{ label: copy.annotate.reload, onAction: () => { setConfirming(false); router.refresh(); } }} />;
      case "sessionExpired":
        return <Toast tone="error" message={<>{copy.errors.sessionExpired}{" "}<a href={`/entrar?volver=${encodeURIComponent(backHref)}`} className="font-semibold underline underline-offset-2">{copy.account.signInAgain}</a></>} />;
      default:
        return <Toast tone="error" message={copy.remove.failed} action={{ label: copy.annotate.retry, onAction: () => void remove() }} />;
    }
  })() : null;

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
        onOpenChange={(next) => { if (!next && busy.current) return; setConfirming(next); }}
        title={copy.remove.title[transaction.type]}
        description={copy.remove.description(title, formatMoney(parseAmountMinor(transaction.amountMinor)))}
        onCloseAutoFocus={(event) => { event.preventDefault(); deleteButton.current?.focus(); }}
        cancel={(ref) => <Button ref={ref} variant="ghost" disabled={status.kind === "deleting"} onClick={() => setConfirming(false)}>{copy.remove.cancel}</Button>}
        confirm={<Button variant="danger" icon="trash" loading={status.kind === "deleting"} loadingLabel={copy.remove.deleting} onClick={() => void remove()}>{copy.remove.confirm}</Button>}
      >
        {goalName ? <p className="text-[13px] leading-[1.45] text-ink">{copy.goalExpense.deleteWarning(goalName)}</p> : null}
        {error}
      </ConfirmDialog>
    </div>
  );
}

