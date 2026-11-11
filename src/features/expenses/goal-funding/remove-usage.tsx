"use client";
// 004 PR D (T063, T064) / FR-057, FR-072; US-8.1, US-8.2; Q17; ADR-001 punto 7. «Quitar el uso de la meta» desde el detalle
// de un gasto: una confirmación (`alertdialog`, foco en la opción segura) que dice que los fondos vuelven a cada aportante y,
// si la hay, que la solicitud pendiente se cancela; la escritura lleva la versión del gasto y su propia clave (nace al abrir
// la confirmación), con los tres resultados (FR-093). Termina en «Uso quitado» y, si una meta archivada volvió a estar
// activa, lo dice con su monto (F64-1). Sobre un gasto ya anulado falla con su mensaje (decisión del gestor).
// La LimitNote «No se puede mover este gasto» sustituye a «Mover a Pareja» en un privado pagado con una meta personal.
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { LimitNote } from "@/features/account/limit-note";
import { useWrite } from "@/features/shared/use-write";
import { WriteUnknown } from "@/features/shared/write-unknown";
import type { WriteError } from "@/features/shared/write-result";
import { copy } from "@/lib/copy/es";
import { useOptionalAnnotate } from "../annotate-provider";
import { ConfirmDialog } from "../confirm-dialog";
import { newIdempotencyKey } from "../idempotency";
import { reactivationMessage } from "./reactivation";
import { wrapLabelLg, wrapLabelMd } from "./wrap-label";
import type { GoalFundingActions, RemoveUsagePayload, RemoveUsageResult } from "./types";

export function FundedMoveNote() {
  return <LimitNote title={copy.goalExpense.limit.title} description={copy.goalExpense.limit.description} />;
}

function removeRejection(error: WriteError) {
  switch (error) {
    case "alreadyDeleted": return copy.goalExpense.errors.expenseVoided;
    case "versionConflict": return copy.goalExpense.errors.transactionChanged;
    case "nothingToRemove": return copy.goalExpense.errors.nothingToRemove;
    case "notFound": return copy.transaction.errors.notFound;
    case "sessionExpired": return copy.errors.sessionExpired;
    default: return copy.errors.unexpected;
  }
}

type Props = { transactionId: string; version: number; goalName: string; hasPending: boolean; actions: GoalFundingActions };

export function RemoveGoalUsage({ transactionId, version, goalName, hasPending, actions }: Props) {
  const router = useRouter();
  const annotate = useOptionalAnnotate();
  const [open, setOpen] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [doneHere, setDoneHere] = useState<string | null>(null);
  const key = useRef("");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const run = useCallback((payload: RemoveUsagePayload) => actions.removeUsage(payload), [actions]);
  const check = useCallback((input: Parameters<GoalFundingActions["check"]>[0]) => actions.check(input), [actions]);
  const onOk = useCallback((result: RemoveUsageResult) => {
    setOpen(false);
    const message = [copy.goalExpense.remove.done, reactivationMessage(result.reactivatedGoals)].filter(Boolean).join(". ");
    if (annotate) annotate.notify({ tone: "success", message });
    else setDoneHere(message);
    router.refresh();
  }, [annotate, router]);
  const write = useWrite<RemoveUsagePayload, RemoveUsageResult>({ action: "remove_goal_usage", run, check, onOk });

  const openDialog = () => {
    key.current = newIdempotencyKey();
    write.reset();
    setOpen(true);
  };
  const confirm = () => void write.submit({ idempotencyKey: key.current, transactionId, expectedVersion: version });

  return (
    <div className="flex flex-col gap-2">
      <Button ref={trigger} variant="secondary" size="lg" icon="arrow-u-up-left" className={`w-full ${wrapLabelLg}`} onClick={openDialog}>{copy.goalExpense.remove.action}</Button>
      {doneHere ? <p role="status" className="text-[13px] font-semibold text-ink">{doneHere}</p> : null}
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && write.pending) return;
          if (!next && write.locked) { setConfirmingClose(true); return; }
          setOpen(next);
        }}
        title={copy.goalExpense.remove.title}
        description={copy.goalExpense.remove.description(goalName)}
        onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); }}
        cancel={(ref) => <Button ref={ref} variant="ghost" disabled={write.pending} onClick={() => (write.locked ? setConfirmingClose(true) : setOpen(false))}>{write.locked ? copy.annotate.uncertain.close : copy.goalExpense.remove.keep}</Button>}
        confirm={write.locked || write.state.phase === "rejected" ? <span /> : <Button variant="danger" icon="arrow-u-up-left" className={wrapLabelMd} loading={write.pending} loadingLabel={copy.goalExpense.remove.removing} onClick={confirm}>{copy.goalExpense.remove.confirm}</Button>}
      >
        {hasPending ? <p className="text-[13px] leading-[1.45] text-ink">{copy.goalExpense.remove.pendingNote}</p> : null}
        {write.state.phase === "rejected" ? (
          <Toast tone="error" message={removeRejection(write.state.error)} action={write.state.error === "versionConflict" ? { label: copy.goalExpense.request.review, onAction: () => { setOpen(false); router.refresh(); } } : undefined} />
        ) : null}
        {write.state.phase === "unknown" ? <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} /> : null}
        <ConfirmDialog
          open={confirmingClose}
          onOpenChange={setConfirmingClose}
          title={copy.writes.close.title}
          description={copy.annotate.uncertain.description}
          cancel={(ref) => <Button ref={ref} variant="ghost" onClick={() => setConfirmingClose(false)}>{copy.writes.close.keep}</Button>}
          confirm={<Button variant="secondary" onClick={() => { setConfirmingClose(false); setOpen(false); write.reset(); }}>{copy.writes.close.confirm}</Button>}
        />
      </ConfirmDialog>
    </div>
  );
}
