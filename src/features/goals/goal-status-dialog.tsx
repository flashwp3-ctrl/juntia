"use client";
// 004 PR C (T046) / FR-032, FR-033, FR-092, FR-093; Q15. «Dar por lograda» y «Archivar» con confirmación (`alertdialog`, foco
// en la opción segura). Lograda: sigue admitiendo usos y retiros, no aportes. Archivar exige saldo 0 y ninguna solicitud
// pendiente; si no se cumple, el servidor lo rechaza (JT214) y el diálogo lo explica. Llevan la versión leída; resultado
// desconocido: «Reintentar» con la misma clave y «Comprobar estado».
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/features/expenses/confirm-dialog";
import { useWrite } from "@/features/shared/use-write";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { goalRejection } from "./goal-errors";
import { UnconfirmedClose } from "./goal-sheet-frame";
import type { GoalActions, GoalStatusPayload, GoalView, SavedGoalStatus } from "./types";

type Props = { kind: "complete" | "archive"; goal: GoalView; idempotencyKey: string; actions: GoalActions; onClose: () => void; onDone: () => void };

export function GoalStatusDialog({ kind, goal, idempotencyKey, actions, onClose, onDone }: Props) {
  const router = useRouter();
  const run = useCallback((payload: GoalStatusPayload) => (kind === "complete" ? actions.complete(payload) : actions.archive(payload)), [actions, kind]);
  const check = useCallback((input: Parameters<GoalActions["check"]>[0]) => actions.check(input), [actions]);
  const onRejected = useCallback(() => router.refresh(), [router]);
  const write = useWrite<GoalStatusPayload, SavedGoalStatus>({ action: kind === "complete" ? "complete_goal" : "archive_goal", run, check, onOk: onDone, onRejected });
  const texts = kind === "complete"
    ? { title: copy.goals.statusDialog.completeTitle, description: copy.goals.statusDialog.completeDescription, confirm: copy.goals.statusDialog.completeConfirm }
    : { title: copy.goals.statusDialog.archiveTitle, description: `${copy.goals.statusDialog.archiveDescription} ${copy.goals.errors.cannotArchive}`, confirm: copy.goals.statusDialog.archiveConfirm };
  const [confirming, setConfirming] = useState(false);
  const rejection = write.state.phase === "rejected"
    ? goalRejection(write.state.error, { transition: kind === "complete" ? copy.goals.errors.cannotComplete : copy.goals.errors.cannotArchive })
    : null;
  return (
    <ConfirmDialog
      open
      onOpenChange={(next) => { if (next || write.state.phase === "pending") return; if (write.state.phase === "unknown") setConfirming(true); else onClose(); }}
      title={texts.title}
      description={texts.description}
      cancel={(ref) => <Button ref={ref} variant="ghost" onClick={onClose} disabled={write.pending || write.locked}>{copy.goals.statusDialog.keep}</Button>}
      confirm={write.state.phase === "unknown" ? <span /> : (
        <Button variant={kind === "archive" ? "danger" : "primary"} icon={kind === "archive" ? "archive" : "flag-checkered"} loading={write.pending}
          onClick={() => void write.submit({ idempotencyKey, goalId: goal.id, expectedVersion: goal.version })}>{texts.confirm}</Button>
      )}
    >
      {rejection ? <p role="alert" className="text-[0.8125rem] font-medium text-ink">{rejection}</p> : null}
      {write.state.phase === "unknown" ? <WriteUnknown checking={write.state.checking} notFound={write.state.notFound} onRetry={() => void write.retry()} onCheck={() => void write.checkStatus()} onDismiss={() => setConfirming(true)} /> : null}
      <UnconfirmedClose open={confirming} onOpenChange={setConfirming} onRetry={() => void write.retry()} onClose={onClose} />
    </ConfirmDialog>
  );
}
