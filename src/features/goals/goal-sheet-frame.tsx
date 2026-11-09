"use client";
// 004 PR C (T046, T047) / FR-093, FR-101; RESPONSIVE_SPECIFICATIONS, «Sheets y diálogos»: hoja por debajo de 768 y diálogo de
// 520 desde 768, con la × a la derecha, como la hoja de liquidación de la 003. El marco común de las hojas de metas: título
// serif centrado, ícono del mapa semántico y el cierre que, con un resultado desconocido, pregunta antes
// («¿Cerrar sin confirmar?»; FR-093).
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { DialogTitle, Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/features/expenses/confirm-dialog";
import { copy } from "@/lib/copy/es";

const WIDE = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(WIDE);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
};
const read = () => typeof window.matchMedia === "function" && window.matchMedia(WIDE).matches;

type Props = {
  open: boolean;
  title: string;
  icon: AppIconName;
  /** Cierra la hoja; `unconfirmed`: había un resultado desconocido y la persona eligió cerrar igual. */
  onClose: (options?: { unconfirmed: boolean }) => void;
  /** En curso: no se cierra. Desconocido: se pregunta antes de cerrar. */
  phase: "idle" | "pending" | "unknown";
  onRetry: () => void;
  children: ReactNode;
  onOpenAutoFocus?: (event: Event) => void;
};

export function GoalSheetFrame({ open, title, icon, onClose, phase, onRetry, children, onOpenAutoFocus }: Props) {
  const wide = useSyncExternalStore(subscribe, read, () => false);
  const [confirming, setConfirming] = useState(false);
  const requestClose = (next: boolean) => {
    if (next || phase === "pending") return;
    if (phase === "unknown") { setConfirming(true); return; }
    onClose();
  };
  const body = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-saving-subtle text-saving"><AppIcon name={icon} weight="duotone" size={22} /></span>
        <DialogTitle className="text-center font-serif text-[23px] leading-[1.04] font-medium tracking-[-0.015em] text-balance">{title}</DialogTitle>
        <button type="button" onClick={() => requestClose(false)} aria-label={copy.primitives.close} className="grid size-11 place-items-center rounded-[13px] bg-raised text-ink shadow-raised hover:bg-sunken">
          <AppIcon name="x" weight="bold" size={16} />
        </button>
      </div>
      {children}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={copy.writes.close.title}
        description={copy.writes.unknown}
        cancel={(ref) => <Button ref={ref} variant="ghost" icon="arrow-clockwise" onClick={() => { setConfirming(false); onRetry(); }}>{copy.writes.retry}</Button>}
        confirm={<Button variant="secondary" onClick={() => { setConfirming(false); onClose({ unconfirmed: true }); }}>{copy.writes.close.confirm}</Button>}
      />
    </div>
  );
  const props = { open, onOpenChange: requestClose, title, bare: true, onOpenAutoFocus };
  return wide ? <Modal {...props}>{body}</Modal> : <BottomSheet {...props}>{body}</BottomSheet>;
}

/** El aviso de un rechazo o de un dato no válido dentro de una hoja: se anuncia y queda junto al botón. */
export function SheetError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-2 rounded-[14px] bg-danger-subtle px-3 py-2.5 text-[13px] font-medium text-ink">
      <AppIcon name="warning-circle" weight="bold" size={18} className="mt-px shrink-0 text-danger" />
      <span>{children}</span>
    </p>
  );
}
