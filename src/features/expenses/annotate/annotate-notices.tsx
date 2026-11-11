"use client";
// Los avisos de Anotar, que sobreviven a la navegación porque el proveedor vive en el layout: el resultado de una recuperación,
// el aviso fijo del deshacer único (desconocido o sin constar, con «Reintentar» y «Comprobar estado»; cerrarlo se confirma) y
// el aviso ordinario, uno a la vez.
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { WriteUnknown } from "@/features/shared/write-unknown";
import { copy } from "@/lib/copy/es";
import { ConfirmDialog } from "../confirm-dialog";
import { blocksUndo, pendingOf, type UndoState } from "./undo-machine";
import type { RecoveryNote, ToastState } from "./use-undo";

type AnnotateNoticesProps = {
  toast: ToastState | null;
  onToastTimeout: (id: number) => void;
  recovery: RecoveryNote | null;
  onRecoveryTimeout: (id: number) => void;
  undo: UndoState;
  onRetryUndo: () => void;
  onCheckUndo: () => void;
  onDismissUndo: () => void;
};

export function AnnotateNotices({ toast, onToastTimeout, recovery, onRecoveryTimeout, undo, onRetryUndo, onCheckUndo, onDismissUndo }: AnnotateNoticesProps) {
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);
  const pending = pendingOf(undo);
  return (
    <>
      {/* Por encima de la barra inferior en móvil; en escritorio, centrado en el contenido, a la derecha del rail o del
          sidebar. Un solo aviso a la vez: el nuevo reemplaza al anterior. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[var(--z-toast)] flex justify-center px-3.5 lg:bottom-6 lg:pl-[calc(76px+28px)] xl:pl-[calc(248px+40px)]">
        <div className="flex w-full max-w-[440px] flex-col gap-2">
          {recovery ? <Toast key={`recuperacion-${recovery.id}`} tone={recovery.tone} message={recovery.message} onTimeout={() => onRecoveryTimeout(recovery.id)} /> : null}
          {pending ? (
            <div className="pointer-events-auto shadow-raised rounded-[16px]">
              <WriteUnknown
                message={copy.writes.undoUnknown}
                checking={pending.checking}
                notFound={pending.phase === "notFound"}
                onRetry={onRetryUndo}
                onCheck={onCheckUndo}
                onDismiss={() => setConfirmingDismiss(true)}
              />
            </div>
          ) : null}
          <AnimatePresence>
            {toast ? <Toast key={toast.id} tone={toast.tone} message={toast.message} action={toast.action && blocksUndo(undo, toast.undo) ? { ...toast.action, blocked: copy.writes.undoBlocked } : toast.action} onTimeout={() => onToastTimeout(toast.id)} /> : null}
          </AnimatePresence>
        </div>
      </div>
      <ConfirmDialog
        open={confirmingDismiss}
        onOpenChange={setConfirmingDismiss}
        title={copy.writes.close.title}
        description={copy.writes.undoCloseDescription}
        cancel={(ref) => <Button ref={ref} variant="ghost" onClick={() => setConfirmingDismiss(false)}>{copy.writes.close.keep}</Button>}
        confirm={<Button variant="secondary" onClick={() => { setConfirmingDismiss(false); onDismissUndo(); }}>{copy.writes.close.confirm}</Button>}
      />
    </>
  );
}
