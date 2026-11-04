"use client";
// FR-031a, FR-041; COMPONENT_SPECIFICATIONS.md §BottomSheet. Solo la base accesible que necesita el aviso de Anotar:
// foco atrapado, Escape, control de cierre, retorno del foco y safe area. Sin paradas peek/full, sin arrastre y sin
// confirmación de descarte: las añade el Expense Flow sobre esta base.
import * as Dialog from "@radix-ui/react-dialog";
import * as m from "motion/react-m";
import { AnimatePresence, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { copy } from "@/lib/copy/es";
import { sheet } from "@/lib/motion/tokens";
import { Button } from "./button";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Disparador opcional; al cerrar, el foco vuelve al elemento que tenía el foco al abrir. */
  trigger?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
  /** Para devolver el foco a un elemento propio al cerrar (el aviso de Anotar abierto con N o tras cambiar de contenedor). */
  onCloseAutoFocus?: (event: Event) => void;
};

export function BottomSheet({ open, onOpenChange, title, description, trigger, children, closeLabel = copy.primitives.close, onCloseAutoFocus }: BottomSheetProps) {
  const reduced = useReducedMotion();
  // Spring sheet desde el borde inferior; con movimiento reducido, solo opacidad (MOTION_SYSTEM.md §2).
  const motionProps = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" }, transition: sheet };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <m.div
                className="fixed inset-0 z-[var(--z-sheet)] bg-[var(--comp-scrim)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.12 : 0.18 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount onCloseAutoFocus={onCloseAutoFocus} {...(description ? {} : { "aria-describedby": undefined })}>
              <m.div
                {...motionProps}
                data-bottom-sheet=""
                className="fixed inset-x-0 bottom-0 z-[var(--z-sheet)] flex max-h-[calc(100dvh-96px)] flex-col gap-4 overflow-y-auto rounded-t-[30px] bg-overlay px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] text-ink shadow-sheet focus-visible:outline-none"
              >
                <span aria-hidden="true" className="mx-auto h-[5px] w-9 shrink-0 rounded-full bg-border-emphasis" />
                <Dialog.Title className="font-serif text-[length:var(--title-l-size)] leading-[var(--title-l-line)]">{title}</Dialog.Title>
                {description ? <Dialog.Description className="text-[length:var(--body-m-size)] leading-[var(--body-m-line)] text-ink-secondary">{description}</Dialog.Description> : null}
                {children}
                <div className="flex justify-end">
                  <Dialog.Close asChild>
                    <Button variant="ghost">{closeLabel}</Button>
                  </Dialog.Close>
                </div>
              </m.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
