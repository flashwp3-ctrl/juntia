"use client";
// T032 / FR-015; COMPONENT_SPECIFICATIONS.md §SensitiveActionConfirmation (anatomía aprobada, decisión 16.6):
// `alertdialog`, consecuencia en una frase, foco inicial en la opción segura, Escape cancela, botón `danger` con su
// estado «…ando» y un error que dice qué quedó igual. Solo para acciones irreversibles (anular la invitación).
import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  keepLabel: string;
  confirmLabel: string;
  loadingLabel: string;
  loading: boolean;
  /** Mientras el resultado es desconocido, solo se ofrecen reintentar y comprobar (en `children`). */
  locked?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
};

export function SensitiveActionConfirmation({ open, onOpenChange, title, description, keepLabel, confirmLabel, loadingLabel, loading, locked = false, onConfirm, children }: Props) {
  const keep = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      role="alertdialog"
      size="confirm"
      title={title}
      description={description}
      onOpenAutoFocus={(event) => { event.preventDefault(); keep.current?.focus(); }}
      actions={(
        <>
          <Button ref={keep} variant="ghost" disabled={loading} onClick={() => onOpenChange(false)}>{keepLabel}</Button>
          {locked ? null : <Button variant="danger" loading={loading} loadingLabel={loadingLabel} onClick={onConfirm}>{confirmLabel}</Button>}
        </>
      )}
    >
      {children}
    </Modal>
  );
}
