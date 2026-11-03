"use client";
// FR-031, FR-031a; COMPONENT_SPECIFICATIONS.md §Modal y §BottomSheet («desde md, diálogo centrado de 520 px»);
// RESPONSIVE_SPECIFICATIONS.md, Sheets y diálogos. Siempre `role="dialog"`: la 001 no confirma nada destructivo.
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { copy } from "@/lib/copy/es";
import { dialog } from "@/lib/motion/tokens";
import { Button } from "./button";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Disparador opcional; al cerrar, el foco vuelve al elemento que tenía el foco al abrir. */
  trigger?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
};

const standard = [0.2, 0, 0, 1] as const; // ease.standard

export function Modal({ open, onOpenChange, title, description, trigger, children, closeLabel = copy.primitives.close }: ModalProps) {
  const reduced = useReducedMotion();
  const seconds = dialog.durationMs / 1000;
  // Escala .98 → 1 con opacidad (MOTION_SYSTEM.md, Cuenta); con movimiento reducido, solo opacidad.
  const motionProps = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : { initial: { opacity: 0, scale: dialog.initialScale }, animate: { opacity: 1, scale: dialog.finalScale }, exit: { opacity: 0, scale: dialog.initialScale }, transition: { duration: seconds, ease: standard } };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[var(--z-modal)] bg-[var(--comp-scrim)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.12 : seconds }}
              />
            </Dialog.Overlay>
            {/* El centrado vive en un contenedor fijo para que la escala no se mezcle con el transform de posición. */}
            <div className="pointer-events-none fixed inset-0 z-[var(--z-modal)] grid place-items-center p-4">
              <Dialog.Content asChild forceMount {...(description ? {} : { "aria-describedby": undefined })}>
                <motion.div
                  {...motionProps}
                  data-modal=""
                  className="pointer-events-auto flex max-h-[calc(100dvh-32px)] w-full max-w-[520px] flex-col gap-3 overflow-y-auto rounded-[var(--radius-2xl)] bg-overlay p-[22px] text-ink shadow-overlay focus-visible:outline-none"
                >
                  <Dialog.Title className="font-serif text-[28px] leading-none">{title}</Dialog.Title>
                  {description ? <Dialog.Description className="text-[length:var(--body-m-size)] leading-[var(--body-m-line)] text-ink-secondary">{description}</Dialog.Description> : null}
                  {children}
                  <div className="flex justify-end gap-2 pt-1">
                    <Dialog.Close asChild>
                      <Button variant="ghost">{closeLabel}</Button>
                    </Dialog.Close>
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
