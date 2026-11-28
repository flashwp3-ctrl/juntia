"use client";
// 004 PR C (T046, T047) / FR-093, FR-101; RESPONSIVE_SPECIFICATIONS, «Sheets y diálogos»: hoja por debajo de 768 y diálogo de
// 520 desde 768, con la × a la derecha, como la hoja de liquidación de la 003. En el mismo árbol (BottomSheet `adaptive`):
// cruzar 768 px con la hoja abierta cambia solo la presentación, sin perder lo escrito, el foco ni el cursor. El marco común de las hojas de metas: título
// serif centrado, ícono del mapa semántico y el cierre que, con un resultado desconocido, pregunta antes
// («¿Cerrar sin confirmar?»; FR-093).
import { useState, type ReactNode } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SheetTitle } from "@/components/ui/modal";
import { ConfirmDialog } from "@/features/expenses/confirm-dialog";
import { copy } from "@/lib/copy/es";

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
  const [confirming, setConfirming] = useState(false);
  const requestClose = (next: boolean) => {
    if (next || phase === "pending") return;
    if (phase === "unknown") { setConfirming(true); return; }
    onClose();
  };
  const body = (
    <div className="flex flex-col gap-4">
      <div className="@container/sheethead grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 [&>:last-child]:col-start-3">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-saving-subtle text-saving"><AppIcon name={icon} weight="duotone" size={22} /></span>
        <SheetTitle>{title}</SheetTitle>
        <button type="button" onClick={() => requestClose(false)} aria-label={copy.primitives.close} className="grid size-11 place-items-center rounded-[13px] bg-raised text-ink shadow-raised hover:bg-sunken">
          <AppIcon name="x" weight="bold" size={16} />
        </button>
      </div>
      {children}
      <UnconfirmedClose open={confirming} onOpenChange={setConfirming} onRetry={onRetry} onClose={() => onClose({ unconfirmed: true })} />
    </div>
  );
  return <BottomSheet open={open} onOpenChange={requestClose} title={title} onOpenAutoFocus={onOpenAutoFocus} bare adaptive>{body}</BottomSheet>;
}

/**
 * FR-093: con un resultado desconocido, cerrar una hoja o un diálogo de metas se confirma («¿Cerrar sin confirmar?»), con
 * «Reintentar» (la misma clave) como opción segura. Lo usan el marco de las hojas y los diálogos de anular y de estado.
 */
export function UnconfirmedClose({ open, onOpenChange, onRetry, onClose }: { open: boolean; onOpenChange: (open: boolean) => void; onRetry: () => void; onClose: () => void }) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.writes.close.title}
      description={copy.writes.unknown}
      cancel={(ref) => <Button ref={ref} variant="ghost" icon="arrow-clockwise" onClick={() => { onOpenChange(false); onRetry(); }}>{copy.writes.retry}</Button>}
      confirm={<Button variant="secondary" onClick={() => { onOpenChange(false); onClose(); }}>{copy.writes.close.confirm}</Button>}
    />
  );
}

/** El aviso de un rechazo o de un dato no válido dentro de una hoja: se anuncia y queda junto al botón. */
export function SheetError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-2 rounded-[14px] bg-danger-subtle px-3 py-2.5 text-[0.8125rem] font-medium text-ink">
      <AppIcon name="warning-circle" weight="bold" size={18} className="mt-px shrink-0 text-danger" />
      <span>{children}</span>
    </p>
  );
}
