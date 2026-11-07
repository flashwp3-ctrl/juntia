"use client";
// T047 (spec 003, PR C) / FR-022, FR-023, FR-057, FR-059; US-7.1–7.4; Q12. Editar y «Eliminar gasto» sobre el detalle de un
// gasto compartido. Editar abre la hoja de Anotar en modo edición compartida con la `version` leída al pintar el detalle.
// Eliminar abre el diálogo de 02·1 (`alertdialog`, foco inicial en Cancelar) y anula con motivo `delete` y la versión
// esperada: si el otro ya lo editó o lo eliminó, el servidor rechaza sin cambiar nada y se dice con su nombre. Con un
// resultado desconocido nunca se afirma que no se eliminó: «Reintentar» (la misma clave) y «Comprobar estado».
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { formatMoney, parseAmountMinor } from "@/domain/money";
import { useWrite } from "@/features/shared/use-write";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { useAnnotate } from "./annotate-provider";
import { ConfirmDialog } from "./confirm-dialog";
import { newIdempotencyKey } from "./idempotency";
import type { SavedShared, SharedActions, SharedVoidPayload } from "./shared-types";

export function SharedTransactionActions({ expense, backHref }: { expense: SavedShared; backHref: string }) {
  const router = useRouter();
  const { openEditShared, notify, sharedActions, couple } = useAnnotate();
  const [confirming, setConfirming] = useState(false);
  const key = useRef("");
  const deleteButton = useRef<HTMLButtonElement | null>(null);
  const partner = couple?.members.find((member) => !member.isMe)?.name ?? "";
  const title = expense.description ?? copy.categories[expense.categoryId];

  const run = useCallback((payload: SharedVoidPayload) => sharedActions!.voidShared(payload), [sharedActions]);
  const check = useCallback((input: Parameters<SharedActions["check"]>[0]) => sharedActions!.check(input), [sharedActions]);
  const done = useCallback(() => {
    setConfirming(false);
    notify({ tone: "success", message: copy.remove.done.expense });
    router.push(backHref);
  }, [backHref, notify, router]);
  const write = useWrite<SharedVoidPayload, { id: string; version: number }>({ action: "void_shared_expense", run, check, onOk: done });
  if (!sharedActions) return null;

  const openDialog = () => {
    key.current = newIdempotencyKey();
    write.reset();
    setConfirming(true);
  };
  const remove = () => void write.submit({ idempotencyKey: key.current, transactionId: expense.id, expectedVersion: expense.version, reason: "delete" });

  const notice = write.state.phase === "rejected" ? (
    write.state.error === "versionConflict"
      ? <Toast tone="error" message={copy.shared.errors.versionConflict(partner)} action={{ label: copy.annotate.reload, onAction: () => { setConfirming(false); router.refresh(); } }} />
      : write.state.error === "alreadyDeleted" || write.state.error === "notFound"
        ? <Toast tone="error" message={copy.shared.errors.alreadyDeleted(partner)} />
        : write.state.error === "sessionExpired"
          ? <Toast tone="error" message={copy.errors.sessionExpired} />
          : <Toast tone="error" message={copy.errors.unexpected} />
  ) : write.state.phase === "unknown" ? (
    <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} />
  ) : null;

  return (
    <div className="flex flex-col gap-2.5">
      <Button variant="secondary" size="lg" icon="pencil-simple" className="w-full" onClick={(event) => openEditShared(expense, event.currentTarget, () => router.refresh())}>
        {copy.detail.edit}
      </Button>
      <Button ref={deleteButton} variant="danger" size="lg" icon="trash" className="w-full" onClick={openDialog}>
        {copy.remove.action.expense}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={(next) => { if (!next && (write.pending || write.locked)) return; setConfirming(next); }}
        title={copy.remove.title.expense}
        description={copy.shared.remove.description(title, formatMoney(parseAmountMinor(expense.amountMinor)), partner)}
        onCloseAutoFocus={(event) => { event.preventDefault(); deleteButton.current?.focus(); }}
        cancel={(ref) => <Button ref={ref} variant="ghost" disabled={write.pending} onClick={() => setConfirming(false)}>{write.locked ? copy.annotate.uncertain.close : copy.remove.cancel}</Button>}
        confirm={write.locked ? <span /> : <Button variant="danger" icon="trash" loading={write.pending} loadingLabel={copy.remove.deleting} onClick={remove}>{copy.remove.confirm}</Button>}
      >
        {notice}
      </ConfirmDialog>
    </div>
  );
}
