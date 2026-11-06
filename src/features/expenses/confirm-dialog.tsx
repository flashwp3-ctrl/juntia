"use client";
// T081, T082 / FR-039; COMPONENT_SPECIFICATIONS.md §Modal y §SensitiveActionConfirmation (02·1): `alertdialog`, la
// consecuencia en una frase, el foco inicial en la opción segura, Escape cancela y la acción va al final. Lo usan la
// confirmación de cambios sin guardar de la hoja (FR-031a de la 001) y el diálogo de eliminar.
import { useRef, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** Botón seguro, que recibe el foco inicial. */
  cancel: (ref: React.RefObject<HTMLButtonElement | null>) => ReactNode;
  confirm: ReactNode;
  children?: ReactNode;
  onCloseAutoFocus?: (event: Event) => void;
};

export function ConfirmDialog({ open, onOpenChange, title, description, cancel, confirm, children, onCloseAutoFocus }: ConfirmDialogProps) {
  const safe = useRef<HTMLButtonElement | null>(null);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      role="alertdialog"
      size="confirm"
      title={title}
      description={description}
      onOpenAutoFocus={(event) => { event.preventDefault(); safe.current?.focus(); }}
      onCloseAutoFocus={onCloseAutoFocus}
      actions={<>{cancel(safe)}{confirm}</>}
    >
      {children}
    </Modal>
  );
}
